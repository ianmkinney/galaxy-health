import { getDatabase } from './client';
import { PLANETS } from '../galaxy/planets';

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
    // Fall back to the registry order if a row is somehow missing.
    return PLANETS.map((planet) => {
      const row = rows.find((r) => r.id === planet.id);
      return {
        ...planet,
        name: row?.name ?? planet.defaultName,
        enabled: row ? row.enabled === 1 : true,
      };
    });
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
      await db.runAsync('UPDATE planets SET name = ?, updated_at = ? WHERE id = ?', [
        planet.defaultName,
        now,
        planet.id,
      ]);
    }
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
