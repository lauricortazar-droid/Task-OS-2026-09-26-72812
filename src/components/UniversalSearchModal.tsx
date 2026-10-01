import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  X,
  ExternalLink,
  FolderOpen,
  Globe,
  Tag,
  Clock,
  ArrowRight,
  Flame,
  CheckCircle2,
} from "lucide-react";
import { TaskItem, GlobalResource, UrlLibraryItem, UniversalSearchResult } from "../types";
import { executeUniversalSearch } from "../lib/executiveRouter";

interface UniversalSearchModalProps {
  isOpen: boolean;
  initialQuery?: string;
  onClose: () => void;
  tasks: TaskItem[];
  globalResources: GlobalResource[];
  urlLibrary?: UrlLibraryItem[];
  onSelectTask?: (taskId: number) => void;
}

export default function UniversalSearchModal({
  isOpen,
  initialQuery = "",
  onClose,
  tasks,
  globalResources,
  urlLibrary = [],
  onSelectTask,
}: UniversalSearchModalProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<UniversalSearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, initialQuery]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const res = executeUniversalSearch(query, tasks, globalResources, urlLibrary);
    setResults(res);
  }, [query, tasks, globalResources, urlLibrary]);

  if (!isOpen) return null;

  return (
    <div
      id="universal-search-modal-backdrop"
      className="fixed inset-0 z-50 flex items-start justify-center pt-8 sm:pt-16 p-3 sm:p-4 bg-stone-950/75 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="universal-search-modal"
        className="relative w-full max-w-2xl bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-3.5 sm:p-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 flex items-center gap-3">
          <Search size={20} className="text-amber-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Búsqueda Universal (busca en tareas, enlaces adjuntos y archivo global)..."
            className="flex-1 bg-transparent text-sm sm:text-base font-semibold text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
            >
              <X size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-800"
          >
            Esc
          </button>
        </div>

        {/* Results Metadata / Counts */}
        <div className="px-4 py-2 bg-stone-100/70 dark:bg-stone-800/40 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-500">
          <span className="font-medium">
            {query.trim()
              ? `${results.length} resultado(s) unificados encontrados`
              : "Escribe una palabra para buscar en todo el sistema"}
          </span>
          <span className="text-[10px] text-stone-400 hidden sm:inline">
            Índice de tareas ({tasks.length}) • Archivo global ({globalResources.length})
          </span>
        </div>

        {/* Results List */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-2.5 flex-1 min-h-[200px]">
          {query.trim() && results.length === 0 && (
            <div className="text-center py-12 px-4 space-y-2">
              <Search size={32} className="text-stone-300 dark:text-stone-600 mx-auto" />
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                No se encontraron coincidencias para &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-stone-400 max-w-sm mx-auto">
                Prueba con palabras clave más generales, el nombre de una persona o parte de una URL.
              </p>
            </div>
          )}

          {!query.trim() && (
            <div className="text-center py-10 px-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
                <Globe size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-stone-800 dark:text-stone-200">
                  Motor de Recuperación Unificada (Ley del Foco)
                </h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto mt-1">
                  Busca simultáneamente en títulos de tareas, recursos contextuales y el archivo global indexado sin navegación en galerías.
                </p>
              </div>
            </div>
          )}

          {results.map((item) => {
            const isTaskTitle = item.sourceType === "task_title";
            const isTaskResource = item.sourceType === "task_resource";
            const isGlobalResource = item.sourceType === "global_resource";
            const isUrlLibrary = item.sourceType === "url_library";

            return (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/90 hover:border-amber-400 dark:hover:border-amber-600 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isUrlLibrary
                        ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                        : isGlobalResource
                        ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                        : isTaskResource
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {isUrlLibrary ? (
                      <span className="text-base">⭐</span>
                    ) : isGlobalResource ? (
                      <Globe size={18} />
                    ) : isTaskResource ? (
                      <FolderOpen size={18} />
                    ) : (
                      <CheckCircle2 size={18} />
                    )}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isUrlLibrary
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                            : isGlobalResource
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                            : isTaskResource
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                        }`}
                      >
                        {item.source}
                      </span>

                      {item.matchType === "title" && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                          • Coincidencia en título
                        </span>
                      )}
                      {item.matchType === "keyword" && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                          • Coincidencia en palabra clave
                        </span>
                      )}
                    </div>

                    <h5 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 line-clamp-1">
                      {item.title}
                    </h5>

                    {item.url && (
                      <p className="text-[11px] text-stone-400 truncate max-w-md font-mono">
                        {item.url}
                      </p>
                    )}

                    {/* Keywords tags for global resources */}
                    {item.keywords && item.keywords.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        {item.keywords.map((kw, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-medium"
                          >
                            <Tag size={9} />
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold transition-colors min-h-[36px]"
                    >
                      <span>Abrir</span>
                      <ExternalLink size={13} />
                    </a>
                  )}

                  {item.taskId && onSelectTask && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTask(item.taskId!);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900 text-xs font-bold hover:opacity-90 transition-opacity min-h-[36px]"
                    >
                      <span>Ir a Tarea #{item.taskId}</span>
                      <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-stone-50 dark:bg-stone-900/90 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-500">
          <span className="flex items-center gap-1">
            <Flame size={13} className="text-amber-500" />
            Ley del Foco: Recursos accesibles exclusivamente por búsqueda universal
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold hover:bg-stone-300 dark:hover:bg-stone-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
