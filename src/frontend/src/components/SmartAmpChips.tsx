interface SmartAmpChipsProps {
  isUnlocked: boolean;
  dbLevel: number; // real dB from Web Audio (60–120 range)
  isPlaying: boolean;
  gainReduction: number; // dB of SYSTEM stabilizer pull-back (0 = idle, >0 = actively clamping)
  dbStabGainReduction: number; // dB of dB-meter stabilizer pull-back
  ampClassLevels: number[]; // 0 or 1 for each of A+, B+, C+, D+
  bassLevel: number; // 0–100: energy in 20–300Hz bass range (from FFT)
  crestFactor: number; // peak/RMS ratio — high (>6) = clean dynamic, low (<3) = forced/clipped
  bassGain: number; // -12 to +12 dB — 80Hz lowshelf control
  onBassGainChange: (gainDb: number) => void;
  gainRiderDb: number; // current AGC gain rider amount in dB
  makeupGainDb: number; // fixed +8 dB makeup gain
  truePeakDb: number; // true peak in dBFS
  bassAuthorityMode: boolean; // commanded by Master Memory Chip — 80Hz authority mode (deeper Q, -2dB trim, highpass shelf)
}

function getDbColor(db: number): string {
  if (db >= 115) return "oklch(0.62 0.22 25)"; // red — clip zone
  if (db >= 95) return "oklch(0.82 0.2 95)"; // yellow — hot
  return "oklch(0.72 0.22 145)"; // green — safe
}

// ─── Chip 1: SIGNAL STABILIZER (80,000,000W FULL POWER) ────────────────────
// The "system pull" side — covers EQ, bass, amp classes, signal booster, soft drive
function StabilizerDisplay({
  isActive,
  gainReduction,
}: {
  isActive: boolean;
  gainReduction: number;
}) {
  const isClamping = gainReduction > 0.5;
  const reductionPct = Math.min(100, (gainReduction / 12) * 100);

  return (
    <div
      className="rounded p-1.5 flex flex-col gap-1"
      style={{
        background: "oklch(0.07 0.01 260)",
        border: `1px solid ${isActive ? (isClamping ? "oklch(0.72 0.22 145 / 0.5)" : "oklch(0.78 0.18 200 / 0.3)") : "oklch(0.18 0.02 260)"}`,
      }}
    >
      {/* Power + status */}
      <div className="flex items-center justify-between">
        <div
          className="font-mono text-[8px] tracking-[0.2em] font-bold"
          style={{
            color: isActive ? "oklch(0.78 0.18 200)" : "oklch(0.35 0.02 240)",
          }}
        >
          80,000,000W
        </div>
        <div
          className="font-mono text-[8px] tracking-widest font-bold"
          style={{
            color: isActive
              ? isClamping
                ? "oklch(0.72 0.22 145)"
                : "oklch(0.72 0.22 145 / 0.6)"
              : "oklch(0.28 0.02 240)",
          }}
        >
          {!isActive ? "OFFLINE" : isClamping ? "● CLAMPING" : "● STANDBY"}
        </div>
      </div>

      {/* Gain reduction bar */}
      <div>
        <div
          className="font-mono text-[7px] tracking-widest mb-0.5"
          style={{ color: "oklch(0.38 0.03 240)" }}
        >
          CLIP REDUCTION: {isActive ? gainReduction.toFixed(1) : "--"} dB
        </div>
        <div
          className="rounded-full overflow-hidden"
          style={{
            height: 4,
            background: "oklch(0.15 0.02 260)",
            border: "1px solid oklch(0.22 0.04 240)",
          }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: isActive ? `${reductionPct}%` : "0%",
              background: isClamping
                ? "linear-gradient(to right, oklch(0.72 0.22 145), oklch(0.82 0.2 95))"
                : "oklch(0.72 0.22 145 / 0.4)",
              boxShadow: isClamping
                ? "0 0 6px oklch(0.72 0.22 145 / 0.8)"
                : "none",
              transition: "width 0.05s linear, box-shadow 0.1s ease",
            }}
          />
        </div>
      </div>

      {/* Zero clip confirmation */}
      <div
        className="font-mono text-[7px] tracking-widest text-center"
        style={{
          color: isActive
            ? isClamping
              ? "oklch(0.72 0.22 145)"
              : "oklch(0.55 0.15 145)"
            : "oklch(0.28 0.02 240)",
        }}
      >
        {isActive
          ? isClamping
            ? "⚡ CORRECTING SIGNAL"
            : "✓ ZERO CLIPPING"
          : "AWAITING SIGNAL"}
      </div>
    </div>
  );
}

// ─── Static segment label arrays (stable keys, no index anti-pattern) ───────
const BASS_SEGMENT_KEYS = [
  "b0",
  "b1",
  "b2",
  "b3",
  "b4",
  "b5",
  "b6",
  "b7",
  "b8",
  "b9",
] as const;

const DRIVE_SEGMENT_KEYS = [
  "d0",
  "d1",
  "d2",
  "d3",
  "d4",
  "d5",
  "d6",
  "d7",
  "d8",
  "d9",
] as const;

