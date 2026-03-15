import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import { DB_PATH } from "@/lib/db";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await request.json();

  try {
    const db = new Database(DB_PATH);

    const profile = db
      .prepare("SELECT id FROM ecosystem_profiles WHERE slug = ?")
      .get(slug) as { id: string } | undefined;

    if (!profile) {
      db.close();
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    const allowed: Record<string, string> = {
      current_weight_lbs: "REAL",
      goal_weight_lbs: "REAL",
      rmr: "REAL",
      daily_calorie_target: "REAL",
      steps_per_day: "INTEGER",
      workouts_per_week: "INTEGER",
      cardio_minutes_per_week: "INTEGER",
      protein_target_g: "INTEGER",
    };

    for (const [key, _type] of Object.entries(allowed)) {
      if (body[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(body[key]);
      }
    }

    if (fields.length === 0) {
      db.close();
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    fields.push("updated_at = datetime('now')");
    values.push(slug);

    db.prepare(
      `UPDATE ecosystem_profiles SET ${fields.join(", ")} WHERE slug = ?`
    ).run(...values);

    db.close();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to save settings:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
