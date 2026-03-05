import { useMemo } from "react";

export interface SpeakerLabProps {
  realDbLevel: number;
  bassLevel: number;
  gainReduction: number;
  isPlaying: boolean;
  smoothMode: boolean;
  bassAuthorityMode: boolean;
}

type SpeakerType = "party" | "phantom-gold" | "mania" | "phantom-black";
type StatusType = "CLEAR" | "DEEP BASS" | "DISTORTED" | "CLIPPING";
type HandleVerdict = "YES — CLEAN" | "MODERATE" | "STRAIN";

interface SpeakerData {
  name: string;
  img: string;
  wattage: number;
  type: SpeakerType;
  accentColor: string; // oklch string for LED ring / glow
}

const SPEAKERS: SpeakerData[] = [
  {
    name: "Devialet Phantom Gold",
    img: "/assets/uploads/Screenshot_20260305-001715_Chrome-2.png",
    wattage: 4500,
    type: "phantom-gold",
    accentColor: "oklch(0.82 0.2 80)", // gold
  },
];

function getStatus(
  realDbLevel: number,
  gainReduction: number,
  bassLevel: number,
  isPlaying: boolean,
): StatusType {
  if (!isPlaying) return "CLEAR";
  if (realDbLevel >= 115) return "CLIPPING";
  if (gainReduction > 10 && realDbLevel > 108) return "DISTORTED";
  if (bassLevel > 65) return "DEEP BASS";
  return "CLEAR";
}

function getStatusColor(status: StatusType): string {
  switch (status) {
    case "CLIPPING":
      return "oklch(0.62 0.22 25)";
    case "DISTORTED":
      return "oklch(0.72 0.18 55)";
    case "DEEP BASS":
      return "oklch(0.82 0.22 45)";
    case "CLEAR":
      return "oklch(0.78 0.22 145)";
  }
}

function getStatusBg(status: StatusType): string {
  switch (status) {
    case "CLIPPING":
      return "oklch(0.62 0.22 25 / 0.18)";
    case "DISTORTED":
      return "oklch(0.72 0.18 55 / 0.18)";
    case "DEEP BASS":
      return "oklch(0.82 0.22 45 / 0.18)";
    case "CLEAR":
      return "oklch(0.78 0.22 145 / 0.18)";
  }
}

function getVerdict(
  speakerType: SpeakerType,
  realDbLevel: number,
  isPlaying: boolean,
): HandleVerdict {
  if (!isPlaying) return "YES — CLEAN";
  if (speakerType !== "party") return "YES — CLEAN"; // Devialet speakers handle anything
  if (realDbLevel > 105) return "STRAIN";
  return "MODERATE";
}

function getVerdictColor(verdict: HandleVerdict): string {
  switch (verdict) {
    case "YES — CLEAN":
      return "oklch(0.78 0.22 145)";
    case "MODERATE":
      return "oklch(0.82 0.22 45)";
    case "STRAIN":
      return "oklch(0.72 0.22 25)";
  }
}

function getHealthBarPct(realDbLevel: number, isPlaying: boolean): number {
  if (!isPlaying) return 0;
  return Math.max(0, Math.min(100, ((realDbLevel - 60) / 60) * 100));
}

// ────────────────────────────────────────────────────────────
// Phantom Gold woofer wings (push outward with bass + glow)
// ────────────────────────────────────────────────────────────
// Phantom I (black) woofer wings — silver/blue scheme
// ────────────────────────────────────────────────────────────
interface PhantomBlackWooferProps {
  bassLevel: number;
  realDbLevel: number;
  isPlaying: boolean;
}

