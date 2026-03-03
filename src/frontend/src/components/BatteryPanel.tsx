import { useMemo } from "react";

interface BatteryPanelProps {
  chargeLevel: number;
  isFullyCharged: boolean;
}

function BatteryUnit({
  label,
  chargeLevel,
  isFullyCharged,
  delay = 0,
}: {
  label: string;
  chargeLevel: number;
  isFullyCharged: boolean;
  delay?: number;
}) {
  const wattage = useMemo(() => {
    const watts = Math.round((chargeLevel / 100) * 800000);
    return watts.toLocaleString();
  }, [chargeLevel]);

  // Interpolate fill color based on charge level
  const fillColor = useMemo(() => {
    if (chargeLevel < 20) return "oklch(0.55 0.2 45)"; // deep amber/orange
    if (chargeLevel < 50) return "oklch(0.65 0.22 60)"; // amber
    if (chargeLevel < 75) return "oklch(0.7 0.2 130)"; // amber-green
    if (chargeLevel < 95) return "oklch(0.72 0.2 180)"; // cyan-green
    return "oklch(0.82 0.22 200)"; // bright electric cyan
  }, [chargeLevel]);

  const gradientId = `battery-gradient-${label.replace(" ", "-").toLowerCase()}`;

  return (
    <div className="flex flex-col items-center gap-3 flex-1">
      {/* Battery Label */}
      <div
        className="font-mono text-xs tracking-[0.2em] font-bold"
        style={{ color: "oklch(0.55 0.04 220)" }}
      >
        {label}
      </div>

      {/* Battery Container */}
      <div className="relative flex flex-col items-center">
        {/* Battery top terminal */}
        <div
          className="w-8 h-3 rounded-t-sm mb-0"
          style={{
            background: isFullyCharged
              ? "oklch(0.82 0.22 200)"
              : "oklch(0.25 0.03 240)",
            boxShadow: isFullyCharged
              ? "0 0 8px oklch(0.82 0.22 200 / 0.8)"
              : "none",
            transition: "all 0.3s ease",
          }}
        />

        {/* Battery body */}
        <div
          className={`relative w-20 overflow-hidden rounded-sm ${isFullyCharged ? "animate-battery-glow" : ""}`}
          style={{
            height: 220,
            background: "oklch(0.1 0.015 260)",
            border: isFullyCharged
              ? "1px solid oklch(0.82 0.22 200 / 0.8)"
              : "1px solid oklch(0.22 0.04 240)",
            transition: "border-color 0.5s ease, box-shadow 0.5s ease",
          }}
        >
          {/* SVG Gradient definition */}
          <svg
            width="0"
            height="0"
            style={{ position: "absolute" }}
            aria-hidden="true"
            role="img"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="oklch(0.55 0.2 45)" />
                <stop offset="50%" stopColor="oklch(0.68 0.21 120)" />
                <stop offset="100%" stopColor="oklch(0.82 0.22 200)" />
              </linearGradient>
            </defs>
          </svg>

          {/* Fill bar */}
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{
              height: `${chargeLevel}%`,
              background: `linear-gradient(to top, oklch(0.55 0.2 45), oklch(0.68 0.21 120) 50%, ${fillColor})`,
              transition: "height 0.3s ease, background 0.3s ease",
              transitionDelay: `${delay}ms`,
            }}
          />

          {/* Shimmer overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(135deg, transparent 30%, oklch(1 0 0 / 0.03) 50%, transparent 70%)",
            }}
          />

          {/* Segment lines */}
          {[25, 50, 75].map((mark) => (
            <div
              key={mark}
              className="absolute left-0 right-0"
              style={{
                bottom: `${mark}%`,
                height: 1,
                background: "oklch(0.08 0.008 260 / 0.6)",
                zIndex: 2,
              }}
            />
          ))}

          {/* Percentage label */}
          <div
            className="absolute inset-0 flex items-center justify-center z-10"
            style={{ zIndex: 3 }}
          >
            <span
              className="font-mono font-bold text-sm tracking-wider"
              style={{
                color:
                  chargeLevel > 40
                    ? "oklch(0.08 0.008 260)"
                    : "oklch(0.7 0.04 220)",
                textShadow:
                  chargeLevel > 40
                    ? "none"
                    : "0 0 8px oklch(0.78 0.18 200 / 0.6)",
              }}
            >
              {Math.round(chargeLevel)}%
            </span>
          </div>

          {/* Scanlines overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 3px, oklch(0 0 0 / 0.04) 3px, oklch(0 0 0 / 0.04) 4px)",
              zIndex: 4,
            }}
          />
        </div>

        {/* Bottom connection */}
        <div
          className="w-16 h-2 rounded-b"
          style={{
            background: "oklch(0.15 0.02 260)",
            border: "1px solid oklch(0.22 0.04 240)",
            borderTop: "none",
          }}
        />
      </div>

      {/* Wattage Display */}
      <div className="text-center">
        <div
          className="font-mono text-xs font-bold tracking-wider"
          style={{
            color: isFullyCharged
              ? "oklch(0.88 0.22 200)"
              : chargeLevel > 0
                ? "oklch(0.82 0.22 45)"
                : "oklch(0.35 0.02 240)",
            textShadow:
              chargeLevel > 0
                ? isFullyCharged
                  ? "0 0 10px oklch(0.78 0.18 200 / 0.8)"
                  : "0 0 10px oklch(0.72 0.2 45 / 0.6)"
                : "none",
            transition: "all 0.3s ease",
          }}
        >
          {wattage} W
        </div>
        <div
          className="font-mono text-[10px] mt-0.5 tracking-widest"
          style={{ color: "oklch(0.4 0.03 240)" }}
        >
          MAX 800,000 W
        </div>
      </div>
    </div>
  );
}

