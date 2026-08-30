"use client";

import { useMemo, useState } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Area, Field } from "@/components/ui/fields";
import { useGalaxy } from "@/components/galaxy-provider";
import { uid, type Recipe, type Signal } from "@/lib/galaxy-types";
import { parseImportedRecipe, recipeMatchesPantry, searchRecipes } from "@/lib/galley-ops";
import { round, todayKey } from "@/lib/utils";

export function GalleyRecipeBook() {
  const { store, update, saving } = useGalaxy();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "cooked" | "uncooked">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    ingredients: "",
    instructions: "",
    tags: "",
    calories: "",
    protein: "",
    prep: "",
    servings: "2",
  });

  const recipes = useMemo(
    () => searchRecipes(store.recipes, query, filter),
    [store.recipes, query, filter]
  );
  const selected = store.recipes.find((r) => r.id === openId) ?? null;

  const saveRecipe = async () => {
    if (!form.title.trim()) return;
    const recipe: Recipe = {
      id: uid(),
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      ingredients: form.ingredients,
      instructions: form.instructions,
      tags: form.tags,
      calories: Number(form.calories) || undefined,
      protein: Number(form.protein) || undefined,
      prep_minutes: Number(form.prep) || undefined,
      servings: Number(form.servings) || undefined,
      cooked_count: 0,
      created_at: Date.now(),
      source: "user",
    };
    await update((d) => {
      d.recipes.unshift(recipe);
      return d;
    });
    setForm({
      title: "",
      description: "",
      ingredients: "",
      instructions: "",
      tags: "",
      calories: "",
      protein: "",
      prep: "",
      servings: "2",
    });
    setOpenId(recipe.id);
  };

  const cook = async (recipe: Recipe) => {
    const day = todayKey();
    const calories = recipe.calories || 450;
    const meal = {
      id: uid(),
      name: recipe.title,
      slot: "dinner",
      calories,
      protein: recipe.protein || 0,
      carbs: recipe.carbs || 0,
      fat: recipe.fat || 0,
      recipe_id: recipe.id,
      logged_on: day,
      created_at: Date.now(),
      source: "user" as const,
    };
    const signal: Signal = {
      id: uid(),
      from: "galley",
      to: "atlas",
      kind: "galley.macros.logged",
      payload: { name: meal.name, calories, cooked: true },
      payload_ref: `meals:${meal.id}`,
      seen: false,
      delivered_at: null,
      created_at: Date.now(),
    };
    await update((d) => {
      d.meals.unshift(meal);
      const row = d.recipes.find((r) => r.id === recipe.id);
      if (row) {
        row.cooked_count = (row.cooked_count ?? 0) + 1;
        row.last_cooked_on = day;
      }
      d.signals.unshift(signal);
      return d;
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <GlassPanel title="Add recipe" accent="#FF8A3D" index={0}>
        <div className="space-y-3">
          <Field accent="orange" label="Title" value={form.title} onChange={(title) => setForm((f) => ({ ...f, title }))} />
          <Field
            accent="orange"
            label="Description"
            value={form.description}
            onChange={(description) => setForm((f) => ({ ...f, description }))}
          />
          <Area
            accent="orange"
            label="Ingredients (one per line)"
            value={form.ingredients}
            onChange={(ingredients) => setForm((f) => ({ ...f, ingredients }))}
          />
          <Area
            accent="orange"
            label="Instructions"
            value={form.instructions}
            onChange={(instructions) => setForm((f) => ({ ...f, instructions }))}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field accent="orange" label="Tags" value={form.tags} onChange={(tags) => setForm((f) => ({ ...f, tags }))} />
            <Field accent="orange" label="kcal" value={form.calories} onChange={(calories) => setForm((f) => ({ ...f, calories }))} />
            <Field accent="orange" label="Protein" value={form.protein} onChange={(protein) => setForm((f) => ({ ...f, protein }))} />
            <Field accent="orange" label="Minutes" value={form.prep} onChange={(prep) => setForm((f) => ({ ...f, prep }))} />
          </div>
        </div>
        <div className="mt-4">
          <ShimmerButton tone="#FF8A3D" disabled={saving} onClick={saveRecipe}>
            Save to recipe book
          </ShimmerButton>
        </div>
      </GlassPanel>

      <GlassPanel title="Book" meta={`${recipes.length}/${store.recipes.length}`} accent="#FF8A3D" index={1}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title, ingredient, tag…"
          className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-orange-300/40"
        />
        <div className="mt-2 flex gap-2">
          {(["all", "cooked", "uncooked"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-wider ${
                filter === id ? "border-orange-300/50 bg-orange-300/15 text-orange-100" : "border-white/10 text-white/45"
              }`}
            >
              {id}
            </button>
          ))}
        </div>
        <ul className="mt-3 max-h-[420px] space-y-2 overflow-y-auto">
          {recipes.map((r) => {
            const match = recipeMatchesPantry(r, store.pantry);
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(r.id === openId ? null : r.id)}
                  className="w-full rounded-xl border border-white/10 bg-black/25 p-3 text-left hover:border-orange-300/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-white">{r.title}</div>
                    {(r.cooked_count ?? 0) > 0 ? (
                      <span className="text-[10px] uppercase tracking-wider text-emerald-300/80">
                        cooked {r.cooked_count}×
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-[11px] text-white/40">
                    {r.prep_minutes ? `${r.prep_minutes} min · ` : ""}
                    {r.calories ? `${round(r.calories)} kcal · ` : ""}
                    {match > 0 ? `${Math.round(match * 100)}% pantry match` : r.tags || "untagged"}
                  </div>
                </button>
              </li>
            );
          })}
          {recipes.length === 0 ? (
            <li className="text-sm text-white/45">Empty — cook with AI Chef or add manually.</li>
          ) : null}
        </ul>
      </GlassPanel>

      {selected ? (
        <GlassPanel title={selected.title} accent="#FF8A3D" index={2} className="lg:col-span-2">
          {selected.description ? <p className="text-sm text-white/60">{selected.description}</p> : null}
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-white/40">Ingredients</div>
              <pre className="mt-1 whitespace-pre-wrap text-sm text-white/75">{selected.ingredients || "—"}</pre>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-white/40">Steps</div>
              <pre className="mt-1 whitespace-pre-wrap text-sm text-white/75">{selected.instructions || "—"}</pre>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <ShimmerButton tone="#FF8A3D" disabled={saving} onClick={() => cook(selected)}>
              Cook tonight (logs fuel)
            </ShimmerButton>
            <ShimmerButton
              tone="#FF8A3D"
              variant="ghost"
              onClick={() =>
                update((d) => ({
                  ...d,
                  recipes: d.recipes.filter((r) => r.id !== selected.id),
                }))
              }
            >
              Delete
            </ShimmerButton>
          </div>
        </GlassPanel>
      ) : null}
    </div>
  );
}

export { parseImportedRecipe };
