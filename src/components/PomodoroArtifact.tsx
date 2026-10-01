import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, SkipForward, CheckCircle2, Volume2, VolumeX, X, Flame } from "lucide-react";
import { playChime } from "../utils/audio";
import { addPomodoroLog } from "../lib/pomodoroService";

interface PomodoroArtifactProps {
  taskName: string;
  taskId?: number | null;
  initialMinutes?: number;
  onCompleteTask?: (taskId: number | null, taskName: string) => void;
  onClose?: () => void;
}

type Mode = "work" | "shortBreak" | "longBreak";

export default function PomodoroArtifact({
  taskName,
  taskId,
  initialMinutes = 25,
  onCompleteTask,
  onClose,
}: PomodoroArtifactProps) {
  const [workDuration, setWorkDuration] = useState(initialMinutes * 60);
  const shortBreakDuration = 5 * 60;
  const longBreakDuration = 15 * 60;

  const [mode, setMode] = useState<Mode>("work");
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedCycles, setCompletedCycles] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Update if initialMinutes prop changes
  useEffect(() => {
    const secs = initialMinutes * 60;
    setWorkDuration(secs);
    if (mode === "work" && !isRunning) {
      setTimeLeft(secs);
    }
  }, [initialMinutes]);

  // Main countdown loop
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode, completedCycles]);

  const handleTimerComplete = () => {
    if (soundEnabled) {
      playChime(mode === "work" ? "work_done" : "break_done");
    }

    // Emit event so work music player can stop music if configured
    try {
      window.dispatchEvent(
        new CustomEvent("pomodoro-alarm-fired", {
          detail: { mode, completedCycles },
        })
      );
    } catch (_) {}

    if (mode === "work") {
      try {
        addPomodoroLog({
          taskId: taskId ?? null,
          taskName: taskName || "Sesión de Enfoque",
          durationMinutes: Math.round(workDuration / 60) || 25,
          mode: "work",
        });
      } catch (_) {}

      const nextCount = completedCycles + 1;
      setCompletedCycles(nextCount);
      if (nextCount % 4 === 0) {
        setMode("longBreak");
        setTimeLeft(longBreakDuration);
      } else {
        setMode("shortBreak");
        setTimeLeft(shortBreakDuration);
      }
    } else {
      setMode("work");
      setTimeLeft(workDuration);
    }
    setIsRunning(false);
  };

  const toggleStartPause = () => {
    if (!isRunning && soundEnabled) {
      playChime("tick");
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    if (mode === "work") setTimeLeft(workDuration);
    else if (mode === "shortBreak") setTimeLeft(shortBreakDuration);
    else setTimeLeft(longBreakDuration);
  };

  const skipBlock = () => {
    setIsRunning(false);
    if (mode === "work") {
      const nextCount = completedCycles + 1;
      setCompletedCycles(nextCount);
      if (nextCount % 4 === 0) {
        setMode("longBreak");
        setTimeLeft(longBreakDuration);
      } else {
        setMode("shortBreak");
        setTimeLeft(shortBreakDuration);
      }
    } else {
      setMode("work");
      setTimeLeft(workDuration);
    }
  };

  const switchMode = (newMode: Mode) => {
    setIsRunning(false);
    setMode(newMode);
    if (newMode === "work") setTimeLeft(workDuration);
    else if (newMode === "shortBreak") setTimeLeft(shortBreakDuration);
    else setTimeLeft(longBreakDuration);
  };

  // Format mm:ss
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // Progress percentage
  const totalForCurrentMode =
    mode === "work" ? workDuration : mode === "shortBreak" ? shortBreakDuration : longBreakDuration;
  const progressRatio = (totalForCurrentMode - timeLeft) / totalForCurrentMode;
  const strokeDashoffset = 283 - 283 * progressRatio; // 2 * PI * 45 ≈ 283

  const modeTheme = {
    work: {
      badge: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800",
      stroke: "#d97706",
      label: "Enfoque Profundo",
      bgGradient: "from-amber-500/10 via-background to-transparent",
    },
    shortBreak: {
      badge: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800",
      stroke: "#059669",
      label: "Descanso Corto (5m)",
      bgGradient: "from-emerald-500/10 via-background to-transparent",
    },
    longBreak: {
      badge: "bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/60 dark:text-sky-200 dark:border-sky-800",
      stroke: "#0284c7",
      label: "Descanso Largo (15m)",
      bgGradient: "from-sky-500/10 via-background to-transparent",
    },
  }[mode];

  return (
    <div
      id="pomodoro-artifact-container"
      className="relative w-full rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-900 text-stone-100 shadow-xl overflow-hidden p-5 sm:p-6 transition-all duration-300"
    >
      {/* Background ambient subtle glow */}
      <div
        className={`absolute inset-0 bg-gradient-to-b ${modeTheme.bgGradient} pointer-events-none opacity-40`}
      />

      {/* Header bar: Mode pill + Audio + Close */}
      <div className="relative flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-stone-800/80 border border-stone-700/60 text-xs">
          <button
            id="pomodoro-mode-work"
            onClick={() => switchMode("work")}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              mode === "work"
                ? "bg-amber-500 text-stone-950 shadow-sm font-semibold"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            Enfoque ({Math.round(workDuration / 60)}m)
          </button>
          <button
            id="pomodoro-mode-short"
            onClick={() => switchMode("shortBreak")}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              mode === "shortBreak"
                ? "bg-emerald-500 text-stone-950 shadow-sm font-semibold"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            Pausa (5m)
          </button>
          <button
            id="pomodoro-mode-long"
            onClick={() => switchMode("longBreak")}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              mode === "longBreak"
                ? "bg-sky-500 text-stone-950 shadow-sm font-semibold"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            Largo (15m)
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="pomodoro-sound-toggle"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
            title={soundEnabled ? "Silenciar sonido" : "Activar sonido"}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          {onClose && (
            <button
              id="pomodoro-close-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
              title="Ocultar temporizador"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Task in focus display */}
      <div className="relative text-center mb-5 px-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-stone-800 border border-stone-700 text-amber-400 mb-1.5">
          <Flame size={12} className="animate-pulse" />
          Tarea en Foco
        </div>
        <h3
          id="pomodoro-task-name"
          className="text-base sm:text-lg font-semibold text-stone-100 max-w-md mx-auto line-clamp-2 tracking-tight"
        >
          {taskName || "Sesión de Enfoque Principal"}
        </h3>
      </div>

      {/* Central Circular Progress Clock */}
      <div className="relative flex flex-col items-center justify-center my-3">
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
            {/* Background track */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="transparent"
              stroke="#292524"
              strokeWidth="5"
            />
            {/* Animated progress ring */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="transparent"
              stroke={modeTheme.stroke}
              strokeWidth="5.5"
              strokeDasharray="283"
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-linear"
            />
          </svg>

          {/* Time digits */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span
              id="pomodoro-timer-digits"
              className="font-mono text-5xl sm:text-6xl font-bold tracking-tighter text-stone-50 select-none"
            >
              {timeFormatted}
            </span>
            <span className="text-xs uppercase tracking-widest text-stone-400 mt-1 font-medium">
              {modeTheme.label}
            </span>
          </div>
        </div>
      </div>

      {/* Main Controls: Start/Pause, Reset, Skip */}
      <div className="relative flex items-center justify-center gap-3 sm:gap-4 mt-4">
        <button
          id="pomodoro-reset-btn"
          onClick={resetTimer}
          className="p-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-stone-100 transition-all border border-stone-700 active:scale-95"
          title="Reiniciar bloque"
        >
          <RotateCcw size={18} />
        </button>

        <button
          id="pomodoro-start-pause-btn"
          onClick={toggleStartPause}
          className={`flex items-center justify-center gap-2 px-7 py-3 rounded-xl font-semibold text-stone-950 transition-all shadow-lg active:scale-95 text-base sm:text-lg ${
            isRunning
              ? "bg-amber-400 hover:bg-amber-300"
              : "bg-emerald-400 hover:bg-emerald-300"
          }`}
        >
          {isRunning ? (
            <>
              <Pause size={20} className="fill-current" />
              Pausar
            </>
          ) : (
            <>
              <Play size={20} className="fill-current ml-0.5" />
              {timeLeft < totalForCurrentMode ? "Reanudar" : "Iniciar"}
            </>
          )}
        </button>

        <button
          id="pomodoro-skip-btn"
          onClick={skipBlock}
          className="p-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-stone-100 transition-all border border-stone-700 active:scale-95"
          title="Saltar al siguiente bloque"
        >
          <SkipForward size={18} />
        </button>
      </div>

      {/* Bottom status bar: Cycles completed & 1-tap Task Completion */}
      <div className="relative flex flex-wrap items-center justify-between gap-3 mt-6 pt-4 border-t border-stone-800 text-xs text-stone-400">
        <div className="flex items-center gap-2">
          <span>Ciclos completados:</span>
          <div className="flex items-center gap-1">
            {[...Array(4)].map((_, i) => (
              <span
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  i < completedCycles % 4
                    ? "bg-amber-400 shadow-sm"
                    : "bg-stone-800 border border-stone-700"
                }`}
              />
            ))}
          </div>
          <span className="font-semibold text-stone-200 ml-1">
            {completedCycles} total
          </span>
        </div>

        {onCompleteTask && (
          <button
            id="pomodoro-complete-task-btn"
            onClick={() => onCompleteTask(taskId ?? null, taskName)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 border border-emerald-800/80 transition-all active:scale-95 font-medium"
          >
            <CheckCircle2 size={14} />
            Marcar tarea como completada (Ley 15)
          </button>
        )}
      </div>
    </div>
  );
}
