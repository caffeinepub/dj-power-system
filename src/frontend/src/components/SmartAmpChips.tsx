interface SmartAmpChipsProps {
  isUnlocked: boolean;
  dbLevel: number; // real dB from Web Audio (60-120 range)
  isPlaying: boolean;
  gainReduction: number; // dB of stabilizer pull-back (0 = idle, >0 = actively clamping)
}

interface ChipConfig {
  id: number;
  name: string;
  description: string;
  showLiveDb?: boolean;
  showStabilizer?: boolean;
}

const CHIPS: ChipConfig[] = [
  {
    id: 1,
    name: "SIGNAL STABILIZER",
    description: "17000W anti-clip limiter — zero clipping guaranteed",
    showStabilizer: true,
  },
  {
    id: 2,
    name: "BASS PROCESSOR",
    description: "80Hz smooth low-freq, zero bass bleed",
  },
  {
    id: 3,
    name: "dB MONITOR",
    description: "5000W target, 120dB max, strain cleared",
    showLiveDb: true,
  },
  {
    id: 4,
    name: "PULL-BACK",
    description: "Zero clipping, zero distortion, best watts",
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
];

function getDbColor(db: number): string {
  if (db >= 105) return "oklch(0.62 0.22 25)"; // red — clip zone
  if (db >= 90) return "oklch(0.82 0.2 95)"; // yellow — hot
  return "oklch(0.72 0.22 145)"; // green — safe (17000W stabilizer active)
}

function MiniBarMeter({
  dbLevel,
  isActive,
}: {
  dbLevel: number;
  isActive: boolean;
}) {
  const segments = 12;
  const filled = isActive ? Math.round(((dbLevel - 60) / 60) * segments) : 0;

  return (
    <div className="flex gap-0.5 items-center w-full mt-2">
      {Array.from({ length: segments }, (_, i) => {
        const segDb = 60 + (i / (segments - 1)) * 60;
        const segColor = getDbColor(segDb);
        const active = i < filled;
        const segKey = `minibar-seg-${i}-${segDb.toFixed(0)}`;
        return (
          <div
            key={segKey}
            style={{
              flex: 1,
              height: 5,
              borderRadius: 1,
              background: active ? segColor : "oklch(0.12 0.015 260)",
              boxShadow: active ? `0 0 4px ${segColor}80` : "none",
              border: `1px solid ${active ? `${segColor}40` : "oklch(0.18 0.02 260)"}`,
              transition: "background 0.08s ease",
            }}
          />
        );
      })}
    </div>
  );
}

function StabilizerDisplay({
  isActive,
  gainReduction,
}: {
  isActive: boolean;
  gainReduction: number;
}) {
  const isClamping = gainReduction > 0.5;
  const clampColor = isClamping
    ? "oklch(0.72 0.22 145)"
    : "oklch(0.72 0.22 145)";
  const reductionPct = Math.min(100, (gainReduction / 12) * 100);

  return (
    <div
      className="rounded p-2 flex flex-col gap-1"
      style={{
        background: "oklch(0.07 0.01 260)",
        border: `1px solid ${isActive ? (isClamping ? "oklch(0.72 0.22 145 / 0.5)" : "oklch(0.78 0.18 200 / 0.3)") : "oklch(0.18 0.02 260)"}`,
      }}
    >
      {/* Top row: power rating + status */}
      <div className="flex items-center justify-between">
        <div
          className="font-mono text-[8px] tracking-[0.2em] font-bold"
          style={{
            color: isActive ? "oklch(0.78 0.18 200)" : "oklch(0.35 0.02 240)",
          }}
        >
          17000W
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
                : `${clampColor}60`,
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

function ChipCard({
  chip,
  isUnlocked,
  dbLevel,
  isPlaying,
  index,
  gainReduction,
}: {
  chip: ChipConfig;
  isUnlocked: boolean;
  dbLevel: number;
  isPlaying: boolean;
  index: number;
  gainReduction: number;
}) {
  const isActive = isUnlocked && isPlaying;
  const color = getDbColor(dbLevel);
  const displayDb = Math.round(dbLevel);

  return (
    <div
      data-ocid={`chips.item.${index + 1}`}
      className="rounded-lg p-3 flex flex-col gap-1 relative overflow-hidden"
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
            width: 20,
            height: 20,
            background: isActive ? `${color}25` : "oklch(0.15 0.02 260)",
            border: `1px solid ${isActive ? `${color}60` : "oklch(0.22 0.04 240)"}`,
            color: isActive ? color : "oklch(0.35 0.02 240)",
            transition: "all 0.3s ease",
          }}
        >
          {chip.id}
        </div>

        {/* Chip name */}
        <div
          className="font-mono text-[9px] font-bold tracking-[0.15em] uppercase leading-tight flex-1"
          style={{
            color: isActive ? "oklch(0.75 0.05 220)" : "oklch(0.38 0.03 240)",
            transition: "color 0.3s ease",
          }}
        >
          {chip.name}
        </div>

        {/* Active glow dot */}
        <div
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: isActive ? color : "oklch(0.22 0.03 240)",
            boxShadow: isActive ? `0 0 6px ${color}` : "none",
            transition: "all 0.3s ease",
          }}
        />
      </div>

      {/* Stabilizer display for chip 1 */}
      {chip.showStabilizer && (
        <StabilizerDisplay isActive={isActive} gainReduction={gainReduction} />
      )}

      {/* Live dB display for chip 3 */}
      {chip.showLiveDb && (
        <div
          className="text-center py-1"
          style={{
            background: "oklch(0.07 0.01 260)",
            borderRadius: 4,
            border: `1px solid ${isActive ? `${color}30` : "oklch(0.18 0.02 260)"}`,
          }}
        >
          <span
            className="font-mono font-bold tracking-wider"
            style={{
              fontSize: 22,
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
      )}

      {/* Description */}
      <div
        className="font-mono text-[8px] tracking-wide leading-tight"
        style={{
          color: isActive ? "oklch(0.42 0.04 220)" : "oklch(0.28 0.02 240)",
          transition: "color 0.3s ease",
        }}
      >
        {chip.description}
      </div>

      {/* Mini bar meter */}
      <MiniBarMeter dbLevel={dbLevel} isActive={isActive} />

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

export function SmartAmpChips({
  isUnlocked,
  dbLevel,
  isPlaying,
  gainReduction,
}: SmartAmpChipsProps) {
  const activeCount = isUnlocked ? 6 : 0;

  return (
    <div
      data-ocid="chips.panel"
      className={`glass-panel rounded-xl p-5 relative overflow-hidden ${isUnlocked ? "glass-panel-active" : ""}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2
            className="font-mono text-xs tracking-[0.3em] font-bold uppercase"
            style={{ color: "oklch(0.55 0.04 220)" }}
          >
            6 SMART AMP CHIPS
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
            {isUnlocked ? `● ${activeCount}/6 CHIPS ACTIVE` : "○ CHIPS OFFLINE"}
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

      {/* Chips grid — 2 columns x 3 rows */}
      <div className="grid grid-cols-2 gap-2">
        {CHIPS.map((chip, idx) => (
          <ChipCard
            key={chip.id}
            chip={chip}
            isUnlocked={isUnlocked}
            dbLevel={dbLevel}
            isPlaying={isPlaying}
            index={idx}
            gainReduction={gainReduction}
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
