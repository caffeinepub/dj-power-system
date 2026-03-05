import { useEffect, useRef, useState } from "react";

export interface MagnetMusicChipProps {
  realDbLevel: number; // real dBFS (-80 to 0)
  bassLevel: number; // 0–100 bass energy
  isPlaying: boolean;
}

type RoomSize = "SMALL" | "MEDIUM" | "LARGE" | "MAX";

const ROOM_CONFIG: Record<RoomSize, { label: string; feet: number }> = {
  SMALL: { label: "SMALL", feet: 15 },
  MEDIUM: { label: "MEDIUM", feet: 30 },
  LARGE: { label: "LARGE", feet: 45 },
  MAX: { label: "MAX", feet: 60 },
};

const CYAN = "oklch(0.78 0.18 200)";
const CYAN_BRIGHT = "oklch(0.88 0.22 200)";
const CYAN_DIM = "oklch(0.52 0.12 200)";
const CYAN_GLOW = "oklch(0.78 0.18 200 / 0.35)";

export function MagnetMusicChip({
  realDbLevel,
  bassLevel: _bassLevel,
  isPlaying,
}: MagnetMusicChipProps) {
  const [roomSize, setRoomSize] = useState<RoomSize>("MEDIUM");
  const prevDbRef = useRef(realDbLevel);

  useEffect(() => {
    prevDbRef.current = realDbLevel;
  }, [realDbLevel]);

  const selectedFeet = ROOM_CONFIG[roomSize].feet;
  // Map real dBFS (-80 to 0) → 0–100% field strength
  const fieldStrength = Math.min(
    100,
    Math.max(0, ((realDbLevel + 80) / 80) * 100),
  );
  const rangeInFeet = Math.round((selectedFeet * fieldStrength) / 100);
  const isFullImmersion = rangeInFeet >= selectedFeet && isPlaying;

  const magnetStatus: string = !isPlaying
    ? "OFFLINE"
    : isFullImmersion
      ? "FULL IMMERSION"
      : realDbLevel > -18
        ? "EXPANDING"
        : realDbLevel >= -30
          ? "HOLDING"
          : "CONTRACTING";

  const statusColor: string =
    magnetStatus === "FULL IMMERSION"
      ? CYAN_BRIGHT
      : magnetStatus === "EXPANDING"
        ? CYAN
        : magnetStatus === "HOLDING"
          ? "oklch(0.75 0.16 195)"
          : magnetStatus === "CONTRACTING"
            ? "oklch(0.55 0.1 210)"
            : "oklch(0.35 0.03 240)";

  return (
    <div
      data-ocid="magnet.panel"
      className="magnet-music-chip"
      style={{
        width: "100%",
        position: "relative",
        borderRadius: 8,
        background:
          "linear-gradient(135deg, oklch(0.07 0.015 260) 0%, oklch(0.09 0.02 220) 100%)",
        border: `1.5px solid ${isFullImmersion ? CYAN_BRIGHT : CYAN}`,
        boxShadow: `
          0 0 12px oklch(0.78 0.18 200 / 0.25),
          0 0 28px oklch(0.78 0.18 200 / 0.08),
          inset 0 0 16px oklch(0.78 0.18 200 / 0.03)
        `,
        overflow: "hidden",
        padding: "5px 10px",
        transition: "border-color 0.3s ease, box-shadow 0.3s ease",
      }}
    >
      {/* Subtle dot grid overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle, oklch(0.78 0.18 200 / 0.04) 1px, transparent 1px)",
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
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: isPlaying ? CYAN_BRIGHT : "oklch(0.28 0.03 240)",
              boxShadow: isPlaying
                ? `0 0 6px ${CYAN_BRIGHT}, 0 0 12px ${CYAN_GLOW}`
                : "none",
              flexShrink: 0,
              animation: isPlaying
                ? "chip-led-pulse 1.6s ease-in-out infinite"
                : "none",
            }}
          />
          {/* Mini magnet icon inline */}
          <svg
            width={10}
            height={10}
            viewBox="0 0 48 48"
            fill="none"
            aria-hidden="true"
            style={{
              flexShrink: 0,
              filter: isPlaying ? `drop-shadow(0 0 3px ${CYAN})` : "none",
            }}
          >
            <path
              d="M10 38 L10 18 A14 14 0 0 1 38 18 L38 38"
              stroke={isPlaying ? CYAN_BRIGHT : CYAN_DIM}
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
            <rect
              x="6"
              y="36"
              width="10"
              height="7"
              rx="2"
              fill={isPlaying ? CYAN_BRIGHT : CYAN_DIM}
            />
            <rect
              x="32"
              y="36"
              width="10"
              height="7"
              rx="2"
              fill={isPlaying ? CYAN_BRIGHT : CYAN_DIM}
            />
          </svg>
          <span
            className="font-mono font-black tracking-[0.18em] uppercase"
            style={{
              fontSize: 9,
              color: CYAN_BRIGHT,
              textShadow: "0 0 10px oklch(0.78 0.18 200 / 0.7)",
              whiteSpace: "nowrap",
            }}
          >
            MAGNET MUSIC — FIELD ACTIVE
          </span>
        </div>

        {/* Divider */}
        <div
          style={{
            width: 1,
            height: 18,
            background: "oklch(0.78 0.18 200 / 0.25)",
            flexShrink: 0,
          }}
        />

        {/* FIELD readout */}
        <div className="flex items-center gap-1.5" style={{ flexShrink: 0 }}>
          <span
            className="font-mono tracking-widest uppercase"
            style={{ fontSize: 8, color: CYAN_DIM }}
          >
            FIELD
          </span>
          <span
            className="font-mono font-bold tabular-nums"
            style={{
              fontSize: 11,
              color: CYAN_BRIGHT,
              textShadow: `0 0 8px ${CYAN}`,
              lineHeight: 1,
            }}
          >
            {isPlaying ? `${Math.round(fieldStrength)}%` : "--"}
          </span>
        </div>

        {/* Divider */}
        <div
          style={{
            width: 1,
            height: 18,
            background: "oklch(0.78 0.18 200 / 0.25)",
            flexShrink: 0,
          }}
        />

        {/* RANGE readout */}
        <div className="flex items-center gap-1.5" style={{ flexShrink: 0 }}>
          <span
            className="font-mono tracking-widest uppercase"
            style={{ fontSize: 8, color: CYAN_DIM }}
          >
            RANGE
          </span>
          <span
            className="font-mono font-bold tabular-nums"
            style={{
              fontSize: 9,
              color: isFullImmersion ? CYAN_BRIGHT : CYAN,
              textShadow: isFullImmersion ? `0 0 8px ${CYAN}` : "none",
              lineHeight: 1,
            }}
          >
            {isPlaying ? `${rangeInFeet}ft` : "--ft"}
          </span>
        </div>

        {/* Divider */}
        <div
          style={{
            width: 1,
            height: 18,
            background: "oklch(0.78 0.18 200 / 0.25)",
            flexShrink: 0,
          }}
        />

        {/* MAGNET STATUS */}
        <div className="flex items-center gap-1.5" style={{ flexShrink: 0 }}>
          <span
            className="font-mono tracking-widest uppercase"
            style={{ fontSize: 8, color: CYAN_DIM }}
          >
            MAG
          </span>
          <span
            className="font-mono font-bold tracking-wider"
            style={{
              fontSize: 9,
              color: statusColor,
              textShadow:
                magnetStatus === "FULL IMMERSION" ||
                magnetStatus === "EXPANDING"
                  ? `0 0 8px ${statusColor}`
                  : "none",
            }}
          >
            {magnetStatus}
          </span>
        </div>

        {/* Divider */}
        <div
          style={{
            width: 1,
            height: 18,
            background: "oklch(0.78 0.18 200 / 0.25)",
            flexShrink: 0,
          }}
        />

        {/* Room size selector — inline compact buttons */}
        <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
          <span
            className="font-mono tracking-widest uppercase"
            style={{ fontSize: 8, color: CYAN_DIM, marginRight: 3 }}
          >
            ROOM
          </span>
          {(Object.keys(ROOM_CONFIG) as RoomSize[]).map((size) => (
            <button
              key={size}
              type="button"
              data-ocid={`magnet.${size.toLowerCase()}_button`}
              onClick={() => setRoomSize(size)}
              style={{
                fontFamily: "JetBrains Mono, Geist Mono, monospace",
                fontSize: 7,
                letterSpacing: "0.1em",
                padding: "1px 4px",
                borderRadius: 3,
                border: `1px solid ${roomSize === size ? CYAN : "oklch(0.22 0.04 240)"}`,
                background:
                  roomSize === size
                    ? "oklch(0.78 0.18 200 / 0.15)"
                    : "transparent",
                color: roomSize === size ? CYAN_BRIGHT : "oklch(0.38 0.04 240)",
                cursor: "pointer",
                textTransform: "uppercase",
                boxShadow:
                  roomSize === size
                    ? "0 0 5px oklch(0.78 0.18 200 / 0.3)"
                    : "none",
                transition: "all 0.15s ease",
                lineHeight: 1.4,
              }}
            >
              {size === "SMALL"
                ? "15ft"
                : size === "MEDIUM"
                  ? "30ft"
                  : size === "LARGE"
                    ? "45ft"
                    : "60ft"}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Right side badges */}
        <div
          className="flex items-center gap-2"
          style={{ flexShrink: 0, flexWrap: "wrap" }}
        >
          <span
            className="font-mono tracking-widest"
            style={{
              fontSize: 7,
              color: CYAN_DIM,
              background: "oklch(0.78 0.18 200 / 0.08)",
              border: "1px solid oklch(0.78 0.18 200 / 0.25)",
              borderRadius: 3,
              padding: "2px 5px",
              whiteSpace: "nowrap",
            }}
          >
            🧲 ROOM AWARE
          </span>
          <span
            className="font-mono tracking-widest"
            style={{
              fontSize: 7,
              color: CYAN_DIM,
              background: "oklch(0.78 0.18 200 / 0.08)",
              border: "1px solid oklch(0.78 0.18 200 / 0.25)",
              borderRadius: 3,
              padding: "2px 5px",
              whiteSpace: "nowrap",
              animation: isFullImmersion
                ? "chip-badge-flicker 1.5s ease-in-out infinite"
                : "none",
            }}
          >
            ⚡ {isFullImmersion ? "FULL IMMERSION" : "DISTANCE COMP"}
          </span>
          <span
            className="font-mono tracking-widest"
            style={{
              fontSize: 7,
              color: CYAN_DIM,
              opacity: 0.7,
              whiteSpace: "nowrap",
            }}
          >
            {ROOM_CONFIG[roomSize].feet}FT FIELD
          </span>
        </div>
      </div>
    </div>
  );
}
