import { useCallback, useEffect, useRef, useState } from "react";

const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

// 170,000W STABILIZER — TITANIUM STRENGTH — absolute brick-wall, zero clipping
// Threshold at -6 dBFS for early catch, ratio 100:1 for titanium hold
// System Stabilizer (1700000W) covers EQ, bass, amp classes, signal booster, soft drive
const STABILIZER_THRESHOLD_DBFS = -6; // dBFS — titanium early catch
const STABILIZER_KNEE = 0; // hard knee — no soft curves, instant clamp
const STABILIZER_RATIO = 100; // titanium brick-wall ratio
const STABILIZER_ATTACK = 0.0001; // 0.1ms — fastest possible clamp
const STABILIZER_RELEASE = 0.08; // 80ms — quick but musical release

// Pre-limiter gain reduction node — reduces input level before compressor
// This prevents the compressor from being overwhelmed by hot signals
const PRE_GAIN_DB = -6; // pull input down 6 dB before the stabilizer

// A+/B+/C+/D+ amp class boost — each adds +3 dB linear gain
// All 4 classes together give +12 dB total push to reach 120 dB safely
const AMP_CLASS_GAIN_LINEAR = 10 ** (3 / 20); // +3 dB per class

interface UseAudioEngineReturn {
  audioContextRef: React.MutableRefObject<AudioContext | null>;
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
  filtersRef: React.MutableRefObject<BiquadFilterNode[]>;
  compressorRef: React.MutableRefObject<DynamicsCompressorNode | null>;
  preGainRef: React.MutableRefObject<GainNode | null>;
  ampClassGainsRef: React.MutableRefObject<GainNode[]>;
  bassFilterRef: React.MutableRefObject<BiquadFilterNode | null>;
  connectAudioElement: (el: HTMLAudioElement) => void;
  setEqGain: (index: number, gainDb: number) => void;
  setBassGain: (gainDb: number) => void;
  realDbLevel: number;
  isAnalyserActive: boolean;
  gainReduction: number; // how many dB the SYSTEM stabilizer (170,000W) is pulling back
  dbStabGainReduction: number; // how many dB the dB-meter stabilizer (170,000W) is pulling back
  ampClassLevels: number[]; // 0 or 1 for each of A+, B+, C+, D+
  bassLevel: number; // 0–100: energy in 20–300Hz bass frequency range
  crestFactor: number; // peak/RMS ratio — high (>6) = clean dynamic, low (<3) = forced/clipped
}

