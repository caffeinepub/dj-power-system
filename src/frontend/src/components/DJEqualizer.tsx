interface DJEqualizerProps {
  eqBands: number[];
  isUnlocked: boolean;
  onBandChange: (index: number, value: number) => void;
}

const FREQUENCIES = [
  "32Hz",
  "64Hz",
  "125Hz",
  "250Hz",
  "500Hz",
  "1kHz",
  "2kHz",
  "4kHz",
  "8kHz",
  "16kHz",
];

function getBarColor(value: number): string {
  if (value >= 85) return "oklch(0.62 0.22 25)";
  if (value >= 65) return "oklch(0.82 0.2 95)";
  return "oklch(0.78 0.18 200)";
}

function getBarGlow(value: number): string {
  if (value >= 85) return "0 0 8px oklch(0.62 0.22 25 / 0.8)";
  if (value >= 65) return "0 0 8px oklch(0.82 0.2 95 / 0.8)";
  return "0 0 8px oklch(0.78 0.18 200 / 0.6)";
}

export function DJEqualizer({
  eqBands,
  isUnlocked,
  onBandChange,
}: DJEqualizerProps) {
  return (
    <div
      data-ocid="equalizer.panel"
      className={`glass-panel rounded-xl p-6 relative overflow-hidden ${isUnlocked ? "glass-panel-active" : ""}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2
            className="font-mono text-xs tracking-[0.3em] font-bold uppercase"
            style={{ color: "oklch(0.55 0.04 220)" }}
          >
            10-BAND EQUALIZER
          </h2>
          <div
            className="font-mono text-[10px] tracking-widest mt-0.5"
            style={{
              color: isUnlocked
                ? "oklch(0.78 0.18 200)"
                : "oklch(0.35 0.02 240)",
            }}
          >
            {isUnlocked ? "● ACTIVE" : "○ LOCKED"}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: "oklch(0.78 0.18 200)" }}
            />
            <span
              className="font-mono text-[9px] tracking-wider"
              style={{ color: "oklch(0.45 0.03 240)" }}
            >
              LOW
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: "oklch(0.82 0.2 95)" }}
            />
            <span
              className="font-mono text-[9px] tracking-wider"
              style={{ color: "oklch(0.45 0.03 240)" }}
            >
              MID
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: "oklch(0.62 0.22 25)" }}
            />
            <span
              className="font-mono text-[9px] tracking-wider"
              style={{ color: "oklch(0.45 0.03 240)" }}
            >
              HIGH
            </span>
          </div>
        </div>
      </div>

      {!isUnlocked && (
        <div
          className="absolute inset-0 flex items-center justify-center z-10 rounded-xl"
          style={{
            background: "oklch(0.08 0.008 260 / 0.7)",
            backdropFilter: "blur(2px)",
          }}
        >
          <div className="text-center">
            <div
              className="text-3xl mb-2"
              style={{ filter: "drop-shadow(0 0 8px oklch(0.62 0.22 25))" }}
            >
              🔒
            </div>
            <div
              className="font-mono text-xs tracking-widest"
              style={{ color: "oklch(0.5 0.03 240)" }}
            >
              UNLOCK SYSTEM TO ACCESS EQ
            </div>
          </div>
        </div>
      )}

      {/* EQ bands */}
      <div className="flex gap-1 justify-between items-end">
        {eqBands.map((value, i) => (
          <div
            key={FREQUENCIES[i]}
            className="flex flex-col items-center gap-2 flex-1"
            style={{ minWidth: 0 }}
          >
            {/* dB value label */}
            <div
              className="font-mono text-[9px] font-bold"
              style={{
                color: isUnlocked ? getBarColor(value) : "oklch(0.3 0.02 240)",
                textShadow: isUnlocked ? getBarGlow(value) : "none",
                transition: "color 0.2s ease",
                minWidth: 24,
                textAlign: "center",
              }}
            >
              {isUnlocked ? value : "--"}
            </div>

            {/* Vertical slider */}
            <div
              className="relative flex justify-center"
              style={{ height: 120 }}
            >
              <input
                data-ocid={`eq.slider.${i + 1}`}
                type="range"
                min="0"
                max="100"
                value={value}
                disabled={!isUnlocked}
                onChange={(e) =>
                  onBandChange(i, Number.parseInt(e.target.value, 10))
                }
                className="eq-slider"
                style={{ height: 120 }}
                aria-label={`EQ band ${FREQUENCIES[i]}`}
              />
            </div>

            {/* Bar visualization */}
            <div
              className="relative overflow-hidden rounded-sm"
              style={{
                width: "100%",
                maxWidth: 24,
                height: 60,
                background: "oklch(0.12 0.015 260)",
                border: "1px solid oklch(0.2 0.03 240)",
              }}
            >
              {/* Bar fill */}
              <div
                className="absolute bottom-0 left-0 right-0 rounded-sm"
                style={{
                  height: isUnlocked ? `${value}%` : "0%",
                  background: isUnlocked
                    ? `linear-gradient(to top, oklch(0.55 0.2 45), ${getBarColor(value)})`
                    : "oklch(0.2 0.02 240)",
                  boxShadow: isUnlocked ? getBarGlow(value) : "none",
                  transition: "height 0.1s ease, background 0.2s ease",
                }}
              />

              {/* Scanlines */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(0deg, transparent, transparent 3px, oklch(0 0 0 / 0.15) 3px, oklch(0 0 0 / 0.15) 4px)",
                }}
              />
            </div>

            {/* Frequency label */}
            <div
              className="font-mono text-[8px] tracking-wide text-center"
              style={{
                color: isUnlocked
                  ? "oklch(0.45 0.03 240)"
                  : "oklch(0.3 0.02 240)",
                fontSize: "8px",
                whiteSpace: "nowrap",
              }}
            >
              {FREQUENCIES[i]}
            </div>
          </div>
        ))}
      </div>

      {/* Background ambient */}
      {isUnlocked && (
        <div
          className="absolute inset-0 pointer-events-none rounded-xl"
          style={{
            background:
              "radial-gradient(ellipse at 50% 100%, oklch(0.78 0.18 200 / 0.04) 0%, transparent 70%)",
          }}
        />
      )}
    </div>
  );
}
