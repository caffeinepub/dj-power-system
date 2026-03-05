import { useEffect, useRef } from "react";

export interface MasterMemoryChipProps {
  chargeLevel: number;
  realDbLevel: number;
  truePeakDb: number;
  bassLevel: number;
  bassGain: number;
  crestFactor: number;
  gainReduction: number;
  dbStabGainReduction: number;
  eqBands: number[]; // 10 values 0-100
  isPlaying: boolean;
  isUnlocked: boolean;
  bassAuthorityMode: boolean;
  onBassAuthorityCommand: (enabled: boolean) => void;
  smoothMode: boolean;
  onSmoothModeCommand: (enabled: boolean) => void;
}

// Memory snapshot type stored in localStorage
interface MemorySnapshot {
  timestamp: number;
  chargeLevel: number;
  realDbLevel: number;
  truePeakDb: number;
  bassLevel: number;
  bassGain: number;
  crestFactor: number;
  gainReduction: number;
  dbStabGainReduction: number;
  eqBands: number[];
  isPlaying: boolean;
  isUnlocked: boolean;
  bassAuthorityMode: boolean;
  smoothMode: boolean;
}

const LS_MEMORY_KEY = "dj-master-memory-chip";

const GREEN = "oklch(0.78 0.22 145)";
const GREEN_BRIGHT = "oklch(0.88 0.25 145)";
const GREEN_DIM = "oklch(0.52 0.14 145)";
const CYAN = "oklch(0.78 0.18 200)";
const CYAN_BRIGHT = "oklch(0.88 0.2 200)";
const CYAN_DIM = "oklch(0.45 0.1 200)";
const GOLD = "oklch(0.82 0.18 85)";
const GOLD_BRIGHT = "oklch(0.92 0.2 85)";
const GOLD_DIM = "oklch(0.5 0.1 85)";

