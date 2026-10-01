import React, { useState, useEffect, useMemo } from "react";
import {
  Bell,
  BellRing,
  CheckCircle2,
  MessageSquare,
  Smartphone,
  ShieldCheck,
  X,
  Volume2,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Send,
  Radio,
  Check,
  Plus,
  Mail,
  ExternalLink,
  Flame,
  Clock,
  User,
  Filter,
  Search,
  ArrowRight,
  Trash2,
  Inbox,
  Copy,
} from "lucide-react";
import {
  requestFCMToken,
  sendTestNotification,
  getNotificationPermission,
  isPushSupported,
  getNotificationHistory,
  FCMNotificationRecord,
  notifyNewSolicitud,
  triggerSolicitudEmailAlert,
} from "../lib/fcmNotifications";
import { playChime } from "../utils/audio";
import { SolicitudItem } from "../types";

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  solicitudes: SolicitudItem[];
  onConvertSolicitudToTask: (solicitud: SolicitudItem) => void;
  onUpdateSolicitud: (id: string, updates: Partial<SolicitudItem>) => void;
  onDeleteSolicitud: (id: string) => void;
  onCreateSolicitud: (newSolicitud: Omit<SolicitudItem, "id" | "fechaIngreso">) => void;
}

export default function NotificationsModal({
  isOpen,
  onClose,
  userEmail,
  solicitudes,
  onConvertSolicitudToTask,
  onUpdateSolicitud,
  onDeleteSolicitud,
  onCreateSolicitud,
}: NotificationsModalProps) {
  const [activeTab, setActiveTab] = useState<"solicitudes" | "history" | "config">("solicitudes");
  const [solicitudFilter, setSolicitudFilter] = useState<"todas" | "nuevas" | "convertidas" | "atendidas">("nuevas");
  const [searchQuery, setSearchQuery] = useState("");

  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isActivating, setIsActivating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [history, setHistory] = useState<FCMNotificationRecord[]>([]);

  // New Solicitud Form state
  const [isCreatingSolicitud, setIsCreatingSolicitud] = useState(false);
  const [newSolicitante, setNewSolicitante] = useState("");
  const [newTelefono, setNewTelefono] = useState("");
  const [newTitulo, setNewTitulo] = useState("");
  const [newDescripcion, setNewDescripcion] = useState("");
  const [newPrioridad, setNewPrioridad] = useState<"Alta" | "Media" | "Baja">("Alta");
  const [newCanal, setNewCanal] = useState<"WhatsApp" | "ExecutiveInput" | "Web" | "Email" | "Sistema">("WhatsApp");

  // Email notifications preferences
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState<boolean>(() => {
    return localStorage.getItem("task_os_pref_email_solicitudes") !== "false";
  });
  const [targetEmail, setTargetEmail] = useState<string>(() => {
    return localStorage.getItem("task_os_user_email_v1") || userEmail || "laurcortazar@gmail.com";
  });
  const [copiedDomain, setCopiedDomain] = useState(false);

  const currentHostname = typeof window !== "undefined" ? window.location.hostname : "dominio-actual";

  useEffect(() => {
    if (isOpen) {
      setPermission(getNotificationPermission());
      setHistory(getNotificationHistory());
    }
  }, [isOpen]);

  const unreadCount = useMemo(() => {
    return solicitudes.filter((s) => !s.leida || s.estado === "Nueva").length;
  }, [solicitudes]);

  const filteredSolicitudes = useMemo(() => {
    return solicitudes.filter((s) => {
      // Filter status
      if (solicitudFilter === "nuevas" && (s.leida && s.estado !== "Nueva")) return false;
      if (solicitudFilter === "convertidas" && s.estado !== "ConvertidaEnTarea") return false;
      if (solicitudFilter === "atendidas" && s.estado !== "Atendida") return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = s.solicitante.toLowerCase().includes(q);
        const matchTitle = s.titulo.toLowerCase().includes(q);
        const matchDesc = s.descripcion.toLowerCase().includes(q);
        const matchPhone = s.telefono ? s.telefono.includes(q) : false;
        if (!matchName && !matchTitle && !matchDesc && !matchPhone) return false;
      }

      return true;
    });
  }, [solicitudes, solicitudFilter, searchQuery]);

  if (!isOpen) return null;

  const handleActivatePush = async () => {
    setIsActivating(true);
    setActionFeedback(null);
    try {
      const res = await requestFCMToken(targetEmail);
      setPermission(res.permission);
      if (res.success) {
        playChime("success");
        setActionFeedback("¡Notificaciones Push activadas con éxito!");
        setHistory(getNotificationHistory());
        setTimeout(() => sendTestNotification(), 600);
      } else {
        setActionFeedback(res.error || "No se pudo activar el permiso de notificaciones.");
      }
    } catch (err: any) {
      setActionFeedback(err?.message || "Error al solicitar notificaciones.");
    } finally {
      setIsActivating(false);
    }
  };

  const handleTestPushAndEmail = async () => {
    setIsTesting(true);
    setActionFeedback("Despachando prueba de Notificación Push y Alerta por Correo...");
    try {
      // Send push notification
      await notifyNewSolicitud({
        id: `test-sol-${Date.now()}`,
        solicitante: "Laura (Prueba)",
        titulo: "Revisar reconocimientos de graduación",
        descripcion: "Validar ortografía de graduados con el archivo Excel antes de las 18:00 hrs.",
        prioridad: "Alta",
        telefono: "+52 55 1234 5678",
      });

      // Send email alert
      const emailRes = await triggerSolicitudEmailAlert(`test-sol-${Date.now()}`, targetEmail);
      if (emailRes.mailtoUrl) {
        setActionFeedback("¡Notificación Push enviada y Alerta de Correo lista! Revisa el banner de tu pantalla.");
      } else {
        setActionFeedback("¡Notificación Push enviada con éxito!");
      }

      setHistory(getNotificationHistory());
      playChime("notification");
      setTimeout(() => setActionFeedback(null), 5000);
    } catch (err: any) {
      setActionFeedback(`Error en la prueba: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleCreateSolicitudSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSolicitante.trim() || !newTitulo.trim()) return;

    onCreateSolicitud({
      solicitante: newSolicitante.trim(),
      telefono: newTelefono.trim() || undefined,
      titulo: newTitulo.trim(),
      descripcion: newDescripcion.trim() || newTitulo.trim(),
      prioridad: newPrioridad,
      canal: newCanal,
      estado: "Nueva",
      leida: false,
    });

    // Reset form
    setNewSolicitante("");
    setNewTelefono("");
    setNewTitulo("");
    setNewDescripcion("");
    setIsCreatingSolicitud(false);
    setActionFeedback("¡Nueva solicitud registrada y notificación despachada!");
    playChime("success");
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleSimulateIncomingSolicitud = () => {
    const mockRequesters = [
      {
        name: "Laura",
        tel: "+52 55 1234 5678",
        title: "Revisar lista de reconocimientos y diplomas de graduación",
        desc: "Favor de revisar nombres de los 45 graduados con el archivo oficial antes de enviar a imprenta.",
        canal: "WhatsApp" as const,
        prioridad: "Alta" as const,
      },
      {
        name: "Líder Zona Tiburón",
        tel: "+52 55 9876 5432",
        title: "Diseño y cotización urgente de lona 3x2m para evento del sábado",
        desc: "Necesitamos lona front brillante con ojillos perimetrales cada 50cm para el acceso principal.",
        canal: "WhatsApp" as const,
        prioridad: "Alta" as const,
      },
      {
        name: "Coordinación Universidad FGDLL",
        tel: "+52 55 8765 4321",
        title: "Aprobación de temario y programa del nuevo diplomado",
        desc: "Requerimos visto bueno para publicar la convocatoria y abrir inscripciones esta semana.",
        canal: "Email" as const,
        prioridad: "Media" as const,
      },
      {
        name: "Taller Impresión",
        tel: "+52 55 2345 6789",
        title: "Validación de perfil de color en archivo Fogra39 para lonas",
        desc: "El archivo enviado está en RGB, requerimos confirmación si lo convertimos a CMYK.",
        canal: "Web" as const,
        prioridad: "Alta" as const,
      },
    ];

    const picked = mockRequesters[Math.floor(Math.random() * mockRequesters.length)];
    onCreateSolicitud({
      solicitante: picked.name,
      telefono: picked.tel,
      titulo: picked.title,
      descripcion: picked.desc,
      prioridad: picked.prioridad,
      canal: picked.canal,
      estado: "Nueva",
      leida: false,
    });

    setActionFeedback(`🚨 ¡Solicitud entrante de "${picked.name}" simulada! Push en pantalla y alerta de correo emitidas.`);
    playChime("notification");
    setTimeout(() => setActionFeedback(null), 5000);
  };

  const handleSendEmailForSolicitud = async (solicitud: SolicitudItem) => {
    const res = await triggerSolicitudEmailAlert(solicitud.id, targetEmail);
    if (res.mailtoUrl) {
      window.location.href = res.mailtoUrl;
      setActionFeedback(`Abriendo cliente de correo para notificar sobre la solicitud de ${solicitud.solicitante}.`);
      playChime("tick");
    } else {
      setActionFeedback("Alerta de correo enviada.");
    }
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleCopyHostname = async () => {
    try {
      await navigator.clipboard.writeText(currentHostname);
      setCopiedDomain(true);
      playChime("tick");
      setTimeout(() => setCopiedDomain(false), 2500);
    } catch (_) {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/80 dark:bg-stone-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-stone-950 flex items-center justify-center shadow-md shadow-amber-500/20">
              <BellRing size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-stone-900 dark:text-stone-100">
                  Centro de Notificaciones & Solicitudes
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                    {unreadCount} nuevas
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Push móvil, alertas por email y bandeja de solicitudes de clientes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-stone-200 dark:border-stone-800 bg-stone-100/70 dark:bg-stone-800/40 p-1.5 gap-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("solicitudes")}
            className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "solicitudes"
                ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs font-bold"
                : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
            }`}
          >
            <Inbox size={14} className="text-amber-500" />
            <span>Solicitudes Nuevas</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-stone-950">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "history"
                ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs font-bold"
                : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
            }`}
          >
            <Radio size={14} className="text-blue-500" />
            <span>Alertas Push ({history.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("config")}
            className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "config"
                ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs font-bold"
                : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
            }`}
          >
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>Configuración & Dominios</span>
          </button>
        </div>

        {/* Action feedback banner */}
        {actionFeedback && (
          <div className="mx-5 mt-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2 animate-in fade-in">
            <Sparkles size={15} className="text-amber-500 shrink-0" />
            <span className="font-semibold">{actionFeedback}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 text-xs space-y-4">
          {/* TAB 1: SOLICITUDES NUEVAS */}
          {activeTab === "solicitudes" && (
            <div className="space-y-4">
              {/* Controls bar: Search, Filter, +Nueva Solicitud */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    onClick={() => setSolicitudFilter("nuevas")}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs flex items-center gap-1 shrink-0 ${
                      solicitudFilter === "nuevas"
                        ? "bg-amber-500 text-stone-950 shadow-2xs"
                        : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200"
                    }`}
                  >
                    <span>Nuevas</span>
                    {unreadCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    )}
                  </button>

                  <button
                    onClick={() => setSolicitudFilter("todas")}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs shrink-0 ${
                      solicitudFilter === "todas"
                        ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 shadow-2xs"
                        : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200"
                    }`}
                  >
                    Todas ({solicitudes.length})
                  </button>

                  <button
                    onClick={() => setSolicitudFilter("convertidas")}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs shrink-0 ${
                      solicitudFilter === "convertidas"
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200"
                    }`}
                  >
                    En Ledger
                  </button>

                  <button
                    onClick={() => setSolicitudFilter("atendidas")}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs shrink-0 ${
                      solicitudFilter === "atendidas"
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200"
                    }`}
                  >
                    Atendidas
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-44">
                    <Search size={13} className="absolute left-2.5 top-2.5 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Buscar..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-7 pr-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 text-xs text-stone-900 dark:text-stone-100"
                    />
                  </div>

                  <button
                    onClick={handleSimulateIncomingSolicitud}
                    className="px-2.5 py-1.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-bold text-xs flex items-center gap-1 shrink-0 shadow-2xs"
                    title="Simular llegada instantánea de una solicitud de Laura o cliente para probar Push y Email"
                  >
                    <Sparkles size={13} className="text-amber-500" />
                    <span>⚡ Simular Llegada</span>
                  </button>

                  <button
                    onClick={() => setIsCreatingSolicitud(!isCreatingSolicitud)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-xs"
                  >
                    <Plus size={14} />
                    <span>+ Solicitud</span>
                  </button>
                </div>
              </div>

              {/* Form: Add New Solicitud */}
              {isCreatingSolicitud && (
                <form
                  onSubmit={handleCreateSolicitudSubmit}
                  className="p-4 rounded-2xl border-2 border-amber-300 dark:border-amber-800/80 bg-amber-50/50 dark:bg-amber-950/20 space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-stone-900 dark:text-stone-100 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-500" />
                      Registrar Nueva Solicitud (Dispara Push + Email)
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsCreatingSolicitud(false)}
                      className="text-stone-400 hover:text-stone-700"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-stone-600 dark:text-stone-400 block mb-1">
                        Solicitante
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Laura / Proveedor / Cliente"
                        value={newSolicitante}
                        onChange={(e) => setNewSolicitante(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-stone-600 dark:text-stone-400 block mb-1">
                        Teléfono WhatsApp (opcional)
                      </label>
                      <input
                        type="tel"
                        placeholder="+52 55 1234 5678"
                        value={newTelefono}
                        onChange={(e) => setNewTelefono(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-stone-600 dark:text-stone-400 block mb-1">
                      Asunto / Título de la Solicitud
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Impresión de lona urgente para evento"
                      value={newTitulo}
                      onChange={(e) => setNewTitulo(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-stone-600 dark:text-stone-400 block mb-1">
                      Detalle de la Solicitud
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Medidas, observaciones, especificaciones y fecha esperada..."
                      value={newDescripcion}
                      onChange={(e) => setNewDescripcion(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-stone-600 dark:text-stone-400 block mb-1">
                        Prioridad
                      </label>
                      <select
                        value={newPrioridad}
                        onChange={(e) => setNewPrioridad(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 text-xs"
                      >
                        <option value="Alta">⚡ Alta (Urgente)</option>
                        <option value="Media">Media</option>
                        <option value="Baja">Baja</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-stone-600 dark:text-stone-400 block mb-1">
                        Canal de Origen
                      </label>
                      <select
                        value={newCanal}
                        onChange={(e) => setNewCanal(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 text-xs"
                      >
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="ExecutiveInput">Entrada Ejecutiva</option>
                        <option value="Web">Portal Web</option>
                        <option value="Email">Correo Electrónico</option>
                        <option value="Sistema">Sistema</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsCreatingSolicitud(false)}
                      className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-600 text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow-sm"
                    >
                      <Send size={13} />
                      <span>Guardar y Notificar (Push + Email)</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Solicitudes Cards List */}
              {filteredSolicitudes.length === 0 ? (
                <div className="text-center py-10 px-4 rounded-3xl border border-dashed border-stone-300 dark:border-stone-800 space-y-2">
                  <Inbox size={32} className="mx-auto text-stone-300 dark:text-stone-700" />
                  <p className="font-bold text-stone-700 dark:text-stone-300 text-xs">
                    No hay solicitudes en este filtro
                  </p>
                  <p className="text-[11px] text-stone-400 max-w-sm mx-auto">
                    Cuando un contacto envíe una petición por WhatsApp o la registres, aparecerá aquí con alerta Push inmediata.
                  </p>
                  <button
                    onClick={() => setIsCreatingSolicitud(true)}
                    className="mt-2 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs inline-flex items-center gap-1"
                  >
                    <Plus size={13} />
                    <span>Crear Primera Solicitud</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredSolicitudes.map((s) => (
                    <div
                      key={s.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        !s.leida || s.estado === "Nueva"
                          ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80 shadow-xs"
                          : "bg-white dark:bg-stone-800/40 border-stone-200 dark:border-stone-800"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                            {s.solicitante ? s.solicitante[0].toUpperCase() : "S"}
                          </div>
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                                {s.solicitante}
                              </span>
                              {s.prioridad === "Alta" && (
                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                  ⚡ Alta
                                </span>
                              )}
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300">
                                {s.canal}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                  s.estado === "Nueva"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                    : s.estado === "ConvertidaEnTarea"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                    : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400"
                                }`}
                              >
                                {s.estado === "ConvertidaEnTarea"
                                  ? `Tarea #${s.tareaIdAsociada || ""}`
                                  : s.estado}
                              </span>
                            </div>

                            <h5 className="font-bold text-stone-800 dark:text-stone-200 text-xs">
                              {s.titulo}
                            </h5>

                            <p className="text-[11px] text-stone-600 dark:text-stone-300 leading-relaxed">
                              {s.descripcion}
                            </p>

                            <div className="flex items-center gap-3 text-[10px] text-stone-400 pt-1">
                              <span className="flex items-center gap-1">
                                <Clock size={11} />
                                {new Date(s.fechaIngreso).toLocaleString([], {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                })}
                              </span>
                              {s.telefono && (
                                <span className="flex items-center gap-1 font-mono">
                                  📞 {s.telefono}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Top-right menu/actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => onUpdateSolicitud(s.id, { leida: !s.leida })}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
                            title={s.leida ? "Marcar como no leída" : "Marcar como leída"}
                          >
                            <Check size={14} className={s.leida ? "text-emerald-500" : ""} />
                          </button>
                          <button
                            onClick={() => onDeleteSolicitud(s.id)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            title="Eliminar solicitud"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Quick Action Bar for Solicitud */}
                      <div className="mt-3 pt-2.5 border-t border-stone-200/70 dark:border-stone-700/60 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {s.estado !== "ConvertidaEnTarea" ? (
                            <button
                              onClick={() => {
                                onConvertSolicitudToTask(s);
                                setActionFeedback(`¡Solicitud de ${s.solicitante} convertida en tarea del Ledger!`);
                                playChime("success");
                                setTimeout(() => setActionFeedback(null), 4000);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-[11px] flex items-center gap-1.5 shadow-2xs"
                            >
                              <ArrowRight size={13} />
                              <span>Convertir a Tarea del Ledger</span>
                            </button>
                          ) : (
                            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                              <CheckCircle2 size={13} />
                              <span>Vinculada en el Ledger de Pepe</span>
                            </span>
                          )}

                          {s.telefono && (
                            <a
                              href={`https://wa.me/${s.telefono.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                                `Hola ${s.solicitante}, ya recibí tu solicitud de "${s.titulo}". Te mantengo al tanto.`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 text-stone-700 dark:text-stone-300 text-[11px] font-semibold flex items-center gap-1.5 shadow-2xs"
                            >
                              <MessageSquare size={13} className="text-emerald-500" />
                              <span>WhatsApp</span>
                            </a>
                          )}

                          <button
                            onClick={() => handleSendEmailForSolicitud(s)}
                            className="px-2.5 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-[11px] font-semibold flex items-center gap-1.5 shadow-2xs"
                            title="Enviar correo de alerta o notificación"
                          >
                            <Mail size={13} className="text-amber-500" />
                            <span>Enviar Email</span>
                          </button>
                        </div>

                        {s.estado === "Nueva" && (
                          <button
                            onClick={() => {
                              onUpdateSolicitud(s.id, { estado: "Atendida", leida: true });
                              playChime("tick");
                            }}
                            className="text-[10px] text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 underline"
                          >
                            Marcar como Atendida
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: REGISTRO DE ALERTAS PUSH */}
          {activeTab === "history" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                    Registro de Alertas Push (FCM)
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Historial de notificaciones emitidas al celular y navegador.
                  </p>
                </div>
                <button
                  onClick={() => setHistory(getNotificationHistory())}
                  className="p-1.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-600 hover:bg-stone-100"
                  title="Recargar historial"
                >
                  <RefreshCw size={13} />
                </button>
              </div>

              {history.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 text-stone-400">
                  No hay notificaciones push en el historial reciente.
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {history.map((h) => (
                    <div
                      key={h.id}
                      className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/30 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                          <Bell size={14} />
                        </div>
                        <div>
                          <p className="font-bold text-stone-800 dark:text-stone-200">
                            {h.title}
                          </p>
                          <p className="text-[11px] text-stone-600 dark:text-stone-400">
                            {h.body}
                          </p>
                          <span className="text-[9px] text-stone-400 font-mono">
                            {new Date(h.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                        Entregada
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CONFIGURACIÓN, PUSH, EMAIL Y DOMINIOS */}
          {activeTab === "config" && (
            <div className="space-y-4">
              {/* Domain Authorization helper */}
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800 space-y-2.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
                  <h4 className="font-bold text-xs text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                    Solución de Error: "auth/unauthorized-domain"
                  </h4>
                </div>
                <p className="text-[11px] text-stone-600 dark:text-stone-300 leading-relaxed">
                  Para que Google Sign-In funcione sin bloquearse, este dominio debe estar en la lista de dominios autorizados de tu proyecto Firebase (<code>gen-lang-client-0098696571</code>):
                </p>

                <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700">
                  <code className="text-xs font-mono font-bold text-amber-700 dark:text-amber-300 flex-1 truncate">
                    {currentHostname}
                  </code>
                  <button
                    onClick={handleCopyHostname}
                    className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-800 dark:text-stone-200 font-bold text-[10px] flex items-center gap-1 shrink-0"
                  >
                    {copiedDomain ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    <span>{copiedDomain ? "¡Copiado!" : "Copiar Dominio"}</span>
                  </button>
                </div>

                <a
                  href="https://console.firebase.google.com/project/gen-lang-client-0098696571/authentication/providers"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline pt-1"
                >
                  <span>Abrir Firebase Console &gt; Authorized Domains</span>
                  <ExternalLink size={12} />
                </a>
              </div>

              {/* Push notifications activation */}
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone size={16} className="text-blue-500" />
                    <span className="font-bold text-stone-900 dark:text-stone-100">
                      Notificaciones Web Push en Celular & PC
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      permission === "granted"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    }`}
                  >
                    {permission === "granted" ? "Activo" : "Requiere Permiso"}
                  </span>
                </div>

                <p className="text-[11px] text-stone-500 leading-relaxed">
                  Recibe avisos inmediatos en tu celular cuando un cliente o Laura envíen una solicitud o cuando se complete una tarea.
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleActivatePush}
                    disabled={isActivating}
                    className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all disabled:opacity-50"
                  >
                    {isActivating ? <RefreshCw size={13} className="animate-spin" /> : <Smartphone size={13} />}
                    <span>{permission === "granted" ? "Re-sincronizar Token Push" : "Activar Notificaciones Push"}</span>
                  </button>

                  <button
                    onClick={handleTestPushAndEmail}
                    disabled={isTesting}
                    className="py-2 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 text-stone-800 dark:text-stone-200 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-50 shrink-0"
                  >
                    {isTesting ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} className="text-amber-500" />}
                    <span>Probar Push + Email</span>
                  </button>
                </div>
              </div>

              {/* Email alerts configuration */}
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-amber-500" />
                    <span className="font-bold text-stone-900 dark:text-stone-100">
                      Alertas por Correo Electrónico
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailAlertsEnabled}
                      onChange={(e) => {
                        setEmailAlertsEnabled(e.target.checked);
                        localStorage.setItem("task_os_pref_email_solicitudes", String(e.target.checked));
                        playChime("tick");
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500" />
                  </label>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-600 dark:text-stone-400 block mb-1">
                    Correo destinatario para alertas:
                  </label>
                  <input
                    type="email"
                    value={targetEmail}
                    onChange={(e) => {
                      setTargetEmail(e.target.value);
                      localStorage.setItem("task_os_user_email_v1", e.target.value);
                    }}
                    className="w-full px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 text-xs font-semibold"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/80 flex items-center justify-between text-xs text-stone-500">
          <span>Task-OS • Centro de Notificaciones y Solicitudes</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
