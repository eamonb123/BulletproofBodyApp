import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import { DB_PATH } from "@/lib/db";
import { randomUUID } from "crypto";

function getDb() {
  const db = new Database(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS swap_feedback (
      id TEXT PRIMARY KEY,
      rating TEXT NOT NULL,
      comment TEXT,
      restaurant_name TEXT,
      original_meal TEXT,
      original_calories INTEGER,
      swap_meal TEXT,
      swap_calories INTEGER,
      savings INTEGER,
      swap_ingredients TEXT,
      original_ingredients TEXT,
      swap_rationale TEXT,
      notify_email TEXT,
      user_agent TEXT,
      page TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Migrate: add notify_email if missing
  const cols = (db.prepare("PRAGMA table_info(swap_feedback)").all() as { name: string }[]).map((c) => c.name);
  if (!cols.includes("notify_email")) {
    db.exec("ALTER TABLE swap_feedback ADD COLUMN notify_email TEXT");
  }
  return db;
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const db = getDb();
    const id = randomUUID();

    db.prepare(`
      INSERT INTO swap_feedback (
        id, rating, comment, restaurant_name, original_meal,
        original_calories, swap_meal, swap_calories, savings,
        swap_ingredients, original_ingredients, swap_rationale,
        notify_email, user_agent, page
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.rating,
      data.comment || null,
      data.restaurantName || null,
      data.originalMeal || null,
      data.originalCalories || null,
      data.swapMeal || null,
      data.swapCalories || null,
      data.savings || null,
      JSON.stringify(data.swapIngredients || []),
      JSON.stringify(data.originalIngredients || []),
      data.swapRationale || null,
      data.notifyEmail || null,
      req.headers.get("user-agent") || null,
      data.page || null,
    );

    db.close();

    // Send notification email if Resend is configured
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const subject = data.rating === "restaurant_request"
        ? `🍽️ Restaurant Request: ${data.comment}`
        : `📝 Swap Feedback: ${data.rating}${data.restaurantName ? ` — ${data.restaurantName}` : ""}`;

      const body = [
        `<h3>${subject}</h3>`,
        data.restaurantName ? `<p><b>Restaurant:</b> ${data.restaurantName}</p>` : "",
        data.originalMeal ? `<p><b>Original:</b> ${data.originalMeal} (${data.originalCalories} cal)</p>` : "",
        data.swapMeal ? `<p><b>Swap:</b> ${data.swapMeal} (${data.swapCalories} cal)</p>` : "",
        data.savings ? `<p><b>Savings:</b> ${data.savings} cal</p>` : "",
        data.rating ? `<p><b>Rating:</b> ${data.rating}</p>` : "",
        data.comment ? `<p><b>Comment:</b> ${data.comment}</p>` : "",
        data.swapRationale ? `<p><b>Rationale:</b> ${data.swapRationale}</p>` : "",
        data.notifyEmail ? `<p><b>Notify when updated:</b> ${data.notifyEmail}</p>` : "",
        data.url ? `<p><b>URL:</b> <a href="${data.url}">${data.url}</a></p>` : "",
        data.snackId ? `<p><b>Snack ID:</b> ${data.snackId}</p>` : "",
        `<p style="color:#888;font-size:12px">Page: ${data.page || "unknown"} · ${new Date().toISOString()}</p>`,
      ].filter(Boolean).join("");

      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Bulletproof Body <swaps@bulletproofbody.ai>",
          to: ["eamon@eamonian.com"],
          subject,
          html: body,
        }),
      }).catch((e) => console.error("Feedback email error:", e));
    }

    return NextResponse.json({ status: "saved", id });
  } catch (error) {
    console.error("Feedback error:", error);
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }
}
