import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Map common recurring event titles (or keywords) to specific colors.
export function getColorForTitle(title?: string): string | undefined {
  if (!title) return undefined;
  const t = title.toLowerCase();

  // Exact or keyword matches
  if (t.includes("lunch")) return "#5a3f2b"; // dark brown
  if (t.includes("team meeting") || t.includes("meeting/check") || t.includes("team meeting/check")) return "#fbbc04"; // yellow
  if (t.includes("application") || t.includes("application submissions")) return "#a87b58"; // medium brown
  if (t.includes("other (specify") || t.includes("other (specify in notes") || t.includes("other (specify")) return "#d63384"; // pink/magenta
  if (t.includes("daily night slot")) return "#6f42c1"; // purple
  if (t.includes("existing client") || t.includes("existing client consults")) return "#1a73e8"; // blue
  if (t.includes("new client") || t.includes("new clients")) return "#1a73e8"; // blue

  return undefined;
}

export function getBrowserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
