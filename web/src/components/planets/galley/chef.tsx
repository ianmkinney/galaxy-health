"use client";

import { AiDock } from "@/components/ai-dock";
import { useGalaxy } from "@/components/galaxy-provider";
import { uid, type Recipe } from "@/lib/galaxy-types";
import { parseImportedRecipe } from "@/lib/galley-ops";

export function GalleyChef() {
  const { update } = useGalaxy();

  const saveParsed = async (text: string) => {
    const parsed = parseImportedRecipe(text);
    const recipe: Recipe = {
      id: uid(),
      title: parsed.title || "AI recipe",
      ingredients: parsed.ingredients || "",
      instructions: parsed.instructions || text,
      tags: parsed.tags || "ai",
      calories: parsed.calories,
      protein: parsed.protein,
      prep_minutes: parsed.prep_minutes,
      cooked_count: 0,
      created_at: Date.now(),
      source: "user",
    };
    await update((d) => {
      d.recipes.unshift(recipe);
      return d;
    });
  };

  return (
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
        onResult={saveParsed}
      />
      <div className="lg:col-span-2">
        <AiDock
          accent="#FF8A3D"
          title="Import recipe text"
          placeholder="Paste a recipe, blog dump, or URL notes…"
          action="galley.import_recipe"
          onResult={saveParsed}
        />
      </div>
    </div>
  );
}
