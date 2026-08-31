// Versioned migrations for Galaxy Health.
//
// Food Dude patched schema drift with ad-hoc `PRAGMA table_info` checks on every
// boot. That works but it cannot express ordering or data moves, so here the
// schema version lives in `PRAGMA user_version` and every change is an append-only
// numbered step. Never edit a shipped migration; add the next one.
//
// Internal planet ids (galley, atlas, lumen, observatory) are the only planet
// identity the schema knows about. Display names are user data in `planets.name`.

export const MIGRATIONS = [
  {
    version: 1,
    name: 'shell: planets, settings, signals',
    sql: `
      -- One row per planet. \`id\` is stable forever; \`name\` is what the user sees
      -- and may rename at will.
      CREATE TABLE IF NOT EXISTS planets (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        order_index INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT,
        updated_at INTEGER NOT NULL
      );

      -- Every cross-planet data hand-off is a row here. The Bridge renders
      -- undelivered rows as ships in flight, so the visuals are the data.
      CREATE TABLE IF NOT EXISTS signals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_planet TEXT NOT NULL,
        target_planet TEXT NOT NULL,
        kind TEXT NOT NULL,
        payload_ref TEXT,
        payload_json TEXT,
        seen INTEGER NOT NULL DEFAULT 0,
        delivered_at INTEGER,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_signals_pending
        ON signals(seen, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_signals_target
        ON signals(target_planet, seen);
    `,
  },
  {
    version: 2,
    name: 'galley: meals and macros',
    sql: `
      CREATE TABLE IF NOT EXISTS galley_meals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slot TEXT NOT NULL DEFAULT 'meal',
        calories REAL DEFAULT 0,
        protein REAL DEFAULT 0,
        carbs REAL DEFAULT 0,
        fat REAL DEFAULT 0,
        notes TEXT,
        logged_on TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_galley_meals_day
        ON galley_meals(logged_on, created_at DESC);
    `,
  },
  {
    version: 3,
    name: 'atlas: workouts',
    sql: `
      CREATE TABLE IF NOT EXISTS atlas_workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        modality TEXT NOT NULL DEFAULT 'strength',
        minutes REAL DEFAULT 0,
        intensity INTEGER DEFAULT 3,
        burn REAL DEFAULT 0,
        notes TEXT,
        logged_on TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_atlas_workouts_day
        ON atlas_workouts(logged_on, created_at DESC);
    `,
  },
  {
    version: 4,
    name: 'lumen: mood, focus, sleep',
    sql: `
      CREATE TABLE IF NOT EXISTS lumen_checkins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mood INTEGER DEFAULT 3,
        focus INTEGER DEFAULT 3,
        sleep_hours REAL DEFAULT 0,
        note TEXT,
        logged_on TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_lumen_checkins_day
        ON lumen_checkins(logged_on, created_at DESC);
    `,
  },
  {
    version: 5,
    name: 'observatory: lab markers',
    sql: `
      CREATE TABLE IF NOT EXISTS observatory_markers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        marker TEXT NOT NULL,
        value REAL,
        unit TEXT,
        reference_low REAL,
        reference_high REAL,
        panel TEXT,
        note TEXT,
        collected_on TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_observatory_markers_day
        ON observatory_markers(collected_on, created_at DESC);
    `,
  },
  {
    version: 6,
    name: 'galley: household loop — recipes, pantry, grocery, meal plans',
    sql: `
      CREATE TABLE IF NOT EXISTS galley_recipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        ingredients TEXT,
        instructions TEXT,
        tags TEXT,
        calories REAL,
        protein REAL,
        cooked_count INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS galley_pantry (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        quantity REAL DEFAULT 1,
        unit TEXT,
        location TEXT,
        category TEXT,
        expires_on TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS galley_grocery (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        quantity REAL DEFAULT 1,
        unit TEXT,
        checked INTEGER NOT NULL DEFAULT 0,
        recipe_name TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS galley_meal_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day TEXT NOT NULL,
        slot TEXT NOT NULL,
        title TEXT NOT NULL,
        recipe_id INTEGER,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_galley_meal_plans_day
        ON galley_meal_plans(day, slot);
    `,
  },
  {
    version: 7,
    name: 'custom worlds + tracking systems',
    sql: `
      CREATE TABLE IF NOT EXISTS custom_worlds (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        domain TEXT,
        accent TEXT,
        accent_soft TEXT,
        vibe TEXT,
        cadence TEXT,
        orbit_json TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        source TEXT
      );

      CREATE TABLE IF NOT EXISTS tracking_systems (
        id TEXT PRIMARY KEY NOT NULL,
        planet_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        building_kind TEXT NOT NULL,
        building_name TEXT,
        fields_json TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        source TEXT
      );

      CREATE TABLE IF NOT EXISTS tracking_entries (
        id TEXT PRIMARY KEY NOT NULL,
        system_id TEXT NOT NULL,
        planet_id TEXT NOT NULL,
        values_json TEXT NOT NULL,
        notes TEXT,
        logged_on TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        source TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_tracking_systems_planet
        ON tracking_systems(planet_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_tracking_entries_planet
        ON tracking_entries(planet_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_tracking_entries_system
        ON tracking_entries(system_id, created_at DESC);
    `,
  },
  {
    version: 8,
    name: 'first mate conversation log',
    sql: `
      CREATE TABLE IF NOT EXISTS first_mate_messages (
        id TEXT PRIMARY KEY NOT NULL,
        role TEXT NOT NULL,
        text TEXT NOT NULL,
        channel TEXT NOT NULL,
        planets_json TEXT,
        applied INTEGER,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_first_mate_created
        ON first_mate_messages(created_at ASC);
    `,
  },
  {
    version: 9,
    name: 'galactic schedule — events as crafts in the starfield',
    sql: `
      CREATE TABLE IF NOT EXISTS galactic_events (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        briefing TEXT,
        tone TEXT NOT NULL,
        craft TEXT NOT NULL,
        planet_id TEXT,
        due_at INTEGER NOT NULL,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'upcoming',
        created_at INTEGER NOT NULL,
        source TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_galactic_events_due
        ON galactic_events(status, due_at ASC);
    `,
  },
];

export const LATEST_VERSION = MIGRATIONS.reduce(
  (max, migration) => Math.max(max, migration.version),
  0
);
