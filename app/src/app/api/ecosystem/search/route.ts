import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import { DB_PATH } from "@/lib/db";
import {
  buildInstacartSearchUrl,
  buildWalmartSearchUrl,
} from "@/lib/shopLinks";

interface SnackSearchRow {
  snack_swap_id: string;
  title: string;
  context: string;
  craving: string;
  rationale: string;
  original_name: string;
  original_brand: string;
  original_serving: string;
  original_calories: number;
  original_protein_g: number;
  original_carbs_g: number;
  original_fat_g: number;
  original_image_path: string | null;
  swap_name: string;
  swap_brand: string;
  swap_serving: string;
  swap_calories: number;
  swap_protein_g: number;
  swap_carbs_g: number;
  swap_fat_g: number;
  swap_image_path: string | null;
}

interface MealSearchRow {
  template_meal_id: string;
  name: string;
  description: string | null;
  meal_type: string | null;
  is_swap: number;
  swap_for: string | null;
  swap_rationale: string | null;
  restaurant_name: string;
  logo_emoji: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
}

function toImageUrl(imagePath: string | null): string | null {
  if (!imagePath) return null;
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }
  if (imagePath.includes("/")) return `/${imagePath}`;
  return `/snacks/${imagePath}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (!q) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  try {
    const db = new Database(DB_PATH, { readonly: true });
    const like = `%${q}%`;

    // ── Search snack_swaps ──────────────────────────
    const snackRows = db
      .prepare(
        `SELECT
          ss.id AS snack_swap_id,
          ss.title, ss.context, ss.craving, ss.rationale,
          o.name AS original_name, o.brand AS original_brand,
          o.serving AS original_serving, o.calories AS original_calories,
          o.protein_g AS original_protein_g, o.carbs_g AS original_carbs_g,
          o.fat_g AS original_fat_g, o.image_path AS original_image_path,
          s.name AS swap_name, s.brand AS swap_brand,
          s.serving AS swap_serving, s.calories AS swap_calories,
          s.protein_g AS swap_protein_g, s.carbs_g AS swap_carbs_g,
          s.fat_g AS swap_fat_g, s.image_path AS swap_image_path
        FROM snack_swaps ss
        JOIN snack_items o ON o.id = ss.original_snack_id
        JOIN snack_items s ON s.id = ss.swap_snack_id
        WHERE ss.is_active = 1
          AND o.is_active = 1
          AND s.is_active = 1
          AND (
            ss.title LIKE ?
            OR o.name LIKE ?
            OR o.brand LIKE ?
            OR s.name LIKE ?
            OR s.brand LIKE ?
            OR ss.craving LIKE ?
            OR ss.rationale LIKE ?
          )
        ORDER BY ss.display_order ASC, ss.title ASC
        LIMIT 20`
      )
      .all(like, like, like, like, like, like, like) as SnackSearchRow[];

    const snacks = snackRows.map((row) => ({
      type: "snack" as const,
      snack_swap_id: row.snack_swap_id,
      title: row.title,
      context: row.context,
      craving: row.craving,
      rationale: row.rationale,
      original: {
        name: row.original_name,
        brand: row.original_brand,
        serving: row.original_serving,
        calories: row.original_calories,
        protein_g: row.original_protein_g,
        carbs_g: row.original_carbs_g,
        fat_g: row.original_fat_g,
        image_url: toImageUrl(row.original_image_path),
      },
      swap: {
        name: row.swap_name,
        brand: row.swap_brand,
        serving: row.swap_serving,
        calories: row.swap_calories,
        protein_g: row.swap_protein_g,
        carbs_g: row.swap_carbs_g,
        fat_g: row.swap_fat_g,
        image_url: toImageUrl(row.swap_image_path),
        instacart_url: buildInstacartSearchUrl(row.swap_brand, row.swap_name),
        walmart_url: buildWalmartSearchUrl(row.swap_brand, row.swap_name),
      },
    }));

    // ── Search template_meals ───────────────────────
    const mealRows = db
      .prepare(
        `SELECT
          tm.id AS template_meal_id,
          tm.name, tm.description, tm.meal_type,
          tm.is_swap, tm.swap_for, tm.swap_rationale,
          r.name AS restaurant_name, r.logo_emoji,
          SUM(i.calories * tmi.quantity) AS total_calories,
          SUM(i.protein_g * tmi.quantity) AS total_protein_g,
          SUM(i.carbohydrate_g * tmi.quantity) AS total_carbs_g,
          SUM(i.total_fat_g * tmi.quantity) AS total_fat_g
        FROM template_meals tm
        JOIN restaurants r ON r.id = tm.restaurant_id
        JOIN template_meal_ingredients tmi ON tmi.template_meal_id = tm.id
        JOIN ingredients i ON i.id = tmi.ingredient_id
        WHERE
          tm.name LIKE ?
          OR tm.description LIKE ?
          OR r.name LIKE ?
        GROUP BY tm.id
        ORDER BY tm.display_order ASC, tm.name ASC
        LIMIT 20`
      )
      .all(like, like, like) as MealSearchRow[];

    const meals = mealRows.map((row) => ({
      type: "meal" as const,
      template_meal_id: row.template_meal_id,
      name: row.name,
      description: row.description,
      meal_type: row.meal_type,
      is_swap: row.is_swap,
      swap_for: row.swap_for,
      swap_rationale: row.swap_rationale,
      restaurant: {
        name: row.restaurant_name,
        emoji: row.logo_emoji,
      },
      nutrition: {
        calories: Math.round(row.total_calories),
        protein_g: Math.round(row.total_protein_g * 10) / 10,
        carbs_g: Math.round(row.total_carbs_g * 10) / 10,
        fat_g: Math.round(row.total_fat_g * 10) / 10,
      },
    }));

    db.close();

    return NextResponse.json({ snacks, meals });
  } catch (error) {
    console.error("Ecosystem search failed:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
