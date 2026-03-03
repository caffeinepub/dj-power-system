import { useCallback, useEffect, useRef, useState } from "react";

interface FilePickerProps {
  audioFile: File | null;
  isPlaying: boolean;
  isUnlocked: boolean;
  onFileSelect: (file: File) => void;
  onPlayPause: () => void;
  onStop: () => void;
  onAudioElementReady?: (el: HTMLAudioElement) => void;
}

function BlurayIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      role="img"
    >
      {/* Outer disc */}
      <circle
        cx="40"
        cy="40"
        r="36"
        fill="url(#disc-grad)"
        stroke="oklch(0.78 0.18 200 / 0.5)"
        strokeWidth="1"
      />
      {/* Concentric rings */}
      {[30, 24, 18, 12, 6].map((r, idx) => (
        <circle
          key={r}
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke={`oklch(${0.5 + idx * 0.06} ${0.15 + idx * 0.02} ${180 + idx * 20} / ${0.4 + idx * 0.1})`}
          strokeWidth="0.5"
        />
      ))}
      {/* Center hole */}
      <circle cx="40" cy="40" r="5" fill="oklch(0.08 0.008 260)" />
      <circle
        cx="40"
        cy="40"
        r="5"
        fill="none"
        stroke="oklch(0.78 0.18 200 / 0.4)"
        strokeWidth="1"
      />

      <defs>
        <radialGradient id="disc-grad" cx="35%" cy="35%" r="60%">
          <stop offset="0%" stopColor="oklch(0.25 0.06 240)" />
          <stop offset="30%" stopColor="oklch(0.18 0.04 260)" />
          <stop offset="60%" stopColor="oklch(0.15 0.05 290)" />
          <stop offset="100%" stopColor="oklch(0.12 0.03 220)" />
        </radialGradient>
      </defs>
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      role="img"
    >
      <polygon points="3,2 13,8 3,14" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      role="img"
    >
      <rect x="3" y="2" width="4" height="12" rx="1" />
      <rect x="9" y="2" width="4" height="12" rx="1" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="currentColor"
      aria-hidden="true"
      role="img"
    >
      <rect x="2" y="2" width="10" height="10" rx="1" />
    </svg>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function FilePicker({
  audioFile,
  isPlaying,
  isUnlocked,
  onFileSelect,
  onPlayPause,
  onStop,
  onAudioElementReady,
}: FilePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Create audio element when file changes
  useEffect(() => {
    if (audioFile) {
      // Cleanup previous
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }

      const url = URL.createObjectURL(audioFile);
      objectUrlRef.current = url;
      const audio = new Audio(url);
      // Allow CORS for Web Audio API analysis
      audio.crossOrigin = "anonymous";
      audioRef.current = audio;
      setCurrentTime(0);
      setDuration(0);

      audio.addEventListener("loadedmetadata", () => {
        setDuration(audio.duration);
        // Notify parent so it can wire the Web Audio graph
        if (onAudioElementReady) {
          onAudioElementReady(audio);
        }
      });
      audio.addEventListener("timeupdate", () => {
        setCurrentTime(audio.currentTime);
      });
      audio.addEventListener("ended", () => {
        onStop();
        setCurrentTime(0);
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [audioFile, onStop, onAudioElementReady]);

  // Sync play/pause state
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => {
        onStop();
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, onStop]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file);
        // Reset input so same file can be re-selected
        e.target.value = "";
      }
    },
    [onFileSelect],
  );

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number.parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const truncateFilename = (name: string, maxLen = 28) => {
    if (name.length <= maxLen) return name;
    const ext = name.lastIndexOf(".");
    const base = name.slice(0, ext);
    const extension = name.slice(ext);
    return `${base.slice(0, maxLen - extension.length - 3)}...${extension}`;
  };

  const handlePickerHoverEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    (e.currentTarget as HTMLButtonElement).style.background =
      "oklch(0.15 0.03 220)";
    (e.currentTarget as HTMLButtonElement).style.boxShadow =
      "0 0 15px oklch(0.78 0.18 200 / 0.3)";
  };

  const handlePickerHoverLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    (e.currentTarget as HTMLButtonElement).style.background =
      "oklch(0.12 0.025 240)";
    (e.currentTarget as HTMLButtonElement).style.boxShadow =
      "0 0 10px oklch(0.78 0.18 200 / 0.1)";
  };

  return (
    <div
      className={`glass-panel rounded-xl p-6 relative overflow-hidden ${isPlaying ? "glass-panel-active" : ""}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2
            className="font-mono text-xs tracking-[0.3em] font-bold uppercase"
            style={{ color: "oklch(0.55 0.04 220)" }}
          >
            MEDIA PLAYER
          </h2>
          <div
            className="font-mono text-[10px] tracking-widest mt-0.5"
            style={{
              color: isPlaying
                ? "oklch(0.78 0.18 200)"
                : audioFile
                  ? "oklch(0.55 0.04 220)"
                  : "oklch(0.35 0.02 240)",
            }}
          >
            {isPlaying ? "● PLAYING" : audioFile ? "● LOADED" : "○ NO TRACK"}
          </div>
        </div>

        {/* Spinning disc when playing */}
        <div
          className="relative"
          style={{
            width: 44,
            height: 44,
            filter: isPlaying
              ? "drop-shadow(0 0 6px oklch(0.78 0.18 200 / 0.6))"
              : "opacity(0.5)",
          }}
        >
          <BlurayIcon
            className={`w-full h-full ${isPlaying ? "animate-spin-slow" : ""}`}
          />
        </div>
      </div>

      {/* File picker button */}
      <div className="flex items-center gap-3 mb-5">
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileChange}
          aria-label="Select audio file"
        />

        <button
          data-ocid="filepicker.upload_button"
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-bold tracking-widest transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{
            background: "oklch(0.12 0.025 240)",
            border: "1px solid oklch(0.78 0.18 200 / 0.4)",
            color: "oklch(0.78 0.18 200)",
            boxShadow: "0 0 10px oklch(0.78 0.18 200 / 0.1)",
          }}
          onMouseEnter={handlePickerHoverEnter}
          onMouseLeave={handlePickerHoverLeave}
        >
          {/* Mini disc icon */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            role="img"
          >
            <circle
              cx="8"
              cy="8"
              r="7"
              fill="oklch(0.18 0.04 240)"
              stroke="oklch(0.78 0.18 200 / 0.6)"
              strokeWidth="1"
            />
            <circle
              cx="8"
              cy="8"
              r="5"
              fill="none"
              stroke="oklch(0.78 0.18 200 / 0.3)"
              strokeWidth="0.5"
            />
            <circle
              cx="8"
              cy="8"
              r="3"
              fill="none"
              stroke="oklch(0.78 0.18 200 / 0.2)"
              strokeWidth="0.5"
            />
            <circle
              cx="8"
              cy="8"
              r="1.5"
              fill="oklch(0.08 0.008 260)"
              stroke="oklch(0.78 0.18 200 / 0.5)"
              strokeWidth="0.5"
            />
          </svg>
          LOAD TRACK
        </button>

        {/* Filename display */}
        {audioFile ? (
          <div
            className="flex-1 font-mono text-[10px] tracking-wide truncate"
            style={{ color: "oklch(0.65 0.05 220)" }}
            title={audioFile.name}
          >
            {truncateFilename(audioFile.name)}
          </div>
        ) : (
          <div
            className="flex-1 font-mono text-[10px] tracking-widest"
            style={{ color: "oklch(0.3 0.02 240)" }}
          >
            NO TRACK LOADED
          </div>
        )}
      </div>

      {/* Playback controls */}
      <div className="flex flex-col gap-3">
        {/* Seek bar */}
        {audioFile && duration > 0 && (
          <div className="flex items-center gap-3">
            <span
              className="font-mono text-[10px] tabular-nums"
              style={{ color: "oklch(0.45 0.03 240)", minWidth: 32 }}
            >
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="seek-bar flex-1"
              style={{
                accentColor: "oklch(0.78 0.18 200)",
              }}
              aria-label="Seek position"
            />
            <span
              className="font-mono text-[10px] tabular-nums"
              style={{
                color: "oklch(0.45 0.03 240)",
                minWidth: 32,
                textAlign: "right",
              }}
            >
              {formatTime(duration)}
            </span>
          </div>
        )}

        {/* Play/Pause/Stop controls */}
        <div className="flex items-center gap-3">
          {!isUnlocked ? (
            <div
              className="flex-1 text-center font-mono text-[10px] tracking-widest py-2 rounded-lg"
              style={{
                background: "oklch(0.12 0.015 260)",
                border: "1px solid oklch(0.22 0.04 240)",
                color: "oklch(0.35 0.02 240)",
              }}
            >
              🔒 UNLOCK SYSTEM TO PLAY
            </div>
          ) : (
            <>
              <button
                data-ocid="player.toggle"
                type="button"
                onClick={onPlayPause}
                disabled={!audioFile}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="flex items-center justify-center gap-2 flex-1 py-2.5 rounded-lg font-mono text-xs font-bold tracking-widest transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: isPlaying
                    ? "oklch(0.72 0.2 45 / 0.15)"
                    : "oklch(0.78 0.18 200 / 0.15)",
                  border: `1px solid ${isPlaying ? "oklch(0.72 0.2 45 / 0.5)" : "oklch(0.78 0.18 200 / 0.5)"}`,
                  color: isPlaying
                    ? "oklch(0.82 0.22 45)"
                    : "oklch(0.78 0.18 200)",
                  boxShadow: isPlaying
                    ? "0 0 12px oklch(0.72 0.2 45 / 0.2)"
                    : "0 0 12px oklch(0.78 0.18 200 / 0.2)",
                }}
              >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
                {isPlaying ? "PAUSE" : "PLAY"}
              </button>

              <button
                data-ocid="player.secondary_button"
                type="button"
                onClick={onStop}
                disabled={!audioFile || !isPlaying}
                aria-label="Stop"
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-mono text-xs font-bold tracking-widest transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "oklch(0.62 0.22 25 / 0.1)",
                  border: "1px solid oklch(0.62 0.22 25 / 0.4)",
                  color: "oklch(0.72 0.22 25)",
                  boxShadow: "0 0 8px oklch(0.62 0.22 25 / 0.1)",
                }}
              >
                <StopIcon />
                STOP
              </button>
            </>
          )}
        </div>
      </div>

      {/* Waveform decoration when playing */}
      {isPlaying && (
        <div className="mt-4 flex items-center gap-0.5 h-8 justify-center">
          {(
            [
              0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
              19, 20, 21, 22, 23,
            ] as const
          ).map((waveIdx) => (
            <div
              key={`wave-bar-${waveIdx}`}
              className="rounded-full"
              style={{
                width: 3,
                height: `${20 + Math.sin(waveIdx * 0.8) * 15 + ((waveIdx * 7) % 11)}px`,
                background: `oklch(0.78 0.18 200 / ${0.4 + Math.sin(waveIdx * 0.5) * 0.3})`,
                animation: `engine-hum ${0.3 + (waveIdx % 5) * 0.1}s ease-in-out infinite`,
                animationDelay: `${waveIdx * 0.04}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
