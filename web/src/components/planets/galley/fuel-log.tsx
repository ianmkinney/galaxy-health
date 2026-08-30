"use client";

import { useState } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Field, Metric } from "@/components/ui/fields";
import { useGalaxy } from "@/components/galaxy-provider";
import { uid, type Signal } from "@/lib/galaxy-types";
import { relativeDay } from "@/lib/planet-ops";
import { round, todayKey } from "@/lib/utils";

export function GalleyFuelLog() {
  const { store, update, totals, saving } = useGalaxy();
  const day = todayKey();
  const meals = store.meals.filter((m) => m.logged_on === day);
  const history = store.meals.slice(0, 24);
  const [form, setForm] = useState({
    name: "",
    slot: "lunch",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });

  const logMeal = async () => {
    const calories = Number(form.calories) || 0;
    if (!form.name.trim() || !calories) return;
    const meal = {
      id: uid(),
      name: form.name.trim(),
      slot: form.slot,
      calories,
      protein: Number(form.protein) || 0,
      carbs: Number(form.carbs) || 0,
      fat: Number(form.fat) || 0,
      logged_on: day,
      created_at: Date.now(),
      source: "user" as const,
    };
    const signal: Signal = {
      id: uid(),
      from: "galley",
      to: "atlas",
      kind: "galley.macros.logged",
      payload: { name: meal.name, calories: meal.calories, protein: meal.protein },
      payload_ref: `meals:${meal.id}`,
      seen: false,
      delivered_at: null,
      created_at: Date.now(),
    };
    await update((d) => {
      d.meals.unshift(meal);
      d.signals.unshift(signal);
      return d;
    });
    setForm({ name: "", slot: "lunch", calories: "", protein: "", carbs: "", fat: "" });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <GlassPanel title="Fuel balance" accent="#FF8A3D" index={0}>
        <div className="grid grid-cols-3 gap-3">
          <Metric label="In" value={`${round(totals.galley.calories)} kcal`} tone="#FFB37A" />
          <Metric label="Burned" value={`${round(totals.atlas.burn)} kcal`} tone="#FFB37A" />
          <Metric
            label="Net"
            value={`${round(totals.galley.calories - totals.atlas.burn)} kcal`}
            tone="#FFB37A"
          />
        </div>
        <p className="mt-3 text-xs text-white/40">
          Protein {round(totals.galley.protein)}g · {totals.recipes} recipes · pantry {totals.pantry}
        </p>
      </GlassPanel>
      <GlassPanel title="Log meal" accent="#FF8A3D" index={1}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field accent="orange" label="Name" value={form.name} onChange={(name) => setForm((f) => ({ ...f, name }))} />
          <label className="block text-xs text-white/50">
            Slot
            <select
              value={form.slot}
              onChange={(e) => setForm((f) => ({ ...f, slot: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            >
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>
          </label>
          <Field accent="orange" label="Calories" value={form.calories} onChange={(calories) => setForm((f) => ({ ...f, calories }))} />
          <Field accent="orange" label="Protein" value={form.protein} onChange={(protein) => setForm((f) => ({ ...f, protein }))} />
          <Field accent="orange" label="Carbs" value={form.carbs} onChange={(carbs) => setForm((f) => ({ ...f, carbs }))} />
          <Field accent="orange" label="Fat" value={form.fat} onChange={(fat) => setForm((f) => ({ ...f, fat }))} />
        </div>
        <div className="mt-4">
          <ShimmerButton tone="#FF8A3D" disabled={saving} onClick={logMeal}>
            Log & transmit to Atlas
          </ShimmerButton>
        </div>
      </GlassPanel>
      <GlassPanel title="Today's manifest" meta={`${meals.length}`} accent="#FF8A3D" index={2}>
        {meals.length === 0 ? (
          <p className="text-sm text-white/45">No fuel logged yet.</p>
        ) : (
          <ul className="divide-y divide-white/5 text-sm">
            {meals.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2 text-white/85">
                <span>
                  {m.name} <span className="text-white/35">· {m.slot}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-white/45">{round(m.calories)} kcal</span>
                  <button
                    type="button"
                    className="text-[10px] uppercase tracking-wider text-white/30 hover:text-rose-300"
                    onClick={() => update((d) => ({ ...d, meals: d.meals.filter((x) => x.id !== m.id) }))}
                  >
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </GlassPanel>
      <GlassPanel title="Recent fuel" meta={`${history.length}`} accent="#FF8A3D" index={3}>
        <ul className="max-h-72 space-y-1 overflow-y-auto text-sm">
          {history.map((m) => (
            <li key={m.id} className="flex justify-between border-b border-white/5 py-1.5 text-white/75">
              <span className="truncate pr-3">{m.name}</span>
              <span className="shrink-0 text-white/40">
                {relativeDay(m.logged_on)} · {round(m.calories)}
              </span>
            </li>
          ))}
          {history.length === 0 ? <li className="text-white/40">Empty ledger.</li> : null}
        </ul>
      </GlassPanel>
    </div>
  );
}