function PhantomBlackWoofer({
  bassLevel,
  realDbLevel,
  isPlaying,
}: PhantomBlackWooferProps) {
  const active = isPlaying && bassLevel > 50;
  const pushAmount = active ? Math.min((bassLevel - 50) / 50, 1) : 0;
  const dbFactor = isPlaying ? Math.min((realDbLevel - 60) / 60, 1) : 0;
  const translateX = pushAmount * 18;
  const scale = 1 + pushAmount * 0.22;
  const glowIntensity = 5 + dbFactor * 16;
  const glowSpread = 10 + dbFactor * 22;
  const silverOpacity = 0.55 + pushAmount * 0.35;

  const discStyle = (direction: "left" | "right"): React.CSSProperties => ({
    position: "absolute",
    top: "50%",
    [direction]: -22,
    transform: `translateY(-50%) translateX(${direction === "left" ? -translateX : translateX}px) scale(${scale})`,
    width: 42,
    height: 42,
    borderRadius: "50%",
    background: `radial-gradient(circle at 35% 35%, oklch(0.88 0.06 240 / ${silverOpacity}), oklch(0.52 0.08 250 / ${silverOpacity * 0.8}))`,
    border: `1.5px solid oklch(0.75 0.1 240 / ${0.45 + pushAmount * 0.45})`,
    boxShadow: active
      ? `0 0 ${glowIntensity}px oklch(0.75 0.15 240 / 0.65), 0 0 ${glowSpread}px oklch(0.65 0.18 240 / 0.3), inset 0 0 8px oklch(0.85 0.08 240 / 0.2)`
      : "0 0 4px oklch(0.52 0.08 250 / 0.3)",
    transition: "transform 0.08s ease, box-shadow 0.08s ease",
    zIndex: 4,
    pointerEvents: "none",
  });

  const heartbeatStyle: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: active ? 88 + pushAmount * 28 : 68,
    height: active ? 88 + pushAmount * 28 : 68,
    borderRadius: "50%",
    border: `1px solid oklch(0.72 0.15 240 / ${active ? 0.22 + pushAmount * 0.18 : 0.08})`,
    boxShadow: active
      ? `0 0 ${8 + pushAmount * 10}px oklch(0.72 0.15 240 / 0.12)`
      : "none",
    pointerEvents: "none",
    transition: "all 0.12s ease",
    zIndex: 1,
    animation: isPlaying ? "heartbeat-ring 1.4s ease-in-out infinite" : "none",
  };

  return (
    <>
      <div style={heartbeatStyle} aria-hidden="true" />
      <div style={discStyle("left")} aria-hidden="true" />
      <div style={discStyle("right")} aria-hidden="true" />
    </>
  );
}

// ────────────────────────────────────────────────────────────
// ONN Party Speaker — LED ring border + bass woofer cone
// ────────────────────────────────────────────────────────────
interface OnnPartyOverlayProps {
  bassLevel: number;
  realDbLevel: number;
  isPlaying: boolean;
  accentColor: string;
}

