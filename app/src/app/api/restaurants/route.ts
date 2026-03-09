import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import { DB_PATH } from "@/lib/db";

interface RestaurantRow {
  id: string;
  name: string;
  logo_emoji: string;
  cuisine: string;
  website: string;
  nutrition_source: string;
  hero_image_path: string | null;
  created_at: string;
  ingredient_count: number;
  meal_count: number;
  swap_count: number;
}

export async function GET() {
  try {
    const db = new Database(DB_PATH, { readonly: true });
    const restaurants = db
      .prepare(
        `
      SELECT r.*,
        (SELECT COUNT(*) FROM ingredients WHERE restaurant_id = r.id) as ingredient_count,
        (SELECT COUNT(*) FROM template_meals WHERE restaurant_id = r.id AND is_swap = 0) as meal_count,
        (SELECT COUNT(*) FROM template_meals WHERE restaurant_id = r.id AND is_swap = 1) as swap_count
      FROM restaurants r
      ORDER BY r.name
    `
      )
      .all() as RestaurantRow[];

    const result = restaurants.map((r) => ({
      ...r,
      hero_url: r.hero_image_path
        ? `/sprites/${r.hero_image_path.split("/").pop()}`
        : null,
    }));

    db.close();
    return NextResponse.json({ restaurants: result });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to load restaurants" },
      { status: 500 }
    );
  }
}
