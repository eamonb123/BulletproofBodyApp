import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import { DB_PATH } from "@/lib/db";
import { randomUUID } from "crypto";

function getDb() {
  return new Database(DB_PATH);
}

// POST /api/session — Create or update a user session
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = getDb();

    const {
      session_id,
      age,
      weight_lbs,
      height_inches,
      gender,
      goal_weight_lbs,
      rmr,
      tdee,
      daily_deficit,
      weekly_fat_loss_lbs,
      projected_goal_date,
      email,
      phone,
      selections,
      utm_source,
      utm_medium,
      utm_campaign,
    } = body;

    const id = session_id || randomUUID();

    // Upsert session
    db.prepare(`
      INSERT INTO user_sessions (
        id, age, weight_lbs, height_inches, gender, goal_weight_lbs,
        rmr, tdee, daily_deficit, weekly_fat_loss_lbs, projected_goal_date,
        email, phone, utm_source, utm_medium, utm_campaign
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        age = COALESCE(excluded.age, age),
        weight_lbs = COALESCE(excluded.weight_lbs, weight_lbs),
        height_inches = COALESCE(excluded.height_inches, height_inches),
        gender = COALESCE(excluded.gender, gender),
        goal_weight_lbs = COALESCE(excluded.goal_weight_lbs, goal_weight_lbs),
        rmr = COALESCE(excluded.rmr, rmr),
        tdee = COALESCE(excluded.tdee, tdee),
        daily_deficit = COALESCE(excluded.daily_deficit, daily_deficit),
        weekly_fat_loss_lbs = COALESCE(excluded.weekly_fat_loss_lbs, weekly_fat_loss_lbs),
        projected_goal_date = COALESCE(excluded.projected_goal_date, projected_goal_date),
        email = COALESCE(excluded.email, email),
        phone = COALESCE(excluded.phone, phone),
        completed_at = CASE WHEN excluded.email IS NOT NULL THEN CURRENT_TIMESTAMP ELSE completed_at END
    `).run(
      id, age || null, weight_lbs || null, height_inches || null,
      gender || null, goal_weight_lbs || null,
      rmr || null, tdee || null, daily_deficit || null,
      weekly_fat_loss_lbs || null, projected_goal_date || null,
      email || null, phone || null,
      utm_source || null, utm_medium || null, utm_campaign || null
    );

    // Save selections if provided
    if (selections && Array.isArray(selections)) {
      const insert = db.prepare(`
        INSERT INTO user_selections (session_id, original_food_id, swap_food_id, step)
        VALUES (?, ?, ?, ?)
      `);

      // Clear previous selections for this session
      db.prepare("DELETE FROM user_selections WHERE session_id = ?").run(id);

      for (const sel of selections) {
        insert.run(id, sel.original_id, sel.swap_id, sel.step || 0);
      }
    }

    db.close();

    return NextResponse.json({ session_id: id, status: "saved" });
  } catch (error) {
    console.error("Session save error:", error);
    return NextResponse.json(
      { error: "Failed to save session" },
      { status: 500 }
    );
  }
}
