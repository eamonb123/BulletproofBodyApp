"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type FlowStep = "landing" | "frequency" | "restaurant" | "orders" | "reveal";

interface Restaurant {
  id: string;
  name: string;
  hero_url: string | null;
  meal_count: number;
  swap_count: number;
}

interface MealIngredient {
  id: string;
  name: string;
}

interface Meal {
  id: string;
  name: string;
  description: string | null;
  meal_type: string | null;
  is_swap: number;
  swap_for: string | null;
  sprite_url: string | null;
  swap_rationale: string | null;
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

interface JumperPair {
  original: Meal;
  swap: Meal;
  calSaved: number;
  proteinDiff: number;
}

interface SavedJumperRow {
  id: string | number;
  restaurantId: string;
  restaurantName: string;
  frequency: number;
  originalMealId: string;
  originalMealName: string;
  swapMealId: string;
  swapMealName: string;
  calSavedPerOrder: number;
  weeklyCalSaved: number;
  savedAt: string;
}

interface JumperSession {
  frequency: number;
  selectedRestaurantId: string | null;
  selectedOrderIdsByRestaurant: Record<string, string[]>;
  updatedAt: string;
}

interface JumperProfile {
  id: string;
  name: string;
}

interface JumperApiSession {
  frequency: number;
  selectedRestaurantId: string | null;
  selectedOrderIdsByRestaurant: Record<string, string[]>;
  updatedAt: string | null;
}

interface JumperProfileApiResponse {
  profile: JumperProfile;
  session: JumperApiSession;
  planRows?: SavedJumperRow[];
}

const PLAN_STORAGE_KEY = "bulletproof_body_jumper_plan";
const SESSION_STORAGE_KEY = "bulletproof_body_jumper_session";
const PROFILE_ID_STORAGE_KEY = "bulletproof_body_jumper_profile_id";

function clampFrequency(value: number) {
  if (Number.isNaN(value)) return 4;
  return Math.max(1, Math.min(7, Math.round(value)));
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
  if (text.includes("breakfast") || text.includes("egg")) return "🍳";
  if (text.includes("pasta") || text.includes("noodle")) return "🍝";

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

function mealCalories(meal: Meal) {
  return Math.round(meal.totals.calories);
}

function asPairs(detail: RestaurantDetail | null): JumperPair[] {
  if (!detail) return [];

  const meals = detail.meals ?? [];
  const originals = meals.filter((m) => m.is_swap === 0);
  const swaps = meals.filter((m) => m.is_swap === 1 && m.swap_for);
  const byOriginal = new Map<string, Meal[]>();

  for (const swap of swaps) {
    const key = swap.swap_for as string;
    const list = byOriginal.get(key) ?? [];
    list.push(swap);
    byOriginal.set(key, list);
  }

  const pairs: JumperPair[] = [];
  for (const original of originals) {
    const options = byOriginal.get(original.id) ?? [];
    if (options.length === 0) continue;

    const best = options
      .map((swap) => ({
        original,
        swap,
        calSaved: mealCalories(original) - mealCalories(swap),
        proteinDiff: Math.round(swap.totals.protein - original.totals.protein),
      }))
      .sort((a, b) => b.calSaved - a.calSaved)[0];

    if (best && best.calSaved > 0) {
      pairs.push(best);
    }
  }

  return pairs.sort((a, b) => b.calSaved - a.calSaved);
}

function defaultOrderSelection(pairs: JumperPair[], maxCount = 3): string[] {
  return pairs.slice(0, Math.min(maxCount, pairs.length)).map((p) => p.original.id);
}

function getCurrentSelection(
  restaurantId: string | null,
  pairs: JumperPair[],
  byRestaurant: Record<string, string[]>
): string[] {
  if (!restaurantId) return [];

  const validIds = new Set(pairs.map((p) => p.original.id));
  const manual = byRestaurant[restaurantId];

  if (Array.isArray(manual)) {
    return manual.filter((id) => validIds.has(id));
  }

  return defaultOrderSelection(pairs, 3);
}

function loadSavedRows(): SavedJumperRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PLAN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedJumperRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRows(rows: SavedJumperRow[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(rows));
}

function loadSession(): JumperSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as JumperSession;
    if (!parsed || typeof parsed !== "object") return null;

    return {
      frequency: clampFrequency(parsed.frequency ?? 4),
      selectedRestaurantId:
        typeof parsed.selectedRestaurantId === "string" ? parsed.selectedRestaurantId : null,
      selectedOrderIdsByRestaurant:
        parsed.selectedOrderIdsByRestaurant && typeof parsed.selectedOrderIdsByRestaurant === "object"
          ? parsed.selectedOrderIdsByRestaurant
          : {},
      updatedAt:
        typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function saveSession(session: JumperSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export default function JumperPage() {
  const [step, setStep] = useState<FlowStep>("landing");
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantsLoading, setRestaurantsLoading] = useState(true);
  const [restaurantsError, setRestaurantsError] = useState<string | null>(null);

  const [frequency, setFrequency] = useState(4);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [selectedPairIdx, setSelectedPairIdx] = useState(0);
  const [selectedOrderIdsByRestaurant, setSelectedOrderIdsByRestaurant] = useState<
    Record<string, string[]>
  >({});

  const [detailCache, setDetailCache] = useState<Record<string, RestaurantDetail>>({});
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [sessionHydrated, setSessionHydrated] = useState(false);
  const [activeProfile, setActiveProfile] = useState<JumperProfile | null>(null);
  const [profileNameInput, setProfileNameInput] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [planRows, setPlanRows] = useState<SavedJumperRow[]>([]);
  const [syncingRemote, setSyncingRemote] = useState(false);

  const applyRemoteSession = useCallback((session: JumperApiSession) => {
    setFrequency(clampFrequency(session.frequency));
    setSelectedRestaurantId(session.selectedRestaurantId);
    setSelectedOrderIdsByRestaurant(session.selectedOrderIdsByRestaurant ?? {});
  }, []);

  const loadProfileById = useCallback(async (profileId: string) => {
    const response = await fetch(`/api/jumper-profiles/${profileId}`);
    const data = (await response.json()) as
      | JumperProfileApiResponse
      | { error?: string };

    if (!response.ok || !("profile" in data) || !data.profile) {
      throw new Error(
        "error" in data && data.error ? data.error : "Unable to load profile"
      );
    }

    setActiveProfile(data.profile);
    setProfileNameInput(data.profile.name);
    applyRemoteSession(data.session);
    setPlanRows(Array.isArray(data.planRows) ? data.planRows : []);
    setProfileError(null);
  }, [applyRemoteSession]);

  const handleCreateOrLoadProfile = useCallback(async () => {
    const rawName = profileNameInput.trim();
    if (!rawName) return;

    setProfileLoading(true);
    setProfileError(null);

    try {
      const response = await fetch("/api/jumper-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: rawName }),
      });

      const data = (await response.json()) as
        | JumperProfileApiResponse
        | { error?: string };

      if (!response.ok || !("profile" in data) || !data.profile) {
        throw new Error(
          "error" in data && data.error ? data.error : "Unable to load profile"
        );
      }

      setActiveProfile(data.profile);
      setProfileNameInput(data.profile.name);
      applyRemoteSession(data.session);
      setPlanRows(Array.isArray(data.planRows) ? data.planRows : []);
      setProfileError(null);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(PROFILE_ID_STORAGE_KEY, data.profile.id);
      }
    } catch (error) {
      setProfileError(
        error instanceof Error ? error.message : "Unable to load profile"
      );
    } finally {
      setProfileLoading(false);
    }
  }, [profileNameInput, applyRemoteSession]);

  useEffect(() => {
    fetch("/api/restaurants")
      .then((res) => {
        if (!res.ok) throw new Error("Could not load restaurants");
        return res.json();
      })
      .then((data: { restaurants?: Restaurant[] }) => {
        setRestaurants(Array.isArray(data.restaurants) ? data.restaurants : []);
        setRestaurantsLoading(false);
      })
      .catch((error: unknown) => {
        setRestaurantsError(
          error instanceof Error ? error.message : "Could not load restaurants"
        );
        setRestaurantsLoading(false);
      });
  }, []);

  useEffect(() => {
    const loaded = loadSession();
    const storedProfileId =
      typeof window !== "undefined"
        ? window.localStorage.getItem(PROFILE_ID_STORAGE_KEY)
        : null;

    requestAnimationFrame(() => {
      if (loaded) {
        setFrequency(clampFrequency(loaded.frequency));
        setSelectedRestaurantId(loaded.selectedRestaurantId);
        setSelectedOrderIdsByRestaurant(loaded.selectedOrderIdsByRestaurant);
      }
      setSessionHydrated(true);
    });

    if (storedProfileId) {
      void loadProfileById(storedProfileId).catch(() => {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(PROFILE_ID_STORAGE_KEY);
        }
      });
    }
  }, [loadProfileById]);

