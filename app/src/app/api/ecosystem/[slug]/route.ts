import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import { DB_PATH } from "@/lib/db";

interface ProfileRow {
  id: string;
  slug: string;
  client_name: string;
  current_weight_lbs: number | null;
  goal_weight_lbs: number | null;
  height_inches: number | null;
  age: number | null;
  gender: string | null;
  rmr: number | null;
  daily_calorie_target: number | null;
  home_zip: string | null;
  work_zip: string | null;
  steps_per_day: number | null;
  workouts_per_week: number | null;
  cardio_minutes_per_week: number | null;
  workout_cal_per_session: number | null;
  protein_target_g: number | null;
  dream_weight_lbs: number | null;
  created_at: string;
  updated_at: string;
}

interface EcosystemItemRow {
  id: number;
  profile_id: string;
  category: string;
  item_state: string;
  original_name: string;
  original_brand: string | null;
  original_calories: number;
  original_protein_g: number;
  original_carbs_g: number;
  original_fat_g: number;
  original_serving: string | null;
  original_image_url: string | null;
  swap_name: string | null;
  swap_brand: string | null;
  swap_calories: number | null;
  swap_protein_g: number;
  swap_carbs_g: number;
  swap_fat_g: number;
  swap_serving: string | null;
  swap_image_url: string | null;
  swap_instacart_url: string | null;
  swap_walmart_url: string | null;
  frequency_per_week: number;
  client_context: string | null;
  why_they_eat_it: string | null;
  coach_note: string | null;
  education_text: string | null;
  template_meal_id: string | null;
  snack_swap_id: string | null;
  is_toggled_on: number;
  is_approved: number;
  display_order: number;
  created_at: string;
  updated_at: string;
}

function computeTotals(items: EcosystemItemRow[]) {
  let weeklyCaloriesSaved = 0;
  let weeklyProteinGained = 0;

  for (const item of items) {
    if (
      item.item_state === "swap" &&
      item.is_toggled_on &&
      item.swap_calories != null
    ) {
      const calDiff = item.original_calories - item.swap_calories;
      const protDiff = (item.swap_protein_g ?? 0) - (item.original_protein_g ?? 0);
      weeklyCaloriesSaved += calDiff * item.frequency_per_week;
      weeklyProteinGained += protDiff * item.frequency_per_week;
    }
  }

  // 3,500 kcal per pound of fat
  const weeklyFatLossLbs = weeklyCaloriesSaved / 3500;
  const monthlyFatLossLbs = weeklyFatLossLbs * 4.33;

  return {
    weekly_calories_saved: Math.round(weeklyCaloriesSaved),
    weekly_protein_gained_g: Math.round(weeklyProteinGained * 10) / 10,
    weekly_fat_loss_lbs: Math.round(weeklyFatLossLbs * 100) / 100,
    monthly_fat_loss_lbs: Math.round(monthlyFatLossLbs * 100) / 100,
    projected_90_day_lbs: Math.round(weeklyFatLossLbs * (90 / 7) * 100) / 100,
  };
}

function groupByCategory(items: EcosystemItemRow[]) {
  const groups: Record<string, EcosystemItemRow[]> = {};
  for (const item of items) {
    if (!groups[item.category]) groups[item.category] = [];
    groups[item.category].push(item);
  }
  return groups;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const db = new Database(DB_PATH, { readonly: true });

    const profile = db
      .prepare("SELECT * FROM ecosystem_profiles WHERE slug = ?")
      .get(slug) as ProfileRow | undefined;

    if (!profile) {
      db.close();
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    const items = db
      .prepare(
        `SELECT * FROM ecosystem_items
         WHERE profile_id = ?
         ORDER BY category, display_order, id`
      )
      .all(profile.id) as EcosystemItemRow[];

    db.close();

    const totals = computeTotals(items);
    const by_category = groupByCategory(items);

    return NextResponse.json({
      profile,
      items,
      by_category,
      totals,
    });
  } catch (error) {
    console.error("Failed to load ecosystem dashboard:", error);
    return NextResponse.json(
      { error: "Failed to load ecosystem dashboard" },
      { status: 500 }
    );
  }
}