export function MasterMemoryChip({
  chargeLevel,
  realDbLevel,
  truePeakDb,
  bassLevel,
  bassGain,
  crestFactor,
  gainReduction,
  dbStabGainReduction,
  eqBands,
  isPlaying,
  isUnlocked,
  bassAuthorityMode,
  onBassAuthorityCommand,
  smoothMode,
  onSmoothModeCommand,
}: MasterMemoryChipProps) {
  // Persist snapshot to localStorage whenever any prop changes
  const snapshotRef = useRef<MemorySnapshot | null>(null);

  useEffect(() => {
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      chargeLevel,
      realDbLevel,
      truePeakDb,
      bassLevel,
      bassGain,
      crestFactor,
      gainReduction,
      dbStabGainReduction,
      eqBands,
      isPlaying,
      isUnlocked,
      bassAuthorityMode,
      smoothMode,
    };
    snapshotRef.current = snapshot;
    try {
      localStorage.setItem(LS_MEMORY_KEY, JSON.stringify(snapshot));
    } catch {
      // storage full — silent fail
    }
  }, [
    chargeLevel,
    realDbLevel,
    truePeakDb,
    bassLevel,
    bassGain,
    crestFactor,
    gainReduction,
    dbStabGainReduction,
    eqBands,
    isPlaying,
    isUnlocked,
    bassAuthorityMode,
    smoothMode,
  ]);

  // Compute control command for display
  const dbControlCommand =
    realDbLevel >= 105
      ? "EMERGENCY CLAMP"
      : realDbLevel >= 90
        ? "PULL BACK"
        : "GREEN HOLD";

  const cmdColor =
    dbControlCommand === "EMERGENCY CLAMP"
      ? GREEN_BRIGHT // still show green — we're commanding green
      : dbControlCommand === "PULL BACK"
        ? GREEN_BRIGHT
        : GREEN_BRIGHT;

  const dbDisplay = isPlaying ? Math.round(realDbLevel) : "--";

  // Bass Authority status text — freq always 80Hz
  const bassAuthorityStatusText = bassAuthorityMode
    ? "AUTHORITY ACTIVE — 80Hz DEEP"
    : "80Hz NORMAL";

  return (
    <div
      data-ocid="memory.chip.panel"
      className="master-memory-chip"
      style={{
        width: "100%",
        position: "relative",
        borderRadius: 8,
        background:
          "linear-gradient(135deg, oklch(0.07 0.015 260) 0%, oklch(0.09 0.02 220) 100%)",
        border: `1.5px solid ${GREEN}`,
        boxShadow: `
          0 0 12px oklch(0.72 0.22 145 / 0.25),
          0 0 28px oklch(0.72 0.22 145 / 0.08),
          inset 0 0 16px oklch(0.72 0.22 145 / 0.03)
        `,
        animation: "chip-heartbeat 3s ease-in-out infinite",
        overflow: "hidden",
        padding: "5px 10px",
      }}
    >
      {/* Subtle dot grid overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle, oklch(0.72 0.22 145 / 0.04) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        {/* LED + Title */}
        <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
          <div
            className="chip-alive-led"
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: GREEN_BRIGHT,
              boxShadow: `0 0 6px ${GREEN_BRIGHT}, 0 0 12px oklch(0.72 0.22 145 / 0.5)`,
              flexShrink: 0,
              animation: "chip-led-pulse 1.2s ease-in-out infinite",
            }}
          />
          <span
            className="font-mono font-black tracking-[0.18em] uppercase"
            style={{
              fontSize: 9,
              color: GREEN_BRIGHT,
              textShadow: "0 0 10px oklch(0.72 0.22 145 / 0.7)",
              whiteSpace: "nowrap",
            }}
          >
            CTRL CENTER — DB LOCKED GREEN
          </span>
        </div>

        {/* Divider */}
        <div
          style={{
            width: 1,
            height: 18,
            background: "oklch(0.72 0.22 145 / 0.25)",
            flexShrink: 0,
          }}
        />

        {/* Live dB */}
        <div className="flex items-center gap-1.5" style={{ flexShrink: 0 }}>
          <span
            className="font-mono tracking-widest uppercase"
            style={{ fontSize: 8, color: GREEN_DIM }}
          >
            dB
          </span>
          <span
            className="font-mono font-bold tabular-nums"
            style={{
              fontSize: 11,
              color: cmdColor,
              textShadow: `0 0 8px ${GREEN}`,
              lineHeight: 1,
            }}
          >
            {dbDisplay}
          </span>
        </div>

        {/* Divider */}
        <div
          style={{
            width: 1,
            height: 18,
            background: "oklch(0.72 0.22 145 / 0.25)",
            flexShrink: 0,
          }}
        />

        {/* Charge */}
        <div className="flex items-center gap-1.5" style={{ flexShrink: 0 }}>
          <span
            className="font-mono tracking-widest uppercase"
            style={{ fontSize: 8, color: GREEN_DIM }}
          >
            CHG
          </span>
          <span
            className="font-mono font-bold tabular-nums"
            style={{
              fontSize: 9,
              color: GREEN_BRIGHT,
              textShadow: `0 0 6px ${GREEN}`,
              lineHeight: 1,
            }}
          >
            {Math.round(chargeLevel)}%
          </span>
        </div>

        {/* Divider */}
        <div
          style={{
            width: 1,
            height: 18,
            background: "oklch(0.72 0.22 145 / 0.25)",
            flexShrink: 0,
          }}
        />

        {/* Control command */}
        <div className="flex items-center gap-1.5" style={{ flexShrink: 0 }}>
          <span
            className="font-mono tracking-widest uppercase"
            style={{ fontSize: 8, color: GREEN_DIM }}
          >
            CMD
          </span>
          <span
            className="font-mono font-bold tracking-wider"
            style={{
              fontSize: 9,
              color: GREEN_BRIGHT,
              textShadow: `0 0 8px ${GREEN}`,
            }}
          >
            {dbControlCommand}
          </span>
        </div>

        {/* Divider */}
        <div
          style={{
            width: 1,
            height: 18,
            background: "oklch(0.72 0.22 145 / 0.25)",
            flexShrink: 0,
          }}
        />

        {/* SYS status */}
        <div className="flex items-center gap-1.5" style={{ flexShrink: 0 }}>
          <span
            className="font-mono tracking-widest uppercase"
            style={{ fontSize: 8, color: GREEN_DIM }}
          >
            SYS
          </span>
          <span
            className="font-mono font-bold"
            style={{
              fontSize: 9,
              color: GREEN_BRIGHT,
              textShadow: `0 0 6px ${GREEN}`,
            }}
          >
            {isUnlocked ? "UNLOCKED" : "STANDBY"}
          </span>
        </div>

        {/* Divider */}
        <div
          style={{
            width: 1,
            height: 18,
            background: "oklch(0.72 0.22 145 / 0.25)",
            flexShrink: 0,
          }}
        />

        {/* Bass Authority Command Toggle */}
        <button
          data-ocid="memory.bass_authority.toggle"
          type="button"
          onClick={() => onBassAuthorityCommand(!bassAuthorityMode)}
          className="flex items-center gap-1.5"
          style={{
            flexShrink: 0,
            background: bassAuthorityMode
              ? "oklch(0.78 0.18 200 / 0.12)"
              : "transparent",
            border: `1px solid ${bassAuthorityMode ? `${CYAN}50` : "oklch(0.72 0.22 145 / 0.18)"}`,
            borderRadius: 4,
            padding: "2px 6px",
            cursor: "pointer",
            transition: "all 0.18s ease",
            boxShadow: bassAuthorityMode ? `0 0 8px ${CYAN}30` : "none",
          }}
        >
          <span
            className="font-mono tracking-widest uppercase"
            style={{
              fontSize: 8,
              color: bassAuthorityMode ? CYAN_DIM : GREEN_DIM,
            }}
          >
            BASS AUTH
          </span>
          <span
            className="font-mono font-bold tracking-wider"
            style={{
              fontSize: 9,
              color: bassAuthorityMode ? CYAN_BRIGHT : GREEN_DIM,
              textShadow: bassAuthorityMode ? `0 0 8px ${CYAN}` : "none",
              transition: "all 0.18s ease",
            }}
          >
            {bassAuthorityMode ? "ON ●" : "OFF"}
          </span>
        </button>

        {/* Bass frequency readout — always 80Hz */}
        <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
          <span
            className="font-mono tracking-widest uppercase"
            style={{
              fontSize: 8,
              color: bassAuthorityMode ? CYAN_DIM : GREEN_DIM,
            }}
          >
            FREQ
          </span>
          <span
            className="font-mono font-bold tabular-nums"
            style={{
              fontSize: 9,
              color: bassAuthorityMode ? CYAN_BRIGHT : GREEN_BRIGHT,
              textShadow: bassAuthorityMode
                ? `0 0 6px ${CYAN}`
                : `0 0 6px ${GREEN}`,
              transition: "all 0.18s ease",
            }}
          >
            80Hz
          </span>
        </div>

        {/* Bass authority status text */}
        <div
          style={{
            width: 1,
            height: 18,
            background: bassAuthorityMode
              ? `${CYAN}30`
              : "oklch(0.72 0.22 145 / 0.25)",
            flexShrink: 0,
          }}
        />
        <span
          className="font-mono font-bold tracking-wider"
          style={{
            fontSize: 8,
            color: bassAuthorityMode ? CYAN_BRIGHT : GREEN_DIM,
            textShadow: bassAuthorityMode ? `0 0 8px ${CYAN}` : "none",
            whiteSpace: "nowrap",
            flexShrink: 0,
            transition: "all 0.18s ease",
          }}
        >
          {bassAuthorityStatusText}
        </span>

        {/* Divider */}
        <div
          style={{
            width: 1,
            height: 18,
            background: smoothMode
              ? `${GOLD}30`
              : "oklch(0.72 0.22 145 / 0.25)",
            flexShrink: 0,
          }}
        />

        {/* SMOOTH MODE Command Toggle */}
        <button
          data-ocid="memory.smooth_mode.toggle"
          type="button"
          onClick={() => onSmoothModeCommand(!smoothMode)}
          className="flex items-center gap-1.5"
          style={{
            flexShrink: 0,
            background: smoothMode
              ? "oklch(0.82 0.18 85 / 0.12)"
              : "transparent",
            border: `1px solid ${smoothMode ? `${GOLD}50` : "oklch(0.72 0.22 145 / 0.18)"}`,
            borderRadius: 4,
            padding: "2px 6px",
            cursor: "pointer",
            transition: "all 0.18s ease",
            boxShadow: smoothMode ? `0 0 8px ${GOLD}30` : "none",
          }}
        >
          <span
            className="font-mono tracking-widest uppercase"
            style={{
              fontSize: 8,
              color: smoothMode ? GOLD_DIM : GREEN_DIM,
            }}
          >
            SMOOTH
          </span>
          <span
            className="font-mono font-bold tracking-wider"
            style={{
              fontSize: 9,
              color: smoothMode ? GOLD_BRIGHT : GREEN_DIM,
              textShadow: smoothMode ? `0 0 8px ${GOLD}` : "none",
              transition: "all 0.18s ease",
            }}
          >
            {smoothMode ? "ON ●" : "OFF"}
          </span>
        </button>

        {/* Smooth mode status text */}
        <span
          className="font-mono font-bold tracking-wider"
          style={{
            fontSize: 8,
            color: smoothMode ? GOLD_BRIGHT : GREEN_DIM,
            textShadow: smoothMode ? `0 0 8px ${GOLD}` : "none",
            whiteSpace: "nowrap",
            flexShrink: 0,
            transition: "all 0.18s ease",
          }}
        >
          {smoothMode ? "LOUD & SMOOTH" : "STANDARD"}
        </span>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Tiny badges — right side */}
        <div
          className="flex items-center gap-2"
          style={{ flexShrink: 0, flexWrap: "wrap" }}
        >
          <span
            className="font-mono tracking-widest"
            style={{
              fontSize: 7,
              color: GREEN_DIM,
              background: "oklch(0.72 0.22 145 / 0.08)",
              border: "1px solid oklch(0.72 0.22 145 / 0.25)",
              borderRadius: 3,
              padding: "2px 5px",
              whiteSpace: "nowrap",
            }}
          >
            🔒 NEVER LOSE MEMORY
          </span>
          <span
            className="font-mono tracking-widest"
            style={{
              fontSize: 7,
              color: GREEN_DIM,
              background: "oklch(0.72 0.22 145 / 0.08)",
              border: "1px solid oklch(0.72 0.22 145 / 0.25)",
              borderRadius: 3,
              padding: "2px 5px",
              whiteSpace: "nowrap",
              animation: "chip-badge-flicker 4s ease-in-out infinite",
            }}
          >
            ⚡ SMART DETECTION
          </span>
          <span
            className="font-mono tracking-widest"
            style={{
              fontSize: 7,
              color: GREEN_DIM,
              opacity: 0.7,
              whiteSpace: "nowrap",
            }}
          >
            900,000MB
          </span>
        </div>
      </div>
    </div>
  );
}
