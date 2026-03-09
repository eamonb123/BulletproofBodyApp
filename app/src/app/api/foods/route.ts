import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import { DB_PATH } from "@/lib/db";

function getDb() {
  return new Database(DB_PATH, { readonly: true });
}

export async function GET() {
  try {
    const db = getDb();

    const foods = db
      .prepare("SELECT * FROM food_items ORDER BY name")
      .all();

    const swaps = db
      .prepare(`
        SELECT fs.*,
          fo.name as original_name, fo.restaurant as original_restaurant,
          fo.calories as original_calories, fo.emoji as original_emoji,
          fo.serving as original_serving, fo.protein_g as original_protein,
          fo.cuisine as original_cuisine,
          sw.name as swap_name, sw.restaurant as swap_restaurant,
          sw.calories as swap_calories, sw.emoji as swap_emoji,
          sw.serving as swap_serving, sw.protein_g as swap_protein,
          sw.cuisine as swap_cuisine
        FROM food_swaps fs
        JOIN food_items fo ON fs.original_id = fo.id
        JOIN food_items sw ON fs.swap_id = sw.id
        ORDER BY fs.calorie_savings DESC
      `)
      .all();

    db.close();

    return NextResponse.json({ foods, swaps });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to load foods" },
      { status: 500 }
    );
  }
}
