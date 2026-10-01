import React, { useState } from "react";
import {
  X,
  Cloud,
  QrCode,
  Smartphone,
  Laptop,
  RefreshCw,
  Bell,
  BellRing,
  Download,
  Users,
  Tag as TagIcon,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Bookmark,
  Printer,
  TrendingUp,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Flame,
  Check,
  Copy,
} from "lucide-react";
import { SyncStatus, WorkspaceTab } from "../types";
import { playChime } from "../utils/audio";

export interface ConnectionSyncMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncStatus: SyncStatus;
  isPushActive?: boolean;
  unreadSolicitudesCount?: number;
  onForceSync: () => void;
  onOpenQRAndCloudSync: () => void;
  onOpenGoogleWorkspace: () => void;
  onOpenNotifications: () => void;
  onOpenExportImport: () => void;
  onOpenContacts: () => void;
  onOpenTags: () => void;
  onNavigateToWorkspace?: (ws: WorkspaceTab) => void;
  onResetLedger?: () => void;
}

export default function ConnectionSyncMenuModal({
  isOpen,
  onClose,
  syncStatus,
  isPushActive = false,
  unreadSolicitudesCount = 0,
  onForceSync,
  onOpenQRAndCloudSync,
  onOpenGoogleWorkspace,
  onOpenNotifications,
  onOpenExportImport,
  onOpenContacts,
  onOpenTags,
  onNavigateToWorkspace,
  onResetLedger,
}: ConnectionSyncMenuModalProps) {
  const [justSynced, setJustSynced] = useState(false);
  const [copiedMcp, setCopiedMcp] = useState(false);

  const mcpUrl = typeof window !== "undefined"
    ? `${window.location.origin}/mcp`
    : "https://ais-pre-dwgikgfu64evytiqb4nzms-347865637985.us-east1.run.app/mcp";

  if (!isOpen) return null;

  const handleCopyMcp = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(mcpUrl);
    setCopiedMcp(true);
    playChime("success");
    setTimeout(() => setCopiedMcp(false), 3000);
  };

  const handleSyncClick = () => {
    onForceSync();
    playChime("tick");
    setJustSynced(true);
    setTimeout(() => setJustSynced(false), 2000);
  };

  const handleAction = (callback: () => void) => {
    playChime("tick");
    onClose();
    callback();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-xl max-h-[92vh] sm:max-h-[85vh] bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile handle indicator */}
        <div className="pt-2 pb-1 flex justify-center sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-stone-300 dark:bg-stone-700" />
        </div>

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Cloud size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-stone-900 dark:text-stone-100 text-base sm:text-lg tracking-tight">
                  Conexión & Sincronización
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  iPhone 16 Pro Max
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Todas las formas de vincular tu celular, computadora y la nube sin botones que se salgan.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/80 dark:hover:bg-stone-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {/* Active Cloud Account Banner */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-stone-900 to-stone-800 text-white dark:from-stone-800 dark:to-stone-900 border border-stone-700 shadow-sm flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={12} />
                <span>Cuenta Conectada en Tiempo Real</span>
              </div>
              <div className="font-bold text-sm truncate text-stone-100 mt-0.5">
                {syncStatus.email || "laurcortazar@gmail.com"}
              </div>
              <div className="text-[11px] text-stone-400 flex items-center gap-2 mt-0.5">
                <span>Firebase Firestore</span>
                <span>·</span>
                <span className="text-emerald-400 font-semibold">Sincronizado</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSyncClick}
              disabled={syncStatus.isSyncing}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 active:scale-95 min-h-[44px] ${
                justSynced
                  ? "bg-emerald-500 text-stone-950"
                  : "bg-amber-500 hover:bg-amber-400 text-stone-950"
              }`}
              title="Forzar sincronización inmediata"
            >
              {justSynced ? (
                <>
                  <Check size={15} />
                  <span>¡Listo!</span>
                </>
              ) : (
                <>
                  <RefreshCw
                    size={15}
                    className={syncStatus.isSyncing ? "animate-spin" : ""}
                  />
                  <span>Sincronizar</span>
                </>
              )}
            </button>
          </div>

          {/* Section: Maneras de Conectarme y Sincronizar */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider px-1">
              Maneras de Conectar & Sincronizar:
            </div>

            <div className="space-y-2">
              {/* Option 1: QR Celular ↔ PC */}
              <div
                onClick={() => handleAction(onOpenQRAndCloudSync)}
                className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/90 hover:border-amber-400 dark:hover:border-amber-500 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs group active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <QrCode size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-stone-900 dark:text-stone-100 text-sm flex items-center gap-1.5">
                      <span>Vincular Celular con Código QR</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-semibold">
                        Móvil ↔ PC
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 leading-snug">
                      Escanea en tu iPhone 16 Pro Max para abrir la misma sesión al instante sin contraseñas.
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-stone-400 group-hover:text-amber-500 shrink-0" />
              </div>

              {/* Option 2: Google Workspace Hub */}
              <div
                onClick={() => handleAction(onOpenGoogleWorkspace)}
                className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/90 hover:border-amber-400 dark:hover:border-amber-500 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs group active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-blue-500 p-0.5 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <div className="w-full h-full bg-white dark:bg-stone-900 rounded-[9px] flex items-center justify-center text-xs font-black text-amber-500">
                      G
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-stone-900 dark:text-stone-100 text-sm flex items-center gap-1.5">
                      <span>Google Workspace & Cloud Hub</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 font-semibold">
                        Google
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 leading-snug">
                      Sincronización con Google Contacts, Google Tasks, Calendar y Google Sheets.
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-stone-400 group-hover:text-amber-500 shrink-0" />
              </div>

              {/* Option 3: Notificaciones Push & Solicitudes */}
              <div
                onClick={() => handleAction(onOpenNotifications)}
                className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/90 hover:border-amber-400 dark:hover:border-amber-500 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs group active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform relative">
                    {unreadSolicitudesCount > 0 ? (
                      <BellRing size={20} className="animate-bounce" />
                    ) : (
                      <Bell size={20} />
                    )}
                    {unreadSolicitudesCount > 0 && (
                      <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black">
                        {unreadSolicitudesCount}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-stone-900 dark:text-stone-100 text-sm flex items-center gap-1.5">
                      <span>Notificaciones Push Móviles & Solicitudes</span>
                      {unreadSolicitudesCount > 0 ? (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500 text-white font-black animate-pulse">
                          {unreadSolicitudesCount} pendientes
                        </span>
                      ) : isPushActive ? (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                          Push Activo
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 leading-snug">
                      Alertas web al móvil cuando termines una tarea y buzón de clientes en espera.
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-stone-400 group-hover:text-amber-500 shrink-0" />
              </div>

              {/* Option 4: Copia de Seguridad & Restauración JSON */}
              <div
                onClick={() => handleAction(onOpenExportImport)}
                className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/90 hover:border-amber-400 dark:hover:border-amber-500 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs group active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Download size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-stone-900 dark:text-stone-100 text-sm flex items-center gap-1.5">
                      <span>Respaldo Offline (JSON Snapshot)</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-semibold">
                        Copia Local
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 leading-snug">
                      Descarga tu copia de seguridad completa o restaura datos desde un archivo.
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-stone-400 group-hover:text-amber-500 shrink-0" />
              </div>

              {/* Option 5: Conectar con Google Gemini (Servidor de MCP) */}
              <div className="p-3.5 rounded-2xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/50 dark:bg-amber-950/20 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Sparkles size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-stone-900 dark:text-stone-100 text-sm flex items-center gap-1.5">
                        <span>Conectar con Google Gemini</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200 font-bold">
                          Servidor MCP
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-600 dark:text-stone-300 mt-0.5 leading-snug">
                        Vincula tu Task-OS con Gemini para consultar, crear y completar tareas desde la IA.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] uppercase font-bold text-stone-400">URL del servidor de MCP:</div>
                    <div className="font-mono text-xs text-amber-700 dark:text-amber-300 truncate select-all">
                      {mcpUrl}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyMcp}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-xs shrink-0 transition-all active:scale-95 min-h-[38px]"
                  >
                    {copiedMcp ? <Check size={14} className="text-emerald-950" /> : <Copy size={14} />}
                    <span>{copiedMcp ? "¡Copiado!" : "Copiar"}</span>
                  </button>
                </div>

                <div className="text-[10px] text-stone-500 dark:text-stone-400 leading-relaxed bg-white/70 dark:bg-stone-900/60 p-2 rounded-lg border border-amber-200/60 dark:border-amber-900/40">
                  <strong>Instrucciones rápidas para Gemini:</strong><br />
                  1. Pega esta URL en el campo <em>"URL del servidor de MCP"</em>.<br />
                  2. En <em>"Configuración adicional"</em> (ID y Secreto), déjalo <strong>vacío</strong>.<br />
                  3. Haz clic en <strong>Siguiente</strong> y Gemini detectará tus herramientas al instante.
                </div>
              </div>
            </div>
          </div>

          {/* Section: Accesos Rápidos Complementarios (No más iconos desbordados) */}
          <div className="space-y-2 pt-2 border-t border-stone-200 dark:border-stone-800">
            <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider px-1">
              Accesos Directos a Módulos (Sin Saturar la Barra Móvil):
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {/* URLs Library */}
              <button
                type="button"
                onClick={() =>
                  handleAction(() => onNavigateToWorkspace && onNavigateToWorkspace("urls"))
                }
                className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 hover:bg-stone-100 dark:hover:bg-stone-800 text-left transition-colors flex items-center gap-2 min-h-[44px]"
              >
                <Bookmark size={15} className="text-amber-500 shrink-0" />
                <span className="font-semibold text-stone-800 dark:text-stone-200 truncate">
                  Biblioteca URLs
                </span>
              </button>

              {/* Print Station */}
              <button
                type="button"
                onClick={() =>
                  handleAction(() => onNavigateToWorkspace && onNavigateToWorkspace("print"))
                }
                className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 hover:bg-stone-100 dark:hover:bg-stone-800 text-left transition-colors flex items-center gap-2 min-h-[44px]"
              >
                <Printer size={15} className="text-blue-500 shrink-0" />
                <span className="font-semibold text-stone-800 dark:text-stone-200 truncate">
                  Print Station
                </span>
              </button>

              {/* Rendimiento Semanal */}
              <button
                type="button"
                onClick={() =>
                  handleAction(() => onNavigateToWorkspace && onNavigateToWorkspace("analytics"))
                }
                className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 hover:bg-stone-100 dark:hover:bg-stone-800 text-left transition-colors flex items-center gap-2 min-h-[44px]"
              >
                <TrendingUp size={15} className="text-emerald-500 shrink-0" />
                <span className="font-semibold text-stone-800 dark:text-stone-200 truncate">
                  Rendimiento 📊
                </span>
              </button>

              {/* Contactos */}
              <button
                type="button"
                onClick={() => handleAction(onOpenContacts)}
                className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 hover:bg-stone-100 dark:hover:bg-stone-800 text-left transition-colors flex items-center gap-2 min-h-[44px]"
              >
                <Users size={15} className="text-indigo-500 shrink-0" />
                <span className="font-semibold text-stone-800 dark:text-stone-200 truncate">
                  Contactos
                </span>
              </button>

              {/* Etiquetas */}
              <button
                type="button"
                onClick={() => handleAction(onOpenTags)}
                className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 hover:bg-stone-100 dark:hover:bg-stone-800 text-left transition-colors flex items-center gap-2 min-h-[44px]"
              >
                <TagIcon size={15} className="text-pink-500 shrink-0" />
                <span className="font-semibold text-stone-800 dark:text-stone-200 truncate">
                  Etiquetas
                </span>
              </button>

              {/* Reiniciar Demo */}
              {onResetLedger && (
                <button
                  type="button"
                  onClick={() => handleAction(onResetLedger)}
                  className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 hover:bg-stone-100 dark:hover:bg-stone-800 text-left transition-colors flex items-center gap-2 min-h-[44px] text-stone-500"
                >
                  <RotateCcw size={15} className="shrink-0" />
                  <span className="font-semibold truncate">Reiniciar Ledger</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer info for iPhone 16 Pro Max */}
        <div className="p-3 bg-stone-100 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-500 px-4 sm:px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <span className="flex items-center gap-1.5">
            <Smartphone size={13} className="text-amber-500" />
            Diseño Mobile-First optimizado para iPhone 16 Pro Max
          </span>
          <span className="font-mono text-stone-400">430 × 932 pt</span>
        </div>
      </div>
    </div>
  );
}
