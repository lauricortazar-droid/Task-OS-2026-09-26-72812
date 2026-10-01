import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  GripVertical,
  CheckCircle2,
  Clock,
  AlertCircle,
  Star,
  Flame,
  X,
  Phone,
  Tag as TagIcon,
  Filter,
  Check,
} from "lucide-react";
import { TaskItem, TagItem } from "../types";
import { getTagColorClass } from "../utils/tagColors";
import { playChime } from "../utils/audio";

interface TaskCalendarViewProps {
  tasks: TaskItem[];
  esencialTaskId?: number | null;
  secundariasTaskIds?: number[];
  availableTags?: TagItem[];
  onToggleStatus: (id: number) => void;
  onSetStatus: (id: number, newStatus: "Pendiente" | "En Proceso" | "Completado") => void;
  onStartFocus: (task: TaskItem) => void;
  onSetEsencial: (id: number) => void;
  onUpdateTaskFechaLimite: (id: number, fechaLimite: string) => void;
  onMessageContact?: (task: TaskItem) => void;
}

const DAYS_OF_WEEK = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export default function TaskCalendarView({
  tasks,
  esencialTaskId,
  secundariasTaskIds = [],
  availableTags = [],
  onToggleStatus,
  onSetStatus,
  onStartFocus,
  onSetEsencial,
  onUpdateTaskFechaLimite,
  onMessageContact,
}: TaskCalendarViewProps) {
  // Determine reference current date: default to today (or September 2026 if current tasks are in 2026)
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`;

  // Initial month view: check tasks to center on the most relevant month
  const initialDate = (() => {
    // If any task has a date in 2026, let's prioritize centering around that
    const sample = tasks.find((t) => t.fechaLimite || t.fechaIngreso);
    if (sample) {
      const dateStr = sample.fechaLimite || sample.fechaIngreso;
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        if (!isNaN(y) && !isNaN(m)) {
          return new Date(y, m, 1);
        }
      }
    }
    return new Date();
  })();

  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth()); // 0-indexed
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [dragOverDayStr, setDragOverDayStr] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [showUnscheduledPanel, setShowUnscheduledPanel] = useState(true);

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, task: TaskItem) => {
    e.dataTransfer.setData("text/plain", String(task.id));
    e.dataTransfer.effectAllowed = "move";
    setDraggedTaskId(task.id);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverDayStr(null);
  };

  const handleDragOver = (e: React.DragEvent, dayDateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverDayStr !== dayDateStr) {
      setDragOverDayStr(dayDateStr);
    }
  };

  const handleDragLeave = (dayDateStr: string) => {
    if (dragOverDayStr === dayDateStr) {
      setDragOverDayStr(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    setDragOverDayStr(null);
    const taskIdStr = e.dataTransfer.getData("text/plain");
    const taskId = parseInt(taskIdStr, 10) || draggedTaskId;

    if (taskId) {
      const task = tasks.find((t) => t.id === taskId);
      if (task && task.fechaLimite !== targetDateStr) {
        onUpdateTaskFechaLimite(taskId, targetDateStr);
        playChime("success");
      }
    }
    setDraggedTaskId(null);
  };

  // Build calendar grid days
  // First day of current month
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  // getDay() gives 0 for Sunday, 1 for Monday, etc.
  // We want Monday = 0, Sunday = 6
  let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startingDayOfWeek === -1) startingDayOfWeek = 6;

  // Days in current month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  // Days in previous month
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  interface CalendarDayCell {
    dayNum: number;
    dateStr: string; // YYYY-MM-DD
    isCurrentMonth: boolean;
    isToday: boolean;
    isPast: boolean;
    dayOfWeek: number;
  }

  const calendarDays: CalendarDayCell[] = [];

  // 1. Previous month padding days
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    calendarDays.push({
      dayNum: day,
      dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isPast: dateStr < todayStr,
      dayOfWeek: calendarDays.length % 7,
    });
  }

  // 2. Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    calendarDays.push({
      dayNum: day,
      dateStr,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isPast: dateStr < todayStr,
      dayOfWeek: calendarDays.length % 7,
    });
  }

  // 3. Next month padding days to complete grid rows
  const remaining = (7 - (calendarDays.length % 7)) % 7;
  for (let day = 1; day <= remaining; day++) {
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    calendarDays.push({
      dayNum: day,
      dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isPast: dateStr < todayStr,
      dayOfWeek: calendarDays.length % 7,
    });
  }

  // Group tasks by scheduled date:
  // We prioritize `fechaLimite`. If none is specified, we place it in `unscheduledTasks`
  const tasksByDate = new Map<string, TaskItem[]>();
  const unscheduledTasks: TaskItem[] = [];

  tasks.forEach((t) => {
    if (t.fechaLimite) {
      const arr = tasksByDate.get(t.fechaLimite) || [];
      arr.push(t);
      tasksByDate.set(t.fechaLimite, arr);
    } else {
      unscheduledTasks.push(t);
    }
  });

  // Calculate statistics for current month view
  const currentMonthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
  const tasksInCurrentMonth = tasks.filter(
    (t) => t.fechaLimite && t.fechaLimite.startsWith(currentMonthPrefix)
  );
  const pendingInMonth = tasksInCurrentMonth.filter((t) => t.estado !== "Completado").length;
  const completedInMonth = tasksInCurrentMonth.filter((t) => t.estado === "Completado").length;

  return (
    <div className="space-y-4" id="task-calendar-monthly-view">
      {/* Calendar Header Navigation */}
      <div className="p-4 bg-stone-50/70 dark:bg-stone-900/50 border-b border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <CalendarIcon size={20} />
          </div>
          <div>
            <h4 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 capitalize">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h4>
            <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
              <span>
                {tasksInCurrentMonth.length} tarea{tasksInCurrentMonth.length === 1 ? "" : "s"} programada{tasksInCurrentMonth.length === 1 ? "" : "s"}
              </span>
              <span>•</span>
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                {pendingInMonth} por entregar
              </span>
              {completedInMonth > 0 && (
                <>
                  <span>•</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {completedInMonth} listas
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleGoToday}
            className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors shadow-2xs"
          >
            Hoy
          </button>
          <div className="flex items-center border border-stone-200 dark:border-stone-700 rounded-lg overflow-hidden bg-white dark:bg-stone-800">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Mes anterior"
              className="p-1.5 px-2 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="w-[1px] h-4 bg-stone-200 dark:bg-stone-700" />
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Mes siguiente"
              className="p-1.5 px-2 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowUnscheduledPanel(!showUnscheduledPanel)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              showUnscheduledPanel
                ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 border-transparent shadow-2xs"
                : "border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
            }`}
          >
            Sin Fecha ({unscheduledTasks.length})
          </button>
        </div>
      </div>

      {/* Unscheduled / Bandeja de tareas sin fecha límite */}
      {showUnscheduledPanel && unscheduledTasks.length > 0 && (
        <div className="mx-4 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
              <span>📌 Bandeja: Tareas sin fecha límite ({unscheduledTasks.length})</span>
            </div>
            <span className="text-[11px] text-amber-700 dark:text-amber-400">
              Arrastra una tarjeta a cualquier día del calendario para asignarle fecha
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5">
            {unscheduledTasks.map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => handleDragStart(e, task)}
                onDragEnd={handleDragEnd}
                onClick={() => setSelectedTask(task)}
                className={`shrink-0 w-64 p-2.5 rounded-lg border bg-white dark:bg-stone-900 text-xs shadow-2xs cursor-grab active:cursor-grabbing hover:border-amber-400 transition-all ${
                  draggedTaskId === task.id ? "opacity-40 scale-95" : ""
                } ${
                  task.id === esencialTaskId
                    ? "border-amber-400 ring-1 ring-amber-400/40"
                    : "border-stone-200 dark:border-stone-800"
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1">
                    <GripVertical size={13} className="text-stone-400 shrink-0" />
                    <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                      #{task.id}
                    </span>
                    {task.id === esencialTaskId && (
                      <Flame size={12} className="text-amber-500 fill-amber-500" />
                    )}
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                      task.estado === "Completado"
                        ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                        : task.estado === "En Proceso"
                        ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                        : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300"
                    }`}
                  >
                    {task.estado}
                  </span>
                </div>
                <p className="font-medium text-stone-800 dark:text-stone-200 line-clamp-2 leading-snug">
                  {task.tarea}
                </p>
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-stone-400">
                  <span className="truncate">{task.solicitante}</span>
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    Sin asignar
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Calendar Grid */}
      <div className="px-2 sm:px-4 pb-4">
        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1 text-center select-none">
          {DAYS_OF_WEEK.map((dayName, idx) => (
            <div
              key={dayName}
              className={`py-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-lg ${
                idx >= 5
                  ? "text-stone-400 dark:text-stone-500 bg-stone-100/40 dark:bg-stone-900/30"
                  : "text-stone-600 dark:text-stone-300 bg-stone-100/70 dark:bg-stone-900/60"
              }`}
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Calendar days grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarDays.map((cell) => {
            const dayTasks = tasksByDate.get(cell.dateStr) || [];
            const isDragTarget = dragOverDayStr === cell.dateStr;

            return (
              <div
                key={cell.dateStr}
                onDragOver={(e) => handleDragOver(e, cell.dateStr)}
                onDragLeave={() => handleDragLeave(cell.dateStr)}
                onDrop={(e) => handleDrop(e, cell.dateStr)}
                className={`min-h-[110px] sm:min-h-[135px] p-1 sm:p-2 rounded-xl border flex flex-col justify-between transition-all relative ${
                  isDragTarget
                    ? "border-amber-500 bg-amber-500/10 dark:bg-amber-950/40 ring-2 ring-amber-400/50 scale-[1.01] z-10"
                    : cell.isCurrentMonth
                    ? "border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900/90"
                    : "border-stone-200/40 dark:border-stone-800/40 bg-stone-50/50 dark:bg-stone-950/40 opacity-70"
                } ${cell.isToday ? "ring-2 ring-stone-900/20 dark:ring-stone-100/20" : ""}`}
              >
                {/* Day number & indicators */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`inline-flex items-center justify-center text-xs font-bold w-6 h-6 rounded-full transition-all ${
                      cell.isToday
                        ? "bg-amber-500 text-stone-950 font-black shadow-xs"
                        : cell.isCurrentMonth
                        ? "text-stone-800 dark:text-stone-200"
                        : "text-stone-400 dark:text-stone-600"
                    }`}
                  >
                    {cell.dayNum}
                  </span>

                  {dayTasks.length > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                      {dayTasks.length}
                    </span>
                  )}
                </div>

                {/* Task badges inside day cell */}
                <div className="flex-1 space-y-1 overflow-y-auto max-h-[90px] sm:max-h-[105px] pr-0.5">
                  {dayTasks.map((task) => {
                    const isDragging = draggedTaskId === task.id;
                    const isCompleted = task.estado === "Completado";
                    const isEssential = task.id === esencialTaskId;

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        onDragEnd={handleDragEnd}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTask(task);
                        }}
                        className={`group p-1.5 rounded-lg border text-[11px] leading-tight cursor-grab active:cursor-grabbing select-none transition-all ${
                          isDragging ? "opacity-30 scale-95" : "hover:shadow-xs"
                        } ${
                          isCompleted
                            ? "bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-800 text-stone-400 line-through"
                            : isEssential
                            ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-stone-900 dark:text-stone-100 font-semibold"
                            : "bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200"
                        }`}
                        title={`#${task.id}: ${task.tarea} (${task.solicitante}) - Arrastra a otro día para cambiar fecha límite`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1 min-w-0">
                            <GripVertical
                              size={11}
                              className="text-stone-300 dark:text-stone-600 group-hover:text-amber-500 shrink-0 transition-colors"
                            />
                            <span className="font-mono font-black text-[10px] text-stone-500 shrink-0">
                              #{task.id}
                            </span>
                            {isEssential && (
                              <Flame size={11} className="text-amber-500 fill-amber-500 shrink-0" />
                            )}
                            <span className="truncate font-medium">{task.tarea}</span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleStatus(task.id);
                            }}
                            className={`p-0.5 rounded shrink-0 transition-colors ${
                              isCompleted
                                ? "text-emerald-500"
                                : "text-stone-300 hover:text-emerald-500"
                            }`}
                            title={isCompleted ? "Marcar pendiente" : "Marcar completado"}
                          >
                            <CheckCircle2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Empty cell drop prompt */}
                {isDragTarget && dayTasks.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-amber-500/15 border-2 border-dashed border-amber-500 pointer-events-none">
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                      Soltar aquí
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Details Popover / Modal */}
      {selectedTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSelectedTask(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-black px-2 py-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100">
                  #{selectedTask.id}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    selectedTask.estado === "Completado"
                      ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                      : selectedTask.estado === "En Proceso"
                      ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                      : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                  }`}
                >
                  {selectedTask.estado}
                </span>
                {selectedTask.id === esencialTaskId && (
                  <span className="flex items-center gap-1 text-[11px] font-black text-amber-600 bg-amber-100/70 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                    <Flame size={12} /> Prioridad 1
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Task Content */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                {selectedTask.tarea}
              </h3>
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span>Solicitante: <strong className="text-stone-800 dark:text-stone-200">{selectedTask.solicitante}</strong></span>
                {selectedTask.dominio && (
                  <span className="px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 font-medium">
                    {selectedTask.dominio}
                  </span>
                )}
              </div>

              {/* Tags if any */}
              {selectedTask.etiquetas && selectedTask.etiquetas.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap pt-1">
                  {selectedTask.etiquetas.map((tName) => {
                    const tagObj = availableTags.find((t) => t.nombre === tName);
                    return (
                      <span
                        key={tName}
                        className={`text-[11px] px-2 py-0.5 rounded-md font-medium border ${
                          tagObj
                            ? getTagColorClass(tagObj.color)
                            : "border-stone-200 bg-stone-100 text-stone-700"
                        }`}
                      >
                        {tName}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Notes */}
              {selectedTask.notas && (
                <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-xs text-stone-600 dark:text-stone-300">
                  <span className="font-semibold block mb-0.5 text-stone-500 text-[10px] uppercase">
                    Notas y Observaciones:
                  </span>
                  {selectedTask.notas}
                </div>
              )}
            </div>

            {/* Date modification control */}
            <div className="pt-2 border-t border-stone-200 dark:border-stone-800 space-y-2">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                📅 Fecha Límite de Entrega:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={selectedTask.fechaLimite || ""}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    onUpdateTaskFechaLimite(selectedTask.id, newDate);
                    setSelectedTask({ ...selectedTask, fechaLimite: newDate });
                    playChime("success");
                  }}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 focus:ring-1 focus:ring-amber-500"
                />
                {selectedTask.fechaLimite && (
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateTaskFechaLimite(selectedTask.id, "");
                      setSelectedTask({ ...selectedTask, fechaLimite: "" });
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-xs text-stone-500 hover:text-rose-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                  >
                    Quitar fecha
                  </button>
                )}
              </div>
            </div>

            {/* Actions: Status change, Focus, WhatsApp */}
            <div className="pt-2 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onSetStatus(
                      selectedTask.id,
                      selectedTask.estado === "Completado" ? "En Proceso" : "Completado"
                    );
                    setSelectedTask({
                      ...selectedTask,
                      estado: selectedTask.estado === "Completado" ? "En Proceso" : "Completado",
                    });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    selectedTask.estado === "Completado"
                      ? "bg-stone-200 text-stone-800 dark:bg-stone-700 dark:text-stone-200"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
                  }`}
                >
                  <CheckCircle2 size={13} />
                  <span>{selectedTask.estado === "Completado" ? "Reabrir" : "Completar"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onStartFocus(selectedTask);
                    setSelectedTask(null);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-xs font-semibold flex items-center gap-1"
                >
                  <Flame size={13} />
                  <span>Enfocar</span>
                </button>
              </div>

              {onMessageContact && selectedTask.contacto && (
                <button
                  type="button"
                  onClick={() => {
                    onMessageContact(selectedTask);
                    setSelectedTask(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Phone size={13} />
                  <span>WhatsApp</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
