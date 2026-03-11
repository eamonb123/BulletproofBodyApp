"use client";

import { useEffect, useState } from "react";

const PASSWORD = "shnarbis";
const EPM_BASE = "https://epm-checkin-dashboard.onrender.com";
const ADMIN_KEY = "eamon-admin-prod-2026";

export default function WeeklyCheckInPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("checkin_authed") === "1") setAuthed(true);
  }, []);

  if (!authed) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="w-full max-w-xs">
          <h1 className="text-lg font-semibold text-white mb-4 text-center">Weekly Check-In</h1>
          <form onSubmit={(e) => { e.preventDefault(); if (password === PASSWORD) { setAuthed(true); sessionStorage.setItem("checkin_authed", "1"); } else { setAuthError(true); setPassword(""); } }}>
            <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setAuthError(false); }} placeholder="Password" autoFocus className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-base text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50" />
            {authError && <p className="mt-2 text-sm text-red-400">Wrong password</p>}
            <button type="submit" className="mt-3 w-full rounded-xl bg-emerald-500 px-6 py-3 text-base font-bold text-black transition-colors hover:bg-emerald-400">Enter</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <iframe
        src={`${EPM_BASE}/admin?key=${ADMIN_KEY}`}
        className="h-screen w-full border-0"
        allow="clipboard-write"
      />
    </div>
  );
}
