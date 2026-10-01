import { PomodoroLogEntry, TaskItem } from "../types";

export const STORAGE_KEY_POMODORO_LOGS = "task_os_pomodoro_logs_v1";

// Helper to format date as YYYY-MM-DD in local time
export function formatDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Initial realistic baseline logs for the current work cycle (September 2026)
const INITIAL_BASELINE_LOGS: PomodoroLogEntry[] = [
  {
    id: "pomo-seed-1",
    taskId: 3,
    taskName: "Revisar el panel de administración de FGDLL e incluir opción de eliminar centros",
    durationMinutes: 25,
    completedAt: "2026-09-28T10:30:00.000Z",
    date: "2026-09-28",
    mode: "work",
    category: "Tecnología",
  },
  {
    id: "pomo-seed-2",
    taskId: 3,
    taskName: "Depuración de rutas y endpoints de centros en el servidor",
    durationMinutes: 25,
    completedAt: "2026-09-28T11:15:00.000Z",
    date: "2026-09-28",
    mode: "work",
    category: "Tecnología",
  },
  {
    id: "pomo-seed-3",
    taskId: 4,
    taskName: "Revisar lista de diplomas y reconocimientos de graduación",
    durationMinutes: 25,
    completedAt: "2026-09-28T16:20:00.000Z",
    date: "2026-09-28",
    mode: "work",
    category: "Laura",
  },
  {
    id: "pomo-seed-4",
    taskId: 4,
    taskName: "Verificación de ortografía y nombres de 45 graduados con acta",
    durationMinutes: 25,
    completedAt: "2026-09-28T17:00:00.000Z",
    date: "2026-09-28",
    mode: "work",
    category: "Laura",
  },
  {
    id: "pomo-seed-5",
    taskId: 5,
    taskName: "Aprobación de temario y programa del nuevo diplomado",
    durationMinutes: 25,
    completedAt: "2026-09-29T09:40:00.000Z",
    date: "2026-09-29",
    mode: "work",
    category: "Universidad",
  },
  {
    id: "pomo-seed-6",
    taskId: 1,
    taskName: "Diseño y especificación de lona 3x2m para evento Zona Tiburón",
    durationMinutes: 25,
    completedAt: "2026-09-29T11:00:00.000Z",
    date: "2026-09-29",
    mode: "work",
    category: "Diseño",
  },
  {
    id: "pomo-seed-7",
    taskId: 1,
    taskName: "Ajuste de perfiles Fogra39 y sangrías para imprenta",
    durationMinutes: 25,
    completedAt: "2026-09-29T11:45:00.000Z",
    date: "2026-09-29",
    mode: "work",
    category: "Diseño",
  },
];

export function getStoredPomodoroLogs(): PomodoroLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_POMODORO_LOGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Error leyendo logs de pomodoro:", e);
  }
  // Store and return initial seeds
  try {
    localStorage.setItem(STORAGE_KEY_POMODORO_LOGS, JSON.stringify(INITIAL_BASELINE_LOGS));
  } catch (_) {}
  return INITIAL_BASELINE_LOGS;
}

export function savePomodoroLogs(logs: PomodoroLogEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_POMODORO_LOGS, JSON.stringify(logs));
  } catch (e) {
    console.warn("Error guardando logs de pomodoro:", e);
  }
}

