"use client";

import { useState } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Field } from "@/components/ui/fields";
import { useGalaxy } from "@/components/galaxy-provider";
import { uid, type MealPlanSlot } from "@/lib/galaxy-types";
import { planForSlot } from "@/lib/galley-ops";
import { addDays, startOfWeek, todayKey, weekdayLabel, weekDates } from "@/lib/utils";
import { PlanSlotCell } from "@/components/planets/galley/plan-slot-cell";

const SLOTS: MealPlanSlot["slot"][] = ["breakfast", "lunch", "dinner", "snack"];

export function GalleyMealPlan() {
  const { store, update, saving } = useGalaxy();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(todayKey()));
  const days = weekDates(weekStart);
  const [pick, setPick] = useState<{ day: string; slot: MealPlanSlot["slot"] } | null>(null);
  const [title, setTitle] = useState("");
  const [recipeId, setRecipeId] = useState("");

  const assign = async () => {
    if (!pick) return;
    const recipe = store.recipes.find((r) => r.id === recipeId);
    const label = recipe?.title || title.trim();
    if (!label) return;
    await update((d) => {
      d.mealPlans.unshift({
        id: uid(),
        day: pick.day,
        slot: pick.slot,
        title: label,
        recipe_id: recipe?.id,
        servings: recipe?.servings,
        created_at: Date.now(),
        source: "user",
      });
      return d;
    });
    setTitle("");
    setRecipeId("");
    setPick(null);
  };

  return (
    <div className="grid gap-4">
      <GlassPanel title="Week grid" accent="#FF8A3D" index={0}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <ShimmerButton tone="#FF8A3D" variant="ghost" onClick={() => setWeekStart(addDays(weekStart, -7))}>
              ← Prev
            </ShimmerButton>
            <ShimmerButton tone="#FF8A3D" variant="ghost" onClick={() => setWeekStart(addDays(weekStart, 7))}>
              Next →
            </ShimmerButton>
          </div>
          <div className="text-xs text-white/45">
            {weekStart} → {days[6]}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-xs">
            <thead>
              <tr>
                <th className="p-2 text-white/35">Slot</th>
                {days.map((day) => (
                  <th key={day} className="p-2 text-white/55">
                    <div>{weekdayLabel(day)}</div>
                    <div className="text-[10px] text-white/30">{day.slice(5)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SLOTS.map((slot) => (
                <tr key={slot} className="border-t border-white/10">
                  <td className="p-2 capitalize text-orange-200/70">{slot}</td>
                  {days.map((day) => (
                    <PlanSlotCell
                      key={day}
                      day={day}
                      slot={slot}
                      rows={planForSlot(store.mealPlans, day, slot)}
                      onAssign={() => setPick({ day, slot })}
                      onRemove={(id) =>
                        update((d) => ({
                          ...d,
                          mealPlans: d.mealPlans.filter((p) => p.id !== id),
                        }))
                      }
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassPanel>

      {pick ? (
        <GlassPanel title={`Assign ${pick.slot} · ${pick.day}`} accent="#FF8A3D" index={1}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-white/50">
              From recipe book
              <select
                value={recipeId}
                onChange={(e) => setRecipeId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
              >
                <option value="">Free text instead</option>
                {store.recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </label>
            <Field
              accent="orange"
              label="Or title"
              value={title}
              onChange={setTitle}
            />
          </div>
          <div className="mt-4 flex gap-2">
            <ShimmerButton tone="#FF8A3D" disabled={saving} onClick={assign}>
              Place on grid
            </ShimmerButton>
            <ShimmerButton tone="#FF8A3D" variant="ghost" onClick={() => setPick(null)}>
              Cancel
            </ShimmerButton>
          </div>
        </GlassPanel>
      ) : null}
    </div>
  );
}
