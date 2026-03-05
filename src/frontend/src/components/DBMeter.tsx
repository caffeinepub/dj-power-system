import { useEffect, useRef, useState } from "react";

export type DbControlCommand = "green-hold" | "pull-back" | "emergency-clamp";

interface DBMeterProps {
  dbLevel: number;
  isPlaying: boolean;
  gainReduction: number;
  dbControlCommand?: DbControlCommand;
}

const DB_MIN = -80;
const DB_MAX = 0;
const DB_RANGE = DB_MAX - DB_MIN;

function getSegmentColor(db: number, controlled: boolean): string {
  if (controlled) return "oklch(0.72 0.22 145)"; // always green when chip commands it
  if (db >= -6) return "oklch(0.62 0.22 25)"; // red — clip zone (near 0 dBFS)
  if (db >= -18) return "oklch(0.82 0.2 95)"; // yellow — hot
  return "oklch(0.72 0.22 145)"; // green — safe
}

function SegmentBar({
  db,
  peakDb,
  offset = 0,
  controlled,
}: {
  db: number;
  peakDb: number;
  offset?: number;
  controlled: boolean;
}) {
  const totalSegments = 30;
  const activeSegments = Math.round(((db - DB_MIN) / DB_RANGE) * totalSegments);
  const peakSegment = Math.round(
    ((peakDb - DB_MIN) / DB_RANGE) * totalSegments,
  );

  return (
    <div className="flex flex-col-reverse gap-0.5 flex-1">
      {Array.from({ length: totalSegments }, (_, segIdx) => {
        const segDb = DB_MIN + (segIdx / (totalSegments - 1)) * DB_RANGE;
        const isActive = segIdx < activeSegments;
        const isPeak = segIdx === peakSegment && peakDb > DB_MIN + 1;
        const color = getSegmentColor(segDb, controlled);
        const segDbKey = (segDb + offset).toFixed(1);

        return (
          <div
            key={`seg-${segDbKey}`}
            style={{
              height: 5,
              borderRadius: 1,
              background: isPeak
                ? color
                : isActive
                  ? color
                  : "oklch(0.12 0.015 260)",
              boxShadow:
                isActive || isPeak
                  ? `0 0 4px ${color.replace(")", " / 0.6)")}`
                  : "none",
              border: `1px solid ${isActive || isPeak ? color.replace(")", " / 0.3)") : "oklch(0.18 0.02 260)"}`,
              opacity: isPeak ? 1 : isActive ? 0.85 : 0.3,
              transition: "background 0.05s ease, box-shadow 0.05s ease",
            }}
          />
        );
      })}
    </div>
  );
}

