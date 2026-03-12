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

interface EmailData {
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
  originalCalories?: number;
  swapCalories?: number;
  completedMeals: CompletedMeal[];
  sessionTotalSavings: number;
  source?: string;
  recipeIngredients?: {
    original: { name: string; quantity: string; calories: number; protein_g: number }[];
    swap: { name: string; quantity: string; calories: number; protein_g: number }[];
  };
  videoUrl?: string;
}

function instacartLink(name: string): string {
  return `https://www.instacart.com/store/s?k=${encodeURIComponent(name)}`;
}

function buildRecipeEmailHtml(data: EmailData): string {
  data.calSavedPerOrder = Math.round(data.calSavedPerOrder);
  data.currentWeight = Math.round(data.currentWeight);
  data.goalWeight = Math.round(data.goalWeight);
  data.weeksToGoal = Math.round(data.weeksToGoal);
  const origCal = Math.round(data.originalCalories ?? 0);
  const swapCal = Math.round(data.swapCalories ?? 0);
  const savings = origCal - swapCal;
  const recipeName = data.restaurantName || data.swapName || "Your Recipe";
  const lbsPerWeek = data.lbsPerWeek?.toFixed?.(1) ?? "1.0";
  const multipliedLbs = (data.lbsPerWeek * 4).toFixed(1);

  const orig = data.recipeIngredients?.original ?? [];
  const swap = data.recipeIngredients?.swap ?? [];

  const origProtein = Math.round(orig.reduce((s, i) => s + (i.protein_g || 0), 0));
  const swapProtein = Math.round(swap.reduce((s, i) => s + (i.protein_g || 0), 0));
  const proteinDiff = swapProtein - origProtein;
  const proteinNote = proteinDiff > 0 ? ` (+${proteinDiff}g protein)` : "";

  // Build combined rows: Original → Swap → Saved (paired by display_order)
  const combinedRows = orig.map((o, idx) => {
    const s = swap[idx];
    const saved = s ? Math.round(o.calories) - Math.round(s.calories) : 0;
    const shopUrl = s ? instacartLink(s.name) : "";
    const isZeroCal = s?.calories === 0;
    return `<tr>
      <td style="padding: 10px 8px; font-size: 13px; border-bottom: 1px solid #f0f0f0;">
        <span style="color: #999; text-decoration: line-through;">${o.name}</span>
        <span style="color: #999; font-size: 12px;"> (${Math.round(o.calories)})</span>
        <br>
        <span style="color: #059669; font-weight: 600;">${s?.name ?? "—"}</span>
        <span style="color: #059669; font-size: 12px;"> ${s?.quantity ?? ""}</span>
        ${s && !isZeroCal ? `<a href="${shopUrl}" style="color: #059669; font-size: 10px; text-decoration: underline; margin-left: 4px;">Shop</a>` : ""}
      </td>
      <td style="padding: 10px 8px; font-size: 14px; color: #059669; font-weight: 700; text-align: center; border-bottom: 1px solid #f0f0f0; white-space: nowrap;">
        ${s ? Math.round(s.calories) : "—"} cal
      </td>
      <td style="padding: 10px 8px; font-size: 13px; font-weight: 600; text-align: right; border-bottom: 1px solid #f0f0f0; color: ${saved > 0 ? "#dc2626" : "#999"};">
        ${saved > 0 ? `-${saved}` : "0"}
      </td>
    </tr>`;
  }).join("");

  // "Order all" link — search for the main ingredient (highest cal swap item)
  const mainItem = [...swap].sort((a, b) => b.calories - a.calories)[0];
  const orderAllUrl = mainItem ? instacartLink(mainItem.name) : "https://www.instacart.com";

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
    <h1 style="font-size: 26px; font-weight: 700; line-height: 1.3; margin-bottom: 8px; color: #111;">
      Your ${recipeName} Recipe
    </h1>
    <p style="font-size: 16px; color: #059669; font-weight: 600; margin: 0 0 32px 0;">
      ${swapCal} calories &middot; ${swapProtein}g protein${proteinNote}
    </p>

    <!-- THE RECIPE: Combined Swap Table -->
    <div style="border: 2px solid #e5e7eb; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
      <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; margin: 0 0 4px 0; color: #111;">
        Your ${recipeName} — Optimized
      </p>
      <p style="font-size: 13px; color: #999; margin: 0 0 16px 0;">
        <span style="color: #999; text-decoration: line-through;">Old ingredient</span> → <span style="color: #059669; font-weight: 600;">New swap</span>
      </p>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="padding: 6px 8px; font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; text-align: left; border-bottom: 2px solid #e5e7eb;">Swap</th>
            <th style="padding: 6px 8px; font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; text-align: center; border-bottom: 2px solid #e5e7eb;">New Cal</th>
            <th style="padding: 6px 8px; font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; text-align: right; border-bottom: 2px solid #e5e7eb;">Saved</th>
          </tr>
        </thead>
        <tbody>
          ${combinedRows}
          <tr style="background: #f0fdf4;">
            <td style="padding: 12px 8px; font-size: 14px; font-weight: 700; color: #111; border-top: 2px solid #bbf7d0;">
              <span style="color: #999; font-weight: 400; font-size: 12px;">${origCal} cal →</span> <span style="color: #059669;">${swapCal} cal</span>
            </td>
            <td style="padding: 12px 8px; font-size: 16px; font-weight: 700; color: #059669; text-align: center; border-top: 2px solid #bbf7d0;">
              ${swapCal}
            </td>
            <td style="padding: 12px 8px; font-size: 16px; font-weight: 700; color: #dc2626; text-align: right; border-top: 2px solid #bbf7d0;">
              -${savings}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- How to make it -->
    <p style="font-size: 15px; color: #444; line-height: 1.7; margin-bottom: 24px;">
      <strong style="color: #111;">How to make it:</strong> Same method as regular ${recipeName.toLowerCase()}. Just swap the ingredients above. That&rsquo;s it.${data.videoUrl ? `
      <br/><br/>
      <a href="${data.videoUrl}" style="color: #059669; font-weight: 600; text-decoration: underline;">Watch me make it step by step →</a>` : ""}
    </p>

    <!-- Order CTA -->
    <div style="text-align: center; margin-bottom: 32px;">
      <a href="${orderAllUrl}" style="display: inline-block; background: #059669; color: #fff; font-weight: 600; font-size: 16px; padding: 16px 36px; border-radius: 12px; text-decoration: none;">
        🛒 Order ingredients on Instacart
      </a>
      <p style="font-size: 12px; color: #999; margin: 8px 0 0 0;">Delivered to your door. No store trip needed.</p>
    </div>

    <!-- The math -->
    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 16px; padding: 20px; text-align: center; margin-bottom: 24px;">
      <p style="font-size: 14px; color: #666; margin: 0 0 4px 0;">Same ${recipeName.toLowerCase()}. Same experience.</p>
      <p style="font-size: 28px; font-weight: 700; color: #059669; margin: 0;">${savings} fewer calories</p>
      <p style="font-size: 14px; color: #666; margin: 4px 0 0 0;">That&rsquo;s <strong style="color: #111;">${lbsPerWeek} lbs of fat per week</strong> just from breakfast.</p>
    </div>

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
        That was <strong style="color: #111;">one recipe</strong>. You probably cook 3 or 4 meals a week. Each one has the same kind of hidden calories &mdash; the oils, the bread, the syrups, the sauces nobody thinks about.
      </p>
      <p style="font-size: 15px; color: #444; line-height: 1.8; margin: 0;">
        If you optimized all of them? That ${lbsPerWeek} lbs/week becomes <strong style="color: #059669; font-size: 17px;">${multipliedLbs} lbs/week.</strong>
      </p>
    </div>

    <!-- VSL CTA -->
    <div style="text-align: center; margin-bottom: 32px;">
      <p style="font-size: 15px; color: #444; margin: 0 0 20px 0; line-height: 1.8;">
        I made a 35-minute video that breaks down exactly how we find every hidden calorie in your week and build a system around the food you already love. No meal prep. No restriction. Just math.
      </p>
      <a href="https://bulletproofbody.ai/vsl" style="display: inline-block; background: #111; color: #fff; font-weight: 600; font-size: 16px; padding: 16px 36px; border-radius: 12px; text-decoration: none;">
        Watch the video
      </a>
    </div>

    <!-- P.S. -->
    <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; margin-bottom: 24px;">
      <p style="font-size: 14px; color: #666; line-height: 1.7;">
        <strong style="color: #333;">P.S.</strong> Reply to this email with another recipe you make at home and I&rsquo;ll optimize it for you &mdash; ingredients, calories, shopping links, the whole thing.
      </p>
    </div>

    <!-- Sign off -->
    <div style="margin-bottom: 32px;">
      <p style="font-size: 15px; color: #333; margin: 0;">Eamon</p>
      <p style="font-size: 13px; color: #888; margin: 4px 0 0 0;">Bulletproof Body</p>
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

function buildEmailHtml(data: EmailData): string {
  // Sanitize all numbers — prevent floating point decimals in emails
  data.calSavedPerOrder = Math.round(data.calSavedPerOrder);
  data.currentWeight = Math.round(data.currentWeight);
  data.goalWeight = Math.round(data.goalWeight);
  data.weeksToGoal = Math.round(data.weeksToGoal);
  data.ordersPerWeek = Math.round(data.ordersPerWeek);
  if (data.originalCalories) data.originalCalories = Math.round(data.originalCalories);
  if (data.swapCalories) data.swapCalories = Math.round(data.swapCalories);
  if (data.sessionTotalSavings) data.sessionTotalSavings = Math.round(data.sessionTotalSavings);

  const source = data.source || "Fast Food Bible";
  const isSnack = source === "Snack Bible";
  const avgMultiplier = isSnack ? 4 : 4;
  const multipliedLbs = (data.lbsPerWeek * avgMultiplier).toFixed(1);

  // Source-specific copy
  const originalLabel = isSnack ? data.restaurantName : data.restaurantName || "your restaurant";
  const swapLabel = data.swapName || (isSnack ? "Your swap" : "Your meal");

  // Proof section — different for snack vs restaurant
  let proofHtml: string;
  if (isSnack) {
    const origCal = data.originalCalories ?? (data.calSavedPerOrder + (data.swapCalories ?? 0));
    const swapCal = data.swapCalories ?? (origCal - data.calSavedPerOrder);
    proofHtml = `
    <p style="font-size: 16px; color: #444; line-height: 1.8; margin-bottom: 12px;">
      Your usual snack: <strong style="color: #111;">${originalLabel}</strong> &mdash; ${origCal} calories.
    </p>
    <p style="font-size: 16px; color: #444; line-height: 1.8; margin-bottom: 12px;">
      We swapped it for <strong style="color: #111;">${swapLabel}</strong> &mdash; ${swapCal} calories. Same craving, same satisfaction. <strong style="color: #059669;">${data.calSavedPerOrder} fewer calories.</strong>
    </p>
    <p style="font-size: 16px; color: #444; line-height: 1.8; margin-bottom: 32px;">
      At ${data.ordersPerWeek}x a week, that&rsquo;s <strong style="color: #059669;">${data.lbsPerWeek.toFixed(1)} lbs of fat per week</strong> just from swapping one snack.
    </p>`;
  } else {
    proofHtml = `
    <p style="font-size: 16px; color: #444; line-height: 1.8; margin-bottom: 12px;">
      You picked your usual order at ${originalLabel}. <strong style="color: #111;">${swapLabel}</strong>.
    </p>
    <p style="font-size: 16px; color: #444; line-height: 1.8; margin-bottom: 12px;">
      Then you saw the swap. Same restaurant. Same vibe. <strong style="color: #059669;">${data.calSavedPerOrder} fewer calories.</strong>
    </p>
    <p style="font-size: 16px; color: #444; line-height: 1.8; margin-bottom: 32px;">
      At ${data.ordersPerWeek}x a week, that&rsquo;s <strong style="color: #059669;">${data.lbsPerWeek.toFixed(1)} lbs of fat per week</strong> just from ordering smarter at one spot.
    </p>`;
  }

  // Gap section — different for snack vs restaurant
  let gapHtml: string;
  if (isSnack) {
    gapHtml = `
    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 16px; padding: 24px; margin-bottom: 32px;">
      <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 12px 0; color: #111;">But here&rsquo;s the thing.</h2>
      <p style="font-size: 15px; color: #444; line-height: 1.8; margin: 0 0 16px 0;">
        That was <strong style="color: #111;">one snack</strong>. You probably grab 4 or 5 different snacks every week. Each one has hidden calories that add up fast &mdash; the coatings, the fillers, the portion sizes nobody thinks about.
      </p>
      <p style="font-size: 15px; color: #444; line-height: 1.8; margin: 0;">
        If you optimized all of them? That ${data.lbsPerWeek.toFixed(1)} lbs/week becomes <strong style="color: #059669; font-size: 17px;">${multipliedLbs} lbs/week.</strong>
      </p>
    </div>`;
  } else {
    gapHtml = `
    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 16px; padding: 24px; margin-bottom: 32px;">
      <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 12px 0; color: #111;">But here&rsquo;s the thing.</h2>
      <p style="font-size: 15px; color: #444; line-height: 1.8; margin: 0 0 16px 0;">
        That was one restaurant. You probably eat at 4 or 5 different places every week. Each one has the same kind of hidden calories. The sauces, the sides, the add-ons nobody thinks about.
      </p>
      <p style="font-size: 15px; color: #444; line-height: 1.8; margin: 0;">
        If you optimized all of them? That ${data.lbsPerWeek.toFixed(1)} lbs/week becomes <strong style="color: #059669; font-size: 17px;">${multipliedLbs} lbs/week.</strong>
      </p>
    </div>`;
  }

  // P.S. — different per source
  const psText = isSnack
    ? "Reply to this email with your top 3 favorite snacks and I&rsquo;ll tell you exactly where the calories are hiding."
    : "Reply to this email with your top 3 takeout spots and I&rsquo;ll tell you exactly where the calories are hiding.";

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
    ${proofHtml}

    <!-- Projection -->
    <div style="background: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 16px; padding: 28px; text-align: center; margin-bottom: 32px;">
      <p style="font-size: 12px; color: #6b7280; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;">Your timeline</p>
      <p style="font-size: 32px; font-weight: 700; color: #059669; margin: 0;">${data.goalWeight} lbs</p>
      <p style="font-size: 17px; font-weight: 600; color: #111; margin: 6px 0 0 0;">by ${data.targetDate}</p>
    </div>

    <!-- The Gap -->
    ${gapHtml}

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
        <strong style="color: #333;">P.S.</strong> ${psText}
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

    // Sanitize numbers on intake — prevent floating point leaking anywhere
    data.calSavedPerOrder = Math.round(Number(data.calSavedPerOrder) || 0);
    data.currentWeight = Math.round(Number(data.currentWeight) || 0);
    data.goalWeight = Math.round(Number(data.goalWeight) || 0);
    data.weeksToGoal = Math.round(Number(data.weeksToGoal) || 0);
    data.ordersPerWeek = Math.round(Number(data.ordersPerWeek) || 0);
    data.lbsPerWeek = Number(data.lbsPerWeek) || 0;
    if (data.originalCalories) data.originalCalories = Math.round(Number(data.originalCalories));
    if (data.swapCalories) data.swapCalories = Math.round(Number(data.swapCalories));
    if (data.sessionTotalSavings) data.sessionTotalSavings = Math.round(Number(data.sessionTotalSavings));

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
        const source = data.source || "Fast Food Bible";
        const isSnack = source === "Snack Bible";
        const isRecipe = source === "Recipe Bible";

        const html = isRecipe ? buildRecipeEmailHtml(data) : buildEmailHtml(data);

        // Subject line — different per source
        const subject = isRecipe
          ? `Your ${data.restaurantName || "recipe"} recipe (${Math.round(data.swapCalories || 0)} cal, ${Math.round((data.recipeIngredients?.swap ?? []).reduce((s: number, i: { protein_g?: number }) => s + (i.protein_g || 0), 0))}g protein)`
          : isSnack
          ? `You just found ${data.calSavedPerOrder} hidden calories in ${data.restaurantName || "your snack"}`
          : `You just found ${data.calSavedPerOrder} hidden calories at ${data.restaurantName || "your restaurant"}`;

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Bulletproof Body <swaps@bulletproofbody.ai>",
            to: data.email,
            subject,
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

      // Send lead notification to Eamon
      const source = data.source || "Fast Food Bible";
      const isSnack = source === "Snack Bible";
      const completedMeals = data.completedMeals as CompletedMeal[] | undefined;
      const mealsHtml = completedMeals?.length
        ? completedMeals.map((m: CompletedMeal) =>
            `<li>${m.restaurant}: ${m.mealType} — ${m.orderCalories} cal → ${m.swapCalories} cal (saved ${m.savings})</li>`
          ).join("")
        : "";

      // Build notification — source-aware labels
      const origLabel = isSnack ? "Original Snack" : "Restaurant";
      const swapLabel = isSnack ? "Swap Snack" : "Swap";
      const origCalStr = data.originalCalories ? ` (${data.originalCalories} cal)` : "";
      const swapCalStr = data.swapCalories ? ` (${data.swapCalories} cal)` : "";

      const notifyParts = [
        `<h2>🔔 New Lead: ${source}</h2>`,
        `<p><b>Source:</b> ${source}</p>`,
        `<p><b>Email:</b> ${data.email}</p>`,
        `<p><b>${origLabel}:</b> ${data.restaurantName || "Unknown"}${origCalStr}</p>`,
        `<p><b>${swapLabel}:</b> ${data.swapName || "Unknown"}${swapCalStr}</p>`,
        `<p><b>Cal Saved:</b> ${data.calSavedPerOrder} cal</p>`,
        `<p><b>Current Weight:</b> ${data.currentWeight} lbs → <b>Goal:</b> ${data.goalWeight} lbs</p>`,
        `<p><b>${isSnack ? "Snacks" : "Orders"}/Week:</b> ${data.ordersPerWeek}x</p>`,
        `<p><b>Projection:</b> ${data.lbsPerWeek?.toFixed?.(1) ?? data.lbsPerWeek} lbs/week → ${data.goalWeight} lbs by ${data.targetDate} (${data.weeksToGoal} weeks)</p>`,
      ];

      if (mealsHtml) {
        notifyParts.push(`<p><b>Completed Meals:</b></p><ul>${mealsHtml}</ul>`);
      }
      notifyParts.push(`<p style="color:#888;font-size:12px">${new Date().toISOString()}</p>`);

      const notifySubject = isSnack
        ? `🔔 New Lead [${source}]: ${data.email} — ${data.restaurantName || "unknown snack"} → ${data.swapName || "swap"} (${data.calSavedPerOrder} cal saved)`
        : `🔔 New Lead [${source}]: ${data.email} — ${data.restaurantName || "unknown restaurant"} (${data.calSavedPerOrder} cal saved)`;

      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Bulletproof Body <swaps@bulletproofbody.ai>",
          to: "eamon@eamonian.com",
          subject: notifySubject,
          html: notifyParts.join(""),
        }),
      }).catch((e) => console.error("Lead notification email error:", e));
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