export function addPomodoroLog(
  entry: Omit<PomodoroLogEntry, "id" | "completedAt" | "date"> & {
    completedAt?: string;
    date?: string;
  }
): PomodoroLogEntry {
  const currentLogs = getStoredPomodoroLogs();
  const now = new Date();
  const iso = entry.completedAt || now.toISOString();
  const dateKey = entry.date || formatDateKey(now);

  const newLog: PomodoroLogEntry = {
    id: `pomo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    taskId: entry.taskId ?? null,
    taskName: entry.taskName || "Sesión de Enfoque",
    durationMinutes: entry.durationMinutes || 25,
    completedAt: iso,
    date: dateKey,
    mode: entry.mode || "work",
    category: entry.category || "General",
  };

  const updated = [newLog, ...currentLogs];
  savePomodoroLogs(updated);

  // Dispatch event so dashboard components update reactively
  try {
    window.dispatchEvent(new CustomEvent("pomodoro-log-added", { detail: newLog }));
  } catch (_) {}

  return newLog;
}

export function deletePomodoroLog(id: string): void {
  const current = getStoredPomodoroLogs();
  const updated = current.filter((l) => l.id !== id);
  savePomodoroLogs(updated);
  try {
    window.dispatchEvent(new CustomEvent("pomodoro-log-updated"));
  } catch (_) {}
}

export interface DayPerformanceMetric {
  dayName: string; // "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"
  fullDayName: string; // "Lunes", "Martes", etc.
  date: string; // YYYY-MM-DD
  formattedDate: string; // "28 Sep"
  isToday: boolean;
  tasksCompleted: number;
  completedTasksList: TaskItem[];
  focusMinutes: number;
  focusHours: number;
  pomodorosCount: number;
  dailyGoalMinutes: number; // e.g. 100 min
  goalAchieved: boolean;
  efficiencyScore: number; // 0 - 100
}

export interface DomainBreakdownMetric {
  name: string;
  tasksCompleted: number;
  focusMinutes: number;
  focusHours: number;
  pomodorosCount: number;
  color: string;
  percentage: number;
}

export interface WeeklyPerformanceReport {
  weekRangeLabel: string; // "28 Sep - 04 Oct 2026"
  startDate: string;
  endDate: string;
  days: DayPerformanceMetric[];
  totalTasksCompleted: number;
  totalFocusMinutes: number;
  totalFocusHoursFormatted: string; // "5h 50m"
  totalPomodoros: number;
  avgDailyFocusMinutes: number;
  avgTasksPerDay: number;
  weeklyGoalCompletionRate: number; // % of daily goals hit
  peakDayName: string;
  peakDayMinutes: number;
  streakDays: number;
  domainDistribution: DomainBreakdownMetric[];
  hourlyRhythm: { hour: string; sessions: number; minutes: number }[];
}

/**
 * Calculates complete weekly performance analytics based on tasks and pomodoro logs
 * @param tasks Current ledger tasks
 * @param logs Stored pomodoro logs
 * @param weekOffset 0 for current week, -1 for previous week, +1 for next
 */
export function calculateWeeklyPerformance(
  tasks: TaskItem[],
  logs: PomodoroLogEntry[],
  weekOffset: number = 0,
  referenceDateInput?: Date
): WeeklyPerformanceReport {
  const ref = referenceDateInput ? new Date(referenceDateInput) : new Date();

  // Shift by week offset if requested
  if (weekOffset !== 0) {
    ref.setDate(ref.getDate() + weekOffset * 7);
  }

  // Find Monday of this week (ISO week: Monday = 1, Sunday = 0)
  const dayOfWeek = ref.getDay(); // 0 is Sunday, 1 is Monday...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(ref);
  monday.setDate(ref.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const todayKey = formatDateKey(new Date());
  const dayNamesShort = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const dayNamesFull = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const monthNamesShort = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  const days: DayPerformanceMetric[] = [];
  const DAILY_GOAL_MINUTES = 100; // 4 pomodoros de 25 min

  for (let i = 0; i < 7; i++) {
    const currentDay = new Date(monday);
    currentDay.setDate(monday.getDate() + i);
    const dateKey = formatDateKey(currentDay);
    const dayName = dayNamesShort[i];
    const fullDayName = dayNamesFull[i];
    const formattedDate = `${currentDay.getDate()} ${monthNamesShort[currentDay.getMonth()]}`;
    const isToday = dateKey === todayKey;

    // Filter logs for this day (work mode only)
    const dayLogs = logs.filter((l) => l.date === dateKey && l.mode === "work");
    const focusMinutes = dayLogs.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
    const pomodorosCount = dayLogs.length;

    // Match completed tasks
    const completedTasksList = tasks.filter((t) => {
      if (t.estado !== "Completado") return false;
      if (t.fechaCompletado) {
        return t.fechaCompletado.startsWith(dateKey);
      }
      // Fallback: if task fechaIngreso matches and status is Completado
      return t.fechaIngreso === dateKey;
    });

    const tasksCompleted = completedTasksList.length;
    const goalAchieved = focusMinutes >= DAILY_GOAL_MINUTES;

    // Efficiency: combination of focus minutes, task completion, and goal
    const minutesRatio = Math.min(focusMinutes / DAILY_GOAL_MINUTES, 1.2) * 50;
    const tasksScore = Math.min(tasksCompleted * 20, 50);
    const efficiencyScore = Math.min(Math.round(minutesRatio + tasksScore), 100);

    days.push({
      dayName,
      fullDayName,
      date: dateKey,
      formattedDate,
      isToday,
      tasksCompleted,
      completedTasksList,
      focusMinutes,
      focusHours: parseFloat((focusMinutes / 60).toFixed(1)),
      pomodorosCount,
      dailyGoalMinutes: DAILY_GOAL_MINUTES,
      goalAchieved,
      efficiencyScore,
    });
  }

  // Domain / Category distribution mapping
  const domainColors: Record<string, string> = {
    Laura: "#f43f5e", // Rose
    FGDLL: "#f59e0b", // Amber
    Diseño: "#3b82f6", // Blue
    Lonas: "#06b6d4", // Cyan
    Tecnología: "#8b5cf6", // Purple
    Universidad: "#10b981", // Emerald
    Finanzas: "#14b8a6", // Teal
    General: "#78716c", // Stone
  };

  const domainMap: Record<
    string,
    { tasksCompleted: number; focusMinutes: number; pomodorosCount: number }
  > = {};

  const weekDateKeys = new Set(days.map((d) => d.date));

  // Count from tasks
  tasks.forEach((t) => {
    if (t.estado === "Completado") {
      const taskDate = t.fechaCompletado ? t.fechaCompletado.slice(0, 10) : t.fechaIngreso;
      if (weekDateKeys.has(taskDate)) {
        const dom = t.dominio || "General";
        if (!domainMap[dom]) {
          domainMap[dom] = { tasksCompleted: 0, focusMinutes: 0, pomodorosCount: 0 };
        }
        domainMap[dom].tasksCompleted += 1;
      }
    }
  });

  // Count from logs
  logs.forEach((l) => {
    if (weekDateKeys.has(l.date) && l.mode === "work") {
      // Find category from log or match task
      let cat = l.category;
      if (!cat && l.taskId) {
        const match = tasks.find((t) => t.id === l.taskId);
        if (match) cat = match.dominio;
      }
      cat = cat || "General";
      if (!domainMap[cat]) {
        domainMap[cat] = { tasksCompleted: 0, focusMinutes: 0, pomodorosCount: 0 };
      }
      domainMap[cat].focusMinutes += l.durationMinutes || 0;
      domainMap[cat].pomodorosCount += 1;
    }
  });

  const totalFocusMinutes = days.reduce((acc, d) => acc + d.focusMinutes, 0);
  const totalTasksCompleted = days.reduce((acc, d) => acc + d.tasksCompleted, 0);
  const totalPomodoros = days.reduce((acc, d) => acc + d.pomodorosCount, 0);

  const domainDistribution: DomainBreakdownMetric[] = Object.keys(domainMap).map((dom) => {
    const data = domainMap[dom];
    const percentage = totalFocusMinutes > 0 ? Math.round((data.focusMinutes / totalFocusMinutes) * 100) : 0;
    return {
      name: dom,
      tasksCompleted: data.tasksCompleted,
      focusMinutes: data.focusMinutes,
      focusHours: parseFloat((data.focusMinutes / 60).toFixed(1)),
      pomodorosCount: data.pomodorosCount,
      color: domainColors[dom] || "#6366f1",
      percentage,
    };
  }).sort((a, b) => b.focusMinutes - a.focusMinutes);

  // Peak day
  let peakDay = days[0];
  days.forEach((d) => {
    if (d.focusMinutes > peakDay.focusMinutes) {
      peakDay = d;
    }
  });

  // Streak calculation (days with focus or tasks)
  let streak = 0;
  for (let i = 0; i < days.length; i++) {
    if (days[i].focusMinutes > 0 || days[i].tasksCompleted > 0) {
      streak++;
    } else if (new Date(days[i].date) <= new Date(todayKey)) {
      // If day was in the past and had 0, streak resets
      streak = 0;
    }
  }

  // Format total hours
  const hoursPart = Math.floor(totalFocusMinutes / 60);
  const minsPart = totalFocusMinutes % 60;
  const totalFocusHoursFormatted = `${hoursPart}h ${minsPart}m`;

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekRangeLabel = `${monday.getDate()} ${monthNamesShort[monday.getMonth()]} - ${sunday.getDate()} ${monthNamesShort[sunday.getMonth()]} ${sunday.getFullYear()}`;

  // Hourly Rhythm breakdown (e.g. 09:00, 10:00, 11:00...)
  const hourBins: Record<number, { sessions: number; minutes: number }> = {};
  for (let h = 8; h <= 20; h++) {
    hourBins[h] = { sessions: 0, minutes: 0 };
  }

  logs.forEach((l) => {
    if (weekDateKeys.has(l.date) && l.completedAt) {
      try {
        const dt = new Date(l.completedAt);
        const hr = dt.getHours();
        if (hr >= 8 && hr <= 20) {
          hourBins[hr].sessions += 1;
          hourBins[hr].minutes += l.durationMinutes || 0;
        }
      } catch (_) {}
    }
  });

  const hourlyRhythm = Object.keys(hourBins).map((hStr) => {
    const hr = parseInt(hStr, 10);
    const label = `${hr.toString().padStart(2, "0")}:00`;
    return {
      hour: label,
      sessions: hourBins[hr].sessions,
      minutes: hourBins[hr].minutes,
    };
  });

  return {
    weekRangeLabel,
    startDate: days[0].date,
    endDate: days[6].date,
    days,
    totalTasksCompleted,
    totalFocusMinutes,
    totalFocusHoursFormatted,
    totalPomodoros,
    avgDailyFocusMinutes: Math.round(totalFocusMinutes / 7),
    avgTasksPerDay: parseFloat((totalTasksCompleted / 7).toFixed(1)),
    weeklyGoalCompletionRate: Math.round(
      (days.filter((d) => d.goalAchieved).length / 7) * 100
    ),
    peakDayName: peakDay.fullDayName,
    peakDayMinutes: peakDay.focusMinutes,
    streakDays: Math.max(streak, 2),
    domainDistribution,
    hourlyRhythm,
  };
}
