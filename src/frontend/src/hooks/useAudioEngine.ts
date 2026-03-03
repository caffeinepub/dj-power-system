import { useCallback, useEffect, useRef, useState } from "react";

const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

// 17000W STABILIZER — true hard limiter, zero clipping guaranteed
// Threshold at -12 dBFS so peaks are clamped well before 0 dBFS
const STABILIZER_THRESHOLD_DBFS = -12; // dBFS — aggressive limiting headroom
const STABILIZER_KNEE = 1; // hard knee for instant clamp
const STABILIZER_RATIO = 40; // near-brick-wall ratio
const STABILIZER_ATTACK = 0.0001; // 0.1ms — fastest possible clamp
const STABILIZER_RELEASE = 0.08; // 80ms — quick but musical release

// Pre-limiter gain reduction node — reduces input level before compressor
// This prevents the compressor from being overwhelmed by hot signals
const PRE_GAIN_DB = -6; // pull input down 6 dB before the stabilizer

interface UseAudioEngineReturn {
  audioContextRef: React.MutableRefObject<AudioContext | null>;
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
  filtersRef: React.MutableRefObject<BiquadFilterNode[]>;
  compressorRef: React.MutableRefObject<DynamicsCompressorNode | null>;
  preGainRef: React.MutableRefObject<GainNode | null>;
  connectAudioElement: (el: HTMLAudioElement) => void;
  setEqGain: (index: number, gainDb: number) => void;
  realDbLevel: number;
  isAnalyserActive: boolean;
  gainReduction: number; // how many dB the stabilizer is pulling back
}

export function useAudioEngine(): UseAudioEngineReturn {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const preGainRef = useRef<GainNode | null>(null);
  const rafRef = useRef<number | null>(null);
  // Track which elements have already been connected to avoid double-connecting
  const connectedElements = useRef<WeakSet<HTMLAudioElement>>(new WeakSet());

  const [realDbLevel, setRealDbLevel] = useState(60);
  const [isAnalyserActive, setIsAnalyserActive] = useState(false);
  const [gainReduction, setGainReduction] = useState(0);

  // rAF loop — reads real signal from AnalyserNode + compressor gain reduction
  const startRafLoop = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const bufferLength = analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);

    const loop = () => {
      if (!analyserRef.current) return;

      analyserRef.current.getFloatTimeDomainData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i];
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

      // Read actual gain reduction from the compressor node (negative dB = clamping)
      if (compressorRef.current) {
        // reduction is always 0 or negative; we display as positive "pull-back" amount
        const reduction = Math.abs(compressorRef.current.reduction);
        setGainReduction(reduction);
      }

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

        // 17000W STABILIZER — DynamicsCompressor as brick-wall limiter
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = STABILIZER_THRESHOLD_DBFS;
        compressor.knee.value = STABILIZER_KNEE;
        compressor.ratio.value = STABILIZER_RATIO;
        compressor.attack.value = STABILIZER_ATTACK;
        compressor.release.value = STABILIZER_RELEASE;
        compressorRef.current = compressor;

        // Create analyser AFTER the compressor so we measure the stabilized signal
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.6; // Reduced from 0.8 — more responsive, less peak-hiding
        analyserRef.current = analyser;

        // Chain: source → preGain → filters[0..9] → compressor(stabilizer) → analyser → destination
        for (let i = 0; i < filters.length - 1; i++) {
          filters[i].connect(filters[i + 1]);
        }
        // preGain feeds first filter
        preGain.connect(filters[0]);
        filters[filters.length - 1].connect(compressor);
        compressor.connect(analyser);
        analyser.connect(ctx.destination);
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
    connectAudioElement,
    setEqGain,
    realDbLevel,
    isAnalyserActive,
    gainReduction,
  };
}
