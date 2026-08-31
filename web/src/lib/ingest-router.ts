import { uid, type GalaxyStore, type Meal, type Workout, type CheckIn, type Marker, type Recipe, type PantryItem, type GroceryItem, type MealPlanSlot, type Signal, type PlanetId } from "./galaxy-types";
import { todayKey } from "./utils";

export type DataSource = "user" | "test" | "agent";

export type IngestOp =
  | {
      type: "meal";
      name: string;
      slot?: string;
      calories: number;
      protein?: number;
      carbs?: number;
      fat?: number;
      day?: string;
    }
  | {
      type: "workout";
      name: string;
      modality?: string;
      minutes: number;
      intensity?: number;
      burn?: number;
      notes?: string;
      day?: string;
    }
  | {
      type: "checkin";
      mood?: number;
      focus?: number;
      sleep_hours?: number;
      note?: string;
      day?: string;
    }
  | {
      type: "marker";
      marker: string;
      value: number;
      unit?: string;
      ref_low?: number | null;
      ref_high?: number | null;
      panel?: string;
      notes?: string;
      day?: string;
    }
  | {
      type: "recipe";
      title: string;
      ingredients?: string;
      instructions?: string;
      tags?: string;
    }
  | {
      type: "pantry";
      name: string;
      quantity?: number;
      unit?: string;
      location?: string;
      expires_on?: string;
    }
  | {
      type: "grocery";
      name: string;
      quantity?: number;
      unit?: string;
    }
  | {
      type: "meal_plan";
      title: string;
      slot?: "breakfast" | "lunch" | "dinner" | "snack";
      day?: string;
    };

export type IngestPlan = {
  ops: IngestOp[];
  summary: string;
  planetsTouched: PlanetId[];
};

type Sourced = { source?: DataSource };

