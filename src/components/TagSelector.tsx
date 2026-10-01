import React, { useState } from "react";
import { TagItem, TagCategory } from "../types";
import { getTagColorClass } from "../utils/tagColors";
import { Tag as TagIcon, Plus, Check, Settings2, ChevronDown, ChevronUp } from "lucide-react";

interface TagSelectorProps {
  availableTags: TagItem[];
  selectedTagNames: string[];
  onChange: (selected: string[]) => void;
  onOpenManageTags: () => void;
  compact?: boolean;
}

export default function TagSelector({
  availableTags,
  selectedTagNames,
  onChange,
  onOpenManageTags,
  compact = false,
}: TagSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [activeCategory, setActiveCategory] = useState<TagCategory>("prioridad");

  const toggleTag = (tagName: string) => {
    if (selectedTagNames.includes(tagName)) {
      onChange(selectedTagNames.filter((t) => t !== tagName));
    } else {
      onChange([...selectedTagNames, tagName]);
    }
  };

  const removeTag = (tagName: string) => {
    onChange(selectedTagNames.filter((t) => t !== tagName));
  };

  // Group tags
  const priorityTags = availableTags.filter((t) => t.categoria === "prioridad");
  const zoneTags = availableTags.filter((t) => t.categoria === "zona");
  const areaTags = availableTags.filter((t) => t.categoria === "area");

  const currentCategoryTags =
    activeCategory === "prioridad"
      ? priorityTags
      : activeCategory === "zona"
      ? zoneTags
      : areaTags;

  return (
    <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/40 p-3 space-y-2.5">
      {/* Header bar: Selected tags preview + toggle expand + manage button */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300">
            <TagIcon size={13} className="text-amber-500" />
            <span>Etiquetas de la tarea:</span>
          </div>

          {selectedTagNames.length === 0 ? (
            <span className="text-[11px] text-stone-400 italic">Ninguna seleccionada</span>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              {selectedTagNames.map((name) => {
                const tagObj = availableTags.find((t) => t.nombre === name);
                const color = tagObj?.color || "stone";
                return (
                  <span
                    key={name}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getTagColorClass(
                      color
                    )}`}
                  >
                    <span>{name}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(name)}
                      className="hover:opacity-75 ml-0.5 text-xs font-bold leading-none"
                      title="Quitar etiqueta"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenManageTags}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors"
            title="Añadir, editar o eliminar etiquetas"
          >
            <Settings2 size={12} />
            <span>Editar etiquetas</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
            title={isExpanded ? "Ocultar selector" : "Mostrar selector"}
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Expanded quick selector chips */}
      {isExpanded && (
        <div className="pt-2 border-t border-stone-200/80 dark:border-stone-800 space-y-2 animate-in fade-in duration-150">
          {/* Category Tabs: Prioridad | Zona | Área */}
          <div className="flex items-center gap-1 border-b border-stone-200/60 dark:border-stone-800/60 pb-1.5 text-xs">
            <button
              type="button"
              onClick={() => setActiveCategory("prioridad")}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
                activeCategory === "prioridad"
                  ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-2xs"
                  : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
              }`}
            >
              Prioridad ({priorityTags.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("zona")}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
                activeCategory === "zona"
                  ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-2xs"
                  : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
              }`}
            >
              Zonas ({zoneTags.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("area")}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
                activeCategory === "area"
                  ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-2xs"
                  : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
              }`}
            >
              Áreas ({areaTags.length})
            </button>
          </div>

          {/* Quick toggle chips for the active category */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            {currentCategoryTags.map((tag) => {
              const isSelected = selectedTagNames.includes(tag.nombre);
              const colorClass = getTagColorClass(tag.color);

              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.nombre)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                    isSelected
                      ? `${colorClass} ring-2 ring-amber-500/50 shadow-2xs scale-102`
                      : "bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-500 opacity-80"
                  }`}
                >
                  {isSelected && <Check size={11} className="stroke-[3]" />}
                  <span>{tag.nombre}</span>
                </button>
              );
            })}

            {currentCategoryTags.length === 0 && (
              <span className="text-[11px] text-stone-400 italic py-1">
                No hay etiquetas en esta categoría. Puedes añadirla pulsando "Editar etiquetas".
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
