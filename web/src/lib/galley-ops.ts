import type { GalaxyStore, GroceryItem, MealPlanSlot, PantryItem, Recipe } from "./galaxy-types";
import { uid } from "./galaxy-types";
import { todayKey } from "./utils";

export const AISLES = [
  "Produce",
  "Meat & Seafood",
  "Dairy & Eggs",
  "Bakery",
  "Pantry & Canned",
  "Frozen",
  "Beverages",
  "Snacks",
  "Other",
] as const;

export type Aisle = (typeof AISLES)[number];

const AISLE_KEYWORDS: Record<Exclude<Aisle, "Other">, string[]> = {
  Produce: [
    "lettuce",
    "tomato",
    "onion",
    "garlic",
    "potato",
    "carrot",
    "celery",
    "pepper",
    "apple",
    "banana",
    "orange",
    "lemon",
    "lime",
    "spinach",
    "kale",
    "broccoli",
    "berry",
    "berries",
    "avocado",
    "cucumber",
    "herb",
    "cilantro",
    "basil",
  ],
  "Meat & Seafood": [
    "chicken",
    "beef",
    "pork",
    "turkey",
    "fish",
    "salmon",
    "tuna",
    "shrimp",
    "steak",
    "ground",
  ],
  "Dairy & Eggs": ["milk", "cheese", "yogurt", "butter", "cream", "egg", "kefir"],
  Bakery: ["bread", "bun", "roll", "bagel", "tortilla", "pita"],
  "Pantry & Canned": [
    "rice",
    "pasta",
    "flour",
    "sugar",
    "salt",
    "oil",
    "vinegar",
    "sauce",
    "beans",
    "oat",
    "lentil",
    "stock",
    "spice",
  ],
  Frozen: ["frozen", "ice cream"],
  Beverages: ["water", "juice", "soda", "coffee", "tea"],
  Snacks: ["chips", "crackers", "cookies", "candy", "nuts"],
};

export function aisleForName(name: string): Aisle {
  const lower = name.toLowerCase();
  for (const [aisle, words] of Object.entries(AISLE_KEYWORDS) as [Exclude<Aisle, "Other">, string[]][]) {
    if (words.some((w) => lower.includes(w))) return aisle;
  }
  return "Other";
}

export function parseIngredientLines(text: string) {
  return text
    .split(/\n+/)
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^([\d./]+)\s*([a-zA-Z%]+)?\s+(.+)$/);
      if (m) return { quantity: m[1], unit: m[2] || "", name: m[3].trim() };
      return { quantity: "", unit: "", name: line };
    });
}

export function searchRecipes(recipes: Recipe[], query: string, filter: "all" | "cooked" | "uncooked") {
  const q = query.trim().toLowerCase();
  return recipes.filter((r) => {
    const cooked = (r.cooked_count ?? 0) > 0;
    if (filter === "cooked" && !cooked) return false;
    if (filter === "uncooked" && cooked) return false;
    if (!q) return true;
    const hay = `${r.title} ${r.description ?? ""} ${r.ingredients} ${r.tags} ${r.cuisine ?? ""}`.toLowerCase();
    return hay.includes(q);
  });
}

export function recipeMatchesPantry(recipe: Recipe, pantry: PantryItem[]) {
  const names = pantry.map((p) => p.name.toLowerCase());
  const lines = parseIngredientLines(recipe.ingredients);
  if (!lines.length) return 0;
  let hit = 0;
  for (const line of lines) {
    if (names.some((n) => n.includes(line.name.toLowerCase().slice(0, 12)) || line.name.toLowerCase().includes(n))) {
      hit += 1;
    }
  }
  return hit / lines.length;
}

const EXPIRY_SOON_DAYS = 7;

export function pantryStatus(item: PantryItem, day = todayKey()) {
  if (!item.expires_on) return "ok" as const;
  if (item.expires_on < day) return "expired" as const;
  const soon = new Date(day + "T12:00:00");
  soon.setDate(soon.getDate() + EXPIRY_SOON_DAYS);
  const until = soon.toISOString().slice(0, 10);
  if (item.expires_on <= until) return "soon" as const;
  return "ok" as const;
}

