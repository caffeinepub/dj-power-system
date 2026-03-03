import { useEffect, useRef } from "react";

interface ChargerUnitProps {
  isCharging: boolean;
  isFullyCharged: boolean;
  chargeLevel: number;
  onToggleCharging: () => void;
}

function ElectricSparks({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 160 160"
      fill="none"
      aria-hidden="true"
      role="img"
    >
      {/* Arc 1 */}
      <path
        d="M80 20 L72 60 L85 55 L75 100"
        stroke="oklch(0.88 0.22 200)"
        strokeWidth="1.5"
        strokeLinecap="round"
        style={{
          filter: "drop-shadow(0 0 4px oklch(0.78 0.18 200))",
          animation: "electric-spark 0.3s ease-in-out infinite",
          animationDelay: "0ms",
        }}
        opacity="0.8"
      />
      {/* Arc 2 */}
      <path
        d="M140 80 L100 72 L105 85 L60 75"
        stroke="oklch(0.88 0.22 200)"
        strokeWidth="1.5"
        strokeLinecap="round"
        style={{
          filter: "drop-shadow(0 0 4px oklch(0.78 0.18 200))",
          animation: "electric-spark 0.25s ease-in-out infinite",
          animationDelay: "80ms",
        }}
        opacity="0.7"
      />
      {/* Arc 3 */}
      <path
        d="M30 50 L55 68 L50 80 L70 95"
        stroke="oklch(0.82 0.22 45)"
        strokeWidth="1"
        strokeLinecap="round"
        style={{
          filter: "drop-shadow(0 0 4px oklch(0.72 0.2 45))",
          animation: "electric-spark 0.35s ease-in-out infinite",
          animationDelay: "120ms",
        }}
        opacity="0.6"
      />
      {/* Arc 4 */}
      <path
        d="M120 130 L100 108 L110 100 L88 80"
        stroke="oklch(0.88 0.22 200)"
        strokeWidth="1"
        strokeLinecap="round"
        style={{
          filter: "drop-shadow(0 0 4px oklch(0.78 0.18 200))",
          animation: "electric-spark 0.28s ease-in-out infinite",
          animationDelay: "40ms",
        }}
        opacity="0.75"
      />
    </svg>
  );
}

