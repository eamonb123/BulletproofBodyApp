"use client";

import Link from "next/link";

const acceptedInputs = [
  "Menu text pasted directly",
  "Restaurant menu link",
  "Screenshot upload",
  "PDF upload",
];

const enforcementRules = [
  "Auto-rank Top 3 entrees by 10:1 calorie:protein cut efficiency.",
  "Mirror every menu component, including section-level default sides.",
  "Always apply mandatory +240 kcal oil buffer unless steamed, poached, boiled, or raw.",
  "Output exact high-bound macros only, no ranges, Trainerize-ready.",
];

const outputSections = [
  "Name and rank",
  "Menu Components Checklist (KEEP/REMOVE/SIDE/SWAP)",
  "Practical replacement notes",
  "Exact ordering script",
  "Portion disclaimer",
  "Server script for raw ounces",
  "Ingredient-level macro breakdown",
  "Modified macro table",
  "Original vs Modified summary",
  "Ratio explanation + oil reminder",
];

export default function RestaurantBiblePage() {
  return (
    <div className="min-h-screen bg-black pb-16 text-white">
      <header className="border-b border-zinc-800 bg-black/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4">
          <Link
            href="/"
            className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 transition-colors hover:text-zinc-200"
          >
            Back
          </Link>
          <div className="text-center">
            <h1 className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">
              Restaurant Bible
            </h1>
            <p className="mt-1 text-xs text-zinc-500">
              Wild-west menus with no published calories.
            </p>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pt-6">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Intake Modes
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {acceptedInputs.map((input) => (
              <div
                key={input}
                className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-300"
              >
                {input}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Hard Rules
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-zinc-300">
            {enforcementRules.map((rule) => (
              <li key={rule}>- {rule}</li>
            ))}
          </ul>
        </section>

        <section className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Required Output Structure
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {outputSections.map((section, idx) => (
              <div
                key={section}
                className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-300"
              >
                {idx + 1}. {section}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <p className="text-sm font-semibold text-emerald-300">
            System prompt source: `RESTAURANT_BIBLE_SYSTEM.md`
          </p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-300">
            This page defines the operating contract. The live menu-analysis
            conversation engine will consume the same rule file so behavior stays
            deterministic across chat and app surfaces.
          </p>
        </section>
      </main>
    </div>
  );
}
