"use client";

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence, LayoutGroup, useSpring, useTransform } from "framer-motion";
import Image from "next/image";

// ─── Types ───────────────────────────────────────────
interface Restaurant {
  id: string;
  name: string;
  logo_emoji: string;
  cuisine: string;
  website: string | null;
  hero_url: string | null;
  meal_count: number;
  swap_count: number;
  ingredient_count: number;
}

interface MealIngredient {
  id: string;
  name: string;
  calories: number;
  protein_g: number;
  total_fat_g: number;
  carbohydrate_g: number;
  quantity: number;
}

interface Meal {
  id: string;
  name: string;
  description: string | null;
  meal_type: string | null;
  is_swap: number;
  swap_for: string | null;
  swap_rationale: string | null;
  sprite_url: string | null;
  source: string;
  ingredients: MealIngredient[];
  totals: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
}

interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  display_order: number;
  selection_type: string;
  description: string;
}

interface MenuItem {
  id: string;
  name: string;
  restaurant_id: string;
  category_id: string;
  calories: number;
  protein_g: number;
  total_fat_g: number;
  carbohydrate_g: number;
  fiber_g: number;
  serving_size: string;
}

interface RestaurantDetail {
  restaurant: Record<string, unknown>;
  meals: Meal[];
  categories: MenuCategory[];
  ingredients: MenuItem[];
}

const LOGO_EXTENSION_BY_ID: Record<string, string> = {
  applebees: "png",
  arbys: "svg",
  bjs: "png",
  burgerking: "png",
  bww: "png",
  cava: "png",
  cheesecakefactory: "svg",
  chickfila: "svg",
  chilis: "svg",
  chipotle: "svg",
  crackerbarrel: "svg",
  dairyqueen: "svg",
  dennys: "png",
  dunkin: "svg",
  firehousesubs: "png",
  firstwatch: "png",
  ihop: "png",
  innout: "svg",
  jerseymikes: "svg",
  jimmyjohns: "svg",
  kfc: "png",
  littlecaesars: "png",
  longhorn: "png",
  mcdonalds: "png",
  moes: "png",
  olivegarden: "svg",
  outback: "png",
  pandaexpress: "png",
  panera: "svg",
  papajohns: "png",
  pizzahut: "svg",
  popeyes: "svg",
  puravida: "png",
  qdoba: "svg",
  raisingcanes: "png",
  redlobster: "png",
  sheetz: "png",
  smoothieking: "svg",
  sonic: "svg",
  subway: "png",
  sweetgreen: "svg",
  tacobell: "png",
  texasroadhouse: "png",
  tropicalsmoothie: "svg",
  wafflehouse: "svg",
  wawa: "png",
  wendys: "png",
  whataburger: "svg",
  yardhouse: "svg",
  zaxbys: "png",
};

// Per-logo style overrides for grid cards.
// size = max-height/max-width %. Default 92%. yOffset = px shift up.
// All logos are now standardized to 400x400 with 2% padding (96% fill).
const LOGO_OVERRIDES: Record<string, { size?: number; yOffset?: number }> = {
  tacobell: { yOffset: 0 },
  smoothieking: { yOffset: 10 },
  sonic: { yOffset: 8 },
};