export function groceryFromMealPlans(
  store: GalaxyStore,
  startDay: string,
  endDay: string
): Omit<GroceryItem, "id" | "created_at">[] {
  const plans = store.mealPlans.filter((p) => p.day >= startDay && p.day <= endDay);
  const map = new Map<
    string,
    { name: string; quantity: number; unit: string; recipes: string[]; recipe_id?: string }
  >();

  const bump = (name: string, quantity: number, unit: string, recipeTitle?: string, recipeId?: string) => {
    const key = name.toLowerCase();
    const existing = map.get(key);
    if (existing) {
      existing.quantity += quantity || 1;
      if (recipeTitle && !existing.recipes.includes(recipeTitle)) existing.recipes.push(recipeTitle);
    } else {
      map.set(key, {
        name,
        quantity: quantity || 1,
        unit,
        recipes: recipeTitle ? [recipeTitle] : [],
        recipe_id: recipeId,
      });
    }
  };

  for (const plan of plans) {
    const recipe = plan.recipe_id ? store.recipes.find((r) => r.id === plan.recipe_id) : undefined;
    if (recipe) {
      for (const line of parseIngredientLines(recipe.ingredients)) {
        bump(line.name, Number(line.quantity) || 1, line.unit, recipe.title, recipe.id);
      }
    } else if (plan.title.trim()) {
      bump(plan.title.trim(), plan.servings || 1, "", plan.title);
    }
  }

  const pantryNames = store.pantry.map((p) => p.name.toLowerCase());
  const rows: Omit<GroceryItem, "id" | "created_at">[] = [];
  for (const item of map.values()) {
    const covered = pantryNames.some(
      (n) => n.includes(item.name.toLowerCase().slice(0, 10)) || item.name.toLowerCase().includes(n)
    );
    if (covered) continue;
    rows.push({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      checked: false,
      category: aisleForName(item.name),
      recipe_id: item.recipe_id,
      recipe_name: item.recipes.join(", ") || undefined,
    });
  }
  return rows;
}

export function mergeGroceryIntoStore(store: GalaxyStore, incoming: Omit<GroceryItem, "id" | "created_at">[]) {
  const open = store.grocery.filter((g) => !g.checked).map((g) => g.name.toLowerCase());
  let added = 0;
  for (const row of incoming) {
    if (open.includes(row.name.toLowerCase())) continue;
    store.grocery.unshift({ ...row, id: uid(), created_at: Date.now() });
    added += 1;
  }
  return added;
}

export function groupGroceryByAisle(items: GroceryItem[]) {
  const groups: Record<Aisle, GroceryItem[]> = {
    Produce: [],
    "Meat & Seafood": [],
    "Dairy & Eggs": [],
    Bakery: [],
    "Pantry & Canned": [],
    Frozen: [],
    Beverages: [],
    Snacks: [],
    Other: [],
  };
  for (const item of items) {
    const aisle = (item.category as Aisle) || aisleForName(item.name);
    (groups[aisle] ?? groups.Other).push(item);
  }
  return groups;
}

export function formatGroceryClipboard(items: GroceryItem[]) {
  const open = items.filter((g) => !g.checked);
  const groups = groupGroceryByAisle(open);
  const lines = ["Grocery list", "================"];
  for (const aisle of AISLES) {
    const rows = groups[aisle];
    if (!rows.length) continue;
    lines.push("", aisle);
    for (const row of rows) {
      lines.push(
        `- ${row.quantity}${row.unit ? ` ${row.unit}` : ""} ${row.name}${
          row.recipe_name ? ` (${row.recipe_name})` : ""
        }`
      );
    }
  }
  return lines.join("\n");
}

export function parseImportedRecipe(text: string): Partial<Recipe> {
  const title = text.match(/TITLE:\s*(.+)/i)?.[1]?.trim() || "Imported recipe";
  const ingredients =
    text.match(/INGREDIENTS:\s*([\s\S]*?)(?=STEPS:|INSTRUCTIONS:|MACROS:|TIME:|$)/i)?.[1]?.trim() || "";
  const instructions =
    text.match(/(?:STEPS|INSTRUCTIONS):\s*([\s\S]*?)(?=MACROS:|TIME:|$)/i)?.[1]?.trim() || text;
  const time = Number(text.match(/TIME:\s*(\d+)/i)?.[1]) || undefined;
  const kcal = Number(text.match(/(\d+)\s*kcal/i)?.[1]) || undefined;
  const protein = Number(text.match(/(\d+)\s*g?\s*protein/i)?.[1]) || undefined;
  return {
    title,
    ingredients,
    instructions,
    prep_minutes: time,
    calories: kcal,
    protein,
    tags: "imported",
  };
}

export function weekBounds(start: string) {
  const endDate = new Date(start + "T12:00:00");
  endDate.setDate(endDate.getDate() + 6);
  return { start, end: endDate.toISOString().slice(0, 10) };
}

export function planForSlot(plans: MealPlanSlot[], day: string, slot: MealPlanSlot["slot"]) {
  return plans.filter((p) => p.day === day && p.slot === slot);
}
