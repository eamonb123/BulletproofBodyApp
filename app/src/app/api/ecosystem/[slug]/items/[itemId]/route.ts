import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import { DB_PATH } from "@/lib/db";

// Allow large request bodies (base64 images can be several MB)
export const maxDuration = 30;
export const dynamic = "force-dynamic";

interface ProfileRow {
  id: string;
}

interface EcosystemItemRow {
  id: number;
  profile_id: string;
}

const UPDATABLE_FIELDS = new Set([
  "category",
  "item_state",
  "original_name",
  "original_brand",
  "original_calories",
  "original_protein_g",
  "original_carbs_g",
  "original_fat_g",
  "original_serving",
  "original_image_url",
  "swap_name",
  "swap_brand",
  "swap_calories",
  "swap_protein_g",
  "swap_carbs_g",
  "swap_fat_g",
  "swap_serving",
  "swap_image_url",
  "swap_instacart_url",
  "swap_walmart_url",
  "frequency_per_week",
  "client_context",
  "why_they_eat_it",
  "coach_note",
  "education_text",
  "client_photo_url",
  "client_comment",
  "comment_date",
  "coach_analysis",
  "meal_time",
  "swap_education_text",
  "suggested_swaps_json",
  "is_toggled_on",
  "is_approved",
  "display_order",
  "item_source",
]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; itemId: string }> }
) {
  const { slug, itemId } = await params;

  try {
    const body = await request.json();
    const db = new Database(DB_PATH);

    // Verify profile + item ownership
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

    const existing = db
      .prepare(
        "SELECT id, profile_id FROM ecosystem_items WHERE id = ? AND profile_id = ?"
      )
      .get(itemId, profile.id) as EcosystemItemRow | undefined;

    if (!existing) {
      db.close();
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      );
    }

    // Build dynamic SET clause from provided fields
    const setClauses: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(body)) {
      if (UPDATABLE_FIELDS.has(key)) {
        setClauses.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (setClauses.length === 0) {
      db.close();
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    setClauses.push("updated_at = datetime('now')");
    values.push(itemId, profile.id);

    db.prepare(
      `UPDATE ecosystem_items SET ${setClauses.join(", ")}
       WHERE id = ? AND profile_id = ?`
    ).run(...values);

    const updated = db
      .prepare("SELECT * FROM ecosystem_items WHERE id = ?")
      .get(itemId);

    db.close();

    return NextResponse.json({ item: updated });
  } catch (error) {
    console.error("Failed to update ecosystem item:", error);
    return NextResponse.json(
      { error: "Failed to update ecosystem item" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string; itemId: string }> }
) {
  const { slug, itemId } = await params;

  try {
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

    const result = db
      .prepare(
        "DELETE FROM ecosystem_items WHERE id = ? AND profile_id = ?"
      )
      .run(itemId, profile.id);

    db.close();

    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Failed to delete ecosystem item:", error);
    return NextResponse.json(
      { error: "Failed to delete ecosystem item" },
      { status: 500 }
    );
  }
}
