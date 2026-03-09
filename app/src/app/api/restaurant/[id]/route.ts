import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "..", "bulletproof_body.db");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const db = new Database(DB_PATH, { readonly: true });

    // Get restaurant
    const restaurant = db.prepare(
      "SELECT * FROM restaurants WHERE id = ?"
    ).get(id) as Record<string, unknown> | undefined;

    if (!restaurant) {
      db.close();
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    // Get containers (meal types / portion sizes)
    const containers = db.prepare(
      "SELECT * FROM restaurant_containers WHERE restaurant_id = ? ORDER BY display_order"
    ).all(id);

    // Get categories ordered
    const categories = db.prepare(
      "SELECT * FROM menu_categories WHERE restaurant_id = ? ORDER BY display_order"
    ).all(id);

    // Get all ingredients grouped by category
    const ingredients = db.prepare(
      "SELECT * FROM ingredients WHERE restaurant_id = ? ORDER BY category_id, name"
    ).all(id);

    // Get template meals with their ingredients
    const meals = db.prepare(
      "SELECT * FROM template_meals WHERE restaurant_id = ? ORDER BY is_swap, CASE source WHEN 'eamon' THEN 0 ELSE 1 END, display_order"
    ).all(id) as Array<Record<string, unknown>>;

    const mealsWithIngredients = meals.map((meal) => {
      const mealIngredients = db.prepare(`
        SELECT i.*, tmi.quantity
        FROM template_meal_ingredients tmi
        JOIN ingredients i ON i.id = tmi.ingredient_id
        WHERE tmi.template_meal_id = ?
      `).all(meal.id);

      const ings = mealIngredients as Array<Record<string, number>>;
      const totalCalories = ings.reduce(
        (sum, ing) => sum + (ing.calories ?? 0) * (ing.quantity ?? 1), 0
      );
      const totalProtein = ings.reduce(
        (sum, ing) => sum + (ing.protein_g ?? 0) * (ing.quantity ?? 1), 0
      );
      const totalFat = ings.reduce(
        (sum, ing) => sum + (ing.total_fat_g ?? 0) * (ing.quantity ?? 1), 0
      );
      const totalCarbs = ings.reduce(
        (sum, ing) => sum + (ing.carbohydrate_g ?? 0) * (ing.quantity ?? 1), 0
      );

      // Convert asset path to public URL
      const spritePath = meal.sprite_path as string | null;
      const spriteUrl = spritePath
        ? `/sprites/${spritePath.split("/").pop()}`
        : null;

      return {
        ...meal,
        sprite_url: spriteUrl,
        ingredients: mealIngredients,
        totals: {
          calories: totalCalories,
          protein: totalProtein,
          fat: totalFat,
          carbs: totalCarbs,
        },
      };
    });

    db.close();

    return NextResponse.json({
      restaurant,
      containers,
      categories,
      ingredients,
      meals: mealsWithIngredients,
    });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to load restaurant data" },
      { status: 500 }
    );
  }
}
