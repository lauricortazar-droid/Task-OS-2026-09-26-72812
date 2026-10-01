import React, { useState, useRef } from "react";
import { Download, Upload, X, FileJson, Check, AlertTriangle, Cloud, Bookmark } from "lucide-react";
import { TaskItem, GlobalResource, UrlLibraryItem, TaskOSExportData, Contact, TagItem } from "../types";
import { playChime } from "../utils/audio";

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskItem[];
  globalResources: GlobalResource[];
  urlLibrary?: UrlLibraryItem[];
  contacts?: Contact[];
  tags?: TagItem[];
  esencialTaskId?: number | null;
  onImportData: (data: TaskOSExportData) => void;
}

export default function ExportImportModal({
  isOpen,
  onClose,
  tasks,
  globalResources,
  urlLibrary = [],
  contacts,
  tags,
  esencialTaskId,
  onImportData,
}: ExportImportModalProps) {
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExport = () => {
    try {
      const exportPayload: TaskOSExportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        tasks,
        globalResources,
        urlLibrary,
        contacts,
        tags,
        esencialTaskId,
      };

      const jsonStr = JSON.stringify(exportPayload, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      link.href = url;
      link.download = `task-os-backup-${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      playChime("success");
      setImportStatus("Respaldo exportado exitosamente.");
    } catch (err: any) {
      console.error("Export error:", err);
      setErrorMsg("Error al generar el archivo JSON de respaldo.");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed || (!Array.isArray(parsed.tasks) && !Array.isArray(parsed.globalResources) && !Array.isArray(parsed.urlLibrary))) {
          throw new Error("El archivo JSON no contiene una estructura válida de Task-OS.");
        }

        const validTasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
        const validGlobal = Array.isArray(parsed.globalResources) ? parsed.globalResources : [];
        const validUrlLib = Array.isArray(parsed.urlLibrary) ? parsed.urlLibrary : [];

        onImportData({
          version: parsed.version || 1,
          exportedAt: parsed.exportedAt || new Date().toISOString(),
          tasks: validTasks,
          globalResources: validGlobal,
          urlLibrary: validUrlLib,
          contacts: Array.isArray(parsed.contacts) ? parsed.contacts : undefined,
          tags: Array.isArray(parsed.tags) ? parsed.tags : undefined,
          esencialTaskId: typeof parsed.esencialTaskId === "number" ? parsed.esencialTaskId : null,
        });

        playChime("success");
        setImportStatus(
          `Importación exitosa: ${validTasks.length} tareas, ${validGlobal.length} recursos globales y ${validUrlLib.length} enlaces de biblioteca cargados.`
        );
        setErrorMsg(null);
      } catch (err: any) {
        console.error("Import error:", err);
        setErrorMsg(err.message || "Error al procesar el archivo JSON.");
        setImportStatus(null);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div
      id="export-import-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="export-import-modal"
        className="relative w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden p-5 sm:p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <FileJson size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
                Portabilidad y Respaldo JSON
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Exporta o importa el estado completo (tareas + recursos globales)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
          >
            <X size={20} />
          </button>
        </div>

        {importStatus && (
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2">
            <Check size={16} className="text-emerald-600 shrink-0" />
            <span>{importStatus}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-900 dark:text-rose-200 text-xs flex items-center gap-2">
            <AlertTriangle size={16} className="text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Export Button Box */}
          <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                <Download size={14} className="text-amber-500" />
                Exportar Estado JSON
              </h4>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                Descarga un archivo con las {tasks.length} tareas, sus recursos adjuntos y los {globalResources.length} recursos globales indexados.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExport}
              className="w-full py-2.5 px-3 rounded-xl bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900 font-bold text-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 min-h-[42px]"
            >
              <Download size={15} />
              <span>Descargar Respaldo</span>
            </button>
          </div>

          {/* Import Button Box */}
          <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                <Upload size={14} className="text-blue-500" />
                Importar Respaldo JSON
              </h4>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                Carga un archivo de respaldo previo para migrar o restaurar todo el estado en Firestore y almacenamiento local.
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-3 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs hover:bg-amber-400 transition-colors flex items-center justify-center gap-1.5 min-h-[42px]"
            >
              <Upload size={15} />
              <span>Seleccionar Archivo</span>
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-stone-100 dark:border-stone-800 text-[11px] text-stone-400 text-center">
          Garantía de soberanía de datos: Tus tareas y enlaces son 100% portables fuera de Firestore.
        </div>
      </div>
    </div>
  );
}
