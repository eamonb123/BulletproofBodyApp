import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import { DB_PATH } from "@/lib/db";

function getDb() {
  return new Database(DB_PATH, { readonly: false });
}

// POST /api/events — Track funnel events
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = getDb();

    // Migrate: add columns if missing
    const cols = (db.prepare("PRAGMA table_info(funnel_events)").all() as { name: string }[]).map(c => c.name);
    if (!cols.includes("user_agent")) db.exec("ALTER TABLE funnel_events ADD COLUMN user_agent TEXT");
    if (!cols.includes("referrer")) db.exec("ALTER TABLE funnel_events ADD COLUMN referrer TEXT");
    if (!cols.includes("page_url")) db.exec("ALTER TABLE funnel_events ADD COLUMN page_url TEXT");
    if (!cols.includes("ip_address")) db.exec("ALTER TABLE funnel_events ADD COLUMN ip_address TEXT");

    const { session_id, event_type, event_data, screen_number, referrer, page_url } = body;

    // Capture IP address from request headers (works behind proxies like Render/Vercel)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || null;

    db.prepare(`
      INSERT INTO funnel_events (session_id, event_type, event_data, screen_number, user_agent, referrer, page_url, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      session_id || null,
      event_type,
      event_data ? JSON.stringify(event_data) : null,
      screen_number ?? null,
      req.headers.get("user-agent") || null,
      referrer || null,
      page_url || null,
      ip || null
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

interface EventRow {
  event_type: string;
  count: number;
  unique_sessions: number;
}

interface RecentRow {
  id: number;
  session_id: string | null;
  event_type: string;
  event_data: string | null;
  created_at: string;
}

// GET /api/events — Full analytics dashboard data
export async function GET() {
  try {
    const db = new Database(DB_PATH, { readonly: true });

    // Overall stats
    const totalSessions = db.prepare(
      "SELECT COUNT(DISTINCT session_id) as count FROM funnel_events WHERE session_id IS NOT NULL"
    ).get() as { count: number };

    const today = db.prepare(`
      SELECT COUNT(DISTINCT session_id) as sessions, COUNT(*) as events
      FROM funnel_events
      WHERE date(created_at) = date('now')
    `).get() as { sessions: number; events: number };

    // Events by type (all time)
    const byType = db.prepare(`
      SELECT event_type, COUNT(*) as count, COUNT(DISTINCT session_id) as unique_sessions
      FROM funnel_events
      GROUP BY event_type
      ORDER BY count DESC
    `).all() as EventRow[];

    // Snack Bible funnel
    const snackBibleEvents = db.prepare(`
      SELECT event_type, COUNT(*) as count, COUNT(DISTINCT session_id) as unique_sessions
      FROM funnel_events
      WHERE event_type LIKE 'snack_bible_%'
      GROUP BY event_type
      ORDER BY count DESC
    `).all() as EventRow[];

    // Fast Food Bible funnel
    const bibleEvents = db.prepare(`
      SELECT event_type, COUNT(*) as count, COUNT(DISTINCT session_id) as unique_sessions
      FROM funnel_events
      WHERE event_type LIKE 'bible_%'
      GROUP BY event_type
      ORDER BY count DESC
    `).all() as EventRow[];

    // Recent events (last 50)
    const recent = db.prepare(`
      SELECT id, session_id, event_type, event_data, created_at
      FROM funnel_events
      ORDER BY created_at DESC
      LIMIT 50
    `).all() as RecentRow[];

    // Emails from leads table
    let emailsCaptured = 0;
    try {
      const result = db.prepare(
        "SELECT COUNT(*) as count FROM leads WHERE email IS NOT NULL"
      ).get() as { count: number };
      emailsCaptured = result.count;
    } catch {
      // leads table might not exist
    }

    // Bridge modal conversion rates
    const bridgeShown = snackBibleEvents.find(e => e.event_type === "snack_bible_bridge_shown")?.count ?? 0;
    const bridgeConcierge = snackBibleEvents.find(e => e.event_type === "snack_bible_bridge_concierge")?.count ?? 0;
    const bridgeVsl = snackBibleEvents.find(e => e.event_type === "snack_bible_bridge_vsl")?.count ?? 0;
    const bridgeDismissed = snackBibleEvents.find(e => e.event_type === "snack_bible_bridge_dismissed")?.count ?? 0;

    // Daily event counts (last 7 days)
    const daily = db.prepare(`
      SELECT date(created_at) as day, COUNT(*) as events, COUNT(DISTINCT session_id) as sessions
      FROM funnel_events
      WHERE created_at >= date('now', '-7 days')
      GROUP BY date(created_at)
      ORDER BY day DESC
    `).all();

    db.close();

    return NextResponse.json({
      overview: {
        total_sessions: totalSessions.count,
        today_sessions: today.sessions,
        today_events: today.events,
        emails_captured: emailsCaptured,
      },
      snack_bible: {
        events: snackBibleEvents,
        bridge_conversion: {
          shown: bridgeShown,
          concierge: bridgeConcierge,
          vsl: bridgeVsl,
          dismissed: bridgeDismissed,
          concierge_rate: bridgeShown > 0 ? `${((bridgeConcierge / bridgeShown) * 100).toFixed(1)}%` : "N/A",
          vsl_rate: bridgeShown > 0 ? `${((bridgeVsl / bridgeShown) * 100).toFixed(1)}%` : "N/A",
        },
      },
      fast_food_bible: {
        events: bibleEvents,
      },
      all_events: byType,
      daily,
      recent: recent.map(r => ({
        ...r,
        event_data: r.event_data ? JSON.parse(r.event_data) : null,
      })),
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to get analytics" },
      { status: 500 }
    );
  }
}
