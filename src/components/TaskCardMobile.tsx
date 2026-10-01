import React, { useState } from "react";
import {
  Star,
  Timer,
  CheckCircle2,
  Clock,
  AlertCircle,
  Image as ImageIcon,
  Phone,
  FileText,
  ChevronDown,
  ChevronUp,
  Tag as TagIcon,
  MessageSquare,
  Check,
  Link2,
  ExternalLink,
} from "lucide-react";
import { TaskItem, TagItem } from "../types";
import { getTagColorClass } from "../utils/tagColors";
import { playChime } from "../utils/audio";
import TaskResourceCard from "./TaskResourceCard";

interface TaskCardMobileProps {
  task: TaskItem;
  isEsencial: boolean;
  isSecundaria: boolean;
  availableTags?: TagItem[];
  onSetStatus: (id: number, newStatus: "Pendiente" | "En Proceso" | "Completado") => void;
  onStartFocus: (task: TaskItem) => void;
  onSetEsencial: (id: number) => void;
  onOpenWhatsApp: (task: TaskItem) => void;
  onViewImage: (src: string, title: string) => void;
  onUpdateNotes?: (taskId: number, notes: string) => void;
  onToggleTaskTag?: (taskId: number, tagName: string) => void;
}

export default function TaskCardMobile({
  task,
  isEsencial,
  isSecundaria,
  availableTags = [],
  onSetStatus,
  onStartFocus,
  onSetEsencial,
  onOpenWhatsApp,
  onViewImage,
  onUpdateNotes,
  onToggleTaskTag,
}: TaskCardMobileProps) {
  const isDone = task.estado === "Completado";
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState(task.notas || "");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const handleSaveNotes = () => {
    if (onUpdateNotes) {
      onUpdateNotes(task.id, notesDraft.trim());
      setIsSavingNotes(true);
      playChime("tick");
      setTimeout(() => setIsSavingNotes(false), 1500);
    }
  };

  const getDomainBadgeColor = (dom?: string) => {
    switch ((dom || "").toLowerCase()) {
      case "fgdll":
        return "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "universidad":
        return "bg-purple-100 text-purple-900 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      case "tecnología":
      case "technology":
        return "bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "diseño":
        return "bg-pink-100 text-pink-900 dark:bg-pink-950/60 dark:text-pink-300 border-pink-200 dark:border-pink-800";
      case "laura":
        return "bg-rose-100 text-rose-900 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800";
      default:
        return "bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-700";
    }
  };

  return (
    <div
      id={`task-mobile-card-${task.id}`}
      className={`rounded-2xl border transition-all overflow-hidden ${
        isEsencial
          ? "bg-amber-50/70 dark:bg-amber-950/20 border-amber-300/80 dark:border-amber-700/60 shadow-sm"
          : isDone
          ? "bg-stone-50/60 dark:bg-stone-900/30 border-stone-200/80 dark:border-stone-800/80 opacity-85"
          : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 shadow-2xs"
      }`}
    >
      {/* Top Card Bar */}
      <div className="p-3.5 pb-2 flex items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800/60">
        <div className="flex items-center gap-2 flex-wrap">
          {/* ID Badge */}
          <span className="px-2 py-0.5 rounded-md bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 font-mono text-xs font-bold">
            #{task.id}
          </span>

          {/* Domain Pill */}
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${getDomainBadgeColor(
              task.dominio
            )}`}
          >
            {task.dominio || "Personal"}
          </span>

          {/* Solicitante */}
          <span className="text-xs font-medium text-stone-600 dark:text-stone-300">
            De: <strong className="text-stone-900 dark:text-stone-100">{task.solicitante}</strong>
          </span>
        </div>

        {/* Priority Star Touch Button (min 44x44px touch target) */}
        <button
          type="button"
          onClick={() => {
            onSetEsencial(task.id);
            playChime("tick");
          }}
          className="p-2.5 -mr-1 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors flex items-center justify-center min-h-[44px] min-w-[44px]"
          title={isEsencial ? "Prioridad Esencial activa" : "Marcar como Tarea Esencial"}
        >
          <Star
            size={19}
            className={`${
              isEsencial
                ? "text-amber-500 fill-amber-500"
                : isSecundaria
                ? "text-amber-400 fill-amber-400/40"
                : "text-stone-300 dark:text-stone-600 hover:text-stone-400"
            }`}
          />
        </button>
      </div>

      {/* Main Task Description */}
      <div className="p-3.5 space-y-2.5">
        <p
          className={`text-sm leading-snug font-medium transition-colors ${
            isDone
              ? "line-through text-stone-400 dark:text-stone-500"
              : "text-stone-900 dark:text-stone-100"
          }`}
        >
          {task.tarea}
        </p>

        {/* Tags row */}
        {task.etiquetas && task.etiquetas.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {task.etiquetas.map((tagName) => {
              const matched = availableTags.find((t) => t.nombre === tagName);
              return (
                <span
                  key={tagName}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getTagColorClass(
                    matched?.color
                  )}`}
                >
                  <TagIcon size={10} />
                  {tagName}
                </span>
              );
            })}
          </div>
        )}

        {/* Contextual Resources (Ley del Foco) con Thumbnail & Favicon Google API */}
        {task.resources && task.resources.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {task.resources.map((res, idx) => (
              <TaskResourceCard
                key={`${res.url}-${idx}`}
                resource={res}
                compact={false}
              />
            ))}
          </div>
        )}

        {/* Attached Reference Image Thumbnail */}
        {task.imagenReferencia && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => onViewImage(task.imagenReferencia!, `Referencia #${task.id}: ${task.tarea}`)}
              className="inline-flex items-center gap-2 p-1.5 pr-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:border-amber-500/50 transition-all min-h-[44px]"
            >
              <img
                src={task.imagenReferencia}
                alt="Miniatura"
                className="w-9 h-9 object-cover rounded-lg border border-stone-300 dark:border-stone-700"
              />
              <span className="flex items-center gap-1 text-[11px]">
                <ImageIcon size={13} className="text-amber-500" />
                Ver comprobante / imagen
              </span>
            </button>
          </div>
        )}

        {/* Observaciones / Notes Accordion */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setIsNotesOpen(!isNotesOpen)}
            className="flex items-center justify-between w-full py-1.5 text-xs text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors min-h-[38px]"
          >
            <span className="flex items-center gap-1.5 font-semibold">
              <FileText size={13} />
              {task.notas ? "Ver observaciones" : "+ Añadir observaciones"}
            </span>
            {isNotesOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>

          {isNotesOpen && (
            <div className="mt-2 p-2.5 rounded-xl bg-stone-100/70 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-2">
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                placeholder="Escribe notas, especificaciones o detalles para esta tarea..."
                rows={2}
                className="w-full p-2 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className="px-3 py-1.5 rounded-lg bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900 text-xs font-semibold hover:opacity-90 transition-opacity min-h-[36px] flex items-center gap-1"
                >
                  {isSavingNotes ? (
                    <>
                      <Check size={12} className="text-emerald-500" /> Guardado
                    </>
                  ) : (
                    "Guardar nota"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Touch-Friendly Status Selector: 3 Segments (min 44px height) */}
      <div className="px-3 pb-3">
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/60">
          {(["Pendiente", "En Proceso", "Completado"] as const).map((status) => {
            const isCurrent = task.estado === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => {
                  onSetStatus(task.id, status);
                  playChime(status === "Completado" ? "success" : "tick");
                }}
                className={`py-2 px-1 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 min-h-[40px] select-none ${
                  isCurrent
                    ? status === "Completado"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : status === "En Proceso"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-amber-500 text-stone-950 shadow-xs"
                    : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                }`}
              >
                {status === "Completado" && <CheckCircle2 size={12} />}
                {status === "En Proceso" && <Clock size={12} />}
                {status === "Pendiente" && <AlertCircle size={12} />}
                <span className="truncate">{status}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Quick Action Bar: WhatsApp & Pomodoro Focus (Touch targets >= 44px) */}
      <div className="p-2 px-3 bg-stone-50 dark:bg-stone-900/60 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-2">
        {/* WhatsApp Contact button */}
        {task.contacto?.telefono ? (
          <button
            type="button"
            onClick={() => onOpenWhatsApp(task)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 text-xs font-semibold transition-all min-h-[44px]"
            title={`Abrir WhatsApp con ${task.contacto.nombre || task.solicitante}`}
          >
            <Phone size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span className="truncate">WhatsApp {task.solicitante}</span>
          </button>
        ) : (
          <div className="flex-1 flex items-center gap-1.5 overflow-hidden text-[11px] text-stone-400">
            <span className="truncate">Ingreso: {task.fechaIngreso}</span>
            {task.fechaLimite && (
              <span className="shrink-0 font-bold text-amber-600 dark:text-amber-400">
                • Vence: {task.fechaLimite}
              </span>
            )}
          </div>
        )}

        {/* Start Focus (Pomodoro) button */}
        <button
          type="button"
          onClick={() => {
            onStartFocus(task);
            playChime("tick");
          }}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-stone-200/80 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold transition-all min-h-[44px] shrink-0"
          title="Iniciar sesión de enfoque Pomodoro en esta tarea"
        >
          <Timer size={14} className="text-amber-500" />
          <span>Foco</span>
        </button>
      </div>
    </div>
  );
}
