import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Convert an ISO date string to a human-readable relative date. */
export function relativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/** Generate a color class based on a profile label for visual variety. */
export function profileColor(label: string): string {
  const colors = [
    "from-emerald-500/20 to-teal-500/10 border-emerald-500/30",
    "from-blue-500/20 to-indigo-500/10 border-blue-500/30",
    "from-violet-500/20 to-purple-500/10 border-violet-500/30",
    "from-amber-500/20 to-orange-500/10 border-amber-500/30",
    "from-pink-500/20 to-rose-500/10 border-pink-500/30",
    "from-cyan-500/20 to-sky-500/10 border-cyan-500/30",
  ];
  const idx = label.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
  return colors[idx];
}

/** Accent dot color for a profile. */
export function profileDotColor(label: string): string {
  const colors = [
    "bg-emerald-400",
    "bg-blue-400",
    "bg-violet-400",
    "bg-amber-400",
    "bg-pink-400",
    "bg-cyan-400",
  ];
  const idx = label.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
  return colors[idx];
}
