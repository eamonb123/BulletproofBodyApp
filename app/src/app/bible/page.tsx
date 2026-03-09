"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
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

interface RestaurantDetail {
  restaurant: Record<string, unknown>;
  meals: Meal[];
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

// Per-logo style overrides: [maxSize%, yOffsetPx]
// Positive yOffset = shift up. Default: 90% size, 8px up.
const LOGO_OVERRIDES: Record<string, { size?: number; yOffset?: number }> = {
  tacobell: { yOffset: 20 },
  smoothieking: { yOffset: 16 },
  sonic: { yOffset: 14 },
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
}: {
  id: string;
  name: string;
  className: string;
  imageClassName?: string;
  placeholderClassName?: string;
  yOffset?: number;
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

  const imgStyle = yOffset ? { transform: `translateY(-${yOffset}px)` } : undefined;

  return (
    <div className={`${className} flex items-center justify-center bg-white`}>
      <img
        src={candidates[candidateIndex]}
        alt={`${name} logo`}
        loading="lazy"
        decoding="async"
        className={imageClassName}
        style={imgStyle}
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

// ─── Main Page ───────────────────────────────────────
export default function BiblePage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [restaurantData, setRestaurantData] = useState<Record<string, RestaurantDetail>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const loadingDetail = !!selectedId && !restaurantData[selectedId];

  // ─── Fetch restaurant list ─────────────────────────
  useEffect(() => {
    fetch("/api/restaurants")
      .then((res) => res.json())
      .then((data) => {
        setRestaurants(data.restaurants);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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
      {/* Header */}
      <header className="border-b border-zinc-800 bg-black/90 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-5 py-6 text-center">
          <h1 className="text-lg font-semibold uppercase tracking-[0.22em] text-emerald-400">
            Fast Food Bible
          </h1>
          <p className="mt-1 text-base text-zinc-400">
            Every swap. Every restaurant. Search anything.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-20 pt-4">
        {/* Search bar */}
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

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-400" />
          </div>
        ) : (
          <LayoutGroup>
            <AnimatePresence mode="wait">
              {/* ─── Search Results (meal-level matches) ── */}
              {query && searchMealResults.length > 0 && (
                <motion.div
                  key="search-meals"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <p className="text-base font-medium uppercase tracking-wider text-zinc-400">
                    Menu items matching &ldquo;{searchQuery}&rdquo;
                  </p>
                  {searchMealResults.map(({ restaurant, meals }) => (
                    <div key={restaurant.id}>
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setSelectedId(restaurant.id);
                        }}
                        className="mb-3 flex items-center gap-2 text-lg text-zinc-400 transition-colors hover:text-emerald-400"
                      >
                        <RestaurantLogo
                          id={restaurant.id}
                          name={restaurant.name}
                          className="h-6 w-6 overflow-hidden rounded-md border border-zinc-700"
                          imageClassName="h-full w-full object-contain p-0.5"
                          placeholderClassName="text-sm font-semibold tracking-wide text-zinc-400"
                        />
                        <span className="font-medium">{restaurant.name}</span>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                      </button>
                      <div className="space-y-2">
                        {meals.map((meal) => (
                          <MealSearchResult key={meal.id} meal={meal} />
                        ))}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* ─── Restaurant Grid ──────────────── */}
              {!selectedId && (!query || filteredRestaurants.length > 0) && (
                <motion.div
                  key="grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {query && filteredRestaurants.length > 0 && (
                    <p className="mb-3 text-base font-medium uppercase tracking-wider text-zinc-400">
                      Restaurants
                    </p>
                  )}
                  <div className="grid grid-cols-3 gap-3">
                    {filteredRestaurants.map((r) => (
                      <motion.button
                        key={r.id}
                        layoutId={`restaurant-${r.id}`}
                        onClick={() => setSelectedId(r.id)}
                        className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 transition-colors hover:border-zinc-700"
                      >
                        <div className="relative aspect-square w-full overflow-hidden">
                          <RestaurantLogo
                            id={r.id}
                            name={r.name}
                            className="h-full w-full transition-transform group-hover:scale-105"
                            imageClassName="h-auto w-auto max-h-[88%] max-w-[88%]"
                            placeholderClassName="text-4xl font-semibold tracking-wide text-zinc-400"
                            yOffset={LOGO_OVERRIDES[r.id]?.yOffset ?? 8}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-2.5">
                          <p className="text-base font-semibold text-white">{r.name}</p>
                          <p className="text-sm text-zinc-400">
                            {r.meal_count} meals &middot; {r.swap_count} swaps
                          </p>
                        </div>
                      </motion.button>
                    ))}
                  </div>

                  {filteredRestaurants.length === 0 && query && (
                    <div className="py-16 text-center">
                      <p className="text-zinc-500">No restaurants match &ldquo;{searchQuery}&rdquo;</p>
                    </div>
                  )}
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
                    onBack={() => setSelectedId(null)}
                  />
                </motion.div>
              )}

              {/* ─── No results state ─────────────── */}
              {query &&
                filteredRestaurants.length === 0 &&
                searchMealResults.length === 0 &&
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

// ─── Restaurant Detail View ──────────────────────────
function RestaurantDetailView({
  restaurant,
  detail,
  loading,
  onBack,
}: {
  restaurant: Restaurant;
  detail: RestaurantDetail | undefined;
  loading: boolean;
  onBack: () => void;
}) {
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

  const originals = detail.meals.filter((m) => m.is_swap === 0);
  const swapMap = new Map<string, Meal[]>();
  for (const m of detail.meals) {
    if (m.is_swap === 1 && m.swap_for) {
      const existing = swapMap.get(m.swap_for) || [];
      existing.push(m);
      swapMap.set(m.swap_for, existing);
    }
  }

  const pairs = originals.map((orig) => ({
    original: orig,
    swaps: swapMap.get(orig.id) || [],
  }));

  return (
    <div>
      <BackButton onClick={onBack} />

      {/* Restaurant Logo Header */}
      <div className="relative mb-6 h-44 w-full overflow-hidden rounded-2xl border border-zinc-800">
        <RestaurantLogo
          id={restaurant.id}
          name={restaurant.name}
          className="h-full w-full"
          imageClassName="h-full w-full object-contain p-8"
          placeholderClassName="text-6xl font-semibold tracking-wide text-zinc-400"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent" />
        <div className="absolute bottom-4 left-4">
          <h2 className="text-3xl font-bold text-white">{restaurant.name}</h2>
          <p className="text-lg text-zinc-200">
            {pairs.length} meals &middot; {detail.meals.filter((m) => m.is_swap === 1).length} swaps
          </p>
        </div>
      </div>

      {/* Meal pairs */}
      <div className="space-y-6">
        {pairs.map(({ original, swaps }) => (
          <SwapPairCard key={original.id} original={original} swaps={swaps} />
        ))}
      </div>
    </div>
  );
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
