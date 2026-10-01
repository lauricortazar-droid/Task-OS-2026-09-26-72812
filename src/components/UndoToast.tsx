import React, { useEffect, useState } from "react";
import { Undo2, X, AlertCircle, CheckCircle2 } from "lucide-react";

export interface UndoActionPayload {
  id: string;
  message: string;
  durationMs?: number;
  onUndo: () => void;
}

interface UndoToastProps {
  action: UndoActionPayload | null;
  onDismiss: () => void;
}

export default function UndoToast({ action, onDismiss }: UndoToastProps) {
  const [secondsLeft, setSecondsLeft] = useState(8);

  useEffect(() => {
    if (!action) return;

    const totalSeconds = Math.round((action.durationMs || 8000) / 1000);
    setSecondsLeft(totalSeconds);

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [action, onDismiss]);

  if (!action) return null;

  return (
    <div
      id="router-undo-toast"
      className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md bg-stone-900 text-stone-100 dark:bg-stone-900 border border-amber-500/40 rounded-2xl shadow-2xl p-3.5 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
          <CheckCircle2 size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-stone-100 line-clamp-1">{action.message}</p>
          <span className="text-[10px] text-stone-400 font-medium">
            Deshacer disponible por {secondsLeft}s
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => {
            action.onUndo();
            onDismiss();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-transform active:scale-95 shadow-sm min-h-[36px]"
        >
          <Undo2 size={13} />
          <span>Deshacer</span>
        </button>

        <button
          type="button"
          onClick={onDismiss}
          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          title="Descartar"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
