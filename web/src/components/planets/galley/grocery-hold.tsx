"use client";

import { useMemo, useState } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Field } from "@/components/ui/fields";
import { AiDock } from "@/components/ai-dock";
import { useGalaxy } from "@/components/galaxy-provider";
import { uid } from "@/lib/galaxy-types";
import {
  AISLES,
  aisleForName,
  formatGroceryClipboard,
  groceryFromMealPlans,
  groupGroceryByAisle,
  mergeGroceryIntoStore,
  weekBounds,
} from "@/lib/galley-ops";
import { startOfWeek, todayKey } from "@/lib/utils";

export function GalleyGrocery() {
  const { store, update, saving } = useGalaxy();
  const [form, setForm] = useState({ name: "", quantity: "1", unit: "" });
  const [copied, setCopied] = useState("");
  const [genNote, setGenNote] = useState("");

  const open = store.grocery.filter((g) => !g.checked);
  const groups = useMemo(() => groupGroceryByAisle(store.grocery), [store.grocery]);

  const generate = async () => {
    const { start, end } = weekBounds(startOfWeek(todayKey()));
    const rows = groceryFromMealPlans(store, start, end);
    await update((d) => {
      const added = mergeGroceryIntoStore(d, rows);
      setGenNote(
        added
          ? `Added ${added} from this week's plan (pantry already covered the rest).`
          : "Nothing new — pantry covers the week, or the plan is empty."
      );
      return d;
    });
  };

  const checkIn = async (id: string, checked: boolean) => {
    await update((d) => {
      const row = d.grocery.find((x) => x.id === id);
      if (!row) return d;
      row.checked = checked;
      if (checked) {
        const exists = d.pantry.some((p) => p.name.toLowerCase() === row.name.toLowerCase());
        if (!exists) {
          d.pantry.unshift({
            id: uid(),
            name: row.name,
            quantity: row.quantity,
            unit: row.unit,
            location: "galley",
            category: row.category || aisleForName(row.name),
            created_at: Date.now(),
            source: "user",
          });
        }
      }
      return d;
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <GlassPanel title="Add grocery" accent="#FF8A3D" index={0}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field accent="orange" label="Name" value={form.name} onChange={(name) => setForm((f) => ({ ...f, name }))} />
          <Field accent="orange" label="Qty" value={form.quantity} onChange={(quantity) => setForm((f) => ({ ...f, quantity }))} />
          <Field accent="orange" label="Unit" value={form.unit} onChange={(unit) => setForm((f) => ({ ...f, unit }))} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <ShimmerButton
            tone="#FF8A3D"
            onClick={async () => {
              if (!form.name.trim()) return;
              await update((d) => {
                d.grocery.unshift({
                  id: uid(),
                  name: form.name.trim(),
                  quantity: Number(form.quantity) || 1,
                  unit: form.unit,
                  checked: false,
                  category: aisleForName(form.name),
                  created_at: Date.now(),
                  source: "user",
                });
                return d;
              });
              setForm({ name: "", quantity: "1", unit: "" });
            }}
          >
            Add
          </ShimmerButton>
          <ShimmerButton tone="#FF8A3D" variant="ghost" disabled={saving} onClick={generate}>
            Generate from week plan
          </ShimmerButton>
          <ShimmerButton
            tone="#FF8A3D"
            variant="ghost"
            onClick={async () => {
              const text = formatGroceryClipboard(store.grocery);
              await navigator.clipboard.writeText(text);
              setCopied("Copied open items.");
            }}
          >
            Copy list
          </ShimmerButton>
          <ShimmerButton
            tone="#FF4D6D"
            variant="ghost"
            onClick={() => update((d) => ({ ...d, grocery: d.grocery.filter((g) => !g.checked) }))}
          >
            Clear checked
          </ShimmerButton>
        </div>
        {genNote ? <p className="mt-3 text-xs text-white/50">{genNote}</p> : null}
        {copied ? <p className="mt-2 text-xs text-white/50">{copied}</p> : null}
        <p className="mt-3 text-[11px] text-white/35">
          Local merge, no AI required — same household loop as Food Dude. Checking an item stows it
          in the pantry if it isn't already there.
        </p>
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
              if (!name || name.includes(":")) continue;
              d.grocery.unshift({
                id: uid(),
                name,
                quantity: Number(quantity) || 1,
                unit: unit || "",
                checked: false,
                category: aisleForName(name),
                created_at: Date.now(),
                source: "user",
              });
            }
            return d;
          });
        }}
      />
      <GlassPanel
        title="List by aisle"
        meta={`${open.length} open`}
        accent="#FF8A3D"
        index={2}
        className="lg:col-span-2"
      >
        <div className="grid gap-4 md:grid-cols-2">
          {AISLES.map((aisle) => {
            const rows = groups[aisle];
            if (!rows.length) return null;
            return (
              <div key={aisle}>
                <div className="mb-2 text-[10px] uppercase tracking-widest text-orange-200/70">{aisle}</div>
                <ul className="space-y-1 text-sm">
                  {rows.map((g) => (
                    <li key={g.id} className="flex items-center gap-3 border-b border-white/5 py-1.5">
                      <input
                        type="checkbox"
                        checked={g.checked}
                        onChange={(e) => checkIn(g.id, e.target.checked)}
                      />
                      <span className={g.checked ? "text-white/35 line-through" : "text-white/85"}>
                        {g.name}{" "}
                        <span className="text-white/40">
                          {g.quantity}
                          {g.unit ? ` ${g.unit}` : ""}
                          {g.recipe_name ? ` · ${g.recipe_name}` : ""}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </GlassPanel>
      <div className="lg:col-span-2">
        <AiDock
          accent="#FFB37A"
          title="Estimate haul cost (AI)"
          placeholder="Store name optional: Trader Joe's, Aldi…"
          action="galley.grocery_cost"
        />
      </div>
    </div>
  );
}
