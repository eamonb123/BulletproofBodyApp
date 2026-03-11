"use client";

import { useEffect, useState } from "react";

// ─── Types ──────────────────────────────────────────────
interface EventCount { event_type: string; count: number; unique_sessions: number; }
interface DailyRow { day: string; events: number; sessions: number; }
interface AnalyticsData {
  overview: { total_sessions: number; today_sessions: number; today_events: number; emails_captured: number };
  snack_bible: { events: EventCount[]; bridge_conversion: { shown: number; concierge: number; vsl: number; dismissed: number; concierge_rate: string; vsl_rate: string } };
  fast_food_bible: { events: EventCount[] };
  all_events: EventCount[];
  daily: DailyRow[];
}

interface JourneyStep { time: string; event: string; description: string; data: Record<string, unknown> | null; }
interface SessionData {
  session_id: string;
  email: string | null;
  email_source: string;
  source: string;
  device: string;
  browser: string;
  os: string;
  screen: string | null;
  referrer: string | null;
  started_at: string;
  duration_seconds: number;
  event_count: number;
  summary: string;
  metrics: {
    added_swaps: number; dismissed_swaps: number; searches: number;
    completed_tour: boolean; skipped_tour: boolean; bridge_shown: boolean;
    clicked_concierge: boolean; clicked_vsl: boolean; gave_email: boolean;
  };
  journey: JourneyStep[];
}
interface LeadData { email: string; captured_at: string; restaurant: string | null; swap: string | null; current_weight: number | null; goal_weight: number | null; projected_loss: number | null; }
interface SessionsResponse { total_sessions: number; identified_users: number; anonymous_users: number; leads: LeadData[]; sessions: SessionData[]; }

const ANALYTICS_PASSWORD = "shnarbis";

