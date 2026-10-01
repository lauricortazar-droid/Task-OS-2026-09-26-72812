import React, { useState, useRef } from "react";
import {
  X,
  UserPlus,
  Phone,
  User,
  Trash2,
  Edit2,
  Check,
  MessageSquare,
  ExternalLink,
  Upload,
  Download,
  Tag as TagIcon,
  Search,
  FileSpreadsheet,
  AlertCircle,
  Plus,
} from "lucide-react";
import { Contact, TagItem } from "../types";
import { playChime } from "../utils/audio";
import { buildWhatsAppUrl, openWhatsAppInNewTab } from "../utils/whatsapp";
import { getTagColorClass } from "../utils/tagColors";

interface ContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  tags?: TagItem[];
  onAddContact: (contact: Omit<Contact, "id">) => void;
  onUpdateContact: (contact: Contact) => void;
  onDeleteContact: (id: string) => void;
  onSelectContactForMessage?: (contact: Contact) => void;
  onBulkAddContacts?: (contacts: Contact[]) => void;
  onOpenGoogleContacts?: () => void;
}

export default function ContactsModal({
  isOpen,
  onClose,
  contacts,
  tags = [],
  onAddContact,
  onUpdateContact,
  onDeleteContact,
  onSelectContactForMessage,
  onBulkAddContacts,
  onOpenGoogleContacts,
}: ContactsModalProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState<string>("todos");

  // Form states
  const [formNombre, setFormNombre] = useState("");
  const [formTelefono, setFormTelefono] = useState("");
  const [formRol, setFormRol] = useState("");
  const [formDominio, setFormDominio] = useState("FGDLL");
  const [formEtiquetas, setFormEtiquetas] = useState<string[]>([]);

  // Direct WhatsApp dialer state (e.g. 19999011852)
  const [directPhone, setDirectPhone] = useState("");
  const [directMsg, setDirectMsg] = useState("");
  const [isDirectDialOpen, setIsDirectDialOpen] = useState(false);

  // File import state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importedPreview, setImportedPreview] = useState<Contact[]>([]);
  const [importSelectedTags, setImportSelectedTags] = useState<string[]>(["Cliente Lonas"]);
  const [importFileName, setImportFileName] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Search and filter contacts
  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.telefono.includes(searchQuery) ||
      (c.rol && c.rol.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.dominio && c.dominio.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.etiquetas && c.etiquetas.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

    if (!matchesSearch) return false;
    if (filterTag !== "todos") {
      return c.etiquetas && c.etiquetas.includes(filterTag);
    }
    return true;
  });

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre.trim()) return;

    onAddContact({
      nombre: formNombre.trim(),
      telefono: formTelefono.trim(),
      rol: formRol.trim() || undefined,
      dominio: formDominio || undefined,
      etiquetas: formEtiquetas.length > 0 ? formEtiquetas : undefined,
    });

    setFormNombre("");
    setFormTelefono("");
    setFormRol("");
    setFormEtiquetas([]);
    setIsAdding(false);
    playChime("success");
  };

  const startEdit = (c: Contact) => {
    setEditingId(c.id);
    setFormNombre(c.nombre);
    setFormTelefono(c.telefono);
    setFormRol(c.rol || "");
    setFormDominio(c.dominio || "FGDLL");
    setFormEtiquetas(c.etiquetas || []);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !formNombre.trim()) return;

    onUpdateContact({
      id: editingId,
      nombre: formNombre.trim(),
      telefono: formTelefono.trim(),
      rol: formRol.trim() || undefined,
      dominio: formDominio || undefined,
      etiquetas: formEtiquetas.length > 0 ? formEtiquetas : undefined,
    });

    setEditingId(null);
    setFormNombre("");
    setFormTelefono("");
    setFormRol("");
    setFormEtiquetas([]);
    playChime("success");
  };

  const handleDirectWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directPhone.trim()) return;
    openWhatsAppInNewTab(directPhone.trim(), directMsg.trim());
    playChime("success");
  };

  // CSV/File Parser
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          setImportError("El archivo está vacío.");
          return;
        }

        const parsedContacts: Contact[] = [];

        // Check if JSON
        if (file.name.endsWith(".json")) {
          const json = JSON.parse(text);
          if (Array.isArray(json)) {
            json.forEach((item: any, idx: number) => {
              if (item.nombre || item.name) {
                parsedContacts.push({
                  id: `imported-${Date.now()}-${idx}`,
                  nombre: String(item.nombre || item.name || "").trim(),
                  telefono: String(item.telefono || item.phone || "").trim(),
                  rol: item.rol || item.role,
                  dominio: item.dominio || "FGDLL",
                  etiquetas: Array.isArray(item.etiquetas) ? item.etiquetas : [],
                });
              }
            });
          }
        } else {
          // Parse CSV or TSV or TXT lines
          const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
          if (lines.length === 0) {
            setImportError("No se encontraron líneas válidas en el archivo.");
            return;
          }

          // Detect delimiter: comma, semicolon or tab
          const firstLine = lines[0];
          let delimiter = ",";
          if (firstLine.includes(";") && !firstLine.includes(",")) delimiter = ";";
          if (firstLine.includes("\t")) delimiter = "\t";

          // Check if first line is header
          const hasHeader = /nombre|name|telefono|phone|contacto/i.test(firstLine);
          const dataLines = hasHeader ? lines.slice(1) : lines;

          dataLines.forEach((line, idx) => {
            // Split respecting basic quotes
            const cols = line.split(delimiter).map((col) => col.replace(/^["']|["']$/g, "").trim());
            if (cols.length > 0 && cols[0]) {
              const nombre = cols[0];
              const telefono = cols[1] || "";
              const rol = cols[2] || undefined;
              const dominio = cols[3] || "FGDLL";
              const rawTags = cols[4] ? cols[4].split("|").map((t) => t.trim()) : [];

              parsedContacts.push({
                id: `imported-${Date.now()}-${idx}`,
                nombre,
                telefono,
                rol,
                dominio,
                etiquetas: rawTags,
              });
            }
          });
        }

        if (parsedContacts.length === 0) {
          setImportError("No se pudieron extraer contactos válidos. Verifica el formato del archivo.");
          return;
        }

        setImportedPreview(parsedContacts);
        setIsImportModalOpen(true);
      } catch (err: any) {
        console.error("Error parsing file:", err);
        setImportError(`Error al leer archivo: ${err.message}`);
      }
    };
    reader.readAsText(file);
    // Reset file input value so same file can be selected again
    e.target.value = "";
  };

  const handleConfirmImport = () => {
    if (importedPreview.length === 0) return;

    // Apply selected tags to all imported contacts
    const finalized = importedPreview.map((c) => {
      const existingTags = c.etiquetas || [];
      const merged = Array.from(new Set([...existingTags, ...importSelectedTags]));
      return {
        ...c,
        etiquetas: merged.length > 0 ? merged : undefined,
      };
    });

    if (onBulkAddContacts) {
      onBulkAddContacts(finalized);
    } else {
      finalized.forEach((c) => onAddContact(c));
    }

    setIsImportModalOpen(false);
    setImportedPreview([]);
    setImportFileName("");
    playChime("success");
  };

  const toggleFormTag = (tagName: string) => {
    if (formEtiquetas.includes(tagName)) {
      setFormEtiquetas(formEtiquetas.filter((t) => t !== tagName));
    } else {
      setFormEtiquetas([...formEtiquetas, tagName]);
    }
  };

  const toggleImportTag = (tagName: string) => {
    if (importSelectedTags.includes(tagName)) {
      setImportSelectedTags(importSelectedTags.filter((t) => t !== tagName));
    } else {
      setImportSelectedTags([...importSelectedTags, tagName]);
    }
  };

  // Download Sample CSV
  const downloadSampleCsv = () => {
    const csvContent =
      "Nombre,Telefono,Rol,Dominio,Etiquetas\n" +
      "Laura Cortazar,+52 55 1234 5678,Dirección,Laura,Urgente|FGDLL\n" +
      "Cliente Lonas Don Pepe,19999011852,Cliente Lonas,Diseño,Cliente Lonas|Pendiente\n" +
      "Proveedor Gran Formato,5219991234567,Proveedor,Diseño,Proveedor|Importante\n" +
      "Finanzas Contador,5215587654321,Contador,Finanzas,Finanzas\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "plantilla_contactos_task_os.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export current contacts to CSV
  const exportContactsCsv = () => {
    let csv = "Nombre,Telefono,Rol,Dominio,Etiquetas\n";
    contacts.forEach((c) => {
      const tagsStr = (c.etiquetas || []).join("|");
      csv += `"${c.nombre}","${c.telefono}","${c.rol || ""}","${c.dominio || ""}","${tagsStr}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `contactos_task_os_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="contacts-modal"
        className="w-full max-w-2xl rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/60 dark:bg-stone-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Phone size={18} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                Agenda de Contactos & WhatsApp
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Sube listas, asigna etiquetas y abre chats directos en una pestaña nueva
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>

        {/* Action Toolbar: Subir archivo, Plantilla, Exportar, Marcado Rápido */}
        <div className="p-3 sm:p-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/40 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* File input (hidden) */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.tsv,.json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors min-h-[40px]"
              title="Importar lista de contactos desde CSV, Excel, TXT o JSON"
            >
              <Upload size={14} />
              <span>Subir Archivo de Contactos</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDirectDialOpen(!isDirectDialOpen)}
              className="px-3 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold text-xs flex items-center gap-1.5 transition-colors min-h-[40px]"
              title="Escribir WhatsApp a cualquier número sin guardar"
            >
              <MessageSquare size={14} className="text-emerald-600" />
              <span>WhatsApp Directo</span>
            </button>

            {onOpenGoogleContacts && (
              <button
                type="button"
                onClick={onOpenGoogleContacts}
                className="px-3 py-2 rounded-xl border border-blue-300 dark:border-blue-800 bg-blue-50/80 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center gap-1.5 transition-colors min-h-[40px]"
                title="Sincronizar y obtener contactos desde tu cuenta de Google"
              >
                <span>Google Contacts</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={downloadSampleCsv}
              className="p-2 rounded-lg text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 text-[11px] font-medium flex items-center gap-1"
              title="Descargar plantilla CSV de ejemplo"
            >
              <FileSpreadsheet size={14} />
              <span className="hidden sm:inline">Plantilla CSV</span>
            </button>
            <button
              type="button"
              onClick={exportContactsCsv}
              className="p-2 rounded-lg text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 text-[11px] font-medium flex items-center gap-1"
              title="Exportar contactos actuales a CSV"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Exportar</span>
            </button>
          </div>
        </div>

        {/* Direct WhatsApp composer (e.g. 19999011852) */}
        {isDirectDialOpen && (
          <form
            onSubmit={handleDirectWhatsApp}
            className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border-b border-emerald-200 dark:border-emerald-900/60 animate-in fade-in duration-150 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                <ExternalLink size={14} />
                Escribir por WhatsApp a cualquier persona en nueva pestaña
              </span>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">
                Ejemplo: 19999011852
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-4">
                <input
                  type="text"
                  required
                  value={directPhone}
                  onChange={(e) => setDirectPhone(e.target.value)}
                  placeholder="Teléfono (ej. 19999011852)"
                  className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-stone-900 text-xs font-mono text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="sm:col-span-6">
                <input
                  type="text"
                  value={directMsg}
                  onChange={(e) => setDirectMsg(e.target.value)}
                  placeholder="Mensaje opcional (ej. Hola, te escribo por tu pedido de lonas...)"
                  className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="w-full px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs transition-colors min-h-[38px]"
                >
                  <ExternalLink size={13} />
                  <span>Abrir Chat</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Search & Tag Filter Bar */}
        <div className="p-3 sm:p-4 border-b border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, teléfono o etiqueta..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] font-semibold text-stone-500 shrink-0">Etiqueta:</span>
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs text-stone-800 dark:text-stone-200 focus:outline-none"
            >
              <option value="todos">Todas las etiquetas</option>
              {tags.map((t) => (
                <option key={t.id} value={t.nombre}>
                  {t.nombre}
                </option>
              ))}
              <option value="Cliente Lonas">Cliente Lonas</option>
              <option value="Proveedor">Proveedor</option>
              <option value="Finanzas">Finanzas</option>
            </select>
          </div>
        </div>

        {/* Content body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Add contact trigger / form */}
          {!isAdding && !editingId ? (
            <button
              onClick={() => {
                setIsAdding(true);
                setFormNombre("");
                setFormTelefono("");
                setFormRol("");
                setFormEtiquetas([]);
              }}
              className="w-full py-3 px-4 rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 hover:border-emerald-500 dark:hover:border-emerald-500 text-stone-600 dark:text-stone-300 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center justify-center gap-2 text-xs font-bold transition-colors min-h-[44px]"
            >
              <UserPlus size={16} />
              Añadir nuevo contacto individual
            </button>
          ) : (
            <form
              onSubmit={editingId ? handleSaveEdit : handleSaveNew}
              className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-3.5"
            >
              <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <User size={15} className="text-emerald-600" />
                {editingId ? "Editar Contacto" : "Nuevo Contacto para WhatsApp"}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-stone-500">Nombre / Identificador</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Laura, Pepe Lonas, Juan Proveedor..."
                    value={formNombre}
                    onChange={(e) => setFormNombre(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-stone-500">Teléfono WhatsApp</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 19999011852 o +52 55 1234 5678"
                    value={formTelefono}
                    onChange={(e) => setFormTelefono(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-stone-500">Rol o Función</label>
                  <input
                    type="text"
                    placeholder="Ej. Cliente Lonas, Coordinadora, Proveedor..."
                    value={formRol}
                    onChange={(e) => setFormRol(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-stone-500">Dominio</label>
                  <select
                    value={formDominio}
                    onChange={(e) => setFormDominio(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Laura">Laura</option>
                    <option value="Lonas">Lonas</option>
                    <option value="Finanzas">Finanzas</option>
                    <option value="FGDLL">FGDLL</option>
                    <option value="Universidad">Universidad</option>
                    <option value="Diseño">Diseño / Producción</option>
                    <option value="Tecnología">Tecnología</option>
                    <option value="Profesional">Profesional</option>
                    <option value="Personal">Personal</option>
                  </select>
                </div>
              </div>

              {/* Tag selector */}
              <div>
                <label className="text-[11px] font-semibold text-stone-500 block mb-1">
                  Etiquetas para este contacto:
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700">
                  {tags.map((t) => {
                    const isSelected = formEtiquetas.includes(t.nombre);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleFormTag(t.nombre)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                          isSelected
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200"
                        }`}
                      >
                        <TagIcon size={10} />
                        <span>{t.nombre}</span>
                        {isSelected && <Check size={11} />}
                      </button>
                    );
                  })}
                  {/* Preset quick tags */}
                  {["Cliente Lonas", "Proveedor", "Finanzas", "VIP"].map((presetTag) => {
                    if (tags.some((t) => t.nombre === presetTag)) return null;
                    const isSelected = formEtiquetas.includes(presetTag);
                    return (
                      <button
                        key={presetTag}
                        type="button"
                        onClick={() => toggleFormTag(presetTag)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                          isSelected
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200"
                        }`}
                      >
                        <TagIcon size={10} />
                        <span>{presetTag}</span>
                        {isSelected && <Check size={11} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingId(null);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 min-h-[38px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs min-h-[38px]"
                >
                  {editingId ? "Guardar Cambios" : "Añadir Contacto"}
                </button>
              </div>
            </form>
          )}

          {/* Contact list */}
          <div className="space-y-2">
            {filteredContacts.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 text-stone-400">
                <p className="text-xs">No se encontraron contactos que coincidan con la búsqueda.</p>
              </div>
            ) : (
              filteredContacts.map((c) => {
                const waUrl = buildWhatsAppUrl(c.telefono, `Hola ${c.nombre}, `);
                return (
                  <div
                    key={c.id}
                    id={`contact-item-${c.id}`}
                    className="p-3 sm:p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40 hover:bg-stone-100/60 dark:hover:bg-stone-800/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-sm flex items-center justify-center shrink-0">
                        {c.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 truncate">
                            {c.nombre}
                          </span>
                          {c.dominio && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-stone-200/80 dark:bg-stone-700 text-stone-600 dark:text-stone-300 shrink-0">
                              {c.dominio}
                            </span>
                          )}
                        </div>

                        {/* Phone & Role */}
                        <div className="flex items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                          {c.telefono ? (
                            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                              {c.telefono}
                            </span>
                          ) : (
                            <span className="italic text-stone-400">Sin teléfono</span>
                          )}
                          {c.rol && <span>• {c.rol}</span>}
                        </div>

                        {/* Etiquetas */}
                        {c.etiquetas && c.etiquetas.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {c.etiquetas.map((tName, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                              >
                                <TagIcon size={8} />
                                <span>{tName}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      {c.telefono && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors min-h-[38px]"
                          title="Abrir WhatsApp en una nueva pestaña"
                        >
                          <ExternalLink size={13} />
                          <span>WhatsApp</span>
                        </a>
                      )}

                      {onSelectContactForMessage && (
                        <button
                          onClick={() => {
                            onSelectContactForMessage(c);
                            onClose();
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-100 font-semibold text-xs transition-colors min-h-[38px]"
                          title="Usar este contacto para el mensaje"
                        >
                          Elegir
                        </button>
                      )}

                      <button
                        onClick={() => startEdit(c)}
                        className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-700 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
                        title="Editar contacto"
                      >
                        <Edit2 size={15} />
                      </button>

                      <button
                        onClick={() => onDeleteContact(c.id)}
                        className="p-2 rounded-xl text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
                        title="Eliminar contacto"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-stone-50 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 text-xs text-stone-500 flex items-center justify-between">
          <span>{contacts.length} contactos guardados</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-semibold text-xs hover:bg-stone-300 dark:hover:bg-stone-700 min-h-[38px]"
          >
            Cerrar Agenda
          </button>
        </div>
      </div>

      {/* Import Wizard Modal with Tag Assignment */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Upload size={18} className="text-emerald-600" />
                <h4 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Importar Archivo & Asignar Etiquetas
                </h4>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-300">
              Se detectaron <strong>{importedPreview.length} contactos</strong> en el archivo{" "}
              <span className="font-mono text-emerald-600">{importFileName}</span>.
            </p>

            {/* Tag Selection for Imported Contacts */}
            <div className="space-y-2 p-3 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-200 dark:border-stone-700">
              <label className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                <TagIcon size={14} className="text-emerald-600" />
                ¿Qué etiquetas deseas asignar a estos contactos importados?
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Cliente Lonas",
                  "Proveedor",
                  "Finanzas",
                  "FGDLL",
                  "Urgente",
                  "Zona Tiburón",
                  "Universidad",
                  "VIP",
                ].map((tagName) => {
                  const isChecked = importSelectedTags.includes(tagName);
                  return (
                    <button
                      key={tagName}
                      type="button"
                      onClick={() => toggleImportTag(tagName)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 ${
                        isChecked
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-stone-600"
                      }`}
                    >
                      <TagIcon size={11} />
                      <span>{tagName}</span>
                      {isChecked && <Check size={12} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preview sample */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-stone-500 uppercase">
                Vista Previa (Primeros 3 de {importedPreview.length})
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {importedPreview.slice(0, 3).map((item, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700 text-xs flex justify-between"
                  >
                    <div>
                      <span className="font-bold text-stone-900 dark:text-stone-100">{item.nombre}</span>
                      <span className="text-stone-500 ml-2 font-mono">{item.telefono}</span>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-semibold">{item.rol || item.dominio}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-500 hover:text-stone-800 min-h-[40px]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs min-h-[40px]"
              >
                Confirmar e Importar ({importedPreview.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
