import React, { useState } from "react";
import { Terminal, ChevronDown, ChevronUp, Copy, Check, Sparkles } from "lucide-react";
import { RouterStructuredOutput } from "../types";

interface RouterLogViewerProps {
  lastOutput: RouterStructuredOutput | null;
}

export default function RouterLogViewer({ lastOutput }: RouterLogViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!lastOutput) return null;

  const jsonString = JSON.stringify(
    {
      action: lastOutput.action,
      payload: lastOutput.payload,
      destination: lastOutput.destination,
      system_log: lastOutput.system_log,
    },
    null,
    2
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="router-log-viewer"
      className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-900 text-stone-100 overflow-hidden shadow-sm transition-all"
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 bg-stone-800/80 hover:bg-stone-800 flex items-center justify-between text-left transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Terminal size={15} className="text-amber-400 shrink-0" />
          <span className="text-xs font-bold text-stone-200 truncate">
            Procesador Ejecutivo:{" "}
            <span className="text-amber-400 font-mono">{lastOutput.action}</span>
          </span>
          <span
            className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
              lastOutput.destination.type === "TASK"
                ? "bg-amber-500/20 text-amber-300"
                : lastOutput.destination.type === "GLOBAL"
                ? "bg-blue-500/20 text-blue-300"
                : "bg-emerald-500/20 text-emerald-300"
            }`}
          >
            {lastOutput.destination.type ? `Destino: ${lastOutput.destination.type}` : "Búsqueda"}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className="text-[10px] text-stone-400 hidden sm:inline">JSON Estructurado</span>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      <div className="px-3.5 py-2 text-xs text-stone-300 bg-stone-950/60 border-t border-stone-800/70 flex items-center justify-between">
        <p className="text-[11px] text-stone-300 truncate">
          <span className="text-stone-500 font-semibold mr-1">Log:</span>
          {lastOutput.system_log}
        </p>
      </div>

      {isExpanded && (
        <div className="p-3 bg-stone-950 font-mono text-[11px] leading-relaxed border-t border-stone-800 relative">
          <div className="absolute top-2 right-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-[10px] text-stone-300 font-medium transition-colors"
            >
              {copied ? (
                <>
                  <Check size={11} className="text-emerald-400" />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <Copy size={11} />
                  <span>Copiar JSON</span>
                </>
              )}
            </button>
          </div>
          <pre className="text-amber-300/90 whitespace-pre-wrap overflow-x-auto selection:bg-amber-500/30">
            {jsonString}
          </pre>
        </div>
      )}
    </div>
  );
}