export function DBMeter({
  dbLevel,
  isPlaying,
  gainReduction,
  dbControlCommand = "green-hold",
}: DBMeterProps) {
  const peakRef = useRef(DB_MIN);
  const [peakDisplay, setPeakDisplay] = useState(DB_MIN);

  // Update peak when dbLevel rises
  useEffect(() => {
    if (dbLevel > peakRef.current) {
      peakRef.current = dbLevel;
      setPeakDisplay(dbLevel);
    }
  }, [dbLevel]);

  // Reset peak when stopped
  useEffect(() => {
    if (!isPlaying) {
      peakRef.current = DB_MIN;
      setPeakDisplay(DB_MIN);
    }
  }, [isPlaying]);

  // Peak hold decay — 0.3 dB per 100ms
  useEffect(() => {
    const id = setInterval(() => {
      if (peakRef.current > DB_MIN) {
        peakRef.current = Math.max(DB_MIN, peakRef.current - 0.3);
        setPeakDisplay(peakRef.current);
      }
    }, 100);
    return () => clearInterval(id);
  }, []);

  const displayDb = Math.round(dbLevel);
  const peakDb = Math.round(peakDisplay);

  // Power number: map raw dBFS (-80 to 0) → 0–120 display scale
  // -80 dBFS = 0 PWR, 0 dBFS = 120 PWR
  const displayPower = isPlaying
    ? Math.min(120, Math.max(0, Math.round(((dbLevel + 80) / 80) * 120)))
    : null;

  // Commander is actively managing the signal — meter stays green whenever playing
  const isControlled =
    isPlaying &&
    (dbControlCommand === "green-hold" ||
      dbControlCommand === "pull-back" ||
      dbControlCommand === "emergency-clamp");

  const dbColor = isControlled
    ? "oklch(0.72 0.22 145)"
    : displayDb >= -6
      ? "oklch(0.62 0.22 25)"
      : displayDb >= -18
        ? "oklch(0.82 0.2 95)"
        : "oklch(0.72 0.22 145)";

  // Slightly offset second channel for stereo feel
  const dbLevelR = Math.max(DB_MIN, dbLevel - 1.5);
  // Format dBFS with sign for display
  const dbFsLabel = isPlaying
    ? displayDb >= 0
      ? `+${displayDb}`
      : `${displayDb}`
    : "--";

  // Zone label text — chip can override to show SAFE — CTRL
  const zoneLabel = !isPlaying
    ? "● STANDBY"
    : isControlled
      ? "● SAFE — CTRL"
      : displayDb >= -6
        ? "⚠ CLIP ZONE"
        : displayDb >= -18
          ? "● HOT"
          : "● SAFE";

  const zoneLabelColor = isControlled
    ? "oklch(0.55 0.15 145)"
    : !isPlaying
      ? "oklch(0.35 0.02 240)"
      : displayDb >= -6
        ? "oklch(0.72 0.22 25)"
        : displayDb >= -18
          ? "oklch(0.82 0.2 95)"
          : "oklch(0.55 0.15 145)";

  return (
    <div
      data-ocid="dbmeter.panel"
      className={`glass-panel rounded-xl pt-3 pb-6 px-4 relative overflow-hidden flex flex-col ${isPlaying ? "glass-panel-active" : ""}`}
      style={{ minHeight: 400 }}
    >
      {/* Header */}
      <div className="text-center mb-3">
        <h2
          className="font-mono text-xs tracking-[0.3em] font-bold uppercase"
          style={{ color: "oklch(0.55 0.04 220)" }}
        >
          dB METER
        </h2>
        <div
          className="font-mono text-[8px] tracking-widest mt-0.5"
          style={{ color: "oklch(0.4 0.06 180)" }}
        >
          REAL AUDIO ANALYSIS
        </div>
        <div
          className="font-mono text-[7px] tracking-wider mt-0.5"
          style={{ color: "oklch(0.35 0.04 200)" }}
        >
          WEB AUDIO API
        </div>
        <div
          className="font-mono text-[10px] tracking-widest mt-1"
          style={{
            color: isPlaying ? "oklch(0.72 0.22 145)" : "oklch(0.35 0.02 240)",
          }}
        >
          {isPlaying ? "● MONITORING" : "○ IDLE"}
        </div>
      </div>

      {/* TRUE SIGNAL live display */}
      <div
        className="mb-3 text-center rounded-lg py-2 px-1"
        style={{
          background: "oklch(0.07 0.01 260)",
          border: `1px solid ${isPlaying ? `${dbColor}40` : "oklch(0.18 0.02 260)"}`,
        }}
      >
        <div
          className="font-mono text-[8px] tracking-[0.25em] uppercase mb-1"
          style={{ color: "oklch(0.4 0.06 180)" }}
        >
          SYS POWER
        </div>
        {/* Main readout: power number (0–120 scale) */}
        <div
          data-ocid="dbmeter.chart_point"
          className={`font-mono text-3xl font-bold tracking-widest ${isPlaying ? "animate-db-flicker" : ""}`}
          style={{
            color: dbColor,
            textShadow: isPlaying
              ? `0 0 10px ${dbColor}, 0 0 20px ${dbColor.replace(")", " / 0.4)")}`
              : "none",
            transition: "color 0.1s ease",
            lineHeight: 1,
          }}
        >
          {displayPower !== null ? displayPower : "--"}
        </div>
        <div
          className="font-mono text-[10px] tracking-widest mt-0.5"
          style={{ color: "oklch(0.72 0.22 145)" }}
        >
          PWR
        </div>
        {/* Sub-label: raw dBFS — honest signal level */}
        <div
          className="font-mono text-[8px] tracking-widest mt-1 tabular-nums"
          style={{ color: "oklch(0.38 0.04 220)" }}
        >
          {isPlaying ? `${dbFsLabel} dBFS` : "-- dBFS"}
        </div>

        {/* CTRL override indicator */}
        {isControlled && (
          <div
            className="font-mono text-[8px] tracking-widest mt-1"
            style={{
              color: "oklch(0.88 0.25 145)",
              textShadow: "0 0 8px oklch(0.72 0.22 145 / 0.7)",
            }}
          >
            CMDR: GREEN LOCKED
          </div>
        )}
      </div>

      {/* Main display */}
      <div className="flex gap-3 flex-1">
        {/* Scale labels */}
        <div
          className="flex flex-col justify-between py-0.5"
          style={{ minWidth: 32 }}
        >
          {[0, -12, -24, -36, -48, -60, -80].map((db) => (
            <div
              key={db}
              className="font-mono text-[9px] text-right"
              style={{
                color: isControlled
                  ? "oklch(0.55 0.05 145 / 0.7)"
                  : db >= -6
                    ? "oklch(0.62 0.22 25 / 0.7)"
                    : db >= -18
                      ? "oklch(0.82 0.2 95 / 0.7)"
                      : "oklch(0.55 0.05 220 / 0.7)",
              }}
            >
              {db}
            </div>
          ))}
        </div>

        {/* Meter bars — dual channel (L + R) */}
        <div className="flex gap-1.5 flex-1">
          <SegmentBar
            db={dbLevel}
            peakDb={peakDisplay}
            offset={0}
            controlled={isControlled}
          />
          <SegmentBar
            db={dbLevelR}
            peakDb={Math.max(DB_MIN, peakDisplay - 1)}
            offset={0.5}
            controlled={isControlled}
          />
        </div>

        {/* Color zone indicator */}
        <div
          className="flex flex-col justify-between py-0.5"
          style={{ width: 6 }}
        >
          <div
            className="rounded-sm flex-1"
            style={{
              background: isControlled
                ? "linear-gradient(to bottom, oklch(0.72 0.22 145 / 0.4), oklch(0.72 0.22 145 / 0.1))"
                : "linear-gradient(to bottom, oklch(0.62 0.22 25 / 0.4), oklch(0.62 0.22 25 / 0.1))",
              height: "33%",
            }}
          />
          <div
            className="rounded-sm"
            style={{
              background: isControlled
                ? "linear-gradient(to bottom, oklch(0.72 0.22 145 / 0.35), oklch(0.72 0.22 145 / 0.1))"
                : "linear-gradient(to bottom, oklch(0.82 0.2 95 / 0.4), oklch(0.82 0.2 95 / 0.1))",
              height: "25%",
            }}
          />
          <div
            className="rounded-sm"
            style={{
              background:
                "linear-gradient(to bottom, oklch(0.72 0.22 145 / 0.4), oklch(0.72 0.22 145 / 0.1))",
              height: "42%",
            }}
          />
        </div>
      </div>

      {/* Peak readout */}
      <div className="mt-3 text-center">
        <div
          className="font-mono text-[9px] tracking-widest"
          style={{ color: "oklch(0.4 0.03 240)" }}
        >
          PEAK:{" "}
          <span
            style={{
              color: isPlaying
                ? isControlled
                  ? "oklch(0.72 0.22 145)"
                  : getSegmentColor(peakDisplay, false)
                : "oklch(0.35 0.02 240)",
            }}
          >
            {isPlaying ? (peakDb >= 0 ? `+${peakDb}` : `${peakDb}`) : "--"}
          </span>{" "}
          dBFS
        </div>

        {/* Zone indicator */}
        <div
          className="mt-1 font-mono text-[9px] tracking-widest"
          style={{ color: zoneLabelColor }}
        >
          {zoneLabel}
        </div>

        {/* Stabilizer gain reduction readout */}
        <div
          className="mt-1 font-mono text-[8px] tracking-widest text-center"
          style={{
            color:
              isPlaying && gainReduction > 0.5
                ? "oklch(0.72 0.22 145)"
                : "oklch(0.35 0.03 240)",
          }}
        >
          {isPlaying && gainReduction > 0.5
            ? `⚡ STAB -${gainReduction.toFixed(1)}dB`
            : isPlaying
              ? "✓ STAB CLEAN"
              : "STAB 17000W"}
        </div>
      </div>

      {/* Ambient glow */}
      {isPlaying && (
        <div
          className="absolute inset-0 pointer-events-none rounded-xl"
          style={{
            background:
              "radial-gradient(ellipse at 50% 30%, oklch(0.72 0.22 145 / 0.05) 0%, transparent 70%)",
          }}
        />
      )}
    </div>
  );
}
