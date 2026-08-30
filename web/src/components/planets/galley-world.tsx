"use client";

import { useMemo, useState } from "react";
import { PlanetHabitat } from "@/components/planets/planet-habitat";
import { AiDock } from "@/components/ai-dock";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { useGalaxy } from "@/components/galaxy-provider";
import { uid, type Recipe, type Signal } from "@/lib/galaxy-types";
import { round, todayKey } from "@/lib/utils";

const TABS = [
  { id: "fuel", label: "Fuel log" },
  { id: "recipes", label: "Recipe book" },
  { id: "pantry", label: "Pantry" },
  { id: "grocery", label: "Grocery" },
  { id: "plan", label: "Meal plan" },
  { id: "chef", label: "AI Chef" },
];

export function GalleyWorld() {
  const { store, update, planetName, totals, saving } = useGalaxy();
  const [tab, setTab] = useState("fuel");
  const day = todayKey();
  const meals = store.meals.filter((m) => m.logged_on === day);

  const [mealForm, setMealForm] = useState({
    name: "",
    slot: "lunch",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });
  const [recipeForm, setRecipeForm] = useState({
    title: "",
    ingredients: "",
    instructions: "",
    tags: "",
  });
  const [pantryForm, setPantryForm] = useState({
    name: "",
    quantity: "1",
    unit: "",
    location: "galley",
  });
  const [groceryForm, setGroceryForm] = useState({ name: "", quantity: "1", unit: "" });
  const [planForm, setPlanForm] = useState({
    slot: "dinner" as const,
    title: "",
  });

  const weekDays = useMemo(() => {
    const start = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }, []);

  const logMeal = async () => {
    const calories = Number(mealForm.calories) || 0;
    if (!mealForm.name.trim() || !calories) return;
    const meal = {
      id: uid(),
      name: mealForm.name.trim(),
      slot: mealForm.slot,
      calories,
      protein: Number(mealForm.protein) || 0,
      carbs: Number(mealForm.carbs) || 0,
      fat: Number(mealForm.fat) || 0,
      logged_on: day,
      created_at: Date.now(),
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
    setMealForm({ name: "", slot: "lunch", calories: "", protein: "", carbs: "", fat: "" });
  };

  const saveRecipe = async () => {
    if (!recipeForm.title.trim()) return;
    const recipe: Recipe = {
      id: uid(),
      title: recipeForm.title.trim(),
      ingredients: recipeForm.ingredients,
      instructions: recipeForm.instructions,
      tags: recipeForm.tags,
      created_at: Date.now(),
    };
    await update((d) => {
      d.recipes.unshift(recipe);
      return d;
    });
    setRecipeForm({ title: "", ingredients: "", instructions: "", tags: "" });
  };

  const parseRecipeFromAi = async (text: string) => {
    const title = text.match(/TITLE:\s*(.+)/i)?.[1]?.trim() || "AI recipe";
    const ingredients =
      text.match(/INGREDIENTS:\s*([\s\S]*?)(?=STEPS:|INSTRUCTIONS:|MACROS:|$)/i)?.[1]?.trim() ||
      "";
    const instructions =
      text.match(/(?:STEPS|INSTRUCTIONS):\s*([\s\S]*?)(?=MACROS:|$)/i)?.[1]?.trim() || text;
    await update((d) => {
      d.recipes.unshift({
        id: uid(),
        title,
        ingredients,
        instructions,
        tags: "ai",
        created_at: Date.now(),
      });
      return d;
    });
    setTab("recipes");
  };

  return (
    <PlanetHabitat
      id="galley"
      title={planetName("galley")}
      tabs={TABS}
      activeTab={tab}
      onTab={setTab}
    >
      {tab === "fuel" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <GlassPanel title="Fuel balance" accent="#FF8A3D" index={0}>
            <div className="grid grid-cols-3 gap-3">
              <Metric label="In" value={`${round(totals.galley.calories)} kcal`} />
              <Metric label="Burned" value={`${round(totals.atlas.burn)} kcal`} />
              <Metric
                label="Net"
                value={`${round(totals.galley.calories - totals.atlas.burn)} kcal`}
              />
            </div>
            <p className="mt-3 text-xs text-white/40">
              Protein {round(totals.galley.protein)}g · {totals.recipes} recipes · pantry{" "}
              {totals.pantry}
            </p>
          </GlassPanel>
          <GlassPanel title="Log meal" accent="#FF8A3D" index={1}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name" value={mealForm.name} onChange={(name) => setMealForm((f) => ({ ...f, name }))} />
              <Field label="Calories" value={mealForm.calories} onChange={(calories) => setMealForm((f) => ({ ...f, calories }))} />
              <Field label="Protein" value={mealForm.protein} onChange={(protein) => setMealForm((f) => ({ ...f, protein }))} />
              <Field label="Carbs" value={mealForm.carbs} onChange={(carbs) => setMealForm((f) => ({ ...f, carbs }))} />
              <Field label="Fat" value={mealForm.fat} onChange={(fat) => setMealForm((f) => ({ ...f, fat }))} />
            </div>
            <div className="mt-4">
              <ShimmerButton tone="#FF8A3D" disabled={saving} onClick={logMeal}>
                Log & transmit to Atlas
              </ShimmerButton>
            </div>
          </GlassPanel>
          <GlassPanel title="Today's manifest" meta={`${meals.length}`} accent="#FF8A3D" index={2} className="lg:col-span-2">
            {meals.length === 0 ? (
              <p className="text-sm text-white/45">No fuel logged yet.</p>
            ) : (
              <ul className="divide-y divide-white/5 text-sm">
                {meals.map((m) => (
                  <li key={m.id} className="flex justify-between py-2 text-white/85">
                    <span>{m.name}</span>
                    <span className="text-white/45">{round(m.calories)} kcal</span>
                  </li>
                ))}
              </ul>
            )}
          </GlassPanel>
        </div>
      ) : null}

      {tab === "recipes" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <GlassPanel title="Add recipe" accent="#FF8A3D" index={0}>
            <div className="space-y-3">
              <Field label="Title" value={recipeForm.title} onChange={(title) => setRecipeForm((f) => ({ ...f, title }))} />
              <Area label="Ingredients" value={recipeForm.ingredients} onChange={(ingredients) => setRecipeForm((f) => ({ ...f, ingredients }))} />
              <Area label="Instructions" value={recipeForm.instructions} onChange={(instructions) => setRecipeForm((f) => ({ ...f, instructions }))} />
              <Field label="Tags" value={recipeForm.tags} onChange={(tags) => setRecipeForm((f) => ({ ...f, tags }))} />
            </div>
            <div className="mt-4">
              <ShimmerButton tone="#FF8A3D" disabled={saving} onClick={saveRecipe}>
                Save to recipe book
              </ShimmerButton>
            </div>
          </GlassPanel>
          <GlassPanel title="Book" meta={`${store.recipes.length}`} accent="#FF8A3D" index={1}>
            {store.recipes.length === 0 ? (
              <p className="text-sm text-white/45">Empty — cook with AI Chef or add manually.</p>
            ) : (
              <ul className="max-h-[480px] space-y-3 overflow-y-auto text-sm">
                {store.recipes.map((r) => (
                  <li key={r.id} className="rounded-xl border border-white/10 bg-black/25 p-3">
                    <div className="font-semibold text-white">{r.title}</div>
                    <div className="mt-1 line-clamp-3 whitespace-pre-wrap text-white/50">
                      {r.ingredients || r.instructions}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </GlassPanel>
        </div>
      ) : null}

      {tab === "pantry" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <GlassPanel title="Stow item" accent="#FF8A3D" index={0}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name" value={pantryForm.name} onChange={(name) => setPantryForm((f) => ({ ...f, name }))} />
              <Field label="Qty" value={pantryForm.quantity} onChange={(quantity) => setPantryForm((f) => ({ ...f, quantity }))} />
              <Field label="Unit" value={pantryForm.unit} onChange={(unit) => setPantryForm((f) => ({ ...f, unit }))} />
              <Field label="Location" value={pantryForm.location} onChange={(location) => setPantryForm((f) => ({ ...f, location }))} />
            </div>
            <div className="mt-4">
              <ShimmerButton
                tone="#FF8A3D"
                disabled={saving}
                onClick={async () => {
                  if (!pantryForm.name.trim()) return;
                  await update((d) => {
                    d.pantry.unshift({
                      id: uid(),
                      name: pantryForm.name.trim(),
                      quantity: Number(pantryForm.quantity) || 1,
                      unit: pantryForm.unit,
                      location: pantryForm.location,
                      created_at: Date.now(),
                    });
                    return d;
                  });
                  setPantryForm({ name: "", quantity: "1", unit: "", location: "galley" });
                }}
              >
                Add to pantry
              </ShimmerButton>
            </div>
          </GlassPanel>
          <GlassPanel title="Inventory" meta={`${store.pantry.length}`} accent="#FF8A3D" index={1}>
            <ul className="space-y-2 text-sm text-white/80">
              {store.pantry.map((p) => (
                <li key={p.id} className="flex justify-between border-b border-white/5 py-2">
                  <span>{p.name}</span>
                  <span className="text-white/45">
                    {p.quantity}
                    {p.unit ? ` ${p.unit}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </GlassPanel>
        </div>
      ) : null}

      {tab === "grocery" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <GlassPanel title="Add grocery" accent="#FF8A3D" index={0}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Name" value={groceryForm.name} onChange={(name) => setGroceryForm((f) => ({ ...f, name }))} />
              <Field label="Qty" value={groceryForm.quantity} onChange={(quantity) => setGroceryForm((f) => ({ ...f, quantity }))} />
              <Field label="Unit" value={groceryForm.unit} onChange={(unit) => setGroceryForm((f) => ({ ...f, unit }))} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <ShimmerButton
                tone="#FF8A3D"
                onClick={async () => {
                  if (!groceryForm.name.trim()) return;
                  await update((d) => {
                    d.grocery.unshift({
                      id: uid(),
                      name: groceryForm.name.trim(),
                      quantity: Number(groceryForm.quantity) || 1,
                      unit: groceryForm.unit,
                      checked: false,
                      created_at: Date.now(),
                    });
                    return d;
                  });
                  setGroceryForm({ name: "", quantity: "1", unit: "" });
                }}
              >
                Add
              </ShimmerButton>
            </div>
          </GlassPanel>
          <AiDock
            accent="#FF8A3D"
            title="Smart grocery (AI)"
            placeholder="e.g. high-protein week, under $80…"
            action="galley.grocery_smart"
            onResult={async (text) => {
              const lines = text
                .split("\n")
                .map((l) => l.replace(/^[-*]\s*/, "").trim())
                .filter(Boolean)
                .slice(0, 30);
              await update((d) => {
                for (const line of lines) {
                  const [name, quantity, unit] = line.split("|").map((s) => s.trim());
                  if (!name) continue;
                  d.grocery.unshift({
                    id: uid(),
                    name,
                    quantity: Number(quantity) || 1,
                    unit: unit || "",
                    checked: false,
                    created_at: Date.now(),
                  });
                }
                return d;
              });
            }}
          />
          <GlassPanel title="List" meta={`${store.grocery.filter((g) => !g.checked).length} open`} accent="#FF8A3D" index={2} className="lg:col-span-2">
            <ul className="space-y-2 text-sm">
              {store.grocery.map((g) => (
                <li key={g.id} className="flex items-center gap-3 border-b border-white/5 py-2">
                  <input
                    type="checkbox"
                    checked={g.checked}
                    onChange={async (e) => {
                      const checked = e.target.checked;
                      await update((d) => {
                        const row = d.grocery.find((x) => x.id === g.id);
                        if (row) row.checked = checked;
                        return d;
                      });
                    }}
                  />
                  <span className={g.checked ? "text-white/35 line-through" : "text-white/85"}>
                    {g.name}{" "}
                    <span className="text-white/40">
                      {g.quantity}
                      {g.unit ? ` ${g.unit}` : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </GlassPanel>
        </div>
      ) : null}

      {tab === "plan" ? (
        <div className="grid gap-4">
          <GlassPanel title="Schedule a meal" accent="#FF8A3D" index={0}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Title" value={planForm.title} onChange={(title) => setPlanForm((f) => ({ ...f, title }))} />
              <label className="block text-xs text-white/50">
                Slot
                <select
                  value={planForm.slot}
                  onChange={(e) =>
                    setPlanForm((f) => ({
                      ...f,
                      slot: e.target.value as typeof planForm.slot,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
              </label>
            </div>
            <div className="mt-4">
              <ShimmerButton
                tone="#FF8A3D"
                onClick={async () => {
                  if (!planForm.title.trim()) return;
                  await update((d) => {
                    d.mealPlans.unshift({
                      id: uid(),
                      day,
                      slot: planForm.slot,
                      title: planForm.title.trim(),
                      created_at: Date.now(),
                    });
                    return d;
                  });
                  setPlanForm({ slot: "dinner", title: "" });
                }}
              >
                Add to today
              </ShimmerButton>
            </div>
          </GlassPanel>
          <GlassPanel title="Next 7 days" accent="#FF8A3D" index={1}>
            <div className="grid gap-3 md:grid-cols-2">
              {weekDays.map((d) => (
                <div key={d} className="rounded-xl border border-white/10 bg-black/25 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-orange-200/70">{d}</div>
                  <ul className="mt-2 space-y-1 text-sm text-white/75">
                    {store.mealPlans
                      .filter((p) => p.day === d)
                      .map((p) => (
                        <li key={p.id}>
                          <span className="text-white/40">{p.slot}</span> · {p.title}
                        </li>
                      ))}
                    {!store.mealPlans.some((p) => p.day === d) ? (
                      <li className="text-white/30">Open</li>
                    ) : null}
                  </ul>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>
      ) : null}

      {tab === "chef" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <AiDock
            accent="#FF8A3D"
            title="AI Chef chat"
            placeholder="What can I cook? How do I plate this? Macro swap?"
            action="galley.chef"
          />
          <AiDock
            accent="#FFB37A"
            title="Recipe from pantry"
            placeholder="Optional vibe: high protein, 20 min, spicy…"
            action="galley.pantry_recipe"
            onResult={parseRecipeFromAi}
          />
          <div className="lg:col-span-2">
            <AiDock
              accent="#FF8A3D"
              title="Import recipe text"
              placeholder="Paste a recipe or blog dump…"
              action="galley.import_recipe"
              onResult={parseRecipeFromAi}
            />
          </div>
        </div>
      ) : null}
    </PlanetHabitat>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-xs text-white/50">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-orange-300/40"
      />
    </label>
  );
}

function Area({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-xs text-white/50">
      {label}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-orange-300/40"
      />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-white/40">{label}</div>
      <div className="mt-1 font-semibold text-[#FFB37A]">{value}</div>
    </div>
  );
}