export function ChargerUnit({
  isCharging,
  isFullyCharged,
  chargeLevel,
  onToggleCharging,
}: ChargerUnitProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // The charging interval is managed in App.tsx via onToggleCharging
  // This component just handles the visual representation

  const getButtonLabel = () => {
    if (isFullyCharged) return "CHARGED";
    if (isCharging) return "CHARGING…";
    return "START CHARGE";
  };

  const getButtonColor = () => {
    if (isFullyCharged) return "oklch(0.78 0.22 145)";
    if (isCharging) return "oklch(0.78 0.18 200)";
    return "oklch(0.72 0.2 45)";
  };

  const getGlowColor = () => {
    if (isFullyCharged) return "oklch(0.78 0.22 145 / 0.6)";
    if (isCharging) return "oklch(0.78 0.18 200 / 0.6)";
    return "oklch(0.72 0.2 45 / 0.3)";
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div
      className={`glass-panel rounded-xl p-6 relative overflow-hidden ${isCharging ? "glass-panel-active" : ""}`}
    >
      {/* Header */}
      <div className="text-center mb-4">
        <h2
          className="font-mono text-xs tracking-[0.3em] font-bold uppercase"
          style={{ color: "oklch(0.55 0.04 220)" }}
        >
          CHARGER UNIT
        </h2>
        <div
          className="font-mono font-bold text-sm tracking-widest mt-1"
          style={{ color: "oklch(0.45 0.03 240)" }}
        >
          170,000 W
        </div>
      </div>

      {/* Main power button area */}
      <div className="flex flex-col items-center gap-4">
        {/* Outer rotating ring when charging */}
        <div className="relative" style={{ width: 160, height: 160 }}>
          {/* Electric sparks */}
          <ElectricSparks active={isCharging} />

          {/* Rotating dashed ring */}
          {isCharging && !isFullyCharged && (
            <div
              className="absolute inset-0 rounded-full animate-rotate-dash"
              style={{
                border: "2px dashed oklch(0.78 0.18 200 / 0.6)",
                boxShadow: "0 0 15px oklch(0.78 0.18 200 / 0.3)",
              }}
            />
          )}

          {/* Static outer ring */}
          <div
            className="absolute rounded-full"
            style={{
              inset: 8,
              border: `1px solid ${isFullyCharged ? "oklch(0.78 0.22 145 / 0.4)" : "oklch(0.22 0.04 240 / 0.6)"}`,
            }}
          />

          {/* Power button */}
          <button
            data-ocid="charger.primary_button"
            type="button"
            onClick={onToggleCharging}
            disabled={isFullyCharged}
            aria-label={getButtonLabel()}
            className="absolute rounded-full flex flex-col items-center justify-center transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{
              inset: 16,
              background: isFullyCharged
                ? "oklch(0.12 0.03 170)"
                : isCharging
                  ? "oklch(0.1 0.03 220)"
                  : "oklch(0.12 0.025 50)",
              border: `2px solid ${getButtonColor()}`,
              boxShadow: `0 0 20px ${getGlowColor()}, inset 0 0 15px ${getGlowColor().replace("0.6)", "0.1)").replace("0.3)", "0.05)")}`,
              cursor: isFullyCharged ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
            }}
          >
            {/* Power icon */}
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              style={{ marginBottom: 4 }}
              aria-hidden="true"
              role="img"
            >
              <path
                d="M16 4 L16 16"
                stroke={getButtonColor()}
                strokeWidth="2.5"
                strokeLinecap="round"
                style={{
                  filter: `drop-shadow(0 0 4px ${getButtonColor()})`,
                }}
              />
              <path
                d="M10 7.5 A10 10 0 1 0 22 7.5"
                stroke={getButtonColor()}
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
                style={{
                  filter: `drop-shadow(0 0 4px ${getButtonColor()})`,
                }}
              />
            </svg>
            <span
              className={`font-mono text-[9px] font-bold tracking-widest ${isCharging && !isFullyCharged ? "animate-charging-text" : ""}`}
              style={{
                color: getButtonColor(),
                textShadow: `0 0 8px ${getButtonColor()}`,
              }}
            >
              {getButtonLabel()}
            </span>
          </button>

          {/* Outer glow ring when fully charged */}
          {isFullyCharged && (
            <div
              className="absolute inset-0 rounded-full animate-pulse-green"
              style={{
                boxShadow: "0 0 30px oklch(0.78 0.22 145 / 0.5)",
              }}
            />
          )}

          {/* Charging progress arc indicator */}
          {isCharging && !isFullyCharged && (
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 160 160"
              style={{ transform: "rotate(-90deg)" }}
              aria-hidden="true"
              role="img"
            >
              <circle
                cx="80"
                cy="80"
                r="74"
                fill="none"
                stroke="oklch(0.78 0.18 200 / 0.15)"
                strokeWidth="3"
              />
              <circle
                cx="80"
                cy="80"
                r="74"
                fill="none"
                stroke="oklch(0.78 0.18 200)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 74}`}
                strokeDashoffset={`${2 * Math.PI * 74 * (1 - chargeLevel / 100)}`}
                style={{
                  transition: "stroke-dashoffset 0.3s ease",
                  filter: "drop-shadow(0 0 4px oklch(0.78 0.18 200))",
                }}
              />
            </svg>
          )}
        </div>

        {/* Charge rate indicator */}
        <div className="text-center">
          {isCharging && !isFullyCharged && (
            <div
              className="font-mono text-xs tracking-widest animate-charging-text"
              style={{
                color: "oklch(0.78 0.18 200)",
                textShadow: "0 0 8px oklch(0.78 0.18 200 / 0.6)",
              }}
            >
              ⚡ 170,000 W CHARGE RATE
            </div>
          )}
          {isFullyCharged && (
            <div
              className="font-mono text-xs tracking-widest"
              style={{
                color: "oklch(0.88 0.25 145)",
                textShadow: "0 0 8px oklch(0.78 0.22 145 / 0.8)",
              }}
            >
              ✓ SYSTEM FULLY CHARGED
            </div>
          )}
          {!isCharging && !isFullyCharged && (
            <div
              className="font-mono text-xs tracking-widest"
              style={{ color: "oklch(0.35 0.02 240)" }}
            >
              PRESS TO BEGIN CHARGING
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div
          className="w-full rounded-full overflow-hidden"
          style={{
            height: 6,
            background: "oklch(0.15 0.02 260)",
            border: "1px solid oklch(0.22 0.04 240)",
          }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${chargeLevel}%`,
              background: isFullyCharged
                ? "linear-gradient(to right, oklch(0.68 0.21 120), oklch(0.88 0.25 145))"
                : "linear-gradient(to right, oklch(0.55 0.2 45), oklch(0.78 0.18 200))",
              boxShadow: isCharging
                ? "0 0 8px oklch(0.78 0.18 200 / 0.8)"
                : "none",
            }}
          />
        </div>

        <div
          className="font-mono text-xs tracking-widest font-bold"
          style={{
            color: isFullyCharged
              ? "oklch(0.88 0.25 145)"
              : isCharging
                ? "oklch(0.78 0.18 200)"
                : "oklch(0.4 0.03 240)",
          }}
        >
          {Math.round(chargeLevel)}% CHARGED
        </div>
      </div>

      {/* Ambient glow background */}
      {isCharging && !isFullyCharged && (
        <div
          className="absolute inset-0 pointer-events-none rounded-xl"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, oklch(0.78 0.18 200 / 0.05) 0%, transparent 70%)",
          }}
        />
      )}
    </div>
  );
}
