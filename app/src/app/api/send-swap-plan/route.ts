import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import { DB_PATH } from "@/lib/db";
import { randomUUID } from "crypto";

function getDb() {
  const db = new Database(DB_PATH);
  // Ensure leads table exists with current schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      current_weight REAL,
      goal_weight REAL,
      cal_saved_per_order INTEGER,
      lbs_per_week REAL,
      weeks_to_goal INTEGER,
      target_date TEXT,
      orders_per_week INTEGER,
      swap_name TEXT,
      restaurant_name TEXT,
      completed_meals TEXT,
      session_total_savings INTEGER,
      email_sent INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Migrate: add columns that may be missing from older schema
  const cols = (db.prepare("PRAGMA table_info(leads)").all() as { name: string }[]).map((c) => c.name);
  if (!cols.includes("restaurant_name")) {
    db.exec("ALTER TABLE leads ADD COLUMN restaurant_name TEXT");
  }
  return db;
}

interface CompletedMeal {
  restaurant: string;
  mealType: string;
  orderCalories: number;
  swapCalories: number;
  savings: number;
  swapName: string;
}

function buildEmailHtml(data: {
  email: string;
  currentWeight: number;
  goalWeight: number;
  calSavedPerOrder: number;
  lbsPerWeek: number;
  weeksToGoal: number;
  targetDate: string;
  ordersPerWeek: number;
  swapName: string;
  restaurantName: string;
  completedMeals: CompletedMeal[];
  sessionTotalSavings: number;
}): string {
  const restaurant = data.restaurantName || "your restaurant";
  const avgRestaurants = 4;
  const multipliedLbs = (data.lbsPerWeek * avgRestaurants).toFixed(1);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; color: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 520px; margin: 0 auto; padding: 40px 24px;">

    <!-- Headline -->
    <h1 style="font-size: 26px; font-weight: 700; line-height: 1.3; margin-bottom: 24px; color: #111;">
      That one swap just changed the math.
    </h1>

    <!-- The proof -->
    <p style="font-size: 16px; color: #444; line-height: 1.8; margin-bottom: 12px;">
      You picked your usual order at ${restaurant}. <strong style="color: #111;">${data.swapName || "Your meal"}</strong>.
    </p>
    <p style="font-size: 16px; color: #444; line-height: 1.8; margin-bottom: 12px;">
      Then you saw the swap. Same restaurant. Same vibe. <strong style="color: #059669;">${data.calSavedPerOrder} fewer calories.</strong>
    </p>
    <p style="font-size: 16px; color: #444; line-height: 1.8; margin-bottom: 32px;">
      At ${data.ordersPerWeek}x a week, that&rsquo;s <strong style="color: #059669;">${data.lbsPerWeek.toFixed(1)} lbs of fat per week</strong> just from ordering smarter at one spot.
    </p>

    <!-- Projection -->
    <div style="background: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 16px; padding: 28px; text-align: center; margin-bottom: 32px;">
      <p style="font-size: 12px; color: #6b7280; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;">Your timeline</p>
      <p style="font-size: 32px; font-weight: 700; color: #059669; margin: 0;">${data.goalWeight} lbs</p>
      <p style="font-size: 17px; font-weight: 600; color: #111; margin: 6px 0 0 0;">by ${data.targetDate}</p>
    </div>

    <!-- The Gap -->
    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 16px; padding: 24px; margin-bottom: 32px;">
      <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 12px 0; color: #111;">But here&rsquo;s the thing.</h2>
      <p style="font-size: 15px; color: #444; line-height: 1.8; margin: 0 0 16px 0;">
        That was one restaurant. You probably eat at 4 or 5 different places every week. Each one has the same kind of hidden calories. The sauces, the sides, the add-ons nobody thinks about.
      </p>
      <p style="font-size: 15px; color: #444; line-height: 1.8; margin: 0;">
        If you optimized all of them? That ${data.lbsPerWeek.toFixed(1)} lbs/week becomes <strong style="color: #059669;">${multipliedLbs} lbs/week.</strong>
      </p>
    </div>

    <!-- CTA -->
    <div style="text-align: center; margin-bottom: 32px;">
      <p style="font-size: 15px; color: #444; margin: 0 0 20px 0; line-height: 1.8;">
        I made a 35-minute video that breaks down exactly how we find every hidden calorie in your week and build a system around the food you already love. No meal prep. No restriction. Just math.
      </p>
      <a href="https://bulletproofbody.ai/vsl" style="display: inline-block; background: #059669; color: #fff; font-weight: 600; font-size: 16px; padding: 16px 36px; border-radius: 12px; text-decoration: none;">
        Watch the video
      </a>
    </div>

    <!-- P.S. -->
    <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; margin-bottom: 24px;">
      <p style="font-size: 14px; color: #666; line-height: 1.7;">
        <strong style="color: #333;">P.S.</strong> Reply to this email with your top 3 takeout spots and I&rsquo;ll tell you exactly where the calories are hiding.
      </p>
    </div>

    <!-- Sign off -->
    <div style="margin-bottom: 32px;">
      <p style="font-size: 15px; color: #333; margin: 0;">Eamon</p>
      <p style="font-size: 13px; color: #888; margin: 4px 0 0 0;">CEO, Bulletproof Body</p>
    </div>

    <!-- Footer -->
    <div style="padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 11px; color: #999; text-align: center;">
        Bulletproof Body
        <br>
        <a href="{unsubscribe_url}" style="color: #999;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const db = getDb();

    // Save lead
    const id = randomUUID();
    db.prepare(`
      INSERT INTO leads (id, email, current_weight, goal_weight, cal_saved_per_order,
        lbs_per_week, weeks_to_goal, target_date, orders_per_week, swap_name,
        restaurant_name, completed_meals, session_total_savings)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.email,
      data.currentWeight,
      data.goalWeight,
      data.calSavedPerOrder,
      data.lbsPerWeek,
      data.weeksToGoal,
      data.targetDate,
      data.ordersPerWeek,
      data.swapName,
      data.restaurantName || "",
      JSON.stringify(data.completedMeals || []),
      data.sessionTotalSavings || 0
    );

    db.close();

    // Send email via Resend if API key is configured
    let emailSent = false;
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        const html = buildEmailHtml(data);
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Bulletproof Body <swaps@bulletproofbody.ai>",
            to: data.email,
            subject: `You just found ${data.calSavedPerOrder} hidden calories at ${data.restaurantName || "your restaurant"}`,
            html,
          }),
        });
        emailSent = res.ok;
      } catch (e) {
        console.error("Resend error:", e);
      }

      // Update email_sent status
      if (emailSent) {
        const db2 = getDb();
        db2.prepare("UPDATE leads SET email_sent = 1 WHERE id = ?").run(id);
        db2.close();
      }
    }

    return NextResponse.json({
      status: "saved",
      lead_id: id,
      email_sent: emailSent,
    });
  } catch (error) {
    console.error("Send swap plan error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
