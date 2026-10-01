import React, { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  Tag as TagIcon,
  RotateCcw,
  Sparkles,
  MapPin,
  Briefcase,
  AlertCircle,
} from "lucide-react";
import { TagItem, TagCategory } from "../types";
import { getTagColorClass, TAG_COLOR_OPTIONS } from "../utils/tagColors";
import { playChime } from "../utils/audio";

export const DEFAULT_TAGS: TagItem[] = [
  // Prioridad: Urgente, Importante, Pendiente, Delegado
  { id: "tag-1", nombre: "Urgente", categoria: "prioridad", color: "rose" },
  { id: "tag-2", nombre: "Importante", categoria: "prioridad", color: "amber" },
  { id: "tag-3", nombre: "Pendiente", categoria: "prioridad", color: "blue" },
  { id: "tag-4", nombre: "Delegado", categoria: "prioridad", color: "purple" },

  // Zona
  { id: "tag-5", nombre: "Zona Tiburón", categoria: "zona", color: "cyan" },
  { id: "tag-6", nombre: "Zona Gladiadores", categoria: "zona", color: "orange" },
  { id: "tag-7", nombre: "Zona Águilas", categoria: "zona", color: "emerald" },
  { id: "tag-8", nombre: "Zona Centro", categoria: "zona", color: "indigo" },

  // Áreas
  { id: "tag-9", nombre: "Diseño", categoria: "area", color: "pink" },
  { id: "tag-10", nombre: "Tecnología", categoria: "area", color: "violet" },
  { id: "tag-11", nombre: "Universidad", categoria: "area", color: "teal" },
  { id: "tag-12", nombre: "Reconocimientos", categoria: "area", color: "amber" },
  { id: "tag-13", nombre: "Logística", categoria: "area", color: "stone" },
];

interface TagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tags: TagItem[];
  onAddTag: (tag: Omit<TagItem, "id">) => void;
  onUpdateTag: (tag: TagItem) => void;
  onDeleteTag: (id: string) => void;
  onResetDefaultTags: () => void;
}

