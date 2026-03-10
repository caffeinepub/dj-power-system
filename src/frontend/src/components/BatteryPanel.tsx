import { useEffect, useMemo, useState } from "react";

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

      {/* Power Delivery Row */}
      <div
        className="mt-5 rounded-lg px-4 py-3 flex items-center justify-between gap-3"
        style={{
          background: "oklch(0.08 0.015 250)",
          border: `1px solid ${isFullyCharged ? "oklch(0.78 0.18 200 / 0.35)" : "oklch(0.2 0.03 240)"}`,
          transition: "border-color 0.4s ease",
        }}
      >
        {/* Left: Ignition power label */}
        <div className="flex flex-col gap-0.5">
          <div
            className="font-mono text-[8px] tracking-widest font-bold"
            style={{ color: "oklch(0.45 0.04 220)" }}
          >
            POWER DELIVERY
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className="font-mono text-[11px] font-bold tracking-wider"
              style={{
                color: isFullyCharged
                  ? "oklch(0.88 0.22 200)"
                  : "oklch(0.65 0.2 60)",
                textShadow: isFullyCharged
                  ? "0 0 10px oklch(0.78 0.18 200 / 0.7)"
                  : "0 0 8px oklch(0.65 0.2 60 / 0.5)",
                transition: "all 0.3s ease",
              }}
            >
              50,000W
            </span>
            <span
              className="font-mono text-[7px] tracking-widest"
              style={{ color: "oklch(0.38 0.03 240)" }}
            >
              IGNITION STARTUP POWER
            </span>
          </div>
          <div
            className="font-mono text-[7px] tracking-widest"
            style={{ color: "oklch(0.32 0.03 240)" }}
          >
            FIRES THE AMP — ZERO LAG
          </div>
        </div>

        {/* AMP POWER DELIVERY — safe 9,000W → 10,000W */}
        <div
          className="mt-2 px-2 py-1.5 rounded-lg"
          style={{
            background:
              chargeLevel >= 50
                ? "oklch(0.12 0.04 170 / 0.5)"
                : "oklch(0.1 0.01 240 / 0.4)",
            border:
              chargeLevel >= 50
                ? "1px solid oklch(0.72 0.22 145 / 0.3)"
                : "1px solid oklch(0.22 0.02 240 / 0.4)",
          }}
        >
          <div
            className="font-mono text-[7px] tracking-widest mb-0.5"
            style={{ color: "oklch(0.42 0.04 240)" }}
          >
            AMP POWER DELIVERY
          </div>
          {chargeLevel >= 50 ? (
            <>
              <div
                className="font-mono text-[11px] font-bold tracking-wider"
                style={{
                  color: "oklch(0.82 0.22 170)",
                  textShadow: "0 0 8px oklch(0.72 0.22 145 / 0.8)",
                  transition: "all 0.3s ease",
                }}
              >
                9,500W{" "}
                <span
                  className="text-[8px]"
                  style={{ color: "oklch(0.72 0.22 145)" }}
                >
                  SAFE DELIVERY
                </span>
              </div>
              <div
                className="font-mono text-[6px] tracking-widest mt-0.5"
                style={{ color: "oklch(0.55 0.15 145)" }}
              >
                SAFE POWER · NO DISTORTION · AMP PROTECTED
              </div>
            </>
          ) : (
            <div
              className="font-mono text-[9px] tracking-wider"
              style={{ color: "oklch(0.35 0.03 240)" }}
            >
              AMP POWER OFFLINE · CHARGE TO 50%
            </div>
          )}
        </div>

        {/* Right: Flow status */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          {isFullyCharged ? (
            <div
              className="font-mono text-[9px] font-bold tracking-wider flex items-center gap-1.5"
              style={{
                color: "oklch(0.82 0.22 170)",
                textShadow: "0 0 10px oklch(0.72 0.22 145 / 0.8)",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "oklch(0.82 0.22 170)",
                  boxShadow: "0 0 6px oklch(0.72 0.22 145)",
                }}
              />
              ZERO GAUGE FLOW · AMP CONNECTED
            </div>
          ) : chargeLevel >= 50 ? (
            <div
              className="font-mono text-[9px] font-bold tracking-wider flex items-center gap-1.5"
              style={{
                color: "oklch(0.72 0.22 145)",
                textShadow: "0 0 8px oklch(0.72 0.22 145 / 0.7)",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "oklch(0.72 0.22 145)",
                  boxShadow: "0 0 5px oklch(0.72 0.22 145 / 0.9)",
                }}
              />
              BATTERY → AMP · POWERING APP
            </div>
          ) : (
            <div
              className="font-mono text-[9px] font-bold tracking-wider flex items-center gap-1.5"
              style={{ color: "oklch(0.35 0.03 240)" }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  border: "1.5px solid oklch(0.35 0.03 240)",
                  background: "transparent",
                }}
              />
              STANDBY · 50,000W IGNITION READY
            </div>
          )}
          <div
            className="font-mono text-[6px] tracking-widest"
            style={{ color: "oklch(0.28 0.02 240)" }}
          >
            {isFullyCharged
              ? "UNRESTRICTED"
              : chargeLevel >= 50
                ? "AMP ONLINE"
                : "AWAITING CHARGE"}
          </div>
        </div>
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
