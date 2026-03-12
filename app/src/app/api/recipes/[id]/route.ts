import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import { DB_PATH } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const db = new Database(DB_PATH, { readonly: true });

    const recipe = db.prepare("SELECT * FROM recipes WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!recipe) {
      db.close();
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const original = db.prepare(
      "SELECT * FROM recipe_ingredients WHERE recipe_id = ? AND is_swap = 0 ORDER BY display_order"
    ).all(id) as Record<string, unknown>[];

    const swap = db.prepare(
      "SELECT * FROM recipe_ingredients WHERE recipe_id = ? AND is_swap = 1 ORDER BY display_order"
    ).all(id) as Record<string, unknown>[];

    db.close();

    return NextResponse.json({ recipe, original, swap });
  } catch (error) {
    console.error("GET /api/recipes/[id] error:", error);
    return NextResponse.json({ error: "Failed to load recipe" }, { status: 500 });
  }
}
