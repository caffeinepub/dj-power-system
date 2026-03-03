interface SoundEnginesProps {
  isUnlocked: boolean;
}

function EngineGauge({
  isActive,
  engineNum,
}: {
  isActive: boolean;
  engineNum: number;
}) {
  const segments = 20;
  const activeSegments = isActive ? segments : 0;

  return (
    <div
      className="flex flex-col items-center gap-3 flex-1"
      style={{ minWidth: 0 }}
    >
      {/* Engine label */}
      <div
        className="font-mono text-[10px] tracking-[0.2em] font-bold uppercase whitespace-nowrap"
        style={{
          color: isActive ? "oklch(0.55 0.04 220)" : "oklch(0.3 0.02 240)",
          transition: "color 0.5s ease",
        }}
      >
        ENGINE {engineNum}
      </div>

      {/* Circular gauge */}
      <div className="relative" style={{ width: 80, height: 80 }}>
        {/* Background ring */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 80 80"
          fill="none"
          aria-hidden="true"
          role="img"
        >
          {/* Track */}
          <circle
            cx="40"
            cy="40"
            r="34"
            fill="none"
            stroke="oklch(0.15 0.02 260)"
            strokeWidth="6"
          />

          {/* Active arc */}
          <circle
            cx="40"
            cy="40"
            r="34"
            fill="none"
            stroke={isActive ? "oklch(0.78 0.18 200)" : "oklch(0.22 0.03 240)"}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 34 * 0.75}`}
            strokeDashoffset={isActive ? 0 : `${2 * Math.PI * 34 * 0.75}`}
            transform="rotate(135 40 40)"
            style={{
              transition: "stroke-dashoffset 0.8s ease, stroke 0.5s ease",
              filter: isActive
                ? "drop-shadow(0 0 4px oklch(0.78 0.18 200))"
                : "none",
            }}
          />

          {/* Tick marks */}
          {Array.from({ length: segments }, (_, tickIdx) => {
            const angle = 135 + (tickIdx / (segments - 1)) * 270;
            const rad = (angle * Math.PI) / 180;
            const r1 = 28;
            const r2 = 24;
            const x1 = 40 + r1 * Math.cos(rad);
            const y1 = 40 + r1 * Math.sin(rad);
            const x2 = 40 + r2 * Math.cos(rad);
            const y2 = 40 + r2 * Math.sin(rad);
            const isActiveSeg = isActive && tickIdx < activeSegments;
            const tickStroke = isActiveSeg
              ? tickIdx > 15
                ? "oklch(0.62 0.22 25)"
                : tickIdx > 10
                  ? "oklch(0.82 0.2 95)"
                  : "oklch(0.78 0.18 200)"
              : "oklch(0.2 0.02 240)";
            return (
              <line
                key={`e${engineNum}-t${angle.toFixed(0)}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={tickStroke}
                strokeWidth="1.5"
                strokeLinecap="round"
                style={{ transition: "stroke 0.5s ease" }}
              />
            );
          })}
        </svg>

        {/* Center display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-mono text-sm font-bold"
            style={{
              color: isActive ? "oklch(0.88 0.22 200)" : "oklch(0.3 0.02 240)",
              textShadow: isActive
                ? "0 0 10px oklch(0.78 0.18 200 / 0.8)"
                : "none",
              transition: "all 0.5s ease",
            }}
          >
            {isActive ? "100" : "---"}
          </span>
          <span
            className="font-mono text-[8px] tracking-widest"
            style={{
              color: isActive ? "oklch(0.55 0.06 200)" : "oklch(0.25 0.02 240)",
              transition: "color 0.5s ease",
            }}
          >
            %
          </span>
        </div>

        {/* Hum rings when active */}
        {isActive && (
          <>
            <div
              className="absolute rounded-full"
              style={{
                inset: -4,
                border: "1px solid oklch(0.78 0.18 200 / 0.2)",
                animation: "engine-hum 2s ease-in-out infinite",
                animationDelay: `${engineNum * 0.15}s`,
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                inset: -10,
                border: "1px solid oklch(0.78 0.18 200 / 0.1)",
                animation: "engine-hum 2s ease-in-out infinite",
                animationDelay: `${engineNum * 0.15 + 0.3}s`,
              }}
            />
          </>
        )}
      </div>

      {/* Status badge */}
      <div
        className="font-mono text-[9px] tracking-[0.2em] font-bold px-2 py-0.5 rounded"
        style={{
          background: isActive
            ? "oklch(0.78 0.18 200 / 0.15)"
            : "oklch(0.15 0.02 260)",
          border: `1px solid ${isActive ? "oklch(0.78 0.18 200 / 0.4)" : "oklch(0.22 0.04 240)"}`,
          color: isActive ? "oklch(0.78 0.18 200)" : "oklch(0.35 0.02 240)",
          transition: "all 0.5s ease",
        }}
      >
        {isActive ? "ONLINE" : "OFFLINE"}
      </div>
    </div>
  );
}

export function SoundEngines({ isUnlocked }: SoundEnginesProps) {
  return (
    <div
      data-ocid="engines.panel"
      className={`glass-panel rounded-xl p-6 relative overflow-hidden ${isUnlocked ? "glass-panel-active" : ""}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2
            className="font-mono text-xs tracking-[0.3em] font-bold uppercase"
            style={{ color: "oklch(0.55 0.04 220)" }}
          >
            SOUND ENGINES
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
            {isUnlocked ? "● 4/4 ENGINES ACTIVE" : "○ ENGINES OFFLINE"}
          </div>
        </div>
        <div
          className="font-mono text-xs font-bold tracking-wider"
          style={{
            color: isUnlocked ? "oklch(0.88 0.22 200)" : "oklch(0.3 0.02 240)",
            transition: "color 0.5s ease",
          }}
        >
          {isUnlocked ? "100%" : "0%"}
        </div>
      </div>

      {/* Engine gauges */}
      <div className="flex gap-4 justify-between">
        {[1, 2, 3, 4].map((num) => (
          <EngineGauge key={num} isActive={isUnlocked} engineNum={num} />
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
