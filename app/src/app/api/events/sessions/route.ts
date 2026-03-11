import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import { DB_PATH } from "@/lib/db";

// Human-readable descriptions for every event type
const EVENT_DESCRIPTIONS: Record<string, (data: Record<string, unknown>) => string> = {
  // Snack Bible
  snack_bible_tutorial_start: (d) => `Landed on the Snack Bible${d.snack_param ? ` via "${d.snack_param}" link` : ""}. Started with ${d.plan_size || 0} pre-loaded swaps.`,
  snack_bible_tour_step: (d) => {
    const names: Record<string, string> = { frequency: "frequency selector", stats: "stats banner", dismiss: "X dismiss button", search: "search box" };
    return `Tour: Shown step ${d.step} — ${names[d.step_name as string] || d.step_name}`;
  },
  snack_bible_tour_completed: () => "Completed the full tutorial walkthrough.",
  snack_bible_tour_skipped: (d) => `Skipped the tutorial at step ${d.skipped_at_step}.`,
  snack_bible_frequency_change: (d) => `Changed "${d.pair_id}" frequency from ${d.old_freq}x to ${d.new_freq}x/week.`,
  snack_bible_dismiss_swap: (d) => `Dismissed the "${d.pair_id}" swap (didn't want it).`,
  snack_bible_add_swap: (d) => `Added "${d.pair_id}" to their plan (swap #${d.add_number}, now ${d.plan_size} total).`,
  snack_bible_search: (d) => `Searched for "${d.query}" — got ${d.results_count} results.`,
  snack_bible_bridge_shown: (d) => `Bridge modal appeared: ${d.weekly_cal_saved} cal/week saved, ${typeof d.fat_loss === "number" ? d.fat_loss.toFixed(1) : d.fat_loss} lbs/week fat loss.`,
  snack_bible_bridge_concierge: (d) => `Clicked "Want someone to do this for everything you eat?" in bridge modal. (${d.weekly_cal_saved} cal/week saved)`,
  snack_bible_bridge_vsl: (d) => `Clicked "Watch the free training" in bridge modal. (${d.weekly_cal_saved} cal/week saved)`,
  snack_bible_bridge_dismissed: () => "Dismissed bridge modal — chose to keep building.",
  snack_bible_bottom_cta_concierge: (d) => `Clicked bottom CTA "Want this for your entire week?" (${d.plan_size} swaps in plan).`,
  snack_bible_bottom_cta_vsl: (d) => `Clicked bottom "Watch the free training" CTA (${d.plan_size} swaps in plan).`,
  snack_bible_crossroads_concierge: () => "Clicked concierge CTA from the crossroads section.",
  snack_bible_crossroads_vsl: () => "Clicked VSL CTA from the crossroads section.",
  snack_bible_crossroads_dismissed: () => "Dismissed crossroads section — kept building.",
  snack_bible_email_captured: (d) => `Gave their email: ${d.email}`,
  snack_bible_snack_request: (d) => `Requested a new snack: "${d.snack}"`,
  // Fast Food Bible
  bible_hero_view: () => "Landed on the Fast Food Bible hero screen.",
  bible_restaurant_selected: (d) => `Selected ${d.restaurant_name || "a restaurant"} from the grid.`,
  bible_meal_selected: (d) => `Chose meal: "${d.meal_name}" at ${d.restaurant_name}.`,
  bible_swap_revealed: (d) => `Swap revealed: ${d.calories_saved} cal saved at ${d.restaurant_name}.`,
  bible_frequency_change: (d) => `Changed order frequency from ${d.old_freq}x to ${d.new_freq}x/week.`,
  bible_crossroads_concierge: (d) => `Clicked "Want this done for everything you eat?" at ${d.restaurant || "crossroads"}.`,
  bible_crossroads_vsl: (d) => `Clicked "See why this works" at ${d.restaurant || "crossroads"}.`,
  bible_crossroads_keep_swapping: () => "Chose to keep swapping (dismissed crossroads).",
  bible_bridge_concierge: (d) => `Clicked "See how it works" on the bridge screen. (${d.calories_saved} cal saved at ${d.restaurant})`,
  bible_bridge_back: () => "Clicked 'Back to swaps' from the bridge screen.",
  bible_email_captured: (d) => `Gave their email: ${d.email}`,
  bible_restaurant_request: (d) => `Requested a new restaurant: "${d.comment}"`,
  bible_gate_shown: () => "Hit the gate screen (after 2 swaps).",
};

