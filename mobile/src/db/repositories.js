import { getDatabase } from './client';
import { PLANETS, PLANET_BY_ID, isCorePlanet } from '../galaxy/planets';
import { outerOrbitForIndex } from '../galaxy/worldForge';

export const todayKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/* ------------------------------------------------------------------ planets */

export const planetsRepo = {
  async list() {
    const db = getDatabase();
    const rows = await db.getAllAsync(
      'SELECT id, name, enabled, order_index FROM planets ORDER BY order_index ASC'
    );
    const worlds = await worldsRepo.list();
    const worldById = Object.fromEntries(worlds.map((world) => [world.id, world]));
    const fromRows = rows.map((row) => {
      const core = PLANET_BY_ID[row.id];
      if (core) {
        return {
          ...core,
          name: row.name ?? core.defaultName,
          enabled: row.enabled === 1,
          custom: false,
        };
      }
      const world = worldById[row.id] || {};
      const customIndex = Math.max(
        0,
        rows.filter((item) => !PLANET_BY_ID[item.id]).findIndex((item) => item.id === row.id)
      );
      return {
        id: row.id,
        name: row.name,
        enabled: row.enabled === 1,
        custom: true,
        defaultName: row.name,
        tagline: world.vibe || 'Forged world',
        domain: world.domain || 'Custom tracking',
        route: 'World',
        icon: 'planet',
        orbit: world.orbit?.a != null ? world.orbit : outerOrbitForIndex(customIndex),
        body: { radius: 24, ring: false, moons: 0 },
        accent: world.accent || '#4CE0FF',
        accentSoft: world.accentSoft || '#A8F0FF',
        vibe: world.vibe,
        cadence: world.cadence,
        description: world.description,
      };
    });
    // Keep cores that somehow lost a row (seed should have inserted them).
    for (const planet of PLANETS) {
      if (!fromRows.some((row) => row.id === planet.id)) {
        fromRows.unshift({ ...planet, name: planet.defaultName, enabled: true, custom: false });
      }
    }
    return fromRows;
  },

  async rename(id, name) {
    const db = getDatabase();
    const trimmed = String(name ?? '').trim();
    if (!trimmed) throw new Error('A planet needs a name.');
    await db.runAsync('UPDATE planets SET name = ?, updated_at = ? WHERE id = ?', [
      trimmed.slice(0, 24),
      Date.now(),
      id,
    ]);
  },

  async setEnabled(id, enabled) {
    const db = getDatabase();
    await db.runAsync('UPDATE planets SET enabled = ?, updated_at = ? WHERE id = ?', [
      enabled ? 1 : 0,
      Date.now(),
      id,
    ]);
  },

  async resetNames() {
    const db = getDatabase();
    const now = Date.now();
    for (const planet of PLANETS) {
      await db.runAsync(
        'UPDATE planets SET name = ?, enabled = 1, updated_at = ? WHERE id = ?',
        [planet.defaultName, now, planet.id]
      );
    }
  },

  async insert({ id, name, enabled = true, orderIndex }) {
    const db = getDatabase();
    let order = orderIndex;
    if (order == null) {
      const row = await db.getFirstAsync('SELECT MAX(order_index) AS m FROM planets');
      order = (row?.m ?? 0) + 1;
    }
    const now = Date.now();
    await db.runAsync(
      `INSERT INTO planets (id, name, enabled, order_index, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, enabled ? 1 : 0, order, now, now]
    );
  },

  async remove(id) {
    if (isCorePlanet(id)) {
      throw new Error('Core worlds cannot be deleted. Hide them from the canopy instead.');
    }
    const db = getDatabase();
    await db.runAsync('DELETE FROM planets WHERE id = ?', [id]);
  },
};

/* ----------------------------------------------------------------- settings */

export const settingsRepo = {
  async all() {
    const db = getDatabase();
    const rows = await db.getAllAsync('SELECT key, value FROM settings');
    return rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
  },

  async set(key, value) {
    const db = getDatabase();
    await db.runAsync(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [key, value == null ? null : String(value), Date.now()]
    );
  },
};

/* ------------------------------------------------------------------ signals */

export const signalsRepo = {
  async send({ from, to, kind, payload, payloadRef }) {
    const db = getDatabase();
    const result = await db.runAsync(
      `INSERT INTO signals (source_planet, target_planet, kind, payload_ref, payload_json, seen, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [from, to, kind, payloadRef ?? null, payload ? JSON.stringify(payload) : null, Date.now()]
    );
    return result.lastInsertRowId;
  },

  async inFlight(limit = 12) {
    const db = getDatabase();
    const rows = await db.getAllAsync(
      `SELECT * FROM signals WHERE seen = 0 ORDER BY created_at ASC LIMIT ?`,
      [limit]
    );
    return rows.map(hydrateSignal);
  },

  async inboxFor(planetId, limit = 20) {
    const db = getDatabase();
    const rows = await db.getAllAsync(
      `SELECT * FROM signals WHERE target_planet = ? ORDER BY created_at DESC LIMIT ?`,
      [planetId, limit]
    );
    return rows.map(hydrateSignal);
  },

  async recent(limit = 30) {
    const db = getDatabase();
    const rows = await db.getAllAsync(
      `SELECT * FROM signals ORDER BY created_at DESC LIMIT ?`,
      [limit]
    );
    return rows.map(hydrateSignal);
  },

  // Called when the user actually arrives at the target planet: the ship lands.
  async markDelivered(planetId) {
    const db = getDatabase();
    const result = await db.runAsync(
      `UPDATE signals SET seen = 1, delivered_at = ? WHERE target_planet = ? AND seen = 0`,
      [Date.now(), planetId]
    );
    return result.changes ?? 0;
  },

  async pendingCount() {
    const db = getDatabase();
    const row = await db.getFirstAsync('SELECT COUNT(*) AS count FROM signals WHERE seen = 0');
    return row?.count ?? 0;
  },
};

const hydrateSignal = (row) => ({
  id: row.id,
  from: row.source_planet,
  to: row.target_planet,
  kind: row.kind,
  payloadRef: row.payload_ref,
  payload: row.payload_json ? safeParse(row.payload_json) : null,
  seen: row.seen === 1,
  deliveredAt: row.delivered_at,
  createdAt: row.created_at,
});

const safeParse = (json) => {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
};

/* ------------------------------------------------------------------- galley */

export const galleyRepo = {
  async log(meal) {
    const db = getDatabase();
    const now = Date.now();
    const result = await db.runAsync(
      `INSERT INTO galley_meals (name, slot, calories, protein, carbs, fat, notes, logged_on, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        meal.name,
        meal.slot ?? 'meal',
        num(meal.calories),
        num(meal.protein),
        num(meal.carbs),
        num(meal.fat),
        meal.notes ?? null,
        meal.loggedOn ?? todayKey(),
        now,
      ]
    );
    return result.lastInsertRowId;
  },

  async listForDay(day = todayKey()) {
    const db = getDatabase();
    return db.getAllAsync(
      'SELECT * FROM galley_meals WHERE logged_on = ? ORDER BY created_at DESC',
      [day]
    );
  },

  async remove(id) {
    const db = getDatabase();
    await db.runAsync('DELETE FROM galley_meals WHERE id = ?', [id]);
  },

  async totalsForDay(day = todayKey()) {
    const db = getDatabase();
    const row = await db.getFirstAsync(
      `SELECT COALESCE(SUM(calories), 0) AS calories,
              COALESCE(SUM(protein), 0) AS protein,
              COALESCE(SUM(carbs), 0) AS carbs,
              COALESCE(SUM(fat), 0) AS fat,
              COUNT(*) AS entries
       FROM galley_meals WHERE logged_on = ?`,
      [day]
    );
    return row ?? { calories: 0, protein: 0, carbs: 0, fat: 0, entries: 0 };
  },

  async addRecipe(recipe) {
    const db = getDatabase();
    const result = await db.runAsync(
      `INSERT INTO galley_recipes (title, ingredients, instructions, tags, calories, protein, cooked_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      [
        recipe.title,
        recipe.ingredients ?? '',
        recipe.instructions ?? '',
        recipe.tags ?? '',
        num(recipe.calories),
        num(recipe.protein),
        Date.now(),
      ]
    );
    return result.lastInsertRowId;
  },

  async listRecipes() {
    const db = getDatabase();
    return db.getAllAsync('SELECT * FROM galley_recipes ORDER BY created_at DESC');
  },

  async addPantry(item) {
    const db = getDatabase();
    const result = await db.runAsync(
      `INSERT INTO galley_pantry (name, quantity, unit, location, category, expires_on, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        item.name,
        num(item.quantity) || 1,
        item.unit ?? '',
        item.location ?? 'galley',
        item.category ?? null,
        item.expiresOn ?? null,
        Date.now(),
      ]
    );
    return result.lastInsertRowId;
  },

  async listPantry() {
    const db = getDatabase();
    return db.getAllAsync('SELECT * FROM galley_pantry ORDER BY created_at DESC');
  },

  async addGrocery(item) {
    const db = getDatabase();
    const result = await db.runAsync(
      `INSERT INTO galley_grocery (name, quantity, unit, checked, recipe_name, created_at)
       VALUES (?, ?, ?, 0, ?, ?)`,
      [item.name, num(item.quantity) || 1, item.unit ?? '', item.recipeName ?? null, Date.now()]
    );
    return result.lastInsertRowId;
  },

  async listGrocery() {
    const db = getDatabase();
    return db.getAllAsync('SELECT * FROM galley_grocery ORDER BY created_at DESC');
  },

  async toggleGrocery(id, checked) {
    const db = getDatabase();
    await db.runAsync('UPDATE galley_grocery SET checked = ? WHERE id = ?', [checked ? 1 : 0, id]);
  },

  async addPlan(plan) {
    const db = getDatabase();
    const result = await db.runAsync(
      `INSERT INTO galley_meal_plans (day, slot, title, recipe_id, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [plan.day ?? todayKey(), plan.slot ?? 'dinner', plan.title, plan.recipeId ?? null, Date.now()]
    );
    return result.lastInsertRowId;
  },

  async listPlans(day = todayKey()) {
    const db = getDatabase();
    return db.getAllAsync(
      'SELECT * FROM galley_meal_plans WHERE day = ? ORDER BY slot ASC',
      [day]
    );
  },
};

/* -------------------------------------------------------------------- atlas */

export const atlasRepo = {
  async log(workout) {
    const db = getDatabase();
    const result = await db.runAsync(
      `INSERT INTO atlas_workouts (name, modality, minutes, intensity, burn, notes, logged_on, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        workout.name,
        workout.modality ?? 'strength',
        num(workout.minutes),
        Math.round(num(workout.intensity) || 3),
        num(workout.burn),
        workout.notes ?? null,
        workout.loggedOn ?? todayKey(),
        Date.now(),
      ]
    );
    return result.lastInsertRowId;
  },

  async listForDay(day = todayKey()) {
    const db = getDatabase();
    return db.getAllAsync(
      'SELECT * FROM atlas_workouts WHERE logged_on = ? ORDER BY created_at DESC',
      [day]
    );
  },

  async remove(id) {
    const db = getDatabase();
    await db.runAsync('DELETE FROM atlas_workouts WHERE id = ?', [id]);
  },

  async totalsForDay(day = todayKey()) {
    const db = getDatabase();
    const row = await db.getFirstAsync(
      `SELECT COALESCE(SUM(minutes), 0) AS minutes,
              COALESCE(SUM(burn), 0) AS burn,
              COALESCE(AVG(intensity), 0) AS intensity,
              COUNT(*) AS entries
       FROM atlas_workouts WHERE logged_on = ?`,
      [day]
    );
    return row ?? { minutes: 0, burn: 0, intensity: 0, entries: 0 };
  },
};

/* -------------------------------------------------------------------- lumen */

export const lumenRepo = {
  async log(checkin) {
    const db = getDatabase();
    const result = await db.runAsync(
      `INSERT INTO lumen_checkins (mood, focus, sleep_hours, note, logged_on, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        Math.round(num(checkin.mood) || 3),
        Math.round(num(checkin.focus) || 3),
        num(checkin.sleepHours),
        checkin.note ?? null,
        checkin.loggedOn ?? todayKey(),
        Date.now(),
      ]
    );
    return result.lastInsertRowId;
  },

  async listForDay(day = todayKey()) {
    const db = getDatabase();
    return db.getAllAsync(
      'SELECT * FROM lumen_checkins WHERE logged_on = ? ORDER BY created_at DESC',
      [day]
    );
  },

  async remove(id) {
    const db = getDatabase();
    await db.runAsync('DELETE FROM lumen_checkins WHERE id = ?', [id]);
  },

  async totalsForDay(day = todayKey()) {
    const db = getDatabase();
    const row = await db.getFirstAsync(
      `SELECT COALESCE(AVG(mood), 0) AS mood,
              COALESCE(AVG(focus), 0) AS focus,
              COALESCE(SUM(sleep_hours), 0) AS sleep,
              COUNT(*) AS entries
       FROM lumen_checkins WHERE logged_on = ?`,
      [day]
    );
    return row ?? { mood: 0, focus: 0, sleep: 0, entries: 0 };
  },
};

/* -------------------------------------------------------------- observatory */

export const observatoryRepo = {
  async log(marker) {
    const db = getDatabase();
    const result = await db.runAsync(
      `INSERT INTO observatory_markers (marker, value, unit, reference_low, reference_high, panel, note, collected_on, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        marker.marker,
        num(marker.value),
        marker.unit ?? null,
        marker.referenceLow == null ? null : num(marker.referenceLow),
        marker.referenceHigh == null ? null : num(marker.referenceHigh),
        marker.panel ?? null,
        marker.note ?? null,
        marker.collectedOn ?? todayKey(),
        Date.now(),
      ]
    );
    return result.lastInsertRowId;
  },

  async listRecent(limit = 25) {
    const db = getDatabase();
    return db.getAllAsync(
      'SELECT * FROM observatory_markers ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
  },

  async remove(id) {
    const db = getDatabase();
    await db.runAsync('DELETE FROM observatory_markers WHERE id = ?', [id]);
  },

  async count() {
    const db = getDatabase();
    const row = await db.getFirstAsync('SELECT COUNT(*) AS count FROM observatory_markers');
    return row?.count ?? 0;
  },
};

const num = (value) => {
  const parsed = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseJson = (raw, fallback) => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

/* ----------------------------------------------------------- custom worlds */

export const worldsRepo = {
  async list() {
    const db = getDatabase();
    const rows = await db.getAllAsync('SELECT * FROM custom_worlds ORDER BY created_at DESC');
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      domain: row.domain,
      accent: row.accent,
      accentSoft: row.accent_soft,
      vibe: row.vibe,
      cadence: row.cadence,
      enabled: row.enabled === 1,
      orbit: parseJson(row.orbit_json, null),
      created_at: row.created_at,
      source: row.source,
    }));
  },

  async insert(world) {
    const db = getDatabase();
    await db.runAsync(
      `INSERT INTO custom_worlds (
        id, name, description, domain, accent, accent_soft, vibe, cadence, orbit_json, enabled, created_at, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        world.id,
        world.name,
        world.description ?? '',
        world.domain ?? 'Custom tracking',
        world.accent ?? '#4CE0FF',
        world.accentSoft ?? '#A8F0EB',
        world.vibe ?? '',
        world.cadence ?? 'As you log',
        JSON.stringify(world.orbit ?? {}),
        world.enabled === 0 ? 0 : 1,
        world.created_at ?? Date.now(),
        world.source ?? 'user',
      ]
    );
  },

  async remove(id) {
    const db = getDatabase();
    await db.runAsync('DELETE FROM custom_worlds WHERE id = ?', [id]);
  },
};

export const systemsRepo = {
  async listForPlanet(planetId) {
    const db = getDatabase();
    const rows = await db.getAllAsync(
      'SELECT * FROM tracking_systems WHERE planet_id = ? ORDER BY created_at DESC',
      [planetId]
    );
    return rows.map((row) => ({
      ...row,
      fields: parseJson(row.fields_json, []),
    }));
  },

  async insert(system) {
    const db = getDatabase();
    await db.runAsync(
      `INSERT INTO tracking_systems (
        id, planet_id, name, description, building_kind, building_name, fields_json, created_at, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        system.id,
        system.planet_id,
        system.name,
        system.description ?? '',
        system.building_kind,
        system.building_name ?? system.name,
        JSON.stringify(system.fields ?? []),
        system.created_at ?? Date.now(),
        system.source ?? 'user',
      ]
    );
  },

  async update(system) {
    const db = getDatabase();
    await db.runAsync(
      `UPDATE tracking_systems
       SET name = ?, description = ?, building_kind = ?, building_name = ?, fields_json = ?
       WHERE id = ?`,
      [
        system.name,
        system.description ?? '',
        system.building_kind,
        system.building_name ?? system.name,
        JSON.stringify(system.fields ?? []),
        system.id,
      ]
    );
  },

  async remove(id) {
    const db = getDatabase();
    await db.runAsync('DELETE FROM tracking_entries WHERE system_id = ?', [id]);
    await db.runAsync('DELETE FROM tracking_systems WHERE id = ?', [id]);
  },
};

export const entriesRepo = {
  async listForPlanet(planetId, limit = 40) {
    const db = getDatabase();
    return db.getAllAsync(
      'SELECT * FROM tracking_entries WHERE planet_id = ? ORDER BY created_at DESC LIMIT ?',
      [planetId, limit]
    ).then((rows) =>
      rows.map((row) => ({
        ...row,
        values: parseJson(row.values_json, {}),
      }))
    );
  },

  async listForSystem(systemId, limit = 20) {
    const db = getDatabase();
    const rows = await db.getAllAsync(
      'SELECT * FROM tracking_entries WHERE system_id = ? ORDER BY created_at DESC LIMIT ?',
      [systemId, limit]
    );
    return rows.map((row) => ({
      ...row,
      values: parseJson(row.values_json, {}),
    }));
  },

  async insert(entry) {
    const db = getDatabase();
    await db.runAsync(
      `INSERT INTO tracking_entries (
        id, system_id, planet_id, values_json, notes, logged_on, created_at, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.system_id,
        entry.planet_id,
        JSON.stringify(entry.values ?? {}),
        entry.notes ?? null,
        entry.logged_on ?? todayKey(),
        entry.created_at ?? Date.now(),
        entry.source ?? 'user',
      ]
    );
  },

  async remove(id) {
    const db = getDatabase();
    await db.runAsync('DELETE FROM tracking_entries WHERE id = ?', [id]);
  },

  async countForPlanet(planetId) {
    const db = getDatabase();
    const row = await db.getFirstAsync(
      'SELECT COUNT(*) AS count FROM tracking_entries WHERE planet_id = ?',
      [planetId]
    );
    return row?.count ?? 0;
  },
};

const FIRST_MATE_CAP = 40;

export const eventsRepo = {
  async list() {
    const db = getDatabase();
    const rows = await db.getAllAsync(
      'SELECT * FROM galactic_events ORDER BY due_at ASC'
    );
    return rows.map(mapEvent);
  },

  async insert(event) {
    const db = getDatabase();
    await db.runAsync(
      `INSERT INTO galactic_events
        (id, title, briefing, tone, craft, planet_id, due_at, notes, status, created_at, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.id,
        event.title,
        event.briefing ?? '',
        event.tone,
        event.craft,
        event.planet_id ?? null,
        event.due_at,
        event.notes ?? null,
        event.status ?? 'upcoming',
        event.created_at ?? Date.now(),
        event.source ?? 'user',
      ]
    );
  },

  async setStatus(id, status) {
    const db = getDatabase();
    await db.runAsync('UPDATE galactic_events SET status = ? WHERE id = ?', [status, id]);
  },

  async remove(id) {
    const db = getDatabase();
    await db.runAsync('DELETE FROM galactic_events WHERE id = ?', [id]);
  },
};

function mapEvent(row) {
  return {
    id: row.id,
    title: row.title,
    briefing: row.briefing,
    tone: row.tone,
    craft: row.craft,
    planet_id: row.planet_id,
    due_at: row.due_at,
    notes: row.notes,
    status: row.status,
    created_at: row.created_at,
    source: row.source,
  };
}

export const firstMateRepo = {
  async list(limit = FIRST_MATE_CAP) {
    const db = getDatabase();
    const rows = await db.getAllAsync(
      'SELECT * FROM first_mate_messages ORDER BY created_at ASC LIMIT ?',
      [limit]
    );
    return rows.map((row) => ({
      id: row.id,
      role: row.role,
      text: row.text,
      channel: row.channel,
      planetsTouched: parseJson(row.planets_json, []),
      applied: row.applied,
      created_at: row.created_at,
    }));
  },

  async insert(message) {
    const db = getDatabase();
    await db.runAsync(
      `INSERT INTO first_mate_messages (id, role, text, channel, planets_json, applied, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        message.id,
        message.role,
        message.text,
        message.channel ?? 'mobile',
        JSON.stringify(message.planetsTouched ?? []),
        message.applied ?? null,
        message.created_at ?? Date.now(),
      ]
    );
    const countRow = await db.getFirstAsync('SELECT COUNT(*) AS count FROM first_mate_messages');
    const extra = (countRow?.count ?? 0) - FIRST_MATE_CAP;
    if (extra > 0) {
      await db.runAsync(
        `DELETE FROM first_mate_messages WHERE id IN (
           SELECT id FROM first_mate_messages ORDER BY created_at ASC LIMIT ?
         )`,
        [extra]
      );
    }
  },
};

export async function unmakeWorld(id) {
  if (isCorePlanet(id)) {
    await planetsRepo.setEnabled(id, false);
    return { deleted: false };
  }
  const db = getDatabase();
  await db.runAsync('DELETE FROM tracking_entries WHERE planet_id = ?', [id]);
  await db.runAsync('DELETE FROM tracking_systems WHERE planet_id = ?', [id]);
  await worldsRepo.remove(id);
  await planetsRepo.remove(id);
  return { deleted: true };
}
