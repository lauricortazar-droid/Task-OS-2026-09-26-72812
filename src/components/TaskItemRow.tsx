import React, { useState, useEffect } from "react";
import {
  Star,
  Timer,
  CheckCircle2,
  Clock,
  AlertCircle,
  Image as ImageIcon,
  Phone,
  Tag as TagIcon,
  X,
  FileText,
  Check,
  Edit3,
  ChevronDown,
  ChevronUp,
  Link2,
  ExternalLink,
} from "lucide-react";
import { TaskItem, TagItem } from "../types";
import { getTagColorClass } from "../utils/tagColors";
import { playChime } from "../utils/audio";
import TaskResourceCard from "./TaskResourceCard";

interface TaskItemRowProps {
  task: TaskItem;
  isEsencial: boolean;
  isSecundaria: boolean;
  availableTags?: TagItem[];
  onToggleStatus: (id: number) => void;
  onSetStatus: (id: number, newStatus: "Pendiente" | "En Proceso" | "Completado") => void;
  onStartFocus: (task: TaskItem) => void;
  onSetEsencial: (id: number) => void;
  onOpenWhatsApp: (task: TaskItem) => void;
  onToggleTaskTag?: (taskId: number, tagName: string) => void;
  onTagFilterSelect?: (tagName: string) => void;
  onViewImage: (src: string, title: string) => void;
  onUpdateNotes: (taskId: number, notes: string) => void;
}