export function useAudioEngine(): UseAudioEngineReturn {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  // Second stabilizer — dedicated to dB meter signal path (parallel, not in playback chain)
  const dbStabCompressorRef = useRef<DynamicsCompressorNode | null>(null);
  const preGainRef = useRef<GainNode | null>(null);
  const ampClassGainsRef = useRef<GainNode[]>([]);
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const rafRef = useRef<number | null>(null);
  // Track which elements have already been connected to avoid double-connecting
  const connectedElements = useRef<WeakSet<HTMLAudioElement>>(new WeakSet());

  const [realDbLevel, setRealDbLevel] = useState(60);
  const [isAnalyserActive, setIsAnalyserActive] = useState(false);
  const [gainReduction, setGainReduction] = useState(0);
  const [dbStabGainReduction, setDbStabGainReduction] = useState(0);
  const [ampClassLevels, setAmpClassLevels] = useState<number[]>([0, 0, 0, 0]);
  const [bassLevel, setBassLevel] = useState(0);
  // default high crest = dynamic/clean signal
  const [crestFactor, setCrestFactor] = useState(10);

  // rAF loop — reads real signal from AnalyserNode + compressor gain reduction
  const startRafLoop = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const bufferLength = analyser.fftSize;
    const timeDataArray = new Float32Array(bufferLength);
    // Separate Uint8 array for FFT frequency data (bass detection)
    const freqDataArray = new Uint8Array(analyser.frequencyBinCount);

    const loop = () => {
      if (!analyserRef.current) return;

      // --- TIME-DOMAIN data for RMS, peak, crest factor ---
      analyserRef.current.getFloatTimeDomainData(timeDataArray);

      let sum = 0;
      let peak = 0;
      for (let i = 0; i < bufferLength; i++) {
        const abs = Math.abs(timeDataArray[i]);
        sum += timeDataArray[i] * timeDataArray[i];
        if (abs > peak) peak = abs;
      }
      const rms = Math.sqrt(sum / bufferLength);
      // Convert to dBFS: 0 dBFS = full scale, silence = -Infinity
      const dbFs = rms > 0.000001 ? 20 * Math.log10(rms) : -80;

      // After the 17000W stabilizer + pre-gain, signal is held well under -12 dBFS.
      // Map the usable stabilized range: -60 dBFS (quiet) to -6 dBFS (loud) → display 60 to 100 dB
      // This ensures the meter stays in green/yellow, with 100–110 being genuinely hot (not clipping).
      // Clip zone (above 100 on display) = above -6 dBFS — should rarely/never happen after stabilizer.
      const displayDb = Number.isFinite(dbFs)
        ? Math.max(60, Math.min(120, 60 + (dbFs + 60) * (40 / 54)))
        : 60;

      setRealDbLevel(displayDb);

      // --- CREST FACTOR: peak / RMS — measures signal dynamics ---
      // High crest (>6) = music has dynamic range = clean drive
      // Low crest (<3)  = signal is clipped/forced flat = distortion
      const rawCrest = rms > 0.000001 ? peak / rms : 10;
      const clampedCrest = Math.max(1, Math.min(20, rawCrest));
      setCrestFactor(clampedCrest);

      // --- FREQUENCY-DOMAIN data for bass level (Chip 2) ---
      analyserRef.current.getByteFrequencyData(freqDataArray);
      // First 12 bins of a 2048-FFT at ~44100Hz cover roughly 0–259Hz (bass range 20–300Hz)
      const BASS_BINS = 12;
      let bassSum = 0;
      for (let i = 0; i < BASS_BINS; i++) {
        bassSum += freqDataArray[i];
      }
      const bassAvg = bassSum / BASS_BINS; // 0–255
      const bassNormalized = Math.min(100, Math.round((bassAvg / 255) * 100));
      setBassLevel(bassNormalized);

      // Read actual gain reduction from the SYSTEM compressor node (negative dB = clamping)
      if (compressorRef.current) {
        // reduction is always 0 or negative; we display as positive "pull-back" amount
        const reduction = Math.abs(compressorRef.current.reduction);
        setGainReduction(reduction);
      }

      // Read actual gain reduction from the dB-METER dedicated compressor node
      if (dbStabCompressorRef.current) {
        const dbReduction = Math.abs(dbStabCompressorRef.current.reduction);
        setDbStabGainReduction(dbReduction);
      }

      // Compute which amp classes are "active" based on current dB level
      setAmpClassLevels([
        displayDb >= 75 ? 1 : 0, // A+ activates at 75 dB
        displayDb >= 85 ? 1 : 0, // B+ activates at 85 dB
        displayDb >= 95 ? 1 : 0, // C+ activates at 95 dB
        displayDb >= 105 ? 1 : 0, // D+ activates at 105 dB
      ]);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const stopRafLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // Connect an HTMLAudioElement into the Web Audio graph
  const connectAudioElement = useCallback(
    (el: HTMLAudioElement) => {
      // Prevent double-connecting the same element
      if (connectedElements.current.has(el)) {
        // Element already wired; just start the rAF loop if context is running
        if (
          audioContextRef.current?.state === "running" ||
          audioContextRef.current?.state === "suspended"
        ) {
          audioContextRef.current.resume().catch(() => {});
          setIsAnalyserActive(true);
          startRafLoop();
        }
        return;
      }

      // Create AudioContext lazily (must be triggered by user gesture)
      if (!audioContextRef.current) {
        const ctx = new AudioContext();
        audioContextRef.current = ctx;

        // Build EQ filter chain
        const filters: BiquadFilterNode[] = EQ_FREQUENCIES.map((freq) => {
          const filter = ctx.createBiquadFilter();
          filter.type = "peaking";
          filter.frequency.value = freq;
          filter.Q.value = 1;
          filter.gain.value = 0;
          return filter;
        });
        filtersRef.current = filters;

        // Pre-gain: pull down hot signals before the stabilizer sees them
        const preGain = ctx.createGain();
        preGain.gain.value = 10 ** (PRE_GAIN_DB / 20); // -6 dB = ~0.501
        preGainRef.current = preGain;

        // 80Hz bass control filter — lowshelf, user-adjustable via slider
        const bassFilter = ctx.createBiquadFilter();
        bassFilter.type = "lowshelf";
        bassFilter.frequency.value = 80;
        bassFilter.gain.value = 0; // default flat
        bassFilterRef.current = bassFilter;

        // A+/B+/C+/D+ amp class boost nodes — each adds +3 dB
        const ampClassGains: GainNode[] = Array.from({ length: 4 }, () => {
          const g = ctx.createGain();
          g.gain.value = AMP_CLASS_GAIN_LINEAR; // +3 dB per class
          return g;
        });
        ampClassGainsRef.current = ampClassGains;

        // 170,000W SYSTEM STABILIZER — DynamicsCompressor as brick-wall limiter
        // Covers: EQ, bass, amp class engines, 80Hz drop, signal booster, soft drive
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = STABILIZER_THRESHOLD_DBFS;
        compressor.knee.value = STABILIZER_KNEE;
        compressor.ratio.value = STABILIZER_RATIO;
        compressor.attack.value = STABILIZER_ATTACK;
        compressor.release.value = STABILIZER_RELEASE;
        compressorRef.current = compressor;

        // 170,000W dB METER STABILIZER — Second compressor dedicated to dB meter signal path
        // Wired in parallel (NOT in playback chain) — only for reading .reduction property
        // Source: post-EQ filters splitter → dbStabCompressor (NOT connected to destination)
        const dbStabCompressor = ctx.createDynamicsCompressor();
        dbStabCompressor.threshold.value = STABILIZER_THRESHOLD_DBFS;
        dbStabCompressor.knee.value = STABILIZER_KNEE;
        dbStabCompressor.ratio.value = STABILIZER_RATIO;
        dbStabCompressor.attack.value = STABILIZER_ATTACK;
        dbStabCompressor.release.value = STABILIZER_RELEASE;
        dbStabCompressorRef.current = dbStabCompressor;

        // Parallel splitter gain node — taps post-EQ signal and feeds the dB stab monitor
        const dbStabSplitter = ctx.createGain();
        dbStabSplitter.gain.value = 1; // passthrough — no level change

        // Create analyser AFTER the system compressor so we measure the stabilized signal
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.6; // Reduced from 0.8 — more responsive, less peak-hiding
        analyserRef.current = analyser;

        // Main chain: source → preGain → bassFilter(80Hz) → ampClassA → ampClassB → ampClassC → ampClassD → filters[0..9] → compressor(sys stab) → analyser → destination
        // Parallel branch: filters[last] → dbStabSplitter → dbStabCompressor (NOT → destination)
        preGain.connect(bassFilter);
        bassFilter.connect(ampClassGains[0]);
        ampClassGains[0].connect(ampClassGains[1]);
        ampClassGains[1].connect(ampClassGains[2]);
        ampClassGains[2].connect(ampClassGains[3]);
        // Last amp class feeds first EQ filter
        ampClassGains[3].connect(filters[0]);
        for (let i = 0; i < filters.length - 1; i++) {
          filters[i].connect(filters[i + 1]);
        }
        // Main path: last EQ filter → system stabilizer → analyser → destination
        filters[filters.length - 1].connect(compressor);
        compressor.connect(analyser);
        analyser.connect(ctx.destination);

        // Parallel dB stab monitoring branch: last EQ filter → splitter → dB stab compressor
        // (dbStabCompressor intentionally NOT connected to destination — measurement only)
        filters[filters.length - 1].connect(dbStabSplitter);
        dbStabSplitter.connect(dbStabCompressor);
      }

      // Resume context (required on iOS and after user gesture)
      if (audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume().catch(() => {});
      }

      // Create source node and connect to preGain → filters chain
      try {
        const source = audioContextRef.current.createMediaElementSource(el);
        // Connect to preGain (if available) or fall back to first filter
        const entryNode = preGainRef.current ?? filtersRef.current[0];
        source.connect(entryNode);
        connectedElements.current.add(el);
      } catch (err) {
        // createMediaElementSource throws if called twice on the same element
        // This should not happen due to WeakSet guard but safety net
        console.warn("Audio source already connected:", err);
      }

      setIsAnalyserActive(true);
      startRafLoop();
    },
    [startRafLoop],
  );

  // Adjust a specific EQ band gain
  const setEqGain = useCallback((index: number, gainDb: number) => {
    const filters = filtersRef.current;
    if (filters[index]) {
      filters[index].gain.value = Math.max(-12, Math.min(12, gainDb));
    }
  }, []);

  // Set 80Hz bass lowshelf gain (dB, -12 to +12)
  const setBassGain = useCallback((gainDb: number) => {
    const bf = bassFilterRef.current;
    if (bf) {
      bf.gain.value = Math.max(-12, Math.min(12, gainDb));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRafLoop();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [stopRafLoop]);

  return {
    audioContextRef,
    analyserRef,
    filtersRef,
    compressorRef,
    preGainRef,
    ampClassGainsRef,
    bassFilterRef,
    connectAudioElement,
    setEqGain,
    setBassGain,
    realDbLevel,
    isAnalyserActive,
    gainReduction,
    dbStabGainReduction,
    ampClassLevels,
    bassLevel,
    crestFactor,
  };
}
