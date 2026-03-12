import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import { DB_PATH } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    const db = new Database(DB_PATH, { readonly: true });

    const recipes = db.prepare(`
      SELECT r.id, r.name, r.emoji, r.category, r.image_url,
        (SELECT SUM(ri.calories) FROM recipe_ingredients ri WHERE ri.recipe_id = r.id AND ri.is_swap = 0) as original_calories,
        (SELECT SUM(ri.calories) FROM recipe_ingredients ri WHERE ri.recipe_id = r.id AND ri.is_swap = 1) as swap_calories,
        (SELECT SUM(ri.protein_g) FROM recipe_ingredients ri WHERE ri.recipe_id = r.id AND ri.is_swap = 0) as original_protein,
        (SELECT SUM(ri.protein_g) FROM recipe_ingredients ri WHERE ri.recipe_id = r.id AND ri.is_swap = 1) as swap_protein
      FROM recipes r
      ORDER BY r.name
    `).all();

    db.close();

    return NextResponse.json({ recipes });
  } catch (error) {
    console.error("GET /api/recipes error:", error);
    return NextResponse.json({ error: "Failed to load recipes" }, { status: 500 });
  }
}
