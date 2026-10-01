import {
  TaskItem,
  TaskResource,
  GlobalResource,
  UrlLibraryItem,
  RouterStructuredOutput,
  UniversalSearchResult,
} from "../types";

// Explicit task creation verbs in Spanish
const TASK_CREATION_VERBS = [
  "crear",
  "nueva",
  "nuevo",
  "agregar",
  "hacer",
  "revisar",
  "comprar",
  "enviar",
  "diseñar",
  "llamar",
  "preparar",
  "terminar",
  "completar",
  "poner",
  "ponme",
  "anotar",
  "recordar",
  "avisar",
  "pagar",
  "pedir",
  "cotizar",
  "imprimir",
  "organizar",
  "solicitar",
  "mandar",
  "escribir",
  "verificar",
  "tengo que",
  "debo",
  "hay que",
  "necesito",
];

// Search trigger prefixes
const SEARCH_TRIGGERS = ["buscar", "busca", "find", "search", "?", "query", "donde"];

// Library trigger triggers
const LIBRARY_TRIGGERS = ["biblioteca", "guardar url", "guardar enlace", "mi url", "url diaria", "enlace diario", "favorito url", "bookmark"];

/**
 * Deterministically extract all HTTP/HTTPS URLs from raw text
 */
export function extractUrls(text: string): string[] {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s<>"']+)/gi;
  const matches = text.match(urlRegex) || [];
  // Clean trailing punctuation like ., ), ,, ;
  return matches.map((u) => u.replace(/[.,;:)]+$/, "").trim()).filter(Boolean);
}

/**
 * Deterministically evaluate whether a non-URL input is a Universal Search query
 * or an explicit task creation request.
 */
export function isSearchQuery(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();

  // If starts with search trigger (? or "buscar ...")
  for (const trigger of SEARCH_TRIGGERS) {
    if (lower.startsWith(trigger)) return true;
  }

  // If it contains explicit task creation verbs, it's a task!
  for (const verb of TASK_CREATION_VERBS) {
    if (lower.startsWith(verb) || lower.includes(` ${verb} `)) {
      return false;
    }
  }

  // If it's short (<= 40 characters or <= 4 words) and lacks action verbs, treat as search query
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (trimmed.length <= 40 && words.length <= 4) {
    return true;
  }

  return false;
}

export interface UrlMetadataResult {
  url: string;
  title: string;
  keywords: string[];
  categoria?: string;
  descripcion?: string;
  icon?: string;
}

/**
 * Auto-infer category from hostname, title, and path heuristics
 */
export function inferCategoryFromUrl(hostname: string, title: string, pathname: string = ""): string {
  const combined = `${hostname} ${title} ${pathname}`.toLowerCase();
  if (combined.includes("suno") || combined.includes("music") || combined.includes("música") || combined.includes("spotify") || combined.includes("audio") || combined.includes("cancion") || combined.includes("sound")) {
    return "Música & Audio";
  }
  if (combined.includes("openai") || combined.includes("chatgpt") || combined.includes("claude") || combined.includes("gemini") || combined.includes("anthropic") || combined.includes("midjourney") || combined.includes("ai") || combined.includes("llm")) {
    return "Inteligencia Artificial";
  }
  if (combined.includes("canva") || combined.includes("figma") || combined.includes("lona") || combined.includes("diseño") || combined.includes("design") || combined.includes("photoshop") || combined.includes("vector") || combined.includes("impresion") || combined.includes("freepik")) {
    return "Diseño & Creatividad";
  }
  if (combined.includes("drive") || combined.includes("docs") || combined.includes("sheets") || combined.includes("notion") || combined.includes("trello") || combined.includes("asana") || combined.includes("calendar") || combined.includes("keep") || combined.includes("fgdll")) {
    return "Productividad & Trabajo";
  }
  if (combined.includes("banco") || combined.includes("bbva") || combined.includes("sat") || combined.includes("factur") || combined.includes("dinero") || combined.includes("finanz") || combined.includes("stripe") || combined.includes("paypal")) {
    return "Finanzas & Bancos";
  }
  if (combined.includes("whatsapp") || combined.includes("telegram") || combined.includes("slack") || combined.includes("zoom") || combined.includes("meet") || combined.includes("mail") || combined.includes("gmail") || combined.includes("discord")) {
    return "Comunicación";
  }
  if (combined.includes("youtube") || combined.includes("vimeo") || combined.includes("netflix") || combined.includes("video")) {
    return "Multimedia & Video";
  }
  return "Herramientas & Web";
}