function describeEvent(eventType: string, data: Record<string, unknown> | null): string {
  const fn = EVENT_DESCRIPTIONS[eventType];
  if (fn && data) return fn(data);
  if (fn) return fn({});
  // Fallback: humanize the event type
  return eventType.replace(/_/g, " ").replace(/^(snack bible|bible) /, "");
}

function parseDevice(ua: string | null): { device: string; browser: string; os: string } {
  if (!ua) return { device: "Unknown", browser: "Unknown", os: "Unknown" };
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  const isTablet = /iPad|Tablet/i.test(ua);
  const device = isTablet ? "Tablet" : isMobile ? "Mobile" : "Desktop";
  let browser = "Unknown";
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) browser = "Chrome";
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = "Safari";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Edg\//.test(ua)) browser = "Edge";
  let os = "Unknown";
  if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Windows/.test(ua)) os = "Windows";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad/.test(ua)) os = "iOS";
  else if (/Linux/.test(ua)) os = "Linux";
  return { device, browser, os };
}

interface RawEvent {
  id: number;
  session_id: string;
  event_type: string;
  event_data: string | null;
  created_at: string;
  user_agent: string | null;
  referrer: string | null;
  page_url: string | null;
  ip_address: string | null;
}

interface LeadRow {
  email: string;
  created_at: string;
  restaurant_name: string | null;
  swap_name: string | null;
  current_weight: number | null;
  goal_weight: number | null;
  lbs_per_week: number | null;
}

