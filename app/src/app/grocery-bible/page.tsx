"use client";

import Link from "next/link";
import { buildInstacartSearchUrl, buildWalmartSearchUrl } from "@/lib/shopLinks";

const groceryCategories = [
  {
    name: "Protein Anchors",
    examples: "Greek yogurt, egg whites, rotisserie chicken, lean ground turkey",
    goal: "Build meals that hold hunger down with high protein per calorie.",
  },
  {
    name: "Fast Carbs",
    examples: "Potatoes, rice cups, oats, fruit",
    goal: "Use measured carbs instead of random snack grazing.",
  },
  {
    name: "Volume Foods",
    examples: "Bagged salads, cucumbers, berries, frozen vegetables",
    goal: "Increase plate volume without blowing calorie targets.",
  },
  {
    name: "Snack Replacements",
    examples: "Protein chips, protein bars, high-protein pudding, popcorn",
    goal: "Preserve cravings while tightening calorie math.",
  },
];

const starterProducts = [
  { name: "0% Greek Yogurt", brand: "Fage", role: "Protein anchor" },
  { name: "Spicy Sweet Chili Protein Chips", brand: "Quest", role: "Snack swap" },
  { name: "Protein Crisp Bar", brand: "BSN", role: "Chocolate swap" },
  { name: "Frozen Berry Blend", brand: "Kirkland", role: "Volume + sweet option" },
];

export default function GroceryBiblePage() {
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
              Grocery Store Bible
            </h1>
            <p className="mt-1 text-xs text-zinc-500">
              Build the home environment that makes tracking easy.
            </p>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pt-6">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Module Split
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
              <p className="text-sm font-semibold text-white">1. What To Buy</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                Curated product-level recommendations with calories, macros, and
                direct buy links.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
              <p className="text-sm font-semibold text-white">2. How To Order</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                Grocery order optimizer for delivery apps: flag expensive
                calories and replace with higher-satiety options.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Core Categories
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {groceryCategories.map((category) => (
              <article
                key={category.name}
                className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3"
              >
                <h2 className="text-sm font-semibold text-white">{category.name}</h2>
                <p className="mt-1 text-xs text-zinc-500">{category.examples}</p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                  {category.goal}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Build Notes
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-zinc-300">
            <li>- Preserve craving profile and convenience in every swap.</li>
            <li>- Show exact calorie and macro math for every replacement.</li>
            <li>- Keep shopping flow delivery-first with one-click reorders.</li>
          </ul>
        </section>

        <section className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            One-Click Shop (Starter Stack)
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {starterProducts.map((product) => (
              <article
                key={`${product.brand}-${product.name}`}
                className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3"
              >
                <p className="text-sm font-semibold text-white">
                  {product.brand} {product.name}
                </p>
                <p className="mt-1 text-xs text-zinc-500">{product.role}</p>
                <div className="mt-3 flex gap-2">
                  <a
                    href={buildInstacartSearchUrl(product.brand, product.name)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300 transition-colors hover:bg-emerald-500/20"
                  >
                    Shop Instacart
                  </a>
                  <a
                    href={buildWalmartSearchUrl(product.brand, product.name)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-300 transition-colors hover:border-zinc-500"
                  >
                    Shop Walmart
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
