import React from "react";
import { FolderKanban, Globe, ChevronDown, X, Search, Download, Upload } from "lucide-react";
import { TaskItem } from "../types";

interface ActiveTaskSelectorProps {
  activeTaskId: number | null;
  tasks: TaskItem[];
  onSelectActiveTask: (taskId: number | null) => void;
  onOpenUniversalSearch: () => void;
  onOpenExportImport: () => void;
}

export default function ActiveTaskSelector({
  activeTaskId,
  tasks,
  onSelectActiveTask,
  onOpenUniversalSearch,
  onOpenExportImport,
}: ActiveTaskSelectorProps) {
  const activeTasks = tasks.filter((t) => t.estado !== "Completado");
  const selectedTask = tasks.find((t) => t.id === activeTaskId);

  return (
    <div
      id="executive-context-bar"
      className="p-2 sm:p-2.5 rounded-2xl bg-stone-100/90 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/80 flex flex-wrap items-center justify-between gap-2 text-xs"
    >
      {/* Context Selector: Active Task vs Global Mode */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 shrink-0 hidden sm:inline">
          Contexto de Enrutamiento:
        </span>

        <div className="relative inline-flex items-center min-w-0 max-w-full sm:max-w-md">
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mr-1.5 ${
              selectedTask
                ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                : "bg-blue-500/20 text-blue-600 dark:text-blue-400"
            }`}
          >
            {selectedTask ? <FolderKanban size={13} /> : <Globe size={13} />}
          </div>

          <select
            id="active-task-context-select"
            value={activeTaskId ? String(activeTaskId) : ""}
            onChange={(e) => {
              const val = e.target.value;
              onSelectActiveTask(val ? parseInt(val, 10) : null);
            }}
            className={`appearance-none text-xs font-semibold rounded-xl pl-2.5 pr-7 py-1.5 border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-2xs truncate max-w-[260px] sm:max-w-[340px] ${
              selectedTask
                ? "bg-white dark:bg-stone-900 border-amber-300 dark:border-amber-700/80 text-amber-950 dark:text-amber-200"
                : "bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300"
            }`}
            title="Selecciona la tarea activa para enrutar URLs a su contexto local, o elige Modo Global"
          >
            <option value="">🌐 Modo Global (Sin tarea activa • Enruta a índice universal)</option>
            <optgroup label="Tareas en curso (Contexto Local)">
              {activeTasks.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  #{t.id} {t.tarea.slice(0, 45)}
                  {t.tarea.length > 45 ? "..." : ""} ({t.solicitante})
                </option>
              ))}
            </optgroup>
          </select>

          <ChevronDown
            size={12}
            className="absolute right-2 pointer-events-none text-stone-400"
          />
        </div>

        {selectedTask && (
          <button
            type="button"
            onClick={() => onSelectActiveTask(null)}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
            title="Cambiar a Modo Global"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Quick Action Shortcuts: Universal Search & Backup JSON */}
      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
        <button
          type="button"
          id="open-universal-search-btn"
          onClick={onOpenUniversalSearch}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-300 font-bold text-xs transition-colors min-h-[34px]"
          title="Búsqueda Universal en tareas, recursos y archivo global"
        >
          <Search size={13} />
          <span>Búsqueda Universal</span>
        </button>

        <button
          type="button"
          id="open-export-import-btn"
          onClick={onOpenExportImport}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-200/70 hover:bg-stone-200 dark:bg-stone-700/60 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-semibold text-xs transition-colors min-h-[34px]"
          title="Exportar / Importar respaldo JSON"
        >
          <Download size={13} />
          <span className="hidden sm:inline">JSON</span>
        </button>
      </div>
    </div>
  );
}