  useEffect(() => {
    if (!sessionHydrated) return;

    saveSession({
      frequency,
      selectedRestaurantId,
      selectedOrderIdsByRestaurant,
      updatedAt: new Date().toISOString(),
    });
  }, [frequency, selectedRestaurantId, selectedOrderIdsByRestaurant, sessionHydrated]);

  const activeProfileId = activeProfile?.id ?? null;

  useEffect(() => {
    if (!sessionHydrated || !activeProfileId) return;

    const timer = setTimeout(async () => {
      try {
        setSyncingRemote(true);
        const response = await fetch(
          `/api/jumper-profiles/${activeProfileId}/session`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              frequency,
              selectedRestaurantId,
              selectedOrderIdsByRestaurant,
            }),
          }
        );

        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          throw new Error(data.error ?? "Failed to sync session");
        }
        setProfileError(null);
      } catch (error) {
        setProfileError(
          error instanceof Error ? error.message : "Failed to sync session"
        );
      } finally {
        setSyncingRemote(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [
    sessionHydrated,
    activeProfileId,
    frequency,
    selectedRestaurantId,
    selectedOrderIdsByRestaurant,
  ]);

  useEffect(() => {
    if (!selectedRestaurantId || detailCache[selectedRestaurantId]) return;
    fetch(`/api/restaurant/${selectedRestaurantId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Could not load restaurant meals");
        return res.json();
      })
      .then((data: RestaurantDetail) => {
        setDetailCache((prev) => ({ ...prev, [selectedRestaurantId]: data }));
      })
      .catch(() => {});
  }, [selectedRestaurantId, detailCache]);

  useEffect(() => {
    if (!saveMessage) return;
    const timer = setTimeout(() => setSaveMessage(null), 2200);
    return () => clearTimeout(timer);
  }, [saveMessage]);

  const selectedRestaurant = useMemo(
    () => restaurants.find((r) => r.id === selectedRestaurantId) ?? null,
    [restaurants, selectedRestaurantId]
  );

  const selectedDetail = selectedRestaurantId ? detailCache[selectedRestaurantId] ?? null : null;
  const detailLoading = !!selectedRestaurantId && !selectedDetail;
  const pairs = useMemo(() => asPairs(selectedDetail), [selectedDetail]);

  const selectedOriginalIds = useMemo(
    () => getCurrentSelection(selectedRestaurantId, pairs, selectedOrderIdsByRestaurant),
    [selectedRestaurantId, pairs, selectedOrderIdsByRestaurant]
  );

  const selectedPairs = useMemo(() => {
    const selected = new Set(selectedOriginalIds);
    return pairs.filter((pair) => selected.has(pair.original.id));
  }, [pairs, selectedOriginalIds]);

  const revealPairs = selectedPairs.length > 0 ? selectedPairs : pairs;
  const activePairIdx =
    selectedPairIdx >= 0 && selectedPairIdx < revealPairs.length ? selectedPairIdx : 0;
  const selectedPair = revealPairs[activePairIdx] ?? null;

  const weeklySaved = selectedPair ? selectedPair.calSaved * frequency : 0;
  const monthlySaved = weeklySaved * 4;
  const projectedFatLoss = weeklySaved / 3500;

  const hasSessionDraft =
    frequency !== 4 || selectedRestaurantId !== null || Object.keys(selectedOrderIdsByRestaurant).length > 0;

  function pickRestaurant(restaurantId: string) {
    setSelectedRestaurantId(restaurantId);
    setSelectedPairIdx(0);
  }

  function continueToOrders() {
    if (!selectedRestaurantId) return;
    setStep("orders");
  }

  function toggleOrderSelection(originalId: string) {
    if (!selectedRestaurantId) return;

    setSelectedOrderIdsByRestaurant((prev) => {
      const current = getCurrentSelection(selectedRestaurantId, pairs, prev);
      const exists = current.includes(originalId);
      const next = exists ? current.filter((id) => id !== originalId) : [...current, originalId];
      return { ...prev, [selectedRestaurantId]: next };
    });
  }

  function autoSelectTopOrders() {
    if (!selectedRestaurantId) return;
    setSelectedOrderIdsByRestaurant((prev) => ({
      ...prev,
      [selectedRestaurantId]: defaultOrderSelection(pairs, 3),
    }));
  }

  function clearOrderSelection() {
    if (!selectedRestaurantId) return;
    setSelectedOrderIdsByRestaurant((prev) => ({
      ...prev,
      [selectedRestaurantId]: [],
    }));
  }

  function continueToReveal() {
    if (selectedOriginalIds.length === 0) return;
    setSelectedPairIdx(0);
    setStep("reveal");
  }

  async function addToPlan() {
    if (!selectedPair || !selectedRestaurant) return;

    const row: SavedJumperRow = {
      id: `${selectedRestaurant.id}-${selectedPair.original.id}-${selectedPair.swap.id}`,
      restaurantId: selectedRestaurant.id,
      restaurantName: selectedRestaurant.name,
      frequency,
      originalMealId: selectedPair.original.id,
      originalMealName: selectedPair.original.name,
      swapMealId: selectedPair.swap.id,
      swapMealName: selectedPair.swap.name,
      calSavedPerOrder: selectedPair.calSaved,
      weeklyCalSaved: selectedPair.calSaved * frequency,
      savedAt: new Date().toISOString(),
    };

    try {
      if (activeProfile) {
        const response = await fetch(
          `/api/jumper-profiles/${activeProfile.id}/plan-rows`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              restaurantId: row.restaurantId,
              restaurantName: row.restaurantName,
              frequency: row.frequency,
              originalMealId: row.originalMealId,
              originalMealName: row.originalMealName,
              swapMealId: row.swapMealId,
              swapMealName: row.swapMealName,
              calSavedPerOrder: row.calSavedPerOrder,
              weeklyCalSaved: row.weeklyCalSaved,
            }),
          }
        );

        const data = (await response.json()) as {
          error?: string;
          planRows?: SavedJumperRow[];
        };

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to save jumper row");
        }

        setPlanRows(Array.isArray(data.planRows) ? data.planRows : []);
      } else {
        const existing = loadSavedRows();
        const deduped = [row, ...existing.filter((r) => r.id !== row.id)];
        saveRows(deduped);
      }

      setSaveMessage("Added to your plan");
    } catch (error) {
      setProfileError(
        error instanceof Error ? error.message : "Unable to save jumper row"
      );
    }
  }

  function resumeSession() {
    if (selectedRestaurantId) {
      setStep("orders");
      return;
    }
    setStep("frequency");
  }

  function useLocalOnlyMode() {
    setActiveProfile(null);
    setProfileError(null);
    setPlanRows([]);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(PROFILE_ID_STORAGE_KEY);
    }
  }

  return (
    <div className="min-h-screen bg-black px-4 pb-14 text-white">
      <header className="mx-auto w-full max-w-4xl py-5">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400 hover:text-zinc-200"
          >
            Back
          </Link>
          <div className="text-center">
            <p className="text-base font-semibold uppercase tracking-[0.22em] text-emerald-400">
              Calorie Jumper
            </p>
            <p className="text-base text-zinc-300">Start with the biggest win tonight</p>
          </div>
          <div className="w-14" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl">
        <section className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            Cross-Device Session Memory
          </p>
          <p className="mt-1 text-base text-zinc-300">
            Enter client name or email once. Picks auto-save and auto-load.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={profileNameInput}
              onChange={(event) => setProfileNameInput(event.target.value)}
              placeholder="Client name or email"
              className="h-10 w-64 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-base text-white placeholder-zinc-500 outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleCreateOrLoadProfile}
              disabled={profileLoading || !profileNameInput.trim()}
              className="h-10 rounded-lg bg-emerald-500 px-3 text-sm font-semibold uppercase tracking-wider text-black disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
            >
              {profileLoading ? "Loading..." : "Load Or Create"}
            </button>
            {activeProfile && (
              <button
                onClick={useLocalOnlyMode}
                className="h-10 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm font-semibold uppercase tracking-wider text-zinc-300"
              >
                Use Local Only
              </button>
            )}
          </div>

          {activeProfile && (
            <p className="mt-2 text-sm text-emerald-300">
              Synced as {activeProfile.name}
              {syncingRemote ? " • Saving..." : " • Saved"}
              {planRows.length > 0 ? ` • ${planRows.length} plan rows` : ""}
            </p>
          )}

          {profileError && (
            <p className="mt-2 text-sm text-rose-300">{profileError}</p>
          )}
        </section>

        <AnimatePresence mode="wait">
          {step === "landing" && (
            <motion.section
              key="landing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6"
            >
              <p className="text-sm uppercase tracking-wider text-zinc-300">
                You feel stuck. We make it obvious.
              </p>
              <h1 className="mt-2 text-4xl font-bold leading-tight text-white">
                We&apos;ll find your biggest calorie jumper in 60 seconds.
              </h1>
              <p className="mt-3 text-lg text-zinc-300">
                No shame. No perfect diet. Same restaurants, smarter order.
              </p>

              <button
                onClick={() => setStep("frequency")}
                className="mt-6 w-full rounded-xl bg-emerald-500 px-4 py-3 text-lg font-semibold text-black transition hover:bg-emerald-400"
              >
                Show Me My Biggest Jumper
              </button>

              {hasSessionDraft && (
                <button
                  onClick={resumeSession}
                  className="mt-3 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-base font-semibold text-zinc-200"
                >
                  Resume Last Session
                </button>
              )}
            </motion.section>
          )}

          {step === "frequency" && (
            <motion.section
              key="frequency"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6"
            >
              <h2 className="text-3xl font-bold text-white">How many takeout orders per week?</h2>
              <p className="mt-2 text-lg text-zinc-300">This sets your projected weekly impact.</p>

              <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-7">
                {[1, 2, 3, 4, 5, 6, 7].map((count) => (
                  <button
                    key={count}
                    onClick={() => setFrequency(count)}
                    className={`rounded-xl border px-3 py-3 text-lg font-semibold transition ${
                      frequency === count
                        ? "border-emerald-400 bg-emerald-500/25 text-emerald-200"
                        : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500"
                    }`}
                  >
                    {count}x
                  </button>
                ))}
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => setStep("landing")}
                  className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-base font-semibold text-zinc-200"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep("restaurant")}
                  className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 text-base font-semibold text-black"
                >
                  Continue
                </button>
              </div>
            </motion.section>
          )}

          {step === "restaurant" && (
            <motion.section
              key="restaurant"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6"
            >
              <h2 className="text-3xl font-bold text-white">Where do you order most?</h2>
              <p className="mt-2 text-lg text-zinc-300">
                Tap one restaurant, then continue to pick your usual orders.
              </p>

              {restaurantsLoading && <p className="mt-6 text-base text-zinc-300">Loading restaurants...</p>}
              {restaurantsError && <p className="mt-6 text-base text-rose-300">{restaurantsError}</p>}

              {!restaurantsLoading && !restaurantsError && (
                <div className="mt-5 grid max-h-[60vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                  {restaurants.map((restaurant) => {
                    const selected = selectedRestaurantId === restaurant.id;
                    return (
                      <button
                        key={restaurant.id}
                        onClick={() => pickRestaurant(restaurant.id)}
                        className={`rounded-2xl border p-4 text-left transition ${
                          selected
                            ? "border-emerald-500/50 bg-emerald-500/10"
                            : "border-zinc-700 bg-zinc-950/80 hover:border-zinc-500"
                        }`}
                      >
                        <p className="text-xl font-semibold text-white">{restaurant.name}</p>
                        <p className="mt-1 text-base text-zinc-300">
                          {restaurant.meal_count} meals • {restaurant.swap_count} swaps
                        </p>
                        {selected && (
                          <p className="mt-2 text-sm font-semibold uppercase tracking-wider text-emerald-300">
                            Selected
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => setStep("frequency")}
                  className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-base font-semibold text-zinc-200"
                >
                  Back
                </button>
                <button
                  onClick={continueToOrders}
                  disabled={!selectedRestaurantId}
                  className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 text-base font-semibold text-black disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
                >
                  Continue To Orders
                </button>
              </div>
            </motion.section>
          )}

          {step === "orders" && (
            <motion.section
              key="orders"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6"
            >
              <h2 className="text-3xl font-bold text-white">Pick your usual orders</h2>
              <p className="mt-2 text-lg text-zinc-300">
                We pre-select likely jumpers. Uncheck anything that is not you.
              </p>

              {selectedRestaurant && (
                <p className="mt-3 text-base font-semibold text-emerald-300">{selectedRestaurant.name}</p>
              )}

              {detailLoading && <p className="mt-5 text-base text-zinc-300">Loading order options...</p>}

              {!detailLoading && pairs.length === 0 && (
                <p className="mt-5 text-base text-zinc-300">
                  No positive jumpers found for this restaurant yet. Pick another restaurant.
                </p>
              )}

              {!detailLoading && pairs.length > 0 && (
                <>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={autoSelectTopOrders}
                      className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-semibold text-zinc-200"
                    >
                      Auto-Select Top 3
                    </button>
                    <button
                      onClick={clearOrderSelection}
                      className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-semibold text-zinc-200"
                    >
                      Clear All
                    </button>
                    <p className="self-center text-sm text-zinc-300">{selectedOriginalIds.length} selected</p>
                  </div>

                  <div className="mt-4 max-h-[52vh] space-y-2 overflow-y-auto pr-1">
                    {pairs.map((pair) => {
                      const checked = selectedOriginalIds.includes(pair.original.id);
                      return (
                        <button
                          key={`${pair.original.id}-${pair.swap.id}`}
                          onClick={() => toggleOrderSelection(pair.original.id)}
                          className={`w-full rounded-xl border p-3 text-left transition ${
                            checked
                              ? "border-emerald-500/50 bg-emerald-500/10"
                              : "border-zinc-700 bg-zinc-950/80 hover:border-zinc-500"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-lg font-semibold text-white">
                                {getMealEmoji(pair.original)} {pair.original.name}
                              </p>
                              <p className="mt-1 text-base text-zinc-300">
                                {mealCalories(pair.original)} cal {"->"} {mealCalories(pair.swap)} cal
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-emerald-300">-{pair.calSaved} cal</p>
                              <p className="text-sm text-zinc-300">per order</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => setStep("restaurant")}
                  className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-base font-semibold text-zinc-200"
                >
                  Back
                </button>
                <button
                  onClick={continueToReveal}
                  disabled={selectedOriginalIds.length === 0 || pairs.length === 0}
                  className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 text-base font-semibold text-black disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
                >
                  Show My Biggest Jumper
                </button>
              </div>
            </motion.section>
          )}

          {step === "reveal" && (
            <motion.section
              key="reveal"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="rounded-3xl border border-emerald-500/30 bg-zinc-900/60 p-6">
                <p className="text-sm uppercase tracking-wider text-emerald-300">
                  Biggest Jumper • {selectedRestaurant?.name ?? "Selected Restaurant"}
                </p>

                {detailLoading && <p className="mt-3 text-base text-zinc-300">Loading best swaps...</p>}

                {!detailLoading && !selectedPair && (
                  <p className="mt-3 text-base text-zinc-300">
                    No positive swap found yet for this selection.
                  </p>
                )}

                {!detailLoading && selectedPair && (
                  <>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-zinc-700 bg-zinc-950/90 p-4">
                        <p className="text-sm uppercase tracking-wider text-zinc-300">Current Order</p>
                        <p className="mt-2 text-2xl font-semibold leading-tight text-white">
                          {getMealEmoji(selectedPair.original)} {selectedPair.original.name}
                        </p>
                        <p className="mt-2 text-lg text-zinc-300">
                          {mealCalories(selectedPair.original)} cal • {Math.round(selectedPair.original.totals.protein)}g protein
                        </p>
                      </div>
                      <div className="rounded-2xl border border-emerald-500/35 bg-zinc-950/90 p-4">
                        <p className="text-sm uppercase tracking-wider text-emerald-300">Smarter Swap</p>
                        <p className="mt-2 text-2xl font-semibold leading-tight text-white">
                          {getMealEmoji(selectedPair.swap)} {selectedPair.swap.name}
                        </p>
                        <p className="mt-2 text-lg text-zinc-200">
                          {mealCalories(selectedPair.swap)} cal • {Math.round(selectedPair.swap.totals.protein)}g protein
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <MetricCard label="Saved Per Order" value={`-${selectedPair.calSaved} cal`} />
                      <MetricCard label="Saved Per Week" value={`-${weeklySaved} cal`} />
                      <MetricCard label="Projected Fat Loss / Week" value={`${projectedFatLoss.toFixed(2)} lbs`} />
                    </div>

                    <p className="mt-3 text-base text-zinc-300">
                      Based on {frequency}x/week. This one change saves about {monthlySaved} calories per month.
                    </p>
                    {selectedPair.swap.swap_rationale && (
                      <p className="mt-2 text-base text-zinc-300">{selectedPair.swap.swap_rationale}</p>
                    )}

                    <div className="mt-5 grid gap-2 sm:grid-cols-2">
                      <button
                        onClick={addToPlan}
                        className="rounded-xl bg-emerald-500 px-4 py-3 text-base font-semibold text-black hover:bg-emerald-400"
                      >
                        Add To My Plan
                      </button>
                      <button
                        onClick={() => {
                          setStep("orders");
                          setSelectedPairIdx(0);
                        }}
                        className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-base font-semibold text-zinc-200"
                      >
                        Edit My Order Picks
                      </button>
                    </div>

                    {saveMessage && (
                      <p className="mt-2 text-base font-semibold text-emerald-300">{saveMessage}</p>
                    )}
                  </>
                )}
              </div>

              {revealPairs.length > 1 && (
                <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4">
                  <p className="text-sm uppercase tracking-wider text-zinc-300">Other Selected Jumpers</p>
                  <div className="mt-3 space-y-2">
                    {revealPairs.slice(0, 6).map((pair, idx) => (
                      <button
                        key={`${pair.original.id}-${pair.swap.id}`}
                        onClick={() => setSelectedPairIdx(idx)}
                        className={`w-full rounded-xl border p-3 text-left transition ${
                          idx === activePairIdx
                            ? "border-emerald-500/50 bg-emerald-500/10"
                            : "border-zinc-700 bg-zinc-950/80 hover:border-zinc-500"
                        }`}
                      >
                        <p className="text-lg font-semibold text-white">
                          {pair.original.name} {"->"} {pair.swap.name}
                        </p>
                        <p className="mt-1 text-base text-zinc-300">
                          Saves {pair.calSaved} cal/order at {frequency}x/week
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-2">
                <Link
                  href="/bible"
                  className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-base font-semibold text-zinc-200"
                >
                  Browse Full Fast Food Bible
                </Link>
                <Link
                  href="/snack-bible"
                  className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-base font-semibold text-zinc-200"
                >
                  Add A Snack Jumper
                </Link>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-700 bg-zinc-950/90 p-4">
      <p className="text-sm uppercase tracking-wider text-zinc-300">{label}</p>
      <p className="mt-2 text-3xl font-bold leading-tight text-emerald-300">{value}</p>
    </div>
  );
}
