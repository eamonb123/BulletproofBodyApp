"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const tools = [
  {
    href: "/jumper",
    title: "Calorie Jumper",
    subtitle: "Start Here",
    description:
      "Guided first win. Pick your takeout frequency and restaurant, then instantly see the highest-impact swap.",
    badge: "STARTER",
    badgeColor: "bg-lime-500/15 text-lime-300",
    borderColor: "border-lime-500/20 hover:border-lime-500/40",
    initial: "J",
    initialBg: "bg-lime-500/10 text-lime-300",
  },
  {
    href: "/experiments/dark-landing",
    title: "Takeout Swap Tool",
    subtitle: "Lead Magnet",
    description:
      "Interactive swap calculator. Pick what you normally order, see the smarter version, get a fat loss projection.",
    badge: "MARKETING",
    badgeColor: "bg-emerald-500/15 text-emerald-400",
    borderColor: "border-emerald-500/20 hover:border-emerald-500/40",
    initial: "T",
    initialBg: "bg-emerald-500/10 text-emerald-400",
  },
  {
    href: "/snack-bible",
    title: "Snack Bible",
    subtitle: "Client Vector",
    description:
      "Snack swaps only. Side-by-side calorie and protein comparisons for chips, bars, sweets, and late-night cravings.",
    badge: "CLIENT",
    badgeColor: "bg-amber-500/15 text-amber-300",
    borderColor: "border-amber-500/20 hover:border-amber-500/40",
    initial: "S",
    initialBg: "bg-amber-500/10 text-amber-300",
  },
  {
    href: "/grocery-bible",
    title: "Grocery Store Bible",
    subtitle: "Client Vector",
    description:
      "What to buy and how to order groceries faster with higher-satiety defaults and cleaner calorie math.",
    badge: "CLIENT",
    badgeColor: "bg-teal-500/15 text-teal-300",
    borderColor: "border-teal-500/20 hover:border-teal-500/40",
    initial: "G",
    initialBg: "bg-teal-500/10 text-teal-300",
  },
  {
    href: "/grocery-order-optimizer",
    title: "Grocery Order Optimizer",
    subtitle: "Client Vector",
    description:
      "Turn messy carts into cutting-friendly orders with direct replacement logic and exact calorie math.",
    badge: "CLIENT",
    badgeColor: "bg-cyan-500/15 text-cyan-300",
    borderColor: "border-cyan-500/20 hover:border-cyan-500/40",
    initial: "O",
    initialBg: "bg-cyan-500/10 text-cyan-300",
  },
  {
    href: "/takeout",
    title: "Fast Food Bible",
    subtitle: "Client Vector",
    description:
      "Search chain restaurants with known nutrition data. Every swap, every macro, one search bar.",
    badge: "REFERENCE",
    badgeColor: "bg-blue-500/15 text-blue-400",
    borderColor: "border-blue-500/20 hover:border-blue-500/40",
    initial: "F",
    initialBg: "bg-blue-500/10 text-blue-400",
  },
  {
    href: "/restaurant-bible",
    title: "Restaurant Bible",
    subtitle: "Wild West",
    description:
      "Upload or paste non-labeled menus and run strict 10:1 cut-optimization instructions for smarter ordering.",
    badge: "AGENT",
    badgeColor: "bg-fuchsia-500/15 text-fuchsia-300",
    borderColor: "border-fuchsia-500/20 hover:border-fuchsia-500/40",
    initial: "R",
    initialBg: "bg-fuchsia-500/10 text-fuchsia-300",
  },
];

const godModeLinks = [
  { href: "/jumper", label: "Calorie Jumper" },
  { href: "/experiments/dark-landing?god=1", label: "Swap Tool + God Mode" },
  { href: "/vsl", label: "VSL Page" },
  { href: "/snack-bible", label: "Snack Bible" },
  { href: "/snacks", label: "Snack Bible Lead Magnet" },
  { href: "/snack-bible-demo", label: "Snack Bible Demo" },
  { href: "/grocery-bible", label: "Grocery Bible" },
  { href: "/grocery-order-optimizer", label: "Grocery Order Optimizer" },
  { href: "/takeout", label: "Fast Food Bible" },
  { href: "/restaurant-bible", label: "Restaurant Bible" },
  { href: "/recipe", label: "Recipe Bible" },
  { href: "/concierge", label: "Concierge" },
  { href: "/concierge-full", label: "Concierge Full" },
  { href: "/free", label: "Free Tool" },
  { href: "/start", label: "Start" },
  { href: "/weekly-check-in", label: "Weekly Check-In" },
  { href: "/analytics", label: "Analytics" },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md space-y-8"
      >
        {/* Header */}
        <div className="text-center">
          <h1 className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-400">
            Bulletproof Body
          </h1>
          <p className="mt-2 text-xs text-zinc-600">
            Tools for smarter eating
          </p>
        </div>

        {/* Tool Cards */}
        <div className="space-y-4">
          {tools.map((tool, i) => (
            <motion.div
              key={tool.href}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.1, duration: 0.4 }}
            >
              <Link
                href={tool.href}
                className={`block rounded-2xl border ${tool.borderColor} bg-zinc-900/60 p-5 transition-all`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${tool.initialBg} text-lg font-bold`}
                  >
                    {tool.initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-white">
                        {tool.title}
                      </h2>
                      <span
                        className={`rounded-full ${tool.badgeColor} px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider`}
                      >
                        {tool.badge}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {tool.subtitle}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                      {tool.description}
                    </p>
                  </div>
                  <svg
                    className="mt-1 h-5 w-5 flex-shrink-0 text-zinc-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m8.25 4.5 7.5 7.5-7.5 7.5"
                    />
                  </svg>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
            God Mode
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Quick jump links for QA and internal testing.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {godModeLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-center text-[11px] font-medium text-zinc-200 transition-colors hover:border-zinc-500"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
