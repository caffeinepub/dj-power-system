import { useCallback, useEffect, useRef, useState } from "react";
import { BatteryPanel } from "./components/BatteryPanel";
import { Chainblock } from "./components/Chainblock";
import { ChargerUnit } from "./components/ChargerUnit";
import { DBMeter, type DbControlCommand } from "./components/DBMeter";
import { DJEqualizer } from "./components/DJEqualizer";
import { FilePicker } from "./components/FilePicker";
import { MagnetMusicChip } from "./components/MagnetMusicChip";
import { MasterMemoryChip } from "./components/MasterMemoryChip";
import { SmartAmpChips } from "./components/SmartAmpChips";
import { SpeakerLab } from "./components/SpeakerLab";
import { useAudioEngine } from "./hooks/useAudioEngine";

const DEFAULT_EQ_BANDS = [70, 70, 70, 72, 75, 73, 70, 68, 65, 62];
const LS_CHARGE_KEY = "dj-power-charge-level";
const LS_EQ_KEY = "dj-power-eq-bands";
const LS_BASS_GAIN_KEY = "dj-power-bass-gain";
const LS_MASTER_MEMORY_KEY = "dj-master-memory-chip";
const LS_BASS_AUTHORITY_KEY = "dj-bass-authority-mode";
const LS_SMOOTH_MODE_KEY = "dj-smooth-mode";

