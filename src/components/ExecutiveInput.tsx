import React, { useState, useRef, useMemo } from "react";
import {
  Sparkles,
  CornerDownLeft,
  Clipboard,
  Loader2,
  Image as ImageIcon,
  X,
  UploadCloud,
  FileText,
  Tag as TagIcon,
  FolderKanban,
  ChevronDown,
  Link2,
  Bookmark,
  Globe,
  Pin,
} from "lucide-react";
import { TagItem } from "../types";
import TagSelector from "./TagSelector";
import { extractUrls } from "../lib/executiveRouter";

interface ExecutiveInputProps {
  onSubmit: (
    input: string,
    imageBase64?: string,
    imageMimeType?: string,
    selectedTags?: string[],
    preassignedCategory?: string,
    urlDestinationOverride?: "TASK" | "GLOBAL" | "URL_LIBRARY" | null
  ) => void;
  isLoading: boolean;
  availableTags: TagItem[];
  onOpenManageTags: () => void;
  activeTaskTitle?: string | null;
}

export const CATEGORY_OPTIONS = [
  { value: "", label: "Detectar automáticamente", badge: "Auto" },
  { value: "FGDLL", label: "FGDLL", badge: "FGDLL" },
  { value: "Personal", label: "Personal", badge: "Personal" },
  { value: "Technology", label: "Technology", badge: "Tech" },
  { value: "Universidad", label: "Universidad", badge: "Uni" },
  { value: "Diseño", label: "Diseño", badge: "Diseño" },
  { value: "Profesional", label: "Profesional", badge: "Prof" },
  { value: "Laura", label: "Laura", badge: "Laura" },
];

const PRESET_EXAMPLES = [
  {
    label: "Laura (Reconocimientos)",
    icon: "👩",
    text: "Mensaje de Laura: Oye, acuérdate de corregir los reconocimientos antes de enviarlos.",
  },
  {
    label: "Líder Tiburón (Lona)",
    icon: "🦈",
    text: "El líder de Tiburón me dijo que necesita su lona máximo mañana porque la experiencia es el viernes.",
  },
  {
    label: "🎵 Suno AI (Biblioteca)",
    icon: "🎶",
    text: "biblioteca https://suno.com",
  },
  {
    label: "🎨 Canva (Biblioteca)",
    icon: "🎨",
    text: "guardar url https://canva.com",
  },
  {
    label: "Pomodoro (Ley 27)",
    icon: "⏱️",
    text: "Ponme un pomodoro, me voy a enfocar en la lona de Tiburón.",
  },
  {
    label: "Terminar tarea 1",
    icon: "✅",
    text: "Ya terminé el 1.",
  },
];