// Format date to PST
function toPST(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}
function toPSTTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", { timeZone: "America/Los_Angeles", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
}
type Tab = "people" | "leads" | "overview" | "snack" | "bible";

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [sessionsData, setSessionsData] = useState<SessionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("people");
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("analytics_authed") === "1") setAuthed(true);
  }, []);

  useEffect(() => {
    if (!authed) return;
    Promise.all([
      fetch("/api/events").then(r => r.json()),
      fetch("/api/events/sessions").then(r => r.json()),
    ]).then(([eventsData, sessions]) => {
      setData(eventsData);
      setSessionsData(sessions);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [authed]);

  if (!authed) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="w-full max-w-xs">
          <h1 className="text-lg font-semibold text-white mb-4 text-center">Analytics</h1>
          <form onSubmit={(e) => { e.preventDefault(); if (password === ANALYTICS_PASSWORD) { setAuthed(true); sessionStorage.setItem("analytics_authed", "1"); } else { setAuthError(true); setPassword(""); } }}>
            <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setAuthError(false); }} placeholder="Password" autoFocus className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-base text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50" />
            {authError && <p className="mt-2 text-sm text-red-400">Wrong password</p>}
            <button type="submit" className="mt-3 w-full rounded-xl bg-emerald-500 px-6 py-3 text-base font-bold text-black transition-colors hover:bg-emerald-400">Enter</button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><p className="text-zinc-500">Loading analytics...</p></div>;
  if (!data || !sessionsData) return <div className="min-h-screen bg-black flex items-center justify-center"><p className="text-red-400">Failed to load analytics</p></div>;

  const { overview, snack_bible, fast_food_bible, daily } = data;
  const tabs: { key: Tab; label: string }[] = [
    { key: "people", label: "People" },
    { key: "leads", label: `Leads (${sessionsData.leads.length})` },
    { key: "overview", label: "Overview" },
    { key: "snack", label: "Snack Bible" },
    { key: "bible", label: "Fast Food Bible" },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold mb-1">Bulletproof Body Analytics</h1>
        <p className="text-sm text-zinc-500 mb-6">
          {sessionsData.total_sessions} sessions · {sessionsData.identified_users} identified · {sessionsData.anonymous_users} anonymous · Times in PST
        </p>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-zinc-800 pb-1 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`shrink-0 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === t.key ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ─── People Tab ─── */}
        {tab === "people" && (
          <div className="space-y-3">
            {sessionsData.sessions.map((s) => (
              <div key={s.session_id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
                <button onClick={() => setExpandedSession(expandedSession === s.session_id ? null : s.session_id)} className="w-full p-4 text-left hover:bg-zinc-800/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {s.email ? (
                          <span className="text-sm font-semibold text-emerald-400">
                            {s.email}
                            {s.email_source === "ip_match" && <span className="ml-1 text-xs text-yellow-500" title="Matched by IP address">(IP match)</span>}
                          </span>
                        ) : (
                          <span className="text-sm text-zinc-500">Anonymous</span>
                        )}
                        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">{s.source}</span>
                        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">{s.device}</span>
                        {s.metrics.clicked_concierge && <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">Concierge</span>}
                        {s.metrics.clicked_vsl && <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400">VSL</span>}
                      </div>
                      <p className="mt-1 text-sm text-zinc-400 leading-relaxed">{s.summary}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-zinc-600">{toPST(s.started_at)}</p>
                      <p className="text-xs text-zinc-600">{s.event_count} events</p>
                    </div>
                  </div>
                </button>

                {expandedSession === s.session_id && (
                  <div className="border-t border-zinc-800 px-4 pb-4">
                    {/* Device info */}
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-500">
                      <span>{s.os} / {s.browser}</span>
                      {s.screen && <span>{s.screen}</span>}
                      {s.referrer && <span>from: {s.referrer}</span>}
                      <span>{s.duration_seconds < 60 ? `${s.duration_seconds}s` : `${Math.floor(s.duration_seconds / 60)}m ${s.duration_seconds % 60}s`}</span>
                    </div>

                    {/* Journey timeline */}
                    <div className="mt-4 space-y-1">
                      <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Journey</p>
                      {s.journey.map((step, i) => (
                        <div key={i} className="flex gap-3 py-1.5 border-b border-zinc-800/30 last:border-0">
                          <span className="shrink-0 text-xs text-zinc-600 tabular-nums w-20">
                            {toPSTTime(step.time)}
                          </span>
                          <p className="text-sm text-zinc-300">{step.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ─── Leads Tab ─── */}
        {tab === "leads" && (
          <div className="space-y-3">
            {sessionsData.leads.length === 0 ? (
              <p className="text-zinc-600 text-sm">No leads captured yet.</p>
            ) : (
              sessionsData.leads.map((l, i) => (
                <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-emerald-400">{l.email}</p>
                      <div className="mt-1 flex flex-wrap gap-3 text-sm text-zinc-400">
                        {l.restaurant && <span>Restaurant: {l.restaurant}</span>}
                        {l.swap && <span>Swap: {l.swap}</span>}
                        {l.current_weight && l.goal_weight && (
                          <span>{l.current_weight} lbs → {l.goal_weight} lbs</span>
                        )}
                        {l.projected_loss && <span>{l.projected_loss.toFixed(1)} lbs/week projected</span>}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-zinc-600">{toPST(l.captured_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ─── Overview Tab ─── */}
        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Total Sessions" value={overview.total_sessions} />
              <StatCard label="Today Sessions" value={overview.today_sessions} />
              <StatCard label="Today Events" value={overview.today_events} />
              <StatCard label="Emails Captured" value={overview.emails_captured} />
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-4">Last 7 Days</h2>
              {daily.length === 0 ? <p className="text-zinc-600 text-sm">No events</p> : (
                <div className="space-y-2">
                  {daily.map((d) => (
                    <div key={d.day} className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">{d.day}</span>
                      <div className="flex gap-4 text-sm">
                        <span className="text-zinc-300">{d.sessions} sessions</span>
                        <span className="text-zinc-500">{d.events} events</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <EventTable title="All Events" events={data.all_events} />
          </div>
        )}

        {/* ─── Snack Bible Tab ─── */}
        {tab === "snack" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-emerald-500/30 bg-zinc-900/60 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-400 mb-4">Bridge Modal Conversion</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard label="Bridge Shown" value={snack_bible.bridge_conversion.shown} />
                <StatCard label="Concierge Clicks" value={snack_bible.bridge_conversion.concierge} accent />
                <StatCard label="VSL Clicks" value={snack_bible.bridge_conversion.vsl} />
                <StatCard label="Dismissed" value={snack_bible.bridge_conversion.dismissed} />
              </div>
              <div className="mt-4 flex gap-6 text-sm">
                <span className="text-zinc-400">Concierge rate: <span className="text-emerald-400 font-semibold">{snack_bible.bridge_conversion.concierge_rate}</span></span>
                <span className="text-zinc-400">VSL rate: <span className="text-zinc-300 font-semibold">{snack_bible.bridge_conversion.vsl_rate}</span></span>
              </div>
            </div>
            <EventTable title="Snack Bible Events" events={snack_bible.events} />
          </div>
        )}

        {/* ─── Fast Food Bible Tab ─── */}
        {tab === "bible" && (
          <div className="space-y-6">
            <EventTable title="Fast Food Bible Events" events={fast_food_bible.events} />
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <p className="text-xs uppercase tracking-wider text-zinc-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ? "text-emerald-400" : "text-white"}`}>{value}</p>
    </div>
  );
}

function EventTable({ title, events }: { title: string; events: EventCount[] }) {
  if (events.length === 0) return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-4">{title}</h2>
      <p className="text-zinc-600 text-sm">No events yet</p>
    </div>
  );
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-4">{title}</h2>
      <div className="space-y-1">
        {events.map((e) => (
          <div key={e.event_type} className="flex items-center justify-between py-1.5 border-b border-zinc-800/50 last:border-0">
            <span className="text-sm text-zinc-300 font-mono">{e.event_type}</span>
            <div className="flex gap-4 text-sm">
              <span className="text-white font-semibold">{e.count}</span>
              <span className="text-zinc-500">{e.unique_sessions} sessions</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