function OnnPartyOverlay({
  bassLevel,
  realDbLevel,
  isPlaying,
  accentColor,
}: OnnPartyOverlayProps) {
  const active = isPlaying;
  const signalFactor = active ? Math.min((realDbLevel - 60) / 60, 1) : 0;
  const bassFactor = active ? Math.min(bassLevel / 100, 1) : 0;

  // Dynamic LED ring glow
  const ringBlur = 4 + signalFactor * 14;
  const ringSpread = 0 + signalFactor * 6;
  const ringOpacity = 0.25 + signalFactor * 0.55;

  // Bass cone scale
  const coneScale = 1 + bassFactor * 0.45;
  const coneOpacity = 0.4 + bassFactor * 0.5;

  return (
    <>
      {/* LED ring — pulsing border glow on image wrapper */}
      {active && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 7,
            border: `2px solid ${accentColor.replace(")", ` / ${ringOpacity})`).replace("oklch(", "oklch(")}`,
            boxShadow: `0 0 ${ringBlur}px ${ringSpread}px ${accentColor.replace(")", " / 0.35)").replace("oklch(", "oklch(")}`,
            pointerEvents: "none",
            zIndex: 3,
            transition: "box-shadow 0.12s ease, border-color 0.12s ease",
            animation: "onn-ring-pulse 0.8s ease-in-out infinite",
          }}
        />
      )}

      {/* Bass woofer cone at bottom-center of image area */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: -12,
          left: "50%",
          transform: `translateX(-50%) scale(${coneScale})`,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accentColor.replace(")", ` / ${coneOpacity})`).replace("oklch(", "oklch(")}, transparent 70%)`,
          border: `1px solid ${accentColor.replace(")", ` / ${coneOpacity * 0.7})`).replace("oklch(", "oklch(")}`,
          boxShadow: active
            ? `0 0 ${6 + bassFactor * 10}px ${accentColor.replace(")", " / 0.5)").replace("oklch(", "oklch(")}`
            : "none",
          transition: "transform 0.08s ease, box-shadow 0.08s ease",
          zIndex: 4,
          pointerEvents: "none",
        }}
      />
    </>
  );
}

// ────────────────────────────────────────────────────────────
// Devialet Mania — rotating omni ring + radiating arcs
// ────────────────────────────────────────────────────────────
interface ManiaOverlayProps {
  realDbLevel: number;
  isPlaying: boolean;
}

function ManiaOverlay({ realDbLevel, isPlaying }: ManiaOverlayProps) {
  const active = isPlaying;
  const dbFactor = active ? Math.min((realDbLevel - 60) / 60, 1) : 0;

  const arcOpacity = 0.08 + dbFactor * 0.3;
  const arcBlur = 3 + dbFactor * 8;

  return (
    <>
      {/* Rotating omni ring */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "105%",
          height: "105%",
          borderRadius: 10,
          border: `1.5px solid oklch(0.78 0.22 200 / ${active ? 0.2 + dbFactor * 0.25 : 0.05})`,
          boxShadow: active
            ? `0 0 ${arcBlur}px oklch(0.78 0.22 200 / 0.2), inset 0 0 ${arcBlur}px oklch(0.78 0.22 200 / 0.1)`
            : "none",
          animation: active ? "mania-rotate 4s linear infinite" : "none",
          pointerEvents: "none",
          zIndex: 3,
          transition: "border-color 0.3s ease, box-shadow 0.3s ease",
        }}
      />

      {/* Radiating arcs — 4 corners expand outward when dB is high */}
      {active &&
        [0, 1, 2, 3].map((i) => {
          const corners = [
            { top: -8, left: -8 },
            { top: -8, right: -8 },
            { bottom: -8, left: -8 },
            { bottom: -8, right: -8 },
          ];
          const arcSize = 16 + dbFactor * 22;
          return (
            <div
              key={i}
              aria-hidden="true"
              style={{
                position: "absolute",
                ...corners[i],
                width: arcSize,
                height: arcSize,
                borderRadius: "50%",
                border: `1px solid oklch(0.78 0.22 200 / ${arcOpacity})`,
                boxShadow: `0 0 ${arcBlur}px oklch(0.78 0.22 200 / 0.15)`,
                pointerEvents: "none",
                zIndex: 3,
                animation: `mania-arc-pulse ${1.2 + i * 0.15}s ease-in-out infinite`,
                transition: "all 0.15s ease",
              }}
            />
          );
        })}
    </>
  );
}

// ────────────────────────────────────────────────────────────
// Speaker Card
// ────────────────────────────────────────────────────────────
interface SpeakerCardProps {
  speaker: SpeakerData;
  realDbLevel: number;
  bassLevel: number;
  gainReduction: number;
  isPlaying: boolean;
  smoothMode: boolean;
  bassAuthorityMode: boolean;
  index: number;
}

function SpeakerCard({
  speaker,
  realDbLevel,
  bassLevel,
  gainReduction,
  isPlaying,
  smoothMode: _smoothMode,
  bassAuthorityMode: _bassAuthorityMode,
  index,
}: SpeakerCardProps) {
  const status = getStatus(realDbLevel, gainReduction, bassLevel, isPlaying);
  const statusColor = getStatusColor(status);
  const statusBg = getStatusBg(status);
  const healthPct = getHealthBarPct(realDbLevel, isPlaying);
  const bassHot = isPlaying && bassLevel > 70;
  const isDevialet = speaker.type !== "party";
  const isPhantomGold = speaker.type === "phantom-gold";
  const isPhantomBlack = speaker.type === "phantom-black";
  const isMania = speaker.type === "mania";
  const isParty = speaker.type === "party";

  const verdict = getVerdict(speaker.type, realDbLevel, isPlaying);
  const verdictColor = getVerdictColor(verdict);

  // dB bar health color
  const barColor =
    healthPct > 90
      ? "oklch(0.62 0.22 25)"
      : healthPct > 70
        ? "oklch(0.72 0.18 55)"
        : healthPct > 45
          ? "oklch(0.82 0.22 45)"
          : "oklch(0.78 0.22 145)";

  // Stabilizer GR display
  const stabGrDisplay = isPlaying ? `-${gainReduction.toFixed(1)} dB` : "—";
  const stabActive = gainReduction > 2;

  const ocidBase = `speaker.item.${index + 1}`;

  return (
    <div
      data-ocid={ocidBase}
      style={{
        background: "oklch(0.11 0.015 260)",
        border: `1px solid oklch(0.78 0.18 200 / ${isPlaying ? 0.28 : 0.16})`,
        borderRadius: 10,
        padding: "14px",
        position: "relative",
        overflow: "visible",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "border-color 0.3s ease",
      }}
    >
      {/* Phantom I (black) animated woofer discs */}
      {isPhantomBlack && (
        <PhantomBlackWoofer
          bassLevel={bassLevel}
          realDbLevel={realDbLevel}
          isPlaying={isPlaying}
        />
      )}

      {/* Speaker image area */}
      <div
        style={{
          width: "100%",
          height: 180,
          borderRadius: 7,
          overflow: "visible",
          background: "transparent",
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          position: "relative",
        }}
      >
        {/* ONN party LED ring + bass cone overlay */}
        {isParty && (
          <OnnPartyOverlay
            bassLevel={bassLevel}
            realDbLevel={realDbLevel}
            isPlaying={isPlaying}
            accentColor={speaker.accentColor}
          />
        )}

        {/* Devialet Mania omni ring overlay */}
        {isMania && (
          <ManiaOverlay realDbLevel={realDbLevel} isPlaying={isPlaying} />
        )}

        {/* Phantom Gold — composite body + animated wing images */}
        {isPhantomGold ? (
          (() => {
            const wingPush =
              isPlaying && bassLevel > 50
                ? Math.min((bassLevel - 50) / 50, 1) * 20
                : 0;
            const wingGlow =
              isPlaying && bassLevel > 50
                ? `0 0 ${8 + wingPush}px oklch(0.86 0.22 80 / 0.6)`
                : "none";
            return (
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  height: "100%",
                }}
              >
                {/* Left wing */}
                <img
                  src="/assets/generated/phantom-gold-wing-left-transparent.dim_200x400.png"
                  alt=""
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: 0,
                    width: "22%",
                    height: "auto",
                    objectFit: "contain",
                    transform: `translateX(-${wingPush}px)`,
                    boxShadow: wingGlow,
                    transition: "transform 0.08s ease, box-shadow 0.08s ease",
                    zIndex: 1,
                    pointerEvents: "none",
                  }}
                />
                {/* Body */}
                <img
                  src="/assets/generated/phantom-gold-body.dim_600x400.png"
                  alt={speaker.name}
                  style={{
                    width: "70%",
                    height: "auto",
                    objectFit: "contain",
                    position: "relative",
                    zIndex: 2,
                  }}
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display =
                      "none";
                  }}
                />
                {/* Right wing */}
                <img
                  src="/assets/generated/phantom-gold-wing-right-transparent.dim_200x400.png"
                  alt=""
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    right: 0,
                    width: "22%",
                    height: "auto",
                    objectFit: "contain",
                    transform: `translateX(${wingPush}px)`,
                    boxShadow: wingGlow,
                    transition: "transform 0.08s ease, box-shadow 0.08s ease",
                    zIndex: 1,
                    pointerEvents: "none",
                  }}
                />
              </div>
            );
          })()
        ) : (
          <img
            src={speaker.img}
            alt={speaker.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
            }}
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        )}
      </div>

      {/* Speaker name */}
      <div
        style={{
          fontFamily: "JetBrains Mono, Geist Mono, monospace",
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.12em",
          color: "oklch(0.72 0.12 220)",
          textTransform: "uppercase",
          lineHeight: 1.3,
        }}
      >
        {speaker.name}
      </div>

      {/* Wattage badge */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: "9px",
          letterSpacing: "0.1em",
          color: "oklch(0.5 0.06 240)",
          fontFamily: "JetBrains Mono, Geist Mono, monospace",
          textTransform: "uppercase",
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: isDevialet
              ? "oklch(0.78 0.18 200)"
              : "oklch(0.55 0.06 240)",
            flexShrink: 0,
          }}
        />
        {speaker.wattage.toLocaleString()}W —{" "}
        {isDevialet ? "PREMIUM" : "BUDGET"}
      </div>

      {/* ── Live data rows ── */}
      {/* INPUT LEVEL dB */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: "JetBrains Mono, Geist Mono, monospace",
            fontSize: "9px",
            letterSpacing: "0.15em",
            color: "oklch(0.4 0.04 240)",
            textTransform: "uppercase",
          }}
        >
          INPUT LEVEL
        </span>
        <span
          style={{
            fontFamily: "JetBrains Mono, Geist Mono, monospace",
            fontSize: "13px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: isPlaying ? statusColor : "oklch(0.35 0.03 240)",
            textShadow: isPlaying
              ? `0 0 8px ${statusColor.replace(")", " / 0.6)").replace("oklch(", "oklch(")}`
              : "none",
            transition: "color 0.3s, text-shadow 0.3s",
          }}
        >
          {isPlaying ? `${Math.round(realDbLevel)} dBFS` : "-- dBFS"}
        </span>
      </div>

      {/* BASS LEVEL bar */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontFamily: "JetBrains Mono, Geist Mono, monospace",
              fontSize: "8px",
              letterSpacing: "0.15em",
              color: "oklch(0.4 0.04 240)",
              textTransform: "uppercase",
            }}
          >
            BASS LEVEL
          </span>
          <span
            style={{
              fontFamily: "JetBrains Mono, Geist Mono, monospace",
              fontSize: "9px",
              fontWeight: 700,
              color:
                isPlaying && bassLevel > 65
                  ? "oklch(0.82 0.22 45)"
                  : "oklch(0.5 0.05 240)",
            }}
          >
            {isPlaying ? `${Math.round(bassLevel)}%` : "—"}
          </span>
        </div>
        <div
          style={{
            width: "100%",
            height: 3,
            background: "oklch(0.18 0.02 260)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${isPlaying ? Math.min(bassLevel, 100) : 0}%`,
              height: "100%",
              background: bassHot
                ? "oklch(0.82 0.22 45)"
                : "oklch(0.62 0.15 200)",
              borderRadius: 2,
              transition: "width 0.1s ease",
            }}
          />
        </div>
      </div>

      {/* STABILIZER GR */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: "JetBrains Mono, Geist Mono, monospace",
            fontSize: "8px",
            letterSpacing: "0.15em",
            color: "oklch(0.4 0.04 240)",
            textTransform: "uppercase",
          }}
        >
          STAB GR
        </span>
        <span
          style={{
            fontFamily: "JetBrains Mono, Geist Mono, monospace",
            fontSize: "10px",
            fontWeight: 700,
            color:
              isPlaying && stabActive
                ? "oklch(0.78 0.18 55)"
                : "oklch(0.45 0.04 240)",
            textShadow:
              isPlaying && stabActive
                ? "0 0 6px oklch(0.78 0.18 55 / 0.5)"
                : "none",
          }}
        >
          {stabGrDisplay}
        </span>
      </div>

      {/* CAN HANDLE? verdict */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "5px 8px",
          borderRadius: 5,
          background:
            verdict === "YES — CLEAN"
              ? "oklch(0.78 0.22 145 / 0.08)"
              : verdict === "MODERATE"
                ? "oklch(0.82 0.22 45 / 0.08)"
                : "oklch(0.72 0.22 25 / 0.08)",
          border: `1px solid ${verdictColor.replace(")", " / 0.25)").replace("oklch(", "oklch(")}`,
        }}
      >
        <span
          style={{
            fontFamily: "JetBrains Mono, Geist Mono, monospace",
            fontSize: "8px",
            letterSpacing: "0.15em",
            color: "oklch(0.42 0.04 240)",
            textTransform: "uppercase",
          }}
        >
          CAN HANDLE?
        </span>
        <span
          style={{
            fontFamily: "JetBrains Mono, Geist Mono, monospace",
            fontSize: "8px",
            fontWeight: 700,
            letterSpacing: "0.1em",
            color: verdictColor,
            textTransform: "uppercase",
            textShadow: `0 0 6px ${verdictColor.replace(")", " / 0.4)").replace("oklch(", "oklch(")}`,
          }}
        >
          {verdict}
        </span>
      </div>

      {/* Health bar */}
      <div
        style={{
          width: "100%",
          height: 4,
          background: "oklch(0.18 0.02 260)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${healthPct}%`,
            height: "100%",
            background: barColor,
            borderRadius: 2,
            boxShadow: isPlaying ? `0 0 6px ${barColor}` : "none",
            transition: "width 0.1s ease, background 0.3s ease",
          }}
        />
      </div>

      {/* Status badge + BASS HOT */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "3px 8px",
            borderRadius: 4,
            background: statusBg,
            border: `1px solid ${statusColor.replace(")", " / 0.35)").replace("oklch(", "oklch(")}`,
          }}
        >
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: statusColor,
              boxShadow: `0 0 4px ${statusColor}`,
              animation:
                status !== "CLEAR" && isPlaying
                  ? "status-pulse 1s ease-in-out infinite"
                  : "none",
            }}
          />
          <span
            style={{
              fontFamily: "JetBrains Mono, Geist Mono, monospace",
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: statusColor,
              textTransform: "uppercase",
            }}
          >
            {status}
          </span>
        </div>

        {bassHot && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 7px",
              borderRadius: 4,
              background: "oklch(0.62 0.22 25 / 0.15)",
              border: "1px solid oklch(0.62 0.22 25 / 0.4)",
            }}
          >
            <span
              style={{
                fontFamily: "JetBrains Mono, Geist Mono, monospace",
                fontSize: "8px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: "oklch(0.72 0.22 30)",
                textTransform: "uppercase",
              }}
            >
              BASS HOT
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// NOW PLAYING panel at top of Speaker Lab
// ────────────────────────────────────────────────────────────
interface NowPlayingPanelProps {
  realDbLevel: number;
  bassLevel: number;
  gainReduction: number;
  isPlaying: boolean;
  smoothMode: boolean;
  bassAuthorityMode: boolean;
}