export default function TaskItemRow({
  task,
  isEsencial,
  isSecundaria,
  availableTags = [],
  onToggleStatus,
  onSetStatus,
  onStartFocus,
  onSetEsencial,
  onOpenWhatsApp,
  onToggleTaskTag,
  onTagFilterSelect,
  onViewImage,
  onUpdateNotes,
}: TaskItemRowProps) {
  const isDone = task.estado === "Completado";

  // State for sub-notes textarea
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [draftNotes, setDraftNotes] = useState(task.notas || "");
  const [savedFeedback, setSavedFeedback] = useState(false);

  // Popover state for assigning tags
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);

  // Sync draftNotes if task.notas changes externally
  useEffect(() => {
    setDraftNotes(task.notas || "");
  }, [task.notas]);

  const handleSaveNotes = () => {
    const trimmed = draftNotes.trim();
    if (trimmed !== (task.notas || "")) {
      onUpdateNotes(task.id, trimmed);
      playChime("tick");
    }
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  const handleClearNotes = () => {
    if (window.confirm("¿Eliminar las observaciones de esta tarea?")) {
      setDraftNotes("");
      onUpdateNotes(task.id, "");
      setIsNotesOpen(false);
      playChime("tick");
    }
  };

  const getStatusBadge = () => {
    switch (task.estado) {
      case "Pendiente":
        return (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onSetStatus(task.id, "En Proceso");
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 cursor-pointer hover:bg-amber-100 transition-all select-none"
            title="Click para cambiar a: En Proceso"
          >
            <Clock size={12} />
            Pendiente
          </span>
        );
      case "En Proceso":
        return (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onSetStatus(task.id, "Completado");
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60 cursor-pointer hover:bg-blue-100 transition-all select-none"
            title="Click para cambiar a: Completado"
          >
            <AlertCircle size={12} />
            En Proceso
          </span>
        );
      case "Completado":
        return (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onSetStatus(task.id, "Pendiente");
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 cursor-pointer hover:bg-emerald-100 transition-all select-none"
            title="Click para reabrir tarea"
          >
            <CheckCircle2 size={12} />
            Completado
          </span>
        );
    }
  };

  return (
    <tr
      id={`task-row-${task.id}`}
      className={`group hover:bg-stone-50/70 dark:hover:bg-stone-800/40 transition-colors ${
        isEsencial
          ? "bg-amber-50/40 dark:bg-amber-950/15"
          : isDone
          ? "opacity-60 bg-stone-50/30 dark:bg-stone-900/40"
          : ""
      }`}
    >
      {/* Column 1: ID */}
      <td className="py-3.5 px-3 sm:px-4 font-mono font-bold text-stone-500 dark:text-stone-400 text-center align-top pt-4">
        #{task.id}
      </td>

      {/* Column 2: Solicitante */}
      <td className="py-3.5 px-3 sm:px-4 align-top pt-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-stone-800 dark:text-stone-200">
              {task.solicitante}
            </span>
            {task.contacto?.telefono && (
              <button
                type="button"
                onClick={() => onOpenWhatsApp(task)}
                className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors"
                title={`Enviar WhatsApp a ${task.solicitante} (${task.contacto.telefono})`}
              >
                <Phone size={11} />
              </button>
            )}
          </div>
          {task.dominio && (
            <span className="text-[10px] uppercase tracking-wider text-stone-400 font-medium">
              {task.dominio}
            </span>
          )}
        </div>
      </td>

      {/* Column 3: Tarea + Sub-notes / Observations + Tags */}
      <td className="py-3.5 px-3 sm:px-4 align-top pt-4">
        <div className="flex items-start gap-2">
          {isEsencial && (
            <span
              className="mt-0.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 shrink-0"
              title="Tarea Esencial (Ley 8: Ley del Foco)"
            >
              <Star size={10} className="fill-current" />
              Esencial
            </span>
          )}
          {isSecundaria && !isEsencial && (
            <span className="mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 shrink-0">
              Secundaria
            </span>
          )}

          {/* Attached reference image thumbnail */}
          {task.imagenReferencia && (
            <button
              type="button"
              onClick={() =>
                onViewImage(task.imagenReferencia!, `Referencia: ${task.tarea}`)
              }
              className="relative w-7 h-7 rounded-md overflow-hidden border border-stone-300 dark:border-stone-700 bg-stone-100 hover:ring-2 hover:ring-amber-500 transition-all shrink-0 mt-0.5 group"
              title="Ver imagen de referencia adjunta"
            >
              <img
                src={task.imagenReferencia}
                alt="Referencia"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors flex items-center justify-center">
                <ImageIcon size={11} className="text-white drop-shadow-xs" />
              </div>
            </button>
          )}

          <div className="flex-1 min-w-0 space-y-2">
            {/* Main Task Description */}
            <span
              className={`font-medium text-stone-900 dark:text-stone-100 leading-snug block ${
                isDone ? "line-through text-stone-400 dark:text-stone-500" : ""
              }`}
            >
              {task.tarea}
            </span>

            {/* Persistent Sub-notes / Observations Display (Uncluttered Compact View) */}
            {task.notas && !isNotesOpen && (
              <div
                onClick={() => setIsNotesOpen(true)}
                className="group/note cursor-pointer rounded-lg bg-stone-50/90 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800 p-2 text-xs flex items-start gap-2 hover:border-amber-400/70 dark:hover:border-amber-700/60 transition-colors"
                title="Haz clic para ver o editar las observaciones completas"
              >
                <FileText
                  size={13}
                  className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900/80 dark:text-amber-300/80">
                      Observaciones:
                    </span>
                    <span className="text-[10px] text-stone-400 opacity-0 group-hover/note:opacity-100 transition-opacity flex items-center gap-0.5">
                      <Edit3 size={10} /> Editar
                    </span>
                  </div>
                  <p className="text-stone-700 dark:text-stone-300 whitespace-pre-wrap line-clamp-2 leading-relaxed text-[11px] sm:text-xs">
                    {task.notas}
                  </p>
                </div>
              </div>
            )}

            {/* Contextual Task Resources (Ley del Foco) con Thumbnail & Favicon Google API */}
            {task.resources && task.resources.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {task.resources.map((res, idx) => (
                  <TaskResourceCard
                    key={`${res.url}-${idx}`}
                    resource={res}
                    compact={true}
                  />
                ))}
              </div>
            )}

            {/* Sub-notes Text Area Editor (Expanded Mode) */}
            {isNotesOpen && (
              <div
                id={`task-notes-panel-${task.id}`}
                className="rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/40 dark:bg-amber-950/20 p-2.5 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FileText size={12} className="text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                      Sub-notas u observaciones
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {savedFeedback && (
                      <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                        <Check size={11} /> Guardado
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsNotesOpen(false)}
                      className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 p-0.5 rounded"
                      title="Cerrar panel de notas"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>

                <textarea
                  id={`task-notes-textarea-${task.id}`}
                  value={draftNotes}
                  onChange={(e) => {
                    setDraftNotes(e.target.value);
                    setSavedFeedback(false);
                  }}
                  onBlur={handleSaveNotes}
                  rows={3}
                  placeholder="Añade observaciones, especificaciones, acuerdos o sub-notas aquí sin alterar la tarea principal..."
                  className="w-full text-xs font-normal text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-stone-400 leading-relaxed resize-y"
                />

                <div className="flex items-center justify-between text-xs pt-0.5">
                  <span className="text-[10px] text-stone-400 italic">
                    Persistente • Se guarda al desenfocar o pulsar Guardar
                  </span>
                  <div className="flex items-center gap-1.5">
                    {task.notas && (
                      <button
                        type="button"
                        onClick={handleClearNotes}
                        className="px-2 py-1 rounded text-[11px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        Eliminar nota
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveNotes}
                      className="px-2.5 py-1 rounded-md bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-semibold text-[11px] hover:opacity-90 transition-opacity flex items-center gap-1 shadow-xs"
                    >
                      <Check size={11} />
                      <span>Guardar</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Metadata Bar: Tags + Sub-notes Toggle */}
            <div className="flex items-center gap-2 flex-wrap pt-0.5">
              {/* Note toggle button */}
              <button
                type="button"
                id={`task-notes-toggle-${task.id}`}
                onClick={() => setIsNotesOpen(!isNotesOpen)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                  task.notas
                    ? "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 hover:bg-amber-100"
                    : "border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
                }`}
                title={task.notas ? "Ver o editar sub-notas" : "Añadir sub-notas a esta tarea"}
              >
                <FileText size={10} />
                <span>
                  {task.notas
                    ? isNotesOpen
                      ? "Ocultar notas"
                      : "Ver notas"
                    : "+ Observación / Nota"}
                </span>
                {isNotesOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>

              {/* Task tags chips */}
              {task.etiquetas &&
                task.etiquetas.map((tName) => {
                  const tagObj = availableTags.find((t) => t.nombre === tName);
                  const color = tagObj?.color || "stone";
                  return (
                    <span
                      key={tName}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTagFilterSelect?.(tName);
                      }}
                      className={`cursor-pointer inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-all ${getTagColorClass(
                        color
                      )} hover:opacity-80`}
                      title={`Filtrar por etiqueta: ${tName}`}
                    >
                      {tName}
                    </span>
                  );
                })}

              {/* Quick Add/Edit Tag Popover */}
              {onToggleTaskTag && availableTags.length > 0 && (
                <div className="relative inline-block">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTagPopoverOpen(!isTagPopoverOpen);
                    }}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                    title="Asignar o quitar etiquetas a esta tarea"
                  >
                    <TagIcon size={10} />
                    <span>
                      {task.etiquetas && task.etiquetas.length > 0 ? "+" : "+ Etiqueta"}
                    </span>
                  </button>

                  {isTagPopoverOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-full mt-1 w-52 p-2 bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-700 z-50 animate-in fade-in zoom-in-95 duration-100"
                    >
                      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-stone-100 dark:border-stone-800 text-[11px] font-semibold text-stone-700 dark:text-stone-200">
                        <span>Etiquetas de la tarea</span>
                        <button
                          type="button"
                          onClick={() => setIsTagPopoverOpen(false)}
                          className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {availableTags.map((tag) => {
                          const isChecked = task.etiquetas?.includes(tag.nombre);
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => onToggleTaskTag(task.id, tag.nombre)}
                              className={`w-full flex items-center justify-between px-2 py-1 rounded text-left text-xs transition-colors ${
                                isChecked
                                  ? "bg-stone-100 dark:bg-stone-800 font-medium"
                                  : "hover:bg-stone-50 dark:hover:bg-stone-800/50 text-stone-600 dark:text-stone-400"
                              }`}
                            >
                              <span className="flex items-center gap-1.5">
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    isChecked
                                      ? "bg-amber-600 dark:bg-amber-400"
                                      : "bg-stone-300 dark:bg-stone-600"
                                  }`}
                                />
                                <span>{tag.nombre}</span>
                              </span>
                              <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-stone-400 font-mono">
                                {tag.categoria === "prioridad"
                                  ? "Prio"
                                  : tag.categoria === "zona"
                                  ? "Zona"
                                  : "Área"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Column 4: Estado */}
      <td className="py-3.5 px-3 sm:px-4 text-center align-top pt-4">
        {getStatusBadge()}
      </td>

      {/* Column 5: Fecha de Ingreso y Fecha Límite */}
      <td className="py-3.5 px-3 sm:px-4 font-mono text-xs text-stone-500 dark:text-stone-400 text-center whitespace-nowrap align-top pt-4">
        <div>{task.fechaIngreso}</div>
        {task.fechaLimite && (
          <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <span>📅 {task.fechaLimite}</span>
          </div>
        )}
      </td>

      {/* Column 6: Acciones */}
      <td className="py-3.5 px-3 sm:px-4 text-right align-top pt-4">
        <div className="flex items-center justify-end gap-1">
          {!isDone && (
            <button
              id={`focus-task-btn-${task.id}`}
              onClick={() => onStartFocus(task)}
              className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-100/70 dark:hover:bg-amber-950/60 transition-colors"
              title="Iniciar Pomodoro en esta tarea (Ley 27)"
            >
              <Timer size={16} />
            </button>
          )}
          {!isDone && !isEsencial && (
            <button
              onClick={() => onSetEsencial(task.id)}
              className="p-1.5 rounded-lg text-stone-400 hover:text-amber-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="Definir como Tarea Esencial"
            >
              <Star size={16} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