export function BatteryPanel({
  chargeLevel,
  isFullyCharged,
}: BatteryPanelProps) {
  return (
    <div
      data-ocid="battery.panel"
      className={`glass-panel rounded-xl p-6 relative overflow-hidden ${isFullyCharged ? "glass-panel-active" : ""}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2
            className="font-mono text-xs tracking-[0.3em] font-bold uppercase"
            style={{ color: "oklch(0.55 0.04 220)" }}
          >
            POWER BANKS
          </h2>
          <div
            className={`font-mono text-[10px] tracking-widest mt-0.5 ${isFullyCharged ? "text-neon-cyan" : ""}`}
            style={{
              color: isFullyCharged ? undefined : "oklch(0.35 0.02 240)",
            }}
          >
            {isFullyCharged
              ? "● FULLY CHARGED"
              : chargeLevel > 0
                ? "● CHARGING"
                : "○ STANDBY"}
          </div>
        </div>
        <div
          className="font-mono text-right"
          style={{ color: "oklch(0.4 0.03 240)" }}
        >
          <div className="text-[10px] tracking-widest">CAPACITY</div>
          <div
            className="text-xs font-bold"
            style={{
              color: isFullyCharged
                ? "oklch(0.88 0.22 200)"
                : "oklch(0.45 0.03 240)",
            }}
          >
            1,600,000 W
          </div>
        </div>
      </div>

      {/* Battery units side by side */}
      <div className="flex gap-6 justify-center">
        <BatteryUnit
          label="BATTERY 1"
          chargeLevel={chargeLevel}
          isFullyCharged={isFullyCharged}
          delay={0}
        />
        <BatteryUnit
          label="BATTERY 2"
          chargeLevel={chargeLevel}
          isFullyCharged={isFullyCharged}
          delay={50}
        />
      </div>

      {/* Background ambient glow */}
      {isFullyCharged && (
        <div
          className="absolute inset-0 pointer-events-none rounded-xl"
          style={{
            background:
              "radial-gradient(ellipse at 50% 100%, oklch(0.78 0.18 200 / 0.08) 0%, transparent 70%)",
          }}
        />
      )}
    </div>
  );
}
