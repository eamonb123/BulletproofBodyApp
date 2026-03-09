"use client";

import Link from "next/link";

const optimizationRules = [
  "Flag low-satiety, high-calorie items in the current cart.",
  "Return a 1:1 replacement that preserves flavor profile and convenience.",
  "Show exact calories saved per replacement and per week.",
  "Output a final optimized cart for one-click reorder.",
];

export default function GroceryOrderOptimizerPage() {
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
              Grocery Order Optimizer
            </h1>
            <p className="mt-1 text-xs text-zinc-500">
              Better grocery orders without changing your life.
            </p>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pt-6">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Core Engine
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-zinc-300">
            {optimizationRules.map((rule) => (
              <li key={rule}>- {rule}</li>
            ))}
          </ul>
        </section>

        <section className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Inputs
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-300">
              Current cart screenshot or item list
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-300">
              Store preference + dietary constraints
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Output
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-300">
              Original vs optimized item list with macro deltas
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-300">
              Weekly savings total + one-click reorder stack
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