/**
 * Known popular daily tools mapping for instant, rich identification
 */
const KNOWN_SERVICES: Record<string, { title: string; categoria: string; keywords: string[]; descripcion: string }> = {
  "suno.com": {
    title: "Suno AI • Estudio y Generación de Música",
    categoria: "Música & Audio",
    keywords: ["suno", "musica", "audio", "canciones", "ia", "generador"],
    descripcion: "Plataforma de generación musical con inteligencia artificial para crear pistas completas y canciones.",
  },
  "l.fgdll.org": {
    title: "Task-OS • Sistema Operativo Ejecutivo (l.fgdll.org)",
    categoria: "Productividad & Trabajo",
    keywords: ["task-os", "l.fgdll.org", "panel", "ejecutivo", "tareas", "fgdll"],
    descripcion: "Portal institucional y sistema operativo de tareas desplegado en l.fgdll.org",
  },
  "chatgpt.com": {
    title: "ChatGPT • Asistente y Modelos de Lenguaje",
    categoria: "Inteligencia Artificial",
    keywords: ["chatgpt", "openai", "ia", "asistente", "prompts"],
    descripcion: "Modelos de lenguaje y razonamiento de OpenAI para redacción, análisis y consultas.",
  },
  "claude.ai": {
    title: "Claude • Asistente IA de Anthropic",
    categoria: "Inteligencia Artificial",
    keywords: ["claude", "anthropic", "ia", "asistente", "redaccion"],
    descripcion: "Asistente inteligente con capacidad de contexto largo y análisis analítico de documentos.",
  },
  "canva.com": {
    title: "Canva • Diseño Gráfico y Plantillas",
    categoria: "Diseño & Creatividad",
    keywords: ["canva", "diseño", "plantillas", "posters", "volantes", "lonas"],
    descripcion: "Herramienta online para diseño de gráficos, presentaciones, cartelería y redes sociales.",
  },
  "figma.com": {
    title: "Figma • Diseño de Interfaces y Gráficos",
    categoria: "Diseño & Creatividad",
    keywords: ["figma", "diseño", "ui", "ux", "vectorial", "interfaces"],
    descripcion: "Diseño colaborativo de interfaces, perfiles de color y especificaciones visuales.",
  },
  "drive.google.com": {
    title: "Google Drive • Archivos y Documentación en la Nube",
    categoria: "Productividad & Trabajo",
    keywords: ["drive", "google", "carpetas", "archivos", "cloud"],
    descripcion: "Almacenamiento de carpetas compartidas, documentos y respaldo de archivos.",
  },
  "web.whatsapp.com": {
    title: "WhatsApp Web • Mensajería Instantánea",
    categoria: "Comunicación",
    keywords: ["whatsapp", "mensajes", "chat", "clientes", "comunicacion"],
    descripcion: "Canal de mensajería directa con solicitantes, clientes y proveedores.",
  },
  "notion.so": {
    title: "Notion • Espacio de Trabajo y Documentación",
    categoria: "Productividad & Trabajo",
    keywords: ["notion", "notas", "wiki", "proyectos", "organizacion"],
    descripcion: "Gestión de conocimiento, bases de datos y manuales operativos.",
  },
  "spotify.com": {
    title: "Spotify • Streaming de Música y Podcasts",
    categoria: "Música & Audio",
    keywords: ["spotify", "musica", "audio", "playlists", "enfoque"],
    descripcion: "Listas de reproducción y música instrumental para bloques de concentración.",
  },
  "youtube.com": {
    title: "YouTube • Video y Streaming",
    categoria: "Multimedia & Video",
    keywords: ["youtube", "video", "tutoriales", "streaming", "multimedia"],
    descripcion: "Plataforma de video, tutoriales técnicos y música ambiental.",
  },
};

/**
 * Fetch URL title, category, icon, and keywords via server-side scraper, with deterministic client fallback
 */
