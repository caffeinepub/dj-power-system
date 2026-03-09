import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";

const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

// ═══════════════════════════════════════════════════════════════════════════════
// GAIN STAGE — clean level push, no watts assigned — just turned up hard
// The 4-unit clamping block (Stabilizer, Clip Monitor, Commander, Distortion)
// all clamp down together as one force — nothing escapes to the ceiling
// Chain: source → gainStage → bassFilter(80Hz) → highpassShelf → EQ → smoothFilters
//        → STAGE1_COMPRESSOR (soft knee catch) → STAGE2_LIMITER (brick-wall)
//        → analyser → destination
// ═══════════════════════════════════════════════════════════════════════════════
// ── GAIN STAGE: pulled back to +21.6dB for clean, clear output ──
// Commander Block clamps peaks — gain pushed hard but not overloading the chain
const GAIN_STAGE_LINEAR = 12.0; // +21.6dB — strong push, clear and warm, not overloading

// STAGE 1 — PRIMARY COMPRESSOR (Stabilizer · Clip Monitor · Commander · Distortion Protection)
// All 4 units mixed together, clamping down on the gain stage as one force
// Musical 4:1 ratio with wide knee — smooth, warm, no harsh artifacts
const STAB_THRESHOLD = -14; // -14dBFS — catches peaks early before they build
const STAB_KNEE = 6; // wide soft knee — smooth, musical, no harsh clamp
const STAB_RATIO = 4; // 4:1 — musical compression, warm and clear
const STAB_ATTACK = 0.003; // 3ms — lets transients through for punch, then clamps
const STAB_RELEASE = 0.25; // 250ms — slow, musical release — no pumping, no rushing

// STAGE 2 — BRICK-WALL LIMITER (Distortion Protection · Final Commander)
// Absolute ceiling — NOTHING gets past. Zero clipping. Zero distortion. Ever.
const LIMITER_THRESHOLD = -1.0; // -1dBFS — absolute ceiling, nothing escapes
const LIMITER_KNEE = 0; // hard knee — instant response
const LIMITER_RATIO = 100; // 100:1 — true brick wall
const LIMITER_ATTACK = 0.00005; // 0.05ms — faster than any peak can form
const LIMITER_RELEASE = 0.1; // 100ms — clean recovery, signal breathes naturally

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
  setBassAuthority: (enabled: boolean) => void;
  setSmoothMode: (enabled: boolean) => void;
  bassAuthorityMode: boolean;
  smoothMode: boolean;
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
  clipCount: number; // running count of clipping events (truePeak >= -1 dBFS)
  distortionPct: number; // 0–100: inverted crest factor — high = distorted/flat signal
  commanderStatus: string; // live status string from STAB CLIP DIST CMDR
  gainStageDb: number; // current gain stage level in dB (+12dB = 4.0 linear)
}