function getLogoCandidates(id: string | null | undefined): string[] {
  if (!id?.trim()) return [];
  const ext = LOGO_EXTENSION_BY_ID[id];
  if (!ext) return [];
  return [`/restaurant-logos/${id}.${ext}`];
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function RestaurantLogo({
  id,
  name,
  className,
  imageClassName = "h-auto w-auto max-h-[72%] max-w-[72%]",
  placeholderClassName = "text-3xl font-semibold tracking-wide text-zinc-400",
  yOffset = 0,
  maxSize,
}: {
  id: string;
  name: string;
  className: string;
  imageClassName?: string;
  placeholderClassName?: string;
  yOffset?: number;
  maxSize?: number;
}) {
  const candidates = useMemo(() => getLogoCandidates(id), [id]);
  const [candidateIndex, setCandidateIndex] = useState(0);

  if (candidateIndex >= candidates.length) {
    return (
      <div className={`${className} flex items-center justify-center bg-zinc-800/70`}>
        <span className={placeholderClassName}>{getInitials(name)}</span>
      </div>
    );
  }

  const imgStyle: React.CSSProperties = {};
  if (yOffset) imgStyle.transform = `translateY(-${yOffset}px)`;
  if (maxSize) {
    imgStyle.maxHeight = `${maxSize}%`;
    imgStyle.maxWidth = `${maxSize}%`;
  }

  return (
    <div className={`${className} flex items-center justify-center bg-white`}>
      <img
        src={candidates[candidateIndex]}
        alt={`${name} logo`}
        loading="lazy"
        decoding="async"
        className={imageClassName}
        style={Object.keys(imgStyle).length ? imgStyle : undefined}
        onError={() => setCandidateIndex((idx) => idx + 1)}
      />
    </div>
  );
}

function getMealEmoji(meal: Meal): string {
  const text = `${meal.name} ${meal.description ?? ""}`.toLowerCase();

  if (text.includes("wing")) return "🍗";
  if (text.includes("burger")) return "🍔";
  if (text.includes("pizza")) return "🍕";
  if (text.includes("taco")) return "🌮";
  if (text.includes("burrito")) return "🌯";
  if (text.includes("salad") || text.includes("greens")) return "🥗";
  if (text.includes("sandwich") || text.includes("sub")) return "🥪";
  if (text.includes("fries")) return "🍟";
  if (text.includes("nugget") || text.includes("tender")) return "🍗";
  if (text.includes("smoothie") || text.includes("shake")) return "🥤";
  if (text.includes("coffee") || text.includes("latte")) return "☕";
  if (text.includes("breakfast") || text.includes("egg")) return "🍳";
  if (text.includes("pasta") || text.includes("noodle")) return "🍝";
  if (text.includes("steak")) return "🥩";
  if (text.includes("shrimp") || text.includes("fish") || text.includes("salmon")) return "🐟";
  if (text.includes("soup")) return "🍲";

  switch (meal.meal_type?.toLowerCase()) {
    case "burrito":
      return "🌯";
    case "bowl":
      return "🥗";
    case "tacos":
      return "🌮";
    case "salad":
      return "🥬";
    default:
      return "🍽️";
  }
}

// ─── Cart Types (DoorDash-style meal builder) ────────
interface CartItem {
  id: string;
  entree: MenuItem;
  side: MenuItem | null;
  drink: MenuItem | null;
  sauces: { item: MenuItem; qty: number }[];
  totalCalories: number;
}

// Combo defaults: keyed by ingredient category → default side/drink/sauces
interface ComboDefault {
  side: string;       // ingredient id
  drink: string;      // ingredient id
  sauces: string[];   // ingredient ids
}

// McDonald's combo defaults (hardcoded for test)
const COMBO_DEFAULTS: Record<string, Record<string, ComboDefault>> = {
  mcdonalds: {
    mcdonalds_burgers: { side: "mcd_fries_med", drink: "mcd_coke_med", sauces: [] },
    mcdonalds_chicken: { side: "mcd_fries_med", drink: "mcd_coke_med", sauces: ["mcd_bbq_sauce"] },
    mcdonalds_breakfast: { side: "mcd_hash_brown", drink: "mcd_oj_small", sauces: [] },
  },
};

// Which restaurants use the cart builder flow
const CART_BUILDER_RESTAURANTS = new Set(["mcdonalds"]);

// Category types for cart builder
const ENTREE_CATEGORIES = new Set(["mcdonalds_burgers", "mcdonalds_chicken", "mcdonalds_breakfast"]);
const SIDE_CATEGORIES = new Set(["mcdonalds_sides"]);
const DRINK_CATEGORIES = new Set(["mcdonalds_drinks"]);
const SAUCE_CATEGORIES = new Set(["mcdonalds_sauces"]);

// ─── Completed Swap Tracking ─────────────────────────
interface CompletedSwap {
  restaurant: string;
  swapName: string;
  savings: number;
}

// ─── Animated Calorie Counter (spring animation like dark-landing) ──
function AnimatedCalories({ value, className = "" }: { value: number; className?: string }) {
  const spring = useSpring(0, { stiffness: 60, damping: 20, mass: 0.8 });
  const display = useTransform(spring, (v) => Math.round(v));
  const [displayVal, setDisplayVal] = useState(0);

  useEffect(() => { spring.set(value); }, [spring, value]);
  useEffect(() => {
    const unsubscribe = display.on("change", (v) => setDisplayVal(v));
    return unsubscribe;
  }, [display]);

  return <span className={className}>{displayVal}</span>;
}

// ─── Hero Screen ─────────────────────────────────────
function HeroScreen({ restaurants, onSelectRestaurant }: { restaurants: Restaurant[]; onSelectRestaurant: (id: string) => void }) {
  const [awake, setAwake] = useState(false);
  const [heroSearch, setHeroSearch] = useState("");
  const heroFiltered = useMemo(() => {
    const q = heroSearch.toLowerCase().trim();
    if (!q) return restaurants;
    return restaurants.filter((r) => r.name.toLowerCase().includes(q) || r.cuisine?.toLowerCase().includes(q));
  }, [heroSearch, restaurants]);

  // Build two rows of logos for the marquee (sleeping state)
  const row1 = restaurants.slice(0, Math.ceil(restaurants.length / 2));
  const row2 = restaurants.slice(Math.ceil(restaurants.length / 2));

  return (
    <div className="relative min-h-[100dvh]">
      {/* Brand mark — top left */}
      <div className="absolute top-0 left-0 z-20 px-5 pt-5">
        <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-zinc-500">Bulletproof Body</p>
      </div>

      {/* ── SLEEPING STATE: marquee + headline + CTA ── */}
      {!awake && (
        <div className="flex min-h-[100dvh] flex-col items-center justify-center px-5">
          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8 text-center"
          >
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              Lose your next 10 lbs
              <br />
              <span className="text-emerald-400">without giving up</span>
              {" "}
              <span style={{ fontFamily: "'TT Norms Pro', 'Poppins', 'Nunito', sans-serif", fontWeight: 800, letterSpacing: "-0.02em" }}>DoorDash</span>
            </h1>
          </motion.div>

          {/* Scrolling logo marquee */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mb-10 w-full max-w-3xl overflow-hidden"
          >
            <div className="marquee-row mb-3">
              <div className="marquee-track marquee-left">
                {[...row1, ...row1].map((r, i) => (
                  <div key={`r1-${r.id}-${i}`} className="mx-1.5 h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-zinc-800 sm:h-20 sm:w-20">
                    <RestaurantLogo
                      id={r.id}
                      name={r.name}
                      className="h-full w-full"
                      imageClassName="h-auto w-auto"
                      maxSize={LOGO_OVERRIDES[r.id]?.size ?? 92}
                      placeholderClassName="text-sm font-semibold text-zinc-400"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="marquee-row">
              <div className="marquee-track marquee-right">
                {[...row2, ...row2].map((r, i) => (
                  <div key={`r2-${r.id}-${i}`} className="mx-1.5 h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-zinc-800 sm:h-20 sm:w-20">
                    <RestaurantLogo
                      id={r.id}
                      name={r.name}
                      className="h-full w-full"
                      imageClassName="h-auto w-auto"
                      maxSize={LOGO_OVERRIDES[r.id]?.size ?? 92}
                      placeholderClassName="text-sm font-semibold text-zinc-400"
                    />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* CTA — triggers wake-up */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setAwake(true)}
            className="rounded-2xl bg-emerald-500 px-10 py-4 text-base font-bold text-black transition-all hover:bg-emerald-400 sm:text-lg"
          >
            Show me how.
          </motion.button>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-4 text-sm text-zinc-500"
          >
            Takes 30 seconds. No sign-up required.
          </motion.p>

          <style jsx>{`
            .marquee-row {
              width: 100%;
              overflow: hidden;
              -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
              mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
            }
            .marquee-track {
              display: flex;
              width: max-content;
            }
            .marquee-left {
              animation: scroll-left 30s linear infinite;
            }
            .marquee-right {
              animation: scroll-right 30s linear infinite;
            }
            @keyframes scroll-left {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            @keyframes scroll-right {
              0% { transform: translateX(-50%); }
              100% { transform: translateX(0); }
            }
          `}</style>

          {/* Footer tagline */}
          <p className="absolute bottom-6 left-0 right-0 text-center text-[11px] text-zinc-700">
            Built for busy professionals who order takeout
          </p>
        </div>
      )}

      {/* ── AWAKE STATE: full-screen grid of all restaurants ── */}
      {awake && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex min-h-[100dvh] flex-col items-center px-4 py-10 sm:px-8"
        >
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6 text-center text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400"
          >
            Pick the spot you think you can&apos;t eat at and still lose weight.
          </motion.p>

          {/* Search bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6 w-full max-w-6xl"
          >
            <div className="relative">
              <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                placeholder="Search restaurants..."
                value={heroSearch}
                onChange={(e) => setHeroSearch(e.target.value)}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 py-3 pl-12 pr-10 text-base text-white placeholder-zinc-500 outline-none transition-colors focus:border-emerald-500/50"
              />
              {heroSearch && (
                <button onClick={() => setHeroSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </motion.div>

          <div className="grid w-full max-w-6xl grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
            {heroFiltered.map((r, idx) => (
              <motion.button
                key={r.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.01, duration: 0.3 }}
                onClick={() => onSelectRestaurant(r.id)}
                className="group relative aspect-square overflow-hidden rounded-xl border border-zinc-800 bg-white transition-all duration-200 hover:scale-105 hover:border-emerald-500/50 hover:shadow-[0_0_24px_rgba(16,185,129,0.12)]"
              >
                <RestaurantLogo
                  id={r.id}
                  name={r.name}
                  className="h-full w-full"
                  imageClassName="h-auto w-auto"
                  maxSize={LOGO_OVERRIDES[r.id]?.size ?? 92}
                  placeholderClassName="text-sm font-semibold text-zinc-400"
                  yOffset={LOGO_OVERRIDES[r.id]?.yOffset ?? 0}
                />
                {/* Name on hover */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1.5 pt-5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <p className="text-center text-[10px] font-semibold leading-tight text-white">{r.name}</p>
                </div>
              </motion.button>
            ))}
          </div>
          {heroSearch && heroFiltered.length === 0 && (
            <p className="mt-8 text-sm text-zinc-500">No restaurants match &ldquo;{heroSearch}&rdquo;</p>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ─── Feedback Widget (Swap-level) ────────────────────
const RATING_OPTIONS = [
  { value: "Spot on" as const, label: "Spot on", color: "emerald" },
  { value: "Close but off" as const, label: "Close but off", color: "yellow" },
  { value: "Bad swap" as const, label: "Bad swap", color: "red" },
] as const;
type RatingValue = typeof RATING_OPTIONS[number]["value"];

function FeedbackWidget({ context, variant = "swap" }: {
  context: Record<string, unknown>;
  variant?: "swap" | "restaurant" | "general";
}) {
  const [state, setState] = useState<"idle" | "open" | "sent">("idle");
  const [rating, setRating] = useState<RatingValue | null>(null);
  const [comment, setComment] = useState("");
  const [showText, setShowText] = useState(false);
  const [wantNotify, setWantNotify] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState("");

  const submit = () => {
    if (!rating && !comment) return;
    fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rating,
        comment,
        page: "bible",
        ...(wantNotify && notifyEmail ? { notifyEmail } : {}),
        ...context,
      }),
    }).catch(() => {});
    setState("sent");
    setTimeout(() => setShowText(true), 600);
  };

  if (state === "sent") {
    return (
      <div className="mt-4 flex flex-col items-center py-4">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30"
        >
          <motion.svg
            className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"
          >
            <motion.path
              strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ delay: 0.3, duration: 0.4, ease: "easeOut" }}
            />
          </motion.svg>
        </motion.div>
        <AnimatePresence>
          {showText && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="mt-2 text-center">
              <p className="text-xs font-medium text-emerald-400">Got it. We&apos;ll make this better.</p>
              {wantNotify && notifyEmail && (
                <p className="mt-1 text-[10px] text-zinc-500">We&apos;ll email you when it&apos;s updated.</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (state === "idle") {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-3 text-center">
        <button onClick={() => setState("open")}
          className="text-xs text-zinc-500 transition-colors hover:text-zinc-300">
          Not quite right? <span className="text-emerald-500/70 hover:text-emerald-400">Suggest a better swap &rarr;</span>
        </button>
      </motion.div>
    );
  }

  const showNotify = rating === "Close but off" || rating === "Bad swap";

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="mt-4 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-zinc-300">What would be a better swap?</p>
        <button onClick={() => setState("idle")} className="text-zinc-600 hover:text-zinc-400 transition-colors">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex gap-1.5 mb-3">
        {RATING_OPTIONS.map(({ value, label, color }) => (
          <button key={value} onClick={() => setRating(value)}
            className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium transition-all ${
              rating === value
                ? color === "emerald" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : color === "yellow" ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40"
                  : "bg-red-500/20 text-red-400 border border-red-500/40"
                : "bg-zinc-800 text-zinc-500 border border-zinc-700 hover:border-zinc-600"
            }`}>
            {label}
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="What would you prefer instead?"
        rows={2}
        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none resize-none"
      />

      {/* Notify me when updated */}
      <AnimatePresence>
        {showNotify && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="mt-3 overflow-hidden">
            <label className="flex items-center gap-2 cursor-pointer group">
              <button
                type="button"
                onClick={() => setWantNotify(!wantNotify)}
                className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-all ${
                  wantNotify ? "border-emerald-500 bg-emerald-500" : "border-zinc-600 bg-zinc-900 group-hover:border-zinc-500"
                }`}
              >
                {wantNotify && (
                  <svg className="h-2.5 w-2.5 text-black" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </button>
              <span className="text-[11px] text-zinc-400 group-hover:text-zinc-300">Notify me when this swap is updated</span>
            </label>
            <AnimatePresence>
              {wantNotify && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                  <input
                    type="email"
                    value={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mt-3">
        <p className="text-[10px] text-zinc-600">This helps us get it right for you</p>
        <button onClick={submit} disabled={!rating && !comment}
          className="rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-black transition-all hover:bg-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed">
          Send
        </button>
      </div>
    </motion.div>
  );
}

// ─── Restaurant Request Button (Grid-level) ──────────
function RestaurantRequestButton({ searchQuery, trackEvent }: { searchQuery: string; trackEvent?: (eventType: string, data?: Record<string, unknown>) => void }) {
  const [state, setState] = useState<"idle" | "open" | "sent">("idle");
  const [comment, setComment] = useState("");
  const [wantNotify, setWantNotify] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState("");

  const submit = () => {
    if (!comment.trim()) return;
    trackEvent?.("bible_restaurant_request", { restaurant_name: comment.trim(), search_query: searchQuery });
    fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rating: "restaurant_request",
        comment,
        page: "bible",
        section: "restaurant_grid",
        searchQuery,
        ...(wantNotify && notifyEmail ? { notifyEmail } : {}),
      }),
    }).catch(() => {});
    setState("sent");
  };

  if (state === "sent") {
    return (
      <div className="mt-8 flex flex-col items-center py-4">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30"
        >
          <motion.svg
            className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"
          >
            <motion.path
              strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ delay: 0.3, duration: 0.4, ease: "easeOut" }}
            />
          </motion.svg>
        </motion.div>
        <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-3 text-sm text-emerald-400">We&apos;ll work on adding that.</motion.p>
      </div>
    );
  }

  if (state === "open") {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="mx-auto mt-8 max-w-md rounded-2xl border border-zinc-700/60 bg-gradient-to-b from-zinc-800/60 to-zinc-900/60 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10">
              <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-white">Request a restaurant</p>
          </div>
          <button onClick={() => setState("idle")} className="text-zinc-600 hover:text-zinc-400 transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Which restaurant do you want?"
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
          onKeyDown={(e) => e.key === "Enter" && !wantNotify && submit()}
        />
        <label className="mt-3 flex cursor-pointer items-start gap-2">
          <input type="checkbox" checked={wantNotify} onChange={(e) => setWantNotify(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-800 accent-emerald-500" />
          <span className="text-xs text-zinc-400">Notify me when it&apos;s added</span>
        </label>
        {wantNotify && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2">
            <input type="email" placeholder="your@email.com" value={notifyEmail} onChange={(e) => setNotifyEmail(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
              onKeyDown={(e) => e.key === "Enter" && submit()} />
          </motion.div>
        )}
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-zinc-500">We&apos;ll get it added for you</p>
          <button onClick={submit} disabled={!comment.trim()}
            className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-black transition-all hover:bg-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed">
            Submit
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="mt-10 mb-16 text-center">
      <div className="mx-auto max-w-xs border-t border-zinc-800/60 pt-8">
        <button onClick={() => setState("open")}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-700/60 bg-zinc-800/40 px-6 py-3.5 text-sm font-medium text-zinc-300 transition-all hover:border-emerald-500/30 hover:text-white hover:bg-zinc-800/80">
          <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Don&apos;t see your restaurant?
        </button>
        <p className="mt-3 text-xs text-zinc-500">Let us know and we&apos;ll add it</p>
      </div>
    </div>
  );
}

// ─── Tooltip Callout (non-blocking) ──────────────────
function TooltipCallout({ swapCount, onDismiss }: { swapCount: number; onDismiss: () => void }) {
  const message = swapCount === 0
    ? "Pick the spot you think you can\u2019t eat at and still lose weight."
    : "Nice. Now pick a different spot. Same game, bigger savings.";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 25 }}
      className="pointer-events-none absolute left-1/2 top-2 z-30 w-[90%] max-w-md -translate-x-1/2"
    >
      <div className="pointer-events-auto relative rounded-2xl border border-emerald-500/30 bg-zinc-900/95 px-5 py-4 shadow-[0_0_40px_rgba(16,185,129,0.1)] backdrop-blur-sm">
        <button
          onClick={onDismiss}
          className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
        <p className="pr-6 text-sm font-bold text-white">{message}</p>
        <p className="mt-1 text-xs text-zinc-400">
          {swapCount === 0
            ? "We\u2019ll show you how to lose fat there."
            : "Let\u2019s stack another one."}
        </p>
        {/* Arrow pointing down at the grid */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
          <div className="h-0 w-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-emerald-500/30" />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Progress Banner ─────────────────────────────────
function ProgressBanner({ completedSwaps }: { completedSwaps: CompletedSwap[] }) {
  const totalSavings = completedSwaps.reduce((sum, s) => sum + s.savings, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-emerald-400">
            {completedSwaps.length} swap{completedSwaps.length !== 1 ? "s" : ""} found
          </p>
          <p className="text-xs text-zinc-400">
            {completedSwaps.map((s) => s.restaurant).join(", ")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold tabular-nums text-emerald-400">-{totalSavings} cal</p>
          <p className="text-xs text-zinc-500">per day</p>
        </div>
      </div>
      <p className="mt-2 text-sm text-zinc-300">
        {completedSwaps.length === 1
          ? "Nice. Let\u2019s find your second swap."
          : `${completedSwaps.length} swaps down. Keep going or see where this leads.`}
      </p>
    </motion.div>
  );
}

// ─── Gate Screen (after 2 swaps) ─────────────────────
function GateScreen({ completedSwaps, onContinue, onVSL, onConcierge }: {
  completedSwaps: CompletedSwap[];
  onContinue: () => void;
  onVSL: () => void;
  onConcierge: () => void;
}) {
  const totalSavings = completedSwaps.reduce((sum, s) => sum + s.savings, 0);
  const lbsPerWeek = ((totalSavings * 7) / 3500).toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex min-h-[80dvh] flex-col items-center justify-center px-5"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="w-full max-w-md text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 400, damping: 20 }}
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500"
        >
          <svg className="h-8 w-8 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>

        <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
          Look what&apos;s possible.
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          {completedSwaps.length} restaurants. Same food. Smarter orders.
        </p>

        {/* Swap recap */}
        <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          {completedSwaps.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <span className="text-sm text-zinc-300">{s.restaurant}</span>
              <span className="text-sm font-bold tabular-nums text-emerald-400">-{s.savings} cal</span>
            </div>
          ))}
          <div className="mt-3 border-t border-zinc-800 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">Total saved per day</span>
              <span className="text-xl font-bold tabular-nums text-emerald-400">-{totalSavings} cal</span>
            </div>
            <p className="mt-1 text-right text-xs text-zinc-500">
              That&apos;s {lbsPerWeek} lbs/week without changing your life.
            </p>
          </div>
        </div>

        {/* CTAs */}
        <div className="mt-8 space-y-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onConcierge}
            className="w-full rounded-2xl bg-emerald-500 px-6 py-4 text-base font-bold text-black transition-all hover:bg-emerald-400"
          >
            Want this done for everything you eat?
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onVSL}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-800 px-6 py-3.5 text-sm text-zinc-400 transition-all hover:border-zinc-600 hover:text-zinc-300"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            See why this works
          </motion.button>
          <button
            onClick={onContinue}
            className="w-full text-center text-sm text-zinc-600 hover:text-zinc-400 transition-colors py-2"
          >
            Keep exploring on my own
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Wrapper for Suspense boundary (useSearchParams) ─
export default function BiblePageWrapper() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-black"><div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-400" /></div>}>
      <BiblePage />
    </Suspense>
  );
}

// ─── Main Page ───────────────────────────────────────
function BiblePage() {
  const searchParams = useSearchParams();
  const godMode = searchParams.get("god") === "1";

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [restaurantData, setRestaurantData] = useState<Record<string, RestaurantDetail>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const loadingDetail = !!selectedId && !restaurantData[selectedId];

  // ─── Progressive flow state ────────────────────────
  const [flow, setFlow] = useState<"hero" | "grid" | "detail" | "gate" | "free">(godMode ? "free" : "hero");
  const [completedSwaps, setCompletedSwaps] = useState<CompletedSwap[]>([]);
  const [showTutorial, setShowTutorial] = useState(false);
  const [passedGate, setPassedGate] = useState(godMode);

  // ─── Analytics (shared session via sessionStorage) ──────────────────────────────────
  const sessionIdRef = useRef<string>("");
  const capturedEmailRef = useRef<string | null>(null);

  useEffect(() => {
    const existingSession = sessionStorage.getItem("bb_session_id");
    if (existingSession) {
      sessionIdRef.current = existingSession;
    } else {
      const newId = `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem("bb_session_id", newId);
      sessionIdRef.current = newId;
    }
    const existingEmail = sessionStorage.getItem("bb_email");
    if (existingEmail) capturedEmailRef.current = existingEmail;
  }, []);

  const trackEvent = useCallback((eventType: string, data?: Record<string, unknown>) => {
    const payload = {
      session_id: sessionIdRef.current,
      event_type: eventType,
      event_data: {
        ...data,
        email: capturedEmailRef.current || data?.email || null,
        source: "Fast Food Bible",
        timestamp: new Date().toISOString(),
      },
    };
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {}); // fire-and-forget
  }, []);

  // ─── sessionStorage persistence (back-nav only) ────────
  // Only saves when user clicks an internal link (VSL/concierge).
  // Only restores if a "navigated away" flag is present.
  // Refresh = fresh start (hero). Back-nav = restore state.
  const STORAGE_KEY = "bible_state";
  const NAV_FLAG = "bible_nav_away";

  const saveBibleState = useCallback(() => {
    try {
      sessionStorage.setItem(NAV_FLAG, "1");
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        flow, completedSwaps, passedGate, selectedId, showTutorial,
      }));
    } catch {}
  }, [flow, completedSwaps, passedGate, selectedId, showTutorial]);

  // Restore on mount — only if user navigated away via internal link
  useEffect(() => {
    if (godMode) return;
    try {
      const wasNavAway = sessionStorage.getItem(NAV_FLAG);
      if (!wasNavAway) return;
      sessionStorage.removeItem(NAV_FLAG);
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const s = JSON.parse(saved);
        if (s.completedSwaps?.length > 0 || s.flow) {
          setCompletedSwaps(s.completedSwaps ?? []);
          setPassedGate(s.passedGate ?? false);
          setShowTutorial(s.showTutorial ?? false);
          setSelectedId(s.selectedId ?? null);
          setFlow(s.flow ?? (s.passedGate ? "free" : "grid"));
        }
      }
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [godMode]);

  const navigateAway = useCallback((url: string) => {
    saveBibleState();
    const sep = url.includes("?") ? "&" : "?";
    window.location.href = `${url}${sep}from=bible`;
  }, [saveBibleState]);

  const handleSwapComplete = useCallback((restaurant: string, swapName: string, savings: number) => {
    trackEvent("bible_completed_swap", { restaurant, meal: swapName, calories_saved: savings, swap_number: completedSwaps.length + 1 });
    const newSwaps = [...completedSwaps, { restaurant, swapName, savings }];
    setCompletedSwaps(newSwaps);
    setSelectedId(null);
    if (newSwaps.length >= 2 && !passedGate) {
      trackEvent("bible_gate_shown", { swap_count: newSwaps.length, total_savings: newSwaps.reduce((s, sw) => s + sw.savings, 0) });
      setFlow("gate");
    } else {
      setShowTutorial(true);
      setFlow("grid");
    }
  }, [completedSwaps, passedGate, trackEvent]);

  const handleHeroStart = useCallback(() => {
    setFlow("grid");
    setShowTutorial(true);
  }, []);

  const handleRestaurantSelect = useCallback((id: string) => {
    const r = restaurants.find((r) => r.id === id);
    trackEvent("bible_restaurant_selected", { restaurant_id: id, restaurant_name: r?.name ?? id });
    setSelectedId(id);
    setFlow("detail");
  }, [restaurants, trackEvent]);

  // ─── Fetch restaurant list ─────────────────────────
  useEffect(() => {
    fetch("/api/restaurants")
      .then((res) => res.json())
      .then((data) => {
        setRestaurants(data.restaurants);
        setLoading(false);
        trackEvent("bible_hero_view", { restaurant_count: data.restaurants?.length ?? 0 });
      })
      .catch(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Fetch restaurant detail on select ─────────────
  useEffect(() => {
    if (!selectedId || restaurantData[selectedId]) return;
    fetch(`/api/restaurant/${selectedId}`)
      .then((res) => res.json())
      .then((data) => {
        setRestaurantData((prev) => ({ ...prev, [selectedId]: data }));
      })
      .catch(() => {});
  }, [selectedId, restaurantData]);

  // ─── Search filtering ──────────────────────────────
  const query = searchQuery.toLowerCase().trim();

  const filteredRestaurants = useMemo(() => {
    if (!query) return restaurants;
    return restaurants.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.cuisine?.toLowerCase().includes(query)
    );
  }, [restaurants, query]);

  // Search across all loaded meal data
  const searchMealResults = useMemo(() => {
    if (!query) return [];
    const results: { restaurant: Restaurant; meals: Meal[] }[] = [];

    for (const r of restaurants) {
      const detail = restaurantData[r.id];
      if (!detail) continue;

      const matchingMeals = detail.meals.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.ingredients.some((ing) => ing.name.toLowerCase().includes(query))
      );

      if (matchingMeals.length > 0) {
        results.push({ restaurant: r, meals: matchingMeals });
      }
    }

    return results;
  }, [query, restaurants, restaurantData]);

  // Preload all restaurant data for search
  useEffect(() => {
    for (const r of restaurants) {
      if (!restaurantData[r.id]) {
        fetch(`/api/restaurant/${r.id}`)
          .then((res) => res.json())
          .then((data) => {
            setRestaurantData((prev) => ({ ...prev, [r.id]: data }));
          })
          .catch(() => {});
      }
    }
  }, [restaurants]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Render ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black">
      {/* ─── Hero Screen ──────────────────────────────── */}
      {flow === "hero" && !loading && (
        <HeroScreen
          restaurants={restaurants}
          onSelectRestaurant={(id) => {
            setShowTutorial(false);
            handleRestaurantSelect(id);
          }}
        />
      )}
      {flow === "hero" && loading && (
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-400" />
        </div>
      )}

      {/* ─── Gate Screen (after 2 swaps) ──────────────── */}
      {flow === "gate" && (
        <GateScreen
          completedSwaps={completedSwaps}
          onContinue={() => { trackEvent("bible_crossroads_keep_swapping", { swap_count: completedSwaps.length }); setPassedGate(true); setFlow("free"); }}
          onVSL={() => { trackEvent("bible_crossroads_vsl", { swap_count: completedSwaps.length }); navigateAway("/vsl"); }}
          onConcierge={() => { trackEvent("bible_crossroads_concierge", { swap_count: completedSwaps.length }); navigateAway("/concierge"); }}
        />
      )}

      {/* ─── God Mode Panel ────────────────────────────── */}
      {godMode && (
        <div className="fixed bottom-4 right-4 z-50 rounded-2xl border border-yellow-500/30 bg-zinc-900/95 p-3 shadow-lg backdrop-blur-sm">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-yellow-500">God Mode</p>
          <div className="grid grid-cols-2 gap-1.5">
            <button onClick={() => { setFlow("hero"); setSelectedId(null); }}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors ${flow === "hero" ? "bg-yellow-500 text-black" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
              Hero
            </button>
            <button onClick={() => { setFlow("grid"); setSelectedId(null); setShowTutorial(true); }}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors ${flow === "grid" && !selectedId ? "bg-yellow-500 text-black" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
              Grid
            </button>
            <button onClick={() => { setFlow("gate"); setCompletedSwaps([{ restaurant: "Chipotle", swapName: "Lean Bowl", savings: 660 }, { restaurant: "Panda Express", swapName: "Lean Bowl", savings: 500 }]); }}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors ${flow === "gate" ? "bg-yellow-500 text-black" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
              Gate
            </button>
            <button onClick={() => { setPassedGate(true); setFlow("free"); setSelectedId(null); }}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors ${flow === "free" && !selectedId ? "bg-yellow-500 text-black" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
              Free
            </button>
            {restaurants.slice(0, 4).map((r) => (
              <button key={r.id} onClick={() => { setPassedGate(true); setFlow("detail"); setSelectedId(r.id); }}
                className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors ${selectedId === r.id ? "bg-yellow-500 text-black" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
                {r.name.split(" ")[0]}
              </button>
            ))}
            <button onClick={() => { navigateAway("/vsl"); }}
              className="rounded-lg bg-zinc-800 px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 hover:bg-zinc-700">
              VSL
            </button>
            <button onClick={() => { navigateAway("/concierge"); }}
              className="rounded-lg bg-zinc-800 px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 hover:bg-zinc-700">
              Concierge
            </button>
          </div>
        </div>
      )}

      {/* ─── Grid + Detail flow ───────────────────────── */}
      {(flow === "grid" || flow === "detail" || flow === "free") && (
        <>
          {/* Header */}
          <header className="border-b border-zinc-800 bg-black/90 backdrop-blur-md">
            <div className="mx-auto max-w-6xl px-5 pt-4 pb-1">
              <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-zinc-500">Bulletproof Body</p>
            </div>
            <div className="mx-auto max-w-6xl px-5 py-4 text-center">
              <h1 className="text-lg font-semibold uppercase tracking-[0.22em] text-emerald-400">
                {completedSwaps.length === 0
                  ? "Pick a restaurant"
                  : `${completedSwaps.length} swap${completedSwaps.length !== 1 ? "s" : ""} found`}
              </h1>
              <p className="mt-1 text-base text-zinc-400">
                {completedSwaps.length === 0
                  ? "Pick the spot you think you can\u2019t eat at and still lose weight."
                  : "Every swap. Every restaurant. Search anything."}
              </p>
            </div>
          </header>

          <main className="mx-auto max-w-6xl px-4 pb-20 pt-4">
            {/* Search bar — only on restaurant grid, not inside a restaurant */}
            {!selectedId && (
            <div className="sticky top-0 z-10 bg-black pb-4 pt-2">
              <div className="relative">
                <svg
                  className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search any restaurant or menu item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 py-4 pl-12 pr-4 text-lg text-white placeholder-zinc-500 outline-none transition-colors focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            )}

            {/* Progress banner */}
            {completedSwaps.length > 0 && !selectedId && (
              <ProgressBanner completedSwaps={completedSwaps} />
            )}

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-400" />
              </div>
            ) : (
              <LayoutGroup>
                <AnimatePresence mode="wait">
                  {/* ─── Restaurant Grid ──────────────── */}
                  {!selectedId && (!query || filteredRestaurants.length > 0) && (
                    <motion.div
                      key="grid-browse"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="relative"
                    >
                      {/* Tooltip callout */}
                      <AnimatePresence>
                        {showTutorial && (
                          <TooltipCallout
                            swapCount={completedSwaps.length}
                            onDismiss={() => setShowTutorial(false)}
                          />
                        )}
                      </AnimatePresence>

                      {query && filteredRestaurants.length > 0 && (
                        <p className="mb-3 text-base font-medium uppercase tracking-wider text-zinc-400">
                          Restaurants
                        </p>
                      )}
                      <div className={`grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 ${showTutorial ? "pt-20" : ""}`}>
                        {filteredRestaurants.map((r, idx) => {
                          const alreadySwapped = completedSwaps.some((s) => s.restaurant === r.name);
                          return (
                            <motion.button
                              key={r.id}
                              layoutId={`restaurant-${r.id}`}
                              initial={showTutorial ? { opacity: 0, scale: 0.8 } : false}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: showTutorial ? idx * 0.01 : 0, duration: 0.3 }}
                              onClick={() => { setShowTutorial(false); handleRestaurantSelect(r.id); }}
                              className={`group relative aspect-square overflow-hidden rounded-xl border transition-all duration-200 hover:scale-105 ${
                                alreadySwapped
                                  ? "border-emerald-500/40 bg-white shadow-[0_0_16px_rgba(16,185,129,0.15)]"
                                  : "border-zinc-800 bg-white hover:border-emerald-500/50 hover:shadow-[0_0_24px_rgba(16,185,129,0.12)]"
                              }`}
                            >
                              <RestaurantLogo
                                id={r.id}
                                name={r.name}
                                className="h-full w-full"
                                imageClassName="h-auto w-auto"
                                maxSize={LOGO_OVERRIDES[r.id]?.size ?? 92}
                                placeholderClassName="text-sm font-semibold text-zinc-400"
                                yOffset={LOGO_OVERRIDES[r.id]?.yOffset ?? 0}
                              />
                              {/* Completed checkmark */}
                              {alreadySwapped && (
                                <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
                                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              )}
                              {/* Name on hover */}
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1.5 pt-5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                                <p className="text-center text-[10px] font-semibold leading-tight text-white">{r.name}</p>
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>

                      {filteredRestaurants.length === 0 && query && (
                        <div className="py-16 text-center">
                          <p className="text-zinc-500">No restaurants match &ldquo;{searchQuery}&rdquo;</p>
                        </div>
                      )}

                      {/* Request a restaurant */}
                      <RestaurantRequestButton searchQuery={query} trackEvent={trackEvent} />
                    </motion.div>
                  )}

                  {/* ─── Expanded Restaurant View ─────── */}
                  {selectedId && (
                    <motion.div
                      key={`detail-${selectedId}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <RestaurantDetailView
                        restaurant={restaurants.find((r) => r.id === selectedId)!}
                        detail={restaurantData[selectedId]}
                        loading={loadingDetail}
                        onBack={() => { setSelectedId(null); setFlow(passedGate ? "free" : "grid"); }}
                        onSwapComplete={handleSwapComplete}
                        onNavigateAway={navigateAway}
                        trackEvent={trackEvent}
                        capturedEmailRef={capturedEmailRef}
                      />
                    </motion.div>
                  )}

                  {/* ─── No results state ─────────────── */}
                  {query &&
                    filteredRestaurants.length === 0 &&
                    !selectedId && (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="py-20 text-center"
                      >
                        <p className="text-lg text-zinc-500">
                          No results for &ldquo;{searchQuery}&rdquo;
                        </p>
                        <p className="mt-1 text-base text-zinc-400">
                          Try searching a restaurant name or menu item
                        </p>
                      </motion.div>
                    )}
                </AnimatePresence>
              </LayoutGroup>
            )}
          </main>
        </>
      )}

    </div>
  );
}