export async function fetchUrlMetadata(url: string): Promise<UrlMetadataResult> {
  const cleanUrl = url.trim();
  let hostname = "";
  try {
    const parsed = new URL(cleanUrl);
    hostname = parsed.hostname.replace(/^www\./, "");
  } catch (_) {}

  // Check known services first for instant high quality identification
  for (const [key, svc] of Object.entries(KNOWN_SERVICES)) {
    if (hostname.includes(key)) {
      return {
        url: cleanUrl,
        title: svc.title,
        categoria: svc.categoria,
        keywords: svc.keywords,
        descripcion: svc.descripcion,
        icon: `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
      };
    }
  }

  // Try server-side scraping endpoint
  try {
    const res = await fetch("/api/router/extract-metadata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: cleanUrl }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.title) {
        return {
          url: data.url || cleanUrl,
          title: data.title,
          keywords: Array.isArray(data.keywords) ? data.keywords.slice(0, 5) : ["enlace", "web", "recurso"],
          categoria: data.categoria || inferCategoryFromUrl(hostname, data.title),
          descripcion: data.description,
          icon: data.icon || (hostname ? `https://www.google.com/s2/favicons?domain=${hostname}&sz=64` : undefined),
        };
      }
    }
  } catch (err) {
    console.warn("Server metadata fetch failed, using deterministic client fallback:", err);
  }

  // Client-side deterministic fallback
  try {
    const parsed = new URL(cleanUrl);
    const domain = parsed.hostname.replace(/^www\./, "");
    const pathParts = parsed.pathname
      .split("/")
      .filter(Boolean)
      .map((p) => decodeURIComponent(p).replace(/[-_]/g, " "));
    const title = pathParts.length > 0 ? `${domain} • ${pathParts.join(" ")}` : domain;
    const keywords = [
      domain.split(".")[0],
      ...pathParts.slice(0, 2),
      "recurso",
      "web",
    ].slice(0, 4);

    return {
      url: cleanUrl,
      title: title.slice(0, 300),
      keywords,
      categoria: inferCategoryFromUrl(domain, title, parsed.pathname),
      icon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
    };
  } catch {
    return {
      url: cleanUrl,
      title: cleanUrl,
      keywords: ["enlace", "web", "recurso"],
      categoria: "Herramientas & Web",
    };
  }
}

export interface RouteResourcePlan {
  url: string;
  title: string;
  keywords: string[];
  categoria?: string;
  descripcion?: string;
  icon?: string;
  isDuplicate: boolean;
  destinationType: "TASK" | "GLOBAL" | "URL_LIBRARY";
  targetTaskId: number | null;
  targetTaskTitle?: string;
}

export interface RouterExecutionResult {
  structuredOutput: RouterStructuredOutput;
  resourcePlans: RouteResourcePlan[];
  notification: string;
  undoable: boolean;
}

/**
 * Main Deterministic Executive Router Node
 * Analyzes input, checks active task state, evaluates destination (task vs global vs url library),
 * performs deduplication, and generates structured output
 */