function withSource<T extends object>(row: T, source: DataSource): T & Sourced {
  return { ...row, source };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function applyIngestOps(
  store: GalaxyStore,
  ops: IngestOp[],
  source: DataSource = "agent"
): { store: GalaxyStore; applied: number; planetsTouched: PlanetId[] } {
  const next = structuredClone(store) as GalaxyStore & {
    meals: (Meal & Sourced)[];
    workouts: (Workout & Sourced)[];
    checkins: (CheckIn & Sourced)[];
    markers: (Marker & Sourced)[];
    recipes: (Recipe & Sourced)[];
    pantry: (PantryItem & Sourced)[];
    grocery: (GroceryItem & Sourced)[];
    mealPlans: (MealPlanSlot & Sourced)[];
    signals: (Signal & Sourced)[];
  };
  const planets = new Set<PlanetId>();
  let applied = 0;

  for (const op of ops) {
    const day = ("day" in op && op.day) || todayKey();
    if (op.type === "meal") {
      const meal = withSource(
        {
          id: uid(),
          name: op.name,
          slot: op.slot || "snack",
          calories: Number(op.calories) || 0,
          protein: Number(op.protein) || 0,
          carbs: Number(op.carbs) || 0,
          fat: Number(op.fat) || 0,
          logged_on: day,
          created_at: Date.now(),
        },
        source
      );
      next.meals.unshift(meal);
      next.signals.unshift(
        withSource(
          {
            id: uid(),
            from: "galley" as const,
            to: "atlas" as const,
            kind: "galley.macros.logged",
            payload: { name: meal.name, calories: meal.calories, protein: meal.protein },
            payload_ref: `meals:${meal.id}`,
            seen: false,
            delivered_at: null,
            created_at: Date.now(),
          },
          source
        )
      );
      planets.add("galley");
      planets.add("atlas");
      applied += 1;
    } else if (op.type === "workout") {
      const minutes = Number(op.minutes) || 0;
      const intensity = Number(op.intensity) || 3;
      const burn = Number(op.burn) || Math.round(minutes * (4 + intensity));
      const workout = withSource(
        {
          id: uid(),
          name: op.name,
          modality: op.modality || "mixed",
          minutes,
          intensity,
          burn,
          notes: op.notes,
          logged_on: day,
          created_at: Date.now(),
        },
        source
      );
      next.workouts.unshift(workout);
      next.signals.unshift(
        withSource(
          {
            id: uid(),
            from: "atlas" as const,
            to: "galley" as const,
            kind: "atlas.burn.logged",
            payload: { name: workout.name, burn, minutes },
            payload_ref: `workouts:${workout.id}`,
            seen: false,
            delivered_at: null,
            created_at: Date.now(),
          },
          source
        )
      );
      next.signals.unshift(
        withSource(
          {
            id: uid(),
            from: "atlas" as const,
            to: "lumen" as const,
            kind: "atlas.load.logged",
            payload: { name: workout.name, load: minutes * intensity },
            payload_ref: `workouts:${workout.id}`,
            seen: false,
            delivered_at: null,
            created_at: Date.now(),
          },
          source
        )
      );
      planets.add("atlas");
      planets.add("galley");
      planets.add("lumen");
      applied += 1;
    } else if (op.type === "checkin") {
      const checkin = withSource(
        {
          id: uid(),
          mood: clamp(Number(op.mood) || 3, 1, 5),
          focus: clamp(Number(op.focus) || 3, 1, 5),
          sleep_hours: Number(op.sleep_hours) || 0,
          note: op.note || "",
          logged_on: day,
          created_at: Date.now(),
        },
        source
      );
      next.checkins.unshift(checkin);
      const readiness =
        (checkin.mood + checkin.focus + Math.min(checkin.sleep_hours, 8) / 1.6) / 3;
      next.signals.unshift(
        withSource(
          {
            id: uid(),
            from: "lumen" as const,
            to: "atlas" as const,
            kind: "lumen.readiness.logged",
            payload: { readiness, sleepHours: checkin.sleep_hours },
            payload_ref: `checkins:${checkin.id}`,
            seen: false,
            delivered_at: null,
            created_at: Date.now(),
          },
          source
        )
      );
      planets.add("lumen");
      planets.add("atlas");
      applied += 1;
    } else if (op.type === "marker") {
      const marker = withSource(
        {
          id: uid(),
          marker: op.marker,
          value: Number(op.value),
          unit: op.unit || "",
          ref_low: op.ref_low ?? null,
          ref_high: op.ref_high ?? null,
          panel: op.panel || "General",
          notes: op.notes,
          collected_on: day,
          created_at: Date.now(),
        },
        source
      );
      next.markers.unshift(marker);
      next.signals.unshift(
        withSource(
          {
            id: uid(),
            from: "observatory" as const,
            to: "lumen" as const,
            kind: "observatory.marker.logged",
            payload: { marker: marker.marker },
            payload_ref: `markers:${marker.id}`,
            seen: false,
            delivered_at: null,
            created_at: Date.now(),
          },
          source
        )
      );
      planets.add("observatory");
      planets.add("lumen");
      applied += 1;
    } else if (op.type === "recipe") {
      next.recipes.unshift(
        withSource(
          {
            id: uid(),
            title: op.title,
            ingredients: op.ingredients || "",
            instructions: op.instructions || "",
            tags: op.tags || source,
            created_at: Date.now(),
          },
          source
        )
      );
      planets.add("galley");
      applied += 1;
    } else if (op.type === "pantry") {
      next.pantry.unshift(
        withSource(
          {
            id: uid(),
            name: op.name,
            quantity: Number(op.quantity) || 1,
            unit: op.unit || "",
            location: op.location || "galley",
            expires_on: op.expires_on,
            created_at: Date.now(),
          },
          source
        )
      );
      planets.add("galley");
      applied += 1;
    } else if (op.type === "grocery") {
      next.grocery.unshift(
        withSource(
          {
            id: uid(),
            name: op.name,
            quantity: Number(op.quantity) || 1,
            unit: op.unit || "",
            checked: false,
            created_at: Date.now(),
          },
          source
        )
      );
      planets.add("galley");
      applied += 1;
    } else if (op.type === "meal_plan") {
      next.mealPlans.unshift(
        withSource(
          {
            id: uid(),
            day,
            slot: op.slot || "dinner",
            title: op.title,
            created_at: Date.now(),
          },
          source
        )
      );
      planets.add("galley");
      applied += 1;
    }
  }

  next.updated_at = Date.now();
  return { store: next, applied, planetsTouched: [...planets] };
}

/** Fast heuristic router when AI is unavailable. */
export function heuristicRoute(text: string): IngestPlan {
  const ops: IngestOp[] = [];
  const lower = text.toLowerCase();
  const day = todayKey();

  const kcal = text.match(/(\d{2,4})\s*(kcal|calories|cal)\b/i);
  const protein = text.match(/(\d{1,3})\s*g?\s*protein/i);
  const mealWords =
    /(ate|eaten|breakfast|lunch|dinner|snack|meal|eggs|salad|chicken|oats|smoothie)/i;
  if (mealWords.test(lower) || kcal) {
    const nameMatch = text.match(/(?:ate|had|logged)\s+([^.,;]+)/i);
    ops.push({
      type: "meal",
      name: (nameMatch?.[1] || "Logged meal").trim().slice(0, 80),
      slot: /breakfast/i.test(lower)
        ? "breakfast"
        : /lunch/i.test(lower)
          ? "lunch"
          : /dinner/i.test(lower)
            ? "dinner"
            : "snack",
      calories: kcal ? Number(kcal[1]) : 450,
      protein: protein ? Number(protein[1]) : 25,
      day,
    });
  }

  const minutes = text.match(/(\d{1,3})\s*(min|minutes|mins)\b/i);
  const workoutWords = /(ran|run|jog|lift|gym|workout|walked|cycle|bike|swim|yoga|train)/i;
  if (workoutWords.test(lower) || (minutes && /(run|walk|lift|gym|train)/i.test(lower))) {
    ops.push({
      type: "workout",
      name: text.slice(0, 60).replace(/\s+/g, " ").trim() || "Session",
      modality: /run|jog/i.test(lower)
        ? "cardio"
        : /yoga/i.test(lower)
          ? "mobility"
          : /walk/i.test(lower)
            ? "walk"
            : "strength",
      minutes: minutes ? Number(minutes[1]) : 30,
      intensity: /hard|intense|heavy/i.test(lower) ? 4 : 3,
      day,
    });
  }

  const sleep =
    text.match(/slept\s+(\d+(?:\.\d+)?)\s*h/i) ||
    text.match(/(\d+(?:\.\d+)?)\s*h(?:ours)?\s*sleep/i);
  const moodWords = /(mood|focus|tired|wired|anxious|calm|stressed|recovered|sleep)/i;
  if (sleep || moodWords.test(lower)) {
    ops.push({
      type: "checkin",
      mood: /anxious|stressed|tired/i.test(lower) ? 2 : /calm|great|good/i.test(lower) ? 4 : 3,
      focus: /focus(ed)?|clear/i.test(lower) ? 4 : 3,
      sleep_hours: sleep ? Number(sleep[1]) : 7,
      note: text.slice(0, 160),
      day,
    });
  }

  const lab = text.match(
    /\b([A-Za-z][A-Za-z0-9 \-]{1,30}?)\s*[:=]\s*(\d+(?:\.\d+)?)\s*([a-zA-Z\/%μ]+)?/
  );
  if (/lab|assay|ldl|hdl|a1c|glucose|ferritin|vitamin|marker|panel/i.test(lower) && lab) {
    ops.push({
      type: "marker",
      marker: lab[1].trim(),
      value: Number(lab[2]),
      unit: lab[3] || "",
      day,
    });
  }

  if (/buy|need to get|grocery|shopping/i.test(lower)) {
    const item = text.match(/(?:buy|get|need)\s+([^.,;]+)/i)?.[1];
    if (item) ops.push({ type: "grocery", name: item.trim().slice(0, 60), quantity: 1 });
  }

  const planetsTouched = [
    ...new Set(
      ops.flatMap((op): PlanetId[] => {
        if (
          op.type === "meal" ||
          op.type === "recipe" ||
          op.type === "pantry" ||
          op.type === "grocery" ||
          op.type === "meal_plan"
        )
          return ["galley"];
        if (op.type === "workout") return ["atlas"];
        if (op.type === "checkin") return ["lumen"];
        if (op.type === "marker") return ["observatory"];
        return [];
      })
    ),
  ];

  return {
    ops,
    summary:
      ops.length > 0
        ? `Routed ${ops.length} update(s) via heuristics to ${planetsTouched.join(", ") || "none"}.`
        : "Could not map that text to a planet update. Try including a meal, workout, sleep, or lab value.",
    planetsTouched,
  };
}

export function stripCodeFences(text: string) {
  let cleaned = (text || "").trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "");
  }
  return cleaned.trim();
}
