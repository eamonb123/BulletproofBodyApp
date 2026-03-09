import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "..", "bulletproof_body.db");

export interface JumperProfileView {
  id: string;
  name: string;
}

export interface JumperSessionView {
  frequency: number;
  selectedRestaurantId: string | null;
  selectedOrderIdsByRestaurant: Record<string, string[]>;
  updatedAt: string | null;
}

export interface JumperPlanRowView {
  id: number;
  restaurantId: string;
  restaurantName: string;
  frequency: number;
  originalMealId: string;
  originalMealName: string;
  swapMealId: string;
  swapMealName: string;
  calSavedPerOrder: number;
  weeklyCalSaved: number;
  savedAt: string;
}

interface ProfileRow {
  id: string;
  client_name: string;
}

interface SessionRow {
  frequency_per_week: number;
  selected_restaurant_id: string | null;
  selected_order_ids_json: string | null;
  updated_at: string;
}

interface PlanRow {
  id: number;
  restaurant_id: string;
  restaurant_name: string;
  frequency_per_week: number;
  original_meal_id: string;
  original_meal_name: string;
  swap_meal_id: string;
  swap_meal_name: string;
  cal_saved_per_order: number;
  weekly_cal_saved: number;
  saved_at: string;
}

export function clampFrequency(value: number) {
  if (Number.isNaN(value)) return 4;
  return Math.max(1, Math.min(7, Math.round(value)));
}

export function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function sanitizeSelectedOrderIdsByRestaurant(
  value: unknown
): Record<string, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const output: Record<string, string[]> = {};
  const entries = Object.entries(value as Record<string, unknown>);
  for (const [restaurantId, selectedOrderIds] of entries) {
    if (!restaurantId.trim() || !Array.isArray(selectedOrderIds)) continue;

    const ids = selectedOrderIds
      .map((id) => (typeof id === "string" ? id.trim() : ""))
      .filter(Boolean);
    output[restaurantId] = Array.from(new Set(ids));
  }

  return output;
}

function ensureJumperTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS client_jumper_profiles (
      id TEXT PRIMARY KEY,
      client_name TEXT NOT NULL,
      normalized_name TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS client_jumper_sessions (
      profile_id TEXT PRIMARY KEY REFERENCES client_jumper_profiles(id) ON DELETE CASCADE,
      frequency_per_week INTEGER DEFAULT 4,
      selected_restaurant_id TEXT REFERENCES restaurants(id),
      selected_order_ids_json TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS client_jumper_plan_rows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id TEXT NOT NULL REFERENCES client_jumper_profiles(id) ON DELETE CASCADE,
      restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
      restaurant_name TEXT NOT NULL,
      frequency_per_week INTEGER DEFAULT 4,
      original_meal_id TEXT NOT NULL REFERENCES template_meals(id),
      original_meal_name TEXT NOT NULL,
      swap_meal_id TEXT NOT NULL REFERENCES template_meals(id),
      swap_meal_name TEXT NOT NULL,
      cal_saved_per_order INTEGER NOT NULL,
      weekly_cal_saved INTEGER NOT NULL,
      saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(profile_id, restaurant_id, original_meal_id, swap_meal_id)
    );

    CREATE INDEX IF NOT EXISTS idx_client_jumper_sessions_updated
    ON client_jumper_sessions(updated_at);

    CREATE INDEX IF NOT EXISTS idx_client_jumper_plan_rows_profile
    ON client_jumper_plan_rows(profile_id, saved_at DESC);
  `);
}

export function getDb(options?: { readonly?: boolean }) {
  const readonly = options?.readonly ?? false;
  const db = new Database(DB_PATH, { readonly });
  db.pragma("foreign_keys = ON");
  if (!readonly) {
    ensureJumperTables(db);
  }
  return db;
}

export function findJumperProfileByName(
  db: Database.Database,
  normalizedName: string
): ProfileRow | undefined {
  return db
    .prepare("SELECT id, client_name FROM client_jumper_profiles WHERE normalized_name = ?")
    .get(normalizedName) as ProfileRow | undefined;
}

export function findJumperProfileById(
  db: Database.Database,
  profileId: string
): ProfileRow | undefined {
  return db
    .prepare("SELECT id, client_name FROM client_jumper_profiles WHERE id = ?")
    .get(profileId) as ProfileRow | undefined;
}

export function loadJumperSession(
  db: Database.Database,
  profileId: string
): JumperSessionView {
  const row = db
    .prepare(
      `
      SELECT frequency_per_week, selected_restaurant_id, selected_order_ids_json, updated_at
      FROM client_jumper_sessions
      WHERE profile_id = ?
      `
    )
    .get(profileId) as SessionRow | undefined;

  if (!row) {
    return {
      frequency: 4,
      selectedRestaurantId: null,
      selectedOrderIdsByRestaurant: {},
      updatedAt: null,
    };
  }

  let selectedOrderIdsByRestaurant: Record<string, string[]> = {};
  if (row.selected_order_ids_json) {
    try {
      selectedOrderIdsByRestaurant = sanitizeSelectedOrderIdsByRestaurant(
        JSON.parse(row.selected_order_ids_json)
      );
    } catch {
      selectedOrderIdsByRestaurant = {};
    }
  }

  return {
    frequency: clampFrequency(row.frequency_per_week),
    selectedRestaurantId: row.selected_restaurant_id,
    selectedOrderIdsByRestaurant,
    updatedAt: row.updated_at ?? null,
  };
}

export function upsertJumperSession(
  db: Database.Database,
  profileId: string,
  data: {
    frequency: number;
    selectedRestaurantId: string | null;
    selectedOrderIdsByRestaurant: Record<string, string[]>;
  }
) {
  const frequency = clampFrequency(data.frequency);
  const selectedRestaurantId = data.selectedRestaurantId?.trim() || null;
  const selectedOrderIdsByRestaurant = sanitizeSelectedOrderIdsByRestaurant(
    data.selectedOrderIdsByRestaurant
  );

  db.prepare(
    `
    INSERT INTO client_jumper_sessions (
      profile_id,
      frequency_per_week,
      selected_restaurant_id,
      selected_order_ids_json,
      updated_at
    )
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(profile_id) DO UPDATE SET
      frequency_per_week = excluded.frequency_per_week,
      selected_restaurant_id = excluded.selected_restaurant_id,
      selected_order_ids_json = excluded.selected_order_ids_json,
      updated_at = CURRENT_TIMESTAMP
    `
  ).run(
    profileId,
    frequency,
    selectedRestaurantId,
    JSON.stringify(selectedOrderIdsByRestaurant)
  );
}

export function loadJumperPlanRows(
  db: Database.Database,
  profileId: string
): JumperPlanRowView[] {
  const rows = db
    .prepare(
      `
      SELECT
        id,
        restaurant_id,
        restaurant_name,
        frequency_per_week,
        original_meal_id,
        original_meal_name,
        swap_meal_id,
        swap_meal_name,
        cal_saved_per_order,
        weekly_cal_saved,
        saved_at
      FROM client_jumper_plan_rows
      WHERE profile_id = ?
      ORDER BY saved_at DESC, id DESC
      `
    )
    .all(profileId) as PlanRow[];

  return rows.map((row) => ({
    id: row.id,
    restaurantId: row.restaurant_id,
    restaurantName: row.restaurant_name,
    frequency: row.frequency_per_week,
    originalMealId: row.original_meal_id,
    originalMealName: row.original_meal_name,
    swapMealId: row.swap_meal_id,
    swapMealName: row.swap_meal_name,
    calSavedPerOrder: row.cal_saved_per_order,
    weeklyCalSaved: row.weekly_cal_saved,
    savedAt: row.saved_at,
  }));
}

export function toProfileView(profile: ProfileRow): JumperProfileView {
  return {
    id: profile.id,
    name: profile.client_name,
  };
}