export async function routeExecutiveInput(
  input: string,
  activeTaskId: number | null,
  tasks: TaskItem[],
  globalResources: GlobalResource[],
  urlLibrary: UrlLibraryItem[] = [],
  destinationOverride?: "TASK" | "GLOBAL" | "URL_LIBRARY" | null
): Promise<RouterExecutionResult> {
  const trimmed = input.trim();
  const urls = extractUrls(trimmed);
  const activeTask = activeTaskId ? tasks.find((t) => t.id === activeTaskId) : null;
  const lowerInput = trimmed.toLowerCase();

  // Check if input explicitly commands saving to URL library
  const isExplicitLibraryCommand =
    destinationOverride === "URL_LIBRARY" ||
    LIBRARY_TRIGGERS.some((tr) => lowerInput.includes(tr));

  // Case 1: One or more URLs detected in input
  if (urls.length > 0) {
    const resourcePlans: RouteResourcePlan[] = [];
    const addedUrls: string[] = [];
    const duplicateUrls: string[] = [];

    // Determine target destination:
    // If explicit library command -> URL_LIBRARY
    // Else if destinationOverride === "GLOBAL" -> GLOBAL
    // Else if destinationOverride === "TASK" && activeTask -> TASK
    // Else if activeTask exists -> TASK (Ley del Foco)
    // Else -> GLOBAL
    let destType: "TASK" | "GLOBAL" | "URL_LIBRARY" = "GLOBAL";
    if (isExplicitLibraryCommand) {
      destType = "URL_LIBRARY";
    } else if (destinationOverride === "TASK" && activeTask) {
      destType = "TASK";
    } else if (destinationOverride === "GLOBAL") {
      destType = "GLOBAL";
    } else if (activeTask) {
      destType = "TASK";
    }

    for (const url of urls) {
      const metadata = await fetchUrlMetadata(url);

      if (destType === "URL_LIBRARY") {
        // Daily URL Library context
        const alreadyInLibrary = urlLibrary.some(
          (u) => u.url.toLowerCase() === url.toLowerCase()
        );
        if (alreadyInLibrary) {
          duplicateUrls.push(url);
          resourcePlans.push({
            url,
            title: metadata.title,
            keywords: metadata.keywords,
            categoria: metadata.categoria,
            descripcion: metadata.descripcion,
            icon: metadata.icon,
            isDuplicate: true,
            destinationType: "URL_LIBRARY",
            targetTaskId: null,
          });
        } else {
          addedUrls.push(url);
          resourcePlans.push({
            url,
            title: metadata.title,
            keywords: metadata.keywords,
            categoria: metadata.categoria,
            descripcion: metadata.descripcion,
            icon: metadata.icon,
            isDuplicate: false,
            destinationType: "URL_LIBRARY",
            targetTaskId: null,
          });
        }
      } else if (destType === "TASK" && activeTask) {
        // Active task context (Local): inject into task.resources
        const alreadyInTask = (activeTask.resources || []).some(
          (r) => r.url.toLowerCase() === url.toLowerCase()
        );
        if (alreadyInTask) {
          duplicateUrls.push(url);
          resourcePlans.push({
            url,
            title: metadata.title,
            keywords: metadata.keywords,
            categoria: metadata.categoria,
            descripcion: metadata.descripcion,
            icon: metadata.icon,
            isDuplicate: true,
            destinationType: "TASK",
            targetTaskId: activeTask.id,
            targetTaskTitle: activeTask.tarea,
          });
        } else {
          addedUrls.push(url);
          resourcePlans.push({
            url,
            title: metadata.title,
            keywords: metadata.keywords,
            categoria: metadata.categoria,
            descripcion: metadata.descripcion,
            icon: metadata.icon,
            isDuplicate: false,
            destinationType: "TASK",
            targetTaskId: activeTask.id,
            targetTaskTitle: activeTask.tarea,
          });
        }
      } else {
        // Global context (Isolated): inject into global_resources collection
        const alreadyInGlobal = globalResources.some(
          (g) => g.url.toLowerCase() === url.toLowerCase()
        );
        if (alreadyInGlobal) {
          duplicateUrls.push(url);
          resourcePlans.push({
            url,
            title: metadata.title,
            keywords: metadata.keywords,
            categoria: metadata.categoria,
            descripcion: metadata.descripcion,
            icon: metadata.icon,
            isDuplicate: true,
            destinationType: "GLOBAL",
            targetTaskId: null,
          });
        } else {
          addedUrls.push(url);
          resourcePlans.push({
            url,
            title: metadata.title,
            keywords: metadata.keywords,
            categoria: metadata.categoria,
            descripcion: metadata.descripcion,
            icon: metadata.icon,
            isDuplicate: false,
            destinationType: "GLOBAL",
            targetTaskId: null,
          });
        }
      }
    }

    const firstValid = resourcePlans.find((p) => !p.isDuplicate) || resourcePlans[0];
    const targetTaskId = destType === "TASK" && activeTask ? String(activeTask.id) : null;

    let systemLog = "";
    if (destType === "URL_LIBRARY") {
      systemLog = `Enrutando URL(s) a la Biblioteca de URLs del Día a Día con auto-identificación de metadatos (categoría: "${firstValid?.categoria || 'General'}").`;
      if (duplicateUrls.length > 0) {
        systemLog += ` Se omitieron ${duplicateUrls.length} URL(s) duplicadas en la biblioteca.`;
      }
    } else if (destType === "TASK" && activeTask) {
      systemLog = `Tarea activa detectada [#${activeTask.id}: ${activeTask.tarea}]. Enrutando URL(s) al contexto local de recursos.`;
      if (duplicateUrls.length > 0) {
        systemLog += ` Se omitieron ${duplicateUrls.length} URL(s) duplicadas en esta tarea.`;
      }
    } else {
      systemLog = `Sin contexto de tarea activa. Enrutando URL(s) al archivo global_resources e indexando palabras clave para Búsqueda Universal.`;
      if (duplicateUrls.length > 0) {
        systemLog += ` Se omitieron ${duplicateUrls.length} URL(s) duplicadas en el archivo global.`;
      }
    }

    let notification = "";
    if (addedUrls.length > 0) {
      if (destType === "URL_LIBRARY") {
        notification = `Se guardó ${addedUrls.length} URL en tu Biblioteca del Día a Día (${firstValid?.title?.slice(0, 35)}...)`;
      } else if (destType === "TASK" && activeTask) {
        notification = `Se adjuntó ${addedUrls.length} recurso(s) a la tarea #${activeTask.id} (${activeTask.tarea.slice(0, 30)}...)`;
      } else {
        notification = `Se indexó ${addedUrls.length} recurso(s) en el Archivo Global (recuperable vía Búsqueda Universal)`;
      }
    }
    if (duplicateUrls.length > 0) {
      notification += (notification ? " • " : "") + `Aviso: ${duplicateUrls.length} URL duplicada ya existía y fue omitida.`;
    }

    const structuredOutput: RouterStructuredOutput = {
      action: destType === "URL_LIBRARY" ? "SAVE_URL_LIBRARY" : "ROUTE_RESOURCE",
      payload: {
        url: firstValid?.url,
        urls: urls,
        title: firstValid?.title,
        keywords: firstValid?.keywords,
        categoria: firstValid?.categoria,
        descripcion: firstValid?.descripcion,
      },
      destination: {
        type: destType,
        taskId: targetTaskId,
      },
      system_log: systemLog,
      timestamp: new Date().toISOString(),
    };

    return {
      structuredOutput,
      resourcePlans,
      notification,
      undoable: addedUrls.length > 0,
    };
  }

  // Case 2: No URLs detected, short text without creation verbs -> UNIVERSAL_SEARCH
  if (isSearchQuery(trimmed)) {
    const cleanQuery = trimmed.replace(/^(?:buscar|busca|find|search|\?)\s*:?\s*/i, "").trim() || trimmed;
    const structuredOutput: RouterStructuredOutput = {
      action: "UNIVERSAL_SEARCH",
      payload: {
        searchQuery: cleanQuery,
      },
      destination: {
        type: null,
        taskId: null,
      },
      system_log: `Consulta de búsqueda detectada: "${cleanQuery}". Consultando simultáneamente tareas, recursos locales, global_resources y biblioteca de URLs.`,
      timestamp: new Date().toISOString(),
    };

    return {
      structuredOutput,
      resourcePlans: [],
      notification: `Ejecutando Búsqueda Universal para: "${cleanQuery}"`,
      undoable: false,
    };
  }

  // Case 3: In any other case -> CREATE_TASK
  const structuredOutput: RouterStructuredOutput = {
    action: "CREATE_TASK",
    payload: {
      taskText: trimmed,
    },
    destination: {
      type: "TASK",
      taskId: null,
    },
    system_log: `Entrada procesada como nueva tarea para el Ledger Maestro.`,
    timestamp: new Date().toISOString(),
  };

  return {
    structuredOutput,
    resourcePlans: [],
    notification: "Creando nueva tarea en Task-OS...",
    undoable: true,
  };
}

