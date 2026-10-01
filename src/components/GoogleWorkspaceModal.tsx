import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Calendar,
  Users,
  CheckSquare,
  FileSpreadsheet,
  StickyNote,
  Flame,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  LogOut,
  LogIn,
  AlertCircle,
  Plus,
  Send,
  Download,
  Copy,
  Check,
  ShieldCheck,
  ArrowLeftRight,
  Filter,
  Search,
  Link2,
  Sparkles,
  CheckCircle2,
  Clock,
  Layers,
  Upload,
  Apple,
  Phone,
} from "lucide-react";
import {
  auth,
  googleSignIn,
  logout,
  getAccessToken,
  initAuth,
  testFirestoreConnection,
  getFriendlyAuthErrorMessage,
} from "../lib/firebase";
import {
  fetchGoogleContacts,
  createGoogleContact,
  fetchCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  fetchGoogleTasks,
  createGoogleTask,
  updateGoogleTask,
  patchGoogleTaskStatus,
  deleteGoogleTask,
  exportLedgerToGoogleSheet,
  formatTaskForGoogleKeep,
  formatAllTasksForGoogleKeep,
  GoogleCalendarEvent,
  GoogleTaskItem,
} from "../lib/googleWorkspace";
import {
  batchSyncTasksToFirestore,
  loadTasksFromFirestore,
} from "../lib/firestoreService";
import { Contact, TaskItem } from "../types";
import { User } from "firebase/auth";

interface GoogleWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskItem[];
  contacts: Contact[];
  onImportContacts: (newContacts: Contact[]) => void;
  onImportTasks: (newTasks: TaskItem[]) => void;
  onTasksSynced?: (syncedTasks: TaskItem[]) => void;
  onUpdateTasks?: (updatedTasks: TaskItem[]) => void;
}

type TabType =
  | "workspace"
  | "sync"
  | "contacts"
  | "calendar"
  | "tasks"
  | "sheets"
  | "keep"
  | "firebase";