// GET /api/events/sessions — Per-session journeys with human-readable narratives
export async function GET() {
  try {
    const db = new Database(DB_PATH, { readonly: true });

    // Get all events grouped by session
    const events = db.prepare(`
      SELECT id, session_id, event_type, event_data, created_at, user_agent, referrer, page_url, ip_address
      FROM funnel_events
      WHERE session_id IS NOT NULL
      ORDER BY session_id, created_at ASC
    `).all() as RawEvent[];

    // Get all leads (emails)
    let leads: LeadRow[] = [];
    try {
      leads = db.prepare(`
        SELECT email, created_at, restaurant_name, swap_name, current_weight, goal_weight, lbs_per_week
        FROM leads WHERE email IS NOT NULL ORDER BY created_at DESC
      `).all() as LeadRow[];
    } catch { /* leads table might not exist */ }

    db.close();

    // Group events by session_id
    const sessionMap = new Map<string, RawEvent[]>();
    for (const e of events) {
      if (!sessionMap.has(e.session_id)) sessionMap.set(e.session_id, []);
      sessionMap.get(e.session_id)!.push(e);
    }

    // Build IP→email lookup: if any session from an IP has an email, associate it with all sessions from that IP
    const ipEmailMap = new Map<string, string>();
    for (const [, sessionEvents] of sessionMap) {
      let sessionEmail: string | null = null;
      let sessionIp: string | null = null;
      for (const e of sessionEvents) {
        if (e.ip_address && !sessionIp) sessionIp = e.ip_address;
        if (e.event_data) {
          const d = JSON.parse(e.event_data);
          if (d.email && !sessionEmail) sessionEmail = d.email;
        }
      }
      if (sessionIp && sessionEmail) {
        ipEmailMap.set(sessionIp, sessionEmail);
      }
    }

    // Build session summaries
    const sessions = Array.from(sessionMap.entries()).map(([sessionId, sessionEvents]) => {
      const first = sessionEvents[0];
      const last = sessionEvents[sessionEvents.length - 1];
      const firstData = first.event_data ? JSON.parse(first.event_data) : {};
      const { device, browser, os } = parseDevice(first.user_agent);

      // Find email for this session (from event_data, then fallback to IP association)
      let email: string | null = null;
      let emailSource: string = "direct"; // "direct" = they typed it, "ip_match" = matched by IP
      for (const e of sessionEvents) {
        if (e.event_data) {
          const d = JSON.parse(e.event_data);
          if (d.email) { email = d.email; break; }
        }
      }
      // IP fallback: if no email in this session's events, check if same IP gave email in another session
      if (!email) {
        const sessionIp = sessionEvents.find(e => e.ip_address)?.ip_address;
        if (sessionIp && ipEmailMap.has(sessionIp)) {
          email = ipEmailMap.get(sessionIp)!;
          emailSource = "ip_match";
        }
      }

      // Determine source (Snack Bible vs Fast Food Bible)
      const source = firstData.source || (first.event_type.startsWith("bible_") ? "Fast Food Bible" : first.event_type.startsWith("snack_bible_") ? "Snack Bible" : "Unknown");

      // Screen size from event_data
      let screenWidth: number | null = null;
      let screenHeight: number | null = null;
      for (const e of sessionEvents) {
        if (e.event_data) {
          const d = JSON.parse(e.event_data);
          if (d.screen_width) { screenWidth = d.screen_width; screenHeight = d.screen_height; break; }
        }
      }

      // Build journey timeline
      const journey = sessionEvents.map((e) => {
        const data = e.event_data ? JSON.parse(e.event_data) : null;
        return {
          time: e.created_at,
          event: e.event_type,
          description: describeEvent(e.event_type, data),
          data,
        };
      });

      // Key metrics
      const addedSwaps = sessionEvents.filter(e => e.event_type.includes("add_swap")).length;
      const dismissedSwaps = sessionEvents.filter(e => e.event_type.includes("dismiss_swap")).length;
      const searches = sessionEvents.filter(e => e.event_type.includes("search")).length;
      const clickedConcierge = sessionEvents.some(e => e.event_type.includes("concierge"));
      const clickedVsl = sessionEvents.some(e => e.event_type.includes("_vsl"));
      const completedTour = sessionEvents.some(e => e.event_type.includes("tour_completed"));
      const skippedTour = sessionEvents.some(e => e.event_type.includes("tour_skipped"));
      const bridgeShown = sessionEvents.some(e => e.event_type.includes("bridge_shown"));

      // Duration
      const startTime = new Date(first.created_at).getTime();
      const endTime = new Date(last.created_at).getTime();
      const durationSec = Math.round((endTime - startTime) / 1000);

      // Build a one-paragraph summary
      const parts: string[] = [];
      parts.push(`Visited ${source} on ${device} (${os}/${browser}).`);
      if (completedTour) parts.push("Completed the full tutorial.");
      else if (skippedTour) parts.push("Skipped the tutorial.");
      if (addedSwaps > 0) parts.push(`Added ${addedSwaps} swap${addedSwaps > 1 ? "s" : ""} to their plan.`);
      if (dismissedSwaps > 0) parts.push(`Dismissed ${dismissedSwaps} swap${dismissedSwaps > 1 ? "s" : ""}.`);
      if (searches > 0) parts.push(`Searched ${searches} time${searches > 1 ? "s" : ""}.`);
      if (bridgeShown) parts.push("Saw the bridge modal (scale reveal).");
      if (clickedConcierge) parts.push("Clicked through to concierge page.");
      else if (clickedVsl) parts.push("Clicked through to watch the free training.");
      if (email && emailSource === "direct") parts.push(`Gave their email: ${email}.`);
      else if (email && emailSource === "ip_match") parts.push(`Matched to ${email} by IP.`);
      parts.push(`Session lasted ${durationSec < 60 ? `${durationSec}s` : `${Math.round(durationSec / 60)}m ${durationSec % 60}s`}.`);

      return {
        session_id: sessionId,
        email,
        email_source: emailSource,
        source,
        device,
        browser,
        os,
        screen: screenWidth ? `${screenWidth}x${screenHeight}` : null,
        referrer: first.referrer,
        started_at: first.created_at,
        ended_at: last.created_at,
        duration_seconds: durationSec,
        event_count: sessionEvents.length,
        summary: parts.join(" "),
        metrics: {
          added_swaps: addedSwaps,
          dismissed_swaps: dismissedSwaps,
          searches,
          completed_tour: completedTour,
          skipped_tour: skippedTour,
          bridge_shown: bridgeShown,
          clicked_concierge: clickedConcierge,
          clicked_vsl: clickedVsl,
          gave_email: !!email,
        },
        journey,
      };
    });

    // Sort by most recent first
    sessions.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

    return NextResponse.json({
      total_sessions: sessions.length,
      identified_users: sessions.filter(s => s.email).length,
      anonymous_users: sessions.filter(s => !s.email).length,
      leads: leads.map(l => ({
        email: l.email,
        captured_at: l.created_at,
        restaurant: l.restaurant_name,
        swap: l.swap_name,
        current_weight: l.current_weight,
        goal_weight: l.goal_weight,
        projected_loss: l.lbs_per_week,
      })),
      sessions,
    });
  } catch (error) {
    console.error("Sessions analytics error:", error);
    return NextResponse.json({ error: "Failed to get session data" }, { status: 500 });
  }
}