// Load saved value from localStorage, return fallback if missing/invalid
function loadFromStorage<T>(
  key: string,
  fallback: T,
  validate: (v: unknown) => v is T,
): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    return validate(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function isNumberInRange(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100;
}

function isEqBands(v: unknown): v is number[] {
  return (
    Array.isArray(v) && v.length === 10 && v.every((x) => typeof x === "number")
  );
}

function isBassGain(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= -12 && v <= 12;
}

function isBoolean(v: unknown): v is boolean {
  return typeof v === "boolean";
}

// Map EQ slider 0-100 → gain -12 to +12 dB
// 50 = 0 dB (neutral), 0 = -12 dB, 100 = +12 dB
function sliderToGain(value: number): number {
  return ((value - 50) / 50) * 12;
}

export default function App() {
  // Active page state
  const [activePage, setActivePage] = useState<"dj" | "lab">("dj");

  // Global state — hydrated from localStorage on first render
  const [chargeLevel, setChargeLevel] = useState(() =>
    loadFromStorage(LS_CHARGE_KEY, 0, isNumberInRange),
  );
  const [isCharging, setIsCharging] = useState(false);
  const isFullyCharged = chargeLevel >= 100;
  const isUnlocked = isFullyCharged;

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [eqBands, setEqBands] = useState<number[]>(() =>
    loadFromStorage(LS_EQ_KEY, DEFAULT_EQ_BANDS, isEqBands),
  );

  // Persist chargeLevel to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(LS_CHARGE_KEY, JSON.stringify(chargeLevel));
  }, [chargeLevel]);

  // Persist eqBands to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(LS_EQ_KEY, JSON.stringify(eqBands));
  }, [eqBands]);

  // Real Web Audio engine
  const {
    connectAudioElement,
    setEqGain,
    setBassGain,
    setBassAuthority,
    setSmoothMode,
    bassAuthorityMode: engineBassAuthorityMode,
    smoothMode: engineSmoothMode,
    realDbLevel,
    gainReduction,
    dbStabGainReduction,
    ampClassLevels,
    bassLevel,
    crestFactor,
    gainRiderDb,
    makeupGainDb,
    truePeakDb,
    clipCount,
    distortionPct,
    commanderStatus,
    gainStageDb,
  } = useAudioEngine();

  // 80Hz bass gain state (-12 to +12 dB) — hydrated from localStorage
  const [bassGain, setBassGainState] = useState(() =>
    loadFromStorage(LS_BASS_GAIN_KEY, 0, isBassGain),
  );

  const handleBassGainChange = useCallback(
    (gainDb: number) => {
      setBassGainState(gainDb);
      setBassGain(gainDb);
    },
    [setBassGain],
  );

  // Persist bassGain to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(LS_BASS_GAIN_KEY, JSON.stringify(bassGain));
  }, [bassGain]);

  // Bass Authority Mode — commanded by Master Memory Chip
  // Keeps 80Hz fixed but engages authority mode: wider Q, -2dB trim, highpass shelf at 200Hz
  const [bassAuthorityMode, setBassAuthorityModeState] = useState(() =>
    loadFromStorage(LS_BASS_AUTHORITY_KEY, false, isBoolean),
  );

  const handleBassAuthorityCommand = useCallback(
    (enabled: boolean) => {
      setBassAuthorityModeState(enabled);
      setBassAuthority(enabled);
    },
    [setBassAuthority],
  );

  // Persist bassAuthorityMode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(
      LS_BASS_AUTHORITY_KEY,
      JSON.stringify(bassAuthorityMode),
    );
  }, [bassAuthorityMode]);

  // Smooth mode state — hydrated from localStorage
  const [smoothMode, setSmoothModeState] = useState(() =>
    loadFromStorage(LS_SMOOTH_MODE_KEY, false, isBoolean),
  );

  const handleSmoothModeCommand = useCallback(
    (enabled: boolean) => {
      setSmoothModeState(enabled);
      setSmoothMode(enabled);
    },
    [setSmoothMode],
  );

  // Persist smoothMode to localStorage
  useEffect(() => {
    localStorage.setItem(LS_SMOOTH_MODE_KEY, JSON.stringify(smoothMode));
  }, [smoothMode]);

  // Keep engine states in sync with persisted state (e.g. on first load)
  // These are driven by set* calls; refs here for completeness
  void engineBassAuthorityMode;
  void engineSmoothMode;

  // Persist full system snapshot to master memory chip (never lose memory)
  useEffect(() => {
    const snapshot = {
      timestamp: Date.now(),
      chargeLevel,
      isPlaying,
      isUnlocked,
      eqBands,
      bassGain,
      bassAuthorityMode,
      smoothMode,
    };
    try {
      localStorage.setItem(LS_MASTER_MEMORY_KEY, JSON.stringify(snapshot));
    } catch {
      // storage full — silent fail
    }
  }, [
    chargeLevel,
    isPlaying,
    isUnlocked,
    eqBands,
    bassGain,
    bassAuthorityMode,
    smoothMode,
  ]);

  // Charging interval
  const chargeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chargeLevelRef = useRef(chargeLevel);

  // Keep ref in sync
  useEffect(() => {
    chargeLevelRef.current = chargeLevel;
  }, [chargeLevel]);

  const startCharging = useCallback(() => {
    if (chargeIntervalRef.current) clearInterval(chargeIntervalRef.current);
    chargeIntervalRef.current = setInterval(() => {
      setChargeLevel((prev) => {
        if (prev >= 100) {
          if (chargeIntervalRef.current) {
            clearInterval(chargeIntervalRef.current);
            chargeIntervalRef.current = null;
          }
          setIsCharging(false);
          return 100;
        }
        return Math.min(100, prev + 0.5);
      });
    }, 100);
  }, []);

  const stopCharging = useCallback(() => {
    if (chargeIntervalRef.current) {
      clearInterval(chargeIntervalRef.current);
      chargeIntervalRef.current = null;
    }
  }, []);

  const handleToggleCharging = useCallback(() => {
    if (isFullyCharged) return;
    if (isCharging) {
      stopCharging();
      setIsCharging(false);
    } else {
      setIsCharging(true);
      startCharging();
    }
  }, [isCharging, isFullyCharged, startCharging, stopCharging]);

  // Auto-stop charging when full
  useEffect(() => {
    if (isFullyCharged && chargeIntervalRef.current) {
      stopCharging();
      setIsCharging(false);
    }
  }, [isFullyCharged, stopCharging]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chargeIntervalRef.current) clearInterval(chargeIntervalRef.current);
    };
  }, []);

  // Audio handlers
  const handleFileSelect = useCallback((file: File) => {
    setAudioFile(file);
    setIsPlaying(false);
  }, []);

  const handlePlayPause = useCallback(() => {
    if (!isUnlocked || !audioFile) return;
    setIsPlaying((prev) => !prev);
  }, [isUnlocked, audioFile]);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // EQ band change — update slider state AND real Web Audio filter gain
  const handleBandChange = useCallback(
    (index: number, value: number) => {
      setEqBands((prev) => {
        const next = [...prev];
        next[index] = value;
        return next;
      });
      // Wire to real BiquadFilterNode
      setEqGain(index, sliderToGain(value));
    },
    [setEqGain],
  );

  // Commander controls dbControlCommand — almost always "green-hold" while playing
  // The Commander commands the stabilizer to keep signal green at all times
  // Only escalates if the signal is genuinely escaping past -3dBFS
  const dbControlCommand: DbControlCommand =
    realDbLevel >= -3
      ? "emergency-clamp"
      : realDbLevel >= -12
        ? "pull-back"
        : "green-hold";

  // When a new audio element is ready, connect it to the Web Audio graph
  const handleAudioElementReady = useCallback(
    (el: HTMLAudioElement) => {
      connectAudioElement(el);
    },
    [connectAudioElement],
  );

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{
        background: "oklch(0.08 0.008 260)",
        fontFamily: "JetBrains Mono, Geist Mono, monospace",
      }}
    >
      {/* ===== STUDIO NAMEPLATE ===== */}
      <div
        className="relative z-20 w-full flex items-center justify-center gap-2 overflow-hidden"
        style={{
          background:
            "linear-gradient(90deg, oklch(0.06 0.008 260) 0%, oklch(0.09 0.015 240) 50%, oklch(0.06 0.008 260) 100%)",
          borderBottom: "1px solid oklch(0.78 0.18 200 / 0.18)",
          paddingTop: "env(safe-area-inset-top, 6px)",
          paddingBottom: "6px",
          paddingLeft: "16px",
          paddingRight: "16px",
        }}
      >
        {/* Left accent line */}
        <div
          style={{
            flex: 1,
            maxWidth: 120,
            height: 1,
            background:
              "linear-gradient(to right, transparent, oklch(0.78 0.18 200 / 0.35))",
          }}
        />

        <span
          className="font-mono tracking-[0.22em] uppercase select-none"
          style={{
            fontSize: "9px",
            color: "oklch(0.55 0.06 220)",
            letterSpacing: "0.22em",
          }}
        >
          Gerrod&nbsp;/&nbsp;GP Custom Built
        </span>

        <span
          style={{
            width: 3,
            height: 3,
            borderRadius: "50%",
            background: "oklch(0.78 0.18 200 / 0.5)",
            boxShadow: "0 0 4px oklch(0.78 0.18 200 / 0.6)",
            flexShrink: 0,
          }}
        />

        <span
          className="font-mono tracking-[0.22em] uppercase select-none"
          style={{
            fontSize: "9px",
            color: "oklch(0.72 0.16 200)",
            textShadow: "0 0 10px oklch(0.78 0.18 200 / 0.35)",
            letterSpacing: "0.22em",
            flexShrink: 1,
            minWidth: 0,
          }}
        >
          Engineer&nbsp;&amp;&nbsp;Product Designer
        </span>

        <span
          style={{
            width: 3,
            height: 3,
            borderRadius: "50%",
            background: "oklch(0.78 0.18 200 / 0.5)",
            boxShadow: "0 0 4px oklch(0.78 0.18 200 / 0.6)",
            flexShrink: 0,
          }}
        />

        <span
          className="font-mono tracking-[0.22em] uppercase select-none"
          style={{
            fontSize: "9px",
            color: "oklch(0.42 0.04 240)",
            letterSpacing: "0.22em",
          }}
        >
          Built with AI
        </span>

        {/* Right accent line */}
        <div
          style={{
            flex: 1,
            maxWidth: 120,
            height: 1,
            background:
              "linear-gradient(to left, transparent, oklch(0.78 0.18 200 / 0.35))",
          }}
        />
      </div>

      {/* ===== PAGE TAB NAV ===== */}
      <div
        className="relative z-20 w-full flex items-center justify-center"
        style={{
          background: "oklch(0.07 0.008 260)",
          borderBottom: "1px solid oklch(0.78 0.18 200 / 0.12)",
          padding: "0 16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
          {(
            [
              { id: "dj" as const, label: "DJ SYSTEM" },
              { id: "lab" as const, label: "SPEAKER LAB" },
            ] as const
          ).map((tab) => {
            const isActive = activePage === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-ocid={`nav.${tab.id}.tab`}
                onClick={() => setActivePage(tab.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  borderBottom: isActive
                    ? "2px solid oklch(0.78 0.18 200)"
                    : "2px solid transparent",
                  padding: "10px 20px",
                  cursor: "pointer",
                  fontFamily: "JetBrains Mono, Geist Mono, monospace",
                  fontSize: "9px",
                  fontWeight: isActive ? 700 : 400,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: isActive
                    ? "oklch(0.88 0.22 200)"
                    : "oklch(0.42 0.04 240)",
                  textShadow: isActive
                    ? "0 0 10px oklch(0.78 0.18 200 / 0.5)"
                    : "none",
                  transition:
                    "color 0.2s ease, border-color 0.2s ease, text-shadow 0.2s ease",
                  whiteSpace: "nowrap",
                  outline: "none",
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "oklch(0.65 0.1 220)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "oklch(0.42 0.04 240)";
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Background grid pattern */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(oklch(0.78 0.18 200 / 0.03) 1px, transparent 1px),
            linear-gradient(90deg, oklch(0.78 0.18 200 / 0.03) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          zIndex: 0,
        }}
      />

      {/* Ambient radial glow at top */}
      <div
        className="fixed inset-x-0 top-0 pointer-events-none"
        style={{
          height: 400,
          background:
            "radial-gradient(ellipse at 50% 0%, oklch(0.78 0.18 200 / 0.06) 0%, transparent 70%)",
          zIndex: 0,
        }}
      />

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 py-4">
        {/* ===== HEADER ===== */}
        <header className="mb-4">
          <div className="flex items-center justify-between gap-2 min-w-0 overflow-hidden">
            <div className="min-w-0 flex-shrink overflow-hidden">
              <div className="flex items-center gap-3 min-w-0">
                {/* Logo / brand icon */}
                <div
                  className="relative flex items-center justify-center flex-shrink-0"
                  style={{ width: 32, height: 32 }}
                >
                  <svg
                    viewBox="0 0 44 44"
                    fill="none"
                    width="32"
                    height="32"
                    aria-hidden="true"
                    role="img"
                  >
                    <circle
                      cx="22"
                      cy="22"
                      r="20"
                      fill="oklch(0.1 0.02 240)"
                      stroke="oklch(0.78 0.18 200 / 0.5)"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M14 22 L20 14 L26 30 L32 22"
                      stroke="oklch(0.82 0.22 200)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        filter: "drop-shadow(0 0 4px oklch(0.78 0.18 200))",
                      }}
                    />
                    <circle
                      cx="22"
                      cy="22"
                      r="3"
                      fill="oklch(0.78 0.18 200)"
                      style={{
                        filter: "drop-shadow(0 0 4px oklch(0.78 0.18 200))",
                      }}
                    />
                  </svg>
                </div>

                <div>
                  <h1
                    className="font-mono text-sm font-bold tracking-[0.15em] uppercase"
                    style={{
                      color: "oklch(0.88 0.22 200)",
                      textShadow:
                        "0 0 20px oklch(0.78 0.18 200 / 0.6), 0 0 40px oklch(0.78 0.18 200 / 0.3)",
                    }}
                  >
                    DJ POWER SYSTEM
                  </h1>
                  <div
                    className="font-mono text-[10px] tracking-[0.3em] uppercase"
                    style={{ color: "oklch(0.4 0.03 240)" }}
                  >
                    PROFESSIONAL AUDIO MANAGEMENT UNIT
                  </div>
                </div>
              </div>
            </div>

            {/* System status indicators */}
            <div
              className="flex items-center gap-2 flex-wrap justify-end flex-shrink-0"
              style={{ minWidth: 0, maxWidth: "60%" }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: isCharging
                      ? "oklch(0.78 0.18 200)"
                      : "oklch(0.25 0.03 240)",
                    boxShadow: isCharging
                      ? "0 0 6px oklch(0.78 0.18 200)"
                      : "none",
                    transition: "all 0.3s ease",
                    animation: isCharging
                      ? "charging-pulse 0.8s ease-in-out infinite"
                      : "none",
                  }}
                />
                <span
                  className="font-mono text-[9px] tracking-widest"
                  style={{ color: "oklch(0.4 0.03 240)" }}
                >
                  PWR
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: isUnlocked
                      ? "oklch(0.78 0.22 145)"
                      : "oklch(0.62 0.22 25)",
                    boxShadow: isUnlocked
                      ? "0 0 6px oklch(0.78 0.22 145)"
                      : "0 0 6px oklch(0.62 0.22 25)",
                    transition: "all 0.3s ease",
                  }}
                />
                <span
                  className="font-mono text-[9px] tracking-widest"
                  style={{ color: "oklch(0.4 0.03 240)" }}
                >
                  SYS
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: isPlaying
                      ? "oklch(0.82 0.22 45)"
                      : "oklch(0.25 0.03 240)",
                    boxShadow: isPlaying
                      ? "0 0 6px oklch(0.72 0.2 45)"
                      : "none",
                    transition: "all 0.3s ease",
                  }}
                />
                <span
                  className="font-mono text-[9px] tracking-widest"
                  style={{ color: "oklch(0.4 0.03 240)" }}
                >
                  AUD
                </span>
              </div>

              {/* Live dB readout in header — shows power (0–120 scale) + raw dBFS */}
              <div
                className="flex flex-col items-center px-3 py-1 rounded"
                style={{
                  background: "oklch(0.11 0.015 260)",
                  border: `1px solid ${isPlaying ? "oklch(0.72 0.22 145 / 0.5)" : "oklch(0.22 0.04 240)"}`,
                }}
              >
                <span
                  className="font-mono text-xs font-bold tabular-nums"
                  style={{
                    color: "oklch(0.78 0.22 145)",
                    textShadow: isPlaying
                      ? "0 0 8px oklch(0.72 0.22 145 / 0.7), 0 0 16px oklch(0.72 0.22 145 / 0.35)"
                      : "none",
                    lineHeight: 1.2,
                  }}
                >
                  {isPlaying
                    ? `${Math.min(120, Math.max(0, Math.round(((realDbLevel + 80) / 80) * 120)))} PWR`
                    : "-- PWR"}
                </span>
                <span
                  className="font-mono tabular-nums"
                  style={{
                    fontSize: "8px",
                    color: "oklch(0.42 0.05 220)",
                    lineHeight: 1.2,
                    marginTop: 1,
                  }}
                >
                  {isPlaying
                    ? `${Math.round(realDbLevel) >= 0 ? "+" : ""}${Math.round(realDbLevel)} dBFS`
                    : "-- dBFS"}
                </span>
              </div>

              {/* Charge % in header */}
              <div
                className="font-mono text-xs font-bold tabular-nums px-3 py-1 rounded"
                style={{
                  background: "oklch(0.11 0.015 260)",
                  border: "1px solid oklch(0.22 0.04 240)",
                  color: isFullyCharged
                    ? "oklch(0.88 0.22 200)"
                    : isCharging
                      ? "oklch(0.82 0.22 45)"
                      : "oklch(0.45 0.03 240)",
                  textShadow: isFullyCharged
                    ? "0 0 8px oklch(0.78 0.18 200 / 0.6)"
                    : "none",
                }}
              >
                {Math.round(chargeLevel)}% CHG
              </div>
            </div>
          </div>

          {/* Horizontal divider */}
          <div
            className="mt-4"
            style={{
              height: 1,
              background:
                "linear-gradient(to right, transparent, oklch(0.78 0.18 200 / 0.3) 20%, oklch(0.78 0.18 200 / 0.3) 80%, transparent)",
            }}
          />
        </header>

        {/* ===== PAGE CONTENT ===== */}
        {/* DJ page — always mounted so audio never stops; hidden via display:none when on lab */}
        <div style={{ display: activePage === "dj" ? "block" : "none" }}>
          {/* ===== MAIN GRID LAYOUT ===== */}
          <main>
            {/* Row 1: Batteries + Charger + Chainblock */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-3 mb-3">
              {/* Left: Battery Panel */}
              <BatteryPanel
                chargeLevel={chargeLevel}
                isFullyCharged={isFullyCharged}
              />

              {/* Center: Charger + Chainblock stack */}
              <div className="flex flex-col gap-3" style={{ minWidth: 220 }}>
                <ChargerUnit
                  isCharging={isCharging}
                  isFullyCharged={isFullyCharged}
                  chargeLevel={chargeLevel}
                  onToggleCharging={handleToggleCharging}
                />
                <Chainblock isUnlocked={isUnlocked} chargeLevel={chargeLevel} />
              </div>

              {/* Right: SmartAmpChips + FilePicker */}
              <div className="flex flex-col gap-3">
                <SmartAmpChips
                  isUnlocked={isUnlocked}
                  dbLevel={realDbLevel}
                  isPlaying={isPlaying}
                  gainReduction={gainReduction}
                  dbStabGainReduction={dbStabGainReduction}
                  ampClassLevels={ampClassLevels}
                  bassLevel={bassLevel}
                  crestFactor={crestFactor}
                  bassGain={bassGain}
                  onBassGainChange={handleBassGainChange}
                  gainRiderDb={gainRiderDb}
                  makeupGainDb={makeupGainDb}
                  truePeakDb={truePeakDb}
                  bassAuthorityMode={bassAuthorityMode}
                  clipCount={clipCount}
                  distortionPct={distortionPct}
                  commanderStatus={commanderStatus}
                  gainStageDb={gainStageDb}
                />
                <FilePicker
                  audioFile={audioFile}
                  isPlaying={isPlaying}
                  isUnlocked={isUnlocked}
                  onFileSelect={handleFileSelect}
                  onPlayPause={handlePlayPause}
                  onStop={handleStop}
                  onAudioElementReady={handleAudioElementReady}
                />
              </div>
            </div>

            {/* Row 2: EQ + DB Meter */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3">
              {/* EQ Panel - full width */}
              <DJEqualizer
                eqBands={eqBands}
                isUnlocked={isUnlocked}
                onBandChange={handleBandChange}
              />

              {/* dB Meter - fixed width */}
              <div style={{ width: 130 }}>
                <DBMeter
                  dbLevel={realDbLevel}
                  isPlaying={isPlaying}
                  gainReduction={gainReduction}
                  dbControlCommand={dbControlCommand}
                />
              </div>
            </div>
          </main>

          {/* ===== MASTER MEMORY CHIP ===== */}
          <div className="mt-3">
            <MasterMemoryChip
              chargeLevel={chargeLevel}
              realDbLevel={realDbLevel}
              truePeakDb={truePeakDb}
              bassLevel={bassLevel}
              bassGain={bassGain}
              crestFactor={crestFactor}
              gainReduction={gainReduction}
              dbStabGainReduction={dbStabGainReduction}
              eqBands={eqBands}
              isPlaying={isPlaying}
              isUnlocked={isUnlocked}
              bassAuthorityMode={bassAuthorityMode}
              onBassAuthorityCommand={handleBassAuthorityCommand}
              smoothMode={smoothMode}
              onSmoothModeCommand={handleSmoothModeCommand}
            />
          </div>

          {/* ===== MAGNET MUSIC CHIP ===== */}
          <div className="mt-3">
            <MagnetMusicChip
              realDbLevel={realDbLevel}
              bassLevel={bassLevel}
              isPlaying={isPlaying}
            />
          </div>
        </div>

        {/* Speaker lab page — always mounted; hidden when on DJ page */}
        <div style={{ display: activePage === "lab" ? "block" : "none" }}>
          <main>
            <SpeakerLab
              realDbLevel={realDbLevel}
              bassLevel={bassLevel}
              gainReduction={gainReduction}
              isPlaying={isPlaying}
              smoothMode={smoothMode}
              bassAuthorityMode={bassAuthorityMode}
            />
          </main>
        </div>

        {/* ===== FOOTER ===== */}
        <footer className="mt-8 pt-4">
          <div
            className="mb-4"
            style={{
              height: 1,
              background:
                "linear-gradient(to right, transparent, oklch(0.78 0.18 200 / 0.2) 20%, oklch(0.78 0.18 200 / 0.2) 80%, transparent)",
            }}
          />
          <div className="flex items-center justify-between">
            <div
              className="font-mono text-[9px] tracking-widest"
              style={{ color: "oklch(0.3 0.02 240)" }}
            >
              DJ POWER SYSTEM v2.0 — REAL AUDIO ENGINE
            </div>
            <div
              className="font-mono text-[9px] tracking-widest"
              style={{ color: "oklch(0.3 0.02 240)" }}
            >
              © {new Date().getFullYear()}.{" "}
              <a
                href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "oklch(0.5 0.1 200)",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color =
                    "oklch(0.78 0.18 200)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color =
                    "oklch(0.5 0.1 200)";
                }}
              >
                Built with ♥ using caffeine.ai
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