/**
 * Universal Search Engine
 * Simultaneously searches tasks titles, tasks' resources array, global_resources collection,
 * and the daily URL Library.
 * Merges and returns prioritized results (title exact before keyword matches).
 */
export function executeUniversalSearch(
  query: string,
  tasks: TaskItem[],
  globalResources: GlobalResource[],
  urlLibrary: UrlLibraryItem[] = []
): UniversalSearchResult[] {
  const cleanQ = query.trim().toLowerCase();
  if (!cleanQ) return [];

  const results: UniversalSearchResult[] = [];
  const seenUrls = new Set<string>();

  // 1. Search in Tasks titles and notes
  for (const task of tasks) {
    const titleMatch = task.tarea.toLowerCase().includes(cleanQ);
    const notesMatch = task.notas ? task.notas.toLowerCase().includes(cleanQ) : false;
    const domainMatch = task.dominio ? task.dominio.toLowerCase().includes(cleanQ) : false;

    if (titleMatch || notesMatch || domainMatch) {
      results.push({
        id: `task-${task.id}`,
        title: task.tarea,
        source: `Tarea #${task.id} (${task.estado})`,
        sourceType: "task_title",
        taskId: task.id,
        taskTitle: task.tarea,
        matchType: titleMatch ? "title" : "content",
        addedAt: task.fechaIngreso,
      });
    }

    // 2. Search in task.resources array
    if (Array.isArray(task.resources)) {
      for (const res of task.resources) {
        const resTitleMatch = res.title.toLowerCase().includes(cleanQ);
        const resUrlMatch = res.url.toLowerCase().includes(cleanQ);

        if (resTitleMatch || resUrlMatch) {
          seenUrls.add(res.url.toLowerCase());
          results.push({
            id: `task-res-${task.id}-${res.url}`,
            title: res.title || res.url,
            url: res.url,
            source: `Tarea: ${task.tarea}`,
            sourceType: "task_resource",
            taskId: task.id,
            taskTitle: task.tarea,
            matchType: resTitleMatch ? "title" : "content",
            addedAt: res.addedAt,
          });
        }
      }
    }
  }

  // 3. Search in global_resources
  for (const gr of globalResources) {
    if (seenUrls.has(gr.url.toLowerCase())) continue;

    const titleMatch = gr.title.toLowerCase().includes(cleanQ);
    const urlMatch = gr.url.toLowerCase().includes(cleanQ);
    const keywordMatch = gr.keywords.some((k) => k.toLowerCase().includes(cleanQ));

    if (titleMatch || urlMatch || keywordMatch) {
      results.push({
        id: `global-res-${gr.id}`,
        title: gr.title,
        url: gr.url,
        source: "Archivo global",
        sourceType: "global_resource",
        keywords: gr.keywords,
        matchType: titleMatch ? "title" : keywordMatch ? "keyword" : "content",
        addedAt: gr.savedAt,
      });
    }
  }

  // 4. Search in urlLibrary (Biblioteca de URLs Día a Día)
  for (const item of urlLibrary) {
    if (seenUrls.has(item.url.toLowerCase())) continue;

    const titleMatch = item.title.toLowerCase().includes(cleanQ);
    const urlMatch = item.url.toLowerCase().includes(cleanQ);
    const descMatch = item.descripcion ? item.descripcion.toLowerCase().includes(cleanQ) : false;
    const catMatch = item.categoria ? item.categoria.toLowerCase().includes(cleanQ) : false;
    const keywordMatch = (item.keywords || []).some((k) => k.toLowerCase().includes(cleanQ));

    if (titleMatch || urlMatch || descMatch || catMatch || keywordMatch) {
      seenUrls.add(item.url.toLowerCase());
      results.push({
        id: `url-lib-${item.id}`,
        title: item.title,
        url: item.url,
        source: `Biblioteca URLs • ${item.categoria || "Día a Día"}`,
        sourceType: "url_library",
        keywords: item.keywords,
        categoria: item.categoria,
        matchType: titleMatch ? "title" : keywordMatch ? "keyword" : "content",
        addedAt: item.createdAt,
      });
    }
  }

  // Prioritize results: Title matches first, then keyword matches, then content
  return results.sort((a, b) => {
    const score = (item: UniversalSearchResult) => {
      let pts = 0;
      if (item.matchType === "title") pts += 100;
      else if (item.matchType === "keyword") pts += 50;
      else pts += 10;
      if (item.title.toLowerCase().startsWith(cleanQ)) pts += 40;
      return pts;
    };
    return score(b) - score(a);
  });
}

