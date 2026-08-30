import * as SQLite from 'expo-sqlite';

import { LATEST_VERSION, MIGRATIONS } from './migrations';
import { PLANETS } from '../galaxy/planets';

const DATABASE_NAME = 'galaxyhealth.db';

let db = null;
let openPromise = null;

const readUserVersion = async (database) => {
  const row = await database.getFirstAsync('PRAGMA user_version');
  return row?.user_version ?? 0;
};

const runMigrations = async (database) => {
  const from = await readUserVersion(database);
  if (from >= LATEST_VERSION) {
    return { from, to: from, applied: [] };
  }

  const applied = [];
  for (const migration of MIGRATIONS) {
    if (migration.version <= from) continue;

    // expo-sqlite has no nested transaction support, so each migration is its
    // own unit: either the whole step lands or the version is not advanced.
    await database.withExclusiveTransactionAsync(async (tx) => {
      await tx.execAsync(migration.sql);
      await tx.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
    applied.push(migration);
  }

  return { from, to: await readUserVersion(database), applied };
};

const seedPlanets = async (database) => {
  const now = Date.now();
  for (let index = 0; index < PLANETS.length; index += 1) {
    const planet = PLANETS[index];
    // INSERT OR IGNORE keeps a rename from being clobbered on later boots.
    await database.runAsync(
      `INSERT OR IGNORE INTO planets (id, name, enabled, order_index, created_at, updated_at)
       VALUES (?, ?, 1, ?, ?, ?)`,
      [planet.id, planet.defaultName, index, now, now]
    );
  }
};

export const initDatabase = async () => {
  if (db) return db;
  if (openPromise) return openPromise;

  openPromise = (async () => {
    const database = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await database.execAsync('PRAGMA foreign_keys = ON;');

    const result = await runMigrations(database);
    if (result.applied.length > 0) {
      const names = result.applied.map((m) => `${m.version}:${m.name}`).join(', ');
      console.log(`[db] migrated ${result.from} -> ${result.to} (${names})`);
    }

    await seedPlanets(database);

    db = database;
    return database;
  })();

  try {
    return await openPromise;
  } catch (error) {
    openPromise = null;
    throw error;
  }
};

export const getDatabase = () => {
  if (!db) {
    throw new Error('Database not initialized. Await initDatabase() first.');
  }
  return db;
};

export const schemaVersion = () => LATEST_VERSION;

// Used by Settings -> "Purge local data". Drops rows, keeps the schema and the
// user's planet names.
export const purgeLogs = async () => {
  const database = getDatabase();
  await database.execAsync(`
    DELETE FROM galley_meals;
    DELETE FROM atlas_workouts;
    DELETE FROM lumen_checkins;
    DELETE FROM observatory_markers;
    DELETE FROM signals;
  `);
};
