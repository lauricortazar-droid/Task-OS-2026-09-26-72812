import React, { useState, useMemo } from "react";
import {
  Bookmark,
  ExternalLink,
  Plus,
  Search,
  Star,
  Sparkles,
  Edit2,
  Trash2,
  Copy,
  Check,
  Grid,
  List,
  FolderTree,
  Zap,
  Filter,
  ArrowUpDown,
  Tag as TagIcon,
  Globe,
  Loader2,
  Link2,
  Share2,
  FolderKanban,
  CheckCircle2,
  Paperclip,
  TrendingUp,
  FolderOpen,
} from "lucide-react";
import { UrlLibraryItem, UrlViewMode, TaskItem, LonasOrder, PrintItem } from "../types";
import { fetchUrlMetadata } from "../lib/executiveRouter";
import { playChime } from "../utils/audio";

interface UrlLibraryOSProps {
  urls: UrlLibraryItem[];
  activeTaskId: number | null;
  tasks: TaskItem[];
  lonasOrders?: LonasOrder[];
  onAddUrl: (item: Omit<UrlLibraryItem, "id" | "createdAt">) => void;
  onUpdateUrl: (item: UrlLibraryItem) => void;
  onDeleteUrl: (id: string) => void;
  onAttachToActiveTask?: (url: string, title: string) => void;
  onSendToProcessor?: (text: string) => void;
  onNavigateToLonas?: (orderFolio?: number) => void;
  onNavigateToPrint?: (printItem: PrintItem) => void;
}

export const PRESET_URL_CATEGORIES = [
  "Música & Audio",
  "Inteligencia Artificial",
  "Diseño & Creatividad",
  "Productividad & Trabajo",
  "Finanzas & Bancos",
  "Comunicación",
  "Multimedia & Video",
  "Herramientas & Web",
  "Personal",
];

export const INITIAL_URL_LIBRARY: UrlLibraryItem[] = [
  {
    id: "url-diseno-l008",
    url: "https://drive.google.com/file/d/1taller-maestro-diseno-fachada-lonas/view",
    title: "Diseño L-008 • Fachada El Taller del Maestro (Drive)",
    categoria: "Diseño & Creatividad",
    descripcion: "Archivo original de producción en Google Drive (CMYK 300dpi) para lona fachada 4.0m x 0.5m. Zona Jaguar.",
    keywords: ["drive", "diseño", "lona", "fachada", "l-008", "taller del maestro", "jaguar"],
    icon: "https://ssl.gstatic.com/docs/doclist/images/drive_icon_32.png",
    isFavorite: true,
    isDesignFile: true,
    driveUrl: "https://drive.google.com/file/d/1taller-maestro-diseno-fachada-lonas/view",
    relatedOrderId: "lon-008",
    relatedOrderFolio: 8,
    clienteNombre: "El Taller del Maestro",
    empresaZona: "Zona Jaguar",
    clicks: 18,
    lastOpenedAt: "2026-09-26T11:00:00.000Z",
    createdAt: "2026-09-21T07:45:00.000Z",
  },
  {
    id: "url-diseno-l005",
    url: "https://drive.google.com/file/d/1la-legion-azul-diseno-banner/view",
    title: "Diseño L-005 • LA LEGIÓN AZUL (Drive)",
    categoria: "Diseño & Creatividad",
    descripcion: "Archivo vectorial e ilustración de lona reforzada 3.5m x 2.0m con ojillos. Listo para impresión.",
    keywords: ["drive", "diseño", "lona", "legion", "azul", "l-005"],
    icon: "https://ssl.gstatic.com/docs/doclist/images/drive_icon_32.png",
    isFavorite: true,
    isDesignFile: true,
    driveUrl: "https://drive.google.com/file/d/1la-legion-azul-diseno-banner/view",
    relatedOrderId: "lon-005",
    relatedOrderFolio: 5,
    clienteNombre: "LA LEGIÓN - AZUL",
    empresaZona: "Zona Jaguar",
    clicks: 12,
    lastOpenedAt: "2026-09-25T14:30:00.000Z",
    createdAt: "2026-09-21T07:50:00.000Z",
  },
  {
    id: "url-suno",
    url: "https://suno.com",
    title: "Suno AI • Estudio y Generación de Música",
    categoria: "Música & Audio",
    descripcion: "Plataforma de generación musical con IA para crear canciones completas, pistas instrumentales y ritmos.",
    keywords: ["suno", "musica", "audio", "canciones", "ia", "generacion"],
    icon: "https://www.google.com/s2/favicons?domain=suno.com&sz=64",
    isFavorite: true,
    clicks: 14,
    lastOpenedAt: "2026-09-26T10:00:00.000Z",
    createdAt: "2026-09-21T08:00:00.000Z",
  },
  {
    id: "url-chatgpt",
    url: "https://chatgpt.com",
    title: "ChatGPT • Asistente IA de OpenAI",
    categoria: "Inteligencia Artificial",
    descripcion: "Modelos de lenguaje avanzados para redacción de mensajes de WhatsApp, análisis y resolución de problemas.",
    keywords: ["chatgpt", "openai", "ia", "asistente", "prompts"],
    icon: "https://www.google.com/s2/favicons?domain=chatgpt.com&sz=64",
    isFavorite: true,
    clicks: 28,
    lastOpenedAt: "2026-09-26T09:30:00.000Z",
    createdAt: "2026-09-21T08:05:00.000Z",
  },
  {
    id: "url-drive",
    url: "https://drive.google.com",
    title: "Google Drive • Archivos y Documentación FGDLL",
    categoria: "Productividad & Trabajo",
    descripcion: "Carpetas compartidas de plantillas, formatos institucionales y respaldos.",
    keywords: ["drive", "google", "carpetas", "archivos", "fgdll"],
    icon: "https://www.google.com/s2/favicons?domain=drive.google.com&sz=64",
    isFavorite: true,
    clicks: 22,
    lastOpenedAt: "2026-09-25T16:00:00.000Z",
    createdAt: "2026-09-21T08:10:00.000Z",
  },
  {
    id: "url-canva",
    url: "https://www.canva.com",
    title: "Canva • Diseño Gráfico y Plantillas",
    categoria: "Diseño & Creatividad",
    descripcion: "Diseño rápido de volantes, reconocimientos y piezas publicitarias para impresión en lona.",
    keywords: ["canva", "diseño", "plantillas", "posters", "volantes", "lonas"],
    icon: "https://www.google.com/s2/favicons?domain=canva.com&sz=64",
    isFavorite: true,
    clicks: 19,
    lastOpenedAt: "2026-09-24T12:00:00.000Z",
    createdAt: "2026-09-21T08:15:00.000Z",
  },
  {
    id: "url-whatsapp-web",
    url: "https://web.whatsapp.com",
    title: "WhatsApp Web • Mensajería Instantánea",
    categoria: "Comunicación",
    descripcion: "Atención a Laura, líderes de zona FGDLL, cotizaciones de lonas y avisos de entrega.",
    keywords: ["whatsapp", "mensajes", "chat", "clientes", "comunicacion"],
    icon: "https://www.google.com/s2/favicons?domain=web.whatsapp.com&sz=64",
    isFavorite: true,
    clicks: 35,
    lastOpenedAt: "2026-09-26T10:45:00.000Z",
    createdAt: "2026-09-21T08:20:00.000Z",
  },
  {
    id: "url-figma",
    url: "https://www.figma.com",
    title: "Figma • Perfiles de Color y Especificaciones de Lonas",
    categoria: "Diseño & Creatividad",
    descripcion: "Guías vectoriales y especificaciones técnicas para gran formato.",
    keywords: ["figma", "diseño", "ui", "perfiles", "color", "lonas"],
    icon: "https://www.google.com/s2/favicons?domain=figma.com&sz=64",
    isFavorite: false,
    clicks: 8,
    lastOpenedAt: "2026-09-23T14:10:00.000Z",
    createdAt: "2026-09-21T08:25:00.000Z",
  },
  {
    id: "url-spotify",
    url: "https://open.spotify.com",
    title: "Spotify • Música Instrumental de Enfoque",
    categoria: "Música & Audio",
    descripcion: "Sesiones de música ambient y lo-fi para acompañar los bloques de Pomodoro.",
    keywords: ["spotify", "musica", "audio", "playlists", "enfoque"],
    icon: "https://www.google.com/s2/favicons?domain=spotify.com&sz=64",
    isFavorite: true,
    clicks: 16,
    lastOpenedAt: "2026-09-26T08:15:00.000Z",
    createdAt: "2026-09-21T08:30:00.000Z",
  },
];