export function useAudioEngine(): UseAudioEngineReturn {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  // Stage 2 — brick-wall limiter: the final guardian before destination
  const brickWallLimiterRef = useRef<DynamicsCompressorNode | null>(null);
  // Second stabilizer — dedicated to dB meter signal path (parallel, not in playback chain)
  const dbStabCompressorRef = useRef<DynamicsCompressorNode | null>(null);
  // GAIN STAGE — 800,000,000W — entry point of chain, pushes dBFS up before stabilizer
  const gainStageRef = useRef<GainNode | null>(null);
  // These refs kept for interface compatibility but not used in signal chain (NO GAINS)
  const preGainRef = useRef<GainNode | null>(null);
  const gainRiderRef = useRef<GainNode | null>(null);
  const makeupGainRef = useRef<GainNode | null>(null);
  const ampClassGainsRef = useRef<GainNode[]>([]);
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  // Highpass shelf — placed after bassFilter, before EQ chain
  // In authority mode: active at 200Hz (prevents bass bleed into mids/highs)
  // In normal mode: bypassed (frequency set to 20Hz — effectively passes everything)
  const highpassShelfRef = useRef<BiquadFilterNode | null>(null);
  // Current bass gain value — needed by setBassAuthority to apply gain trim
  const bassGainValueRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  // Track which elements have already been connected to avoid double-connecting
  const connectedElements = useRef<WeakSet<HTMLAudioElement>>(new WeakSet());

  // Bass Authority mode state
  const [bassAuthorityMode, setBassAuthorityModeState] = useState(false);

  // SMOOTH MODE state — loud but smooth, no harshness at any volume
  const [smoothMode, setSmoothModeState] = useState(false);
  // Smooth mode filter refs — high-shelf cut + mid presence notch
  const smoothHighShelfRef = useRef<BiquadFilterNode | null>(null);
  const smoothMidNotchRef = useRef<BiquadFilterNode | null>(null);

  const [realDbLevel, setRealDbLevel] = useState(-80);
  const [isAnalyserActive, setIsAnalyserActive] = useState(false);
  const [gainReduction, setGainReduction] = useState(0);
  const [dbStabGainReduction, setDbStabGainReduction] = useState(0);
  // Amp class levels always off — gains removed
  const [bassLevel, setBassLevel] = useState(0);
  // default high crest = dynamic/clean signal
  const [crestFactor, setCrestFactor] = useState(10);
  // True peak state — highest instantaneous sample in dBFS
  const [truePeakDb, setTruePeakDb] = useState(-80);

  // Chip 9/10/11: Clipping & distortion commander state
  const [clipCount, setClipCount] = useState(0);
  const [distortionPct, setDistortionPct] = useState(0);
  const [commanderStatus, setCommanderStatus] = useState(
    "CLIP CLEAR · DISTORTION CLEAR · SIGNAL CLEAN",
  );

  // rAF loop — reads real signal from AnalyserNode + compressor gain reduction
  // UI state is throttled to ~15fps (every 66ms) to prevent flicker —
  // audio computation still runs every frame for accuracy
  const startRafLoop = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const bufferLength = analyser.fftSize;
    const timeDataArray = new Float32Array(bufferLength);
    // Separate Uint8 array for FFT frequency data (bass detection)
    const freqDataArray = new Uint8Array(analyser.frequencyBinCount);

    // Titanium-strength throttle: UI updates locked at ~15fps so the screen
    // never gets overwhelmed no matter how active the bass signal is
    const UI_UPDATE_INTERVAL_MS = 66; // ~15fps — smooth but rock-solid
    let lastUiUpdate = 0;

    const loop = (timestamp: number) => {
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

      // Real dBFS value — no mapping, no scaling. This is the true signal level.
      // Range: -80 (silence) to 0 (ceiling). This matches any external meter.
      const displayDb = Number.isFinite(dbFs)
        ? Math.max(-80, Math.min(0, dbFs))
        : -80;

      // --- CREST FACTOR: peak / RMS — measures signal dynamics ---
      const rawCrest = rms > 0.000001 ? peak / rms : 10;
      const clampedCrest = Math.max(1, Math.min(20, rawCrest));

      // --- FREQUENCY-DOMAIN data for bass level (Chip 2) ---
      analyserRef.current.getByteFrequencyData(freqDataArray);
      const BASS_BINS = 12;
      let bassSum = 0;
      for (let i = 0; i < BASS_BINS; i++) {
        bassSum += freqDataArray[i];
      }
      const bassAvg = bassSum / BASS_BINS; // 0–255
      const bassNormalized = Math.min(100, Math.round((bassAvg / 255) * 100));

      // Read gain reduction values
      const reduction = compressorRef.current
        ? Math.abs(compressorRef.current.reduction)
        : 0;
      const dbReduction = dbStabCompressorRef.current
        ? Math.abs(dbStabCompressorRef.current.reduction)
        : 0;

      // --- TRUE PEAK ---
      const truePeakDbVal = peak > 0.000001 ? 20 * Math.log10(peak) : -80;

      // Titanium throttle — only push state to React when enough time has passed
      // This is the fix for the Command Center flicker: audio runs every frame,
      // but the UI only redraws ~15 times per second, which the screen handles easily
      if (timestamp - lastUiUpdate >= UI_UPDATE_INTERVAL_MS) {
        lastUiUpdate = timestamp;
        setRealDbLevel(displayDb);
        setCrestFactor(clampedCrest);
        setBassLevel(bassNormalized);
        setGainReduction(reduction);
        setDbStabGainReduction(dbReduction);
        setTruePeakDb(truePeakDbVal);

        // --- Chip 9: Clip count — increment when true peak >= -1 dBFS ---
        const isClipping = truePeakDbVal >= -1;
        setClipCount((prev) => (isClipping ? prev + 1 : Math.max(0, prev - 1)));

        // --- Chip 10: Distortion % — inverted crest factor ---
        // The Commander Block keeps this low — 2-stage chain kills distortion before it forms
        // Higher threshold (>80) before flagging distortion — Commander is always managing it
        const distPct = Math.max(
          0,
          Math.min(100, Math.round((1 - (clampedCrest - 1) / 9) * 100)),
        );
        setDistortionPct(distPct);

        // --- Chip 11: Commander status string ---
        // Commander commands everything GREEN — status only escalates on genuine failure
        setClipCount((prevClips) => {
          const clipping = isClipping
            ? prevClips + 1
            : Math.max(0, prevClips - 1);
          const hasClip = clipping > 0;
          const hasDist = distPct >= 80; // very high threshold — Commander kills distortion early
          const isClamping = reduction > 0.5;
          let status: string;
          if (hasClip && hasDist) {
            status = "⚡ ALL 5 CLAMPING — CLIP + DISTORTION INTERCEPTED";
          } else if (hasClip) {
            status = "⚡ COMMANDER: CLIP CAUGHT — EVERYTHING GREEN";
          } else if (hasDist) {
            status = "⚡ COMMANDER: DISTORTION KILLED — SIGNAL GREEN";
          } else if (isClamping) {
            status = "✓ COMMANDER: CLAMPING — ALL GREEN · 116–117 RANGE";
          } else {
            status = "✓ COMMANDER: ALL GREEN · ZERO DISTORTION · ZERO CLIP";
          }
          setCommanderStatus(status);
          return clipping;
        });
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

        // 80Hz bass control filter — lowshelf, user-adjustable via slider (correction only, no auto gains)
        const bassFilter = ctx.createBiquadFilter();
        bassFilter.type = "lowshelf";
        bassFilter.frequency.value = 80;
        bassFilter.Q.value = 0.7; // default Q — normal mode
        bassFilter.gain.value = 0; // default flat — user controls this manually
        bassFilterRef.current = bassFilter;

        // Highpass shelf — BASS AUTHORITY protection node
        // Sits between bassFilter and EQ chain
        // Authority OFF: frequency at 20Hz (bypassed — all bass passes through)
        // Authority ON:  frequency at 200Hz (blocks bass bleed into mids/highs)
        const highpassShelf = ctx.createBiquadFilter();
        highpassShelf.type = "highpass";
        highpassShelf.frequency.value = 20; // bypassed by default
        highpassShelf.Q.value = 0.7;
        highpassShelfRef.current = highpassShelf;

        // GAIN STAGE — 800,000,000W — pushes signal up hard before stabilizer
        // Chain entry: source → gainStage → bassFilter → ...
        const gainStage = ctx.createGain();
        gainStage.gain.value = GAIN_STAGE_LINEAR; // ~+12dB
        gainStageRef.current = gainStage;

        // NO GAINS for amp classes — stabilizer handles correction
        ampClassGainsRef.current = [];

        // SMOOTH MODE filters — wired between EQ chain and stabilizer
        // OFF by default (gain = 0, no coloring)
        // HIGH SHELF: gentle -2dB roll-off above 6kHz — removes harshness without dulling the highs
        const smoothHighShelf = ctx.createBiquadFilter();
        smoothHighShelf.type = "highshelf";
        smoothHighShelf.frequency.value = 6000;
        smoothHighShelf.gain.value = 0; // bypassed until smooth mode ON
        smoothHighShelfRef.current = smoothHighShelf;

        // MID NOTCH: slight -1.5dB dip at 3.2kHz — the "harshness zone" in loud music
        const smoothMidNotch = ctx.createBiquadFilter();
        smoothMidNotch.type = "peaking";
        smoothMidNotch.frequency.value = 3200;
        smoothMidNotch.Q.value = 1.2;
        smoothMidNotch.gain.value = 0; // bypassed until smooth mode ON
        smoothMidNotchRef.current = smoothMidNotch;

        // ── STAGE 1: PRIMARY COMPRESSOR (Stabilizer · Clip Monitor · Commander) ──
        // Catches the bulk of peaks before they reach the brick-wall limiter
        // Engages at -14dBFS with 20:1 ratio — smooth, powerful, no harsh artifacts
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = STAB_THRESHOLD;
        compressor.knee.value = STAB_KNEE;
        compressor.ratio.value = STAB_RATIO;
        compressor.attack.value = STAB_ATTACK;
        compressor.release.value = STAB_RELEASE;
        compressorRef.current = compressor;

        // ── STAGE 2: BRICK-WALL LIMITER (Distortion Protection · Final Commander) ──
        // Absolute hard ceiling at -1dBFS — NOTHING gets past. Zero clipping. Zero distortion.
        // If Stage 1 misses a peak, Stage 2 catches it. The signal NEVER hits 0dBFS.
        const brickWallLimiter = ctx.createDynamicsCompressor();
        brickWallLimiter.threshold.value = LIMITER_THRESHOLD;
        brickWallLimiter.knee.value = LIMITER_KNEE;
        brickWallLimiter.ratio.value = LIMITER_RATIO;
        brickWallLimiter.attack.value = LIMITER_ATTACK;
        brickWallLimiter.release.value = LIMITER_RELEASE;
        brickWallLimiterRef.current = brickWallLimiter;

        // dB METER STABILIZER — parallel compressor for monitoring .reduction only
        // NOT in playback chain — wired in parallel for display readings
        const dbStabCompressor = ctx.createDynamicsCompressor();
        dbStabCompressor.threshold.value = STAB_THRESHOLD;
        dbStabCompressor.knee.value = STAB_KNEE;
        dbStabCompressor.ratio.value = STAB_RATIO;
        dbStabCompressor.attack.value = STAB_ATTACK;
        dbStabCompressor.release.value = STAB_RELEASE;
        dbStabCompressorRef.current = dbStabCompressor;

        // Parallel splitter gain node — taps post-smooth signal, feeds the dB stab monitor
        const dbStabSplitter = ctx.createGain();
        dbStabSplitter.gain.value = 1; // passthrough

        // Create analyser — reads AFTER the brick-wall limiter (true clean output)
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.5; // slightly faster response for accurate readings
        analyserRef.current = analyser;

        // ── FULL 2-STAGE CHAIN ──
        // source → gainStage → bassFilter(80Hz) → highpassShelf → EQ[0..9]
        //        → smoothHighShelf → smoothMidNotch
        //        → STAGE1 compressor (-14dBFS, 20:1, soft knee)
        //        → STAGE2 brick-wall (-1dBFS, 100:1, hard knee)
        //        → analyser → destination
        // Parallel: smoothMidNotch → dbStabSplitter → dbStabCompressor (monitoring)
        gainStage.connect(bassFilter);
        bassFilter.connect(highpassShelf);
        highpassShelf.connect(filters[0]);
        for (let i = 0; i < filters.length - 1; i++) {
          filters[i].connect(filters[i + 1]);
        }
        // Smooth mode filters between last EQ and Stage 1 compressor
        filters[filters.length - 1].connect(smoothHighShelf);
        smoothHighShelf.connect(smoothMidNotch);
        // Stage 1 → Stage 2 → analyser → speakers
        smoothMidNotch.connect(compressor);
        compressor.connect(brickWallLimiter);
        brickWallLimiter.connect(analyser);
        analyser.connect(ctx.destination);

        // Parallel dB stab monitoring branch (taps after smooth, before limiting)
        smoothMidNotch.connect(dbStabSplitter);
        dbStabSplitter.connect(dbStabCompressor);
      }

      // Resume context (required on iOS and after user gesture)
      if (audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume().catch(() => {});
      }

      // Create source node and connect to gainStage (entry point — GAIN STAGE first)
      try {
        const source = audioContextRef.current.createMediaElementSource(el);
        // Connect to gainStage (800MW) as entry point — pushes dBFS up before stabilizer
        const entryNode =
          gainStageRef.current ??
          bassFilterRef.current ??
          filtersRef.current[0];
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
      const clamped = Math.max(-12, Math.min(12, gainDb));
      bf.gain.value = clamped;
      bassGainValueRef.current = clamped;
    }
  }, []);

  // BASS AUTHORITY MODE — commanded by Master Memory Chip
  // ON:  wider Q (deep not peaky) + -2dB trim + highpass shelf at 200Hz (no bleed into highs)
  // OFF: restore normal Q + restore slider gain + bypass highpass shelf (freq → 20Hz)
  const setBassAuthority = useCallback((enabled: boolean) => {
    const bf = bassFilterRef.current;
    const hs = highpassShelfRef.current;

    if (enabled) {
      if (bf) {
        bf.Q.value = 0.5; // wider Q — bass sounds deeper, not peaky
        // Apply -2dB trim so bass sits under the mix (not on top)
        const trimmedGain = Math.max(-12, bassGainValueRef.current - 2);
        bf.gain.value = trimmedGain;
      }
      if (hs) {
        hs.frequency.value = 200; // ACTIVE — prevents bass bleed above 200Hz into mids/highs
        hs.Q.value = 0.7;
      }
    } else {
      if (bf) {
        bf.Q.value = 0.7; // normal Q — standard response
        bf.gain.value = bassGainValueRef.current; // restore slider gain
      }
      if (hs) {
        hs.frequency.value = 20; // BYPASSED — all frequencies pass through
        hs.Q.value = 0.7;
      }
    }

    setBassAuthorityModeState(enabled);
  }, []);

  // SMOOTH MODE — commanded by Master Memory Chip
  // ON:  high-shelf -4dB above 5kHz + -2.5dB notch at 2.5kHz (harshness zone)
  //      → smooth jazz clarity — warm, full, loud but never harsh at any volume
  // OFF: both filters flat (0dB gain) — bypassed
  const setSmoothMode = useCallback((enabled: boolean) => {
    const hs = smoothHighShelfRef.current;
    const mn = smoothMidNotchRef.current;
    if (enabled) {
      if (hs) {
        hs.frequency.value = 5000; // rolls off above 5kHz — removes all edge and harshness
        hs.gain.value = -4; // deeper cut — smooth jazz warmth
      }
      if (mn) {
        mn.frequency.value = 2500; // 2.5kHz — upper harshness zone
        mn.Q.value = 1.5; // focused notch — surgical harshness removal
        mn.gain.value = -2.5; // deeper notch — cleanest possible sound
      }
    } else {
      if (hs) {
        hs.frequency.value = 6000;
        hs.gain.value = 0; // bypassed
      }
      if (mn) {
        mn.frequency.value = 3200;
        mn.Q.value = 1.2;
        mn.gain.value = 0; // bypassed
      }
    }
    setSmoothModeState(enabled);
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
    setBassAuthority,
    setSmoothMode,
    bassAuthorityMode,
    smoothMode,
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
    clipCount,
    distortionPct,
    commanderStatus,
    gainStageDb: 20 * Math.log10(GAIN_STAGE_LINEAR), // ~+21.6dB — clean push, Commander Block holds everything green
  };
}
