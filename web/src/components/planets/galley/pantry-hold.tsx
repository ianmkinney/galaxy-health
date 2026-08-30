"use client";

import { useMemo, useState } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Field } from "@/components/ui/fields";
import { useGalaxy } from "@/components/galaxy-provider";
import { uid } from "@/lib/galaxy-types";
import { AISLES, aisleForName, pantryStatus } from "@/lib/galley-ops";

export function GalleyPantry() {
  const { store, update, saving } = useGalaxy();
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({
    name: "",
    quantity: "1",
    unit: "",
    location: "galley",
    category: "",
    expires_on: "",
  });

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.pantry.filter((p) => {
      if (!q) return true;
      return `${p.name} ${p.location} ${p.category ?? ""}`.toLowerCase().includes(q);
    });
  }, [store.pantry, query]);

  const expiring = store.pantry.filter((p) => {
    const s = pantryStatus(p);
    return s === "soon" || s === "expired";
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <GlassPanel title="Stow item" accent="#FF8A3D" index={0}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field accent="orange" label="Name" value={form.name} onChange={(name) => setForm((f) => ({ ...f, name }))} />
          <Field accent="orange" label="Qty" value={form.quantity} onChange={(quantity) => setForm((f) => ({ ...f, quantity }))} />
          <Field accent="orange" label="Unit" value={form.unit} onChange={(unit) => setForm((f) => ({ ...f, unit }))} />
          <Field accent="orange" label="Location" value={form.location} onChange={(location) => setForm((f) => ({ ...f, location }))} />
          <label className="block text-xs text-white/50">
            Aisle
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            >
              <option value="">Auto</option>
              {AISLES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <Field
            accent="orange"
            type="date"
            label="Expires"
            value={form.expires_on}
            onChange={(expires_on) => setForm((f) => ({ ...f, expires_on }))}
          />
        </div>
        <div className="mt-4">
          <ShimmerButton
            tone="#FF8A3D"
            disabled={saving}
            onClick={async () => {
              if (!form.name.trim()) return;
              await update((d) => {
                d.pantry.unshift({
                  id: uid(),
                  name: form.name.trim(),
                  quantity: Number(form.quantity) || 1,
                  unit: form.unit,
                  location: form.location,
                  category: form.category || aisleForName(form.name),
                  expires_on: form.expires_on || undefined,
                  created_at: Date.now(),
                  source: "user",
                });
                return d;
              });
              setForm({ name: "", quantity: "1", unit: "", location: "galley", category: "", expires_on: "" });
            }}
          >
            Add to pantry
          </ShimmerButton>
        </div>
      </GlassPanel>
      <GlassPanel title="Expiring" meta={`${expiring.length}`} accent="#FF8A3D" index={1}>
        {expiring.length === 0 ? (
          <p className="text-sm text-white/45">Nothing going off soon.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {expiring.map((p) => {
              const s = pantryStatus(p);
              return (
                <li key={p.id} className="flex justify-between rounded-xl border border-white/10 px-3 py-2">
                  <span className="text-white">{p.name}</span>
                  <span className={s === "expired" ? "text-rose-300" : "text-amber-200"}>
                    {s === "expired" ? "Expired" : p.expires_on}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </GlassPanel>
      <GlassPanel title="Inventory" meta={`${items.length}`} accent="#FF8A3D" index={2} className="lg:col-span-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search pantry…"
          className="mb-3 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-orange-300/40"
        />
        <ul className="space-y-2 text-sm text-white/80">
          {items.map((p) => (
            <li key={p.id} className="flex items-center justify-between border-b border-white/5 py-2">
              <span>
                {p.name}
                <span className="text-white/35">
                  {" "}
                  · {p.quantity}
                  {p.unit ? ` ${p.unit}` : ""} · {p.location}
                  {p.category ? ` · ${p.category}` : ""}
                </span>
              </span>
              <button
                type="button"
                className="text-[10px] uppercase tracking-wider text-white/30 hover:text-rose-300"
                onClick={() => update((d) => ({ ...d, pantry: d.pantry.filter((x) => x.id !== p.id) }))}
              >
                Remove
              </button>
            </li>
          ))}
          {items.length === 0 ? <li className="text-white/40">Empty hold.</li> : null}
        </ul>
      </GlassPanel>
    </div>
  );
}
