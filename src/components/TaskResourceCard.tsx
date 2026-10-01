import React, { useState } from "react";
import {
  ExternalLink,
  Eye,
  Copy,
  Check,
  X,
  FileText,
  Video,
  HardDrive,
  Globe,
  Link2,
} from "lucide-react";
import { TaskResource } from "../types";

interface TaskResourceCardProps {
  resource: TaskResource;
  onRemove?: () => void;
  compact?: boolean;
}

export default function TaskResourceCard({
  resource,
  onRemove,
  compact = false,
}: TaskResourceCardProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Helper to safely parse domain & parameters
  const parseResourceInfo = (urlStr: string) => {
    try {
      const parsed = new URL(urlStr);
      const domain = parsed.hostname.replace(/^www\./, "");
      let type: "gdrive" | "youtube" | "doc" | "sheet" | "web" = "web";
      let thumbnail: string | null = null;
      let previewEmbed: string | null = null;

      // Google Favicon API endpoint (Official Google S2 Service)
      const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
        domain
      )}&sz=128`;

      // 1. Google Drive / Docs / Sheets
      if (domain.includes("drive.google.com") || domain.includes("docs.google.com")) {
        const fileMatch =
          urlStr.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
          urlStr.match(/id=([a-zA-Z0-9_-]+)/) ||
          urlStr.match(/\/d\/([a-zA-Z0-9_-]+)/);

        if (fileMatch && fileMatch[1]) {
          const fileId = fileMatch[1];
          // Google Drive Thumbnail API
          thumbnail = `https://drive.google.com/thumbnail?id=${fileId}&sz=w320`;
          previewEmbed = `https://drive.google.com/file/d/${fileId}/preview`;
        }

        if (urlStr.includes("document")) type = "doc";
        else if (urlStr.includes("spreadsheets")) type = "sheet";
        else type = "gdrive";
      }

      // 2. YouTube
      if (domain.includes("youtube.com") || domain.includes("youtu.be")) {
        type = "youtube";
        let videoId: string | null = null;
        const vMatch = urlStr.match(/(?:watch\?v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
        if (vMatch) videoId = vMatch[1];

        if (videoId) {
          thumbnail = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
          previewEmbed = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        }
      }

      return {
        domain,
        type,
        googleFaviconUrl,
        thumbnail: thumbnail || googleFaviconUrl,
        previewEmbed,
        protocol: parsed.protocol,
        pathname: parsed.pathname,
      };
    } catch (_) {
      return {
        domain: "enlace-web",
        type: "web" as const,
        googleFaviconUrl: "https://www.google.com/s2/favicons?domain=google.com&sz=128",
        thumbnail: null,
        previewEmbed: null,
        protocol: "https:",
        pathname: "",
      };
    }
  };

  const info = parseResourceInfo(resource.url);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(resource.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <>
      <div
        className={`group relative inline-flex items-center gap-2 p-1.5 pr-2.5 rounded-xl border transition-all text-xs ${
          compact ? "max-w-[260px]" : "max-w-[320px]"
        } bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-amber-400 dark:hover:border-amber-500 shadow-2xs hover:shadow-xs`}
        title={`${resource.title}\n${resource.url}`}
      >
        {/* Google Thumbnail / Favicon Box */}
        <div
          onClick={() => setIsPreviewOpen(true)}
          className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-800 border border-stone-200/80 dark:border-stone-700/80 flex items-center justify-center shrink-0 cursor-pointer hover:opacity-85 transition-opacity"
          title="Clic para previsualizar recurso"
        >
          {!imgError && info.thumbnail ? (
            <img
              src={info.thumbnail}
              alt={info.domain}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="text-amber-500">
              {info.type === "gdrive" ? (
                <HardDrive size={15} />
              ) : info.type === "youtube" ? (
                <Video size={15} />
              ) : info.type === "doc" || info.type === "sheet" ? (
                <FileText size={15} />
              ) : (
                <Globe size={15} />
              )}
            </div>
          )}

          {/* Quick overlay preview eye */}
          <div className="absolute inset-0 bg-stone-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
            <Eye size={12} />
          </div>
        </div>

        {/* Text information */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] text-stone-600 dark:text-stone-300 font-semibold leading-tight">
            <span className="truncate">{info.domain}</span>
            <span aria-hidden="true" className="opacity-50">·</span>
            <span className="text-amber-600 dark:text-amber-400 font-bold uppercase text-[9px]">
              {info.type === "gdrive"
                ? "Drive"
                : info.type === "youtube"
                ? "YouTube"
                : info.type === "doc"
                ? "Docs"
                : info.type === "sheet"
                ? "Sheets"
                : "Web"}
            </span>
          </div>

          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block font-semibold text-stone-900 dark:text-stone-100 hover:text-amber-600 dark:hover:text-amber-400 truncate text-[11px] leading-snug"
          >
            {resource.title || info.domain}
          </a>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
          {/* Quick Preview modal trigger button */}
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="Previsualizar recurso (Google API)"
          >
            <Eye size={13} />
          </button>

          {/* Copy link */}
          <button
            type="button"
            onClick={handleCopy}
            className={`p-1 rounded-md transition-colors ${
              copied
                ? "text-emerald-500 font-bold"
                : "text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
            }`}
            title={copied ? "¡Enlace copiado!" : "Copiar enlace al portapapeles"}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>

          {/* External link */}
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded-md text-stone-400 hover:text-blue-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="Abrir enlace en pestaña nueva"
          >
            <ExternalLink size={13} />
          </a>

          {/* Optional remove handler */}
          {onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove();
              }}
              className="p-1 rounded-md text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="Desvincular recurso de esta tarea"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Interactive Quick Preview Modal */}
      {isPreviewOpen && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="w-full max-w-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 bg-stone-50 dark:bg-stone-800/80 border-b border-stone-200 dark:border-stone-700/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={info.googleFaviconUrl}
                  alt={info.domain}
                  className="w-8 h-8 rounded-xl object-contain bg-white p-1 border border-stone-200 dark:border-stone-700 shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">
                      Previsualización Google API • {info.domain}
                    </span>
                  </div>
                  <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm truncate">
                    {resource.title || resource.url}
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-white dark:hover:bg-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-200"
                >
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  <span>{copied ? "Copiado" : "Copiar"}</span>
                </button>

                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-xs"
                >
                  <span>Abrir Web</span>
                  <ExternalLink size={13} />
                </a>

                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body Preview Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-stone-100 dark:bg-stone-950/60 flex flex-col items-center justify-center min-h-[300px]">
              {info.previewEmbed ? (
                <div className="w-full h-96 sm:h-[450px] rounded-2xl overflow-hidden border border-stone-300 dark:border-stone-800 bg-black shadow-inner">
                  <iframe
                    src={info.previewEmbed}
                    title={resource.title || "Previsualización"}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : info.thumbnail && !imgError ? (
                <div className="max-w-md w-full p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-md text-center space-y-4">
                  <div className="w-24 h-24 mx-auto rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center p-2">
                    <img
                      src={info.thumbnail}
                      alt={info.domain}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h5 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                      {resource.title || info.domain}
                    </h5>
                    <p className="text-xs text-stone-500 break-all mt-1 font-mono">
                      {resource.url}
                    </p>
                  </div>
                  <div className="pt-2">
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#042f66] text-white hover:bg-[#03234d] font-bold text-xs shadow-md"
                    >
                      <ExternalLink size={14} />
                      <span>Visitar {info.domain}</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6 space-y-3">
                  <Globe size={40} className="text-amber-500 mx-auto" />
                  <h5 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                    {resource.title}
                  </h5>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto break-all font-mono">
                    {resource.url}
                  </p>
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-xs"
                  >
                    <span>Abrir en navegador</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-stone-50 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-500">
              <span className="flex items-center gap-1.5">
                <Link2 size={13} className="text-amber-500" />
                Favicon & Thumbnail proveído por Google S2 Service
              </span>
              <span className="font-mono">{info.domain}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