// ─── Meal Search Result Card ─────────────────────────
function MealSearchResult({ meal }: { meal: Meal }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      {meal.sprite_url ? (
        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg">
          <Image
            src={meal.sprite_url}
            alt={meal.name}
            fill
            className="object-cover"
            sizes="48px"
          />
        </div>
      ) : (
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-800">
          <span className="text-2xl leading-none">
            {getMealEmoji(meal)}
          </span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-semibold text-white">{meal.name}</p>
        <p className="text-base text-zinc-400">
          {meal.totals.calories} cal &middot; {Math.round(meal.totals.protein)}g protein
        </p>
      </div>
      {meal.is_swap === 1 && (
        <span className="flex-shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-sm font-semibold text-emerald-400">
          SWAP
        </span>
      )}
    </div>
  );
}

// ─── Meal Builder Modal (DoorDash-style) ─────────────
// Group sides/drinks by base name for compact display
interface SizeGroup {
  baseName: string;
  sizes: { label: string; item: MenuItem }[];
}

function groupBySizes(items: MenuItem[]): { groups: SizeGroup[]; standalone: MenuItem[] } {
  const sizePatterns = [
    { pattern: /^(Small|Medium|Large)\s+/i, extract: (n: string) => { const m = n.match(/^(Small|Medium|Large)\s+(.*)/i); return m ? { size: m[1], base: m[2] } : null; } },
  ];
  const grouped = new Map<string, { label: string; item: MenuItem }[]>();
  const standalone: MenuItem[] = [];

  for (const item of items) {
    let matched = false;
    for (const { extract } of sizePatterns) {
      const result = extract(item.name);
      if (result) {
        const key = result.base.toLowerCase();
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push({ label: result.size, item });
        matched = true;
        break;
      }
    }
    if (!matched) standalone.push(item);
  }

  const groups: SizeGroup[] = [];
  for (const [, sizes] of grouped) {
    if (sizes.length > 1) {
      const sizeOrder = ["Small", "Medium", "Large"];
      sizes.sort((a, b) => sizeOrder.indexOf(a.label) - sizeOrder.indexOf(b.label));
      groups.push({ baseName: sizes[0].item.name.replace(/^(Small|Medium|Large)\s+/i, ""), sizes });
    } else {
      standalone.push(sizes[0].item);
    }
  }
  return { groups, standalone };
}

// Clean drink display names — strip size prefix, rename to simpler labels
function getCleanDrinkName(name: string): string {
  const map: Record<string, string> = {
    "Medium Coca-Cola": "Soda (Coke)",
    "Medium Sprite": "Soda (Sprite)",
    "Medium Diet Coke": "Diet Soda",
    "Medium Hot Coffee (black)": "Coffee",
    "Small Orange Juice": "Orange Juice",
    "Dasani Water": "Water",
  };
  return map[name] || name.replace(/^(Small|Medium|Large)\s+/i, "");
}

// TODO: UX feedback — cart auto-adds meal items (sides/drink) silently. User didn't notice
// items were added. Make the auto-add more obvious OR don't auto-add (let user explicitly pick).
// TODO: UX feedback — concierge page feels "nauseously busy" after clean game experience.
// Consider a simpler bridge page or piecemeal the transition more gradually.
function MealBuilderModal({
  entree,
  sides,
  drinks,
  sauces,
  comboDefault,
  onAddToOrder,
  onClose,
  editingItem,
}: {
  entree: MenuItem;
  sides: MenuItem[];
  drinks: MenuItem[];
  sauces: MenuItem[];
  comboDefault: ComboDefault;
  onAddToOrder: (item: CartItem) => void;
  onClose: () => void;
  editingItem?: CartItem | null;
}) {
  const [selectedSide, setSelectedSide] = useState<string | null>(
    editingItem?.side?.id ?? comboDefault.side
  );
  const [selectedDrink, setSelectedDrink] = useState<string | null>(
    editingItem?.drink?.id ?? comboDefault.drink
  );
  const [sauceQtys, setSauceQtys] = useState<Map<string, number>>(() => {
    const m = new Map<string, number>();
    if (editingItem) {
      for (const s of editingItem.sauces) m.set(s.item.id, s.qty);
    } else {
      for (const id of comboDefault.sauces) m.set(id, 1);
    }
    return m;
  });
  const [customizing, setCustomizing] = useState(!!editingItem);

  const sideItem = sides.find((s) => s.id === selectedSide);
  const drinkItem = drinks.find((d) => d.id === selectedDrink);
  const sauceEntries = sauces
    .filter((s) => sauceQtys.has(s.id) && sauceQtys.get(s.id)! > 0)
    .map((s) => ({ item: s, qty: sauceQtys.get(s.id)! }));

  const totalCal = Math.round(
    entree.calories +
    (sideItem?.calories ?? 0) +
    (drinkItem?.calories ?? 0) +
    sauceEntries.reduce((sum, s) => sum + s.item.calories * s.qty, 0)
  );

  const toggleSauce = (id: string) => {
    setSauceQtys((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, 1);
      return next;
    });
  };

  const setSauceQty = (id: string, qty: number) => {
    setSauceQtys((prev) => {
      const next = new Map(prev);
      if (qty <= 0) next.delete(id);
      else next.set(id, qty);
      return next;
    });
  };

  const handleAdd = () => {
    onAddToOrder({
      id: editingItem?.id ?? `${entree.id}_${Date.now()}`,
      entree,
      side: sideItem ?? null,
      drink: drinkItem ?? null,
      sauces: sauceEntries,
      totalCalories: totalCal,
    });
  };

  // Pre-compute grouped sides
  const { groups: sideGroups, standalone: standaloneSides } = groupBySizes(sides);

  // Size tab component
  const SizeTabs = ({ sizes, selectedId, onSelect }: { sizes: { label: string; item: MenuItem }[]; selectedId: string | null; onSelect: (id: string) => void }) => (
    <div className="mt-1 flex gap-1">
      {sizes.map(({ label, item }) => (
        <button key={item.id} onClick={() => onSelect(item.id)}
          className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-all ${
            item.id === selectedId
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
              : "bg-zinc-800/60 text-zinc-500 border border-zinc-700/50 hover:border-zinc-600"
          }`}>
          {label} <span className="tabular-nums">{Math.round(item.calories)}</span>
        </button>
      ))}
    </div>
  );

  // Radio row component
  const RadioRow = ({ item, selected, onSelect, label }: { item?: MenuItem; selected: boolean; onSelect: () => void; label?: string }) => (
    <button onClick={onSelect}
      className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm transition-colors ${
        selected ? "border border-emerald-500/40 bg-emerald-500/10 text-white" : "border border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700"
      }`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
          selected ? "border-emerald-500 bg-emerald-500" : "border-zinc-600"
        }`}>
          {selected && (
            <svg className="h-3 w-3 text-black" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          )}
        </div>
        <span>{label ?? item?.name}</span>
      </div>
      <span className="tabular-nums text-zinc-500">{item ? `${Math.round(item.calories)} cal` : "0 cal"}</span>
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative w-full max-w-lg overflow-hidden rounded-t-3xl border-t border-zinc-700 bg-zinc-900"
        style={{ maxHeight: "85vh" }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-900/95 px-5 pb-4 pt-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <button onClick={onClose} className="rounded-full p-1 text-zinc-400 transition-colors hover:text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="text-center">
              <h3 className="text-lg font-bold text-white">{entree.name}</h3>
              <p className="text-sm text-zinc-400">{Math.round(entree.calories)} cal</p>
            </div>
            <div className="w-5" />
          </div>
        </div>

        <div className="overflow-y-auto px-5 pb-28" style={{ maxHeight: "calc(85vh - 140px)" }}>
          {/* Your Meal summary */}
          <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Your Meal</p>
              <div className="text-right">
                <AnimatedCalories value={totalCal} className="text-2xl font-bold tabular-nums text-white" />
                <span className="ml-1 text-sm text-zinc-500">cal</span>
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-300">{entree.name}</span>
                <span className="tabular-nums text-zinc-500">{Math.round(entree.calories)}</span>
              </div>
              {sideItem && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-300">{sideItem.name}</span>
                  <span className="tabular-nums text-zinc-500">{Math.round(sideItem.calories)}</span>
                </div>
              )}
              {drinkItem && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-300">{drinkItem.name}</span>
                  <span className="tabular-nums text-zinc-500">{Math.round(drinkItem.calories)}</span>
                </div>
              )}
              {sauceEntries.map((s) => (
                <div key={s.item.id} className="flex justify-between text-sm">
                  <span className="text-zinc-300">{s.item.name}{s.qty > 1 ? ` x${s.qty}` : ""}</span>
                  <span className="tabular-nums text-zinc-500">{Math.round(s.item.calories * s.qty)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Customize toggle */}
          {!customizing ? (
            <button
              onClick={() => setCustomizing(true)}
              className="mt-4 w-full text-center text-sm text-zinc-400 transition-colors hover:text-emerald-400"
            >
              Not what you usually get? <span className="font-medium text-emerald-500">Customize &darr;</span>
            </button>
          ) : (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 space-y-5">
              {/* Side selection — grouped by size */}
              {sides.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Side</p>
                  <div className="space-y-1">
                    {sideGroups.map((g) => {
                      const isGroupSelected = g.sizes.some((s) => s.item.id === selectedSide);
                      return (
                        <div key={g.baseName}
                          className={`rounded-xl px-4 py-3 transition-colors ${
                            isGroupSelected ? "border border-emerald-500/40 bg-emerald-500/10" : "border border-zinc-800 bg-zinc-950/40"
                          }`}>
                          <button onClick={() => {
                            if (isGroupSelected) setSelectedSide(null);
                            else { const med = g.sizes.find((s) => s.label === "Medium") || g.sizes[0]; setSelectedSide(med.item.id); }
                          }}
                            className="flex w-full items-center justify-between text-sm">
                            <div className="flex items-center gap-3">
                              <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                                isGroupSelected ? "border-emerald-500 bg-emerald-500" : "border-zinc-600"
                              }`}>
                                {isGroupSelected && (
                                  <svg className="h-3 w-3 text-black" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                  </svg>
                                )}
                              </div>
                              <span className={isGroupSelected ? "text-white" : "text-zinc-400"}>{g.baseName}</span>
                            </div>
                            <span className="tabular-nums text-zinc-500">
                              {Math.round(g.sizes.find((s) => s.item.id === selectedSide)?.item.calories ?? g.sizes[0].item.calories)} cal
                            </span>
                          </button>
                          {isGroupSelected && (
                            <SizeTabs sizes={g.sizes} selectedId={selectedSide} onSelect={setSelectedSide} />
                          )}
                        </div>
                      );
                    })}
                    {standaloneSides.map((s) => (
                      <RadioRow key={s.id} item={s} selected={s.id === selectedSide} onSelect={() => setSelectedSide(s.id === selectedSide ? null : s.id)} />
                    ))}
                    <RadioRow selected={selectedSide === null} onSelect={() => setSelectedSide(null)} label="No side" />
                  </div>
                </div>
              )}

              {/* Drink selection */}
              {drinks.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Drink</p>
                  <div className="space-y-1">
                    {drinks.map((d) => (
                      <RadioRow key={d.id} item={d} selected={d.id === selectedDrink}
                        onSelect={() => setSelectedDrink(d.id === selectedDrink ? null : d.id)}
                        label={getCleanDrinkName(d.name)} />
                    ))}
                    <RadioRow selected={selectedDrink === null} onSelect={() => setSelectedDrink(null)} label="No drink" />
                  </div>
                </div>
              )}

              {/* Sauce selection with quantity */}
              {sauces.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Sauces <span className="font-normal normal-case text-zinc-600">(optional)</span></p>
                  <div className="space-y-1">
                    {sauces.map((s) => {
                      const qty = sauceQtys.get(s.id) ?? 0;
                      const isSelected = qty > 0;
                      return (
                        <div key={s.id}
                          className={`rounded-xl px-4 py-3 text-sm transition-colors ${
                            isSelected ? "border border-emerald-500/40 bg-emerald-500/10 text-white" : "border border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700"
                          }`}>
                          <div className="flex items-center justify-between">
                            <button onClick={() => toggleSauce(s.id)} className="flex items-center gap-3">
                              <div className={`flex h-5 w-5 items-center justify-center rounded border ${
                                isSelected ? "border-emerald-500 bg-emerald-500" : "border-zinc-600"
                              }`}>
                                {isSelected && (
                                  <svg className="h-3 w-3 text-black" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                  </svg>
                                )}
                              </div>
                              <span>{s.name}</span>
                            </button>
                            <div className="flex items-center gap-2">
                              {isSelected && (
                                <div className="flex items-center gap-1">
                                  <button onClick={() => setSauceQty(s.id, qty - 1)}
                                    className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-600 text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white">
                                    <span className="text-xs leading-none">&minus;</span>
                                  </button>
                                  <span className="w-5 text-center text-xs tabular-nums text-white">{qty}</span>
                                  <button onClick={() => setSauceQty(s.id, Math.min(qty + 1, 5))}
                                    className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-600 text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white">
                                    <span className="text-xs leading-none">+</span>
                                  </button>
                                </div>
                              )}
                              <span className="tabular-nums text-zinc-500 text-xs">{Math.round(s.calories * (qty || 1))} cal</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Add to order button (sticky bottom) */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-zinc-800 bg-zinc-900/95 px-5 py-4 backdrop-blur-sm">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleAdd}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-8 py-4 text-base font-semibold text-black transition-colors hover:bg-emerald-400"
          >
            <span>{editingItem ? "Update order" : "Add to order"}</span>
            <span className="rounded-full bg-black/20 px-2.5 py-0.5 text-sm">{totalCal} cal</span>
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Cart Bar (fixed bottom bar) ─────────────────────
function CartBar({
  items,
  onShowSwap,
  onClear,
  onEditItem,
  onRemoveItem,
}: {
  items: CartItem[];
  onShowSwap: () => void;
  onClear: () => void;
  onEditItem: (item: CartItem) => void;
  onRemoveItem: (itemId: string) => void;
}) {
  const totalCal = items.reduce((sum, item) => sum + item.totalCalories, 0);
  if (items.length === 0) return null;

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-700 bg-zinc-900/95 px-4 backdrop-blur-sm"
    >
      <div className="mx-auto max-w-lg">
        {/* Always-visible item list */}
        <div className="py-2">
          {items.map((item) => {
            const extras = [item.side?.name, item.drink?.name, ...item.sauces.map((s) => s.item.name + (s.qty > 1 ? ` x${s.qty}` : ""))].filter(Boolean);
            return (
              <div key={item.id} className="flex items-center gap-2 py-1.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{item.entree.name} Meal</p>
                  <p className="text-[11px] text-zinc-500 truncate">
                    {extras.length > 0 ? extras.join(", ") : "No sides"}
                  </p>
                </div>
                <span className="text-xs tabular-nums text-zinc-400 flex-shrink-0">
                  <AnimatedCalories value={item.totalCalories} className="tabular-nums" /> cal
                </span>
                <button onClick={() => onEditItem(item)} className="rounded-lg px-2 py-1 text-[11px] font-medium text-emerald-400 transition-colors hover:bg-emerald-500/10">
                  Edit
                </button>
                <button onClick={() => onRemoveItem(item.id)} className="rounded-full p-1 text-zinc-600 transition-colors hover:text-red-400">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>

        {/* Summary + CTA */}
        <div className="flex items-center gap-3 border-t border-zinc-800 py-3">
          <button onClick={onClear} className="rounded-full p-1.5 text-zinc-500 transition-colors hover:text-zinc-300">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">
              {items.length} {items.length === 1 ? "meal" : "meals"} &middot; <AnimatedCalories value={totalCal} className="tabular-nums" /> cal
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onShowSwap}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-emerald-400"
          >
            <span>Show me the swap</span>
            <motion.span animate={{ x: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>&rarr;</motion.span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Dynamic Swap Generator (fallback when no template swap exists) ──────────
function generateDynamicSwap(item: CartItem, allIngredients: MenuItem[]): { swap: Meal; rationale: string } | null {
  const swapIngredients: MealIngredient[] = [];
  const changes: string[] = [];

  // Group ingredients by category for lookup
  const byCategory = new Map<string, MenuItem[]>();
  for (const ing of allIngredients) {
    const arr = byCategory.get(ing.category_id) || [];
    arr.push(ing);
    byCategory.set(ing.category_id, arr);
  }

  // 1. ENTREE: Find closest lower-calorie option in same category
  const entreeCat = byCategory.get(item.entree.category_id) || [];
  const lowerEntrees = entreeCat
    .filter((e) => e.calories < item.entree.calories && e.id !== item.entree.id)
    .sort((a, b) => b.calories - a.calories); // Highest of the lower options (closest step down)
  const swapEntree = lowerEntrees[0];
  if (swapEntree) {
    swapIngredients.push({ id: swapEntree.id, name: swapEntree.name, calories: swapEntree.calories, protein_g: swapEntree.protein_g, total_fat_g: swapEntree.total_fat_g, carbohydrate_g: swapEntree.carbohydrate_g, quantity: 1 });
    changes.push(`${item.entree.name} → ${swapEntree.name} (-${Math.round(item.entree.calories - swapEntree.calories)} cal)`);
  } else {
    // Already the lowest-cal entree, keep it
    swapIngredients.push({ id: item.entree.id, name: item.entree.name, calories: item.entree.calories, protein_g: item.entree.protein_g, total_fat_g: item.entree.total_fat_g, carbohydrate_g: item.entree.carbohydrate_g, quantity: 1 });
  }

  // 2. SIDE: Downsize fries or swap to lowest-cal side
  if (item.side) {
    const sideCat = byCategory.get(item.side.category_id) || [];
    const friesIds = ["mcd_fries_large", "mcd_fries_med", "mcd_fries_small"];
    const isFries = friesIds.includes(item.side.id);
    if (isFries) {
      // Step down one size, or if small already → apple slices
      const currentIdx = friesIds.indexOf(item.side.id);
      const smallerFries = currentIdx < 2 ? sideCat.find((s) => s.id === friesIds[currentIdx + 1]) : null;
      const swapSide = smallerFries || sideCat.find((s) => s.id === "mcd_apple_slices") || sideCat.reduce((a, b) => a.calories < b.calories ? a : b);
      swapIngredients.push({ id: swapSide.id, name: swapSide.name, calories: swapSide.calories, protein_g: swapSide.protein_g, total_fat_g: swapSide.total_fat_g, carbohydrate_g: swapSide.carbohydrate_g, quantity: 1 });
      if (swapSide.id !== item.side.id) changes.push(`${item.side.name} → ${swapSide.name} (-${Math.round(item.side.calories - swapSide.calories)} cal)`);
    } else if (item.side.calories > 100) {
      // Non-fries side with significant calories → swap to lowest
      const lowestSide = sideCat.reduce((a, b) => a.calories < b.calories ? a : b);
      if (lowestSide.calories < item.side.calories) {
        swapIngredients.push({ id: lowestSide.id, name: lowestSide.name, calories: lowestSide.calories, protein_g: lowestSide.protein_g, total_fat_g: lowestSide.total_fat_g, carbohydrate_g: lowestSide.carbohydrate_g, quantity: 1 });
        changes.push(`${item.side.name} → ${lowestSide.name} (-${Math.round(item.side.calories - lowestSide.calories)} cal)`);
      } else {
        swapIngredients.push({ id: item.side.id, name: item.side.name, calories: item.side.calories, protein_g: item.side.protein_g, total_fat_g: item.side.total_fat_g, carbohydrate_g: item.side.carbohydrate_g, quantity: 1 });
      }
    } else {
      // Already low-cal side, keep it
      swapIngredients.push({ id: item.side.id, name: item.side.name, calories: item.side.calories, protein_g: item.side.protein_g, total_fat_g: item.side.total_fat_g, carbohydrate_g: item.side.carbohydrate_g, quantity: 1 });
    }
  }

  // 3. DRINK: Swap sugary drink to diet/zero cal
  if (item.drink) {
    const zeroCal = ["mcd_diet_coke_med", "mcd_water", "mcd_coffee_med"];
    if (item.drink.calories > 0 && !zeroCal.includes(item.drink.id)) {
      const drinkCat = byCategory.get(item.drink.category_id) || [];
      const dietDrink = drinkCat.find((d) => d.id === "mcd_diet_coke_med") || drinkCat.find((d) => d.calories === 0) || item.drink;
      swapIngredients.push({ id: dietDrink.id, name: dietDrink.name, calories: dietDrink.calories, protein_g: dietDrink.protein_g, total_fat_g: dietDrink.total_fat_g, carbohydrate_g: dietDrink.carbohydrate_g, quantity: 1 });
      if (dietDrink.id !== item.drink.id) changes.push(`${item.drink.name} → ${dietDrink.name} (-${Math.round(item.drink.calories)} cal)`);
    } else {
      swapIngredients.push({ id: item.drink.id, name: item.drink.name, calories: item.drink.calories, protein_g: item.drink.protein_g, total_fat_g: item.drink.total_fat_g, carbohydrate_g: item.drink.carbohydrate_g, quantity: 1 });
    }
  }

  // 4. SAUCES: Swap high-cal sauces, keep low-cal
  for (const s of item.sauces) {
    if (s.item.id === "mcd_ranch_sauce") {
      const bbq = allIngredients.find((i) => i.id === "mcd_bbq_sauce");
      if (bbq) {
        swapIngredients.push({ id: bbq.id, name: bbq.name, calories: bbq.calories, protein_g: bbq.protein_g, total_fat_g: bbq.total_fat_g, carbohydrate_g: bbq.carbohydrate_g, quantity: s.qty });
        changes.push(`Ranch → BBQ sauce (-${Math.round((s.item.calories - bbq.calories) * s.qty)} cal)`);
      } else {
        swapIngredients.push({ id: s.item.id, name: s.item.name, calories: s.item.calories, protein_g: s.item.protein_g, total_fat_g: s.item.total_fat_g, carbohydrate_g: s.item.carbohydrate_g, quantity: s.qty });
      }
    } else {
      swapIngredients.push({ id: s.item.id, name: s.item.name, calories: s.item.calories, protein_g: s.item.protein_g, total_fat_g: s.item.total_fat_g, carbohydrate_g: s.item.carbohydrate_g, quantity: s.qty });
    }
  }

  const totalCal = swapIngredients.reduce((sum, i) => sum + i.calories * i.quantity, 0);
  const totalSavings = item.totalCalories - totalCal;

  // Only return a swap if we actually save something meaningful (>= 30 cal)
  if (totalSavings < 30) return null;

  const rationale = changes.join(". ") + `. Total savings: ~${Math.round(totalSavings)} cal.`;

  return {
    swap: {
      id: `dynamic_swap_${item.id}`,
      name: `Smarter ${item.entree.name}`,
      description: null,
      meal_type: null,
      is_swap: 1,
      swap_for: null,
      swap_rationale: rationale,
      sprite_url: null,
      source: "dynamic",
      ingredients: swapIngredients,
      totals: {
        calories: totalCal,
        protein: swapIngredients.reduce((s, i) => s + i.protein_g * i.quantity, 0),
        fat: swapIngredients.reduce((s, i) => s + i.total_fat_g * i.quantity, 0),
        carbs: swapIngredients.reduce((s, i) => s + i.carbohydrate_g * i.quantity, 0),
      },
    },
    rationale,
  };
}

// ─── Cart Swap Comparison (multi-item) ───────────────
function CartSwapView({
  cart,
  restaurant,
  detail,
  onBack,
  onSwapComplete,
  onNavigateAway,
  trackEvent,
  capturedEmailRef,
}: {
  cart: CartItem[];
  restaurant: Restaurant;
  detail: RestaurantDetail;
  onBack: () => void;
  onSwapComplete?: (restaurant: string, swapName: string, savings: number) => void;
  onNavigateAway?: (url: string) => void;
  trackEvent?: (eventType: string, data?: Record<string, unknown>) => void;
  capturedEmailRef?: React.MutableRefObject<string | null>;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [deadEndLogged, setDeadEndLogged] = useState(false);
  const [wantNotify, setWantNotify] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifySubmitted, setNotifySubmitted] = useState(false);

  const originals = detail.meals.filter((m) => m.is_swap === 0);
  const swapMap = new Map<string, Meal[]>();
  for (const m of detail.meals) {
    if (m.is_swap === 1 && m.swap_for) {
      const existing = swapMap.get(m.swap_for) || [];
      existing.push(m);
      swapMap.set(m.swap_for, existing);
    }
  }

  // Map entree ingredient → template meal
  const ingredientToMeal = new Map<string, Meal>();
  for (const meal of originals) {
    for (const ing of meal.ingredients) {
      const n = ing.name?.toLowerCase() ?? "";
      const isMain = !n.includes("fries") && !n.includes("coke") && !n.includes("sprite") &&
        !n.includes("water") && !n.includes("juice") && !n.includes("coffee") &&
        !n.includes("sauce") && !n.includes("hash brown") && !n.includes("apple slices") &&
        !n.includes("diet") && !n.includes("pepsi");
      if (isMain) ingredientToMeal.set(ing.id, meal);
    }
  }

  const item = cart[currentIndex];
  if (!item) return null;

  const linkedMeal = ingredientToMeal.get(item.entree.id);
  const templateSwap = linkedMeal ? (swapMap.get(linkedMeal.id) || [])[0] : undefined;
  // Fallback: dynamic ingredient-by-ingredient swap when no template exists
  const dynamicResult = !templateSwap ? generateDynamicSwap(item, detail.ingredients) : null;
  const bestSwap = templateSwap || dynamicResult?.swap;

  const originalCal = item.totalCalories;
  const swapCal = bestSwap ? Math.round(bestSwap.totals.calories) : originalCal;
  const savings = bestSwap ? originalCal - swapCal : 0;

  const getSwapForItem = (ci: CartItem) => {
    const lm = ingredientToMeal.get(ci.entree.id);
    const ts = lm ? (swapMap.get(lm.id) || [])[0] : undefined;
    return ts || generateDynamicSwap(ci, detail.ingredients)?.swap;
  };
  const totalCartSavings = cart.reduce((sum, ci) => {
    const sw = getSwapForItem(ci);
    return sum + (sw ? ci.totalCalories - Math.round(sw.totals.calories) : 0);
  }, 0);

  const handleNext = () => {
    if (currentIndex < cart.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setRevealed(false);
    } else if (onSwapComplete && bestSwap) {
      onSwapComplete(restaurant.name, cart.map((c) => c.entree.name).join(" + "), totalCartSavings);
    }
  };

  // Auto-log dead end when no swap is available and user reveals
  useEffect(() => {
    if (revealed && !bestSwap && !deadEndLogged) {
      setDeadEndLogged(true);
      fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: "dead_end",
          comment: `No swap available for ${item.entree.name}`,
          restaurantName: restaurant.name,
          originalMeal: item.entree.name,
          originalCalories: item.totalCalories,
          page: "cart_swap_view",
        }),
      }).catch(() => {});
    }
  }, [revealed, bestSwap, deadEndLogged, item, restaurant.name]);

  // Reset dead-end state when navigating to next item
  useEffect(() => {
    setDeadEndLogged(false);
    setWantNotify(false);
    setNotifyEmail("");
    setNotifySubmitted(false);
  }, [currentIndex]);

  const handleNotifySubmit = () => {
    if (!notifyEmail) return;
    fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rating: "dead_end_notify",
        comment: `Wants notification when swap is added for ${item.entree.name}`,
        restaurantName: restaurant.name,
        originalMeal: item.entree.name,
        originalCalories: item.totalCalories,
        notifyEmail,
        page: "cart_swap_view",
      }),
    }).catch(() => {});
    setNotifySubmitted(true);
  };

  // Build "your order" ingredients from cart item
  const yourOrderIngredients = [
    { name: item.entree.name, calories: item.entree.calories },
    ...(item.side ? [{ name: item.side.name, calories: item.side.calories }] : []),
    ...(item.drink ? [{ name: item.drink.name, calories: item.drink.calories }] : []),
    ...item.sauces.map((s) => ({ name: s.item.name + (s.qty > 1 ? ` x${s.qty}` : ""), calories: s.item.calories * s.qty })),
  ];

  return (
    <div className="mx-auto max-w-lg">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <button onClick={onBack} className="mb-4 flex items-center gap-1.5 text-lg text-zinc-300 transition-colors hover:text-white">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Back to menu
        </button>

        {/* Progress indicator for multi-item */}
        {cart.length > 1 && (
          <div className="mb-4 flex items-center justify-center gap-2">
            {cart.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${i === currentIndex ? "w-6 bg-emerald-500" : i < currentIndex ? "w-3 bg-emerald-500/40" : "w-3 bg-zinc-700"}`} />
            ))}
            <span className="ml-2 text-xs text-zinc-500">{currentIndex + 1} of {cart.length}</span>
          </div>
        )}

        {!revealed && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
            <h2 className="text-2xl font-bold leading-tight text-white">
              {savings > 0 ? (
                <>
                  Want to learn how to lose{" "}
                  <span className="text-emerald-400">{((savings * 7) / 3500).toFixed(1)} lb a week</span>{" "}
                  simply by adjusting your current order at {restaurant.name}?
                </>
              ) : (
                <>Your order at {restaurant.name}</>
              )}
            </h2>
          </motion.div>
        )}

        {/* Side-by-side comparison */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          {/* LEFT: Your order */}
          <motion.div
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
            className={`rounded-2xl border p-5 transition-all duration-700 ${revealed ? "border-red-500/30 bg-red-500/5" : "border-zinc-800 bg-zinc-900/60"}`}
          >
            <div className="mb-4 text-center">
              <span className="text-4xl">{getItemEmoji(item.entree.name)}</span>
              <p className="mt-2 text-xs uppercase tracking-wider text-zinc-500">Your order</p>
            </div>
            <div className="mb-4 text-center">
              <AnimatedCalories value={originalCal}
                className={`text-3xl font-bold tabular-nums transition-colors duration-700 ${revealed ? "text-red-400" : "text-white"}`}
              />
              <span className="ml-1 text-sm text-zinc-500">cal</span>
            </div>
            <div className="space-y-1.5">
              {yourOrderIngredients.map((ing, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs"
                  style={{ background: "rgba(39, 39, 42, 0.5)", boxShadow: "0 0 12px 2px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.05)" }}>
                  <span className="mr-2 truncate text-zinc-400">{ing.name}</span>
                  <span className="flex-shrink-0 font-medium tabular-nums text-zinc-500">{Math.round(ing.calories)}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* RIGHT: Swap reveal */}
          <motion.div
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className={`rounded-2xl border p-5 transition-all duration-700 ${revealed ? "border-emerald-500/40 bg-emerald-500/5 shadow-[0_0_30px_rgba(16,185,129,0.08)]" : "border-zinc-800 bg-zinc-900/60"}`}
          >
            <div className="mb-4 text-center">
              {revealed && bestSwap ? (
                bestSwap.sprite_url ? (
                  <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="relative mx-auto h-20 w-20 overflow-hidden rounded-xl">
                    <img src={bestSwap.sprite_url} alt={bestSwap.name} className="h-full w-full object-cover" />
                  </motion.div>
                ) : (
                  <motion.span initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="inline-block text-4xl">
                    {getMealEmoji(bestSwap)}
                  </motion.span>
                )
              ) : revealed && !bestSwap ? (
                <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative flex h-20 w-20 mx-auto items-center justify-center">
                  <div className="absolute inset-0 rounded-xl bg-zinc-700/20 blur-xl" />
                  <span className="relative text-4xl">🔜</span>
                </motion.div>
              ) : (
                <div className="relative flex h-20 w-20 mx-auto items-center justify-center">
                  <div className="absolute inset-0 rounded-xl bg-emerald-500/10 blur-xl" />
                  <motion.span animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }} transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }} className="relative text-4xl font-bold text-white/80">?</motion.span>
                </div>
              )}
              <p className="mt-2 text-xs uppercase tracking-wider">
                {revealed && bestSwap ? <span className="text-emerald-400">The smarter order</span>
                  /* TODO: UX feedback — "Swap coming soon" feels like a dead end. Consider saying
                     "All good — your order is already optimized! Let's find another meal." */
                  : revealed ? <span className="text-yellow-400">Swap coming soon</span>
                  : <span className="text-zinc-500">Optimized Meal</span>}
              </p>
            </div>
            <div className="mb-4 text-center">
              {revealed && bestSwap ? (
                <><AnimatedCalories value={swapCal} className="text-3xl font-bold tabular-nums text-emerald-400" /><span className="ml-1 text-sm text-zinc-500">cal</span></>
              ) : revealed && !bestSwap ? (
                <p className="text-sm text-zinc-500">We&apos;re building the optimized version of this order</p>
              ) : (
                <div className="flex h-[36px] items-center justify-center">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }} className="h-2 w-2 rounded-full bg-emerald-500/50" />
                    ))}
                  </div>
                </div>
              )}
            </div>
            {revealed && bestSwap ? (
              <div className="space-y-1.5">
                {bestSwap.ingredients.map((ing, i) => {
                  const isNew = !yourOrderIngredients.some((oi) => oi.name === ing.name);
                  return (
                    <div key={`${ing.id}-${i}`} className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs"
                      style={isNew
                        ? { background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16,185,129,0.15)" }
                        : { background: "rgba(39, 39, 42, 0.5)", boxShadow: "0 0 12px 2px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.05)" }}>
                      <span className={`mr-2 flex items-center gap-1.5 truncate ${isNew ? "text-emerald-400" : "text-zinc-400"}`}>
                        {isNew && (
                          <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded bg-emerald-500/20">
                            <span className="text-[9px] font-bold leading-none text-emerald-400">+</span>
                          </span>
                        )}
                        {ing.name}
                      </span>
                      <span className={`flex-shrink-0 font-medium tabular-nums ${isNew ? "text-emerald-400" : "text-zinc-500"}`}>
                        {Math.round(ing.calories * ing.quantity)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-1.5">
                {yourOrderIngredients.map((_, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg px-2.5 py-2"
                    style={{ background: "rgba(39, 39, 42, 0.3)" }}>
                    <div className="h-3 rounded bg-zinc-700/50" style={{ width: `${70 - i * 8}%` }} />
                    <div className="h-3 w-8 rounded bg-zinc-700/50" />
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Reveal / Results */}
        <AnimatePresence mode="wait">
          {!revealed ? (
            <motion.div key="pre-reveal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setRevealed(true)}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-500 px-8 py-4 text-base font-semibold text-black transition-all hover:bg-emerald-400">
                <span>Show me the swap</span>
                <motion.span animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>&rarr;</motion.span>
              </motion.button>
            </motion.div>
          ) : (
            <>
              {bestSwap && bestSwap.swap_rationale && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mb-4">
                  <p className="text-sm italic leading-relaxed text-zinc-500">{bestSwap.swap_rationale}</p>
                </motion.div>
              )}

              {/* No swap available — dead end feedback + notify CTA */}
              {!bestSwap && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
                  className="mb-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5">
                  <div className="text-center">
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/20">
                      <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                      </svg>
                    </div>
                    <p className="text-sm text-zinc-300">We don&apos;t have a swap for <strong>{item.entree.name}</strong> yet.</p>
                    <p className="mt-1 text-xs text-zinc-500">We&apos;ve been notified and are working on it.</p>
                  </div>

                  {!notifySubmitted ? (
                    <div className="mt-4 border-t border-yellow-500/10 pt-4">
                      <label className="flex cursor-pointer items-start gap-2">
                        <input type="checkbox" checked={wantNotify} onChange={(e) => setWantNotify(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-800 accent-emerald-500" />
                        <span className="text-xs text-zinc-400">Notify me when this swap is added</span>
                      </label>
                      {wantNotify && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 flex gap-2">
                          <input type="email" placeholder="your@email.com" value={notifyEmail} onChange={(e) => setNotifyEmail(e.target.value)}
                            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500/50"
                            onKeyDown={(e) => e.key === "Enter" && handleNotifySubmit()} />
                          <button onClick={handleNotifySubmit} disabled={!notifyEmail}
                            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-emerald-400 disabled:opacity-40">
                            Notify me
                          </button>
                        </motion.div>
                      )}
                    </div>
                  ) : (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="mt-4 border-t border-yellow-500/10 pt-3 text-center text-xs text-emerald-400">
                      We&apos;ll let you know when it&apos;s ready.
                    </motion.p>
                  )}
                </motion.div>
              )}

              {/* Savings banner */}
              {savings > 0 && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
                  className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                  <p className="text-3xl font-bold text-emerald-400">{savings} cal saved</p>
                  <p className="mt-1 text-sm text-zinc-400">from this one meal</p>
                </motion.div>
              )}

              {/* Feedback on this swap */}
              {bestSwap && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                  <FeedbackWidget
                    context={{
                      restaurantName: restaurant.name,
                      originalMeal: item.entree.name,
                      originalCalories: item.totalCalories,
                      swapMeal: bestSwap.name,
                      swapCalories: Math.round(bestSwap.totals.calories),
                      savings,
                    }}
                    variant="swap"
                  />
                </motion.div>
              )}

              {currentIndex < cart.length - 1 ? (
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleNext}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-500 px-8 py-4 text-base font-semibold text-black transition-all hover:bg-emerald-400">
                  <span>Next item</span>
                  <span>&rarr;</span>
                </motion.button>
              ) : (
                <SwapSavingsCard
                  savings={totalCartSavings}
                  restaurantName={restaurant.name}
                  swapName={cart.map((c) => c.entree.name).join(" + ")}
                  onSwapComplete={onSwapComplete}
                  onNavigateAway={onNavigateAway}
                  trackEvent={trackEvent}
                  capturedEmailRef={capturedEmailRef}
                />
              )}
            </>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ─── Restaurant Detail View ──────────────────────────
function RestaurantDetailView({
  restaurant,
  detail,
  loading,
  onBack,
  onSwapComplete,
  onNavigateAway,
  trackEvent,
  capturedEmailRef,
}: {
  restaurant: Restaurant;
  detail: RestaurantDetail | undefined;
  loading: boolean;
  onBack: () => void;
  onSwapComplete?: (restaurant: string, swapName: string, savings: number) => void;
  onNavigateAway?: (url: string) => void;
  trackEvent?: (eventType: string, data?: Record<string, unknown>) => void;
  capturedEmailRef?: React.MutableRefObject<string | null>;
}) {
  const [mealQuery, setMealQuery] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  // Cart builder state (McDonald's and similar)
  const isCartBuilder = CART_BUILDER_RESTAURANTS.has(restaurant.id);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [builderEntree, setBuilderEntree] = useState<MenuItem | null>(null);
  const [showCartSwap, setShowCartSwap] = useState(false);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);

  const addToCart = useCallback((item: CartItem) => {
    setCart((prev) => {
      // If editing, replace the item
      const idx = prev.findIndex((ci) => ci.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [...prev, item];
    });
    setBuilderEntree(null);
    setEditingCartItem(null);
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart((prev) => prev.filter((ci) => ci.id !== itemId));
  }, []);

  const editCartItem = useCallback((item: CartItem) => {
    setEditingCartItem(item);
    // Use the entree MenuItem directly from the cart item
    setBuilderEntree(item.entree);
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setShowCartSwap(false);
  }, []);

  if (loading || !detail) {
    return (
      <div>
        <BackButton onClick={onBack} />
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-400" />
        </div>
      </div>
    );
  }

  // All individual menu items from the ingredients table (the PDF data)
  // Filter out sauces/condiments categories
  const menuItems = (detail.ingredients || []).filter(
    (ing) => !ing.category_id?.toLowerCase().includes("sauce")
  );
  const categories = (detail.categories || []).filter(
    (cat) => !cat.id?.toLowerCase().includes("sauce")
  );

  // Build a map: ingredient_id → template meals that contain it
  const originals = detail.meals.filter((m) => m.is_swap === 0);
  const swapMap = new Map<string, Meal[]>();
  for (const m of detail.meals) {
    if (m.is_swap === 1 && m.swap_for) {
      const existing = swapMap.get(m.swap_for) || [];
      existing.push(m);
      swapMap.set(m.swap_for, existing);
    }
  }

  // Map: ingredient_id → template meal original that contains it as the "main" item
  const ingredientToMeal = new Map<string, Meal>();
  for (const meal of originals) {
    for (const ing of meal.ingredients) {
      // The first non-drink, non-sauce, non-side ingredient is the "main"
      const isMainItem = !ing.name?.toLowerCase().includes("fries") &&
        !ing.name?.toLowerCase().includes("coke") &&
        !ing.name?.toLowerCase().includes("sprite") &&
        !ing.name?.toLowerCase().includes("water") &&
        !ing.name?.toLowerCase().includes("juice") &&
        !ing.name?.toLowerCase().includes("coffee") &&
        !ing.name?.toLowerCase().includes("sauce") &&
        !ing.name?.toLowerCase().includes("hash brown") &&
        !ing.name?.toLowerCase().includes("apple slices");
      if (isMainItem) {
        ingredientToMeal.set((ing as MealIngredient).id, meal);
      }
    }
  }

  const mq = mealQuery.toLowerCase().trim();
  const filteredItems = mq
    ? menuItems.filter((item) => item.name.toLowerCase().includes(mq))
    : menuItems;

  // Group by category
  const categoryMap = new Map<string, MenuCategory>();
  for (const cat of categories) categoryMap.set(cat.id, cat);

  const groupedItems = new Map<string, MenuItem[]>();
  for (const item of filteredItems) {
    const catId = item.category_id || "other";
    const existing = groupedItems.get(catId) || [];
    existing.push(item);
    groupedItems.set(catId, existing);
  }

  // ─── Cart Builder Flow (McDonald's and similar) ─────
  if (isCartBuilder) {
    const allIngredients = detail.ingredients || [];
    const entreeItems = allIngredients.filter((i) => ENTREE_CATEGORIES.has(i.category_id));
    const sideItems = allIngredients.filter((i) => SIDE_CATEGORIES.has(i.category_id));
    const drinkItems = allIngredients.filter((i) => DRINK_CATEGORIES.has(i.category_id));
    const sauceItems = allIngredients.filter((i) => SAUCE_CATEGORIES.has(i.category_id));

    // All entree categories for display
    const entreeCats = (detail.categories || []).filter((c) => ENTREE_CATEGORIES.has(c.id));

    const comboDefaults = COMBO_DEFAULTS[restaurant.id] || {};

    // Cart swap view
    if (showCartSwap && cart.length > 0) {
      return (
        <CartSwapView
          cart={cart}
          restaurant={restaurant}
          detail={detail}
          onBack={() => setShowCartSwap(false)}
          onSwapComplete={onSwapComplete}
          onNavigateAway={onNavigateAway}
          trackEvent={trackEvent}
          capturedEmailRef={capturedEmailRef}
        />
      );
    }

    // Filter entrees by search
    const eq = mealQuery.toLowerCase().trim();
    const filteredEntrees = eq
      ? entreeItems.filter((item) => item.name.toLowerCase().includes(eq))
      : entreeItems;

    // Group entrees by category
    const entreeGroups = new Map<string, MenuItem[]>();
    for (const item of filteredEntrees) {
      const catId = item.category_id || "other";
      const existing = entreeGroups.get(catId) || [];
      existing.push(item);
      entreeGroups.set(catId, existing);
    }

    return (
      <div className="mx-auto max-w-lg pb-24">
        <BackButton onClick={onBack} />

        {/* Compact restaurant header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl border border-zinc-700">
            <RestaurantLogo id={restaurant.id} name={restaurant.name} className="h-full w-full"
              imageClassName="h-full w-full object-contain p-1" placeholderClassName="text-lg font-semibold tracking-wide text-zinc-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{restaurant.name}</h2>
            <p className="text-sm text-zinc-400">Build your order, see the swap</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input type="text" value={mealQuery} onChange={(e) => setMealQuery(e.target.value)}
            placeholder="What do you normally order?"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 py-3 pl-12 pr-10 text-base text-white placeholder-zinc-500 outline-none transition-colors focus:border-emerald-500/50"
            ref={(el) => { if (el && window.innerWidth >= 768) el.focus(); }} />
          {mealQuery && (
            <button onClick={() => setMealQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-500 transition-colors hover:text-zinc-300">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Entree items grouped by category */}
        {Array.from(entreeGroups.entries())
          .sort((a, b) => {
            const catA = entreeCats.find((c) => c.id === a[0]);
            const catB = entreeCats.find((c) => c.id === b[0]);
            return (catA?.display_order ?? 99) - (catB?.display_order ?? 99);
          })
          .map(([catId, items]) => {
            const cat = entreeCats.find((c) => c.id === catId);
            return (
              <div key={catId} className="mb-4">
                {!eq && cat && (
                  <p className="mb-2 text-sm font-medium uppercase tracking-wider text-zinc-500">{cat.name}</p>
                )}
                <div className="space-y-2">
                  {items.map((item) => {
                    const hasMealSwap = ingredientToMeal.has(item.id) && swapMap.has(ingredientToMeal.get(item.id)!.id);
                    return (
                      <motion.button key={item.id}
                        onClick={() => setBuilderEntree(item)}
                        className="flex w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-left transition-colors hover:border-zinc-600"
                        whileTap={{ scale: 0.98 }}>
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-800">
                          <span className="text-xl leading-none">{getItemEmoji(item.name)}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-semibold text-white">{item.name}</p>
                          <p className="text-sm text-zinc-400">
                            {Math.round(item.calories)} cal &middot; {Math.round(item.protein_g)}g P &middot; {Math.round(item.total_fat_g)}g F &middot; {Math.round(item.carbohydrate_g)}g C
                          </p>
                        </div>
                        {hasMealSwap && (
                          <span className="flex-shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">SWAP</span>
                        )}
                        <svg className="h-5 w-5 flex-shrink-0 text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            );
          })}

        {eq && filteredEntrees.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-zinc-500">No items match &ldquo;{mealQuery}&rdquo;</p>
            <p className="mt-1 text-sm text-zinc-600">Try a different name</p>
          </div>
        )}

        {/* Meal Builder Modal */}
        <AnimatePresence>
          {builderEntree && (
            <MealBuilderModal
              entree={builderEntree}
              sides={sideItems}
              drinks={drinkItems}
              sauces={sauceItems}
              comboDefault={comboDefaults[builderEntree.category_id] || { side: "mcd_fries_med", drink: "mcd_coke_med", sauces: [] }}
              onAddToOrder={addToCart}
              onClose={() => { setBuilderEntree(null); setEditingCartItem(null); }}
              editingItem={editingCartItem}
            />
          )}
        </AnimatePresence>

        {/* Cart Bar */}
        <AnimatePresence>
          {cart.length > 0 && !builderEntree && (
            <CartBar
              items={cart}
              onShowSwap={() => setShowCartSwap(true)}
              onClear={clearCart}
              onEditItem={editCartItem}
              onRemoveItem={removeFromCart}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ─── Standard flow (non-cart-builder restaurants) ──
  const selectedItem = menuItems.find((i) => i.id === selectedItemId);
  const linkedMeal = selectedItem ? ingredientToMeal.get(selectedItem.id) : undefined;
  const bestSwap = linkedMeal ? (swapMap.get(linkedMeal.id) || [])[0] : undefined;

  // ─── Auto-swap fallback: find lowest-cal item in same category ──
  const autoSwapItem = useMemo(() => {
    if (bestSwap || !selectedItem) return undefined;
    const sameCat = menuItems.filter(
      (i) =>
        i.category_id === selectedItem.category_id &&
        i.id !== selectedItem.id &&
        i.calories < selectedItem.calories &&
        i.calories > 0
    );
    if (sameCat.length === 0) {
      // Fall back to any lower-cal item across the whole menu
      const anyLower = menuItems.filter(
        (i) =>
          i.id !== selectedItem.id &&
          i.calories < selectedItem.calories &&
          i.calories > 0 &&
          i.protein_g >= 5 // must have some protein
      );
      if (anyLower.length === 0) return undefined;
      // Pick the one with best protein-to-calorie ratio
      anyLower.sort((a, b) => (b.protein_g / b.calories) - (a.protein_g / a.calories));
      return anyLower[0];
    }
    // Pick lowest calories, break ties by highest protein
    sameCat.sort((a, b) => a.calories - b.calories || b.protein_g - a.protein_g);
    return sameCat[0];
  }, [bestSwap, selectedItem, menuItems]);

  // ─── Swap comparison view ─────────────────────────
  if (selectedItem) {
    const originalCal = linkedMeal
      ? Math.round(linkedMeal.totals.calories)
      : Math.round(selectedItem.calories);
    const swapCal = bestSwap ? Math.round(bestSwap.totals.calories) : (autoSwapItem ? Math.round(autoSwapItem.calories) : 0);
    const savings = bestSwap ? originalCal - swapCal : (autoSwapItem ? Math.round(selectedItem.calories) - Math.round(autoSwapItem.calories) : 0);

    // If there's a linked template meal with a swap, show the full comparison
    if (linkedMeal && bestSwap) {
      return (
        <div className="mx-auto max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <button
            onClick={() => { setSelectedItemId(null); setRevealed(false); }}
            className="mb-4 flex items-center gap-1.5 text-lg text-zinc-300 transition-colors hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            {restaurant.name} Menu
          </button>

          {!revealed && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
              <h2 className="text-2xl font-bold leading-tight text-white">
                Want to learn how to lose{" "}
                <span className="text-emerald-400">{((savings * 7) / 3500).toFixed(1)} lb a week</span>{" "}
                simply by adjusting your current order at {restaurant.name}?
              </h2>
            </motion.div>
          )}

          {/* Side-by-side comparison */}
          <div className="mb-6 grid grid-cols-2 gap-3">
            {/* LEFT: Your order */}
            <motion.div
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
              className={`rounded-2xl border p-5 transition-all duration-700 ${revealed ? "border-red-500/30 bg-red-500/5" : "border-zinc-800 bg-zinc-900/60"}`}
            >
              <div className="mb-4 text-center">
                {linkedMeal.sprite_url ? (
                  <div className="mx-auto h-20 w-20 overflow-hidden rounded-xl">
                    <img src={linkedMeal.sprite_url} alt={linkedMeal.name} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <span className="text-4xl">{getMealEmoji(linkedMeal)}</span>
                )}
                <p className="mt-2 text-xs uppercase tracking-wider text-zinc-500">Your order</p>
              </div>
              <div className="mb-4 text-center">
                <AnimatedCalories value={originalCal}
                  className={`text-3xl font-bold tabular-nums transition-colors duration-700 ${revealed ? "text-red-400" : "text-white"}`}
                />
                <span className="ml-1 text-sm text-zinc-500">cal</span>
              </div>
              <div className="space-y-1.5">
                {linkedMeal.ingredients.slice(0, 6).map((ing, i) => (
                  <div key={`${ing.id}-${i}`} className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs"
                    style={{ background: "rgba(39, 39, 42, 0.5)", boxShadow: "0 0 12px 2px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.05)" }}>
                    <span className="mr-2 truncate text-zinc-400">{ing.name}</span>
                    <span className="flex-shrink-0 font-medium tabular-nums text-zinc-500">{Math.round(ing.calories * ing.quantity)}</span>
                  </div>
                ))}
              </div>
              {revealed && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-3 rounded-lg bg-red-500/10 px-3 py-2">
                  <p className="text-[11px] text-red-400/80">
                    {linkedMeal.totals.fat > 30 ? `${Math.round(linkedMeal.totals.fat)}g of fat hiding in plain sight` : `${Math.round(linkedMeal.totals.carbs)}g carbs — more than you think`}
                  </p>
                </motion.div>
              )}
            </motion.div>

            {/* RIGHT: Swap reveal */}
            <motion.div
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
              className={`rounded-2xl border p-5 transition-all duration-700 ${revealed ? "border-emerald-500/40 bg-emerald-500/5 shadow-[0_0_30px_rgba(16,185,129,0.08)]" : "border-zinc-800 bg-zinc-900/60"}`}
            >
              <div className="mb-4 text-center">
                {revealed ? (
                  bestSwap.sprite_url ? (
                    <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="relative mx-auto h-20 w-20 overflow-hidden rounded-xl">
                      <img src={bestSwap.sprite_url} alt={bestSwap.name} className="h-full w-full object-cover" />
                    </motion.div>
                  ) : (
                    <motion.span initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="inline-block text-4xl">
                      {getMealEmoji(bestSwap)}
                    </motion.span>
                  )
                ) : (
                  <div className="relative flex h-20 w-20 mx-auto items-center justify-center">
                    <div className="absolute inset-0 rounded-xl bg-emerald-500/10 blur-xl" />
                    <motion.span
                      animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
                      transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                      className="relative text-4xl font-bold text-white/80"
                    >
                      ?
                    </motion.span>
                  </div>
                )}
                <p className="mt-2 text-xs uppercase tracking-wider">
                  {revealed ? <span className="text-emerald-400">The smarter order</span> : <span className="text-zinc-500">Optimized Meal</span>}
                </p>
              </div>
              <div className="mb-4 text-center">
                {revealed ? (
                  <><AnimatedCalories value={swapCal} className="text-3xl font-bold tabular-nums text-emerald-400" /><span className="ml-1 text-sm text-zinc-500">cal</span></>
                ) : (
                  <div className="flex h-[36px] items-center justify-center">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }} className="h-2 w-2 rounded-full bg-emerald-500/50" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {revealed ? (
                <>
                  {/* Removed items from original */}
                  <div className="space-y-1.5">
                    {linkedMeal.ingredients.filter((ing) => !bestSwap.ingredients.some((si) => si.name === ing.name)).map((ing, i) => (
                      <div key={`rm-${ing.id}-${i}`} className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs"
                        style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
                        <span className="mr-2 flex items-center gap-1.5 truncate text-red-400 line-through">
                          <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded bg-red-500/20">
                            <span className="text-[9px] font-bold leading-none text-red-400">✕</span>
                          </span>
                          {ing.name}
                        </span>
                        <span className="flex-shrink-0 font-semibold tabular-nums text-red-400">−{Math.round(ing.calories * ing.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  {/* New swap items (the actual replacement meal) */}
                  <div className="mt-2 space-y-1.5">
                    {bestSwap.ingredients.map((ing, i) => {
                      const isNew = !linkedMeal.ingredients.some((oi) => oi.name === ing.name);
                      return (
                        <div key={`add-${ing.id}-${i}`} className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs"
                          style={isNew
                            ? { background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16,185,129,0.15)" }
                            : { background: "rgba(39, 39, 42, 0.5)", boxShadow: "0 0 12px 2px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.05)" }}>
                          <span className={`mr-2 flex items-center gap-1.5 truncate ${isNew ? "text-emerald-400" : "text-zinc-400"}`}>
                            {isNew && (
                              <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded bg-emerald-500/20">
                                <span className="text-[9px] font-bold leading-none text-emerald-400">+</span>
                              </span>
                            )}
                            {ing.name}
                          </span>
                          <span className={`flex-shrink-0 font-medium tabular-nums ${isNew ? "text-emerald-400" : "text-zinc-500"}`}>
                            {Math.round(ing.calories * ing.quantity)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {bestSwap.swap_rationale && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-3">
                      <p className="text-[11px] italic leading-relaxed text-zinc-500">{bestSwap.swap_rationale}</p>
                    </motion.div>
                  )}
                </>
              ) : (
                <div className="space-y-1.5">
                  {linkedMeal.ingredients.slice(0, 6).map((_, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg px-2.5 py-2"
                      style={{ background: "rgba(39, 39, 42, 0.3)" }}>
                      <div className="h-3 rounded bg-zinc-700/50" style={{ width: `${70 - i * 8}%` }} />
                      <div className="h-3 w-8 rounded bg-zinc-700/50" />
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Reveal / Results */}
          <AnimatePresence mode="wait">
            {!revealed ? (
              <motion.div key="pre-reveal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setRevealed(true)}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-500 px-8 py-4 text-base font-semibold text-black transition-all hover:bg-emerald-400">
                  <span>Show me the swap</span>
                  <motion.span animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>&rarr;</motion.span>
                </motion.button>
              </motion.div>
            ) : (
              <>
                <SwapSavingsCard savings={savings} restaurantName={restaurant.name} swapName={bestSwap?.name} onSwapComplete={onSwapComplete} onNavigateAway={onNavigateAway} trackEvent={trackEvent} capturedEmailRef={capturedEmailRef} />
                <FeedbackWidget variant="swap" context={{
                  section: "swap_comparison",
                  restaurantName: restaurant.name,
                  originalMeal: linkedMeal.name,
                  originalCalories: linkedMeal.totals.calories,
                  swapMeal: bestSwap.name,
                  swapCalories: bestSwap.totals.calories,
                  savings,
                  swapIngredients: bestSwap.ingredients.map((i) => ({ name: i.name, cal: Math.round(i.calories * i.quantity) })),
                  originalIngredients: linkedMeal.ingredients.map((i) => ({ name: i.name, cal: Math.round(i.calories * i.quantity) })),
                  swapRationale: bestSwap.swap_rationale,
                }} />
              </>
            )}
          </AnimatePresence>
        </motion.div>
        </div>
      );
    }

    // Auto-swap fallback — same side-by-side layout as curated swaps
    if (autoSwapItem) {
      const autoSavings = Math.round(selectedItem.calories) - Math.round(autoSwapItem.calories);
      const autoWeeklyLbs = ((autoSavings * 7) / 3500).toFixed(1);
      return (
        <div className="mx-auto max-w-lg">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <button onClick={() => { setSelectedItemId(null); setRevealed(false); }}
            className="mb-4 flex items-center gap-1.5 text-lg text-zinc-300 transition-colors hover:text-white">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            {restaurant.name} Menu
          </button>

          {!revealed && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
              <h2 className="text-2xl font-bold leading-tight text-white">
                Want to learn how to lose{" "}
                <span className="text-emerald-400">{autoWeeklyLbs} lb a week</span>{" "}
                simply by adjusting your current order at {restaurant.name}?
              </h2>
            </motion.div>
          )}

          {/* Side-by-side comparison — same as curated */}
          <div className="mb-6 grid grid-cols-2 gap-3">
            {/* LEFT: Your order */}
            <motion.div
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
              className={`rounded-2xl border p-5 transition-all duration-700 ${revealed ? "border-red-500/30 bg-red-500/5" : "border-zinc-800 bg-zinc-900/60"}`}
            >
              <div className="mb-4 text-center">
                <span className="text-4xl">{getItemEmoji(selectedItem.name)}</span>
                <p className="mt-2 text-xs uppercase tracking-wider text-zinc-500">Your order</p>
              </div>
              <div className="mb-4 text-center">
                <AnimatedCalories value={Math.round(selectedItem.calories)}
                  className={`text-3xl font-bold tabular-nums transition-colors duration-700 ${revealed ? "text-red-400" : "text-white"}`}
                />
                <span className="ml-1 text-sm text-zinc-500">cal</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs"
                  style={{ background: "rgba(39, 39, 42, 0.5)", boxShadow: "0 0 12px 2px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.05)" }}>
                  <span className="mr-2 truncate text-zinc-400">{selectedItem.name}</span>
                  <span className="flex-shrink-0 font-medium tabular-nums text-zinc-500">{Math.round(selectedItem.calories)}</span>
                </div>
              </div>
              {revealed && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-3 rounded-lg bg-red-500/10 px-3 py-2">
                  <p className="text-[11px] text-red-400/80">
                    {Math.round(selectedItem.total_fat_g) > 20 ? `${Math.round(selectedItem.total_fat_g)}g of fat hiding in plain sight` : `${Math.round(selectedItem.carbohydrate_g)}g carbs — more than you think`}
                  </p>
                </motion.div>
              )}
            </motion.div>

            {/* RIGHT: Swap reveal */}
            <motion.div
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
              className={`rounded-2xl border p-5 transition-all duration-700 ${revealed ? "border-emerald-500/40 bg-emerald-500/5 shadow-[0_0_30px_rgba(16,185,129,0.08)]" : "border-zinc-800 bg-zinc-900/60"}`}
            >
              <div className="mb-4 text-center">
                {revealed ? (
                  <motion.span initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="inline-block text-4xl">
                    {getItemEmoji(autoSwapItem.name)}
                  </motion.span>
                ) : (
                  <div className="relative flex h-20 w-20 mx-auto items-center justify-center">
                    <div className="absolute inset-0 rounded-xl bg-emerald-500/10 blur-xl" />
                    <motion.span
                      animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
                      transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                      className="relative text-4xl font-bold text-white/80"
                    >
                      ?
                    </motion.span>
                  </div>
                )}
                <p className="mt-2 text-xs uppercase tracking-wider">
                  {revealed ? <span className="text-emerald-400">The smarter order</span> : <span className="text-zinc-500">Optimized Meal</span>}
                </p>
              </div>
              <div className="mb-4 text-center">
                {revealed ? (
                  <><AnimatedCalories value={Math.round(autoSwapItem.calories)} className="text-3xl font-bold tabular-nums text-emerald-400" /><span className="ml-1 text-sm text-zinc-500">cal</span></>
                ) : (
                  <div className="flex h-[36px] items-center justify-center">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }} className="h-2 w-2 rounded-full bg-emerald-500/50" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {revealed ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs"
                    style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16,185,129,0.15)" }}>
                    <span className="mr-2 flex items-center gap-1.5 truncate text-emerald-400">
                      <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded bg-emerald-500/20">
                        <span className="text-[9px] font-bold leading-none text-emerald-400">+</span>
                      </span>
                      {autoSwapItem.name}
                    </span>
                    <span className="flex-shrink-0 font-medium tabular-nums text-emerald-400">{Math.round(autoSwapItem.calories)}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg px-2.5 py-2"
                      style={{ background: "rgba(39, 39, 42, 0.3)" }}>
                      <div className="h-3 rounded bg-zinc-700/50" style={{ width: `${70 - i * 8}%` }} />
                      <div className="h-3 w-8 rounded bg-zinc-700/50" />
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Reveal / Results */}
          <AnimatePresence mode="wait">
            {!revealed ? (
              <motion.div key="pre-reveal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setRevealed(true)}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-500 px-8 py-4 text-base font-semibold text-black transition-all hover:bg-emerald-400">
                  <span>Show me the swap</span>
                  <motion.span animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>&rarr;</motion.span>
                </motion.button>
              </motion.div>
            ) : (
              <>
                <SwapSavingsCard savings={autoSavings} restaurantName={restaurant.name} swapName={autoSwapItem.name} onSwapComplete={onSwapComplete} onNavigateAway={onNavigateAway} trackEvent={trackEvent} capturedEmailRef={capturedEmailRef} />
                <FeedbackWidget variant="swap" context={{
                  section: "auto_swap",
                  restaurantName: restaurant.name,
                  originalMeal: autoSwapItem.name,
                  originalCalories: autoSwapItem.calories,
                  swapMeal: autoSwapItem.name,
                  swapCalories: autoSwapItem.calories - autoSavings,
                  savings: autoSavings,
                }} />
              </>
            )}
          </AnimatePresence>
        </motion.div>
        </div>
      );
    }

    // Truly no swap possible (item is already the lowest cal on the menu)
    return (
      <div className="mx-auto max-w-lg">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <button onClick={() => { setSelectedItemId(null); setRevealed(false); }}
          className="mb-4 flex items-center gap-1.5 text-lg text-zinc-300 transition-colors hover:text-white">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          {restaurant.name} Menu
        </button>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
            <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white">{selectedItem.name}</h3>
          <div className="mt-2 flex justify-center gap-4 text-sm text-zinc-400">
            <span className="font-medium text-emerald-400">{Math.round(selectedItem.calories)} cal</span>
            <span>{Math.round(selectedItem.protein_g)}g P</span>
          </div>
          <p className="mt-4 text-sm font-medium text-emerald-400">
            This is already one of the best options here.
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Great pick. No swap needed.
          </p>
        </div>
      </motion.div>
      </div>
    );
  }

  // ─── Menu search view (no item selected) ──────────
  const totalItems = menuItems.length;

  return (
    <div className="mx-auto max-w-lg">
      <BackButton onClick={onBack} />

      {/* Compact restaurant header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl border border-zinc-700">
          <RestaurantLogo id={restaurant.id} name={restaurant.name} className="h-full w-full"
            imageClassName="h-full w-full object-contain p-1" placeholderClassName="text-lg font-semibold tracking-wide text-zinc-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">{restaurant.name}</h2>
          <p className="text-sm text-zinc-400">{totalItems} items on the menu</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input type="text" value={mealQuery} onChange={(e) => setMealQuery(e.target.value)}
          placeholder="What do you normally order?"
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 py-3 pl-12 pr-10 text-base text-white placeholder-zinc-500 outline-none transition-colors focus:border-emerald-500/50"
          ref={(el) => { if (el && window.innerWidth >= 768) el.focus(); }} />
        {mealQuery && (
          <button onClick={() => setMealQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-500 transition-colors hover:text-zinc-300">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Items grouped by category */}
      {Array.from(groupedItems.entries())
        .sort((a, b) => {
          const catA = categoryMap.get(a[0]);
          const catB = categoryMap.get(b[0]);
          return (catA?.display_order ?? 99) - (catB?.display_order ?? 99);
        })
        .map(([catId, items]) => {
          const cat = categoryMap.get(catId);
          return (
            <div key={catId} className="mb-4">
              {!mq && cat && (
                <p className="mb-2 text-sm font-medium uppercase tracking-wider text-zinc-500">{cat.name}</p>
              )}
              <div className="space-y-2">
                {items.map((item) => {
                  const hasMealSwap = ingredientToMeal.has(item.id) && swapMap.has(ingredientToMeal.get(item.id)!.id);
                  return (
                    <motion.button key={item.id}
                      onClick={() => { trackEvent?.("bible_meal_selected", { restaurant: restaurant.name, meal: item.name, calories: Math.round(item.calories) }); setSelectedItemId(item.id); setRevealed(false); }}
                      className="flex w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-left transition-colors hover:border-zinc-600"
                      whileTap={{ scale: 0.98 }}>
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-800">
                        <span className="text-xl leading-none">{getItemEmoji(item.name)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold text-white">{item.name}</p>
                        <p className="text-sm text-zinc-400">
                          {Math.round(item.calories)} cal &middot; {Math.round(item.protein_g)}g P &middot; {Math.round(item.total_fat_g)}g F &middot; {Math.round(item.carbohydrate_g)}g C
                        </p>
                      </div>
                      {hasMealSwap && (
                        <span className="flex-shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">SWAP</span>
                      )}
                      <svg className="h-4 w-4 flex-shrink-0 text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                      </svg>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}

      {mq && filteredItems.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-zinc-500">No items match &ldquo;{mealQuery}&rdquo;</p>
          <p className="mt-1 text-sm text-zinc-600">Try a different name</p>
        </div>
      )}
    </div>
  );
}

// ─── Post-Swap Flow (savings → weight → projection → generating → crossroads) ─────────────
const REPORT_DURATION_MS = 10500;
const GENERATING_BLOCKS = [
  {
    threshold: 10,
    label: "Why diets failed you",
    copy: "They asked you to eat less. We just showed you how to order smarter.",
  },
  {
    threshold: 40,
    label: "What just happened",
    copy: "Same restaurant. Same craving. Fewer calories. No willpower required.",
  },
  {
    threshold: 70,
    label: "How it works",
    bullets: [
      "We swap your real orders, not your lifestyle.",
      "Built for your worst days. No cardio. No meal prep.",
      "Small changes that add up to real weight loss every week.",
    ],
  },
];
const REPORT_STEPS = [
  { threshold: 20, label: "Adding up your weekly calorie savings" },
  { threshold: 55, label: "Mapping your weight loss timeline" },
  { threshold: 85, label: "Putting together your swap plan" },
];

function SwapSavingsCard({ savings, restaurantName, swapName, onSwapComplete, onNavigateAway, trackEvent, capturedEmailRef }: { savings: number; restaurantName: string; swapName?: string; onSwapComplete?: (restaurant: string, swapName: string, savings: number) => void; onNavigateAway?: (url: string) => void; trackEvent?: (eventType: string, data?: Record<string, unknown>) => void; capturedEmailRef?: React.MutableRefObject<string | null> }) {
  const [phase, setPhase] = useState<"savings" | "weight" | "projection" | "generating" | "crossroads" | "bridge">("savings");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ordersPerWeek, setOrdersPerWeek] = useState(7);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [goalWeight, setGoalWeight] = useState<number | null>(null);
  const [genProgress, setGenProgress] = useState(0);
  const [genComplete, setGenComplete] = useState(false);

  // Track swap revealed on mount
  useEffect(() => {
    trackEvent?.("bible_swap_revealed", { restaurant: restaurantName, meal: swapName, calories_saved: savings });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Track phase transitions
  useEffect(() => {
    if (phase === "crossroads") trackEvent?.("bible_crossroads_shown", { restaurant: restaurantName, calories_saved: savings });
    if (phase === "bridge") trackEvent?.("bible_bridge_shown", { restaurant: restaurantName, calories_saved: savings });
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived math (safe defaults for early phases)
  const cw = currentWeight ?? 200;
  const gw = goalWeight ?? 180;
  const weightToLose = cw - gw;
  const calSavedPerWeek = savings * ordersPerWeek;
  const lbsPerWeekNum = calSavedPerWeek / 3500;
  const lbsPerWeek = lbsPerWeekNum.toFixed(1);
  const lbsPerMonth = (lbsPerWeekNum * 4.3).toFixed(1);
  const weeksToGoal = lbsPerWeekNum > 0 ? Math.ceil(weightToLose / lbsPerWeekNum) : 52;
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + weeksToGoal * 7);
  const targetDateStr = targetDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const targetShort = targetDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });

  // SVG projection curve
  const svgW = 320, svgH = 160, padX = 40, padY = 20;
  const plotW = svgW - padX * 2, plotH = svgH - padY * 2;
  const curvePoints = 12;
  const pathData = Array.from({ length: curvePoints + 1 }, (_, i) => {
    const t = i / curvePoints;
    const progress = 1 - Math.pow(1 - t, 1.8);
    const x = padX + t * plotW;
    const y = padY + progress * plotH;
    return `${i === 0 ? "M" : "L"}${x},${y}`;
  }).join(" ");

  // Multiplier math for crossroads
  const avgRestaurants = 4;
  const multipliedCalPerWeek = calSavedPerWeek * avgRestaurants;
  const multipliedLbsPerWeek = (lbsPerWeekNum * avgRestaurants).toFixed(1);

  // Weight form validation
  const canContinueWeight = currentWeight !== null && goalWeight !== null && currentWeight > goalWeight && (currentWeight - goalWeight) <= 150 && currentWeight >= 1 && goalWeight >= 1;

  const handleWeightInput = (value: string, setter: (w: number | null) => void) => {
    const stripped = value.replace(/[^0-9]/g, "");
    setter(stripped === "" ? null : parseInt(stripped, 10));
  };

  // Generating screen progress + send email at 100%
  useEffect(() => {
    if (phase !== "generating") return;
    const startedAt = Date.now();
    let emailFired = false;
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const pct = Math.min(100, Math.round((elapsed / REPORT_DURATION_MS) * 100));
      setGenProgress(pct);
      if (pct >= 100) {
        window.clearInterval(timer);
        setGenComplete(true);
        // Send email when progress bar completes
        if (!emailFired && email.includes("@")) {
          emailFired = true;
          fetch("/api/send-swap-plan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email, currentWeight: cw, goalWeight: gw,
              calSavedPerOrder: savings, lbsPerWeek: lbsPerWeekNum, weeksToGoal,
              targetDate: targetDateStr, ordersPerWeek, swapName, restaurantName,
              source: "Fast Food Bible",
            }),
          }).catch(() => { /* best-effort */ });
        }
      }
    }, 120);
    return () => window.clearInterval(timer);
  }, [phase, email, cw, gw, savings, lbsPerWeekNum, weeksToGoal, targetDateStr, ordersPerWeek, swapName, restaurantName]);

  if (savings <= 0) return null;

  const handleEmailSubmit = () => {
    if (!email.includes("@")) return;
    if (capturedEmailRef) capturedEmailRef.current = email;
    try { sessionStorage.setItem("bb_email", email); } catch {}
    trackEvent?.("bible_email_captured", { email, restaurant: restaurantName, calories_saved: savings });
    setGenProgress(0);
    setGenComplete(false);
    setPhase("generating");
  };

  const nav = (url: string) => { (onNavigateAway || ((u: string) => { window.location.href = u; }))(url); };

  // Full-screen phases (weight, projection, generating, crossroads)
  if (phase !== "savings") {
    return (
      <motion.div
        key="fullscreen-phase"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 overflow-y-auto bg-black"
      >
        <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5 py-10">
          <AnimatePresence mode="wait">
            {/* ─── Phase 2: Weight form ─── */}
            {phase === "weight" && (
              <motion.div key="weight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <button onClick={() => setPhase("savings")}
                  className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>

                <h2 className="text-2xl font-bold text-white mb-2">Let&apos;s make this personal</h2>
                <p className="text-sm text-zinc-500 mb-8">Two numbers. That&apos;s it.</p>
    {/* weight form inputs rendered below */}

            <div className="mb-6">
              <label className="text-xs text-zinc-500 uppercase tracking-wider mb-2 block">How much do you weigh?</label>
              <div className="relative">
                <input type="text" inputMode="numeric" value={currentWeight ?? ""} placeholder="200"
                  onChange={(e) => handleWeightInput(e.target.value, setCurrentWeight)}
                  onKeyDown={(e) => { if (e.key === "Enter" && canContinueWeight) setPhase("projection"); }}
                  className="w-full rounded-2xl border-2 border-zinc-800 bg-zinc-900/60 px-5 py-4 text-2xl font-bold text-white placeholder:text-zinc-700 focus:border-emerald-500/50 focus:outline-none transition-colors tabular-nums" />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm text-zinc-600">lbs</span>
              </div>
            </div>

            <div className="mb-8">
              <label className="text-xs text-zinc-500 uppercase tracking-wider mb-2 block">What&apos;s your goal?</label>
              <div className="relative">
                <input type="text" inputMode="numeric" value={goalWeight ?? ""} placeholder="180"
                  onChange={(e) => handleWeightInput(e.target.value, setGoalWeight)}
                  onKeyDown={(e) => { if (e.key === "Enter" && canContinueWeight) setPhase("projection"); }}
                  className="w-full rounded-2xl border-2 border-zinc-800 bg-zinc-900/60 px-5 py-4 text-2xl font-bold text-white placeholder:text-zinc-700 focus:border-emerald-500/50 focus:outline-none transition-colors tabular-nums" />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm text-zinc-600">lbs</span>
              </div>
            </div>

            {currentWeight && goalWeight && currentWeight > goalWeight && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 mb-6 text-center">
                <p className="text-sm text-zinc-500">
                  That&apos;s <span className="text-white font-semibold">{currentWeight - goalWeight} lbs</span> to lose
                </p>
              </motion.div>
            )}

            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setPhase("projection")} disabled={!canContinueWeight}
              className={`w-full rounded-2xl px-8 py-4 text-base font-semibold transition-all ${canContinueWeight ? "bg-emerald-500 text-black hover:bg-emerald-400" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}>
              Show me my timeline
            </motion.button>
          </motion.div>
        )}

        {/* ─── Phase 3: Projection graph with email capture ─── */}
        {phase === "projection" && (
          <motion.div key="projection" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <button onClick={() => setPhase("weight")}
              className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            {/* Headline */}
            <div className="text-center mb-6">
              <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }}
                className="text-2xl font-bold text-white">
                You&apos;ll hit your goal weight of{" "}
                <span className="text-emerald-400">{gw} lbs</span> by{" "}
                <span className="text-emerald-400">{targetDateStr}</span>
              </motion.h2>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
                className="text-sm text-zinc-500 mt-2">
                Just from changing your current order at {restaurantName}, {ordersPerWeek}x/week
              </motion.p>
            </div>

            {/* SVG Graph */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 mb-6">
              <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full">
                {[0, 0.25, 0.5, 0.75, 1].map((t) => (
                  <line key={t} x1={padX} x2={svgW - padX} y1={padY + t * plotH} y2={padY + t * plotH} stroke="#27272a" strokeWidth={0.5} />
                ))}
                <text x={padX - 5} y={padY + 4} textAnchor="end" fill="#ef4444" fontSize={10} fontWeight="bold">{cw}</text>
                <text x={padX - 5} y={padY + plotH + 4} textAnchor="end" fill="#34d399" fontSize={10} fontWeight="bold">{gw}</text>
                <motion.path d={pathData} fill="none" stroke="#34d399" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1], delay: 0.5 }} />
                <motion.circle cx={padX} cy={padY} r={4} fill="#ef4444" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} />
                <motion.circle cx={svgW - padX} cy={svgH - padY} r={5} fill="#34d399" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 2, type: "spring", stiffness: 300 }} />
                <motion.text x={padX} y={padY - 12} textAnchor="middle" fill="#ef4444" fontSize={9} fontWeight="bold"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>NOW</motion.text>
                <motion.text x={svgW - padX} y={svgH - padY - 12} textAnchor="middle" fill="#34d399" fontSize={9} fontWeight="bold"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }}>GOAL</motion.text>
                <motion.text x={padX} y={svgH - 4} textAnchor="middle" fill="#71717a" fontSize={9}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>Today</motion.text>
                <motion.text x={svgW - padX} y={svgH - 4} textAnchor="middle" fill="#71717a" fontSize={9}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }}>{targetShort}</motion.text>
              </svg>
            </motion.div>

            {/* Frequency toggle */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }}
              className="flex items-center justify-center gap-3 mb-4">
              <span className="text-xs text-zinc-500">Orders per week:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <button key={n} onClick={() => { trackEvent?.("bible_frequency_change", { restaurant: restaurantName, old_freq: ordersPerWeek, new_freq: n }); setOrdersPerWeek(n); }}
                    className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${ordersPerWeek === n ? "bg-emerald-500 text-black" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
                    {n}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Stats row */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.2 }}
              className="flex justify-center gap-6 mb-8 text-center">
              <div>
                <p className="text-lg font-bold text-white">{weeksToGoal}</p>
                <p className="text-xs text-zinc-500">weeks</p>
              </div>
              <div className="w-px bg-zinc-800" />
              <div>
                <p className="text-lg font-bold text-white">{lbsPerWeek}</p>
                <p className="text-xs text-zinc-500">lbs/week</p>
              </div>
              <div className="w-px bg-zinc-800" />
              <div>
                <p className="text-lg font-bold text-emerald-400">{weightToLose}</p>
                <p className="text-xs text-zinc-500">lbs total</p>
              </div>
            </motion.div>

            {/* Email capture */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.5 }}>
              <p className="text-center text-sm text-zinc-400 mb-4">
                Want us to email you this plan with your {swapName || "swap"}?
              </p>
              <form onSubmit={(e) => { e.preventDefault(); handleEmailSubmit(); }} className="flex gap-2">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="flex-1 rounded-xl border-2 border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none transition-colors" />
                <motion.button type="submit" whileTap={{ scale: 0.95 }} disabled={submitting}
                  className="rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-black hover:bg-emerald-400 transition-colors flex-shrink-0 disabled:opacity-50">
                  {submitting ? "..." : "Send it"}
                </motion.button>
              </form>
              <p className="text-center text-[11px] text-zinc-700 mt-3">Just the plan. No spam. Unsubscribe anytime.</p>
            </motion.div>
          </motion.div>
        )}

        {/* ─── Phase 4: Generating report ─── */}
        {phase === "generating" && (
          <motion.div key="generating" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>

            {/* Report card with progress + checklist */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-6 mb-5"
            >
              {!genComplete ? (
                <>
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-400/80 mb-2">Building your plan</p>
                  <h2 className="text-xl font-bold text-white mb-1">Crunching the numbers on your {restaurantName} swap</h2>
                  <p className="text-sm text-zinc-500 mb-5">
                    {email ? `We'll send this to ${email}` : "Hang tight"}
                  </p>

                  {/* Progress bar */}
                  <div className="mb-5">
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                      <motion.div
                        className="h-full rounded-full bg-emerald-500"
                        animate={{ width: `${genProgress}%` }}
                        transition={{ type: "spring", stiffness: 80, damping: 20 }}
                      />
                    </div>
                  </div>

                  {/* Checklist steps */}
                  <div className="space-y-3">
                    {REPORT_STEPS.map((step) => {
                      const done = genProgress >= step.threshold;
                      return (
                        <motion.div
                          key={step.label}
                          initial={{ opacity: 0.4 }}
                          animate={{ opacity: done ? 1 : 0.4 }}
                          className="flex items-center gap-3"
                        >
                          {done ? (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 400, damping: 20 }}
                              className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0"
                            >
                              <svg className="h-3 w-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </motion.div>
                          ) : (
                            <div className="h-5 w-5 rounded-full border border-zinc-700 flex-shrink-0" />
                          )}
                          <span className={`text-sm ${done ? "text-zinc-200" : "text-zinc-600"} transition-colors`}>
                            {step.label}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              ) : (
                /* Plan ready state */
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="text-center py-2"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="h-12 w-12 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4"
                  >
                    <svg className="h-6 w-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                  <h2 className="text-2xl font-bold text-emerald-400 mb-2">Your plan is ready</h2>
                  <p className="text-sm text-zinc-500 mb-5">
                    {email ? `Also sent to ${email}` : "See your personalized results"}
                  </p>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setPhase("crossroads")}
                    className="w-full rounded-2xl bg-emerald-500 px-8 py-4 text-base font-bold text-black transition-all hover:bg-emerald-400"
                  >
                    See My Swap Plan
                  </motion.button>
                </motion.div>
              )}
            </motion.div>

            {/* Content blocks — all visible from start, content fades in at staggered thresholds */}
            {GENERATING_BLOCKS.map((block) => {
              const active = genProgress >= block.threshold;
              return (
                <motion.div
                  key={block.label}
                  initial={{ opacity: 0.15 }}
                  animate={{ opacity: active ? 1 : 0.15 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 mb-4"
                >
                  <p className={`text-[11px] uppercase tracking-[0.2em] mb-3 transition-colors duration-500 ${active ? "text-zinc-400" : "text-zinc-700"}`}>{block.label}</p>
                  {"bullets" in block && block.bullets ? (
                    <div className="space-y-2">
                      {block.bullets.map((line) => (
                        <p key={line} className={`text-base leading-relaxed transition-colors duration-500 ${active ? "text-zinc-200" : "text-zinc-800"}`}>{line}</p>
                      ))}
                    </div>
                  ) : (
                    <p className={`text-lg leading-snug transition-colors duration-500 ${active ? "text-zinc-200" : "text-zinc-800"}`}>{"copy" in block ? block.copy : ""}</p>
                  )}
                </motion.div>
              );
            })}

          </motion.div>
        )}

        {/* ─── Phase 5: Crossroads ─── */}
        {phase === "crossroads" && (
          <motion.div key="crossroads" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <button onClick={() => setPhase("projection")}
              className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-4">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to results
            </button>

            {/* Completion */}
            <div className="text-center mb-6">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="h-14 w-14 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4">
                <svg className="h-7 w-7 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              <h2 className="text-xl font-bold text-white">Your swap plan is on its way</h2>
              <p className="text-sm text-zinc-500 mt-1">Check your inbox</p>
            </div>

            {/* Session recap */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-zinc-500 uppercase tracking-wider">Your session</span>
                <span className="text-xs text-emerald-400 font-bold">1 swap</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-zinc-300">{restaurantName} — {swapName || "Lean Swap"}</span>
                <span className="text-sm font-bold text-emerald-400 tabular-nums">-{savings} cal</span>
              </div>
              <div className="border-t border-zinc-800 mt-2 pt-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-white">Total saved per order</span>
                <span className="text-lg font-bold text-emerald-400 tabular-nums">{savings} cal</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-zinc-500">That&apos;s {lbsPerWeek} lbs/week</span>
                <span className="text-xs text-zinc-500">Goal by {targetDateStr}</span>
              </div>
            </motion.div>

            {/* Multiplier */}
            <motion.div initial={{ opacity: 0, y: 15, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.8, type: "spring", stiffness: 200, damping: 25 }}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 mb-6 text-center">
              <p className="text-sm text-zinc-400 mb-2">
                That was <span className="text-white font-semibold">1 restaurant</span>.
              </p>
              <p className="text-sm text-zinc-400 mb-4">
                Most people order from <span className="text-white font-semibold">4 different spots</span> every week.
              </p>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">If you optimized all of them...</p>
              <div className="flex justify-center gap-6">
                <div>
                  <p className="text-2xl font-bold text-emerald-400 tabular-nums">{multipliedCalPerWeek.toLocaleString()}</p>
                  <p className="text-xs text-zinc-500">cal/week</p>
                </div>
                <div className="w-px bg-zinc-800" />
                <div>
                  <p className="text-2xl font-bold text-emerald-400">{multipliedLbsPerWeek}</p>
                  <p className="text-xs text-zinc-500">lbs/week</p>
                </div>
              </div>
            </motion.div>

            {/* 3 CTAs */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }}
              className="space-y-3">
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => { trackEvent?.("bible_crossroads_concierge", { restaurant: restaurantName, calories_saved: savings }); setPhase("bridge"); }}
                className="w-full rounded-2xl bg-emerald-500 px-6 py-4 text-base font-bold text-black transition-all hover:bg-emerald-400 flex items-center justify-center gap-2">
                <span>Want this done for everything you eat?</span>
                <motion.span animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>&rarr;</motion.span>
              </motion.button>

              {onSwapComplete && (
                <motion.button whileTap={{ scale: 0.97 }}
                  onClick={() => { trackEvent?.("bible_crossroads_keep_swapping", { restaurant: restaurantName, calories_saved: savings }); onSwapComplete(restaurantName, swapName || "Swap", savings); }}
                  className="w-full rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 px-6 py-4 text-sm font-medium text-emerald-400 transition-all hover:border-emerald-500/50 hover:bg-emerald-500/10">
                  Find your next swap
                </motion.button>
              )}

              <motion.button whileTap={{ scale: 0.97 }} onClick={() => { trackEvent?.("bible_crossroads_vsl", { restaurant: restaurantName, calories_saved: savings }); nav("/vsl?from=bible"); }}
                className="w-full rounded-2xl border border-zinc-800 px-6 py-3.5 text-sm text-zinc-400 transition-all hover:border-zinc-600 hover:text-zinc-300 flex items-center justify-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                See why this works
              </motion.button>

              <button onClick={() => { trackEvent?.("bible_crossroads_keep_swapping", { restaurant: restaurantName, calories_saved: savings }); if (onSwapComplete) onSwapComplete(restaurantName, swapName || "Swap", savings); }}
                className="w-full text-center text-sm text-zinc-600 hover:text-zinc-400 transition-colors py-2">
                Done for now
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* ── Bridge Screen ── */}
        {phase === "bridge" && (
          <motion.div key="bridge" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-[70vh] text-center px-2">

            {/* Layer 1: Personalized anchor — what just happened */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <p className="text-xs text-zinc-500 uppercase tracking-[0.25em] mb-3">Just now</p>
              <p className="text-4xl sm:text-5xl font-extrabold text-emerald-400 tabular-nums">{savings} calories</p>
              <p className="text-lg text-zinc-400 mt-2">
                saved at <span className="text-white font-semibold">{restaurantName}</span>
              </p>
            </motion.div>

            {/* Divider */}
            <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.8, duration: 0.6 }}
              className="w-12 h-px bg-zinc-700 my-8" />

            {/* Layer 2: Small reframe — one meal */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}
              className="max-w-sm">
              <p className="text-xl sm:text-2xl font-bold text-white leading-snug">
                That was one meal.
              </p>
              <p className="text-xl sm:text-2xl text-zinc-400 mt-2 leading-snug">
                At one restaurant.
              </p>
            </motion.div>

            {/* Layer 3: Expand to all restaurants — still grounded */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }}
              className="mt-8 max-w-sm">
              <p className="text-base text-zinc-400">
                Now imagine we did that for <span className="text-white font-semibold">every place you order from.</span>
              </p>
            </motion.div>

            {/* Layer 4: Vision cascade — "what if" questions that escalate */}
            <div className="mt-10 max-w-sm space-y-5">
              {[
                { delay: 3.2, text: "What if every snack in your drawer was already optimized?" },
                { delay: 4.0, text: "What if your groceries showed up every Sunday, already swapped?" },
                { delay: 4.8, text: "What if you landed in a new city and your restaurants were already mapped?" },
                { delay: 5.6, text: "What if all you had to do was eat, and the pounds just melted off?" },
              ].map((item, i) => (
                <motion.p key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: item.delay, duration: 0.5 }}
                  className={`text-sm sm:text-base leading-relaxed ${i === 3 ? "text-emerald-400 font-semibold text-base sm:text-lg mt-8" : "text-zinc-300"}`}>
                  {item.text}
                </motion.p>
              ))}
            </div>

            {/* CTA */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 6.6 }}
              className="mt-12 w-full max-w-sm space-y-3">
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => { trackEvent?.("bible_bridge_concierge", { restaurant: restaurantName, calories_saved: savings }); nav("/concierge?from=bible"); }}
                className="w-full rounded-2xl bg-emerald-500 px-6 py-4 text-base font-bold text-black transition-all hover:bg-emerald-400 flex items-center justify-center gap-2">
                <span>See how it works</span>
                <motion.span animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>&rarr;</motion.span>
              </motion.button>
              <button onClick={() => { trackEvent?.("bible_bridge_back", { restaurant: restaurantName }); setPhase("crossroads"); }}
                className="w-full text-center text-sm text-zinc-600 hover:text-zinc-400 transition-colors py-2">
                Back to swaps
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </motion.div>
  );
  }

  // ─── Phase 1: Savings (inline card) ───
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
      className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-center">
      <p className="text-xs text-zinc-500 uppercase tracking-[0.2em] mb-4">Just from this one swap</p>
      <div className="flex justify-center gap-8 mb-6">
        <div>
          <p className="text-3xl font-bold text-emerald-400 tabular-nums">{savings}</p>
          <p className="text-xs text-zinc-500 mt-1">cal saved per order</p>
        </div>
        <div className="w-px bg-zinc-800" />
        <div>
          <p className="text-3xl font-bold text-white tabular-nums">{((savings * 7) / 3500).toFixed(1)}</p>
          <p className="text-xs text-zinc-500 mt-1">lbs/week</p>
        </div>
      </div>
      <p className="text-xs text-zinc-600 mb-6">No gym. No meal prep. Just ordering smarter.</p>

      <p className="text-sm text-zinc-500 mb-4">Want to see exactly when you&apos;ll hit your goal weight?</p>
      <motion.button whileTap={{ scale: 0.97 }} onClick={() => setPhase("weight")}
        className="w-full rounded-2xl bg-white px-8 py-4 text-base font-semibold text-black transition-all hover:bg-zinc-100">
        Personalize this for me
      </motion.button>
      <p className="mt-3 text-xs text-zinc-600">2 quick questions. See your personal timeline.</p>
    </motion.div>
  );
}