export default function UrlLibraryOS({
  urls,
  activeTaskId,
  tasks,
  lonasOrders = [],
  onAddUrl,
  onUpdateUrl,
  onDeleteUrl,
  onAttachToActiveTask,
  onSendToProcessor,
  onNavigateToLonas,
  onNavigateToPrint,
}: UrlLibraryOSProps) {
  const [viewMode, setViewMode] = useState<UrlViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Todas");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [filterOnlyDesigns, setFilterOnlyDesigns] = useState(false);
  const [sortBy, setSortBy] = useState<"clicks" | "recent" | "alpha" | "category">("clicks");

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<UrlLibraryItem | null>(null);

  // Form State
  const [formUrl, setFormUrl] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("Herramientas & Web");
  const [formDescription, setFormDescription] = useState("");
  const [formKeywords, setFormKeywords] = useState("");
  const [formIsFavorite, setFormIsFavorite] = useState(false);
  const [formIcon, setFormIcon] = useState("");
  const [formIsDesignFile, setFormIsDesignFile] = useState(false);
  const [formDriveUrl, setFormDriveUrl] = useState("");
  const [formRelatedOrderFolio, setFormRelatedOrderFolio] = useState<number | string>("");
  const [formClienteNombre, setFormClienteNombre] = useState("");
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [autoIdentifiedSuccess, setAutoIdentifiedSuccess] = useState(false);

  // Copy Feedback State
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Active Task for quick contextual attach
  const activeTask = activeTaskId ? tasks.find((t) => t.id === activeTaskId) : null;

  // Filter & Sort Logic
  const filteredUrls = useMemo(() => {
    let result = [...urls];

    // Filter by Drive Design Files
    if (filterOnlyDesigns) {
      result = result.filter(
        (u) => u.isDesignFile || Boolean(u.driveUrl) || u.url.includes("drive.google.com")
      );
    }

    // Filter by favorites if tab or viewMode is daily
    if (onlyFavorites || viewMode === "daily") {
      result = result.filter((u) => u.isFavorite);
    }

    // Filter by Category
    if (selectedCategory !== "Todas" && !filterOnlyDesigns) {
      result = result.filter(
        (u) => (u.categoria || "Herramientas & Web").toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((u) => {
        const titleMatch = u.title.toLowerCase().includes(q);
        const urlMatch = u.url.toLowerCase().includes(q);
        const descMatch = u.descripcion ? u.descripcion.toLowerCase().includes(q) : false;
        const catMatch = u.categoria ? u.categoria.toLowerCase().includes(q) : false;
        const clientMatch = u.clienteNombre ? u.clienteNombre.toLowerCase().includes(q) : false;
        const folioMatch = u.relatedOrderFolio ? String(u.relatedOrderFolio).includes(q) : false;
        const kwMatch = (u.keywords || []).some((k) => k.toLowerCase().includes(q));
        return titleMatch || urlMatch || descMatch || catMatch || kwMatch || clientMatch || folioMatch;
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "clicks") {
        return (b.clicks || 0) - (a.clicks || 0);
      }
      if (sortBy === "recent") {
        return (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt);
      }
      if (sortBy === "alpha") {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === "category") {
        return (a.categoria || "").localeCompare(b.categoria || "");
      }
      return 0;
    });

    return result;
  }, [urls, searchQuery, selectedCategory, onlyFavorites, filterOnlyDesigns, sortBy, viewMode]);

  // Distinct categories available in library
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    urls.forEach((u) => {
      if (u.categoria) set.add(u.categoria);
    });
    return Array.from(set);
  }, [urls]);

  // Grouped by category for "categories" view
  const groupedByCategory = useMemo(() => {
    const groups: Record<string, UrlLibraryItem[]> = {};
    filteredUrls.forEach((u) => {
      const cat = u.categoria || "Herramientas & Web";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(u);
    });
    return groups;
  }, [filteredUrls]);

  // Open Standard Add Modal
  const handleOpenAddModal = (presetUrl?: string) => {
    setEditingItem(null);
    setFormUrl(presetUrl || "");
    setFormTitle("");
    setFormCategory("Herramientas & Web");
    setFormDescription("");
    setFormKeywords("");
    setFormIsFavorite(false);
    setFormIcon("");
    setFormIsDesignFile(false);
    setFormDriveUrl("");
    setFormRelatedOrderFolio("");
    setFormClienteNombre("");
    setAutoIdentifiedSuccess(false);
    setIsModalOpen(true);

    if (presetUrl) {
      handleAutoIdentify(presetUrl);
    }
  };

  // Open Add Google Drive Design Link Modal (Todo Vinculado)
  const handleOpenAddDesignModal = (orderFolio?: number) => {
    const matchedOrder = lonasOrders.find((o) => o.folio === orderFolio) || lonasOrders[0];
    setEditingItem(null);
    const driveLink = matchedOrder?.driveUrl || "https://drive.google.com/file/d/";
    setFormUrl(driveLink);
    setFormDriveUrl(driveLink);
    setFormTitle(
      matchedOrder
        ? `Diseño L-${String(matchedOrder.folio).padStart(3, "0")} • ${matchedOrder.cliente.nombre}`
        : "Diseño • Archivo de Producción (Drive)"
    );
    setFormCategory("Diseño & Creatividad");
    setFormDescription(
      matchedOrder
        ? `Archivo de diseño en Google Drive para el pedido L-${matchedOrder.folio} (${matchedOrder.cliente.empresa || "Zona Jaguar"}). Medidas: ${matchedOrder.items[0]?.ancho}m x ${matchedOrder.items[0]?.alto}m.`
        : "Archivo de diseño vectorial / alta resolución en Google Drive para impresión."
    );
    setFormKeywords(
      matchedOrder
        ? `drive, diseño, lona, l-${matchedOrder.folio}, ${matchedOrder.cliente.nombre.toLowerCase()}`
        : "drive, diseño, lona, impresion"
    );
    setFormIsFavorite(true);
    setFormIsDesignFile(true);
    setFormRelatedOrderFolio(matchedOrder ? matchedOrder.folio : "");
    setFormClienteNombre(matchedOrder ? matchedOrder.cliente.nombre : "");
    setFormIcon("https://ssl.gstatic.com/docs/doclist/images/drive_icon_32.png");
    setAutoIdentifiedSuccess(false);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: UrlLibraryItem) => {
    setEditingItem(item);
    setFormUrl(item.url);
    setFormTitle(item.title);
    setFormCategory(item.categoria || "Herramientas & Web");
    setFormDescription(item.descripcion || "");
    setFormKeywords((item.keywords || []).join(", "));
    setFormIsFavorite(Boolean(item.isFavorite));
    setFormIcon(item.icon || "");
    setFormIsDesignFile(Boolean(item.isDesignFile || item.driveUrl || item.url.includes("drive.google.com")));
    setFormDriveUrl(item.driveUrl || (item.url.includes("drive.google.com") ? item.url : ""));
    setFormRelatedOrderFolio(item.relatedOrderFolio || "");
    setFormClienteNombre(item.clienteNombre || "");
    setAutoIdentifiedSuccess(false);
    setIsModalOpen(true);
  };

  // Automatic Data Identification Trigger
  const handleAutoIdentify = async (targetUrl?: string) => {
    const rawUrl = (targetUrl || formUrl).trim();
    if (!rawUrl) return;

    let normalizedUrl = rawUrl;
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
      setFormUrl(normalizedUrl);
    }

    // Check if it is a Google Drive link
    if (normalizedUrl.includes("drive.google.com")) {
      setFormIsDesignFile(true);
      setFormDriveUrl(normalizedUrl);
      setFormCategory("Diseño & Creatividad");
      setFormIcon("https://ssl.gstatic.com/docs/doclist/images/drive_icon_32.png");
    }

    setIsIdentifying(true);
    setAutoIdentifiedSuccess(false);

    try {
      const metadata = await fetchUrlMetadata(normalizedUrl);
      if (metadata) {
        if (!formTitle || formTitle === normalizedUrl || formTitle.startsWith("http")) {
          setFormTitle(metadata.title);
        } else if (!formTitle.trim()) {
          setFormTitle(metadata.title);
        }

        if (metadata.categoria && !formIsDesignFile) {
          setFormCategory(metadata.categoria);
        }

        if (metadata.descripcion) {
          setFormDescription(metadata.descripcion);
        }

        if (metadata.keywords && metadata.keywords.length > 0) {
          setFormKeywords(metadata.keywords.join(", "));
        }

        if (metadata.icon) {
          setFormIcon(metadata.icon);
        }

        setAutoIdentifiedSuccess(true);
        playChime("tick");
      }
    } catch (err) {
      console.warn("Auto-identification failed:", err);
    } finally {
      setIsIdentifying(false);
    }
  };

  // Save Modal
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUrl.trim() || !formTitle.trim()) return;

    let cleanUrl = formUrl.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = `https://${cleanUrl}`;
    }

    const keywordsArray = formKeywords
      .split(/[,;\s]+/)
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k.length > 0);

    let finalIcon = formIcon.trim();
    if (formIsDesignFile && !finalIcon) {
      finalIcon = "https://ssl.gstatic.com/docs/doclist/images/drive_icon_32.png";
    } else if (!finalIcon) {
      try {
        const parsed = new URL(cleanUrl);
        finalIcon = `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=64`;
      } catch (_) {}
    }

    const relatedFolioNum = formRelatedOrderFolio ? Number(formRelatedOrderFolio) : undefined;
    const finalDriveUrl = formIsDesignFile ? (formDriveUrl.trim() || cleanUrl) : undefined;

    if (editingItem) {
      onUpdateUrl({
        ...editingItem,
        url: cleanUrl,
        title: formTitle.trim(),
        categoria: formCategory,
        descripcion: formDescription.trim() || undefined,
        keywords: keywordsArray,
        isFavorite: formIsFavorite,
        icon: finalIcon || undefined,
        isDesignFile: formIsDesignFile,
        driveUrl: finalDriveUrl,
        relatedOrderFolio: relatedFolioNum,
        clienteNombre: formClienteNombre.trim() || undefined,
        updatedAt: new Date().toISOString(),
      });
    } else {
      onAddUrl({
        url: cleanUrl,
        title: formTitle.trim(),
        categoria: formCategory,
        descripcion: formDescription.trim() || undefined,
        keywords: keywordsArray,
        isFavorite: formIsFavorite,
        icon: finalIcon || undefined,
        isDesignFile: formIsDesignFile,
        driveUrl: finalDriveUrl,
        relatedOrderFolio: relatedFolioNum,
        clienteNombre: formClienteNombre.trim() || undefined,
        clicks: 0,
        updatedAt: new Date().toISOString(),
      });
    }

    setIsModalOpen(false);
    playChime("success");
  };

  // Send design file to PrintOS
  const handleSendDesignToPrint = (item: UrlLibraryItem) => {
    if (onNavigateToPrint) {
      const printItem: PrintItem = {
        id: `print-drive-${Date.now()}`,
        tipo: "ticket_lona",
        folio: item.relatedOrderFolio ? `L-${String(item.relatedOrderFolio).padStart(3, "0")}` : "DIS-DRIVE",
        titulo: item.title,
        clienteNombre: item.clienteNombre || "Cliente de Diseño",
        fecha: new Date().toISOString().slice(0, 10),
        items: [
          {
            descripcion: item.title,
            detalle: `Archivo en Drive: ${item.driveUrl || item.url}`,
            cantidad: 1,
            subtotal: 0,
          },
        ],
        total: 0,
        notas: `Archivo de diseño en Drive listo para producción: ${item.driveUrl || item.url}`,
        driveUrl: item.driveUrl || item.url,
        origen: "lonas",
        createdAt: new Date().toISOString(),
      };
      onNavigateToPrint(printItem);
      playChime("tick");
    }
  };

  // Quick Open Action (tracks click count and timestamp)
  const handleLaunchUrl = (item: UrlLibraryItem) => {
    onUpdateUrl({
      ...item,
      clicks: (item.clicks || 0) + 1,
      lastOpenedAt: new Date().toISOString(),
    });
    window.open(item.url, "_blank", "noopener,noreferrer");
  };

  // Copy URL with visual feedback
  const handleCopyUrl = async (item: UrlLibraryItem) => {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopiedId(item.id);
      playChime("tick");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy URL:", err);
    }
  };

  // Toggle favorite pin
  const handleToggleFavorite = (item: UrlLibraryItem) => {
    onUpdateUrl({
      ...item,
      isFavorite: !item.isFavorite,
      updatedAt: new Date().toISOString(),
    });
    playChime("tick");
  };

  // Category badge color helper
  const getCategoryColor = (cat: string = "") => {
    const c = cat.toLowerCase();
    if (c.includes("música") || c.includes("audio")) {
      return "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900/60";
    }
    if (c.includes("inteligencia") || c.includes("ia")) {
      return "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-900/60";
    }
    if (c.includes("diseño") || c.includes("creatividad")) {
      return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900/60";
    }
    if (c.includes("productividad") || c.includes("trabajo")) {
      return "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-900/60";
    }
    if (c.includes("finanzas") || c.includes("bancos")) {
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60";
    }
    if (c.includes("comunicación")) {
      return "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-900/60";
    }
    if (c.includes("multimedia") || c.includes("video")) {
      return "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-900/60";
    }
    return "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 border-stone-200 dark:border-stone-700";
  };

  return (
    <div id="url-library-os-container" className="space-y-4">
      {/* Top Banner & Control Deck */}
      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500 text-stone-950 font-bold shadow-xs">
                <Bookmark size={18} />
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100 tracking-tight flex items-center gap-2">
                  Biblioteca de URLs del Día a Día
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                    {urls.length} enlaces
                  </span>
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Herramientas, estudios de IA (Suno, ChatGPT, Canva) y recursos esenciales listos para lanzar, editar y sincronizar.
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Add Google Drive Design Button */}
            <button
              id="url-lib-add-design-btn"
              type="button"
              onClick={() => handleOpenAddDesignModal()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#042f66] hover:bg-[#073d83] text-white text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-95 min-h-[42px] border border-[#042f66]"
              title="Agregar link de Google Drive donde está el archivo del diseño creado (Todo Vinculado)"
            >
              <FolderOpen size={16} className="text-[#ffd15c]" />
              <span className="hidden sm:inline">+ Diseño Drive</span>
              <span className="sm:hidden">+ Drive</span>
            </button>

            {/* Standard New URL Button */}
            <button
              id="url-lib-add-btn"
              type="button"
              onClick={() => handleOpenAddModal()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-950 text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-95 min-h-[42px]"
            >
              <Plus size={16} className="text-amber-400 dark:text-amber-600" />
              <span>+ Nueva URL</span>
            </button>
          </div>
        </div>

        {/* Search, Filter Bar and View Mode Switcher */}
        <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, URL, descripción o etiquetas (ej: suno, música, lonas, canva)..."
              className="w-full pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Controls: Sort and Views */}
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            {/* Sort selector */}
            <div className="flex items-center gap-1.5 text-xs text-stone-500">
              <ArrowUpDown size={13} className="text-stone-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="py-1.5 px-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="clicks">Más Usados 🔥</option>
                <option value="recent">Recientes ⏱️</option>
                <option value="alpha">A-Z 🔤</option>
                <option value="category">Categoría 📁</option>
              </select>
            </div>

            {/* View Mode Toggle Buttons */}
            <div className="flex items-center p-1 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
              <button
                type="button"
                onClick={() => {
                  setViewMode("grid");
                  setOnlyFavorites(false);
                }}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  viewMode === "grid"
                    ? "bg-white dark:bg-stone-900 text-stone-950 dark:text-stone-50 shadow-2xs font-bold"
                    : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-200"
                }`}
                title="Vista Cuadrícula / Tarjetas"
              >
                <Grid size={14} />
                <span className="hidden sm:inline">Tarjetas</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewMode("list");
                  setOnlyFavorites(false);
                }}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  viewMode === "list"
                    ? "bg-white dark:bg-stone-900 text-stone-950 dark:text-stone-50 shadow-2xs font-bold"
                    : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-200"
                }`}
                title="Vista Lista Compacta / Tabla"
              >
                <List size={14} />
                <span className="hidden sm:inline">Lista</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewMode("categories");
                  setOnlyFavorites(false);
                }}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  viewMode === "categories"
                    ? "bg-white dark:bg-stone-900 text-stone-950 dark:text-stone-50 shadow-2xs font-bold"
                    : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-200"
                }`}
                title="Vista Agrupada por Categorías"
              >
                <FolderTree size={14} />
                <span className="hidden sm:inline">Categorías</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewMode("daily");
                  setOnlyFavorites(true);
                }}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  viewMode === "daily"
                    ? "bg-amber-500 text-stone-950 shadow-2xs font-bold"
                    : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-200"
                }`}
                title="Vista Día a Día / Favoritos (Lanzador Rápido)"
              >
                <Star size={14} className={viewMode === "daily" ? "fill-stone-950" : ""} />
                <span className="hidden sm:inline">Día a Día</span>
              </button>
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            type="button"
            onClick={() => {
              setSelectedCategory("Todas");
              setOnlyFavorites(false);
              setFilterOnlyDesigns(false);
            }}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
              selectedCategory === "Todas" && !onlyFavorites && !filterOnlyDesigns && viewMode !== "daily"
                ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 font-bold"
                : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
            }`}
          >
            Todas ({urls.length})
          </button>

          {/* Drive Design Filter Pill */}
          <button
            type="button"
            onClick={() => {
              setFilterOnlyDesigns(!filterOnlyDesigns);
              setSelectedCategory("Todas");
              setOnlyFavorites(false);
            }}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
              filterOnlyDesigns
                ? "bg-[#042f66] text-white shadow-sm ring-2 ring-[#042f66]/20"
                : "bg-blue-50 dark:bg-blue-950/40 text-[#042f66] dark:text-[#ffd15c] border border-blue-200 dark:border-blue-900 hover:bg-blue-100"
            }`}
          >
            <span>📁 Diseños en Drive ({urls.filter((u) => u.isDesignFile || Boolean(u.driveUrl) || u.url.includes("drive.google.com")).length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setOnlyFavorites(!onlyFavorites);
              setFilterOnlyDesigns(false);
              if (viewMode === "daily" && onlyFavorites) setViewMode("grid");
            }}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap flex items-center gap-1 transition-all ${
              onlyFavorites || viewMode === "daily"
                ? "bg-amber-500 text-stone-950 font-bold shadow-xs"
                : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
            }`}
          >
            <Star size={12} className="fill-amber-400" />
            <span>Favoritas Día a Día ({urls.filter((u) => u.isFavorite).length})</span>
          </button>

          {availableCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setSelectedCategory(cat);
                setOnlyFavorites(false);
              }}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat && !onlyFavorites && viewMode !== "daily"
                  ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 font-bold"
                  : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
              }`}
            >
              {cat} ({urls.filter((u) => u.categoria === cat).length})
            </button>
          ))}
        </div>
      </div>

      {/* Active Task Context Bar (if active task exists in Task-OS) */}
      {activeTask && onAttachToActiveTask && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Paperclip size={14} className="text-amber-500 shrink-0" />
            <span className="font-semibold text-amber-950 dark:text-amber-200 shrink-0">
              Contexto Tarea Activa:
            </span>
            <span className="text-stone-700 dark:text-stone-300 truncate">
              #{activeTask.id} • {activeTask.tarea}
            </span>
          </div>
          <span className="text-[11px] text-amber-800 dark:text-amber-300 font-medium shrink-0">
            Puedes adjuntar cualquier URL directamente con el botón 📎
          </span>
        </div>
      )}

      {/* Empty State */}
      {filteredUrls.length === 0 && (
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-8 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400">
            <Bookmark size={22} />
          </div>
          <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200">
            No se encontraron enlaces en esta vista
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto">
            {searchQuery
              ? `No hay resultados para "${searchQuery}". Intenta con otros términos o limpia el filtro.`
              : "Agrega tu primera URL del día a día (ej: Suno AI, ChatGPT, Canva) con auto-identificación inteligente."}
          </p>
          <button
            type="button"
            onClick={() => handleOpenAddModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-all shadow-sm"
          >
            <Plus size={15} />
            <span>Agregar Enlace</span>
          </button>
        </div>
      )}

      {/* VIEW 1: GRID / CARDS VIEW */}
      {viewMode === "grid" && filteredUrls.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredUrls.map((item) => (
            <div
              key={item.id}
              className={`rounded-2xl border transition-all duration-200 p-4 flex flex-col justify-between group hover:shadow-md ${
                item.isFavorite
                  ? "border-amber-200/90 dark:border-amber-900/50 bg-gradient-to-b from-amber-50/20 to-white dark:from-amber-950/10 dark:to-stone-900"
                  : "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-stone-300 dark:hover:border-stone-700"
              }`}
            >
              {/* Card Header: Icon, Title & Favorite */}
              <div>
                <div className="flex items-start justify-between gap-2.5 mb-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 p-1.5 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                      {item.icon ? (
                        <img
                          src={item.icon}
                          alt={item.title}
                          className="w-full h-full object-contain rounded-md"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <Globe size={18} className="text-stone-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3
                        className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 truncate cursor-pointer hover:text-amber-600 transition-colors"
                        onClick={() => handleLaunchUrl(item)}
                        title={item.title}
                      >
                        {item.title}
                      </h3>
                      <p className="text-[11px] text-stone-400 truncate flex items-center gap-1 font-mono">
                        {item.url.replace(/^https?:\/\//i, "").replace(/\/$/, "")}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleFavorite(item)}
                    className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                      item.isFavorite
                        ? "text-amber-500 hover:text-amber-600"
                        : "text-stone-300 dark:text-stone-600 hover:text-amber-400"
                    }`}
                    title={item.isFavorite ? "Enlace diario favorito" : "Marcar como diario / favorito"}
                  >
                    <Star size={17} className={item.isFavorite ? "fill-amber-500" : ""} />
                  </button>
                </div>

                {/* Google Drive Design Badge & Cross-tool linking */}
                {(item.isDesignFile || Boolean(item.driveUrl) || item.url.includes("drive.google.com")) && (
                  <div className="mb-2.5 p-2 rounded-xl bg-[#eef5ff] dark:bg-[#073d83]/20 border border-[#042f66]/20 flex items-center justify-between gap-1.5 text-xs">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-base shrink-0">📁</span>
                      <div className="truncate">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#042f66] dark:text-[#ffd15c] block leading-tight">
                          Diseño en Drive
                        </span>
                        {item.relatedOrderFolio && (
                          <span className="text-[10px] text-blue-800 dark:text-blue-300 font-bold block truncate">
                            Lona L-{String(item.relatedOrderFolio).padStart(3, "0")} {item.clienteNombre ? `• ${item.clienteNombre}` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {onNavigateToLonas && item.relatedOrderFolio && (
                        <button
                          type="button"
                          onClick={() => onNavigateToLonas(item.relatedOrderFolio)}
                          className="px-2 py-1 rounded-lg bg-[#042f66] hover:bg-[#073d83] text-white text-[10px] font-bold transition-colors"
                          title="Ver en Pedidos de Lonas 💻"
                        >
                          💻 Lona
                        </button>
                      )}
                      {onNavigateToPrint && (
                        <button
                          type="button"
                          onClick={() => handleSendDesignToPrint(item)}
                          className="px-2 py-1 rounded-lg bg-[#f2ad00] hover:bg-[#ffd15c] text-[#1d1d1b] text-[10px] font-black transition-colors"
                          title="Mandar a PRINT 🖨️"
                        >
                          🖨️ Print
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Category & Stats pill */}
                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getCategoryColor(
                      item.categoria
                    )}`}
                  >
                    {item.categoria || "Herramientas"}
                  </span>
                  {(item.clicks || 0) > 0 && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 flex items-center gap-0.5">
                      <TrendingUp size={10} className="text-amber-500" />
                      {item.clicks} {item.clicks === 1 ? "uso" : "usos"}
                    </span>
                  )}
                </div>

                {/* Description */}
                {item.descripcion && (
                  <p className="text-[11px] text-stone-600 dark:text-stone-400 line-clamp-2 leading-relaxed mb-3">
                    {item.descripcion}
                  </p>
                )}

                {/* Keywords / Tags */}
                {item.keywords && item.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.keywords.slice(0, 4).map((kw) => (
                      <span
                        key={kw}
                        className="text-[9px] px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800/80 text-stone-500 dark:text-stone-400"
                      >
                        #{kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Footer: Quick Actions */}
              <div className="pt-2.5 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-1.5">
                <button
                  type="button"
                  onClick={() => handleLaunchUrl(item)}
                  className="flex-1 py-1.5 px-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-2xs"
                  title="Abrir enlace en pestaña nueva"
                >
                  <ExternalLink size={13} className="text-amber-400 dark:text-amber-600" />
                  <span>Abrir</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyUrl(item)}
                  className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors"
                  title="Copiar URL al portapapeles"
                >
                  {copiedId === item.id ? (
                    <Check size={14} className="text-emerald-500" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>

                {activeTask && onAttachToActiveTask && (
                  <button
                    type="button"
                    onClick={() => {
                      onAttachToActiveTask(item.url, item.title);
                      playChime("tick");
                    }}
                    className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 hover:bg-amber-100 dark:bg-stone-800 dark:hover:bg-amber-950/40 text-stone-700 dark:text-stone-300 hover:text-amber-700 transition-colors"
                    title={`Adjuntar este enlace a la Tarea Activa #${activeTask.id}`}
                  >
                    <Paperclip size={14} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleOpenEditModal(item)}
                  className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors"
                  title="Editar datos de la URL"
                >
                  <Edit2 size={14} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`¿Eliminar "${item.title}" de tu biblioteca?`)) {
                      onDeleteUrl(item.id);
                    }
                  }}
                  className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 hover:bg-rose-50 dark:bg-stone-800 dark:hover:bg-rose-950/40 text-stone-400 hover:text-rose-600 transition-colors"
                  title="Eliminar de la biblioteca"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW 2: COMPACT LIST / TABLE VIEW */}
      {viewMode === "list" && filteredUrls.length > 0 && (
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  <th className="py-2.5 px-3 w-8">⭐</th>
                  <th className="py-2.5 px-3">Servicio / Título</th>
                  <th className="py-2.5 px-3">Categoría</th>
                  <th className="py-2.5 px-3 hidden md:table-cell">Etiquetas</th>
                  <th className="py-2.5 px-3 text-center">Usos</th>
                  <th className="py-2.5 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800 text-xs">
                {filteredUrls.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-stone-50/80 dark:hover:bg-stone-800/50 transition-colors group"
                  >
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => handleToggleFavorite(item)}
                        className={`transition-colors ${
                          item.isFavorite
                            ? "text-amber-500"
                            : "text-stone-300 dark:text-stone-600 hover:text-amber-400"
                        }`}
                      >
                        <Star size={15} className={item.isFavorite ? "fill-amber-500" : ""} />
                      </button>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-800 p-1 flex items-center justify-center shrink-0 border border-stone-200 dark:border-stone-700">
                          {item.icon ? (
                            <img
                              src={item.icon}
                              alt=""
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <Globe size={14} className="text-stone-400" />
                          )}
                        </div>
                        <div className="min-w-0 max-w-xs sm:max-w-md">
                          <button
                            type="button"
                            onClick={() => handleLaunchUrl(item)}
                            className="font-bold text-stone-900 dark:text-stone-100 hover:text-amber-600 transition-colors text-left truncate block max-w-full"
                          >
                            {item.title}
                          </button>
                          <span className="text-[10px] text-stone-400 font-mono truncate block">
                            {item.url.replace(/^https?:\/\//i, "")}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getCategoryColor(
                          item.categoria
                        )}`}
                      >
                        {item.categoria || "Herramientas"}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(item.keywords || []).slice(0, 3).map((kw) => (
                          <span
                            key={kw}
                            className="text-[9px] px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-stone-500"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-center whitespace-nowrap font-semibold text-stone-500">
                      {item.clicks || 0}
                    </td>

                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleLaunchUrl(item)}
                          className="px-2 py-1 rounded-lg bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs"
                          title="Abrir enlace"
                        >
                          <ExternalLink size={11} className="text-amber-400 dark:text-amber-600" />
                          <span>Abrir</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyUrl(item)}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                          title="Copiar URL"
                        >
                          {copiedId === item.id ? (
                            <Check size={13} className="text-emerald-500" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`¿Eliminar "${item.title}"?`)) {
                              onDeleteUrl(item.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: CATEGORIZED SECTIONS VIEW */}
      {viewMode === "categories" && filteredUrls.length > 0 && (
        <div className="space-y-4">
          {Object.entries(groupedByCategory).map(([categoryName, items]) => (
            <div
              key={categoryName}
              className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 sm:p-5 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2">
                <div className="flex items-center gap-2">
                  <FolderKanban size={16} className="text-amber-500" />
                  <h3 className="text-xs sm:text-sm font-black text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                    {categoryName}
                  </h3>
                  <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                    {items.length}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40 hover:border-amber-400 dark:hover:border-amber-600 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-white dark:bg-stone-900 p-1 flex items-center justify-center shrink-0 border border-stone-200 dark:border-stone-700">
                            {item.icon ? (
                              <img src={item.icon} alt="" className="w-full h-full object-contain" />
                            ) : (
                              <Globe size={14} className="text-stone-400" />
                            )}
                          </div>
                          <span className="font-bold text-xs text-stone-900 dark:text-stone-100 truncate">
                            {item.title}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleFavorite(item)}
                          className={item.isFavorite ? "text-amber-500" : "text-stone-300"}
                        >
                          <Star size={14} className={item.isFavorite ? "fill-amber-500" : ""} />
                        </button>
                      </div>

                      {item.descripcion && (
                        <p className="text-[10px] text-stone-500 line-clamp-2 mb-2">
                          {item.descripcion}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-stone-200/50 dark:border-stone-700/50 text-xs">
                      <button
                        type="button"
                        onClick={() => handleLaunchUrl(item)}
                        className="font-bold text-[11px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink size={12} />
                        Lanzar
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleCopyUrl(item)}
                          className="p-1 rounded text-stone-400 hover:text-stone-700"
                          title="Copiar"
                        >
                          {copiedId === item.id ? (
                            <Check size={12} className="text-emerald-500" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1 rounded text-stone-400 hover:text-stone-700"
                          title="Editar"
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW 4: DAILY LAUNCHPAD VIEW (Tablero Rápido Día a Día) */}
      {viewMode === "daily" && filteredUrls.length > 0 && (
        <div className="rounded-2xl border border-amber-300/80 dark:border-amber-900/60 bg-gradient-to-b from-amber-50/40 via-white to-white dark:from-amber-950/20 dark:via-stone-900 dark:to-stone-900 p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-black text-amber-950 dark:text-amber-200 flex items-center gap-2">
                <Zap size={18} className="text-amber-500 fill-amber-500" />
                Lanzador Rápido: Enlaces Esenciales del Día a Día
              </h3>
              <p className="text-xs text-stone-500">
                Tus accesos directos más frecuentes con un solo toque. Optimizados para Safari y móvil.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredUrls.map((item) => (
              <div
                key={item.id}
                onClick={() => handleLaunchUrl(item)}
                className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-700/80 bg-white dark:bg-stone-800/80 hover:border-amber-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group active:scale-95 min-h-[105px]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="w-10 h-10 rounded-xl bg-stone-50 dark:bg-stone-900 p-1.5 flex items-center justify-center border border-stone-200 dark:border-stone-700 shrink-0">
                    {item.icon ? (
                      <img src={item.icon} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <Globe size={18} className="text-stone-400" />
                    )}
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                    {item.clicks || 0} 🔥
                  </span>
                </div>

                <div className="mt-2 min-w-0">
                  <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate group-hover:text-amber-600 transition-colors">
                    {item.title}
                  </h4>
                  <span className="text-[10px] text-stone-400 truncate block font-mono">
                    {item.url.replace(/^https?:\/\//i, "")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Add / Edit URL with Auto-Identification */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl max-w-lg w-full overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-800/40">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-500 text-stone-950 font-bold">
                  {editingItem ? <Edit2 size={16} /> : <Bookmark size={16} />}
                </span>
                <h3 className="text-sm sm:text-base font-black text-stone-900 dark:text-stone-100">
                  {editingItem ? "Editar Enlace de Biblioteca" : "Agregar Nueva URL a la Biblioteca"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-xs p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveModal} className="p-5 space-y-4">
              {/* URL Input with Auto-Identify Button */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Enlace / URL *
                </label>
                <div className="flex items-stretch gap-2">
                  <div className="relative flex-1">
                    <Link2
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                    />
                    <input
                      type="text"
                      value={formUrl}
                      onChange={(e) => setFormUrl(e.target.value)}
                      placeholder="https://suno.com o canva.com..."
                      required
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs sm:text-sm bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAutoIdentify()}
                    disabled={isIdentifying || !formUrl.trim()}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 shadow-2xs"
                    title="Analiza la URL y extrae automáticamente título, categoría y descripción"
                  >
                    {isIdentifying ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    <span>{isIdentifying ? "Analizando..." : "Auto-identificar"}</span>
                  </button>
                </div>

                {autoIdentifiedSuccess && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
                    <CheckCircle2 size={13} />
                    <span>¡Datos inferidos e identificados automáticamente con éxito!</span>
                  </div>
                )}
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Nombre o Título del Servicio *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ej: Suno AI • Generador Musical"
                  required
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              {/* Category Dropdown */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Categoría
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none cursor-pointer"
                >
                  {PRESET_URL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description Input */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Descripción o Función
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  placeholder="¿Para qué te sirve este enlace en el día a día? (opcional)"
                  className="w-full p-2.5 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none resize-none"
                />
              </div>

              {/* Keywords / Tags */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Palabras Clave / Etiquetas (separadas por coma)
                </label>
                <input
                  type="text"
                  value={formKeywords}
                  onChange={(e) => setFormKeywords(e.target.value)}
                  placeholder="ej: suno, musica, ia, canciones"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none"
                />
              </div>

              {/* Archivo de Diseño en Google Drive (Todo Vinculado) */}
              <div className="p-3.5 rounded-2xl bg-[#eef5ff] dark:bg-[#073d83]/20 border border-[#042f66]/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsDesignFile}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormIsDesignFile(checked);
                        if (checked) {
                          setFormCategory("Diseño & Creatividad");
                          if (!formIcon) setFormIcon("https://ssl.gstatic.com/docs/doclist/images/drive_icon_32.png");
                        }
                      }}
                      className="w-4 h-4 rounded text-[#042f66] focus:ring-[#042f66]"
                    />
                    <span className="text-xs font-black text-[#042f66] dark:text-[#ffd15c] flex items-center gap-1.5">
                      <span>📁</span>
                      <span>¿Es un archivo de diseño en Google Drive?</span>
                    </span>
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f2ad00] text-[#1d1d1b]">
                    Todo Vinculado
                  </span>
                </div>

                {formIsDesignFile && (
                  <div className="space-y-2.5 pt-2 border-t border-[#042f66]/10 text-xs animate-in fade-in duration-200">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-stone-600 dark:text-stone-300 mb-1">
                        Link Directo a Google Drive
                      </label>
                      <input
                        type="url"
                        value={formDriveUrl || formUrl}
                        onChange={(e) => {
                          setFormDriveUrl(e.target.value);
                          if (!formUrl || formUrl === "https://drive.google.com/file/d/") {
                            setFormUrl(e.target.value);
                          }
                        }}
                        placeholder="https://drive.google.com/file/d/... o carpeta de Drive"
                        className="w-full px-3 py-2 rounded-xl border border-[#042f66]/30 bg-white dark:bg-stone-800 text-xs font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-stone-600 dark:text-stone-300 mb-1">
                          Vincular con Pedido de Lonas
                        </label>
                        <select
                          value={formRelatedOrderFolio}
                          onChange={(e) => {
                            const folioVal = e.target.value;
                            setFormRelatedOrderFolio(folioVal);
                            const matched = lonasOrders.find((o) => String(o.folio) === String(folioVal));
                            if (matched) {
                              setFormClienteNombre(matched.cliente.nombre);
                              if (!formTitle || formTitle === "Diseño • Archivo de Producción (Drive)") {
                                setFormTitle(`Diseño L-${String(matched.folio).padStart(3, "0")} • ${matched.cliente.nombre}`);
                              }
                            }
                          }}
                          className="w-full px-2.5 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs"
                        >
                          <option value="">-- Sin pedido específico --</option>
                          {lonasOrders.map((o) => (
                            <option key={o.id} value={o.folio}>
                              L-{String(o.folio).padStart(3, "0")} • {o.cliente.nombre} ({o.cliente.empresa || "Lonas"})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-stone-600 dark:text-stone-300 mb-1">
                          Cliente / Empresa
                        </label>
                        <input
                          type="text"
                          value={formClienteNombre}
                          onChange={(e) => setFormClienteNombre(e.target.value)}
                          placeholder="Nombre de cliente o empresa..."
                          className="w-full px-2.5 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs"
                        />
                      </div>
                    </div>

                    <p className="text-[10px] text-stone-500 dark:text-stone-400">
                      💡 Al guardar este enlace, quedará vinculado de inmediato para emitir tickets en PRINT (🖨️), avisos al cliente por WhatsApp y en el Taller de Lonas (💻).
                    </p>
                  </div>
                )}
              </div>

              {/* Favorite Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="form-is-favorite"
                  checked={formIsFavorite}
                  onChange={(e) => setFormIsFavorite(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                />
                <label
                  htmlFor="form-is-favorite"
                  className="text-xs font-bold text-stone-800 dark:text-stone-200 cursor-pointer flex items-center gap-1"
                >
                  <Star size={13} className="text-amber-500 fill-amber-500" />
                  Marcar como enlace de uso diario / favorito (Aparece en Lanzador Rápido)
                </label>
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-950 font-bold text-xs shadow-sm transition-all"
                >
                  {editingItem ? "Guardar Cambios" : "Guardar en Biblioteca"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