function NowPlayingPanel({
  realDbLevel,
  bassLevel,
  gainReduction,
  isPlaying,
  smoothMode,
  bassAuthorityMode,
}: NowPlayingPanelProps) {
  if (!isPlaying) return null;

  const dbColor =
    realDbLevel >= 115
      ? "oklch(0.62 0.22 25)"
      : realDbLevel >= 105
        ? "oklch(0.72 0.18 55)"
        : realDbLevel >= 90
          ? "oklch(0.82 0.22 45)"
          : "oklch(0.78 0.22 145)";

  const bassColor =
    bassLevel > 70 ? "oklch(0.82 0.22 45)" : "oklch(0.72 0.16 200)";

  return (
    <div
      style={{
        marginBottom: 20,
        padding: "12px 16px",
        borderRadius: 8,
        background:
          "linear-gradient(135deg, oklch(0.1 0.02 260) 0%, oklch(0.12 0.025 220) 100%)",
        border: "1px solid oklch(0.78 0.22 145 / 0.3)",
        boxShadow: "0 0 20px oklch(0.78 0.22 145 / 0.08)",
        display: "flex",
        alignItems: "center",
        gap: 20,
        flexWrap: "wrap",
      }}
    >
      {/* NOW PLAYING label */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "oklch(0.78 0.22 145)",
            boxShadow: "0 0 8px oklch(0.78 0.22 145 / 0.8)",
            animation: "live-pulse 0.9s ease-in-out infinite",
          }}
        />
        <span
          style={{
            fontFamily: "JetBrains Mono, Geist Mono, monospace",
            fontSize: "9px",
            fontWeight: 700,
            letterSpacing: "0.25em",
            color: "oklch(0.72 0.18 145)",
            textTransform: "uppercase",
          }}
        >
          NOW PLAYING
        </span>
      </div>

      {/* dB reading */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
        <span
          style={{
            fontFamily: "JetBrains Mono, Geist Mono, monospace",
            fontSize: "28px",
            fontWeight: 700,
            letterSpacing: "0.04em",
            color: dbColor,
            textShadow: `0 0 16px ${dbColor.replace(")", " / 0.6)").replace("oklch(", "oklch(")}`,
            lineHeight: 1,
            transition: "color 0.15s, text-shadow 0.15s",
          }}
        >
          {Math.round(realDbLevel)}
        </span>
        <span
          style={{
            fontFamily: "JetBrains Mono, Geist Mono, monospace",
            fontSize: "10px",
            color: "oklch(0.45 0.05 240)",
            letterSpacing: "0.1em",
          }}
        >
          dBFS
        </span>
      </div>

      {/* Bass % */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
        <span
          style={{
            fontFamily: "JetBrains Mono, Geist Mono, monospace",
            fontSize: "22px",
            fontWeight: 700,
            color: bassColor,
            textShadow: `0 0 10px ${bassColor.replace(")", " / 0.5)").replace("oklch(", "oklch(")}`,
            lineHeight: 1,
            transition: "color 0.15s",
          }}
        >
          {Math.round(bassLevel)}%
        </span>
        <span
          style={{
            fontFamily: "JetBrains Mono, Geist Mono, monospace",
            fontSize: "9px",
            color: "oklch(0.45 0.05 240)",
            letterSpacing: "0.1em",
          }}
        >
          BASS
        </span>
      </div>

      {/* STAB GR */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
        <span
          style={{
            fontFamily: "JetBrains Mono, Geist Mono, monospace",
            fontSize: "16px",
            fontWeight: 700,
            color:
              gainReduction > 3 ? "oklch(0.78 0.18 55)" : "oklch(0.5 0.05 240)",
            lineHeight: 1,
            transition: "color 0.15s",
          }}
        >
          -{gainReduction.toFixed(1)}
        </span>
        <span
          style={{
            fontFamily: "JetBrains Mono, Geist Mono, monospace",
            fontSize: "9px",
            color: "oklch(0.45 0.05 240)",
            letterSpacing: "0.1em",
          }}
        >
          dB GR
        </span>
      </div>

      {/* Mode badges */}
      <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
        {smoothMode && (
          <div
            style={{
              padding: "3px 8px",
              borderRadius: 4,
              background: "oklch(0.72 0.16 200 / 0.12)",
              border: "1px solid oklch(0.72 0.16 200 / 0.35)",
              fontFamily: "JetBrains Mono, Geist Mono, monospace",
              fontSize: "8px",
              letterSpacing: "0.12em",
              color: "oklch(0.72 0.16 200)",
              textTransform: "uppercase",
            }}
          >
            SMOOTH
          </div>
        )}
        {bassAuthorityMode && (
          <div
            style={{
              padding: "3px 8px",
              borderRadius: 4,
              background: "oklch(0.82 0.22 45 / 0.12)",
              border: "1px solid oklch(0.82 0.22 45 / 0.35)",
              fontFamily: "JetBrains Mono, Geist Mono, monospace",
              fontSize: "8px",
              letterSpacing: "0.12em",
              color: "oklch(0.82 0.22 45)",
              textTransform: "uppercase",
            }}
          >
            BASS AUTH
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// SpeakerLab root
// ────────────────────────────────────────────────────────────
export function SpeakerLab({
  realDbLevel,
  bassLevel,
  gainReduction,
  isPlaying,
  smoothMode,
  bassAuthorityMode,
}: SpeakerLabProps) {
  const signalNote = useMemo(() => {
    if (!isPlaying)
      return "Load a track on the DJ System page to see live signal analysis";
    if (smoothMode && bassAuthorityMode)
      return "SMOOTH + BASS AUTHORITY active — signal controlled";
    if (smoothMode)
      return "SMOOTH MODE active — harshness reduced at all volumes";
    if (bassAuthorityMode) return "BASS AUTHORITY active — deep bass locked in";
    return "Signal readings update in real time as you adjust your DJ system";
  }, [isPlaying, smoothMode, bassAuthorityMode]);

  return (
    <div
      data-ocid="speaker_lab.panel"
      style={{
        fontFamily: "JetBrains Mono, Geist Mono, monospace",
      }}
    >
      {/* Header */}
      <div
        style={{
          marginBottom: 16,
          paddingBottom: 14,
          borderBottom: "1px solid oklch(0.78 0.18 200 / 0.15)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "16px",
                fontWeight: 700,
                letterSpacing: "0.22em",
                color: "oklch(0.88 0.22 200)",
                textShadow:
                  "0 0 20px oklch(0.78 0.18 200 / 0.5), 0 0 40px oklch(0.78 0.18 200 / 0.25)",
                textTransform: "uppercase",
                margin: 0,
                lineHeight: 1,
              }}
            >
              SPEAKER LAB
            </h2>
            <div
              style={{
                fontSize: "9px",
                letterSpacing: "0.3em",
                color: "oklch(0.4 0.04 240)",
                textTransform: "uppercase",
                marginTop: 6,
              }}
            >
              LIVE SIGNAL ANALYSIS
            </div>
          </div>

          {/* Live indicator */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginLeft: "auto",
              padding: "5px 10px",
              borderRadius: 5,
              background: isPlaying
                ? "oklch(0.78 0.22 145 / 0.1)"
                : "oklch(0.15 0.02 260)",
              border: `1px solid ${isPlaying ? "oklch(0.78 0.22 145 / 0.35)" : "oklch(0.22 0.03 260)"}`,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: isPlaying
                  ? "oklch(0.78 0.22 145)"
                  : "oklch(0.3 0.03 240)",
                boxShadow: isPlaying ? "0 0 6px oklch(0.78 0.22 145)" : "none",
                animation: isPlaying
                  ? "live-pulse 1s ease-in-out infinite"
                  : "none",
              }}
            />
            <span
              style={{
                fontSize: "9px",
                letterSpacing: "0.15em",
                color: isPlaying
                  ? "oklch(0.72 0.18 145)"
                  : "oklch(0.35 0.03 240)",
                textTransform: "uppercase",
              }}
            >
              {isPlaying ? "LIVE" : "IDLE"}
            </span>
          </div>
        </div>

        {/* Signal note */}
        <div
          style={{
            marginTop: 10,
            fontSize: "9px",
            letterSpacing: "0.12em",
            color: "oklch(0.42 0.05 240)",
            textTransform: "uppercase",
          }}
        >
          {signalNote}
        </div>
      </div>

      {/* NOW PLAYING live readout panel */}
      <NowPlayingPanel
        realDbLevel={realDbLevel}
        bassLevel={bassLevel}
        gainReduction={gainReduction}
        isPlaying={isPlaying}
        smoothMode={smoothMode}
        bassAuthorityMode={bassAuthorityMode}
      />

      {/* Speaker cards grid — Gold Phantom centered, larger */}
      <div
        data-ocid="speaker.list"
        style={{
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: 480 }}>
          {SPEAKERS.map((speaker, i) => (
            <SpeakerCard
              key={speaker.name}
              speaker={speaker}
              realDbLevel={realDbLevel}
              bassLevel={bassLevel}
              gainReduction={gainReduction}
              isPlaying={isPlaying}
              smoothMode={smoothMode}
              bassAuthorityMode={bassAuthorityMode}
              index={i}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes live-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes status-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes heartbeat-ring {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
          50% { transform: translate(-50%, -50%) scale(1.15); opacity: 0.25; }
        }
        @keyframes onn-ring-pulse {
          0%, 100% { opacity: 0.9; }
          50% { opacity: 0.45; }
        }
        @keyframes mania-rotate {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes mania-arc-pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.3); opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}
