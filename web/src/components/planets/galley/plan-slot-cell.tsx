"use client";

import type { MealPlanSlot } from "@/lib/galaxy-types";

export function PlanSlotCell({
  day,
  slot,
  rows,
  onAssign,
  onRemove,
}: {
  day: string;
  slot: MealPlanSlot["slot"];
  rows: { id: string; title: string }[];
  onAssign: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <td className="p-1 align-top">
      <div className="min-h-[56px] w-full rounded-lg border border-white/10 bg-black/20 p-1.5 text-left">
        {rows.map((row) => (
          <div key={row.id} className="mb-1 flex items-start justify-between gap-1">
            <span className="text-white/80">{row.title}</span>
            <button
              type="button"
              aria-label={`Remove ${row.title}`}
              className="text-white/25 hover:text-rose-300"
              onClick={() => onRemove(row.id)}
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          aria-label={`Assign ${slot} on ${day}`}
          onClick={onAssign}
          className={
            rows.length === 0
              ? "flex min-h-[40px] w-full items-center text-white/25 hover:text-orange-200"
              : "mt-0.5 text-[10px] uppercase tracking-wider text-white/30 hover:text-orange-200"
          }
        >
          {rows.length === 0 ? "+" : "+ add"}
        </button>
      </div>
    </td>
  );
}