export default function TagsModal({
  isOpen,
  onClose,
  tags,
  onAddTag,
  onUpdateTag,
  onDeleteTag,
  onResetDefaultTags,
}: TagsModalProps) {
  const [activeTab, setActiveTab] = useState<TagCategory>("prioridad");

  // Create form state
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState<TagCategory>("prioridad");
  const [color, setColor] = useState("rose");

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editCategoria, setEditCategoria] = useState<TagCategory>("prioridad");
  const [editColor, setEditColor] = useState("stone");

  if (!isOpen) return null;

  const handleStartEdit = (tag: TagItem) => {
    setEditingId(tag.id);
    setEditNombre(tag.nombre);
    setEditCategoria(tag.categoria);
    setEditColor(tag.color);
  };

  const handleSaveEdit = (id: string) => {
    if (!editNombre.trim()) return;
    onUpdateTag({
      id,
      nombre: editNombre.trim(),
      categoria: editCategoria,
      color: editColor,
    });
    setEditingId(null);
    playChime("tick");
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    onAddTag({
      nombre: nombre.trim(),
      categoria,
      color,
    });

    setNombre("");
    playChime("success");
  };

  const filteredTags = tags.filter((t) => t.categoria === activeTab);

  const getCategoryIcon = (cat: TagCategory) => {
    switch (cat) {
      case "prioridad":
        return <AlertCircle size={14} className="text-rose-500" />;
      case "zona":
        return <MapPin size={14} className="text-cyan-500" />;
      case "area":
        return <Briefcase size={14} className="text-violet-500" />;
    }
  };

  const getCategoryTitle = (cat: TagCategory) => {
    switch (cat) {
      case "prioridad":
        return "Prioridad / Nivel de Atención";
      case "zona":
        return "Etiquetas de Zona";
      case "area":
        return "Etiquetas de Áreas";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-2xl w-full bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <TagIcon size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Gestor de Etiquetas
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Crea, edita o elimina etiquetas de Prioridad, Zonas y Áreas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex border-b border-stone-200 dark:border-stone-800 px-5 bg-stone-50/30 dark:bg-stone-900/20">
          {(
            [
              { id: "prioridad", label: "Prioridad (Urgente, Importante...)" },
              { id: "zona", label: "Etiquetas de Zona" },
              { id: "area", label: "Etiquetas de Áreas" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setCategoria(tab.id);
              }}
              className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? "border-amber-500 text-amber-600 dark:text-amber-400 font-bold"
                  : "border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
              }`}
            >
              {getCategoryIcon(tab.id)}
              <span>{tab.label}</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-500">
                {tags.filter((t) => t.categoria === tab.id).length}
              </span>
            </button>
          ))}
        </div>

        {/* Content Body: Scrollable list of tags + inline creator */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Create New Tag for this Category */}
          <form
            onSubmit={handleCreateSubmit}
            className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                <Plus size={14} className="text-amber-500" />
                Añadir nueva etiqueta a {getCategoryTitle(activeTab)}
              </span>
              <span className="text-[10px] text-stone-400">Total: {filteredTags.length}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-6">
                <input
                  type="text"
                  placeholder={`Ej. ${
                    activeTab === "prioridad"
                      ? "Urgente, Delegado..."
                      : activeTab === "zona"
                      ? "Zona Tiburón, Norte..."
                      : "Diseño, Tecnología..."
                  }`}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="sm:col-span-4">
                <select
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {TAG_COLOR_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={!nombre.trim()}
                  className="w-full py-1.5 px-3 rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-1"
                >
                  <Plus size={13} />
                  <span>Crear</span>
                </button>
              </div>
            </div>

            {/* Preview of tag while typing */}
            {nombre.trim() && (
              <div className="flex items-center gap-2 pt-1 text-xs">
                <span className="text-[11px] text-stone-400">Vista previa:</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${getTagColorClass(
                    color
                  )}`}
                >
                  {nombre.trim()}
                </span>
              </div>
            )}
          </form>

          {/* Existing tags list */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              Etiquetas existentes ({filteredTags.length})
            </h3>

            {filteredTags.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400 border border-dashed border-stone-200 dark:border-stone-800 rounded-xl">
                No hay etiquetas creadas en esta categoría. Puedes añadir una arriba.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredTags.map((tag) => {
                  const isEditing = editingId === tag.id;

                  if (isEditing) {
                    return (
                      <div
                        key={tag.id}
                        className="p-2.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-950/20 space-y-2"
                      >
                        <input
                          type="text"
                          value={editNombre}
                          onChange={(e) => setEditNombre(e.target.value)}
                          className="w-full px-2.5 py-1 rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-stone-100"
                        />
                        <div className="flex items-center gap-2">
                          <select
                            value={editColor}
                            onChange={(e) => setEditColor(e.target.value)}
                            className="flex-1 px-2 py-1 rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs"
                          >
                            {TAG_COLOR_OPTIONS.map((c) => (
                              <option key={c.value} value={c.value}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleSaveEdit(tag.id)}
                            className="p-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                            title="Guardar cambios"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 rounded-md text-stone-400 hover:text-stone-600"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={tag.id}
                      className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-center justify-between gap-2 hover:border-stone-300 dark:hover:border-stone-700 transition-colors"
                    >
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${getTagColorClass(
                          tag.color
                        )}`}
                      >
                        {tag.nombre}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEdit(tag)}
                          className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                          title="Editar etiqueta"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`¿Eliminar la etiqueta "${tag.nombre}"?`)) {
                              onDeleteTag(tag.id);
                              playChime("tick");
                            }
                          }}
                          className="p-1 rounded-md text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Eliminar etiqueta"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer with Reset Defaults */}
        <div className="px-5 py-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/60 flex items-center justify-between text-xs">
          <button
            onClick={() => {
              if (window.confirm("¿Restablecer todas las etiquetas a las predeterminadas?")) {
                onResetDefaultTags();
                playChime("tick");
              }
            }}
            className="flex items-center gap-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
          >
            <RotateCcw size={13} />
            <span>Restablecer etiquetas iniciales</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-semibold hover:opacity-90 transition-all"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