function getItemEmoji(name: string): string {
  const t = name.toLowerCase();
  if (t.includes("wing")) return "🍗";
  if (t.includes("burger") || t.includes("big mac") || t.includes("whopper") || t.includes("double") || t.includes("qpc") || t.includes("mcdouble")) return "🍔";
  if (t.includes("pizza")) return "🍕";
  if (t.includes("taco")) return "🌮";
  if (t.includes("burrito")) return "🌯";
  if (t.includes("salad") || t.includes("greens") || t.includes("lettuce")) return "🥗";
  if (t.includes("sandwich") || t.includes("sub") || t.includes("mcchicken") || t.includes("mccrispy") || t.includes("filet")) return "🥪";
  if (t.includes("fries")) return "🍟";
  if (t.includes("nugget") || t.includes("tender") || t.includes("chicken")) return "🍗";
  if (t.includes("smoothie") || t.includes("shake")) return "🥤";
  if (t.includes("coffee") || t.includes("latte")) return "☕";
  if (t.includes("breakfast") || t.includes("egg") || t.includes("mcmuffin") || t.includes("hotcake") || t.includes("hash brown")) return "🍳";
  if (t.includes("pasta") || t.includes("noodle")) return "🍝";
  if (t.includes("steak")) return "🥩";
  if (t.includes("shrimp") || t.includes("fish") || t.includes("salmon") || t.includes("lobster")) return "🐟";
  if (t.includes("soup") || t.includes("chili")) return "🍲";
  if (t.includes("coke") || t.includes("sprite") || t.includes("soda") || t.includes("diet") || t.includes("juice") || t.includes("water")) return "🥤";
  if (t.includes("apple")) return "🍎";
  if (t.includes("bowl")) return "🥗";
  return "🍽️";
}

