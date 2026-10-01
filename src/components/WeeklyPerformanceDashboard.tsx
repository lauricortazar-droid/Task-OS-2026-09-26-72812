import React, { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ReferenceLine,
} from "recharts";
import {
  CheckCircle2,
  Timer,
  Flame,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Award,
  Calendar,
  Layers,
  Plus,
  X,
  Target,
  Clock,
  Filter,
} from "lucide-react";
import { TaskItem, PomodoroLogEntry } from "../types";
import {
  calculateWeeklyPerformance,
  getStoredPomodoroLogs,
  addPomodoroLog,
  WeeklyPerformanceReport,
} from "../lib/pomodoroService";
import { playChime } from "../utils/audio";

interface WeeklyPerformanceDashboardProps {
  tasks: TaskItem[];
  onOpenPomodoro?: () => void;
  onSelectTask?: (id: number) => void;
  onClose?: () => void;
}

export default function WeeklyPerformanceDashboard({
  tasks,
  onOpenPomodoro,
  onSelectTask,
  onClose,
}: WeeklyPerformanceDashboardProps) {
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [selectedDomain, setSelectedDomain] = useState<string>("Todos");
  const [logs, setLogs] = useState<PomodoroLogEntry[]>(() => getStoredPomodoroLogs());
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Manual session logging form state
  const [manualTaskName, setManualTaskName] = useState("");
  const [manualTaskId, setManualTaskId] = useState<number | undefined>(undefined);
  const [manualMinutes, setManualMinutes] = useState(25);
  const [manualCategory, setManualCategory] = useState("General");
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Listen to pomodoro log updates from other components
  useEffect(() => {
    const handleUpdate = () => {
      setLogs(getStoredPomodoroLogs());
    };
    window.addEventListener("pomodoro-log-added", handleUpdate);
    window.addEventListener("pomodoro-log-updated", handleUpdate);
    return () => {
      window.removeEventListener("pomodoro-log-added", handleUpdate);
      window.removeEventListener("pomodoro-log-updated", handleUpdate);
    };
  }, []);

  // Filter tasks if domain is selected
  const filteredTasks = useMemo(() => {
    if (selectedDomain === "Todos") return tasks;
    return tasks.filter((t) => (t.dominio || "General") === selectedDomain);
  }, [tasks, selectedDomain]);

  // Filter logs if domain is selected
  const filteredLogs = useMemo(() => {
    if (selectedDomain === "Todos") return logs;
    return logs.filter((l) => {
      const match = tasks.find((t) => t.id === l.taskId);
      const cat = l.category || match?.dominio || "General";
      return cat === selectedDomain;
    });
  }, [logs, tasks, selectedDomain]);

  // Calculate full performance report
  const report: WeeklyPerformanceReport = useMemo(() => {
    return calculateWeeklyPerformance(filteredTasks, filteredLogs, weekOffset);
  }, [filteredTasks, filteredLogs, weekOffset]);

  // Available domain categories
  const availableDomains = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t.dominio) set.add(t.dominio);
    });
    return ["Todos", ...Array.from(set)];
  }, [tasks]);

  const handleSaveManualSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTaskName.trim()) return;

    const created = addPomodoroLog({
      taskId: manualTaskId ?? null,
      taskName: manualTaskName.trim(),
      durationMinutes: Number(manualMinutes) || 25,
      date: manualDate,
      mode: "work",
      category: manualCategory,
    });

    setLogs((prev) => [created, ...prev]);
    setIsManualModalOpen(false);
    setManualTaskName("");
    playChime("success");
  };

  // Custom Chart Tooltips with accessible dark styling
  const renderCombinedTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dayData = report.days.find((d) => d.dayName === label);
      return (
        <div className="p-3 rounded-xl bg-stone-900 text-stone-100 border border-stone-700 shadow-xl text-xs space-y-1.5 min-w-[180px]">
          <div className="font-bold text-stone-200 border-b border-stone-800 pb-1 flex items-center justify-between">
            <span>{dayData?.fullDayName || label}</span>
            <span className="text-stone-400 font-normal">{dayData?.formattedDate}</span>
          </div>
          <div className="flex items-center justify-between text-amber-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Tiempo Enfoque:
            </span>
            <span>{payload[0]?.value || 0} min</span>
          </div>
          <div className="flex items-center justify-between text-emerald-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Tareas Completadas:
            </span>
            <span>{payload[1]?.value || 0}</span>
          </div>
          {dayData && (
            <div className="pt-1 text-[10px] text-stone-400 border-t border-stone-800/80 flex justify-between">
              <span>Pomodoros:</span>
              <span className="text-stone-200 font-bold">{dayData.pomodorosCount} bloques</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* 1. Header & Navigation Controls */}
      <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <TrendingUp size={18} />
              </div>
              <h2 className="text-lg sm:text-xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
                Rendimiento Semanal • Productividad & Enfoque Pomodoro
              </h2>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Análisis cuantitativo de tareas completadas en Ledger vs. minutos dedicados en modo enfoque.
            </p>
          </div>

          {/* Action buttons & Week Selector */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Week navigation */}
            <div className="flex items-center bg-stone-100 dark:bg-stone-800/80 p-1 rounded-2xl border border-stone-200 dark:border-stone-700">
              <button
                type="button"
                onClick={() => setWeekOffset((prev) => prev - 1)}
                className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors"
                title="Semana anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="px-3 text-xs font-bold text-stone-800 dark:text-stone-200 min-w-[130px] text-center">
                {weekOffset === 0 ? "Esta Semana" : weekOffset === -1 ? "Semana Pasada" : report.weekRangeLabel}
              </div>
              <button
                type="button"
                onClick={() => setWeekOffset((prev) => prev + 1)}
                disabled={weekOffset >= 0}
                className={`p-1.5 rounded-xl text-stone-600 dark:text-stone-300 transition-colors ${
                  weekOffset >= 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-white dark:hover:bg-stone-700"
                }`}
                title="Semana siguiente"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {weekOffset !== 0 && (
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                className="px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold"
                title="Volver a la semana actual"
              >
                Hoy
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsManualModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-xs transition-transform active:scale-95"
            >
              <Plus size={14} />
              <span>+ Registrar Enfoque</span>
            </button>

            {onOpenPomodoro && (
              <button
                type="button"
                onClick={onOpenPomodoro}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-950 dark:hover:bg-stone-200 font-bold text-xs shadow-xs transition-transform active:scale-95"
              >
                <Timer size={14} />
                <span>Iniciar Pomodoro</span>
              </button>
            )}

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills / Domains */}
        <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1">
              <Filter size={12} />
              Filtrar por Dominio:
            </span>
            {availableDomains.map((dom) => (
              <button
                key={dom}
                type="button"
                onClick={() => setSelectedDomain(dom)}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                  selectedDomain === dom
                    ? "bg-[#042f66] text-white shadow-xs"
                    : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                }`}
              >
                {dom}
              </button>
            ))}
          </div>

          <div className="text-xs text-stone-500 dark:text-stone-400 font-medium shrink-0">
            Período: <strong className="text-stone-800 dark:text-stone-200">{report.weekRangeLabel}</strong>
          </div>
        </div>
      </div>

      {/* 2. Executive KPI Cards (Zero-Pill Discipline) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Metric 1: Tareas Completadas */}
        <div className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span>Tareas Completadas</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100">
            {report.totalTasksCompleted}
          </div>
          <div className="text-[11px] text-stone-500 flex items-center gap-1">
            <span>Promedio:</span>
            <strong className="text-stone-700 dark:text-stone-300">{report.avgTasksPerDay}/día</strong>
          </div>
        </div>

        {/* Metric 2: Horas de Enfoque */}
        <div className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span>Tiempo de Enfoque</span>
            <Timer size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
            {report.totalFocusHoursFormatted}
          </div>
          <div className="text-[11px] text-stone-500 flex items-center gap-1">
            <span>Total:</span>
            <strong className="text-stone-700 dark:text-stone-300">{report.totalFocusMinutes} min</strong>
          </div>
        </div>

        {/* Metric 3: Pomodoros Registrados */}
        <div className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span>Bloques Pomodoro</span>
            <Flame size={16} className="text-rose-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100">
            {report.totalPomodoros}
          </div>
          <div className="text-[11px] text-stone-500 flex items-center gap-1">
            <span>Sesiones de 25 min</span>
          </div>
        </div>

        {/* Metric 4: Promedio Diario */}
        <div className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span>Promedio Diario</span>
            <Clock size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100">
            {report.avgDailyFocusMinutes} <span className="text-sm font-bold text-stone-500">m/d</span>
          </div>
          <div className="text-[11px] text-stone-500 flex items-center gap-1">
            <span>Meta: 100 min/día</span>
          </div>
        </div>

        {/* Metric 5: Día Pico de Productividad */}
        <div className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span>Día Más Productivo</span>
            <Award size={16} className="text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 truncate">
            {report.peakDayName}
          </div>
          <div className="text-[11px] text-stone-500 flex items-center gap-1">
            <strong className="text-stone-700 dark:text-stone-300">{report.peakDayMinutes} min</strong>
            <span>de enfoque</span>
          </div>
        </div>

        {/* Metric 6: Racha Activa */}
        <div className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span>Racha de Trabajo</span>
            <Sparkles size={16} className="text-yellow-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {report.streakDays} <span className="text-sm font-bold text-stone-500">días</span>
          </div>
          <div className="text-[11px] text-stone-500 flex items-center gap-1">
            <span>Actividad consecutiva</span>
          </div>
        </div>
      </div>

      {/* 3. Main Data Visualization Row (Recharts: ComposedChart + PieChart) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart A: ComposedChart (Minutos de Enfoque + Tareas Completadas por Día) */}
        <div className="lg:col-span-2 p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm sm:text-base flex items-center gap-2">
                <span>Rendimiento Diario: Minutos de Enfoque vs. Tareas Completadas</span>
              </h3>
              <p className="text-xs text-stone-500">
                Línea ámbar: Minutos Pomodoro registrados • Barras esmeralda: Tareas cerradas en Ledger
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-stone-600 dark:text-stone-400">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500" />
                Tareas
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-amber-500 rounded" />
                Minutos Enfoque
              </span>
            </div>
          </div>

          <div className="w-full h-72 sm:h-80 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={report.days}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                <XAxis
                  dataKey="dayName"
                  stroke="#9ca3af"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#4b5563", opacity: 0.3 }}
                />
                {/* Left Y Axis for Focus Minutes */}
                <YAxis
                  yAxisId="left"
                  stroke="#f59e0b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  unit="m"
                  domain={[0, "auto"]}
                />
                {/* Right Y Axis for Tasks Completed */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#10b981"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, "auto"]}
                  allowDecimals={false}
                />
                <Tooltip content={renderCombinedTooltip} />
                <ReferenceLine
                  yAxisId="left"
                  y={100}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  opacity={0.6}
                  label={{
                    value: "Meta 100m",
                    fill: "#f59e0b",
                    fontSize: 10,
                    position: "insideTopRight",
                  }}
                />
                <Bar
                  yAxisId="right"
                  dataKey="tasksCompleted"
                  name="Tareas Completadas"
                  fill="#10b981"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={36}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="focusMinutes"
                  name="Minutos Pomodoro"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#f59e0b" }}
                  activeDot={{ r: 6, fill: "#f59e0b", stroke: "#ffffff", strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart B: Distribution by Domain / Category (PieChart Donut) */}
        <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm sm:text-base">
              Distribución de Enfoque por Dominio
            </h3>
            <p className="text-xs text-stone-500">
              Proporción de tiempo invertido en cada área institucional y creativa
            </p>
          </div>

          {report.domainDistribution.length > 0 ? (
            <>
              <div className="w-full h-52 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={report.domainDistribution}
                      dataKey="focusMinutes"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {report.domainDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, name: any) => [
                        `${value} min (${report.domainDistribution.find((d) => d.name === name)?.percentage}%)`,
                        name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend with quiet typographic metadata */}
              <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                {report.domainDistribution.slice(0, 5).map((dom) => (
                  <div key={dom.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dom.color }} />
                      <span className="font-medium text-stone-800 dark:text-stone-200">{dom.name}</span>
                    </div>
                    <div className="text-stone-500 flex items-center gap-1.5 font-mono">
                      <span>{dom.focusHours}h</span>
                      <span aria-hidden="true">·</span>
                      <span>{dom.percentage}%</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">{dom.tasksCompleted} tareas</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center text-center text-stone-400 space-y-2">
              <Layers size={28} className="opacity-40" />
              <p className="text-xs">Sin registros de enfoque para este período.</p>
            </div>
          )}
        </div>
      </div>

      {/* 4. Secondary Row: Daily Rhythm & Focus Efficiency Curve */}
      <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm sm:text-base flex items-center gap-2">
              <Target size={16} className="text-amber-500" />
              <span>Curva de Consistencia y Cumplimiento de Meta Diaria</span>
            </h3>
            <p className="text-xs text-stone-500">
              Monitoreo del índice de eficiencia (0-100) combinando cierre de tareas y cumplimiento del objetivo diario (100 min)
            </p>
          </div>
          <div className="text-xs text-stone-500 font-medium">
            Tasa de Días Cumplidos: <strong className="text-emerald-600 dark:text-emerald-400">{report.weeklyGoalCompletionRate}%</strong>
          </div>
        </div>

        <div className="w-full h-56 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={report.days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="efficiencyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
              <XAxis dataKey="dayName" stroke="#9ca3af" fontSize={11} tickLine={false} />
              <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} domain={[0, 100]} unit="%" />
              <Tooltip
                formatter={(val: any) => [`${val}%`, "Índice de Eficiencia"]}
                labelFormatter={(label) => `Día: ${report.days.find((d) => d.dayName === label)?.fullDayName || label}`}
              />
              <ReferenceLine y={80} stroke="#10b981" strokeDasharray="3 3" opacity={0.5} label={{ value: "Óptimo 80%", fill: "#10b981", fontSize: 10 }} />
              <Area
                type="monotone"
                dataKey="efficiencyScore"
                name="Eficiencia"
                stroke="#f59e0b"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#efficiencyGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. Detailed Daily Ledger Breakdown (Tareas finalizadas + Pomodoros día por día) */}
      <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm sm:text-base flex items-center gap-2">
              <Calendar size={16} className="text-blue-500" />
              <span>Desglose Detallado por Día de la Semana</span>
            </h3>
            <p className="text-xs text-stone-500">
              Registro auditable de tareas cerradas y bloques de pomodoro completados en cada jornada
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
          {report.days.map((day) => (
            <div
              key={day.date}
              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                day.isToday
                  ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700/80 shadow-xs"
                  : day.focusMinutes > 0
                  ? "bg-white dark:bg-stone-900/90 border-stone-200 dark:border-stone-800"
                  : "bg-stone-50/60 dark:bg-stone-950/40 border-stone-200/60 dark:border-stone-800/40 opacity-70"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black uppercase tracking-wider ${day.isToday ? "text-amber-600 dark:text-amber-400" : "text-stone-800 dark:text-stone-200"}`}>
                    {day.dayName}
                  </span>
                  <span className="text-[11px] text-stone-400">{day.formattedDate}</span>
                </div>

                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500">Enfoque:</span>
                    <strong className="text-stone-900 dark:text-stone-100 font-mono">
                      {day.focusMinutes}m
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500">Bloques:</span>
                    <span className="font-semibold text-stone-800 dark:text-stone-200 font-mono">
                      {day.pomodorosCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500">Cerradas:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                      {day.tasksCompleted}
                    </strong>
                  </div>
                </div>

                {/* Tasks completed on this day */}
                {day.completedTasksList.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-stone-200 dark:border-stone-800 space-y-1.5">
                    <div className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                      Tareas Cerradas:
                    </div>
                    {day.completedTasksList.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => onSelectTask && onSelectTask(t.id)}
                        className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800/60 hover:bg-amber-100 dark:hover:bg-stone-700/80 cursor-pointer text-[11px] text-stone-800 dark:text-stone-200 truncate transition-colors"
                        title={t.tarea}
                      >
                        <span className="text-emerald-600 font-bold mr-1">✓</span>
                        {t.tarea}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {day.isToday && (
                <div className="mt-3 pt-2 border-t border-amber-200 dark:border-amber-800/60 text-center">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest">
                    • Día en Curso •
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Manual Enfoque Logger */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Timer size={18} className="text-amber-500" />
                <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                  Registrar Sesión de Enfoque Manual
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveManualSession} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-600 dark:text-stone-400 font-semibold mb-1">
                  Descripción o Tarea
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Revisión y cotejo de lonas en taller..."
                  value={manualTaskName}
                  onChange={(e) => setManualTaskName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 dark:text-stone-400 font-semibold mb-1">
                    Duración (Minutos)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={240}
                    step={5}
                    required
                    value={manualMinutes}
                    onChange={(e) => setManualMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-stone-600 dark:text-stone-400 font-semibold mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    required
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 dark:text-stone-400 font-semibold mb-1">
                    Dominio / Área
                  </label>
                  <select
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Laura">Laura</option>
                    <option value="FGDLL">FGDLL</option>
                    <option value="Diseño">Diseño / Lonas</option>
                    <option value="Universidad">Universidad</option>
                    <option value="Tecnología">Tecnología</option>
                    <option value="Finanzas">Finanzas</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-600 dark:text-stone-400 font-semibold mb-1">
                    Asociar a Tarea Activa (Opcional)
                  </label>
                  <select
                    value={manualTaskId ?? ""}
                    onChange={(e) => setManualTaskId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">Ninguna / General</option>
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        #{t.id} - {t.tarea.slice(0, 24)}...
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-3 py-2 rounded-xl text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold shadow-xs"
                >
                  Guardar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
