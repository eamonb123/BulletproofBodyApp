import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import { DB_PATH } from "@/lib/db";

// Allow large request bodies (base64 images can be several MB)
export const maxDuration = 30;
export const dynamic = "force-dynamic";
import {
  buildInstacartSearchUrl,
  buildWalmartSearchUrl,
} from "@/lib/shopLinks";

interface ProfileRow {
  id: string;
}

interface SnackSwapJoin {
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

interface TemplateMealJoin {
  name: string;
  description: string | null;
  restaurant_name: string;
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const body = await request.json();
    const db = new Database(DB_PATH);

    const profile = db
      .prepare("SELECT id FROM ecosystem_profiles WHERE slug = ?")
      .get(slug) as ProfileRow | undefined;

    if (!profile) {
      db.close();
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // Auto-populate from snack_swaps if snack_swap_id provided
    if (body.snack_swap_id) {
      const snack = db
        .prepare(
          `SELECT
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
          WHERE ss.id = ?`
        )
        .get(body.snack_swap_id) as SnackSwapJoin | undefined;

      if (snack) {
        body.original_name = body.original_name ?? snack.original_name;
        body.original_brand = body.original_brand ?? snack.original_brand;
        body.original_calories = body.original_calories ?? snack.original_calories;
        body.original_protein_g = body.original_protein_g ?? snack.original_protein_g;
        body.original_carbs_g = body.original_carbs_g ?? snack.original_carbs_g;
        body.original_fat_g = body.original_fat_g ?? snack.original_fat_g;
        body.original_serving = body.original_serving ?? snack.original_serving;
        body.original_image_url = body.original_image_url ?? toImageUrl(snack.original_image_path);
        body.swap_name = body.swap_name ?? snack.swap_name;
        body.swap_brand = body.swap_brand ?? snack.swap_brand;
        body.swap_calories = body.swap_calories ?? snack.swap_calories;
        body.swap_protein_g = body.swap_protein_g ?? snack.swap_protein_g;
        body.swap_carbs_g = body.swap_carbs_g ?? snack.swap_carbs_g;
        body.swap_fat_g = body.swap_fat_g ?? snack.swap_fat_g;
        body.swap_serving = body.swap_serving ?? snack.swap_serving;
        body.swap_image_url = body.swap_image_url ?? toImageUrl(snack.swap_image_path);
        body.coach_note = body.coach_note ?? snack.rationale;
        body.client_context = body.client_context ?? snack.context;
        // Generate shop links for the swap
        body.swap_instacart_url =
          body.swap_instacart_url ??
          buildInstacartSearchUrl(snack.swap_brand, snack.swap_name);
        body.swap_walmart_url =
          body.swap_walmart_url ??
          buildWalmartSearchUrl(snack.swap_brand, snack.swap_name);
      }
    }

    // Auto-populate from template_meals if template_meal_id provided
    if (body.template_meal_id) {
      const meal = db
        .prepare(
          `SELECT
            tm.name, tm.description,
            r.name AS restaurant_name,
            SUM(i.calories * tmi.quantity) AS total_calories,
            SUM(i.protein_g * tmi.quantity) AS total_protein_g,
            SUM(i.carbohydrate_g * tmi.quantity) AS total_carbs_g,
            SUM(i.total_fat_g * tmi.quantity) AS total_fat_g
          FROM template_meals tm
          JOIN restaurants r ON r.id = tm.restaurant_id
          JOIN template_meal_ingredients tmi ON tmi.template_meal_id = tm.id
          JOIN ingredients i ON i.id = tmi.ingredient_id
          WHERE tm.id = ?
          GROUP BY tm.id`
        )
        .get(body.template_meal_id) as TemplateMealJoin | undefined;

      if (meal) {
        body.original_name = body.original_name ?? meal.name;
        body.original_brand = body.original_brand ?? meal.restaurant_name;
        body.original_calories = body.original_calories ?? meal.total_calories;
        body.original_protein_g = body.original_protein_g ?? meal.total_protein_g;
        body.original_carbs_g = body.original_carbs_g ?? meal.total_carbs_g;
        body.original_fat_g = body.original_fat_g ?? meal.total_fat_g;

        // If this template meal is itself a swap, auto-populate swap fields
        // from the meal it swaps for (or vice versa)
        if (body.swap_name == null) {
          const swapMeal = db
            .prepare(
              `SELECT
                tm.name, tm.description,
                r.name AS restaurant_name,
                SUM(i.calories * tmi.quantity) AS total_calories,
                SUM(i.protein_g * tmi.quantity) AS total_protein_g,
                SUM(i.carbohydrate_g * tmi.quantity) AS total_carbs_g,
                SUM(i.total_fat_g * tmi.quantity) AS total_fat_g
              FROM template_meals tm
              JOIN restaurants r ON r.id = tm.restaurant_id
              JOIN template_meal_ingredients tmi ON tmi.template_meal_id = tm.id
              JOIN ingredients i ON i.id = tmi.ingredient_id
              WHERE tm.swap_for = ? AND tm.is_swap = 1
              GROUP BY tm.id
              LIMIT 1`
            )
            .get(body.template_meal_id) as TemplateMealJoin | undefined;

          if (swapMeal) {
            body.swap_name = swapMeal.name;
            body.swap_brand = swapMeal.restaurant_name;
            body.swap_calories = swapMeal.total_calories;
            body.swap_protein_g = swapMeal.total_protein_g;
            body.swap_carbs_g = swapMeal.total_carbs_g;
            body.swap_fat_g = swapMeal.total_fat_g;
          }
        }
      }
    }

    // Auto-populate swap_image_url from restaurant logo if swap is from a known restaurant
    if (body.swap_image_url == null && body.swap_brand) {
      try {
        // Try to find restaurant logo by brand name
        const brandSlug = (body.swap_brand as string).toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .replace(/\s+/g, '');
        const fs = require("fs");
        const path = require("path");
        const logoDir = path.resolve(process.cwd(), "public", "restaurant-logos");
        // Check for png, svg, jpg
        for (const ext of ["png", "svg", "jpg"]) {
          const logoPath = path.join(logoDir, `${brandSlug}.${ext}`);
          if (fs.existsSync(logoPath)) {
            body.swap_image_url = `/restaurant-logos/${brandSlug}.${ext}`;
            break;
          }
        }
      } catch {
        // Best effort
      }
    }

    // Auto-populate swap_education_text from template_meal_ingredients
    // This provides ingredient-level breakdown for the swap side of the card
    if (body.swap_education_text == null) {
      // Find the swap meal ID — either directly set or found via swap_for lookup
      const swapMealIdForIngredients = body.swap_template_meal_id || (() => {
        // If we have a template_meal_id for the original, check if there's a swap meal
        if (body.template_meal_id) {
          const swapMealRow = db
            .prepare("SELECT id FROM template_meals WHERE swap_for = ? AND is_swap = 1 LIMIT 1")
            .get(body.template_meal_id) as { id: string } | undefined;
          return swapMealRow?.id;
        }
        return undefined;
      })();

      if (swapMealIdForIngredients) {
        try {
          const ingredientRows = db
            .prepare(`
              SELECT i.name, ROUND(i.calories * tmi.quantity) AS cal
              FROM template_meal_ingredients tmi
              JOIN ingredients i ON i.id = tmi.ingredient_id
              WHERE tmi.template_meal_id = ?
              ORDER BY cal DESC
            `)
            .all(swapMealIdForIngredients) as Array<{ name: string; cal: number }>;

          if (ingredientRows.length > 0) {
            body.swap_education_text = ingredientRows
              .map((r) => `${r.name}: ${r.cal} cal`)
              .join("\n");
          }
        } catch {
          // Best effort
        }
      }
    }

    // Validate required fields
    if (!body.category || !body.original_name || body.original_calories == null) {
      db.close();
      return NextResponse.json(
        {
          error:
            "Fields 'category', 'original_name', and 'original_calories' are required",
        },
        { status: 400 }
      );
    }

    const result = db
      .prepare(
        `INSERT INTO ecosystem_items (
          profile_id, category, item_state,
          original_name, original_brand, original_calories,
          original_protein_g, original_carbs_g, original_fat_g,
          original_serving, original_image_url,
          swap_name, swap_brand, swap_calories,
          swap_protein_g, swap_carbs_g, swap_fat_g,
          swap_serving, swap_image_url,
          swap_instacart_url, swap_walmart_url,
          frequency_per_week, client_context, why_they_eat_it,
          coach_note, education_text,
          client_photo_url, client_comment, comment_date, coach_analysis,
          suggested_swaps_json,
          template_meal_id, snack_swap_id,
          is_toggled_on, is_approved, display_order,
          item_source
        ) VALUES (
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?,
          ?, ?,
          ?, ?, ?,
          ?, ?,
          ?, ?, ?, ?,
          ?,
          ?, ?,
          ?, ?, ?,
          ?
        )`
      )
      .run(
        profile.id,
        body.category,
        body.item_state ?? "swap",
        body.original_name,
        body.original_brand ?? null,
        body.original_calories,
        body.original_protein_g ?? 0,
        body.original_carbs_g ?? 0,
        body.original_fat_g ?? 0,
        body.original_serving ?? null,
        body.original_image_url ?? null,
        body.swap_name ?? null,
        body.swap_brand ?? null,
        body.swap_calories ?? null,
        body.swap_protein_g ?? 0,
        body.swap_carbs_g ?? 0,
        body.swap_fat_g ?? 0,
        body.swap_serving ?? null,
        body.swap_image_url ?? null,
        body.swap_instacart_url ?? null,
        body.swap_walmart_url ?? null,
        body.frequency_per_week ?? 3,
        body.client_context ?? null,
        body.why_they_eat_it ?? null,
        body.coach_note ?? null,
        body.education_text ?? null,
        body.client_photo_url ?? null,
        body.client_comment ?? null,
        body.comment_date ?? null,
        body.coach_analysis ?? null,
        body.suggested_swaps_json ?? null,
        body.template_meal_id ?? null,
        body.snack_swap_id ?? null,
        body.is_toggled_on ?? 1,
        body.is_approved ?? 0,
        body.display_order ?? 0,
        body.item_source ?? "logged"
      );

    const item = db
      .prepare("SELECT * FROM ecosystem_items WHERE id = ?")
      .get(result.lastInsertRowid) as Record<string, unknown>;

    db.close();

    // Auto-embed new item into ChromaDB (best-effort, non-blocking)
    try {
      const { execSync } = require("child_process");
      const projectRoot = require("path").resolve(process.cwd(), "..");
      const embedScript = `
import sys
sys.path.insert(0, '${projectRoot}')
from scripts.embed_foods import embed_single_item
embed_single_item(
    item_type='ecosystem_item',
    item_id='${result.lastInsertRowid}',
    name='${(body.original_name || "").replace(/'/g, "\\'")}',
    brand='${(body.original_brand || "").replace(/'/g, "\\'")}',
    calories=${body.original_calories || 0},
    protein_g=${body.original_protein_g || 0},
    carbs_g=${body.original_carbs_g || 0},
    fat_g=${body.original_fat_g || 0},
    serving='${(body.original_serving || "").replace(/'/g, "\\'")}',
    category='${(body.category || "").replace(/'/g, "\\'")}',
)
`.trim();
      execSync(`python3 -c "${embedScript.replace(/"/g, '\\"')}"`, {
        encoding: "utf-8",
        timeout: 10000,
        cwd: projectRoot,
        env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
      });
    } catch {
      // Embedding is best-effort — don't fail the API call
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("Failed to add ecosystem item:", error);
    return NextResponse.json(
      { error: "Failed to add ecosystem item" },
      { status: 500 }
    );
  }
}
