import React from "react";
import {
  ShieldCheck,
  Timer,
  RotateCcw,
  Users,
  Tag as TagIcon,
  Cloud,
  Smartphone,
  Laptop,
  RefreshCw,
  Search,
  Download,
  Bookmark,
  Bell,
  BellRing,
} from "lucide-react";
import { SyncStatus } from "../types";

interface HeaderProps {
  onOpenPomodoro: () => void;
  isPomodoroActive: boolean;
  essentialTaskName?: string | null;
  onOpenContacts: () => void;
  onOpenTags?: () => void;
  onResetLedger: () => void;
  syncStatus: SyncStatus;
  onOpenSync: () => void;
  onOpenConnectionMenu?: () => void;
  onOpenWorkspaceModal?: () => void;
  onOpenUniversalSearch?: () => void;
  onOpenExportImport?: () => void;
  onOpenUrlLibrary?: () => void;
  urlCount?: number;
  onOpenNotifications?: () => void;
  isPushActive?: boolean;
  unreadSolicitudesCount?: number;
}

export default function Header({
  onOpenPomodoro,
  isPomodoroActive,
  essentialTaskName,
  onOpenContacts,
  onOpenTags,
  onResetLedger,
  syncStatus,
  onOpenSync,
  onOpenConnectionMenu,
  onOpenWorkspaceModal,
  onOpenUniversalSearch,
  onOpenExportImport,
  onOpenUrlLibrary,
  urlCount = 0,
  onOpenNotifications,
  isPushActive = false,
  unreadSolicitudesCount = 0,
}: HeaderProps) {
  const emailShort = syncStatus.email ? syncStatus.email.split("@")[0] : "Nube";
  const handleOpenSyncMenu = onOpenConnectionMenu || onOpenSync;

  return (
    <header className="border-b border-stone-200 dark:border-stone-800 bg-white/85 dark:bg-stone-900/85 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-950 flex items-center justify-center font-bold text-sm sm:text-base shadow-sm">
            T
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-base md:text-lg font-bold text-stone-900 dark:text-stone-100 tracking-tight">
                TASK-OS
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <ShieldCheck size={11} /> Activo
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-stone-500 dark:text-stone-400 truncate max-w-[130px] sm:max-w-none">
              Sistema Operativo Personal • Pepe Cortazar
            </p>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Universal Search Header Shortcut */}
          {onOpenUniversalSearch && (
            <button
              id="header-universal-search-btn"
              onClick={onOpenUniversalSearch}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-100 hover:bg-stone-200/80 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs sm:text-sm font-semibold transition-all shadow-2xs min-h-[44px]"
              title="Búsqueda Universal (Recuperación Unificada)"
            >
              <Search size={15} className="text-amber-500" />
              <span className="hidden sm:inline">Buscar</span>
            </button>
          )}

          {/* URL Library Header Shortcut */}
          {onOpenUrlLibrary && (
            <button
              id="header-urls-btn"
              onClick={onOpenUrlLibrary}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:border-amber-400 dark:hover:border-amber-500 text-stone-800 dark:text-stone-200 text-xs sm:text-sm font-semibold transition-all shadow-2xs min-h-[44px]"
              title="Biblioteca de URLs del Día a Día (Suno, ChatGPT, Canva...)"
            >
              <Bookmark size={15} className="text-amber-500" />
              <span>Biblioteca URLs</span>
              {typeof urlCount === "number" && urlCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 font-bold">
                  {urlCount}
                </span>
              )}
            </button>
          )}

          {/* Cloud Sync & Connection Menu Button (Phone ↔ PC & Workspace) */}
          <button
            id="header-cloud-sync-btn"
            onClick={handleOpenSyncMenu}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl border text-xs sm:text-sm font-semibold transition-all shadow-2xs min-h-[44px] active:scale-95 ${
              syncStatus.isSyncing
                ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                : unreadSolicitudesCount > 0
                ? "border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200"
                : "border-stone-200 dark:border-stone-700 bg-stone-100 hover:bg-stone-200/80 dark:bg-stone-800 dark:hover:bg-stone-700/80 text-stone-800 dark:text-stone-200"
            }`}
            title={`Sincronizado con correo: ${syncStatus.email}. Clic para abrir Menú de Conexión & Sincronización.`}
          >
            <div className="relative">
              <Cloud
                size={16}
                className={
                  syncStatus.isSyncing
                    ? "animate-spin text-amber-500"
                    : "text-emerald-600 dark:text-emerald-400"
                }
              />
              {unreadSolicitudesCount > 0 ? (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-1 ring-white dark:ring-stone-900 animate-pulse" />
              ) : (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-stone-900" />
              )}
            </div>
            <span className="hidden md:inline text-xs font-semibold">
              {syncStatus.email}
            </span>
            <span className="inline md:hidden text-xs font-bold text-amber-600 dark:text-amber-400">
              Sincronizar
            </span>
          </button>

          {/* FCM Push Notifications & Centro de Solicitudes Bell Button (Desktop only, mobile has it in Sync Menu) */}
          {onOpenNotifications && (
            <button
              id="header-notifications-btn"
              onClick={onOpenNotifications}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs sm:text-sm font-semibold transition-all shadow-2xs min-h-[44px] relative active:scale-95 ${
                unreadSolicitudesCount > 0
                  ? "border-rose-400 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 shadow-sm shadow-rose-500/20"
                  : isPushActive
                  ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200"
                  : "border-stone-200 dark:border-stone-700 bg-stone-100 hover:bg-stone-200/80 dark:bg-stone-800 dark:hover:bg-stone-700/80 text-stone-700 dark:text-stone-300"
              }`}
              title={
                unreadSolicitudesCount > 0
                  ? `${unreadSolicitudesCount} solicitud(es) nueva(s) en espera. Clic para ver Centro de Notificaciones.`
                  : isPushActive
                  ? "Notificaciones Push Activas (FCM). Clic para ver Centro de Notificaciones y Solicitudes."
                  : "Centro de Notificaciones & Solicitudes (Push + Email)."
              }
            >
              <div className="relative">
                {unreadSolicitudesCount > 0 ? (
                  <BellRing size={16} className="text-rose-600 dark:text-rose-400 animate-bounce" />
                ) : isPushActive ? (
                  <BellRing size={16} className="text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Bell size={16} className="text-stone-500" />
                )}
                {unreadSolicitudesCount > 0 ? (
                  <span className="absolute -top-2 -right-2 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black leading-tight ring-2 ring-white dark:ring-stone-900 animate-pulse">
                    {unreadSolicitudesCount}
                  </span>
                ) : (
                  <span
                    className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-stone-900 ${
                      isPushActive ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
                    }`}
                  />
                )}
              </div>
              <span className="hidden md:inline text-xs font-semibold">
                {unreadSolicitudesCount > 0
                  ? `Solicitudes (${unreadSolicitudesCount})`
                  : isPushActive
                  ? "Push Activo"
                  : "Alertas"}
              </span>
            </button>
          )}

          {/* Google Workspace & Firebase Hub button (Desktop only, mobile has it in Sync Menu) */}
          {onOpenWorkspaceModal && (
            <button
              id="header-workspace-btn"
              onClick={onOpenWorkspaceModal}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:border-amber-400 dark:hover:border-amber-500 text-stone-800 dark:text-stone-200 text-xs sm:text-sm font-semibold transition-all shadow-2xs min-h-[44px]"
              title="Google Workspace & Firebase Hub (Contacts, Calendar, Tasks, Sheets, Keep, Firestore)"
            >
              <div className="w-5 h-5 rounded-lg bg-gradient-to-tr from-amber-500 via-rose-500 to-blue-500 p-0.5 flex items-center justify-center shrink-0">
                <div className="w-full h-full bg-white dark:bg-stone-900 rounded-[5px] flex items-center justify-center text-[10px] font-black text-amber-500">
                  G
                </div>
              </div>
              <span>Workspace & Cloud</span>
            </button>
          )}

          {onOpenTags && (
            <button
              id="header-tags-btn"
              onClick={onOpenTags}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-100 hover:bg-stone-200/80 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs sm:text-sm font-semibold transition-all shadow-2xs min-h-[44px]"
              title="Gestionar Etiquetas (Prioridad, Zona, Área)"
            >
              <TagIcon size={14} />
              <span className="hidden sm:inline">Etiquetas</span>
            </button>
          )}

          <button
            id="header-contacts-btn"
            onClick={onOpenContacts}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs sm:text-sm font-semibold transition-all shadow-2xs min-h-[44px]"
            title="Agenda de Contactos para WhatsApp"
          >
            <Users size={14} />
            <span>Contactos</span>
          </button>

          <button
            id="header-pomodoro-btn"
            onClick={onOpenPomodoro}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-xs sm:text-sm transition-all shadow-2xs min-h-[44px] ${
              isPomodoroActive
                ? "bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold"
                : "bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200"
            }`}
            title="Activar sesión de enfoque Pomodoro (Ley 27)"
          >
            <Timer size={16} />
            <span className="hidden sm:inline">
              {isPomodoroActive ? "Pomodoro Activo" : "Modo Enfoque"}
            </span>
            <span className="sm:hidden text-xs">Foco</span>
          </button>

          <button
            id="header-reset-ledger-btn"
            onClick={onResetLedger}
            className="hidden sm:flex p-2.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors min-h-[44px] min-w-[44px] items-center justify-center"
            title="Reiniciar con tareas demo iniciales"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}

