import React from "react";
import { SyncStatus, WorkspaceTab } from "../types";
import { Cloud, RefreshCw } from "lucide-react";

interface MobileNavBarProps {
  activeCount: number;
  urlsCount?: number;
  isPomodoroActive: boolean;
  syncStatus: SyncStatus;
  currentWorkspace?: WorkspaceTab;
  onChangeWorkspace?: (ws: WorkspaceTab) => void;
  onNewTaskClick: () => void;
  onOpenPomodoro: () => void;
  onOpenSync: () => void;
  onOpenConnectionMenu?: () => void;
  onOpenContacts: () => void;
  onScrollToLedger: () => void;
  onOpenNotifications?: () => void;
  unreadSolicitudesCount?: number;
}

export default function MobileNavBar({
  activeCount,
  urlsCount = 0,
  isPomodoroActive,
  syncStatus,
  currentWorkspace = "task-os",
  onChangeWorkspace,
  onNewTaskClick,
  onOpenPomodoro,
  onOpenSync,
  onOpenConnectionMenu,
  onOpenContacts,
  onScrollToLedger,
  onOpenNotifications,
  unreadSolicitudesCount = 0,
}: MobileNavBarProps) {
  const handleOpenSyncMenu = onOpenConnectionMenu || onOpenSync;

  const isMoreTabActive =
    currentWorkspace === "urls" ||
    currentWorkspace === "print" ||
    currentWorkspace === "analytics";

  return (
    <nav
      id="mobile-bottom-nav"
      aria-label="Navegación móvil iPhone 16 Pro Max"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 px-2 py-1 shadow-lg pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="grid grid-cols-5 gap-1 items-center max-w-md mx-auto w-full">
        {/* 1. Task-OS Tab: 🔥 */}
        <button
          type="button"
          onClick={() => {
            if (onChangeWorkspace) onChangeWorkspace("task-os");
            onScrollToLedger();
          }}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl min-h-[48px] w-full relative transition-all active:scale-95 ${
            currentWorkspace === "task-os"
              ? "bg-[#042f66] text-white shadow-md shadow-[#042f66]/25 ring-2 ring-[#042f66]/20 font-bold"
              : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800"
          }`}
          title="Task-OS: 🔥"
          aria-label="Task-OS: 🔥"
        >
          <span className="text-lg leading-none">🔥</span>
          <span className="text-[10px] tracking-tight mt-0.5 font-semibold">Task</span>
          {activeCount > 0 && (
            <span className="absolute top-1 right-2 px-1.5 py-0.2 rounded-full bg-[#f2ad00] text-[#1d1d1b] text-[8px] font-black leading-tight shadow-xs">
              {activeCount}
            </span>
          )}
        </button>

        {/* 2. Lonas Tab: 💻 */}
        <button
          type="button"
          onClick={() => onChangeWorkspace && onChangeWorkspace("lonas")}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl min-h-[48px] w-full relative transition-all active:scale-95 ${
            currentWorkspace === "lonas"
              ? "bg-[#042f66] text-white shadow-md shadow-[#042f66]/25 ring-2 ring-[#042f66]/20 font-bold"
              : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800"
          }`}
          title="Lonas: 💻"
          aria-label="Lonas: 💻"
        >
          <span className="text-lg leading-none">💻</span>
          <span className="text-[10px] tracking-tight mt-0.5 font-semibold">Lonas</span>
        </button>

        {/* 3. Salud Financiera Tab: 🤑 */}
        <button
          type="button"
          onClick={() => onChangeWorkspace && onChangeWorkspace("finanzas")}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl min-h-[48px] w-full relative transition-all active:scale-95 ${
            currentWorkspace === "finanzas"
              ? "bg-[#042f66] text-white shadow-md shadow-[#042f66]/25 ring-2 ring-[#042f66]/20 font-bold"
              : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800"
          }`}
          title="Finanzas: 🤑"
          aria-label="Finanzas: 🤑"
        >
          <span className="text-lg leading-none">🤑</span>
          <span className="text-[10px] tracking-tight mt-0.5 font-semibold">Finanzas</span>
        </button>

        {/* 4. Pomodoro Focus Tab: ⏱️ */}
        <button
          type="button"
          onClick={() => {
            if (onChangeWorkspace) onChangeWorkspace("pomodoro");
            onOpenPomodoro();
          }}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl min-h-[48px] w-full relative transition-all active:scale-95 ${
            currentWorkspace === "pomodoro"
              ? "bg-[#042f66] text-white shadow-md shadow-[#042f66]/25 ring-2 ring-[#042f66]/20 font-bold"
              : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800"
          }`}
          title="Pomodoro: ⏱️"
          aria-label="Pomodoro: ⏱️"
        >
          <span className="text-lg leading-none">⏱️</span>
          <span className="text-[10px] tracking-tight mt-0.5 font-semibold">Foco</span>
        </button>

        {/* 5. Menú Conectar & Sincronizar (iPhone 16 Pro Max Hub): 🔄 */}
        <button
          type="button"
          onClick={handleOpenSyncMenu}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl min-h-[48px] w-full relative transition-all active:scale-95 ${
            isMoreTabActive
              ? "bg-[#042f66] text-white shadow-md shadow-[#042f66]/25 ring-2 ring-[#042f66]/20 font-bold"
              : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800"
          }`}
          title="Menú de Conexión, Sincronización y Módulos"
          aria-label="Menú de Conexión, Sincronización y Módulos"
        >
          <div className="relative">
            <RefreshCw
              size={18}
              className={syncStatus.isSyncing ? "animate-spin text-amber-500" : "text-amber-500"}
            />
            {unreadSolicitudesCount > 0 ? (
              <span className="absolute -top-1.5 -right-2 px-1 py-0.2 rounded-full bg-rose-500 text-white text-[8px] font-black leading-tight animate-pulse">
                {unreadSolicitudesCount}
              </span>
            ) : (
              <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-stone-900" />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 font-bold truncate max-w-full">
            {currentWorkspace === "urls"
              ? "URLs"
              : currentWorkspace === "print"
              ? "Print"
              : currentWorkspace === "analytics"
              ? "Métricas"
              : "Sincronizar"}
          </span>
        </button>
      </div>
    </nav>
  );
}
