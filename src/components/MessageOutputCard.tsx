import React, { useState, useMemo } from "react";
import {
  MessageSquare,
  Copy,
  Check,
  Share2,
  ExternalLink,
  Users,
  ChevronRight,
  ChevronLeft,
  Phone,
  Send,
  Mail,
  Printer,
  Download,
  DollarSign,
  Package,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";
import { playChime } from "../utils/audio";
import { Contact, WhatsAppMessageItem, LonasOrder, TaskItem, ExpectedIncome, FinancialDebt, PrintItem } from "../types";
import { formatReceiptText, downloadReceiptPNG } from "../utils/receiptGenerator";

interface MessageOutputCardProps {
  message: string | null;
  solicitante?: string;
  multiMessages?: WhatsAppMessageItem[];
  contacts?: Contact[];
  lonasOrders?: LonasOrder[];
  tasks?: TaskItem[];
  financialIncomes?: ExpectedIncome[];
  financialDebts?: FinancialDebt[];
  onOpenContactsModal: () => void;
  onAddRecipientToQueue?: (contact: Contact, messageText: string) => void;
  onMarkSent?: (id: string) => void;
  onSendToPrint?: (printItem: PrintItem) => void;
  onSaveToFinanzas?: (income: Partial<ExpectedIncome>) => void;
  onSaveToLonas?: (order: Partial<LonasOrder>) => void;
}

export default function MessageOutputCard({
  message,
  solicitante,
  multiMessages = [],
  contacts = [],
  lonasOrders = [],
  tasks = [],
  financialIncomes = [],
  financialDebts = [],
  onOpenContactsModal,
  onAddRecipientToQueue,
  onMarkSent,
  onSendToPrint,
  onSaveToFinanzas,
  onSaveToLonas,
}: MessageOutputCardProps) {
  // Navigation tabs inside OUT
  const [activeCategory, setActiveCategory] = useState<"todos" | "lonas" | "finanzas" | "tareas">("todos");

  // Selection state
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>("primary");
  const [customMessageText, setCustomMessageText] = useState<string>("");
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Build unified recipient directory combining orders, payments, tasks and contacts
  const recipients = useMemo(() => {
    const list: Array<{
      id: string;
      nombre: string;
      telefono?: string;
      email?: string;
      categoria: "lonas" | "finanzas" | "tareas" | "contacto";
      subtitulo: string;
      monto?: number;
      saldo?: number;
      folio?: string;
      defaultMessage: string;
      rawOrder?: LonasOrder;
      rawIncome?: ExpectedIncome;
      rawTask?: TaskItem;
    }> = [];

    // 1. Primary generated message from router if present
    if (message && message.trim() !== "" && message.trim() !== "No aplica.") {
      const matchContact = contacts.find(
        (c) =>
          solicitante &&
          (c.nombre.toLowerCase().includes(solicitante.toLowerCase()) ||
            solicitante.toLowerCase().includes(c.nombre.toLowerCase()))
      );

      list.push({
        id: "primary",
        nombre: solicitante || "Solicitante de Tarea",
        telefono: matchContact?.telefono,
        categoria: "tareas",
        subtitulo: "Respuesta de tarea generada por Task-OS",
        defaultMessage: message,
      });
    }

    // 2. Lonas Orders (Clients who ordered banners)
    lonasOrders.forEach((o) => {
      const saldoTxt = o.saldo > 0 ? `Saldo: $${o.saldo}` : "Pagado";
      const totalM2 = o.items.reduce((s, it) => s + (it.m2 || 0), 0).toFixed(1);
      const driveTxt = o.driveUrl ? `\n📁 Archivo de diseño en Drive: ${o.driveUrl}` : "";
      
      let msg = "";
      if (o.estado === "Listo") {
        msg = `¡Hola ${o.cliente.nombre}! Tu lona (Folio ${o.folio}) ya está terminada y lista para recoger en el taller. Total: $${o.total}. ${o.saldo > 0 ? `Saldo pendiente: $${o.saldo}.` : "Ya se encuentra 100% pagada."}${driveTxt} ¡Te esperamos!`;
      } else if (o.saldo > 0) {
        msg = `Hola ${o.cliente.nombre}, te saludamos del taller de lonas respecto a tu pedido ${o.folio} (${totalM2}m²). Tienes un saldo por liquidar de $${o.saldo}.${driveTxt} Quedamos atentos para cualquier duda.`;
      } else {
        msg = `Hola ${o.cliente.nombre}, confirmamos que tu pedido de lona ${o.folio} está en estado: ${o.estado}.${driveTxt} ¡Seguimos trabajando en tu proyecto!`;
      }

      list.push({
        id: `lona-${o.id}`,
        nombre: o.cliente.nombre,
        telefono: o.cliente.telefono,
        email: o.cliente.email,
        categoria: "lonas",
        subtitulo: `Lona ${o.folio} • ${o.estado} • ${saldoTxt}`,
        monto: o.total,
        saldo: o.saldo,
        folio: `L-${o.folio}`,
        defaultMessage: msg,
        rawOrder: o,
      });
    });

    // 3. Expected / Received Incomes & Debt payments
    financialIncomes.forEach((inc) => {
      list.push({
        id: `inc-${inc.id}`,
        nombre: inc.concepto,
        categoria: "finanzas",
        subtitulo: `Cobro ${inc.estado} • $${inc.montoEsperado}`,
        monto: inc.montoEsperado,
        defaultMessage: `Hola, confirmamos el registro del movimiento "${inc.concepto}" por monto de $${inc.montoEsperado}. Saludos cordiales.`,
        rawIncome: inc,
      });
    });

    // 4. Multi-messages from router or external queue
    multiMessages.forEach((m) => {
      if (!list.some((existing) => existing.id === m.id)) {
        list.push({
          id: m.id,
          nombre: m.destinatario,
          telefono: m.telefono,
          categoria: "tareas",
          subtitulo: m.tareaId ? `Tarea #${m.tareaId}` : "Mensaje en cola",
          defaultMessage: m.mensaje,
        });
      }
    });

    return list;
  }, [message, solicitante, contacts, lonasOrders, financialIncomes, multiMessages]);

  // Filtered recipient list based on active category tab
  const filteredRecipients = useMemo(() => {
    if (activeCategory === "todos") return recipients;
    return recipients.filter((r) => r.categoria === activeCategory);
  }, [recipients, activeCategory]);

  // Current active recipient
  const activeRecipient =
    recipients.find((r) => r.id === selectedRecipientId) ||
    filteredRecipients[0] ||
    recipients[0] || {
      id: "none",
      nombre: "Sin destinatarios pendientes",
      categoria: "tareas",
      subtitulo: "Sin pedidos o avisos pendientes",
      defaultMessage: "No hay mensajes ni personas pendientes por contactar.",
    };

  // Sync message text when active recipient changes
  React.useEffect(() => {
    if (activeRecipient) {
      setCustomMessageText(activeRecipient.defaultMessage);
    }
  }, [activeRecipient.id]);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(customMessageText);
      setCopiedSuccess(true);
      playChime("tick");
      setTimeout(() => setCopiedSuccess(false), 2200);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendWhatsApp = () => {
    const phone = (activeRecipient.telefono || "").replace(/[^0-9]/g, "");
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(customMessageText)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(customMessageText)}`;
    window.open(url, "_blank");
    if (onMarkSent && activeRecipient.id) {
      onMarkSent(activeRecipient.id);
    }
    playChime("work_done");
  };

  const handleSendEmail = () => {
    const email = activeRecipient.email || "";
    const subject = encodeURIComponent(`Aviso de servicio: ${activeRecipient.nombre}`);
    const body = encodeURIComponent(customMessageText);
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
    playChime("work_done");
  };

  // Build a PrintItem from the current active recipient
  const buildCurrentPrintItem = (): PrintItem => {
    const rawOrder = activeRecipient.rawOrder;
    if (rawOrder) {
      return {
        id: `print-${rawOrder.id}`,
        tipo: "ticket_lona",
        folio: `L-${rawOrder.folio}`,
        titulo: `Lona ${rawOrder.folio} • ${rawOrder.cliente.nombre}`,
        clienteNombre: rawOrder.cliente.nombre,
        clienteTelefono: rawOrder.cliente.telefono,
        clienteEmail: rawOrder.cliente.email,
        empresaZona: rawOrder.cliente.empresa,
        fecha: rawOrder.fechaIngreso,
        fechaEntrega: rawOrder.fechaEntregaEstimada,
        items: rawOrder.items.map((it) => ({
          descripcion: it.descripcion,
          detalle: `${it.ancho}m x ${it.alto}m • ${it.m2} m²`,
          cantidad: it.cantidad,
          subtotal: it.precioFinal,
        })),
        total: rawOrder.total,
        anticipo: rawOrder.anticipo,
        saldo: rawOrder.saldo,
        metodoPago: "Efectivo / Transferencia",
        estado: rawOrder.estado,
        notas: rawOrder.notasInternas || rawOrder.notasCliente,
        driveUrl: rawOrder.driveUrl,
        origen: "lonas",
        createdAt: new Date().toISOString(),
      };
    }

    return {
      id: `print-${Date.now()}`,
      tipo: "comprobante_pago",
      folio: activeRecipient.folio || "COMP-01",
      titulo: activeRecipient.subtitulo,
      clienteNombre: activeRecipient.nombre,
      clienteTelefono: activeRecipient.telefono,
      clienteEmail: activeRecipient.email,
      fecha: new Date().toISOString().slice(0, 10),
      items: [
        {
          descripcion: activeRecipient.subtitulo,
          cantidad: 1,
          subtotal: activeRecipient.monto || 0,
        },
      ],
      total: activeRecipient.monto || 0,
      anticipo: activeRecipient.monto || 0,
      saldo: activeRecipient.saldo || 0,
      notas: customMessageText,
      origen: "out",
      createdAt: new Date().toISOString(),
    };
  };

  const handleDownloadPNG = async () => {
    const printItem = buildCurrentPrintItem();
    try {
      await downloadReceiptPNG(printItem);
      playChime("success");
      setActionFeedback("¡Comprobante digital PNG generado y descargado!");
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendToPrintStation = () => {
    if (onSendToPrint) {
      const printItem = buildCurrentPrintItem();
      onSendToPrint(printItem);
      playChime("tick");
    }
  };

  const handleSaveFinanzas = () => {
    if (onSaveToFinanzas) {
      onSaveToFinanzas({
        concepto: `Cobro: ${activeRecipient.nombre} (${activeRecipient.subtitulo})`,
        montoEsperado: activeRecipient.monto || 0,
        montoRecibido: (activeRecipient.monto || 0) - (activeRecipient.saldo || 0),
        fechaEsperada: new Date().toISOString().slice(0, 10),
        estado: activeRecipient.saldo && activeRecipient.saldo > 0 ? "Parcial" : "Recibido",
        categoria: "Ventas Lonas / Pedidos",
      });
      playChime("success");
      setActionFeedback("¡Guardado en Salud Financiera 🤑!");
      setTimeout(() => setActionFeedback(null), 3500);
    }
  };

  const handleSaveLonas = () => {
    if (onSaveToLonas && activeRecipient.rawOrder) {
      onSaveToLonas(activeRecipient.rawOrder);
      playChime("success");
      setActionFeedback("¡Guardado y sincronizado en Lonas 💻!");
      setTimeout(() => setActionFeedback(null), 3500);
    }
  };

  return (
    <div
      id="out-executive-center"
      className="rounded-3xl border-2 border-emerald-500/40 bg-white dark:bg-stone-900 dark:border-emerald-500/30 p-4 sm:p-5 shadow-sm space-y-4"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-600 text-white font-bold text-base shadow-sm">
            📤
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-black text-stone-900 dark:text-stone-100 tracking-tight">
                OUT: Centro de Notificaciones & Contacto
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                {recipients.length} pendientes
              </span>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Avisa a quienes hicieron pedidos, pagos o encargos con comprobantes digitales
            </p>
          </div>
        </div>

        <button
          onClick={onOpenContactsModal}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold transition-colors"
          title="Directorio de contactos"
        >
          <Users size={13} />
          <span className="hidden sm:inline">Agenda</span>
        </button>
      </div>

      {actionFeedback && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3.5 py-2 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200 font-semibold animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span>{actionFeedback}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="text-emerald-700 dark:text-emerald-300 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Recipient Source Category Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveCategory("todos")}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeCategory === "todos"
              ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 shadow-xs"
              : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200"
          }`}
        >
          Todos ({recipients.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory("lonas")}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeCategory === "lonas"
              ? "bg-amber-500 text-stone-950 shadow-xs"
              : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200"
          }`}
        >
          💻 Pedidos Lonas ({recipients.filter((r) => r.categoria === "lonas").length})
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory("finanzas")}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeCategory === "finanzas"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200"
          }`}
        >
          🤑 Pagos ({recipients.filter((r) => r.categoria === "finanzas").length})
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory("tareas")}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeCategory === "tareas"
              ? "bg-amber-600 text-white shadow-xs"
              : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200"
          }`}
        >
          🔥 Tareas ({recipients.filter((r) => r.categoria === "tareas").length})
        </button>
      </div>

      {/* Recipient Selector Carousel / Dropdown */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-wider text-stone-400">
          Seleccionar Persona / Pedido
        </label>
        <div className="flex items-center gap-2">
          <select
            value={activeRecipient.id}
            onChange={(e) => {
              setSelectedRecipientId(e.target.value);
              playChime("tick");
            }}
            className="w-full text-xs font-bold px-3 py-2.5 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/80 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {filteredRecipients.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre} • {r.subtitulo}
              </option>
            ))}
          </select>

          {activeRecipient.telefono && (
            <span className="font-mono text-[11px] px-2 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold shrink-0">
              📞 {activeRecipient.telefono}
            </span>
          )}
        </div>
      </div>

      {/* Archivo de diseño en Drive vinculado */}
      {activeRecipient.rawOrder?.driveUrl && (
        <div className="p-2.5 rounded-2xl bg-[#eef5ff] dark:bg-[#073d83]/20 border border-[#042f66]/20 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 truncate">
            <span className="text-base shrink-0">📁</span>
            <div className="truncate">
              <span className="text-[10px] font-black uppercase text-[#042f66] dark:text-[#ffd15c] block leading-tight">
                Archivo de Diseño en Drive
              </span>
              <a
                href={activeRecipient.rawOrder.driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 dark:text-blue-300 font-mono underline truncate block text-[11px]"
              >
                {activeRecipient.rawOrder.driveUrl}
              </a>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href={activeRecipient.rawOrder.driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-xl bg-[#042f66] text-white hover:bg-[#073d83] text-[10px] font-bold transition-colors"
            >
              Abrir Drive ↗
            </a>
            {!customMessageText.includes(activeRecipient.rawOrder.driveUrl) && (
              <button
                type="button"
                onClick={() => {
                  setCustomMessageText(
                    (prev) => `${prev}\n📁 Archivo de diseño en Drive: ${activeRecipient.rawOrder!.driveUrl}`
                  );
                  playChime("tick");
                }}
                className="px-2.5 py-1 rounded-xl bg-[#f2ad00] hover:bg-[#ffd15c] text-[#1d1d1b] text-[10px] font-black transition-colors"
                title="Añadir enlace de Drive al mensaje para el cliente"
              >
                + Adjuntar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Editable Message Box */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-stone-400">
          <span>Mensaje para Enviar / Comprobante de Texto</span>
          <button
            onClick={() => setCustomMessageText(activeRecipient.defaultMessage)}
            className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
          >
            Restaurar Original
          </button>
        </div>

        <textarea
          rows={3}
          value={customMessageText}
          onChange={(e) => setCustomMessageText(e.target.value)}
          className="w-full text-xs sm:text-sm p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 bg-stone-50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed font-sans shadow-inner"
        />
      </div>

      {/* Action Hub (WhatsApp, PNG, Email, PRINT station, Finanzas, Lonas) */}
      <div className="space-y-2 pt-1">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* WhatsApp Button */}
          <button
            onClick={handleSendWhatsApp}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-all active:scale-95"
            title="Mandar por WhatsApp al cliente"
          >
            <Send size={14} />
            <span>Por WhatsApp</span>
          </button>

          {/* PNG Voucher Button */}
          <button
            onClick={handleDownloadPNG}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-xs transition-all active:scale-95"
            title="Generar comprobante digital en formato imagen PNG"
          >
            <Download size={14} />
            <span>Ticket PNG</span>
          </button>

          {/* Copy Text */}
          <button
            onClick={handleCopyText}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-bold text-xs transition-all active:scale-95"
            title="Copiar texto para portapapeles"
          >
            {copiedSuccess ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            <span>{copiedSuccess ? "¡Copiado!" : "Copiar Texto"}</span>
          </button>

          {/* Email Button */}
          <button
            onClick={handleSendEmail}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-bold text-xs transition-all active:scale-95"
            title="Mandar por correo electrónico"
          >
            <Mail size={14} />
            <span>Por Correo</span>
          </button>
        </div>

        {/* Cross Tool Integration Strip */}
        <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSaveFinanzas}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold hover:bg-emerald-100"
              title="Guardar como ingreso en Salud Financiera"
            >
              <span>🤑 Guardar en Finanzas</span>
            </button>

            {activeRecipient.rawOrder && (
              <button
                onClick={handleSaveLonas}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-bold hover:bg-amber-100"
                title="Actualizar o guardar en Lonas"
              >
                <span>💻 Guardar en Lonas</span>
              </button>
            )}
          </div>

          <button
            onClick={handleSendToPrintStation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 font-bold text-xs hover:bg-stone-800 transition-all shadow-xs"
            title="Mandar a la estación PRINT (🖨️)"
          >
            <Printer size={13} />
            <span>Mandar a PRINT (🖨️)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
