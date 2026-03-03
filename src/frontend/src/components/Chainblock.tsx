import { useEffect, useRef, useState } from "react";

interface ChainblockProps {
  isUnlocked: boolean;
  chargeLevel: number;
}

function LockIcon({ isUnlocked }: { isUnlocked: boolean }) {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      role="img"
      style={{
        filter: isUnlocked
          ? "drop-shadow(0 0 12px oklch(0.78 0.22 145)) drop-shadow(0 0 24px oklch(0.78 0.22 145 / 0.4))"
          : "drop-shadow(0 0 12px oklch(0.62 0.22 25)) drop-shadow(0 0 24px oklch(0.62 0.22 25 / 0.4))",
        transition: "filter 0.5s ease",
      }}
    >
      {/* Lock body */}
      <rect
        x="12"
        y="36"
        width="56"
        height="38"
        rx="6"
        fill={isUnlocked ? "oklch(0.18 0.04 170)" : "oklch(0.16 0.04 25)"}
        stroke={isUnlocked ? "oklch(0.78 0.22 145)" : "oklch(0.62 0.22 25)"}
        strokeWidth="2"
        style={{ transition: "all 0.5s ease" }}
      />

      {/* Keyhole */}
      <circle
        cx="40"
        cy="53"
        r="5"
        fill={isUnlocked ? "oklch(0.88 0.25 145)" : "oklch(0.72 0.22 25)"}
        style={{ transition: "all 0.5s ease" }}
      />
      <rect
        x="38"
        y="55"
        width="4"
        height="8"
        rx="2"
        fill={isUnlocked ? "oklch(0.88 0.25 145)" : "oklch(0.72 0.22 25)"}
        style={{ transition: "all 0.5s ease" }}
      />

      {/* Shackle / U-shape */}
      {isUnlocked ? (
        /* Open shackle - shifted to the right and up */
        <path
          d="M28 36 L28 20 Q28 8 40 8 Q52 8 52 20 L52 28"
          stroke="oklch(0.78 0.22 145)"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
          style={{
            transition: "all 0.5s ease",
            filter: "drop-shadow(0 0 4px oklch(0.78 0.22 145))",
          }}
        />
      ) : (
        /* Closed shackle */
        <path
          d="M28 36 L28 22 Q28 8 40 8 Q52 8 52 22 L52 36"
          stroke="oklch(0.62 0.22 25)"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
          style={{
            transition: "all 0.5s ease",
            filter: "drop-shadow(0 0 4px oklch(0.62 0.22 25))",
          }}
        />
      )}
    </svg>
  );
}

export function Chainblock({ isUnlocked, chargeLevel }: ChainblockProps) {
  const [showBounce, setShowBounce] = useState(false);
  const prevUnlockedRef = useRef(false);

  useEffect(() => {
    if (isUnlocked && !prevUnlockedRef.current) {
      setShowBounce(true);
      const timer = setTimeout(() => setShowBounce(false), 700);
      return () => clearTimeout(timer);
    }
    prevUnlockedRef.current = isUnlocked;
  }, [isUnlocked]);

  return (
    <div
      data-ocid="chainblock.panel"
      className={`glass-panel rounded-xl p-6 relative overflow-hidden flex flex-col items-center justify-center gap-4 ${isUnlocked ? "glass-panel-active" : ""}`}
      style={{ minHeight: 280 }}
    >
      {/* Header */}
      <div className="text-center">
        <h2
          className="font-mono text-xs tracking-[0.3em] font-bold uppercase"
          style={{ color: "oklch(0.55 0.04 220)" }}
        >
          SYSTEM LOCK
        </h2>
      </div>

      {/* Chain decorative elements */}
      <div className="flex items-center gap-2 w-full justify-center">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-1">
            {/* Chain link */}
            <div
              style={{
                width: 16,
                height: 10,
                borderRadius: 5,
                border: `2px solid ${isUnlocked ? "oklch(0.78 0.22 145 / 0.4)" : "oklch(0.35 0.04 240 / 0.6)"}`,
                transition: "border-color 0.5s ease",
              }}
            />
            {i < 2 && (
              <div
                style={{
                  width: 10,
                  height: 16,
                  borderRadius: 5,
                  border: `2px solid ${isUnlocked ? "oklch(0.78 0.22 145 / 0.4)" : "oklch(0.35 0.04 240 / 0.6)"}`,
                  transition: "border-color 0.5s ease",
                }}
              />
            )}
          </div>
        ))}

        {/* Center lock */}
        <div
          className={`${showBounce ? "animate-unlock-bounce" : ""}`}
          style={{ margin: "0 8px" }}
        >
          <LockIcon isUnlocked={isUnlocked} />
        </div>

        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-1">
            {i > 0 && (
              <div
                style={{
                  width: 10,
                  height: 16,
                  borderRadius: 5,
                  border: `2px solid ${isUnlocked ? "oklch(0.78 0.22 145 / 0.4)" : "oklch(0.35 0.04 240 / 0.6)"}`,
                  transition: "border-color 0.5s ease",
                }}
              />
            )}
            <div
              style={{
                width: 16,
                height: 10,
                borderRadius: 5,
                border: `2px solid ${isUnlocked ? "oklch(0.78 0.22 145 / 0.4)" : "oklch(0.35 0.04 240 / 0.6)"}`,
                transition: "border-color 0.5s ease",
              }}
            />
          </div>
        ))}
      </div>

      {/* Status label */}
      <div className="text-center">
        <div
          className={`font-mono text-sm font-bold tracking-[0.2em] uppercase ${isUnlocked ? "text-neon-green" : "text-neon-red"}`}
        >
          {isUnlocked ? "SYSTEM UNLOCKED" : "SYSTEM LOCKED"}
        </div>

        {/* Progress toward unlock */}
        {!isUnlocked && (
          <div className="mt-3 w-full">
            <div
              className="font-mono text-[10px] tracking-widest mb-2"
              style={{ color: "oklch(0.4 0.03 240)" }}
            >
              CHARGE BATTERIES TO 100% TO UNLOCK
            </div>
            <div
              className="w-full rounded-full overflow-hidden mx-auto"
              style={{
                height: 3,
                maxWidth: 200,
                background: "oklch(0.15 0.02 260)",
                border: "1px solid oklch(0.22 0.04 240)",
              }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${chargeLevel}%`,
                  background:
                    "linear-gradient(to right, oklch(0.55 0.2 45), oklch(0.78 0.18 200))",
                }}
              />
            </div>
            <div
              className="font-mono text-[10px] tracking-widest mt-1"
              style={{ color: "oklch(0.45 0.03 240)" }}
            >
              {Math.round(chargeLevel)}% / 100%
            </div>
          </div>
        )}

        {isUnlocked && (
          <div
            className="font-mono text-[10px] tracking-widest mt-2"
            style={{
              color: "oklch(0.65 0.2 145)",
            }}
          >
            ALL SYSTEMS OPERATIONAL
          </div>
        )}
      </div>

      {/* Ambient background effect */}
      {isUnlocked && (
        <div
          className="absolute inset-0 pointer-events-none rounded-xl"
          style={{
            background:
              "radial-gradient(ellipse at 50% 60%, oklch(0.78 0.22 145 / 0.06) 0%, transparent 70%)",
          }}
        />
      )}
      {!isUnlocked && (
        <div
          className="absolute inset-0 pointer-events-none rounded-xl"
          style={{
            background:
              "radial-gradient(ellipse at 50% 60%, oklch(0.62 0.22 25 / 0.04) 0%, transparent 70%)",
          }}
        />
      )}
    </div>
  );
}
