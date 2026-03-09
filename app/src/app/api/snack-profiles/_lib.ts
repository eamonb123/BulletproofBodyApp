import Database from "better-sqlite3";
import path from "path";
import { buildInstacartSearchUrl, buildWalmartSearchUrl } from "@/lib/shopLinks";

const DB_PATH = path.join(process.cwd(), "..", "bulletproof_body.db");

export interface SnackItemView {
  id: string;
  name: string;
  brand: string;
  serving: string;
  calories: number;
  protein: number;
  sugar: number;
  carbs: number;
  fat: number;
  image_url: string | null;
  instacart_url: string;
  walmart_url: string;
}

export interface SnackSwapView {
  id: string;
  title: string;
  context: string;
  craving: string;
  rationale: string;
  original: SnackItemView;
  swap: SnackItemView;
}

export interface ClientSnackRowView {
  id: number;
  frequency_per_week: number;
  display_order: number;
  snack_swap_id: string;
  swap: SnackSwapView;
}

interface SnackSwapRow {
  row_id: number;
  frequency_per_week: number;
  display_order: number;
  snack_swap_id: string;
  swap_id: string;
  title: string;
  context: string;
  craving: string;
  rationale: string;
  original_id: string;
  original_name: string;
  original_brand: string;
  original_serving: string;
  original_calories: number;
  original_protein_g: number;
  original_sugar_g: number | null;
  original_carbs_g: number;
  original_fat_g: number;
  original_image_path: string | null;
  swap_item_id: string;
  swap_name: string;
  swap_brand: string;
  swap_serving: string;
  swap_calories: number;
  swap_protein_g: number;
  swap_sugar_g: number | null;
  swap_carbs_g: number;
  swap_fat_g: number;
  swap_image_path: string | null;
}

export function getDb(options?: { readonly?: boolean }) {
  const db = new Database(DB_PATH, { readonly: options?.readonly ?? false });
  db.pragma("foreign_keys = ON");
  return db;
}

export function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function toImageUrl(imagePath: string | null): string | null {
  if (!imagePath) return null;
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }
  return `/snacks/${imagePath.split("/").pop()}`;
}

export function loadClientSnackRows(
  db: Database.Database,
  profileId: string
): ClientSnackRowView[] {
  const rows = db
    .prepare(
      `
      SELECT
        csr.id AS row_id,
        csr.frequency_per_week,
        csr.display_order,
        csr.snack_swap_id,
        ss.id AS swap_id,
        ss.title,
        ss.context,
        ss.craving,
        ss.rationale,
        o.id AS original_id,
        o.name AS original_name,
        o.brand AS original_brand,
        o.serving AS original_serving,
        o.calories AS original_calories,
        o.protein_g AS original_protein_g,
        o.sugar_g AS original_sugar_g,
        o.carbs_g AS original_carbs_g,
        o.fat_g AS original_fat_g,
        o.image_path AS original_image_path,
        s.id AS swap_item_id,
        s.name AS swap_name,
        s.brand AS swap_brand,
        s.serving AS swap_serving,
        s.calories AS swap_calories,
        s.protein_g AS swap_protein_g,
        s.sugar_g AS swap_sugar_g,
        s.carbs_g AS swap_carbs_g,
        s.fat_g AS swap_fat_g,
        s.image_path AS swap_image_path
      FROM client_snack_rows csr
      JOIN snack_swaps ss ON ss.id = csr.snack_swap_id
      JOIN snack_items o ON o.id = ss.original_snack_id
      JOIN snack_items s ON s.id = ss.swap_snack_id
      WHERE csr.profile_id = ?
      ORDER BY csr.display_order ASC, csr.id ASC
      `
    )
    .all(profileId) as SnackSwapRow[];

  return rows.map((row) => ({
    id: row.row_id,
    frequency_per_week: row.frequency_per_week,
    display_order: row.display_order,
    snack_swap_id: row.snack_swap_id,
    swap: {
      id: row.swap_id,
      title: row.title,
      context: row.context,
      craving: row.craving,
      rationale: row.rationale,
      original: {
        id: row.original_id,
        name: row.original_name,
        brand: row.original_brand,
        serving: row.original_serving,
        calories: row.original_calories,
        protein: row.original_protein_g,
        sugar: row.original_sugar_g ?? 0,
        carbs: row.original_carbs_g,
        fat: row.original_fat_g,
        image_url: toImageUrl(row.original_image_path),
        instacart_url: buildInstacartSearchUrl(
          row.original_brand,
          row.original_name
        ),
        walmart_url: buildWalmartSearchUrl(row.original_brand, row.original_name),
      },
      swap: {
        id: row.swap_item_id,
        name: row.swap_name,
        brand: row.swap_brand,
        serving: row.swap_serving,
        calories: row.swap_calories,
        protein: row.swap_protein_g,
        sugar: row.swap_sugar_g ?? 0,
        carbs: row.swap_carbs_g,
        fat: row.swap_fat_g,
        image_url: toImageUrl(row.swap_image_path),
        instacart_url: buildInstacartSearchUrl(row.swap_brand, row.swap_name),
        walmart_url: buildWalmartSearchUrl(row.swap_brand, row.swap_name),
      },
    },
  }));
}