export default function GoogleWorkspaceModal({
  isOpen,
  onClose,
  tasks,
  contacts,
  onImportContacts,
  onImportTasks,
  onTasksSynced,
  onUpdateTasks,
}: GoogleWorkspaceModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("sync");
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copyDomainFeedback, setCopyDomainFeedback] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Data states
  const [googleContacts, setGoogleContacts] = useState<Contact[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<GoogleCalendarEvent[]>([]);
  const [googleTasks, setGoogleTasks] = useState<GoogleTaskItem[]>([]);
  const [createdSheetUrl, setCreatedSheetUrl] = useState<string | null>(null);

  // Selective bidirectional sync states
  const [syncSubTab, setSyncSubTab] = useState<"export" | "import" | "auto">("export");
  const [selectedTaskIdsForSync, setSelectedTaskIdsForSync] = useState<number[]>([]);
  const [syncFilter, setSyncFilter] = useState<"all" | "pending" | "unlinked" | "linked">("all");
  const [syncSearchQuery, setSyncSearchQuery] = useState("");
  const [syncDestination, setSyncDestination] = useState<"both" | "tasks" | "calendar">("both");
  const [selectedRemoteTaskIds, setSelectedRemoteTaskIds] = useState<string[]>([]);
  const [selectedRemoteEventIds, setSelectedRemoteEventIds] = useState<string[]>([]);
  const [defaultEventTime, setDefaultEventTime] = useState("10:00");
  const [isSyncingBidirectional, setIsSyncingBidirectional] = useState(false);

  // Form states for adding items
  const [selectedTaskIdForCalendar, setSelectedTaskIdForCalendar] = useState<number>(
    tasks[0]?.id || 1
  );
  const [eventDate, setEventDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [eventTime, setEventTime] = useState<string>("10:00");
  const [selectedTaskIdForTasks, setSelectedTaskIdForTasks] = useState<number>(
    tasks[0]?.id || 1
  );

  // Confirmation dialog state (MANDATORY for Workspace operations)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionLabel: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    actionLabel: "Confirmar",
    onConfirm: () => {},
  });

  // Init Auth listener
  useEffect(() => {
    const unsub = initAuth(
      async (authUser, token) => {
        setUser(authUser);
        if (token) setAccessToken(token);
        testFirestoreConnection();
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage("Iniciando sesión con Google...");
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        setStatusMessage(`Sesión iniciada como ${result.user.displayName || result.user.email}`);
        setTimeout(() => setStatusMessage(null), 4000);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(getFriendlyAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setUser(null);
      setAccessToken(null);
      setGoogleContacts([]);
      setCalendarEvents([]);
      setGoogleTasks([]);
      setStatusMessage("Sesión cerrada");
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "Error al cerrar sesión");
    }
  };

  // Contacts handler
  const loadContacts = async () => {
    if (!accessToken) {
      setErrorMessage("Por favor inicia sesión con Google primero para acceder a Google Contacts");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const fetched = await fetchGoogleContacts(accessToken);
      setGoogleContacts(fetched);
      setStatusMessage(`${fetched.length} contactos cargados de Google Contacts`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "No se pudieron obtener contactos");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportContacts = () => {
    if (googleContacts.length === 0) return;
    onImportContacts(googleContacts);
    setStatusMessage(`${googleContacts.length} contactos importados a la agenda de Task-OS`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Calendar handlers
  const loadCalendarEvents = async () => {
    if (!accessToken) {
      setErrorMessage("Por favor inicia sesión con Google primero para acceder a Google Calendar");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const events = await fetchCalendarEvents(accessToken);
      setCalendarEvents(events);
      setStatusMessage(`${events.length} eventos obtenidos de Google Calendar`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "No se pudieron obtener eventos de Calendar");
    } finally {
      setIsLoading(false);
    }
  };

  const requestCreateCalendarEvent = () => {
    const task = tasks.find((t) => t.id === selectedTaskIdForCalendar);
    if (!task) return;

    setConfirmDialog({
      isOpen: true,
      title: "Crear Evento en Google Calendar",
      description: `¿Deseas agendar la tarea "#${task.id}: ${task.tarea}" en tu Google Calendar para la fecha ${eventDate} a las ${eventTime} hrs?`,
      actionLabel: "Crear en Calendar",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        setIsLoading(true);
        setErrorMessage(null);
        try {
          if (!accessToken) throw new Error("Falta token de acceso de Google");
          await createCalendarEvent(accessToken, {
            summary: `[Task-OS] ${task.tarea}`,
            description: `Solicitante: ${task.solicitante}\nEstado: ${task.estado}\nNotas: ${task.notas || "N/A"}\nID Task-OS: #${task.id}`,
            date: eventDate,
            startTime: eventTime,
            durationMinutes: 60,
          });
          setStatusMessage(`Evento agendado exitosamente en Google Calendar para "${task.tarea}"`);
          setTimeout(() => setStatusMessage(null), 4000);
          loadCalendarEvents();
        } catch (err: any) {
          setErrorMessage(err.message || "Error al agendar en Calendar");
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  // Google Tasks handler
  const loadGoogleTasks = async () => {
    if (!accessToken) {
      setErrorMessage("Por favor inicia sesión con Google primero para acceder a Google Tasks");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const fetched = await fetchGoogleTasks(accessToken);
      setGoogleTasks(fetched);
      setStatusMessage(`${fetched.length} tareas cargadas de Google Tasks`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "No se pudieron obtener tareas de Google Tasks");
    } finally {
      setIsLoading(false);
    }
  };

  const requestCreateGoogleTask = () => {
    const task = tasks.find((t) => t.id === selectedTaskIdForTasks);
    if (!task) return;

    setConfirmDialog({
      isOpen: true,
      title: "Exportar Tarea a Google Tasks",
      description: `¿Deseas enviar la tarea "#${task.id}: ${task.tarea}" a tu lista de Google Tasks?`,
      actionLabel: "Enviar a Google Tasks",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        setIsLoading(true);
        setErrorMessage(null);
        try {
          if (!accessToken) throw new Error("Falta token de acceso de Google");
          await createGoogleTask(accessToken, {
            title: `[#${task.id}] ${task.tarea}`,
            notes: `Solicitante: ${task.solicitante}\nDominio: ${task.dominio || "General"}\nNotas: ${task.notas || ""}`,
            dueDate: task.fechaLimite || undefined,
          });
          setStatusMessage(`Tarea enviada exitosamente a Google Tasks`);
          setTimeout(() => setStatusMessage(null), 4000);
          loadGoogleTasks();
        } catch (err: any) {
          setErrorMessage(err.message || "Error al crear tarea en Google Tasks");
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  const handleImportGoogleTasksToLedger = () => {
    if (googleTasks.length === 0) return;
    let nextId = tasks.length > 0 ? Math.max(...tasks.map((t) => t.id)) + 1 : 1;
    const today = new Date().toISOString().split("T")[0];

    const newTasks: TaskItem[] = googleTasks.map((gt) => {
      const id = nextId++;
      return {
        id,
        tarea: gt.title,
        solicitante: "Google Tasks",
        estado: gt.status === "completed" ? "Completado" : "Pendiente",
        fechaIngreso: today,
        fechaLimite: gt.due ? gt.due.split("T")[0] : undefined,
        dominio: "Google Tasks",
        notas: gt.notes || undefined,
      };
    });

    onImportTasks(newTasks);
    setStatusMessage(`${newTasks.length} tareas importadas al Ledger Maestro`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  /* =========================================================
     BIDIRECTIONAL SYNC & SELECTIVE LINKING HANDLERS
  ========================================================= */

  const loadAllRemoteGoogleData = async () => {
    if (!accessToken) {
      setErrorMessage("Por favor inicia sesión con Google para sincronizar.");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [fetchedTasks, fetchedCalendar] = await Promise.all([
        fetchGoogleTasks(accessToken).catch((e) => {
          console.warn("Error fetching Google Tasks", e);
          return [] as GoogleTaskItem[];
        }),
        fetchCalendarEvents(accessToken, 30).catch((e) => {
          console.warn("Error fetching Calendar events", e);
          return [] as GoogleCalendarEvent[];
        }),
      ]);
      setGoogleTasks(fetchedTasks);
      setCalendarEvents(fetchedCalendar);
      setStatusMessage(
        `Datos cargados: ${fetchedTasks.length} tareas en Google Tasks y ${fetchedCalendar.length} eventos en Calendar.`
      );
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || "Error al consultar servicios de Google Workspace");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken && activeTab === "sync" && googleTasks.length === 0 && calendarEvents.length === 0) {
      loadAllRemoteGoogleData();
    }
  }, [accessToken, activeTab]);

  const filteredTasksForSync = useMemo(() => {
    return tasks.filter((t) => {
      if (syncSearchQuery.trim()) {
        const q = syncSearchQuery.toLowerCase();
        const matchTitle = t.tarea.toLowerCase().includes(q);
        const matchSolicitante = t.solicitante.toLowerCase().includes(q);
        const matchNotes = t.notas?.toLowerCase().includes(q);
        if (!matchTitle && !matchSolicitante && !matchNotes) return false;
      }
      if (syncFilter === "pending") return t.estado !== "Completado";
      if (syncFilter === "unlinked") return !t.googleTaskId && !t.googleCalendarEventId;
      if (syncFilter === "linked") return Boolean(t.googleTaskId || t.googleCalendarEventId);
      return true;
    });
  }, [tasks, syncSearchQuery, syncFilter]);

  const handleToggleTaskSelection = (id: number) => {
    setSelectedTaskIdsForSync((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    setSelectedTaskIdsForSync(filteredTasksForSync.map((t) => t.id));
  };

  const handleDeselectAll = () => {
    setSelectedTaskIdsForSync([]);
  };

  const handleToggleRemoteTaskSelection = (id: string) => {
    setSelectedRemoteTaskIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleToggleRemoteEventSelection = (id: string) => {
    setSelectedRemoteEventIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Selective Linking to Google (Tasks & Calendar)
  const requestSelectiveSyncToGoogle = (
    targetTaskIds?: number[],
    forcedDestination?: "both" | "tasks" | "calendar"
  ) => {
    const idsToSync = targetTaskIds || selectedTaskIdsForSync;
    const dest = forcedDestination || syncDestination;
    if (idsToSync.length === 0) {
      setErrorMessage("Por favor selecciona al menos una tarea para vincular.");
      return;
    }
    const targetTasks = tasks.filter((t) => idsToSync.includes(t.id));
    const destLabel =
      dest === "both"
        ? "Google Tasks y Google Calendar"
        : dest === "tasks"
        ? "Google Tasks"
        : "Google Calendar";

    setConfirmDialog({
      isOpen: true,
      title: `Vincular ${targetTasks.length} Tarea(s) con ${destLabel}`,
      description: `¿Confirmas que deseas enviar y sincronizar las ${targetTasks.length} tareas seleccionadas de Task-OS hacia ${destLabel}? Esto creará o actualizará los registros correspondientes con sus fechas, estados y notas.`,
      actionLabel: "Vincular y Sincronizar",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        if (!accessToken) {
          setErrorMessage("Falta token de acceso de Google. Inicia sesión nuevamente.");
          return;
        }
        setIsSyncingBidirectional(true);
        setStatusMessage(`Sincronizando ${targetTasks.length} tarea(s) hacia ${destLabel}...`);
        setErrorMessage(null);
        try {
          const updatedTaskList: TaskItem[] = [...tasks];

          for (const task of targetTasks) {
            let currentGoogleTaskId = task.googleTaskId;
            let currentCalendarEventId = task.googleCalendarEventId;
            let currentCalendarLink = task.googleCalendarHtmlLink;

            // 1. Google Tasks
            if (dest === "both" || dest === "tasks") {
              try {
                if (currentGoogleTaskId) {
                  await updateGoogleTask(accessToken, currentGoogleTaskId, {
                    title: `[#${task.id}] ${task.tarea}`,
                    notes: `Solicitante: ${task.solicitante}\nEstado: ${task.estado}\nNotas: ${task.notas || ""}`,
                    status: task.estado === "Completado" ? "completed" : "needsAction",
                    dueDate: task.fechaLimite || undefined,
                  });
                } else {
                  const created = await createGoogleTask(accessToken, {
                    title: `[#${task.id}] ${task.tarea}`,
                    notes: `Solicitante: ${task.solicitante}\nEstado: ${task.estado}\nNotas: ${task.notas || ""}`,
                    dueDate: task.fechaLimite || undefined,
                  });
                  currentGoogleTaskId = created.id;
                }
              } catch (e: any) {
                console.error(`Error syncing task #${task.id} to Google Tasks:`, e);
              }
            }

            // 2. Google Calendar
            if (dest === "both" || dest === "calendar") {
              try {
                const targetDate = task.fechaLimite || new Date().toISOString().split("T")[0];
                if (currentCalendarEventId) {
                  const updatedEvt = await updateCalendarEvent(accessToken, currentCalendarEventId, {
                    summary: `[Task-OS] ${task.tarea}`,
                    description: `Solicitante: ${task.solicitante}\nEstado: ${task.estado}\nNotas: ${task.notas || "N/A"}\nID Task-OS: #${task.id}`,
                    date: targetDate,
                    startTime: defaultEventTime,
                    durationMinutes: 60,
                  });
                  if (updatedEvt.htmlLink) currentCalendarLink = updatedEvt.htmlLink;
                } else {
                  const createdEvt = await createCalendarEvent(accessToken, {
                    summary: `[Task-OS] ${task.tarea}`,
                    description: `Solicitante: ${task.solicitante}\nEstado: ${task.estado}\nNotas: ${task.notas || "N/A"}\nID Task-OS: #${task.id}`,
                    date: targetDate,
                    startTime: defaultEventTime,
                    durationMinutes: 60,
                  });
                  currentCalendarEventId = createdEvt.id;
                  if (createdEvt.htmlLink) currentCalendarLink = createdEvt.htmlLink;
                }
              } catch (e: any) {
                console.error(`Error syncing task #${task.id} to Google Calendar:`, e);
              }
            }

            // Update local task item record
            const idx = updatedTaskList.findIndex((t) => t.id === task.id);
            if (idx !== -1) {
              updatedTaskList[idx] = {
                ...updatedTaskList[idx],
                googleTaskId: currentGoogleTaskId,
                googleCalendarEventId: currentCalendarEventId,
                googleCalendarHtmlLink: currentCalendarLink,
                googleSyncStatus: "synced",
                lastGoogleSync: new Date().toISOString(),
              };
            }
          }

          if (onUpdateTasks) {
            onUpdateTasks(updatedTaskList);
          }
          setStatusMessage(`¡${targetTasks.length} tarea(s) vinculadas exitosamente con Google Workspace!`);
          setTimeout(() => setStatusMessage(null), 4000);
          setSelectedTaskIdsForSync([]);
          loadAllRemoteGoogleData();
        } catch (err: any) {
          setErrorMessage(err.message || "Error durante la sincronización");
        } finally {
          setIsSyncingBidirectional(false);
        }
      },
    });
  };

  // Import Selected Items from Google (Tasks & Calendar)
  const requestImportFromGoogle = () => {
    const selectedTasks = googleTasks.filter((gt) => selectedRemoteTaskIds.includes(gt.id));
    const selectedEvents = calendarEvents.filter((ge) => selectedRemoteEventIds.includes(ge.id));
    const totalCount = selectedTasks.length + selectedEvents.length;

    if (totalCount === 0) {
      setErrorMessage("Selecciona al menos una tarea o evento de Google para importar.");
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: `Importar ${totalCount} elemento(s) a Task-OS`,
      description: `¿Confirmas que deseas importar ${selectedTasks.length} tarea(s) de Google Tasks y ${selectedEvents.length} evento(s) de Google Calendar hacia tu Ledger de Task-OS? Las tareas existentes coincidentes actualizarán su estado y fecha.`,
      actionLabel: "Importar a Task-OS",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        setIsSyncingBidirectional(true);
        setStatusMessage(`Importando ${totalCount} ítem(s) de Google a Task-OS...`);
        try {
          const currentList = [...tasks];
          let nextId = currentList.length > 0 ? Math.max(...currentList.map((t) => t.id)) + 1 : 1;
          const today = new Date().toISOString().split("T")[0];

          // Process Google Tasks
          for (const gt of selectedTasks) {
            const matchIndex = currentList.findIndex(
              (t) =>
                t.googleTaskId === gt.id ||
                t.tarea.toLowerCase().trim() === gt.title.replace(/^\[#\d+\]\s*/, "").toLowerCase().trim()
            );

            if (matchIndex !== -1) {
              currentList[matchIndex] = {
                ...currentList[matchIndex],
                googleTaskId: gt.id,
                estado: gt.status === "completed" ? "Completado" : currentList[matchIndex].estado,
                fechaLimite: gt.due ? gt.due.split("T")[0] : currentList[matchIndex].fechaLimite,
                notas: gt.notes || currentList[matchIndex].notas,
                googleSyncStatus: "synced",
                lastGoogleSync: new Date().toISOString(),
              };
            } else {
              currentList.push({
                id: nextId++,
                tarea: gt.title.replace(/^\[#\d+\]\s*/, ""),
                solicitante: "Google Tasks",
                estado: gt.status === "completed" ? "Completado" : "Pendiente",
                fechaIngreso: today,
                fechaLimite: gt.due ? gt.due.split("T")[0] : undefined,
                dominio: "Google Tasks",
                notas: gt.notes || undefined,
                googleTaskId: gt.id,
                googleSyncStatus: "synced",
                lastGoogleSync: new Date().toISOString(),
              });
            }
          }

          // Process Google Calendar events
          for (const ge of selectedEvents) {
            const cleanTitle = ge.summary.replace(/^\[Task-OS\]\s*/, "");
            const matchIndex = currentList.findIndex(
              (t) =>
                t.googleCalendarEventId === ge.id ||
                t.tarea.toLowerCase().trim() === cleanTitle.toLowerCase().trim()
            );

            const eventDateStr = ge.start.dateTime
              ? ge.start.dateTime.split("T")[0]
              : ge.start.date || today;

            if (matchIndex !== -1) {
              currentList[matchIndex] = {
                ...currentList[matchIndex],
                googleCalendarEventId: ge.id,
                googleCalendarHtmlLink: ge.htmlLink || currentList[matchIndex].googleCalendarHtmlLink,
                fechaLimite: eventDateStr,
                googleSyncStatus: "synced",
                lastGoogleSync: new Date().toISOString(),
              };
            } else {
              currentList.push({
                id: nextId++,
                tarea: cleanTitle,
                solicitante: "Google Calendar",
                estado: "Pendiente",
                fechaIngreso: today,
                fechaLimite: eventDateStr,
                dominio: "Calendar",
                notas: ge.description || undefined,
                googleCalendarEventId: ge.id,
                googleCalendarHtmlLink: ge.htmlLink,
                googleSyncStatus: "synced",
                lastGoogleSync: new Date().toISOString(),
              });
            }
          }

          if (onUpdateTasks) {
            onUpdateTasks(currentList);
          }
          setSelectedRemoteTaskIds([]);
          setSelectedRemoteEventIds([]);
          setStatusMessage(`¡${totalCount} elemento(s) incorporados exitosamente a Task-OS!`);
          setTimeout(() => setStatusMessage(null), 4000);
        } catch (err: any) {
          setErrorMessage(err.message || "Error al importar desde Google");
        } finally {
          setIsSyncingBidirectional(false);
        }
      },
    });
  };

  // Smart Reconcile Diffs
  const smartDiffs = useMemo(() => {
    // 1. Google Tasks completed that are not completed in Task-OS
    const googleCompletedMismatch = tasks.filter((t) => {
      if (!t.googleTaskId || t.estado === "Completado") return false;
      const remote = googleTasks.find((gt) => gt.id === t.googleTaskId);
      return remote?.status === "completed";
    });

    // 2. Task-OS completed that are not completed in Google Tasks
    const localCompletedMismatch = tasks.filter((t) => {
      if (!t.googleTaskId || t.estado !== "Completado") return false;
      const remote = googleTasks.find((gt) => gt.id === t.googleTaskId);
      return remote?.status === "needsAction";
    });

    // 3. New tasks in Google Tasks not linked in Task-OS
    const remoteGoogleTasksNew = googleTasks.filter((gt) => {
      return !tasks.some(
        (t) =>
          t.googleTaskId === gt.id ||
          t.tarea.toLowerCase().trim() === gt.title.replace(/^\[#\d+\]\s*/, "").toLowerCase().trim()
      );
    });

    // 4. Task-OS tasks not yet linked
    const localUnlinkedTasks = tasks.filter((t) => !t.googleTaskId && !t.googleCalendarEventId);

    return {
      googleCompletedMismatch,
      localCompletedMismatch,
      remoteGoogleTasksNew,
      localUnlinkedTasks,
      totalDiffs:
        googleCompletedMismatch.length +
        localCompletedMismatch.length +
        remoteGoogleTasksNew.length +
        localUnlinkedTasks.length,
    };
  }, [tasks, googleTasks]);

  // Execute Smart Reconciliation
  const requestSmartReconcile = () => {
    if (smartDiffs.totalDiffs === 0) {
      setStatusMessage("Todo está perfectamente sincronizado entre Task-OS y Google Workspace.");
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: "Sincronización Bidireccional Automática",
      description: `Se reconciliarán ${smartDiffs.totalDiffs} diferencias detectadas:\n• ${smartDiffs.googleCompletedMismatch.length} tareas completadas en Google se marcarán como completadas en Task-OS.\n• ${smartDiffs.localCompletedMismatch.length} tareas completadas en Task-OS se actualizarán en Google Tasks.\n• ${smartDiffs.remoteGoogleTasksNew.length} nuevas tareas de Google se importarán a Task-OS.\n• ${smartDiffs.localUnlinkedTasks.length} tareas de Task-OS se vincularán a Google Tasks.\n¿Deseas continuar?`,
      actionLabel: "Ejecutar Sincronización Total",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        if (!accessToken) {
          setErrorMessage("Falta token de acceso de Google");
          return;
        }
        setIsSyncingBidirectional(true);
        setStatusMessage("Ejecutando reconciliación bidireccional...");
        try {
          const currentList = [...tasks];
          let nextId = currentList.length > 0 ? Math.max(...currentList.map((t) => t.id)) + 1 : 1;
          const today = new Date().toISOString().split("T")[0];

          // 1. Google completed -> update Task-OS
          for (const t of smartDiffs.googleCompletedMismatch) {
            const idx = currentList.findIndex((item) => item.id === t.id);
            if (idx !== -1) {
              currentList[idx] = {
                ...currentList[idx],
                estado: "Completado",
                googleSyncStatus: "synced",
                lastGoogleSync: new Date().toISOString(),
              };
            }
          }

          // 2. Task-OS completed -> update Google Tasks
          for (const t of smartDiffs.localCompletedMismatch) {
            if (t.googleTaskId) {
              await patchGoogleTaskStatus(accessToken, t.googleTaskId, "completed");
              const idx = currentList.findIndex((item) => item.id === t.id);
              if (idx !== -1) {
                currentList[idx] = {
                  ...currentList[idx],
                  googleSyncStatus: "synced",
                  lastGoogleSync: new Date().toISOString(),
                };
              }
            }
          }

          // 3. New tasks in Google Tasks -> import into Task-OS
          for (const gt of smartDiffs.remoteGoogleTasksNew) {
            currentList.push({
              id: nextId++,
              tarea: gt.title.replace(/^\[#\d+\]\s*/, ""),
              solicitante: "Google Tasks",
              estado: gt.status === "completed" ? "Completado" : "Pendiente",
              fechaIngreso: today,
              fechaLimite: gt.due ? gt.due.split("T")[0] : undefined,
              dominio: "Google Tasks",
              notas: gt.notes || undefined,
              googleTaskId: gt.id,
              googleSyncStatus: "synced",
              lastGoogleSync: new Date().toISOString(),
            });
          }

          // 4. Local unlinked tasks -> send to Google Tasks
          for (const t of smartDiffs.localUnlinkedTasks) {
            try {
              const created = await createGoogleTask(accessToken, {
                title: `[#${t.id}] ${t.tarea}`,
                notes: `Solicitante: ${t.solicitante}\nEstado: ${t.estado}\nNotas: ${t.notas || ""}`,
                dueDate: t.fechaLimite || undefined,
              });
              const idx = currentList.findIndex((item) => item.id === t.id);
              if (idx !== -1) {
                currentList[idx] = {
                  ...currentList[idx],
                  googleTaskId: created.id,
                  googleSyncStatus: "synced",
                  lastGoogleSync: new Date().toISOString(),
                };
              }
            } catch (e: any) {
              console.error(`Error auto-syncing unlinked task #${t.id}:`, e);
            }
          }

          if (onUpdateTasks) {
            onUpdateTasks(currentList);
          }
          setStatusMessage("¡Sincronización bidireccional completada exitosamente!");
          setTimeout(() => setStatusMessage(null), 4000);
          loadAllRemoteGoogleData();
        } catch (err: any) {
          setErrorMessage(err.message || "Error en reconciliación automática");
        } finally {
          setIsSyncingBidirectional(false);
        }
      },
    });
  };

  // Google Sheets handler
  const requestExportToGoogleSheets = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Exportar Ledger a Google Sheets",
      description: `Se creará una nueva hoja de cálculo en tu Google Drive con las ${tasks.length} tareas del Ledger Maestro, organizadas en columnas con formato limpio.`,
      actionLabel: "Crear Hoja de Cálculo",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        setIsLoading(true);
        setErrorMessage(null);
        try {
          if (!accessToken) throw new Error("Falta token de acceso de Google");
          const result = await exportLedgerToGoogleSheet(accessToken, tasks);
          setCreatedSheetUrl(result.spreadsheetUrl);
          setStatusMessage("Hoja de Google Sheets creada con éxito.");
        } catch (err: any) {
          setErrorMessage(err.message || "Error al exportar a Google Sheets");
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  // Firebase Firestore handler
  const handleSyncToFirestore = async () => {
    if (!user) {
      setErrorMessage("Debes iniciar sesión con Google para sincronizar en Firestore");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await batchSyncTasksToFirestore(user.uid, tasks);
      setStatusMessage(`${tasks.length} tareas sincronizadas con Firestore en la nube`);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || "Error al sincronizar con Firestore");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePullFromFirestore = async () => {
    if (!user) {
      setErrorMessage("Debes iniciar sesión con Google para cargar desde Firestore");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const loaded = await loadTasksFromFirestore(user.uid);
      if (loaded.length > 0) {
        if (onTasksSynced) onTasksSynced(loaded);
        setStatusMessage(`${loaded.length} tareas recuperadas de Firestore`);
      } else {
        setStatusMessage("No hay tareas previas en Firestore para este usuario.");
      }
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || "Error al cargar de Firestore");
    } finally {
      setIsLoading(false);
    }
  };

  // Keep copy handler
  const handleCopyKeepFormat = () => {
    const text = formatAllTasksForGoogleKeep(tasks);
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="google-workspace-modal"
        className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/80 dark:bg-stone-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-blue-500 p-0.5 shadow-xs flex items-center justify-center">
              <div className="w-full h-full bg-white dark:bg-stone-900 rounded-[14px] flex items-center justify-center">
                <Flame size={20} className="text-amber-500" />
              </div>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                Google Workspace & Firebase Hub
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Sincronización en tiempo real y conexión con Calendar, Contacts, Tasks, Sheets y Keep
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Status / Alert notifications */}
        {statusMessage && (
          <div className="px-5 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={15} />
              <span>{statusMessage}</span>
            </div>
            <button onClick={() => setStatusMessage(null)}>✕</button>
          </div>
        )}
        {errorMessage && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle size={18} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <div className="font-bold text-sm text-rose-900 dark:text-rose-100">
                    {errorMessage.includes("unauthorized-domain") || errorMessage.includes("Dominio no autorizado")
                      ? "Dominio no autorizado en Firebase (auth/unauthorized-domain)"
                      : "Aviso de Autenticación"}
                  </div>
                  <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
                    {errorMessage}
                  </p>

                  {(errorMessage.includes("unauthorized-domain") || errorMessage.includes("Dominio no autorizado")) && (
                    <div className="mt-2.5 pt-2.5 border-t border-rose-200/80 dark:border-rose-800/60 space-y-2.5">
                      <p className="font-semibold text-stone-800 dark:text-stone-200">
                        Añade estos dominios a Firebase Console para autorizar el inicio de sesión:
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Domain 1: l.fgdll.org */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-2xs font-mono text-[11px] font-bold">
                          <span>l.fgdll.org</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText("l.fgdll.org");
                              setCopyDomainFeedback("¡Copiado: l.fgdll.org!");
                              setTimeout(() => setCopyDomainFeedback(null), 3000);
                            }}
                            className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded text-stone-500 hover:text-stone-900"
                            title="Copiar l.fgdll.org"
                          >
                            <Copy size={13} />
                          </button>
                        </div>

                        {/* Domain 2: current window hostname if different */}
                        {typeof window !== "undefined" && window.location.hostname !== "l.fgdll.org" && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-2xs font-mono text-[11px] font-bold">
                            <span>{window.location.hostname}</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(window.location.hostname);
                                setCopyDomainFeedback(`¡Copiado: ${window.location.hostname}!`);
                                setTimeout(() => setCopyDomainFeedback(null), 3000);
                              }}
                              className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded text-stone-500 hover:text-stone-900"
                              title="Copiar dominio actual"
                            >
                              <Copy size={13} />
                            </button>
                          </div>
                        )}

                        <a
                          href="https://console.firebase.google.com/project/gen-lang-client-0098696571/authentication/settings"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs shadow-2xs transition-colors"
                        >
                          <span>Abrir Firebase Console &gt; Settings</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>

                      {copyDomainFeedback && (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold animate-in fade-in">
                          {copyDomainFeedback}
                        </p>
                      )}

                      <div className="bg-white/80 dark:bg-stone-900/80 p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 text-[11px] text-stone-700 dark:text-stone-300 space-y-1">
                        <div className="font-semibold text-stone-900 dark:text-stone-100">Pasos para autorizar:</div>
                        <ol className="list-decimal pl-4 space-y-0.5">
                          <li>Abre Firebase Console en la pestaña <strong>Settings &gt; Authorized domains (Dominios autorizados)</strong>.</li>
                          <li>Haz clic en <strong>Añadir dominio</strong> (Add domain).</li>
                          <li>Pega <code className="font-mono font-bold">l.fgdll.org</code> (y el dominio de previsualización) y haz clic en <strong>Guardar</strong>.</li>
                          <li>Vuelve aquí y haz clic en <strong>Iniciar sesión</strong>.</li>
                        </ol>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 p-1 shrink-0"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* User Account Bar */}
        <div className="px-5 py-3 border-b border-stone-200 dark:border-stone-800 bg-stone-100/60 dark:bg-stone-950/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2.5">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "Google"}
                    className="w-8 h-8 rounded-full border border-stone-300 dark:border-stone-700"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                    {user.email?.charAt(0).toUpperCase() || "G"}
                  </div>
                )}
                <div>
                  <div className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                    <span>{user.displayName || "Usuario Google"}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1">
                      <ShieldCheck size={10} /> Conectado
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500">{user.email}</div>
                </div>
              </div>
            ) : (
              <div className="text-stone-600 dark:text-stone-400">
                Inicia sesión con tu cuenta de Google para activar Firestore y conectar Workspace.
              </div>
            )}
          </div>

          <div>
            {user ? (
              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium flex items-center gap-1.5 transition-colors"
              >
                <LogOut size={13} />
                <span>Cerrar sesión</span>
              </button>
            ) : (
              <button
                onClick={handleSignIn}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-950 font-bold flex items-center gap-2 shadow-sm transition-all"
              >
                <LogIn size={15} />
                <span>{isLoading ? "Conectando..." : "Conectar Cuenta Google"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab("sync")}
            className={`px-3 py-2 rounded-xl flex items-center gap-1.5 shrink-0 transition-all ${
              activeTab === "sync"
                ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 text-white font-bold shadow-xs"
                : "text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
            }`}
          >
            <ArrowLeftRight size={14} />
            <span>Sincronización Bidireccional</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-black">
              {tasks.filter((t) => t.googleTaskId || t.googleCalendarEventId).length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("workspace")}
            className={`px-3 py-2 rounded-xl flex items-center gap-1.5 shrink-0 transition-colors ${
              activeTab === "workspace"
                ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
            }`}
          >
            <span>Overview</span>
          </button>
          <button
            onClick={() => setActiveTab("tasks")}
            className={`px-3 py-2 rounded-xl flex items-center gap-1.5 shrink-0 transition-colors ${
              activeTab === "tasks"
                ? "bg-blue-500 text-white"
                : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
            }`}
          >
            <CheckSquare size={14} />
            <span>Google Tasks</span>
          </button>
          <button
            onClick={() => setActiveTab("calendar")}
            className={`px-3 py-2 rounded-xl flex items-center gap-1.5 shrink-0 transition-colors ${
              activeTab === "calendar"
                ? "bg-emerald-600 text-white"
                : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
            }`}
          >
            <Calendar size={14} />
            <span>Google Calendar</span>
          </button>
          <button
            onClick={() => setActiveTab("contacts")}
            className={`px-3 py-2 rounded-xl flex items-center gap-1.5 shrink-0 transition-colors ${
              activeTab === "contacts"
                ? "bg-blue-600 text-white"
                : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
            }`}
          >
            <Users size={14} />
            <span>Google Contacts</span>
          </button>
          <button
            onClick={() => setActiveTab("sheets")}
            className={`px-3 py-2 rounded-xl flex items-center gap-1.5 shrink-0 transition-colors ${
              activeTab === "sheets"
                ? "bg-emerald-700 text-white"
                : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
            }`}
          >
            <FileSpreadsheet size={14} />
            <span>Google Sheets</span>
          </button>
          <button
            onClick={() => setActiveTab("keep")}
            className={`px-3 py-2 rounded-xl flex items-center gap-1.5 shrink-0 transition-colors ${
              activeTab === "keep"
                ? "bg-amber-600 text-white"
                : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
            }`}
          >
            <StickyNote size={14} />
            <span>Google Keep</span>
          </button>
          <button
            onClick={() => setActiveTab("firebase")}
            className={`px-3 py-2 rounded-xl flex items-center gap-1.5 shrink-0 transition-colors ${
              activeTab === "firebase"
                ? "bg-amber-500 text-stone-950 font-bold"
                : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
            }`}
          >
            <Flame size={14} />
            <span>Firebase Cloud</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-6 text-sm">
          {/* TAB: WORKSPACE OVERVIEW */}
          {activeTab === "workspace" && (
            <div className="space-y-6">
              {/* Highlight Card for Bidirectional Sync */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-emerald-600/10 border border-blue-200 dark:border-blue-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <ArrowLeftRight size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm sm:text-base flex items-center gap-2">
                      <span>Sincronización Bidireccional Activa</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                        Task-OS ⇄ Google
                      </span>
                    </h3>
                    <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 max-w-xl">
                      Vincula selectivamente tareas del Ledger con Google Tasks y Google Calendar, copia pendientes de ida y vuelta, y reconcilia estados de completado automáticamente.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab("sync")}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all shrink-0"
                >
                  <ArrowLeftRight size={14} />
                  <span>Gestionar Sincronización</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Card Contacts */}
                <div
                  onClick={() => setActiveTab("contacts")}
                  className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 hover:border-blue-400 dark:hover:border-blue-500 bg-stone-50 dark:bg-stone-900/60 transition-all cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                    <Users size={18} />
                  </div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    Google Contacts
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Sincroniza tu libreta de contactos para autocompletar números de WhatsApp y solicitantes.
                  </p>
                </div>

                {/* Card Calendar */}
                <div
                  onClick={() => setActiveTab("calendar")}
                  className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 hover:border-emerald-400 dark:hover:border-emerald-500 bg-stone-50 dark:bg-stone-900/60 transition-all cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                    <Calendar size={18} />
                  </div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                    Google Calendar
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Agenda fechas límite de tareas directamente como citas o recordatorios en tu calendario principal.
                  </p>
                </div>

                {/* Card Google Tasks */}
                <div
                  onClick={() => setActiveTab("tasks")}
                  className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 hover:border-blue-400 dark:hover:border-blue-500 bg-stone-50 dark:bg-stone-900/60 transition-all cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-500 dark:text-blue-400 flex items-center justify-center mb-3">
                    <CheckSquare size={18} />
                  </div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 group-hover:text-blue-500 dark:group-hover:text-blue-400">
                    Google Tasks
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Exporta pendientes a la app oficial de Google Tasks en tu móvil o importa tareas pendientes.
                  </p>
                </div>

                {/* Card Google Sheets */}
                <div
                  onClick={() => setActiveTab("sheets")}
                  className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 hover:border-emerald-400 dark:hover:border-emerald-500 bg-stone-50 dark:bg-stone-900/60 transition-all cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-3">
                    <FileSpreadsheet size={18} />
                  </div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                    Google Sheets
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Crea hojas de cálculo en tu Drive con el Ledger Maestro formateado para auditorías o respaldos.
                  </p>
                </div>

                {/* Card Google Keep */}
                <div
                  onClick={() => setActiveTab("keep")}
                  className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 hover:border-amber-400 dark:hover:border-amber-500 bg-stone-50 dark:bg-stone-900/60 transition-all cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                    <StickyNote size={18} />
                  </div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 group-hover:text-amber-600 dark:group-hover:text-amber-400">
                    Google Keep
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Genera notas rápidas y listas con casillas de verificación para llevar en Google Keep.
                  </p>
                </div>

                {/* Card Firebase Firestore */}
                <div
                  onClick={() => setActiveTab("firebase")}
                  className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 hover:border-amber-400 dark:hover:border-amber-500 bg-stone-50 dark:bg-stone-900/60 transition-all cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                    <Flame size={18} />
                  </div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 group-hover:text-amber-600 dark:group-hover:text-amber-400">
                    Firebase Firestore
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Base de datos persistente en la nube con reglas de seguridad estrictas y sincronización multi-dispositivo.
                  </p>
                </div>
              </div>

              {/* Status summary */}
              <div className="p-4 rounded-2xl bg-stone-100 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-stone-900 dark:text-stone-100">Estado de Conectividad</span>
                  <p className="text-stone-500">
                    {user
                      ? `Conectado a Google Cloud & Firebase (Proyecto: gen-lang-client-0098696571)`
                      : "Sesión no iniciada. Haz clic en 'Conectar Cuenta Google' arriba para autenticarte."}
                  </p>
                </div>
                {user ? (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Activo
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 font-semibold">
                    Desconectado
                  </span>
                )}
              </div>
            </div>
          )}

          {/* TAB: BIDIRECTIONAL SYNC (TASK-OS ⇄ GOOGLE TASKS & CALENDAR) */}
          {activeTab === "sync" && (
            <div className="space-y-5">
              {/* Header card with connectivity & stats */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-stone-900 via-stone-800 to-blue-950 text-white shadow-md space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                        <ArrowLeftRight size={18} />
                      </div>
                      <h3 className="text-base sm:text-lg font-bold tracking-tight">
                        Sincronización Bidireccional de Tareas
                      </h3>
                    </div>
                    <p className="text-xs text-stone-300 mt-1">
                      Vincula selectivamente tareas de Task-OS con Google Tasks y Google Calendar, o importa pendientes de vuelta.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={loadAllRemoteGoogleData}
                      disabled={isLoading || isSyncingBidirectional}
                      className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                      title="Refrescar datos desde los servidores de Google"
                    >
                      <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                      <span>{isLoading ? "Consultando..." : "Refrescar Google"}</span>
                    </button>
                  </div>
                </div>

                {/* Live Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/10 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[11px] text-stone-400">Total en Task-OS</div>
                    <div className="text-base font-bold text-white mt-0.5">{tasks.length}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[11px] text-blue-300 flex items-center gap-1">
                      <CheckSquare size={12} /> Google Tasks
                    </div>
                    <div className="text-base font-bold text-blue-200 mt-0.5">{googleTasks.length}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[11px] text-emerald-300 flex items-center gap-1">
                      <Calendar size={12} /> Calendar Eventos
                    </div>
                    <div className="text-base font-bold text-emerald-200 mt-0.5">{calendarEvents.length}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[11px] text-amber-300 flex items-center gap-1">
                      <Link2 size={12} /> Tareas Vinculadas
                    </div>
                    <div className="text-base font-bold text-amber-200 mt-0.5">
                      {tasks.filter((t) => t.googleTaskId || t.googleCalendarEventId).length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sub-Tabs Navigation */}
              <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-2xl text-xs font-bold overflow-x-auto">
                <button
                  onClick={() => setSyncSubTab("export")}
                  className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                    syncSubTab === "export"
                      ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                  }`}
                >
                  <Upload size={14} />
                  <span>1. Vincular Task-OS ➔ Google</span>
                  {selectedTaskIdsForSync.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-600 text-white font-black">
                      {selectedTaskIdsForSync.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setSyncSubTab("import")}
                  className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                    syncSubTab === "import"
                      ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                  }`}
                >
                  <Download size={14} />
                  <span>2. Importar Google ➔ Task-OS</span>
                  {selectedRemoteTaskIds.length + selectedRemoteEventIds.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-600 text-white font-black">
                      {selectedRemoteTaskIds.length + selectedRemoteEventIds.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setSyncSubTab("auto")}
                  className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                    syncSubTab === "auto"
                      ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                  }`}
                >
                  <Sparkles size={14} className="text-amber-500" />
                  <span>3. Reconciliación Inteligente</span>
                  {smartDiffs.totalDiffs > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-stone-950 font-black">
                      {smartDiffs.totalDiffs}
                    </span>
                  )}
                </button>
              </div>

              {/* SUB-VIEW 1: VINCULAR TASK-OS ➔ GOOGLE */}
              {syncSubTab === "export" && (
                <div className="space-y-4">
                  {/* Toolbar: Target selection, filters & search */}
                  <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/30 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Destination selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                          Destino de vinculación:
                        </span>
                        <div className="flex items-center gap-1 bg-stone-200/80 dark:bg-stone-700/80 p-0.5 rounded-xl text-xs">
                          <button
                            onClick={() => setSyncDestination("both")}
                            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                              syncDestination === "both"
                                ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs font-bold"
                                : "text-stone-600 dark:text-stone-300"
                            }`}
                          >
                            🔄 Ambos
                          </button>
                          <button
                            onClick={() => setSyncDestination("tasks")}
                            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                              syncDestination === "tasks"
                                ? "bg-blue-600 text-white font-bold shadow-2xs"
                                : "text-stone-600 dark:text-stone-300"
                            }`}
                          >
                            📋 Google Tasks
                          </button>
                          <button
                            onClick={() => setSyncDestination("calendar")}
                            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                              syncDestination === "calendar"
                                ? "bg-emerald-600 text-white font-bold shadow-2xs"
                                : "text-stone-600 dark:text-stone-300"
                            }`}
                          >
                            📅 Calendar
                          </button>
                        </div>
                      </div>

                      {/* Default time selector for calendar events */}
                      {(syncDestination === "both" || syncDestination === "calendar") && (
                        <div className="flex items-center gap-2 text-xs">
                          <Clock size={13} className="text-stone-400" />
                          <span className="text-stone-600 dark:text-stone-400">Hora evento:</span>
                          <input
                            type="time"
                            value={defaultEventTime}
                            onChange={(e) => setDefaultEventTime(e.target.value)}
                            className="p-1 px-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-mono"
                          />
                        </div>
                      )}
                    </div>

                    {/* Filter buttons & search */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                      <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                        <button
                          onClick={() => setSyncFilter("all")}
                          className={`px-2.5 py-1 rounded-lg transition-colors ${
                            syncFilter === "all"
                              ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 font-bold"
                              : "bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700"
                          }`}
                        >
                          Todas ({tasks.length})
                        </button>
                        <button
                          onClick={() => setSyncFilter("pending")}
                          className={`px-2.5 py-1 rounded-lg transition-colors ${
                            syncFilter === "pending"
                              ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 font-bold"
                              : "bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700"
                          }`}
                        >
                          Pendientes ({tasks.filter((t) => t.estado !== "Completado").length})
                        </button>
                        <button
                          onClick={() => setSyncFilter("unlinked")}
                          className={`px-2.5 py-1 rounded-lg transition-colors ${
                            syncFilter === "unlinked"
                              ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 font-bold"
                              : "bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700"
                          }`}
                        >
                          Sin vincular ({tasks.filter((t) => !t.googleTaskId && !t.googleCalendarEventId).length})
                        </button>
                        <button
                          onClick={() => setSyncFilter("linked")}
                          className={`px-2.5 py-1 rounded-lg transition-colors ${
                            syncFilter === "linked"
                              ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 font-bold"
                              : "bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700"
                          }`}
                        >
                          Vinculadas ({tasks.filter((t) => t.googleTaskId || t.googleCalendarEventId).length})
                        </button>
                      </div>

                      {/* Live search input */}
                      <div className="relative w-full sm:w-64">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                          type="text"
                          value={syncSearchQuery}
                          onChange={(e) => setSyncSearchQuery(e.target.value)}
                          placeholder="Buscar tareas..."
                          className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs placeholder:text-stone-400"
                        />
                      </div>
                    </div>

                    {/* Bulk Selection Actions Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-200 dark:border-stone-800 text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSelectAllFiltered}
                          className="px-2.5 py-1 rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 font-medium"
                        >
                          Seleccionar todas ({filteredTasksForSync.length})
                        </button>
                        {selectedTaskIdsForSync.length > 0 && (
                          <button
                            onClick={handleDeselectAll}
                            className="px-2.5 py-1 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                          >
                            Deseleccionar
                          </button>
                        )}
                        <span className="font-semibold text-stone-700 dark:text-stone-300 ml-1">
                          {selectedTaskIdsForSync.length} tarea(s) seleccionadas
                        </span>
                      </div>

                      <button
                        onClick={() => requestSelectiveSyncToGoogle()}
                        disabled={selectedTaskIdsForSync.length === 0 || isSyncingBidirectional}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-40"
                      >
                        <Upload size={14} />
                        <span>
                          {isSyncingBidirectional
                            ? "Sincronizando..."
                            : `Vincular ${selectedTaskIdsForSync.length} Tarea(s) a Google`}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Task list with checkboxes & badges */}
                  <div className="border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden divide-y divide-stone-200 dark:divide-stone-800 max-h-96 overflow-y-auto">
                    {filteredTasksForSync.length === 0 ? (
                      <div className="p-8 text-center text-xs text-stone-500">
                        No se encontraron tareas con los filtros actuales.
                      </div>
                    ) : (
                      filteredTasksForSync.map((t) => {
                        const isSelected = selectedTaskIdsForSync.includes(t.id);
                        const isLinkedTasks = Boolean(t.googleTaskId);
                        const isLinkedCalendar = Boolean(t.googleCalendarEventId);

                        return (
                          <div
                            key={t.id}
                            className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
                              isSelected
                                ? "bg-blue-50/60 dark:bg-blue-950/20"
                                : "hover:bg-stone-50 dark:hover:bg-stone-800/40"
                            }`}
                          >
                            {/* Checkbox and task description */}
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleTaskSelection(t.id)}
                                className="mt-1 w-4 h-4 rounded border-stone-300 dark:border-stone-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-[11px] font-bold text-stone-400">
                                    #{t.id}
                                  </span>
                                  <span className="font-semibold text-stone-900 dark:text-stone-100">
                                    {t.tarea}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                      t.estado === "Completado"
                                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                        : t.estado === "En Proceso"
                                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                        : "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300"
                                    }`}
                                  >
                                    {t.estado}
                                  </span>
                                </div>

                                <div className="text-[11px] text-stone-500 flex flex-wrap items-center gap-3 mt-1">
                                  <span>👤 {t.solicitante}</span>
                                  {t.fechaLimite && <span>📅 Vence: {t.fechaLimite}</span>}
                                  {t.dominio && <span>🏷️ {t.dominio}</span>}
                                  {t.notas && <span className="italic truncate max-w-xs">📝 {t.notas}</span>}
                                </div>
                              </div>
                            </div>

                            {/* Linking Badges & Action Buttons */}
                            <div className="flex items-center gap-2 shrink-0 sm:self-center">
                              {/* Badges */}
                              {isLinkedTasks && (
                                <span
                                  className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-semibold flex items-center gap-1"
                                  title={`Vinculado a Google Tasks (ID: ${t.googleTaskId})`}
                                >
                                  <CheckSquare size={10} />
                                  <span>Tasks</span>
                                </span>
                              )}
                              {isLinkedCalendar && (
                                <span
                                  className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold flex items-center gap-1"
                                  title={`Vinculado a Google Calendar (ID: ${t.googleCalendarEventId})`}
                                >
                                  <Calendar size={10} />
                                  <span>Calendar</span>
                                </span>
                              )}
                              {!isLinkedTasks && !isLinkedCalendar && (
                                <span className="px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 text-[10px]">
                                  Sin vincular
                                </span>
                              )}

                              {/* Single Task Quick Link / Update button */}
                              <button
                                onClick={() => requestSelectiveSyncToGoogle([t.id], syncDestination)}
                                className="px-2.5 py-1 rounded-lg bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                              >
                                <span>{isLinkedTasks || isLinkedCalendar ? "Actualizar" : "Vincular"}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* SUB-VIEW 2: IMPORTAR GOOGLE ➔ TASK-OS */}
              {syncSubTab === "import" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <h4 className="font-bold text-stone-900 dark:text-stone-100">
                        Ítems Remotos Disponibles para Importar o Actualizar
                      </h4>
                      <p className="text-stone-500 text-[11px] mt-0.5">
                        Selecciona pendientes de Google Tasks o eventos de Google Calendar para incorporarlos a Task-OS.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={requestImportFromGoogle}
                        disabled={
                          selectedRemoteTaskIds.length + selectedRemoteEventIds.length === 0 ||
                          isSyncingBidirectional
                        }
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-40"
                      >
                        <Download size={14} />
                        <span>
                          {isSyncingBidirectional
                            ? "Importando..."
                            : `Importar ${selectedRemoteTaskIds.length + selectedRemoteEventIds.length} Seleccionados`}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Google Tasks list */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                        <CheckSquare size={14} />
                        <span>Google Tasks ({googleTasks.length})</span>
                      </h4>
                      {googleTasks.length > 0 && (
                        <div className="flex items-center gap-2 text-[11px]">
                          <button
                            onClick={() => setSelectedRemoteTaskIds(googleTasks.map((g) => g.id))}
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Seleccionar todas
                          </button>
                          <span>•</span>
                          <button
                            onClick={() => setSelectedRemoteTaskIds([])}
                            className="text-stone-500 hover:underline"
                          >
                            Deseleccionar
                          </button>
                        </div>
                      )}
                    </div>

                    {googleTasks.length === 0 ? (
                      <div className="p-6 text-center rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 text-stone-500 text-xs">
                        No se han cargado tareas de Google Tasks. Haz clic en "Refrescar Google" arriba para consultar.
                      </div>
                    ) : (
                      <div className="border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden divide-y divide-stone-200 dark:divide-stone-800 max-h-56 overflow-y-auto">
                        {googleTasks.map((gt) => {
                          const isSelected = selectedRemoteTaskIds.includes(gt.id);
                          const matchingLocal = tasks.find(
                            (t) =>
                              t.googleTaskId === gt.id ||
                              t.tarea.toLowerCase().trim() ===
                                gt.title.replace(/^\[#\d+\]\s*/, "").toLowerCase().trim()
                          );

                          return (
                            <div
                              key={gt.id}
                              className={`p-3 flex items-center justify-between gap-3 text-xs transition-colors ${
                                isSelected
                                  ? "bg-blue-50/60 dark:bg-blue-950/20"
                                  : "hover:bg-stone-50 dark:hover:bg-stone-800/40"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleRemoteTaskSelection(gt.id)}
                                  className="w-4 h-4 rounded border-stone-300 dark:border-stone-600 text-blue-600 cursor-pointer"
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px] ${
                                        gt.status === "completed"
                                          ? "bg-emerald-500 border-emerald-500 text-white"
                                          : "border-stone-400"
                                      }`}
                                    >
                                      {gt.status === "completed" && "✓"}
                                    </span>
                                    <span
                                      className={
                                        gt.status === "completed"
                                          ? "line-through text-stone-400 font-medium"
                                          : "font-semibold text-stone-900 dark:text-stone-100"
                                      }
                                    >
                                      {gt.title}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-stone-500 flex items-center gap-2 mt-0.5">
                                    {gt.due && <span>📅 Vence: {gt.due.split("T")[0]}</span>}
                                    {gt.notes && <span className="truncate max-w-xs">📝 {gt.notes}</span>}
                                  </div>
                                </div>
                              </div>

                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  matchingLocal
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                }`}
                              >
                                {matchingLocal ? `Existe en Task-OS (#${matchingLocal.id})` : "Nuevo en Google"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Google Calendar events list */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <Calendar size={14} />
                        <span>Google Calendar Eventos ({calendarEvents.length})</span>
                      </h4>
                      {calendarEvents.length > 0 && (
                        <div className="flex items-center gap-2 text-[11px]">
                          <button
                            onClick={() => setSelectedRemoteEventIds(calendarEvents.map((e) => e.id))}
                            className="text-emerald-600 dark:text-emerald-400 hover:underline"
                          >
                            Seleccionar todas
                          </button>
                          <span>•</span>
                          <button
                            onClick={() => setSelectedRemoteEventIds([])}
                            className="text-stone-500 hover:underline"
                          >
                            Deseleccionar
                          </button>
                        </div>
                      )}
                    </div>

                    {calendarEvents.length === 0 ? (
                      <div className="p-6 text-center rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 text-stone-500 text-xs">
                        No se han cargado eventos de Google Calendar. Haz clic en "Refrescar Google" arriba para consultar.
                      </div>
                    ) : (
                      <div className="border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden divide-y divide-stone-200 dark:divide-stone-800 max-h-56 overflow-y-auto">
                        {calendarEvents.map((evt) => {
                          const isSelected = selectedRemoteEventIds.includes(evt.id);
                          const matchingLocal = tasks.find(
                            (t) =>
                              t.googleCalendarEventId === evt.id ||
                              t.tarea.toLowerCase().trim() ===
                                evt.summary.replace(/^\[Task-OS\]\s*/, "").toLowerCase().trim()
                          );

                          return (
                            <div
                              key={evt.id}
                              className={`p-3 flex items-center justify-between gap-3 text-xs transition-colors ${
                                isSelected
                                  ? "bg-emerald-50/60 dark:bg-emerald-950/20"
                                  : "hover:bg-stone-50 dark:hover:bg-stone-800/40"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleRemoteEventSelection(evt.id)}
                                  className="w-4 h-4 rounded border-stone-300 dark:border-stone-600 text-emerald-600 cursor-pointer"
                                />
                                <div className="min-w-0">
                                  <div className="font-semibold text-stone-900 dark:text-stone-100">
                                    {evt.summary}
                                  </div>
                                  <div className="text-[11px] text-stone-500 flex items-center gap-2 mt-0.5">
                                    <span>
                                      📅{" "}
                                      {evt.start.dateTime
                                        ? new Date(evt.start.dateTime).toLocaleString("es-ES", {
                                            dateStyle: "medium",
                                            timeStyle: "short",
                                          })
                                        : evt.start.date}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    matchingLocal
                                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  }`}
                                >
                                  {matchingLocal ? `Existe en Task-OS (#${matchingLocal.id})` : "Nuevo evento"}
                                </span>
                                {evt.htmlLink && (
                                  <a
                                    href={evt.htmlLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                                    title="Abrir en Google Calendar"
                                  >
                                    <ExternalLink size={12} />
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUB-VIEW 3: RECONCILIACIÓN INTELIGENTE (DIFF & MERGE) */}
              {syncSubTab === "auto" && (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-blue-500/10 border border-amber-200 dark:border-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Sparkles size={18} className="text-amber-500 shrink-0" />
                        <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm sm:text-base">
                          Motor de Reconciliación Bidireccional Automática
                        </h4>
                      </div>
                      <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 max-w-xl">
                        Compara en tiempo real los estados y existencias entre el Ledger Maestro y Google Workspace para resolver cualquier desfase en ambas direcciones.
                      </p>
                    </div>

                    <button
                      onClick={requestSmartReconcile}
                      disabled={isSyncingBidirectional}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all shrink-0 disabled:opacity-50"
                    >
                      <Sparkles size={15} />
                      <span>{isSyncingBidirectional ? "Reconciliando..." : "⚡ Sincronizar Todo Ahora"}</span>
                    </button>
                  </div>

                  {/* Differences Summary Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Diff 1 */}
                    <div className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 space-y-1">
                      <div className="flex items-center justify-between font-bold text-stone-800 dark:text-stone-200">
                        <span>Completadas en Google Tasks ➔ Pendientes en Task-OS</span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px]">
                          {smartDiffs.googleCompletedMismatch.length}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500">
                        {smartDiffs.googleCompletedMismatch.length > 0
                          ? `Se marcarán como "Completado" en Task-OS para reflejar que ya las hiciste en tu teléfono.`
                          : "Sin discrepancias."}
                      </p>
                    </div>

                    {/* Diff 2 */}
                    <div className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 space-y-1">
                      <div className="flex items-center justify-between font-bold text-stone-800 dark:text-stone-200">
                        <span>Completadas en Task-OS ➔ Pendientes en Google</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px]">
                          {smartDiffs.localCompletedMismatch.length}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500">
                        {smartDiffs.localCompletedMismatch.length > 0
                          ? `Se actualizarán a "completed" en la app oficial de Google Tasks.`
                          : "Sin discrepancias."}
                      </p>
                    </div>

                    {/* Diff 3 */}
                    <div className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 space-y-1">
                      <div className="flex items-center justify-between font-bold text-stone-800 dark:text-stone-200">
                        <span>Nuevas Tareas en Google ➔ No existen en Task-OS</span>
                        <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[10px]">
                          {smartDiffs.remoteGoogleTasksNew.length}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500">
                        {smartDiffs.remoteGoogleTasksNew.length > 0
                          ? `Se incorporarán automáticamente como nuevas tareas en el Ledger Maestro.`
                          : "Sin discrepancias."}
                      </p>
                    </div>

                    {/* Diff 4 */}
                    <div className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 space-y-1">
                      <div className="flex items-center justify-between font-bold text-stone-800 dark:text-stone-200">
                        <span>Tareas en Task-OS ➔ Aún sin vincular a Google</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px]">
                          {smartDiffs.localUnlinkedTasks.length}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500">
                        {smartDiffs.localUnlinkedTasks.length > 0
                          ? `Se crearán en Google Tasks para tener respaldo en la nube y recordatorios móviles.`
                          : "Todas las tareas ya están vinculadas."}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {activeTab === "contacts" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">
                    Contactos de Google
                  </h3>
                  <p className="text-xs text-stone-500">
                    Consulta y sincroniza tus contactos personales para vincular teléfonos con tareas.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadContacts}
                    disabled={isLoading}
                    className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-2xs"
                  >
                    <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                    <span>Cargar de Google</span>
                  </button>
                  {googleContacts.length > 0 && (
                    <button
                      onClick={handleImportContacts}
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-2xs"
                    >
                      <Download size={14} />
                      <span>Importar a Task-OS ({googleContacts.length})</span>
                    </button>
                  )}
                </div>
              </div>

              {googleContacts.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 text-stone-500 text-xs">
                  Haz clic en "Cargar de Google" para consultar tus contactos sincronizados.
                </div>
              ) : (
                <div className="border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden divide-y divide-stone-200 dark:divide-stone-800 max-h-72 overflow-y-auto">
                  {googleContacts.map((c) => (
                    <div key={c.id} className="p-3 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-800/50">
                      <div>
                        <div className="font-semibold text-stone-900 dark:text-stone-100">{c.nombre}</div>
                        <div className="text-xs text-stone-500 flex items-center gap-3">
                          {c.telefono && <span>📞 {c.telefono}</span>}
                          {c.email && <span>✉️ {c.email}</span>}
                          {c.empresa && <span>🏢 {c.empresa}</span>}
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        {c.rol || "Google"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: GOOGLE CALENDAR */}
          {activeTab === "calendar" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">
                    Google Calendar
                  </h3>
                  <p className="text-xs text-stone-500">
                    Agenda tareas del Ledger Maestro directamente como eventos en tu calendario.
                  </p>
                </div>
                <button
                  onClick={loadCalendarEvents}
                  disabled={isLoading}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5"
                >
                  <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                  <span>Ver Eventos Próximos</span>
                </button>
              </div>

              {/* Agendar Tarea Form */}
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/30 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-stone-700 dark:text-stone-300">
                  Agendar Tarea en Google Calendar
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                      Seleccionar Tarea:
                    </label>
                    <select
                      value={selectedTaskIdForCalendar}
                      onChange={(e) => setSelectedTaskIdForCalendar(Number(e.target.value))}
                      className="w-full p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200"
                    >
                      {tasks.map((t) => (
                        <option key={t.id} value={t.id}>
                          #{t.id} {t.tarea.slice(0, 45)}...
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                      Fecha:
                    </label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                      Hora de inicio:
                    </label>
                    <input
                      type="time"
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                      className="w-full p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={requestCreateCalendarEvent}
                    disabled={isLoading}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs"
                  >
                    <Plus size={14} />
                    <span>Crear Evento en Calendar</span>
                  </button>
                </div>
              </div>

              {/* Event list */}
              {calendarEvents.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-stone-600 dark:text-stone-400">
                    Eventos en tu Calendario ({calendarEvents.length})
                  </h4>
                  <div className="border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden divide-y divide-stone-200 dark:divide-stone-800 max-h-52 overflow-y-auto">
                    {calendarEvents.map((evt) => (
                      <div key={evt.id} className="p-3 flex items-center justify-between text-xs hover:bg-stone-50 dark:hover:bg-stone-800/40">
                        <div>
                          <div className="font-semibold text-stone-900 dark:text-stone-100">{evt.summary}</div>
                          <div className="text-[11px] text-stone-500">
                            {evt.start.dateTime
                              ? new Date(evt.start.dateTime).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })
                              : evt.start.date}
                          </div>
                        </div>
                        {evt.htmlLink && (
                          <a
                            href={evt.htmlLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                          >
                            <span>Ver</span>
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: GOOGLE TASKS */}
          {activeTab === "tasks" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">
                    Google Tasks
                  </h3>
                  <p className="text-xs text-stone-500">
                    Sincroniza tareas entre el Ledger Maestro y Google Tasks.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadGoogleTasks}
                    disabled={isLoading}
                    className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5"
                  >
                    <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                    <span>Cargar Google Tasks</span>
                  </button>
                  {googleTasks.length > 0 && (
                    <button
                      onClick={handleImportGoogleTasksToLedger}
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5"
                    >
                      <Download size={14} />
                      <span>Importar a Task-OS ({googleTasks.length})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Export single task to Google Tasks */}
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/30 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-stone-700 dark:text-stone-300">
                  Exportar Tarea de Task-OS a Google Tasks
                </h4>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <select
                    value={selectedTaskIdForTasks}
                    onChange={(e) => setSelectedTaskIdForTasks(Number(e.target.value))}
                    className="w-full sm:flex-1 p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 text-xs"
                  >
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        #{t.id} [{t.solicitante}] {t.tarea.slice(0, 50)}...
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={requestCreateGoogleTask}
                    disabled={isLoading}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <Send size={14} />
                    <span>Enviar a Google Tasks</span>
                  </button>
                </div>
              </div>

              {/* Google Tasks list */}
              {googleTasks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-stone-600 dark:text-stone-400">
                    Tareas en tu Google Tasks ({googleTasks.length})
                  </h4>
                  <div className="border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden divide-y divide-stone-200 dark:divide-stone-800 max-h-52 overflow-y-auto">
                    {googleTasks.map((gt) => (
                      <div key={gt.id} className="p-3 flex items-center justify-between text-xs hover:bg-stone-50 dark:hover:bg-stone-800/40">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px] ${
                              gt.status === "completed"
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : "border-stone-400"
                            }`}
                          >
                            {gt.status === "completed" && "✓"}
                          </span>
                          <span className={gt.status === "completed" ? "line-through text-stone-400" : "font-semibold text-stone-800 dark:text-stone-200"}>
                            {gt.title}
                          </span>
                        </div>
                        {gt.due && (
                          <span className="text-[10px] text-stone-500">
                            Vence: {gt.due.split("T")[0]}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: GOOGLE SHEETS */}
          {activeTab === "sheets" && (
            <div className="space-y-5">
              <div>
                <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">
                  Google Sheets (Hojas de Cálculo)
                </h3>
                <p className="text-xs text-stone-500">
                  Exporta todas las tareas del Ledger Maestro a una hoja en tiempo real en tu Google Drive.
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <FileSpreadsheet size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                      Exportación Estructurada
                    </h4>
                    <p className="text-xs text-stone-600 dark:text-stone-300 mt-1">
                      Genera un nuevo libro de cálculo en Google Sheets con columnas formateadas: ID, Solicitante, Tarea, Estado, Fecha de Ingreso, Fecha Límite, Dominio y Notas.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    onClick={requestExportToGoogleSheets}
                    disabled={isLoading}
                    className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
                  >
                    <FileSpreadsheet size={15} />
                    <span>Exportar {tasks.length} Tareas a Google Sheets</span>
                  </button>

                  {createdSheetUrl && (
                    <a
                      href={createdSheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 rounded-xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 font-bold text-xs flex items-center gap-2 shadow-sm"
                    >
                      <span>Abrir Hoja Creada</span>
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: GOOGLE KEEP */}
          {activeTab === "keep" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">
                    Google Keep
                  </h3>
                  <p className="text-xs text-stone-500">
                    Convierte tus pendientes del Ledger en listas de verificación listas para Google Keep.
                  </p>
                </div>
                <a
                  href="https://keep.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center gap-1.5"
                >
                  <span>Abrir Google Keep</span>
                  <ExternalLink size={13} />
                </a>
              </div>

              <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-amber-50/50 dark:bg-amber-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-amber-950 dark:text-amber-200">
                    Formato Lista de Verificación (Checklist)
                  </h4>
                  <button
                    onClick={handleCopyKeepFormat}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition-all"
                  >
                    {isCopied ? <Check size={13} /> : <Copy size={13} />}
                    <span>{isCopied ? "¡Copiado!" : "Copiar para Google Keep"}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-[11px] font-mono text-stone-700 dark:text-stone-300 max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {formatAllTasksForGoogleKeep(tasks)}
                </pre>
              </div>
            </div>
          )}

          {/* TAB: FIREBASE FIRESTORE */}
          {activeTab === "firebase" && (
            <div className="space-y-5">
              <div>
                <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base flex items-center gap-2">
                  <Flame size={18} className="text-amber-500" />
                  Firebase Firestore & Authentication (Tiempo Real)
                </h3>
                <p className="text-xs text-stone-500">
                  Backend en tiempo real conectado al proyecto: <strong className="text-stone-800 dark:text-stone-200">gen-lang-client-0098696571</strong>
                </p>
              </div>

              {/* User authentication overview */}
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-stone-600 dark:text-stone-400">
                    Estado de Sesión Firebase Auth
                  </span>
                  {user ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Conectado
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      Sin sesión activa
                    </span>
                  )}
                </div>

                {user ? (
                  <div className="space-y-1.5 text-xs text-stone-700 dark:text-stone-300">
                    <p>
                      <strong>Usuario:</strong> {user.displayName || user.email || user.phoneNumber || user.uid}
                    </p>
                    <p className="font-mono text-[11px] text-stone-500">
                      UID: {user.uid}
                    </p>
                    <p className="text-[11px] text-stone-500">
                      Proveedor: {user.providerData[0]?.providerId || "firebase"}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-stone-500">
                    Inicia sesión con Google, Apple, Correo/Contraseña o Teléfono SMS desde el botón de la nube en la barra superior.
                  </p>
                )}
              </div>

              {/* Firestore database operations */}
              <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                      Sincronización de Colección de Tareas
                    </span>
                    <p className="text-xs text-stone-500">
                      Ruta Firestore: /users/{user?.uid || "{userId}"}/tasks
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-xs">
                    firestore.rules Activas
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={handleSyncToFirestore}
                    disabled={isLoading || !user}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-2 shadow-2xs transition-all disabled:opacity-50"
                  >
                    <Flame size={15} />
                    <span>Guardar Ledger en Firestore</span>
                  </button>

                  <button
                    onClick={handlePullFromFirestore}
                    disabled={isLoading || !user}
                    className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 font-bold text-xs flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    <Download size={15} />
                    <span>Descargar desde Firestore</span>
                  </button>
                </div>
              </div>

              {/* Authorized Domains for Firebase Authentication */}
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-100/70 dark:bg-stone-800/40 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-amber-500" />
                  <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    Dominios Autorizados para Firebase Auth (Google / Apple / SMS)
                  </h4>
                </div>
                <p className="text-[11px] text-stone-600 dark:text-stone-300 leading-relaxed">
                  Para evitar el error <code>auth/unauthorized-domain</code>, agrega tu dominio principal y el entorno de previsualización en Firebase Console:
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 font-mono text-[11px] font-bold">
                    <span>l.fgdll.org</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText("l.fgdll.org");
                        setCopyDomainFeedback("¡Copiado: l.fgdll.org!");
                        setTimeout(() => setCopyDomainFeedback(null), 3000);
                      }}
                      className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded text-stone-500 hover:text-stone-900"
                      title="Copiar l.fgdll.org"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                  {typeof window !== "undefined" && window.location.hostname !== "l.fgdll.org" && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 font-mono text-[11px] font-bold">
                      <span>{window.location.hostname}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.hostname);
                          setCopyDomainFeedback(`¡Copiado: ${window.location.hostname}!`);
                          setTimeout(() => setCopyDomainFeedback(null), 3000);
                        }}
                        className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded text-stone-500 hover:text-stone-900"
                        title="Copiar dominio actual"
                      >
                        <Copy size={13} />
                      </button>
                    </div>
                  )}
                  <a
                    href="https://console.firebase.google.com/project/gen-lang-client-0098696571/authentication/settings"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs"
                  >
                    <span>Abrir Configuración en Firebase Console</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              {/* Apple App registration box */}
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-100/70 dark:bg-stone-800/40 space-y-2">
                <div className="flex items-center gap-2">
                  <Apple size={16} className="text-stone-800 dark:text-stone-200" />
                  <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    Soporte para App de Apple (iOS / iPadOS / macOS)
                  </h4>
                </div>
                <p className="text-[11px] text-stone-600 dark:text-stone-300 leading-relaxed">
                  Para conectar un bundle de iOS a este proyecto Firebase (<code>gen-lang-client-0098696571</code>), registra el Bundle ID <code>org.l.fgdll.taskos</code> (dominio <code>l.fgdll.org</code>) en Firebase Console, descarga <code>GoogleService-Info.plist</code> y añade Sign in with Apple en Authentication &gt; Sign-in method.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/80 flex items-center justify-between text-xs text-stone-500">
          <span>Task-OS • Google Workspace & Firebase</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Confirmation Dialog for Workspace Operations (Mandatory) */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 max-w-md w-full shadow-2xl space-y-4">
            <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
              {confirmDialog.title}
            </h4>
            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              {confirmDialog.description}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-1.5 rounded-xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 font-bold text-xs hover:opacity-90"
              >
                {confirmDialog.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