// ─── Chip 2: BASS PROCESSOR ─────────────────────────────────────────────────
// Reads real FFT low-frequency bins (20–300Hz), shows BASS LEVEL bar + 80Hz slider
// bassAuthorityMode: commanded by Master Memory Chip — wider Q, -2dB trim, highpass shelf at 200Hz
// 80Hz stays FIXED always — authority mode changes how the bass sounds, not the frequency
function BassDisplay({
  isActive,
  bassLevel,
  bassGain,
  onBassGainChange,
  bassAuthorityMode,
}: {
  isActive: boolean;
  bassLevel: number;
  bassGain: number;
  onBassGainChange: (gainDb: number) => void;
  bassAuthorityMode: boolean;
}) {
  const isHot = bassLevel >= 80;
  const bassColor = isHot
    ? "oklch(0.65 0.25 30)"
    : bassAuthorityMode
      ? "oklch(0.78 0.18 200)"
      : "oklch(0.72 0.22 145)";
  const headerColor = bassAuthorityMode
    ? "oklch(0.78 0.18 200)"
    : "oklch(0.72 0.22 145)";
  const segments = 10;
  const filled = isActive ? Math.round((bassLevel / 100) * segments) : 0;
  const gainLabel =
    bassGain >= 0 ? `+${bassGain.toFixed(0)}dB` : `${bassGain.toFixed(0)}dB`;
  const sliderColor =
    bassGain > 6
      ? "oklch(0.65 0.25 30)"
      : bassGain > 0
        ? "oklch(0.82 0.2 95)"
        : bassAuthorityMode
          ? "oklch(0.78 0.18 200)"
          : "oklch(0.72 0.22 145)";

  // 80Hz always fixed — authority mode changes character, not frequency
  const headerLabel = bassAuthorityMode ? "80Hz AUTHORITY" : "80Hz CORRECT";
  const corrLabel = bassAuthorityMode
    ? "AUTHORITY — 80Hz DEEP · NO BLEED"
    : "BASS CORRECTION — LOW END 80Hz";
  const controlLabel = bassAuthorityMode
    ? "80Hz AUTHORITY CONTROL"
    : "80Hz CONTROL";

  return (
    <div
      className="rounded p-1.5 flex flex-col gap-1"
      style={{
        background: "oklch(0.07 0.01 260)",
        border: `1px solid ${isActive ? (isHot ? "oklch(0.65 0.25 30 / 0.5)" : bassAuthorityMode ? "oklch(0.78 0.18 200 / 0.4)" : "oklch(0.72 0.22 145 / 0.3)") : "oklch(0.18 0.02 260)"}`,
        boxShadow:
          isActive && bassAuthorityMode
            ? "0 0 8px oklch(0.78 0.18 200 / 0.12)"
            : "none",
        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <div
            className="font-mono text-[8px] tracking-[0.2em] font-bold"
            style={{
              color: isActive ? headerColor : "oklch(0.35 0.02 240)",
              transition: "color 0.2s ease",
            }}
          >
            {headerLabel}
          </div>
          {/* Authority badge */}
          {bassAuthorityMode && isActive && (
            <span
              className="font-mono text-[6px] tracking-wider font-bold rounded"
              style={{
                color: "oklch(0.78 0.18 200)",
                background: "oklch(0.78 0.18 200 / 0.12)",
                border: "1px solid oklch(0.78 0.18 200 / 0.35)",
                padding: "0px 3px",
              }}
            >
              AUTH
            </span>
          )}
        </div>
        <div
          className="font-mono text-[8px] tracking-widest font-bold tabular-nums"
          style={{ color: isActive ? bassColor : "oklch(0.28 0.02 240)" }}
        >
          {isActive ? `${bassLevel}%` : "--"}
        </div>
      </div>

      {/* Bass level segmented bar */}
      <div>
        <div
          className="font-mono text-[7px] tracking-widest mb-0.5"
          style={{ color: "oklch(0.38 0.03 240)" }}
        >
          {corrLabel}
        </div>
        <div className="flex gap-0.5">
          {BASS_SEGMENT_KEYS.map((segKey, i) => {
            const active = i < filled;
            const segColor =
              i >= 7
                ? "oklch(0.65 0.25 30)"
                : i >= 5
                  ? "oklch(0.82 0.2 95)"
                  : bassAuthorityMode
                    ? "oklch(0.78 0.18 200)"
                    : "oklch(0.72 0.22 145)";
            return (
              <div
                key={segKey}
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 1,
                  background: active ? segColor : "oklch(0.12 0.015 260)",
                  boxShadow: active ? `0 0 4px ${segColor}70` : "none",
                  border: `1px solid ${active ? `${segColor}50` : "oklch(0.18 0.02 260)"}`,
                  transition: "background 0.08s ease",
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Bass control slider */}
      <div>
        <div className="flex items-center justify-between mb-0.5">
          <div
            className="font-mono text-[7px] tracking-widest"
            style={{
              color: bassAuthorityMode
                ? "oklch(0.45 0.1 200)"
                : "oklch(0.38 0.03 240)",
            }}
          >
            {controlLabel}
          </div>
          <div
            className="font-mono text-[8px] font-bold tabular-nums"
            style={{ color: sliderColor }}
          >
            {gainLabel}
          </div>
        </div>
        <input
          data-ocid="chip2.bass.slider"
          type="range"
          min={-12}
          max={12}
          step={1}
          value={bassGain}
          onChange={(e) => onBassGainChange(Number(e.target.value))}
          style={{
            width: "100%",
            height: 6,
            accentColor: sliderColor,
            cursor: "pointer",
            background: "oklch(0.15 0.02 260)",
            borderRadius: 4,
            outline: "none",
            WebkitAppearance: "none",
          }}
        />
        <div
          className="flex justify-between font-mono text-[6px] mt-0.5"
          style={{ color: "oklch(0.3 0.02 240)" }}
        >
          <span>-12</span>
          <span>0</span>
          <span>+12</span>
        </div>
      </div>

      {/* Status */}
      <div
        className="font-mono text-[7px] tracking-widest text-center"
        style={{
          color: isActive
            ? isHot
              ? "oklch(0.65 0.25 30)"
              : bassAuthorityMode
                ? "oklch(0.78 0.18 200)"
                : "oklch(0.72 0.22 145)"
            : "oklch(0.28 0.02 240)",
        }}
      >
        {isActive
          ? isHot
            ? "⚠ BASS HOT"
            : bassAuthorityMode
              ? "⬇ CMD: BASS AUTHORITY ON"
              : "✓ BASS CLEAN"
          : "AWAITING SIGNAL"}
      </div>
    </div>
  );
}

// ─── Chip 3: dB MONITOR (5000W) — big live dBFS readout ─────────────────────
function DbMonitorDisplay({
  isActive,
  dbLevel,
  truePeakDb,
}: {
  isActive: boolean;
  dbLevel: number;
  truePeakDb: number;
}) {
  const color = getDbColor(dbLevel);
  const displayDb = Math.round(dbLevel);

  return (
    <div
      className="rounded p-1.5 flex flex-col gap-1"
      style={{
        background: "oklch(0.07 0.01 260)",
        border: `1px solid ${isActive ? `${color}30` : "oklch(0.18 0.02 260)"}`,
      }}
    >
      <div
        className="font-mono text-[7px] tracking-widest"
        style={{ color: "oklch(0.38 0.03 240)" }}
      >
        REAL AUDIO ANALYSIS — WEB AUDIO API
      </div>
      <div className="text-center py-0.5">
        <span
          className="font-mono font-bold tracking-wider tabular-nums"
          style={{
            fontSize: 20,
            color: isActive ? color : "oklch(0.3 0.02 240)",
            textShadow: isActive
              ? `0 0 10px ${color}, 0 0 20px ${color}60`
              : "none",
            transition: "all 0.1s ease",
          }}
        >
          {isActive ? displayDb : "--"}
        </span>
        <span
          className="font-mono text-[8px] ml-1"
          style={{ color: "oklch(0.4 0.03 240)" }}
        >
          dBFS
        </span>
      </div>
      {/* True Peak readout — below the main RMS number */}
      <div
        className="flex items-center justify-center gap-1 font-mono text-[8px] tracking-widest tabular-nums"
        style={{
          color: isActive ? "oklch(0.78 0.18 200)" : "oklch(0.28 0.02 240)",
        }}
      >
        <span style={{ color: "oklch(0.38 0.03 240)" }}>TP:</span>
        <span>
          {isActive
            ? `${truePeakDb >= 0 ? "+" : ""}${truePeakDb.toFixed(1)} dBFS`
            : "--"}
        </span>
      </div>
      <div
        className="font-mono text-[7px] tracking-widest text-center"
        style={{
          color: isActive
            ? dbLevel >= 115
              ? "oklch(0.62 0.22 25)"
              : dbLevel >= 95
                ? "oklch(0.82 0.2 95)"
                : "oklch(0.72 0.22 145)"
            : "oklch(0.28 0.02 240)",
        }}
      >
        {isActive
          ? dbLevel >= 115
            ? "⚡ HOT ZONE"
            : dbLevel >= 95
              ? "● SIGNAL STRONG"
              : "○ SIGNAL NORMAL"
          : "AWAITING SIGNAL"}
      </div>
    </div>
  );
}

// ─── Chip 4: ADVANCED AMP ENGINE ────────────────────────────────────────────
// Two separated 80,000,000W stabilizers: one for dB meter, one for the full system
// PUSH = gains removed — NO GAINS mode
// PULL = system stabilizer gain reduction (FULL 80,000,000W — NO PULL BACK needed)
const AMP_CLASS_COLORS = [
  "oklch(0.72 0.22 145)", // slot 1 — green
  "oklch(0.78 0.18 200)", // slot 2 — cyan
  "oklch(0.82 0.2 95)", // slot 3 — yellow
  "oklch(0.65 0.25 30)", // slot 4 — red/orange
];
const AMP_CLASS_LABELS = ["NO GAIN", "NO GAIN", "NO GAIN", "NO GAIN"];

// Mini stabilizer bar — shows gain reduction as a glowing bar
function StabBar({
  gainReduction,
  isActive,
  color,
}: {
  gainReduction: number;
  isActive: boolean;
  color: string;
}) {
  const isClamping = gainReduction > 0.5;
  const pct = Math.min(100, (gainReduction / 12) * 100);
  return (
    <div
      className="rounded-full overflow-hidden"
      style={{
        height: 4,
        background: "oklch(0.15 0.02 260)",
        border: "1px solid oklch(0.22 0.04 240)",
        flex: 1,
      }}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: isActive ? `${pct}%` : "0%",
          background: isClamping
            ? `linear-gradient(to right, ${color}, oklch(0.82 0.2 95))`
            : `${color}50`,
          boxShadow: isClamping ? `0 0 5px ${color}80` : "none",
          transition: "width 0.05s linear, box-shadow 0.1s ease",
        }}
      />
    </div>
  );
}

function AdvancedAmpEngineDisplay({
  isActive,
  ampClassLevels,
  gainReduction,
  dbStabGainReduction,
}: {
  isActive: boolean;
  ampClassLevels: number[];
  gainReduction: number;
  dbStabGainReduction: number;
}) {
  const pullDb = gainReduction;

  const sysIsClamping = gainReduction > 0.5;
  const dbIsClamping = dbStabGainReduction > 0.5;

  // Status logic: "NO GAINS — STAB FULL POWER" when both stabs are idle
  // "⚡ BOTH STABS ACTIVE" when both clamping
  // Individual messages otherwise
  let statusText: string;
  let statusColor: string;
  if (!isActive) {
    statusText = "AWAITING SIGNAL";
    statusColor = "oklch(0.28 0.02 240)";
  } else if (dbIsClamping && sysIsClamping) {
    statusText = "⚡ BOTH STABS ACTIVE";
    statusColor = "oklch(0.65 0.25 30)";
  } else if (dbIsClamping) {
    statusText = "⚡ dB STAB CLAMPING";
    statusColor = "oklch(0.82 0.2 95)";
  } else if (sysIsClamping) {
    statusText = "⚡ SYS STAB CLAMPING";
    statusColor = "oklch(0.78 0.18 200)";
  } else {
    statusText = "○ NO GAINS — STAB FULL POWER";
    statusColor = "oklch(0.72 0.22 145 / 0.8)";
  }

  return (
    <div
      className="rounded p-1.5 flex flex-col gap-1"
      style={{
        background: "oklch(0.07 0.01 260)",
        border: `1px solid ${isActive ? "oklch(0.78 0.18 200 / 0.3)" : "oklch(0.18 0.02 260)"}`,
      }}
    >
      {/* Two stabilizer rows */}
      <div className="flex flex-col gap-1">
        {/* Row 1: dB STAB 80,000,000W */}
        <div className="flex items-center gap-1.5">
          <div
            className="font-mono text-[7px] tracking-widest font-bold shrink-0"
            style={{
              color: isActive
                ? dbIsClamping
                  ? "oklch(0.82 0.2 95)"
                  : "oklch(0.78 0.18 200)"
                : "oklch(0.28 0.02 240)",
              minWidth: 72,
            }}
          >
            dB STAB
          </div>
          <StabBar
            gainReduction={dbStabGainReduction}
            isActive={isActive}
            color="oklch(0.82 0.2 95)"
          />
          <div
            className="font-mono text-[6px] tracking-widest shrink-0"
            style={{
              color: isActive
                ? dbIsClamping
                  ? "oklch(0.82 0.2 95)"
                  : "oklch(0.72 0.22 145)"
                : "oklch(0.28 0.02 240)",
              minWidth: 48,
              textAlign: "right",
            }}
          >
            {isActive ? (dbIsClamping ? "CLAMPING" : "STANDBY") : "--"}
          </div>
        </div>

        {/* Row 2: SYS STAB 80,000,000W */}
        <div className="flex items-center gap-1.5">
          <div
            className="font-mono text-[7px] tracking-widest font-bold shrink-0"
            style={{
              color: isActive
                ? sysIsClamping
                  ? "oklch(0.78 0.18 200)"
                  : "oklch(0.55 0.1 200)"
                : "oklch(0.28 0.02 240)",
              minWidth: 72,
            }}
          >
            SYS STAB
          </div>
          <StabBar
            gainReduction={gainReduction}
            isActive={isActive}
            color="oklch(0.78 0.18 200)"
          />
          <div
            className="font-mono text-[6px] tracking-widest shrink-0"
            style={{
              color: isActive
                ? sysIsClamping
                  ? "oklch(0.78 0.18 200)"
                  : "oklch(0.72 0.22 145)"
                : "oklch(0.28 0.02 240)",
              minWidth: 48,
              textAlign: "right",
            }}
          >
            {isActive ? (sysIsClamping ? "CLAMPING" : "STANDBY") : "--"}
          </div>
        </div>
      </div>

      {/* Push / Pull readout row — NO GAINS mode */}
      <div className="flex items-center justify-between gap-1">
        <div
          className="font-mono text-[7px] font-bold tracking-widest"
          style={{
            color: isActive ? "oklch(0.55 0.08 200)" : "oklch(0.28 0.02 240)",
          }}
        >
          {isActive ? "NO GAINS — STAB FULL POWER" : "--"}
        </div>
        <div
          className="font-mono text-[8px] font-bold tracking-widest"
          style={{
            color:
              isActive && pullDb > 0.5
                ? "oklch(0.82 0.2 95)"
                : "oklch(0.28 0.02 240)",
          }}
        >
          PULL ↓ {isActive && pullDb > 0.5 ? `-${pullDb.toFixed(1)}dB` : "--"}
        </div>
      </div>

      {/* Class indicator boxes */}
      <div className="flex gap-1">
        {AMP_CLASS_LABELS.map((label, i) => {
          const classActive = isActive && ampClassLevels[i] === 1;
          const color = AMP_CLASS_COLORS[i];
          return (
            <div
              key={label}
              className="flex-1 flex flex-col items-center gap-0.5 rounded py-1"
              style={{
                background: classActive ? `${color}18` : "oklch(0.1 0.01 260)",
                border: `1px solid ${classActive ? `${color}60` : "oklch(0.2 0.03 240)"}`,
                boxShadow: classActive ? `0 0 6px ${color}40` : "none",
                transition: "all 0.15s ease",
              }}
            >
              <div
                className="font-mono text-[9px] font-bold tracking-wide"
                style={{
                  color: classActive ? color : "oklch(0.3 0.02 240)",
                  textShadow: classActive ? `0 0 6px ${color}` : "none",
                  transition: "all 0.15s ease",
                }}
              >
                {label}
              </div>
              <div
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: classActive ? color : "oklch(0.18 0.02 260)",
                  boxShadow: classActive ? `0 0 4px ${color}` : "none",
                  transition: "all 0.15s ease",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Status line */}
      <div
        className="font-mono text-[7px] tracking-widest text-center"
        style={{ color: statusColor }}
      >
        {statusText}
      </div>
    </div>
  );
}

// ─── Chip 5: NO-GAINS (drive quality monitor) ────────────────────────────────
// Watches crest factor (peak/RMS) to detect forced/over-driven signal
// High crest (>6) = dynamic music = CLEAN DRIVE
// Low crest (<3)  = flattened/forced signal = FORCE DETECTED
function DriveDisplay({
  isActive,
  crestFactor,
}: {
  isActive: boolean;
  crestFactor: number;
}) {
  // Normalize crest factor to a 0–100 quality bar
  // Map: 1 = worst (0%), 10+ = best (100%)
  const qualityPct = Math.min(100, Math.round(((crestFactor - 1) / 9) * 100));
  const isForced = isActive && crestFactor < 1.5;
  const isClean = isActive && crestFactor >= 4;
  const driveColor = isForced
    ? "oklch(0.62 0.22 25)"
    : isClean
      ? "oklch(0.72 0.22 145)"
      : "oklch(0.82 0.2 95)";

  const segments = 10;
  const filled = isActive ? Math.round((qualityPct / 100) * segments) : 0;

  return (
    <div
      className="rounded p-1.5 flex flex-col gap-1"
      style={{
        background: "oklch(0.07 0.01 260)",
        border: `1px solid ${isActive ? (isForced ? "oklch(0.62 0.22 25 / 0.5)" : "oklch(0.72 0.22 145 / 0.3)") : "oklch(0.18 0.02 260)"}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div
          className="font-mono text-[8px] tracking-[0.2em] font-bold"
          style={{
            color: isActive ? "oklch(0.78 0.18 200)" : "oklch(0.35 0.02 240)",
          }}
        >
          SOFT DRIVE
        </div>
        <div
          className="font-mono text-[8px] tracking-widest font-bold tabular-nums"
          style={{ color: isActive ? driveColor : "oklch(0.28 0.02 240)" }}
        >
          {isActive ? `CF ${crestFactor.toFixed(1)}` : "--"}
        </div>
      </div>

      {/* Drive quality bar */}
      <div>
        <div
          className="font-mono text-[7px] tracking-widest mb-0.5"
          style={{ color: "oklch(0.38 0.03 240)" }}
        >
          DRIVE QUALITY — CREST FACTOR
        </div>
        <div className="flex gap-0.5">
          {DRIVE_SEGMENT_KEYS.map((segKey, i) => {
            const active = i < filled;
            const segColor =
              i < 3
                ? "oklch(0.62 0.22 25)"
                : i < 6
                  ? "oklch(0.82 0.2 95)"
                  : "oklch(0.72 0.22 145)";
            return (
              <div
                key={segKey}
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 1,
                  background: active ? segColor : "oklch(0.12 0.015 260)",
                  boxShadow: active ? `0 0 4px ${segColor}70` : "none",
                  border: `1px solid ${active ? `${segColor}50` : "oklch(0.18 0.02 260)"}`,
                  transition: "background 0.08s ease",
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Status */}
      <div
        className="font-mono text-[7px] tracking-widest text-center"
        style={{
          color: isActive ? driveColor : "oklch(0.28 0.02 240)",
        }}
      >
        {isActive
          ? isForced
            ? "⚠ FORCE DETECTED"
            : isClean
              ? "✓ CLEAN DRIVE"
              : "● DRIVE MODERATE"
          : "AWAITING SIGNAL"}
      </div>
    </div>
  );
}

// ─── Chip 6: SIGNAL BOOSTER (system health overview) ───────────────────────
// Combines all 3 sub-system health checks into one readout
// AMP = amp classes active, STAB = stabilizer not overwhelmed, DRIVE = crest factor clean
function SystemHealthDisplay({
  isActive,
  gainReduction,
  crestFactor,
}: {
  isActive: boolean;
  gainReduction: number;
  crestFactor: number;
}) {
  // NO GAINS mode: AMP is healthy if the stabilizer chain is confirmed active (gainReduction is readable)
  const ampOk = isActive && gainReduction >= 0; // stabilizer chain confirmed active — no gains needed
  const stabOk = isActive && gainReduction < 20; // titanium stabilizer — wider tolerance
  const driveOk = isActive && crestFactor >= 1.5; // allow more compressed signals

  const allOk = ampOk && stabOk && driveOk;
  const overallColor = allOk ? "oklch(0.72 0.22 145)" : "oklch(0.65 0.25 30)";

  const indicators = [
    { label: "AMP", ok: ampOk },
    { label: "STAB", ok: stabOk },
    { label: "DRIVE", ok: driveOk },
  ];

  return (
    <div
      className="rounded p-1.5 flex flex-col gap-1"
      style={{
        background: "oklch(0.07 0.01 260)",
        border: `1px solid ${isActive ? (allOk ? "oklch(0.72 0.22 145 / 0.4)" : "oklch(0.65 0.25 30 / 0.4)") : "oklch(0.18 0.02 260)"}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div
          className="font-mono text-[8px] tracking-[0.2em] font-bold"
          style={{
            color: isActive ? "oklch(0.78 0.18 200)" : "oklch(0.35 0.02 240)",
          }}
        >
          FPGA-GRADE
        </div>
        <div
          className="font-mono text-[8px] tracking-widest font-bold"
          style={{ color: isActive ? overallColor : "oklch(0.28 0.02 240)" }}
        >
          {isActive ? (allOk ? "● OPTIMAL" : "⚠ CHECK") : "OFFLINE"}
        </div>
      </div>

      {/* 3 mini health indicators */}
      <div className="flex gap-1">
        {indicators.map(({ label, ok }) => (
          <div
            key={label}
            className="flex-1 flex flex-col items-center gap-0.5 rounded py-1"
            style={{
              background: isActive
                ? ok
                  ? "oklch(0.72 0.22 145 / 0.1)"
                  : "oklch(0.62 0.22 25 / 0.1)"
                : "oklch(0.1 0.01 260)",
              border: `1px solid ${isActive ? (ok ? "oklch(0.72 0.22 145 / 0.4)" : "oklch(0.62 0.22 25 / 0.4)") : "oklch(0.2 0.03 240)"}`,
              transition: "all 0.2s ease",
            }}
          >
            <div
              className="font-mono text-[8px] font-bold tracking-wide"
              style={{
                color: isActive
                  ? ok
                    ? "oklch(0.72 0.22 145)"
                    : "oklch(0.62 0.22 25)"
                  : "oklch(0.3 0.02 240)",
              }}
            >
              {label}
            </div>
            <div
              className="font-mono text-[10px] font-bold"
              style={{
                color: isActive
                  ? ok
                    ? "oklch(0.78 0.22 145)"
                    : "oklch(0.65 0.22 25)"
                  : "oklch(0.25 0.02 240)",
                textShadow: isActive
                  ? ok
                    ? "0 0 6px oklch(0.72 0.22 145)"
                    : "0 0 6px oklch(0.62 0.22 25)"
                  : "none",
              }}
            >
              {isActive ? (ok ? "✓" : "✗") : "–"}
            </div>
          </div>
        ))}
      </div>

      {/* Overall status */}
      <div
        className="font-mono text-[7px] tracking-widest text-center"
        style={{ color: isActive ? overallColor : "oklch(0.28 0.02 240)" }}
      >
        {isActive
          ? allOk
            ? "✓ SYSTEM OPTIMAL"
            : "⚠ CHECK SYSTEM"
          : "AWAITING SIGNAL"}
      </div>
    </div>
  );
}

// ─── Chip 7: GAINS REMOVED (formerly Gain Rider) ────────────────────────────
// Gains removed — 80,000,000W stabilizer handles all signal correction
function GainRiderDisplay({
  isActive,
}: {
  isActive: boolean;
  gainRiderDb: number;
}) {
  return (
    <div
      className="rounded p-1.5 flex flex-col gap-1"
      style={{
        background: "oklch(0.07 0.01 260)",
        border: `1px solid ${isActive ? "oklch(0.55 0.08 200 / 0.4)" : "oklch(0.18 0.02 260)"}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div
          className="font-mono text-[8px] tracking-[0.2em] font-bold"
          style={{
            color: isActive ? "oklch(0.55 0.08 200)" : "oklch(0.35 0.02 240)",
          }}
        >
          GAINS OFF
        </div>
        <div
          className="font-mono text-[8px] tracking-widest font-bold tabular-nums"
          style={{
            color: isActive ? "oklch(0.55 0.08 200)" : "oklch(0.28 0.02 240)",
          }}
        >
          {isActive ? "0.0 dB" : "--"}
        </div>
      </div>

      {/* Gain bar — always 0% */}
      <div>
        <div
          className="font-mono text-[7px] tracking-widest mb-0.5"
          style={{ color: "oklch(0.38 0.03 240)" }}
        >
          GAIN AMOUNT — REMOVED FROM CHAIN
        </div>
        <div
          className="rounded-full overflow-hidden"
          style={{
            height: 4,
            background: "oklch(0.15 0.02 260)",
            border: "1px solid oklch(0.22 0.04 240)",
          }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: "0%",
              background: "oklch(0.55 0.08 200 / 0.35)",
              transition: "width 0.05s linear",
            }}
          />
        </div>
      </div>

      {/* Status */}
      <div
        className="font-mono text-[7px] tracking-widest text-center"
        style={{
          color: isActive ? "oklch(0.72 0.22 145)" : "oklch(0.28 0.02 240)",
        }}
      >
        {isActive ? "✓ NO GAINS — STABILIZER HANDLES ALL" : "AWAITING SIGNAL"}
      </div>
    </div>
  );
}

// ─── Chip 8: MAKEUP GAIN REMOVED (clean signal — no post-stab boost) ─────────
// Makeup gain removed — signal goes direct after stabilizer, no added gain
function MakeupGainDisplay({
  isActive,
}: {
  isActive: boolean;
  makeupGainDb: number;
}) {
  return (
    <div
      className="rounded p-1.5 flex flex-col gap-1"
      style={{
        background: "oklch(0.07 0.01 260)",
        border: `1px solid ${isActive ? "oklch(0.55 0.08 200 / 0.4)" : "oklch(0.18 0.02 260)"}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div
          className="font-mono text-[8px] tracking-[0.2em] font-bold"
          style={{
            color: isActive ? "oklch(0.55 0.08 200)" : "oklch(0.35 0.02 240)",
          }}
        >
          MAKEUP OFF
        </div>
        <div
          className="font-mono text-[10px] font-bold tabular-nums"
          style={{
            color: isActive ? "oklch(0.55 0.08 200)" : "oklch(0.28 0.02 240)",
          }}
        >
          {isActive ? "0 dB" : "--"}
        </div>
      </div>

      {/* Fixed makeup bar — always 0% */}
      <div>
        <div
          className="font-mono text-[7px] tracking-widest mb-0.5"
          style={{ color: "oklch(0.38 0.03 240)" }}
        >
          MAKEUP GAIN — REMOVED FROM CHAIN
        </div>
        <div
          className="rounded-full overflow-hidden"
          style={{
            height: 4,
            background: "oklch(0.15 0.02 260)",
            border: "1px solid oklch(0.22 0.04 240)",
          }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: "0%",
              background: "oklch(0.55 0.08 200 / 0.35)",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* Status */}
      <div
        className="font-mono text-[7px] tracking-widest text-center"
        style={{
          color: isActive ? "oklch(0.72 0.22 145)" : "oklch(0.28 0.02 240)",
        }}
      >
        {isActive ? "✓ NO MAKEUP GAIN — CLEAN SIGNAL" : "AWAITING SIGNAL"}
      </div>
    </div>
  );
}

// ─── Chip Card wrapper ───────────────────────────────────────────────────────
function ChipCard({
  chipId,
  chipName,
  chipDescription,
  isUnlocked,
  dbLevel,
  isPlaying,
  index,
  gainReduction,
  dbStabGainReduction,
  ampClassLevels,
  bassLevel,
  crestFactor,
  bassGain,
  onBassGainChange,
  gainRiderDb,
  makeupGainDb,
  truePeakDb,
  bassAuthorityMode,
}: {
  chipId: number;
  chipName: string;
  chipDescription: string;
  isUnlocked: boolean;
  dbLevel: number;
  isPlaying: boolean;
  index: number;
  gainReduction: number;
  dbStabGainReduction: number;
  ampClassLevels: number[];
  bassLevel: number;
  crestFactor: number;
  bassGain: number;
  onBassGainChange: (gainDb: number) => void;
  gainRiderDb: number;
  makeupGainDb: number;
  truePeakDb: number;
  bassAuthorityMode: boolean;
}) {
  const isActive = isUnlocked && isPlaying;
  const color = getDbColor(dbLevel);

  return (
    <div
      data-ocid={`chips.item.${index + 1}`}
      className="rounded-lg p-2 flex flex-col gap-1 relative overflow-hidden"
      style={{
        background: isActive
          ? "oklch(0.11 0.025 220 / 0.9)"
          : "oklch(0.09 0.012 240)",
        border: `1px solid ${isActive ? `${color}40` : "oklch(0.2 0.03 240)"}`,
        boxShadow: isActive ? `0 0 12px ${color}20` : "none",
        transition: "all 0.3s ease",
      }}
    >
      {/* Chip header row */}
      <div className="flex items-center gap-2">
        {/* Chip number badge */}
        <div
          className="flex items-center justify-center rounded font-mono font-bold text-[9px] shrink-0"
          style={{
            width: 16,
            height: 16,
            background: isActive ? `${color}25` : "oklch(0.15 0.02 260)",
            border: `1px solid ${isActive ? `${color}60` : "oklch(0.22 0.04 240)"}`,
            color: isActive ? color : "oklch(0.35 0.02 240)",
            transition: "all 0.3s ease",
          }}
        >
          {chipId}
        </div>

        {/* Chip name */}
        <div
          className="font-mono text-[9px] font-bold tracking-[0.15em] uppercase leading-tight flex-1"
          style={{
            color: isActive ? "oklch(0.75 0.05 220)" : "oklch(0.38 0.03 240)",
            transition: "color 0.3s ease",
          }}
        >
          {chipName}
        </div>

        {/* Active glow dot */}
        <div
          style={{
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: isActive ? color : "oklch(0.22 0.03 240)",
            boxShadow: isActive ? `0 0 6px ${color}` : "none",
            transition: "all 0.3s ease",
          }}
        />
      </div>

      {/* Unique inner display per chip */}
      {chipId === 1 && (
        <StabilizerDisplay isActive={isActive} gainReduction={gainReduction} />
      )}
      {chipId === 2 && (
        <BassDisplay
          isActive={isActive}
          bassLevel={bassLevel}
          bassGain={bassGain}
          onBassGainChange={onBassGainChange}
          bassAuthorityMode={bassAuthorityMode}
        />
      )}
      {chipId === 3 && (
        <DbMonitorDisplay
          isActive={isActive}
          dbLevel={dbLevel}
          truePeakDb={truePeakDb}
        />
      )}
      {chipId === 4 && (
        <AdvancedAmpEngineDisplay
          isActive={isActive}
          ampClassLevels={ampClassLevels}
          gainReduction={gainReduction}
          dbStabGainReduction={dbStabGainReduction}
        />
      )}
      {chipId === 5 && (
        <DriveDisplay isActive={isActive} crestFactor={crestFactor} />
      )}
      {chipId === 6 && (
        <SystemHealthDisplay
          isActive={isActive}
          gainReduction={gainReduction}
          crestFactor={crestFactor}
        />
      )}
      {chipId === 7 && (
        <GainRiderDisplay isActive={isActive} gainRiderDb={gainRiderDb} />
      )}
      {chipId === 8 && (
        <MakeupGainDisplay isActive={isActive} makeupGainDb={makeupGainDb} />
      )}

      {/* Description */}
      <div
        className="font-mono text-[8px] tracking-wide leading-tight"
        style={{
          color: isActive ? "oklch(0.42 0.04 220)" : "oklch(0.28 0.02 240)",
          transition: "color 0.3s ease",
        }}
      >
        {chipDescription}
      </div>

      {/* Glow overlay when active */}
      {isActive && (
        <div
          className="absolute inset-0 pointer-events-none rounded-lg"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, ${color}08 0%, transparent 70%)`,
          }}
        />
      )}
    </div>
  );
}

// ─── Chip configuration ──────────────────────────────────────────────────────
const CHIPS = [
  {
    id: 1,
    name: "SIGNAL STABILIZER",
    description:
      "80,000,000W FULL POWER — NO GAINS, SYS limiter over everything",
  },
  {
    id: 2,
    name: "BASS PROCESSOR",
    description:
      "80Hz CORRECTION ONLY — slider for manual bass control, no auto gains",
  },
  {
    id: 3,
    name: "dB MONITOR",
    description: "5000W target, 120dB max, strain cleared",
  },
  {
    id: 4,
    name: "ADVANCED AMP ENGINE",
    description: "2x 80,000,000W STABS — NO GAINS, STAB HANDLES ALL",
  },
  {
    id: 5,
    name: "NO-GAINS",
    description: "Smooth soft drive, no force stimulation",
  },
  {
    id: 6,
    name: "SIGNAL BOOSTER",
    description: "FPGA-grade processor, world class power",
  },
  {
    id: 7,
    name: "GAIN RIDER",
    description: "GAINS REMOVED — 80,000,000W stab handles all correction",
  },
  {
    id: 8,
    name: "MAKEUP GAIN",
    description: "MAKEUP GAIN REMOVED — signal goes direct",
  },
] as const;

// ─── Main export ─────────────────────────────────────────────────────────────
export function SmartAmpChips({
  isUnlocked,
  dbLevel,
  isPlaying,
  gainReduction,
  dbStabGainReduction,
  ampClassLevels,
  bassLevel,
  crestFactor,
  bassGain,
  onBassGainChange,
  gainRiderDb,
  makeupGainDb,
  truePeakDb,
  bassAuthorityMode,
}: SmartAmpChipsProps) {
  const activeCount = isUnlocked ? 8 : 0;

  return (
    <div
      data-ocid="chips.panel"
      className={`glass-panel rounded-xl p-3 relative overflow-hidden ${isUnlocked ? "glass-panel-active" : ""}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2
            className="font-mono text-xs tracking-[0.3em] font-bold uppercase"
            style={{ color: "oklch(0.55 0.04 220)" }}
          >
            8 SMART AMP CHIPS
          </h2>
          <div
            className="font-mono text-[10px] tracking-widest mt-0.5"
            style={{
              color: isUnlocked
                ? "oklch(0.78 0.18 200)"
                : "oklch(0.35 0.02 240)",
              transition: "color 0.5s ease",
            }}
          >
            {isUnlocked ? `● ${activeCount}/8 CHIPS ACTIVE` : "○ CHIPS OFFLINE"}
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <div
            className="font-mono text-xs font-bold tracking-wider"
            style={{
              color: isUnlocked
                ? "oklch(0.88 0.22 200)"
                : "oklch(0.3 0.02 240)",
              transition: "color 0.5s ease",
            }}
          >
            {isUnlocked ? "LIVE" : "STANDBY"}
          </div>
          {/* Stabilizer status in header */}
          <div
            className="font-mono text-[8px] tracking-widest"
            style={{
              color:
                isUnlocked && isPlaying && gainReduction > 0.5
                  ? "oklch(0.72 0.22 145)"
                  : isUnlocked
                    ? "oklch(0.45 0.08 200)"
                    : "oklch(0.28 0.02 240)",
              transition: "color 0.2s ease",
            }}
          >
            {isUnlocked && isPlaying
              ? gainReduction > 0.5
                ? `STAB -${gainReduction.toFixed(1)}dB`
                : "STAB ✓ CLEAN"
              : "STAB --"}
          </div>
        </div>
      </div>

      {/* Chips grid — 2 columns x 4 rows */}
      <div className="grid grid-cols-2 gap-1.5">
        {CHIPS.map((chip, idx) => (
          <ChipCard
            key={chip.id}
            chipId={chip.id}
            chipName={chip.name}
            chipDescription={chip.description}
            isUnlocked={isUnlocked}
            dbLevel={dbLevel}
            isPlaying={isPlaying}
            index={idx}
            gainReduction={gainReduction}
            dbStabGainReduction={dbStabGainReduction}
            ampClassLevels={ampClassLevels}
            bassLevel={bassLevel}
            crestFactor={crestFactor}
            bassGain={bassGain}
            onBassGainChange={onBassGainChange}
            gainRiderDb={gainRiderDb}
            makeupGainDb={makeupGainDb}
            truePeakDb={truePeakDb}
            bassAuthorityMode={bassAuthorityMode}
          />
        ))}
      </div>

      {/* Power bar */}
      <div
        className="mt-4 rounded-full overflow-hidden"
        style={{
          height: 3,
          background: "oklch(0.15 0.02 260)",
          border: "1px solid oklch(0.22 0.04 240)",
        }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: isUnlocked ? "100%" : "0%",
            background:
              "linear-gradient(to right, oklch(0.78 0.18 200), oklch(0.88 0.22 200))",
            boxShadow: isUnlocked
              ? "0 0 8px oklch(0.78 0.18 200 / 0.8)"
              : "none",
            transition: "width 0.8s ease, box-shadow 0.5s ease",
          }}
        />
      </div>

      {/* Ambient effect */}
      {isUnlocked && (
        <div
          className="absolute inset-0 pointer-events-none rounded-xl"
          style={{
            background:
              "radial-gradient(ellipse at 50% 100%, oklch(0.78 0.18 200 / 0.05) 0%, transparent 70%)",
          }}
        />
      )}
    </div>
  );
}