// ─── Back Button ─────────────────────────────────────
function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mb-4 flex items-center gap-1.5 text-lg text-zinc-300 transition-colors hover:text-white"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
      </svg>
      All Restaurants
    </button>
  );
}

// ─── Swap Pair Card ──────────────────────────────────
function SwapPairCard({
  original,
  swaps,
}: {
  original: Meal;
  swaps: Meal[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
      {/* Original meal */}
      <div className="border-b border-zinc-800/60 p-5">
        <div className="flex items-start gap-3">
          {original.sprite_url ? (
            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl">
              <Image
                src={original.sprite_url}
                alt={original.name}
                fill
                className="object-cover"
                sizes="64px"
              />
            </div>
          ) : (
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-800">
              <span className="text-3xl leading-none">{getMealEmoji(original)}</span>
            </div>
          )}
          <div className="flex-1">
            <p className="text-xl font-semibold leading-tight text-white">{original.name}</p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-base text-zinc-300">
              <span className="font-medium text-zinc-300">
                {Math.round(original.totals.calories)} cal
              </span>
              <span>{Math.round(original.totals.protein)}g P</span>
              <span>{Math.round(original.totals.fat)}g F</span>
              <span>{Math.round(original.totals.carbs)}g C</span>
            </div>
          </div>
          <span className="flex-shrink-0 rounded-full bg-zinc-800 px-3 py-1 text-sm font-medium uppercase tracking-wider text-zinc-300">
            Original
          </span>
        </div>
      </div>

      {/* Swaps */}
      {swaps.map((swap) => {
        const calSaved = Math.round(original.totals.calories - swap.totals.calories);
        const proteinDiff = Math.round(swap.totals.protein - original.totals.protein);

        return (
          <div key={swap.id} className="border-t border-zinc-800/40 bg-emerald-500/[0.03] p-5">
            {/* Arrow indicator */}
            <div className="mb-3 flex items-center gap-2">
              <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
              </svg>
              <span className="text-base font-semibold uppercase tracking-wider text-emerald-400">
                Swap
              </span>
              {calSaved > 0 && (
                <span className="ml-auto rounded-full bg-emerald-500/15 px-3 py-1 text-base font-bold text-emerald-400">
                  -{calSaved} cal
                </span>
              )}
              {proteinDiff > 0 && (
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-base font-bold text-emerald-400">
                  +{proteinDiff}g protein
                </span>
              )}
            </div>

            <div className="flex items-start gap-3">
              {swap.sprite_url ? (
                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl">
                  <Image
                    src={swap.sprite_url}
                    alt={swap.name}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
              ) : (
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                  <span className="text-3xl leading-none">{getMealEmoji(swap)}</span>
                </div>
              )}
              <div className="flex-1">
                <p className="text-xl font-semibold leading-tight text-white">{swap.name}</p>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-base text-zinc-300">
                  <span className="font-medium text-emerald-400">
                    {Math.round(swap.totals.calories)} cal
                  </span>
                  <span>{Math.round(swap.totals.protein)}g P</span>
                  <span>{Math.round(swap.totals.fat)}g F</span>
                  <span>{Math.round(swap.totals.carbs)}g C</span>
                </div>
                {swap.swap_rationale && (
                  <p className="mt-3 text-base leading-relaxed text-zinc-300">
                    {swap.swap_rationale}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {swaps.length === 0 && (
        <div className="border-t border-zinc-800/40 px-5 py-4">
          <p className="text-base italic text-zinc-500">No swap available yet</p>
        </div>
      )}
    </div>
  );
}
