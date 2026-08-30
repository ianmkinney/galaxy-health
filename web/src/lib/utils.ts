import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function round(value: number, digits = 0) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

export function addDays(day: string, n: number) {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Monday-start week containing `day`. */
export function startOfWeek(day = todayKey()) {
  const d = new Date(`${day}T12:00:00`);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return d.toISOString().slice(0, 10);
}

export function weekDates(start: string) {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function weekdayLabel(day: string) {
  return new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" });
}
