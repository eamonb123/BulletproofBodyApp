import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { randomUUID } from "crypto";

const DB_PATH = path.join(process.cwd(), "..", "bulletproof_body.db");

function getDb() {
  return new Database(DB_PATH);
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
  completedMeals: CompletedMeal[];
  sessionTotalSavings: number;
}): string {
  const totalSaved = data.sessionTotalSavings || data.calSavedPerOrder;
  const mealRows = (data.completedMeals || [])
    .map(
      (m) => `
      <tr>
        <td style="padding: 8px 0; color: #a1a1aa; font-size: 14px;">${m.swapName}</td>
        <td style="padding: 8px 0; color: #f87171; font-size: 14px; text-align: right; text-decoration: line-through;">${m.orderCalories} cal</td>
        <td style="padding: 8px 0; color: #34d399; font-size: 14px; text-align: right; font-weight: bold;">${m.swapCalories} cal</td>
        <td style="padding: 8px 0; color: #34d399; font-size: 14px; text-align: right;">-${m.savings}</td>
      </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #000; color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 480px; margin: 0 auto; padding: 40px 24px;">

    <!-- Header -->
    <p style="font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #71717a; margin-bottom: 32px;">BULLETPROOF BODY</p>

    <!-- Headline -->
    <h1 style="font-size: 24px; font-weight: 700; line-height: 1.3; margin-bottom: 8px;">
      Your Chipotle Swap Plan
    </h1>
    <p style="font-size: 14px; color: #71717a; margin-bottom: 32px;">
      Here's exactly how to lose <span style="color: #34d399; font-weight: 600;">${data.lbsPerWeek.toFixed(1)} lbs/week</span> just by ordering smarter.
    </p>

    <!-- Swap comparison -->
    <div style="background: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="text-align: left; padding-bottom: 12px; color: #71717a; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em;">Swap</th>
            <th style="text-align: right; padding-bottom: 12px; color: #71717a; font-size: 11px; text-transform: uppercase;">Your Order</th>
            <th style="text-align: right; padding-bottom: 12px; color: #71717a; font-size: 11px; text-transform: uppercase;">Optimized</th>
            <th style="text-align: right; padding-bottom: 12px; color: #71717a; font-size: 11px; text-transform: uppercase;">Saved</th>
          </tr>
        </thead>
        <tbody>
          ${mealRows}
        </tbody>
      </table>
      <div style="border-top: 1px solid #27272a; margin-top: 12px; padding-top: 12px; display: flex; justify-content: space-between;">
        <span style="font-size: 14px; font-weight: 600;">Total saved per order</span>
        <span style="font-size: 18px; font-weight: 700; color: #34d399;">${totalSaved} cal</span>
      </div>
    </div>

    <!-- Projection -->
    <div style="background: linear-gradient(135deg, rgba(16,185,129,0.05), rgba(16,185,129,0.02)); border: 1px solid rgba(16,185,129,0.2); border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 32px;">
      <p style="font-size: 14px; color: #a1a1aa; margin-bottom: 8px;">At ${data.ordersPerWeek}x per week, you'll hit</p>
      <p style="font-size: 28px; font-weight: 700; color: #34d399; margin: 0;">${data.goalWeight} lbs</p>
      <p style="font-size: 16px; font-weight: 600; margin-top: 4px;">by ${data.targetDate}</p>
      <p style="font-size: 12px; color: #52525b; margin-top: 12px;">No gym. No meal prep. Just ordering smarter.</p>
    </div>

    <!-- The Gap -->
    <div style="background: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 24px; margin-bottom: 32px;">
      <h2 style="font-size: 16px; font-weight: 600; margin-bottom: 12px;">But that's just Chipotle.</h2>
      <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6; margin-bottom: 16px;">
        You probably also order Thai, pizza, burgers, sushi... Each one has the same kind of hidden calories.
        The #1 place people hide calories isn't the main course — it's the sides, sauces, and add-ons they don't think about.
      </p>
      <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6;">
        Your tortilla alone was <strong style="color: #fff;">320 calories</strong>. Imagine what's hiding in the rest of your week.
      </p>
    </div>

    <!-- Soft CTA -->
    <div style="text-align: center; margin-bottom: 32px;">
      <p style="font-size: 14px; color: #a1a1aa; margin-bottom: 16px;">
        I build complete swap plans for busy professionals who eat out 5+ times a week.
        Not just one restaurant — your entire week, optimized.
      </p>
      <a href="https://bulletproofbody.com/vsl" style="display: inline-block; background: #34d399; color: #000; font-weight: 600; font-size: 14px; padding: 14px 32px; border-radius: 12px; text-decoration: none;">
        See how the full plan works
      </a>
    </div>

    <!-- P.S. -->
    <div style="border-top: 1px solid #27272a; padding-top: 24px;">
      <p style="font-size: 13px; color: #71717a; line-height: 1.6;">
        <strong style="color: #a1a1aa;">P.S.</strong> Reply to this email with your top 3 takeout spots and I'll tell you exactly where the calories are hiding. Free. No strings.
      </p>
    </div>

    <!-- Footer -->
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #18181b;">
      <p style="font-size: 11px; color: #3f3f46; text-align: center;">
        Bulletproof Body | Built for busy professionals who order takeout
        <br>
        <a href="{unsubscribe_url}" style="color: #3f3f46;">Unsubscribe</a>
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

    // Ensure leads table exists
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
        completed_meals TEXT,
        session_total_savings INTEGER,
        email_sent INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Save lead
    const id = randomUUID();
    db.prepare(`
      INSERT INTO leads (id, email, current_weight, goal_weight, cal_saved_per_order,
        lbs_per_week, weeks_to_goal, target_date, orders_per_week, swap_name,
        completed_meals, session_total_savings)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            from: "Bulletproof Body <swaps@bulletproofbody.com>",
            to: data.email,
            subject: `Your Chipotle Swap Plan (saves ${data.calSavedPerOrder} cal/order)`,
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
