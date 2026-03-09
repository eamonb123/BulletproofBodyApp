import { NextResponse } from "next/server";
import { findJumperProfileById, getDb, loadJumperPlanRows } from "../../_lib";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: profileId } = await params;

  try {
    const db = getDb({ readonly: true });
    const profile = findJumperProfileById(db, profileId);
    if (!profile) {
      db.close();
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const planRows = loadJumperPlanRows(db, profileId);
    db.close();
    return NextResponse.json({ planRows });
  } catch (error) {
    console.error("Failed to load jumper plan rows:", error);
    return NextResponse.json(
      { error: "Failed to load jumper plan rows" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: profileId } = await params;

  try {
    const body = (await request.json()) as {
      restaurantId?: string;
      restaurantName?: string;
      frequency?: number;
      originalMealId?: string;
      originalMealName?: string;
      swapMealId?: string;
      swapMealName?: string;
      calSavedPerOrder?: number;
      weeklyCalSaved?: number;
    };

    const restaurantId = body.restaurantId?.trim() ?? "";
    const restaurantName = body.restaurantName?.trim() ?? "";
    const originalMealId = body.originalMealId?.trim() ?? "";
    const originalMealName = body.originalMealName?.trim() ?? "";
    const swapMealId = body.swapMealId?.trim() ?? "";
    const swapMealName = body.swapMealName?.trim() ?? "";
    const frequency = Math.max(1, Math.min(7, Math.round(body.frequency ?? 4)));
    const calSavedPerOrder = Math.max(
      0,
      Math.round(body.calSavedPerOrder ?? 0)
    );
    const weeklyCalSaved = Math.max(0, Math.round(body.weeklyCalSaved ?? 0));

    if (
      !restaurantId ||
      !restaurantName ||
      !originalMealId ||
      !originalMealName ||
      !swapMealId ||
      !swapMealName
    ) {
      return NextResponse.json(
        {
          error:
            "Fields restaurantId, restaurantName, originalMealId, originalMealName, swapMealId, and swapMealName are required",
        },
        { status: 400 }
      );
    }

    const db = getDb();
    const profile = findJumperProfileById(db, profileId);
    if (!profile) {
      db.close();
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    db.prepare(
      `
      INSERT INTO client_jumper_plan_rows (
        profile_id,
        restaurant_id,
        restaurant_name,
        frequency_per_week,
        original_meal_id,
        original_meal_name,
        swap_meal_id,
        swap_meal_name,
        cal_saved_per_order,
        weekly_cal_saved,
        saved_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(profile_id, restaurant_id, original_meal_id, swap_meal_id) DO UPDATE SET
        restaurant_name = excluded.restaurant_name,
        frequency_per_week = excluded.frequency_per_week,
        original_meal_name = excluded.original_meal_name,
        swap_meal_name = excluded.swap_meal_name,
        cal_saved_per_order = excluded.cal_saved_per_order,
        weekly_cal_saved = excluded.weekly_cal_saved,
        saved_at = CURRENT_TIMESTAMP
      `
    ).run(
      profileId,
      restaurantId,
      restaurantName,
      frequency,
      originalMealId,
      originalMealName,
      swapMealId,
      swapMealName,
      calSavedPerOrder,
      weeklyCalSaved
    );

    const planRows = loadJumperPlanRows(db, profileId);
    db.close();
    return NextResponse.json({ planRows });
  } catch (error) {
    console.error("Failed to save jumper plan row:", error);
    return NextResponse.json(
      { error: "Failed to save jumper plan row" },
      { status: 500 }
    );
  }
}