export default function ExecutiveInput({
  onSubmit,
  isLoading,
  availableTags,
  onOpenManageTags,
  activeTaskTitle,
}: ExecutiveInputProps) {
  const [input, setInput] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [urlDestinationOverride, setUrlDestinationOverride] = useState<
    "TASK" | "GLOBAL" | "URL_LIBRARY" | null
  >(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>("image/jpeg");
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect URLs in live input
  const detectedUrls = useMemo(() => extractUrls(input), [input]);

  const handleFileProcess = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Por favor selecciona un archivo de imagen (PNG, JPG, WebP).");
      return;
    }

    setImageFileName(file.name);
    setImageMimeType(file.type);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImagePreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !imagePreview) || isLoading) return;

    onSubmit(
      input.trim(),
      imagePreview || undefined,
      imageMimeType,
      selectedTags.length > 0 ? selectedTags : undefined,
      selectedCategory || undefined,
      urlDestinationOverride
    );
    setInput("");
    setSelectedTags([]);
    setSelectedCategory("");
    setUrlDestinationOverride(null);
    setImagePreview(null);
    setImageFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Check if an image is in clipboard (e.g. pasted screenshot)
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleFileProcess(file);
          return;
        }
      }
    }
  };

  const handlePasteClipboardBtn = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInput(text);
      }
    } catch (err) {
      console.error("Clipboard read not supported:", err);
    }
  };

  return (
    <div
      id="executive-input-section"
      className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm p-4 sm:p-5 transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <label
          htmlFor="task-os-input"
          className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5"
        >
          <Sparkles size={16} className="text-amber-500" />
          Procesador Ejecutivo de Mensajes y Solicitudes
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-600 dark:text-stone-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
            title="Subir captura o imagen de referencia"
          >
            <ImageIcon size={13} />
            <span className="hidden sm:inline">Subir imagen</span>
          </button>
          <button
            type="button"
            onClick={handlePasteClipboardBtn}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 transition-colors"
            title="Pegar texto del portapapeles"
          >
            <Clipboard size={12} />
            <span className="hidden sm:inline">Pegar texto</span>
          </button>
        </div>
      </div>

      {/* Hidden file input supporting click selection */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        id="image-file-input"
      />

      <form
        onSubmit={handleSubmit}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative rounded-xl border transition-all ${
          isDragging
            ? "border-amber-500 ring-2 ring-amber-400/20 bg-amber-50/20"
            : "border-stone-200 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-800/60"
        }`}
      >
        <textarea
          id="task-os-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Pega un mensaje de WhatsApp, correo, pega una URL para auto-identificar y guardar en biblioteca, o escribe: 'Ponme un pomodoro...'"
          rows={3}
          disabled={isLoading}
          className="w-full p-3.5 pr-24 bg-transparent text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none resize-none transition-all leading-relaxed"
        />

        {/* Live Detected URLs Routing Assistant Banner */}
        {detectedUrls.length > 0 && (
          <div className="mx-3.5 mb-2.5 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950 dark:text-amber-200">
                <Link2 size={14} className="text-amber-600" />
                <span>
                  {detectedUrls.length === 1
                    ? "URL detectada en el procesador:"
                    : `${detectedUrls.length} URLs detectadas en el procesador:`}
                </span>
                <span className="font-mono text-[11px] text-amber-800 dark:text-amber-300 truncate max-w-[200px]">
                  {detectedUrls[0]}
                </span>
              </div>
              <span className="text-[10px] uppercase font-black px-1.5 py-0.2 rounded bg-amber-500 text-stone-950">
                Enrutador Activo
              </span>
            </div>

            {/* Destination Selector Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                Destino:
              </span>

              {/* Option 1: URL Library */}
              <button
                type="button"
                onClick={() => setUrlDestinationOverride("URL_LIBRARY")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  urlDestinationOverride === "URL_LIBRARY"
                    ? "bg-amber-500 text-stone-950 shadow-xs"
                    : "bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                }`}
              >
                <Bookmark size={12} />
                <span>⭐ Biblioteca de URLs Día a Día</span>
              </button>

              {/* Option 2: Active Task */}
              {activeTaskTitle && (
                <button
                  type="button"
                  onClick={() => setUrlDestinationOverride("TASK")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                    urlDestinationOverride === "TASK" || (urlDestinationOverride === null && activeTaskTitle)
                      ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950"
                      : "bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100"
                  }`}
                >
                  <Pin size={12} />
                  <span>Tarea Activa</span>
                </button>
              )}

              {/* Option 3: Global Resources Archive */}
              <button
                type="button"
                onClick={() => setUrlDestinationOverride("GLOBAL")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  urlDestinationOverride === "GLOBAL" || (urlDestinationOverride === null && !activeTaskTitle)
                    ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950"
                    : "bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100"
                }`}
              >
                <Globe size={12} />
                <span>Archivo Global (Búsqueda)</span>
              </button>
            </div>
          </div>
        )}

        {/* Reference Image Preview Area */}
        {imagePreview && (
          <div className="mx-3.5 mb-3 p-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 flex items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-stone-200 dark:border-stone-700 bg-stone-100 shrink-0">
                <img
                  src={imagePreview}
                  alt="Referencia"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate">
                    {imageFileName || "Imagen de referencia adjunta"}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold shrink-0">
                    IA multimodal
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 truncate">
                  Task-OS extraerá solicitudes, datos de contacto y fechas de la imagen.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRemoveImage}
              className="p-1.5 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="Quitar imagen"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Drag-and-drop prompt badge when dragging */}
        {isDragging && (
          <div className="absolute inset-0 bg-amber-500/10 backdrop-blur-xs flex items-center justify-center rounded-xl pointer-events-none border-2 border-dashed border-amber-500">
            <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <UploadCloud size={16} /> Suelta la imagen aquí para adjuntarla
            </span>
          </div>
        )}

        {/* Pre-assignment Controls: Category Dropdown & Tag Selector */}
        <div className="mx-3.5 mb-2.5 pt-2 border-t border-stone-200/60 dark:border-stone-700/50 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Category Dropdown */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="executive-category-select"
                className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 flex items-center gap-1 shrink-0"
                title="Pre-asignar categoría / dominio para la nueva tarea (FGDLL, Personal, Technology, Universidad, etc.)"
              >
                <FolderKanban size={13} className="text-amber-500" />
                <span>Categoría:</span>
              </label>
              <div className="relative inline-flex items-center">
                <select
                  id="executive-category-select"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  disabled={isLoading}
                  className={`appearance-none text-xs font-semibold rounded-lg pl-2.5 pr-7 py-1.5 border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-2xs ${
                    selectedCategory
                      ? "bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/80 text-amber-950 dark:text-amber-200 font-bold"
                      : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-stone-300 dark:hover:border-stone-600"
                  }`}
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option
                      key={cat.value}
                      value={cat.value}
                      className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 py-1"
                    >
                      {cat.value ? `${cat.label}` : `${cat.label}`}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={12}
                  className={`absolute right-2 pointer-events-none ${
                    selectedCategory
                      ? "text-amber-700 dark:text-amber-300"
                      : "text-stone-400"
                  }`}
                />
              </div>

              {selectedCategory && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory("")}
                  className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-[10px]"
                  title="Restablecer a detección automática"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Tag Selector bar */}
            <div className="flex-1 min-w-[200px] flex justify-end">
              <TagSelector
                availableTags={availableTags}
                selectedTagNames={selectedTags}
                onChange={setSelectedTags}
                onOpenManageTags={onOpenManageTags}
                compact={true}
              />
            </div>
          </div>
        </div>

        <div className="p-2.5 pt-0 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-stone-400">
            <button
              type="button"
              id="attach-image-btn"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-stone-600 hover:text-stone-950 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-700/60 transition-colors min-h-[40px]"
            >
              <ImageIcon size={15} className="text-amber-500" />
              <span className="text-xs">{imagePreview ? "Cambiar imagen" : "Adjuntar imagen"}</span>
            </button>
          </div>

          <button
            type="submit"
            id="task-os-submit-btn"
            disabled={(!input.trim() && !imagePreview) || isLoading}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 font-bold text-xs sm:text-sm transition-all shadow-sm hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 min-h-[44px]"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <span>
                  {urlDestinationOverride === "URL_LIBRARY"
                    ? "Guardar en Biblioteca"
                    : "Procesar"}
                </span>
                <CornerDownLeft size={15} />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Quick Example Chips */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-100 dark:border-stone-800 text-[11px]">
        <span className="text-stone-400 mr-1 font-medium">Ejemplos rápidos:</span>
        {PRESET_EXAMPLES.map((ex, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setInput(ex.text)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors font-medium cursor-pointer"
          >
            <span>{ex.icon}</span>
            <span>{ex.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

