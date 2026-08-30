import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { loadGalaxyStore } from "@/lib/drive-store";
import { generateText } from "@/lib/ai-client";
import { totalsForDay, type PlanetId } from "@/lib/galaxy-types";
import { todayKey } from "@/lib/utils";

type Body = {
  action:
    | "galley.chef"
    | "galley.pantry_recipe"
    | "galley.import_recipe"
    | "galley.grocery_smart"
    | "atlas.coach"
    | "atlas.program"
    | "lumen.coach"
    | "observatory.interpret"
    | "bridge.synthesize";
  message?: string;
  extra?: Record<string, unknown>;
};

function buildContext(store: Awaited<ReturnType<typeof loadGalaxyStore>>, planet?: PlanetId) {
  const day = todayKey();
  const totals = totalsForDay(store, day);
  const lines = [
    `Day ${day}`,
    `Fuel: ${totals.galley.calories} kcal, ${totals.galley.protein}g protein (${totals.galley.entries} meals)`,
    `Load: ${totals.atlas.minutes} min, ${totals.atlas.burn} kcal burned`,
    `Mind: mood ${totals.lumen.entries ? totals.lumen.mood.toFixed(1) : "—"}, focus ${totals.lumen.entries ? totals.lumen.focus.toFixed(1) : "—"}, sleep ${totals.lumen.entries ? totals.lumen.sleep.toFixed(1) : "—"}h`,
    `Recipes ${store.recipes.length}, pantry ${store.pantry.length}, grocery open ${totals.groceryOpen}, assays ${totals.observatory.markers}`,
  ];
  if (planet === "galley" || !planet) {
    lines.push(
      `Pantry: ${store.pantry
        .slice(0, 40)
        .map((p) => `${p.name} (${p.quantity}${p.unit ? ` ${p.unit}` : ""})`)
        .join("; ") || "empty"}`
    );
  }
  if (planet === "observatory") {
    lines.push(
      `Recent markers (names+values on device context for interpretation the user requested): ${store.markers
        .slice(0, 15)
        .map((m) => `${m.marker}=${m.value}${m.unit}`)
        .join("; ") || "none"}`
    );
  }
  return lines.join("\n");
}

function promptFor(action: Body["action"], message: string, context: string, extra?: Record<string, unknown>) {
  const guard =
    "You are a coach inside Galaxy Health. Be concrete and brief. Not medical advice. No diagnoses.";

  switch (action) {
    case "galley.chef":
      return `${guard}\nYou are the Galley AI Chef. Help cook, plan macros, and use pantry items.\nContext:\n${context}\n\nUser: ${message}`;
    case "galley.pantry_recipe":
      return `${guard}\nCreate ONE recipe using ONLY pantry items listed. Return:\nTITLE:\nTIME:\nINGREDIENTS:\nSTEPS:\nMACROS (estimate kcal/protein/carbs/fat):\n\nContext:\n${context}\n\nNotes: ${message || "Use what's on hand."}`;
    case "galley.import_recipe":
      return `${guard}\nParse this recipe text into TITLE, INGREDIENTS (one per line), INSTRUCTIONS, optional MACROS.\n\n${message}`;
    case "galley.grocery_smart":
      return `${guard}\nFrom meal plan + pantry gaps, propose a grocery list (one item per line: name | qty | unit).\nContext:\n${context}\n\nFocus: ${message || "this week"}`;
    case "atlas.coach":
      return `${guard}\nYou are Atlas training coach. Suggest today's session given fuel and readiness.\nContext:\n${context}\n\nUser: ${message}`;
    case "atlas.program":
      return `${guard}\nDraft a 4-day microcycle (day name, focus, 4–6 movements with sets×reps, minutes). Respect recovery.\nContext:\n${context}\n\nGoal: ${message || "general strength"}`;
    case "lumen.coach":
      return `${guard}\nYou are Lumen recovery coach. Use mood/focus/sleep + training load. Give 3 actionable recovery steps.\nContext:\n${context}\n\nUser: ${message}`;
    case "observatory.interpret":
      return `${guard}\nYou help read lab panels in plain language. Flag out-of-range vs provided refs if present. Urge clinician follow-up. Never diagnose.\nContext:\n${context}\n\nUser notes / panel text:\n${message}\n\nExtra: ${JSON.stringify(extra ?? {})}`;
    case "bridge.synthesize":
      return `${guard}\nCross-planet briefing in 3 short sections: What stands out / One tension / One next action. Under 180 words.\nContext:\n${context}`;
    default:
      return `${guard}\n${message}`;
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.accessToken || session.error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Body;
    if (!body?.action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }

    const store = await loadGalaxyStore(session.accessToken);
    const planet =
      body.action.startsWith("galley")
        ? ("galley" as const)
        : body.action.startsWith("atlas")
          ? ("atlas" as const)
          : body.action.startsWith("lumen")
            ? ("lumen" as const)
            : body.action.startsWith("observatory")
              ? ("observatory" as const)
              : undefined;

    const context = buildContext(store, planet);
    const prompt = promptFor(body.action, body.message || "", context, body.extra);
    const text = await generateText(store.ai, prompt);
    return NextResponse.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
