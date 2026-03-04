import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";

const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

// 80,000,000W STABILIZER — FULL POWER — absolute brick-wall, zero clipping, no gains
// Stabilizer is the ONLY correction — no pre-gain, no amp boosts, no makeup gain
// Direct clean signal path: source → bassFilter(80Hz) → EQ → stabilizer → analyser
const STABILIZER_THRESHOLD_DBFS = -6; // dBFS — catch hot signals early
const STABILIZER_KNEE = 0; // hard knee — instant brick-wall clamp
const STABILIZER_RATIO = 100; // 80,000,000W full power brick-wall ratio
const STABILIZER_ATTACK = 0.0001; // 0.1ms — fastest possible clamp
const STABILIZER_RELEASE = 0.08; // 80ms — quick but musical release

interface UseAudioEngineReturn {
  audioContextRef: React.MutableRefObject<AudioContext | null>;
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
  filtersRef: React.MutableRefObject<BiquadFilterNode[]>;
  compressorRef: React.MutableRefObject<DynamicsCompressorNode | null>;
  preGainRef: React.MutableRefObject<GainNode | null>;
  gainRiderRef: React.MutableRefObject<GainNode | null>;
  makeupGainRef: React.MutableRefObject<GainNode | null>;
  ampClassGainsRef: React.MutableRefObject<GainNode[]>;
  bassFilterRef: React.MutableRefObject<BiquadFilterNode | null>;
  connectAudioElement: (el: HTMLAudioElement) => void;
  setEqGain: (index: number, gainDb: number) => void;
  setBassGain: (gainDb: number) => void;
  realDbLevel: number;
  isAnalyserActive: boolean;
  gainReduction: number; // how many dB the SYSTEM stabilizer (80,000,000W) is pulling back
  dbStabGainReduction: number; // how many dB the dB-meter stabilizer is pulling back
  ampClassLevels: number[]; // always [0,0,0,0] — amp class gains removed
  bassLevel: number; // 0–100: energy in 20–300Hz bass frequency range
  crestFactor: number; // peak/RMS ratio — high (>6) = clean dynamic, low (<3) = forced/clipped
  gainRiderDb: number; // always 0 — gain rider removed
  makeupGainDb: number; // always 0 — makeup gain removed
  truePeakDb: number; // true peak in dBFS
}

export function useAudioEngine(): UseAudioEngineReturn {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  // Second stabilizer — dedicated to dB meter signal path (parallel, not in playback chain)
  const dbStabCompressorRef = useRef<DynamicsCompressorNode | null>(null);
  // These refs kept for interface compatibility but not used in signal chain (NO GAINS)
  const preGainRef = useRef<GainNode | null>(null);
  const gainRiderRef = useRef<GainNode | null>(null);
  const makeupGainRef = useRef<GainNode | null>(null);
  const ampClassGainsRef = useRef<GainNode[]>([]);
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const rafRef = useRef<number | null>(null);
  // Track which elements have already been connected to avoid double-connecting
  const connectedElements = useRef<WeakSet<HTMLAudioElement>>(new WeakSet());

  const [realDbLevel, setRealDbLevel] = useState(60);
  const [isAnalyserActive, setIsAnalyserActive] = useState(false);
  const [gainReduction, setGainReduction] = useState(0);
  const [dbStabGainReduction, setDbStabGainReduction] = useState(0);
  // Amp class levels always off — gains removed
  const [bassLevel, setBassLevel] = useState(0);
  // default high crest = dynamic/clean signal
  const [crestFactor, setCrestFactor] = useState(10);
  // True peak state — highest instantaneous sample in dBFS
  const [truePeakDb, setTruePeakDb] = useState(-80);

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

      // No gains in chain — signal is raw. Map full range: -80 dBFS (silence) to 0 dBFS (ceiling) → 60 to 120 dB display
      // Wider mapping lets quiet and loud music both register meaningfully on the meter.
      const displayDb = Number.isFinite(dbFs)
        ? Math.max(60, Math.min(120, 60 + (dbFs + 80) * (60 / 80)))
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

      // --- TRUE PEAK: highest instantaneous sample value ---
      const truePeakDbVal = peak > 0.000001 ? 20 * Math.log10(peak) : -80;
      setTruePeakDb(truePeakDbVal);

      // NO GAINS — amp class boost removed. Levels always off.

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

        // 80Hz bass control filter — lowshelf, user-adjustable via slider (correction only, no auto gains)
        const bassFilter = ctx.createBiquadFilter();
        bassFilter.type = "lowshelf";
        bassFilter.frequency.value = 80;
        bassFilter.gain.value = 0; // default flat — user controls this manually
        bassFilterRef.current = bassFilter;

        // NO GAINS: no gainRider, no preGain, no ampClassGains, no makeupGain
        // Stabilizer is the ONLY correction in the chain
        ampClassGainsRef.current = [];

        // 80,000,000W SYSTEM STABILIZER — DynamicsCompressor as brick-wall limiter
        // Full power over everything — EQ, bass, entire signal chain
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = STABILIZER_THRESHOLD_DBFS;
        compressor.knee.value = STABILIZER_KNEE;
        compressor.ratio.value = STABILIZER_RATIO;
        compressor.attack.value = STABILIZER_ATTACK;
        compressor.release.value = STABILIZER_RELEASE;
        compressorRef.current = compressor;

        // 80,000,000W dB METER STABILIZER — Second compressor dedicated to dB meter signal path
        // Wired in parallel (NOT in playback chain) — only for reading .reduction property
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

        // Create analyser — reads the stabilizer output directly (no makeup gain)
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.6;
        analyserRef.current = analyser;

        // CLEAN CHAIN: source → bassFilter(80Hz) → filters[0..9] → compressor(80M stab) → analyser → destination
        // Parallel branch: filters[last] → dbStabSplitter → dbStabCompressor (measurement only)
        bassFilter.connect(filters[0]);
        for (let i = 0; i < filters.length - 1; i++) {
          filters[i].connect(filters[i + 1]);
        }
        // Main path: last EQ filter → system stabilizer → analyser → destination
        filters[filters.length - 1].connect(compressor);
        compressor.connect(analyser);
        analyser.connect(ctx.destination);

        // Parallel dB stab monitoring branch
        filters[filters.length - 1].connect(dbStabSplitter);
        dbStabSplitter.connect(dbStabCompressor);
      }

      // Resume context (required on iOS and after user gesture)
      if (audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume().catch(() => {});
      }

      // Create source node and connect directly to bassFilter (entry point — NO GAINS)
      try {
        const source = audioContextRef.current.createMediaElementSource(el);
        // Connect directly to bassFilter (80Hz correction) as entry point
        const entryNode = bassFilterRef.current ?? filtersRef.current[0];
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
    gainRiderRef,
    makeupGainRef,
    ampClassGainsRef,
    bassFilterRef,
    connectAudioElement,
    setEqGain,
    setBassGain,
    realDbLevel,
    isAnalyserActive,
    gainReduction,
    dbStabGainReduction,
    ampClassLevels: [0, 0, 0, 0], // NO GAINS — amp classes disabled
    bassLevel,
    crestFactor,
    gainRiderDb: 0, // NO GAINS — gain rider removed
    makeupGainDb: 0, // NO GAINS — makeup gain removed
    truePeakDb,
  };
}
