import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import { DB_PATH } from "@/lib/db";

function getDb() {
  return new Database(DB_PATH);
}

// POST /api/events — Track funnel events
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = getDb();

    const { session_id, event_type, event_data, screen_number } = body;

    db.prepare(`
      INSERT INTO funnel_events (session_id, event_type, event_data, screen_number)
      VALUES (?, ?, ?, ?)
    `).run(
      session_id || null,
      event_type,
      event_data ? JSON.stringify(event_data) : null,
      screen_number ?? null
    );

    db.close();

    return NextResponse.json({ status: "tracked" });
  } catch (error) {
    console.error("Event tracking error:", error);
    return NextResponse.json(
      { error: "Failed to track event" },
      { status: 500 }
    );
  }
}

// GET /api/events — Funnel analytics summary
export async function GET() {
  try {
    const db = getDb();

    const totalSessions = db.prepare(
      "SELECT COUNT(DISTINCT session_id) as count FROM funnel_events WHERE session_id IS NOT NULL"
    ).get() as { count: number };

    const byScreen = db.prepare(`
      SELECT screen_number, COUNT(DISTINCT session_id) as unique_sessions, COUNT(*) as total_events
      FROM funnel_events
      WHERE screen_number IS NOT NULL
      GROUP BY screen_number
      ORDER BY screen_number
    `).all();

    const byType = db.prepare(`
      SELECT event_type, COUNT(*) as count, COUNT(DISTINCT session_id) as unique_sessions
      FROM funnel_events
      GROUP BY event_type
      ORDER BY count DESC
    `).all();

    const emailsCaptured = db.prepare(
      "SELECT COUNT(*) as count FROM user_sessions WHERE email IS NOT NULL"
    ).get() as { count: number };

    const today = db.prepare(`
      SELECT COUNT(DISTINCT session_id) as sessions
      FROM funnel_events
      WHERE date(created_at) = date('now')
    `).get() as { sessions: number };

    db.close();

    return NextResponse.json({
      total_sessions: totalSessions.count,
      today_sessions: today.sessions,
      emails_captured: emailsCaptured.count,
      by_screen: byScreen,
      by_type: byType,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to get analytics" },
      { status: 500 }
    );
  }
}
