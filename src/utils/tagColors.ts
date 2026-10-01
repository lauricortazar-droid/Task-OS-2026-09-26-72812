export interface TagColorStyle {
  bg: string;
  text: string;
  border: string;
  badge: string;
}

export const TAG_COLOR_OPTIONS = [
  { value: "rose", label: "Rojo / Urgente" },
  { value: "amber", label: "Ámbar / Importante" },
  { value: "blue", label: "Azul / Pendiente" },
  { value: "purple", label: "Morado / Delegado" },
  { value: "cyan", label: "Cyan / Tiburón" },
  { value: "orange", label: "Naranja / Gladiadores" },
  { value: "emerald", label: "Verde / Águilas" },
  { value: "indigo", label: "Índigo / Centro" },
  { value: "pink", label: "Rosa / Diseño" },
  { value: "violet", label: "Violeta / Tecnología" },
  { value: "teal", label: "Turquesa / Coordinación" },
  { value: "stone", label: "Gris / Neutral" },
];

export function getTagColorClass(color: string = "stone"): string {
  switch (color) {
    case "rose":
      return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60";
    case "amber":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60";
    case "blue":
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60";
    case "purple":
      return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60";
    case "cyan":
      return "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/60";
    case "orange":
      return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/60";
    case "emerald":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60";
    case "indigo":
      return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60";
    case "pink":
      return "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800/60";
    case "violet":
      return "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800/60";
    case "teal":
      return "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/60";
    case "stone":
    default:
      return "bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700";
  }
}
