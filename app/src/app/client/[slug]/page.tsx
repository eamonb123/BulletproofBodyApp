"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion, useSpring, useTransform } from "framer-motion";
import dynamic from "next/dynamic";
import { calculateMetabolismEquation, generateProjection } from "@/lib/calculator";

const ProjectionChart = dynamic(() => import("@/components/ProjectionChart"), {
  ssr: false,
});
const RevealNarrative = dynamic(() => import("@/components/RevealNarrative"), {
  ssr: false,
});

/* ─── Types ─── */

interface EcosystemProfile {
  id: string;
  slug: string;
  client_name: string;
  current_weight_lbs: number | null;
  goal_weight_lbs: number | null;
  daily_calorie_target: number | null;
  rmr: number | null;
  steps_per_day: number | null;
  workouts_per_week: number | null;
  cardio_minutes_per_week: number | null;
  workout_cal_per_session: number | null;
  protein_target_g: number | null;
  dream_weight_lbs: number | null;
}

interface EcosystemItem {
  id: number;
  category: string;
  item_state: string;
  original_name: string;
  original_brand: string | null;
  original_calories: number;
  original_protein_g: number;
  original_carbs_g: number;
  original_fat_g: number;
  original_serving: string | null;
  original_image_url: string | null;
  swap_name: string | null;
  swap_brand: string | null;
  swap_calories: number | null;
  swap_protein_g: number;
  swap_carbs_g: number;
  swap_fat_g: number;
  swap_serving: string | null;
  swap_image_url: string | null;
  swap_instacart_url: string | null;
  swap_walmart_url: string | null;
  frequency_per_week: number;
  client_context: string | null;
  why_they_eat_it: string | null;
  coach_note: string | null;
  coach_analysis: string | null;
  education_text: string | null;
  client_photo_url: string | null;
  client_comment: string | null;
  comment_date: string | null;
  is_toggled_on: number;
  is_approved: number;
  display_order: number;
  swap_education_text: string | null;
  suggested_swaps_json: string | null;
  template_meal_id: string | null;
  snack_swap_id: string | null;
  item_source: "logged" | "planned";
}

// Snack search result shape (from API)
interface SnackSearchResult {
  type: "snack";
  snack_swap_id: string;
  title: string;
  context: string;
  craving: string;
  rationale: string;
  original: { name: string; brand: string; serving: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; image_url: string | null };
  swap: { name: string; brand: string; serving: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; image_url: string | null; instacart_url: string; walmart_url: string };
}

// Meal search result shape (from API)
interface MealSearchResult {
  type: "meal";
  template_meal_id: string;
  name: string;
  description: string | null;
  meal_type: string | null;
  is_swap: number;
  swap_for: string | null;
  swap_rationale: string | null;
  restaurant: { name: string; emoji: string };
  nutrition: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
}

type SearchResult = SnackSearchResult | MealSearchResult;

/* ─── Constants ─── */

const TABS = [
  { key: "all", label: "All" },
  { key: "ordering_out", label: "Ordering Out" },
  { key: "snack", label: "Snacks" },
  { key: "at_home", label: "At Home" },
  { key: "dining_out", label: "Dining Out" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const FREQUENCY_CHOICES = [7, 6, 5, 4, 3, 2, 1] as const;

const STATE_CONFIG = {
  swap: { label: "Swap", border: "border-emerald-500/35", badge: "bg-emerald-500/15 text-emerald-300" },
  keep: { label: "Keep", border: "border-emerald-500/35", badge: "bg-emerald-500/15 text-emerald-300" },
  open_question: { label: "Open Question", border: "border-amber-500/35", badge: "bg-amber-500/15 text-amber-300" },
  education: { label: "Education", border: "border-blue-500/35", badge: "bg-blue-500/15 text-blue-300" },
} as const;

/* ─── Helpers ─── */

function clampFrequency(value: number) {
  if (Number.isNaN(value)) return 3;
  return Math.max(1, Math.min(7, Math.round(value)));
}

function getCalorieSavings(item: EcosystemItem) {
  if (item.item_state === "keep" || !item.swap_calories) return 0;
  return Math.max(0, item.original_calories - item.swap_calories);
}

function getProteinGain(item: EcosystemItem) {
  if (!item.swap_protein_g) return 0;
  return item.swap_protein_g - item.original_protein_g;
}

function getSearchHaystack(item: EcosystemItem) {
  return [
    item.original_name,
    item.original_brand,
    item.swap_name,
    item.swap_brand,
    item.client_context,
    item.coach_note,
    item.coach_analysis,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function formatName(name: string): string {
  return name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/* ─── Animated Value ─── */

function AnimatedValue({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const spring = useSpring(value, { stiffness: 115, damping: 24, mass: 0.9 });
  const display = useTransform(spring, (v) => v.toFixed(decimals));
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    const unsubscribe = display.on("change", (v) => {
      if (ref.current) ref.current.textContent = v;
    });
    return unsubscribe;
  }, [display]);

  return <span ref={ref}>{value.toFixed(decimals)}</span>;
}

/* ─── Equation Input ─── */

function EquationInput({
  label,
  value,
  onChange,
  unit,
  prefix,
  calBelow,
  highlight,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit: string;
  prefix?: string;
  calBelow?: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2 text-center ${
        highlight
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-zinc-700 bg-zinc-800/60"
      }`}
    >
      <p className={`text-[10px] uppercase tracking-wider ${highlight ? "text-emerald-400/70" : "text-zinc-500"}`}>
        {label}
      </p>
      <div className="flex items-center justify-center">
        {prefix && <span className={`text-lg font-bold ${highlight ? "text-emerald-300" : "text-white"}`}>{prefix}</span>}
        <input
          type="number"
          value={value || ""}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`w-16 bg-transparent text-center text-lg font-bold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
            highlight ? "text-emerald-300" : "text-white"
          }`}
        />
      </div>
      <p className={`text-[10px] ${highlight ? "text-emerald-400/50" : "text-zinc-500"}`}>{unit}</p>
      {calBelow !== undefined && (
        <p className="text-[10px] text-zinc-600">+{calBelow} cal</p>
      )}
    </div>
  );
}

/* ─── Main Page ─── */

export default function ClientEcosystemPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const isRevealMode = searchParams.get("reveal") === "true";

  const [profile, setProfile] = useState<EcosystemProfile | null>(null);
  const [items, setItems] = useState<EcosystemItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"logged" | "planned" | "ecosystem">("logged");
  const [ecosystemResults, setEcosystemResults] = useState<SearchResult[]>([]);
  const [ecosystemLoading, setEcosystemLoading] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState("");
  const [addSearchResults, setAddSearchResults] = useState<SearchResult[]>([]);
  const [addSearchLoading, setAddSearchLoading] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [showBuilderPanel, setShowBuilderPanel] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);

  // ─── Equation state (all editable, defaults from DB, saveable) ───
  const [eqCurrentWeight, setEqCurrentWeight] = useState<number>(0);
  const [eqGoalWeight, setEqGoalWeight] = useState<number>(0);
  const [eqRmr, setEqRmr] = useState<number>(0);
  const [eqSteps, setEqSteps] = useState<number>(0);
  const [eqCardioMinPerDay, setEqCardioMinPerDay] = useState<number>(0);
  const [eqLifts, setEqLifts] = useState<number>(0);
  const [eqCalTarget, setEqCalTarget] = useState<number>(0);
  const [eqInitialized, setEqInitialized] = useState(false);
  const [eqSaving, setEqSaving] = useState(false);
  const [eqDirty, setEqDirty] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Load an existing item into the builder for editing
  function loadItemIntoBuilder(item: EcosystemItem) {
    // This will be called by BuilderPanel via a ref or callback
    const event = new CustomEvent("loadItemIntoBuilder", { detail: item });
    window.dispatchEvent(event);
  }

  // Load profile + items
  const loadData = useCallback(async () => {
    try {
      const response = await fetch(`/api/ecosystem/${slug}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError("not_found");
        } else {
          setError("Failed to load");
        }
        setLoading(false);
        return;
      }
      const data = await response.json();
      setProfile(data.profile);
      setItems(data.items || []);
      setError(null);
    } catch {
      setError("Failed to load");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Initialize equation state from profile
  useEffect(() => {
    if (profile && !eqInitialized) {
      setEqCurrentWeight(profile.current_weight_lbs ?? 0);
      setEqGoalWeight(profile.goal_weight_lbs ?? 0);
      setEqRmr(profile.rmr ?? 0);
      setEqSteps(profile.steps_per_day ?? 0);
      setEqLifts(profile.workouts_per_week ?? 0);
      setEqCardioMinPerDay(Math.round((profile.cardio_minutes_per_week ?? 0) / 7));
      // Default to maintenance - 500 if no saved target in DB
      const rmr = profile.rmr ?? 0;
      const stepCal = (profile.steps_per_day ?? 0) * 0.05;
      const workoutCal = ((profile.workouts_per_week ?? 0) * 250) / 7;
      const cardioCal = ((profile.cardio_minutes_per_week ?? 0) * 8) / 7;
      const totalBurn = rmr + stepCal + workoutCal + cardioCal;
      const defaultTarget = Math.round(totalBurn - 500);
      setEqCalTarget(profile.daily_calorie_target || defaultTarget);
      setEqInitialized(true);
    }
  }, [profile, eqInitialized]);

  // Track dirty state for save button
  const markDirty = useCallback(() => setEqDirty(true), []);

  // Live equation calculation
  const equation = useMemo(() => {
    if (!eqRmr) return null;
    return calculateMetabolismEquation({
      rmr: eqRmr,
      stepsPerDay: eqSteps,
      workoutsPerWeek: eqLifts,
      cardioMinPerDay: eqCardioMinPerDay,
      dailyCalorieTarget: eqCalTarget,
    });
  }, [eqRmr, eqSteps, eqLifts, eqCardioMinPerDay, eqCalTarget]);

  // Live projection
  const projection = useMemo(() => {
    if (!equation || !eqCurrentWeight || !eqGoalWeight || equation.dailyDeficit <= 0) return null;
    const weeksNeeded = Math.ceil((eqCurrentWeight - eqGoalWeight) / equation.weeklyFatLossLbs);
    return {
      data: generateProjection(eqCurrentWeight, eqGoalWeight, equation.dailyDeficit, weeksNeeded + 4),
      weeksToGoal: weeksNeeded,
      goalDate: (() => {
        const d = new Date();
        d.setDate(d.getDate() + weeksNeeded * 7);
        return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      })(),
      lbsToLose: Math.round((eqCurrentWeight - eqGoalWeight) * 10) / 10,
    };
  }, [equation, eqCurrentWeight, eqGoalWeight]);

  // Save equation settings to DB
  async function saveEquationSettings() {
    if (!profile) return;
    setEqSaving(true);
    try {
      await fetch(`/api/ecosystem/${slug}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_weight_lbs: eqCurrentWeight,
          goal_weight_lbs: eqGoalWeight,
          rmr: eqRmr,
          steps_per_day: eqSteps,
          workouts_per_week: eqLifts,
          cardio_minutes_per_week: eqCardioMinPerDay * 7,
          daily_calorie_target: eqCalTarget,
        }),
      });
      setEqDirty(false);
    } finally {
      setEqSaving(false);
    }
  }

  // Create profile if not found
  async function handleCreateProfile() {
    try {
      setLoading(true);
      const clientName = formatName(slug);
      const response = await fetch("/api/ecosystem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName }),
      });
      if (!response.ok) throw new Error("Failed to create profile");
      await loadData();
    } catch {
      setError("Failed to create profile");
      setLoading(false);
    }
  }

  // Filter items by source + category + search
  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const sourceFilter = searchMode === "logged" ? "logged" : searchMode === "planned" ? "planned" : null;
    return items
      .filter((item) => {
        if (sourceFilter && (item.item_source || "logged") !== sourceFilter) return false;
        if (activeTab !== "all" && item.category !== activeTab) return false;
        if (query && !getSearchHaystack(item).includes(query)) return false;
        return true;
      })
      .sort((a, b) => {
        // Highest calorie savings first (swaps with biggest impact at top)
        const aSaved = a.item_state === "swap" && a.swap_calories != null ? a.original_calories - a.swap_calories : 0;
        const bSaved = b.item_state === "swap" && b.swap_calories != null ? b.original_calories - b.swap_calories : 0;
        return bSaved - aSaved;
      });
  }, [items, activeTab, searchQuery, searchMode]);

  // Totals (all toggled-on items, regardless of tab/filter)
  const totals = useMemo(() => {
    const activeItems = items.filter((i) => i.is_toggled_on);
    const weeklyCalories = activeItems.reduce((sum, item) => {
      return sum + getCalorieSavings(item) * item.frequency_per_week;
    }, 0);
    const weeklyFatLoss = weeklyCalories / 3500;
    const monthlyFatLoss = (weeklyCalories * 4) / 3500;
    return { weeklyCalories, weeklyFatLoss, monthlyFatLoss, itemCount: items.length };
  }, [items]);

  // Reveal data: top swaps + favorite snack
  const revealData = useMemo(() => {
    const swapsWithSavings = items
      .filter((i) => i.swap_calories != null && i.swap_calories < i.original_calories)
      .map((i) => ({
        originalName: i.original_name,
        originalCalories: i.original_calories,
        originalImage: i.client_photo_url || i.original_image_url || null,
        swapName: i.swap_name || "",
        swapCalories: i.swap_calories || 0,
        swapImage: i.swap_image_url || null,
        saved: Math.round(i.original_calories - (i.swap_calories || 0)),
        category: i.category,
      }))
      .sort((a, b) => b.saved - a.saved);

    // Pick top swap from each category for the reveal
    const categoryOrder = ["dining_out", "ordering_out", "snack", "at_home"];
    const topByCategory: typeof swapsWithSavings = [];
    for (const cat of categoryOrder) {
      const best = swapsWithSavings.find((s) => s.category === cat);
      if (best) topByCategory.push(best);
    }
    // Fill remaining slots from unused swaps if < 3
    if (topByCategory.length < 3) {
      for (const s of swapsWithSavings) {
        if (!topByCategory.includes(s)) {
          topByCategory.push(s);
          if (topByCategory.length >= 3) break;
        }
      }
    }

    // Pick the most "guilty pleasure" snacks — skip healthy-sounding ones
    const healthyWords = ["fruit", "yogurt", "organic", "rice pudding", "salad", "oat"];
    const snacks = items
      .filter((i) => i.category === "snack")
      .filter((i) => !healthyWords.some((w) => i.original_name.toLowerCase().includes(w)))
      .map((i) => ({ name: i.original_name, calories: i.original_calories, serving: i.original_serving || "" }));

    return { topSwaps: topByCategory.slice(0, 3), favoriteSnacks: snacks };
  }, [items]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const sourceFilter = searchMode === "logged" ? "logged" : searchMode === "planned" ? "planned" : null;
    const sourceItems = sourceFilter ? items.filter((i) => (i.item_source || "logged") === sourceFilter) : items;
    const counts: Record<string, number> = { all: sourceItems.length };
    for (const item of sourceItems) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
    return counts;
  }, [items, searchMode]);

  // Update item
  async function updateItem(itemId: number, updates: Record<string, unknown>) {
    // Optimistic update
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...updates, updated_at: new Date().toISOString() } : item))
    );

    try {
      const response = await fetch(`/api/ecosystem/${slug}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Update failed");
    } catch {
      // Revert on failure
      await loadData();
    }
  }

  // Delete item
  async function deleteItem(itemId: number) {
    setItems((prev) => prev.filter((item) => item.id !== itemId));

    try {
      const response = await fetch(`/api/ecosystem/${slug}/items/${itemId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Delete failed");
    } catch {
      await loadData();
    }
  }

  // Ecosystem-wide search (when searchMode === "ecosystem")
  useEffect(() => {
    if (searchMode !== "ecosystem") { setEcosystemResults([]); return; }
    const q = searchQuery.trim();
    if (q.length < 2) { setEcosystemResults([]); return; }

    const timeout = setTimeout(async () => {
      setEcosystemLoading(true);
      try {
        const response = await fetch(`/api/ecosystem/search?q=${encodeURIComponent(q)}`);
        if (response.ok) {
          const data = await response.json();
          setEcosystemResults([...(data.snacks || []), ...(data.meals || [])]);
        }
      } catch { /* ignore */ } finally {
        setEcosystemLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, searchMode]);

  // Add search
  useEffect(() => {
    const q = addSearchQuery.trim();
    if (q.length < 2) {
      setAddSearchResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setAddSearchLoading(true);
      try {
        const response = await fetch(`/api/ecosystem/search?q=${encodeURIComponent(q)}`);
        if (response.ok) {
          const data = await response.json();
          setAddSearchResults([...(data.snacks || []), ...(data.meals || [])]);
        }
      } catch {
        // ignore
      } finally {
        setAddSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [addSearchQuery]);

  // Add item from search result
  async function addItemFromSearch(result: SearchResult) {
    try {
      const body: Record<string, unknown> = {
        item_state: "swap",
        frequency_per_week: 3,
      };

      if (result.type === "snack") {
        body.snack_swap_id = result.snack_swap_id;
        body.category = "snack";
        body.original_name = result.original.name;
        body.original_brand = result.original.brand;
        body.original_calories = result.original.calories;
        body.original_protein_g = result.original.protein_g;
        body.original_carbs_g = result.original.carbs_g;
        body.original_fat_g = result.original.fat_g;
        body.original_serving = result.original.serving;
        body.original_image_url = result.original.image_url;
        body.swap_name = result.swap.name;
        body.swap_brand = result.swap.brand;
        body.swap_calories = result.swap.calories;
        body.swap_protein_g = result.swap.protein_g;
        body.swap_carbs_g = result.swap.carbs_g;
        body.swap_fat_g = result.swap.fat_g;
        body.swap_serving = result.swap.serving;
        body.swap_image_url = result.swap.image_url;
        body.swap_instacart_url = result.swap.instacart_url;
        body.swap_walmart_url = result.swap.walmart_url;
        body.coach_note = result.rationale;
        body.client_context = result.context;
      } else {
        body.template_meal_id = result.template_meal_id;
        body.category = "ordering_out";
        body.original_name = result.name;
        body.original_brand = result.restaurant.name;
        body.original_calories = result.nutrition.calories;
        body.original_protein_g = result.nutrition.protein_g;
        body.original_carbs_g = result.nutrition.carbs_g;
        body.original_fat_g = result.nutrition.fat_g;
        body.coach_note = result.swap_rationale || result.description;
      }

      const response = await fetch(`/api/ecosystem/${slug}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error("Failed to add");

      await loadData();
      setAddSearchQuery("");
      setAddSearchResults([]);
    } catch {
      // ignore
    }
  }

  // Toggle expanded reveal detail
  function toggleExpanded(itemId: number) {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  /* ─── Render ─── */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-zinc-400">Loading ecosystem...</p>
      </div>
    );
  }

  if (error === "not_found") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black text-white">
        <h1 className="text-2xl font-bold">{formatName(slug)}</h1>
        <p className="text-zinc-400">No ecosystem profile found for this client.</p>
        <p className="text-sm text-zinc-500">Profiles are created by your coach.</p>
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
          Back to directory
        </Link>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-rose-300">{error || "Something went wrong"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-black/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
          <Link
            href="/"
            className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400 transition-colors hover:text-zinc-200"
          >
            Back
          </Link>
          <div className="text-center">
            <h1 className="text-lg font-semibold uppercase tracking-[0.22em] text-emerald-400">
              {profile.client_name}&apos;s Ecosystem
            </h1>
            <p className="mt-1 text-base text-zinc-400">
              {isRevealMode
                ? "Here\u2019s every meal, snack, and order in your life."
                : "Your personalized food swap dashboard."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBuilderPanel(!showBuilderPanel)}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold uppercase tracking-wider transition-colors ${
                showBuilderPanel
                  ? "border-amber-500/35 bg-amber-500/20 text-amber-300"
                  : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500"
              }`}
            >
              {showBuilderPanel ? "Close Build" : "Build"}
            </button>
            {isRevealMode ? (
              <Link
                href={`/client/${slug}`}
                className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm font-semibold uppercase tracking-wider text-zinc-300"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href={`/client/${slug}?reveal=true`}
                className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold uppercase tracking-wider text-emerald-300"
              >
                Reveal
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pt-4">
        {/* ─── REVEAL NARRATIVE (only in reveal mode) ─── */}
        {isRevealMode && equation && projection && (
          <RevealNarrative
            clientFirstName={profile.client_name.split(" ")[0]}
            currentWeight={eqCurrentWeight}
            goalWeight={eqGoalWeight}
            maintenance={equation.totalDailyBurn}
            dailyDeficit={equation.dailyDeficit}
            calorieTarget={eqCalTarget}
            weeklyFatLoss={equation.weeklyFatLossLbs}
            weeksToGoal={projection.weeksToGoal}
            goalDate={projection.goalDate}
            lbsToLose={projection.lbsToLose}
            topSwaps={revealData.topSwaps}
            favoriteSnacks={revealData.favoriteSnacks}
          />
        )}

        {/* ─── YOUR MATH ─── */}
        {equation && (
          <>
            <div className="mb-4 rounded-2xl border border-zinc-700/50 bg-zinc-900/60 p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                  Your Math
                </p>
                <button
                  onClick={saveEquationSettings}
                  disabled={eqSaving || !eqDirty}
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
                    eqDirty
                      ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                      : "border border-zinc-700 bg-zinc-800/40 text-zinc-500"
                  }`}
                >
                  {eqSaving ? "Saving..." : eqDirty ? "Save Settings" : "Saved"}
                </button>
              </div>

              {/* Row 1: Static identity (RMR, current weight, goal weight) */}
              <div className="mb-4">
                <p className="mb-2 text-sm text-zinc-400">
                  Your body burns{" "}
                  <span className="font-semibold text-emerald-300">
                    <AnimatedValue value={equation.totalDailyBurn} />
                  </span>{" "}
                  calories every day. To get from{" "}
                  <span className="font-semibold text-white">{eqCurrentWeight}</span> to{" "}
                  <span className="font-semibold text-emerald-300">{eqGoalWeight} lbs</span>
                  {projection && (
                    <>
                      {" "}you need to lose{" "}
                      <span className="font-semibold text-white">{projection.lbsToLose} lbs</span> of fat.
                    </>
                  )}
                </p>
                <div className="flex flex-wrap items-end gap-2">
                  <EquationInput label="RMR" value={eqRmr} onChange={(v) => { setEqRmr(v); markDirty(); }} unit="cal/day" />
                  <EquationInput label="Current Weight" value={eqCurrentWeight} onChange={(v) => { setEqCurrentWeight(v); markDirty(); }} unit="lbs" />
                  <span className="pb-3 text-lg text-zinc-500">→</span>
                  <EquationInput label="Goal Weight" value={eqGoalWeight} onChange={(v) => { setEqGoalWeight(v); markDirty(); }} unit="lbs" highlight />
                </div>
              </div>

              {/* Row 2: The 4 Toggles */}
              <div className="mb-4">
                <p className="mb-2 text-sm text-zinc-400">
                  Adjust the levers. Everything recalculates live:
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {/* Steps/day */}
                  <div className="rounded-xl border border-zinc-700 bg-zinc-800/60 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">Steps / Day</p>
                    <input
                      type="number"
                      value={eqSteps || ""}
                      onChange={(e) => { setEqSteps(Number(e.target.value)); markDirty(); }}
                      className="mt-1 w-full bg-transparent text-2xl font-bold text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <p className="text-xs text-zinc-600">+<AnimatedValue value={equation.stepCaloriesPerDay} /> cal/day</p>
                  </div>

                  {/* Cardio min/day */}
                  <div className="rounded-xl border border-zinc-700 bg-zinc-800/60 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">Cardio Min / Day</p>
                    <input
                      type="number"
                      value={eqCardioMinPerDay || ""}
                      onChange={(e) => { setEqCardioMinPerDay(Number(e.target.value)); markDirty(); }}
                      className="mt-1 w-full bg-transparent text-2xl font-bold text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      placeholder="0"
                    />
                    <p className="text-xs text-zinc-600">+<AnimatedValue value={equation.cardioCaloriesPerDay} /> cal/day</p>
                  </div>

                  {/* Lifting workouts/week */}
                  <div className="rounded-xl border border-zinc-700 bg-zinc-800/60 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">Lifting / Week</p>
                    <input
                      type="number"
                      value={eqLifts || ""}
                      onChange={(e) => { setEqLifts(Number(e.target.value)); markDirty(); }}
                      className="mt-1 w-full bg-transparent text-2xl font-bold text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      placeholder="0"
                    />
                    <p className="text-xs text-zinc-600">+<AnimatedValue value={equation.workoutCaloriesPerDay} /> cal/day ({eqLifts * 250}/wk)</p>
                  </div>

                  {/* Calories/day target */}
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-emerald-400/70">Calories / Day</p>
                    <input
                      type="number"
                      value={eqCalTarget || ""}
                      onChange={(e) => { setEqCalTarget(Number(e.target.value)); markDirty(); }}
                      className="mt-1 w-full bg-transparent text-2xl font-bold text-emerald-300 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <p className="text-xs text-emerald-400/50">your daily target</p>
                  </div>
                </div>
              </div>

              {/* Outcome row */}
              {projection && (
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-2.5">
                    <p className="text-sm uppercase tracking-wider text-zinc-400">Daily Deficit</p>
                    <p className="text-3xl font-bold text-emerald-300">
                      <AnimatedValue value={equation.dailyDeficit} /> <span className="text-lg text-zinc-400">cal</span>
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
                    <p className="text-sm uppercase tracking-wider text-emerald-400/70">Fat Loss</p>
                    <p className="text-3xl font-bold text-emerald-300">
                      <AnimatedValue value={equation.weeklyFatLossLbs} decimals={2} /> <span className="text-lg text-emerald-400/50">lbs/wk</span>
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
                    <p className="text-sm uppercase tracking-wider text-emerald-400/70">
                      {eqCurrentWeight} → {eqGoalWeight} lbs
                    </p>
                    <p className="text-3xl font-bold text-emerald-300">
                      <AnimatedValue value={projection.weeksToGoal} /> <span className="text-lg text-emerald-400/50">weeks</span>
                    </p>
                    <p className="text-xs text-zinc-500">{projection.goalDate}</p>
                  </div>
                </div>
              )}

              {(eqLifts === 0 && eqCardioMinPerDay === 0) && (
                <p className="mt-3 text-xs text-zinc-500 italic">
                  From food swaps alone. Any workout or cardio = bonus.
                </p>
              )}
            </div>

            {/* ─── PROJECTION CHART ─── */}
            {projection && (
              <div className="mb-4 rounded-2xl border border-zinc-700/50 bg-zinc-900/60 p-4">
                <div className="mb-2 flex items-baseline justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                    Your Projection
                  </p>
                  <p className="text-xs text-zinc-500">
                    {eqCurrentWeight} lbs → {eqGoalWeight} lbs by {projection.goalDate}
                  </p>
                </div>
                <ProjectionChart
                  data={projection.data}
                  startDate={new Date()}
                  goalMarkers={[
                    { weight: eqGoalWeight, label: "Goal", color: "#10b981" },
                  ]}
                />
              </div>
            )}
          </>
        )}

        {/* Category tab bar (hidden in ecosystem search mode) */}
        {searchMode !== "ecosystem" && <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-wider transition-colors ${
                activeTab === tab.key
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
              }`}
            >
              {tab.label}
              {(tabCounts[tab.key] || 0) > 0 && (
                <span className="ml-1.5 text-xs opacity-60">{tabCounts[tab.key]}</span>
              )}
            </button>
          ))}
        </div>}

        {/* Builder Panel */}
        <AnimatePresence>
          {showBuilderPanel && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 overflow-hidden"
            >
              <BuilderPanel
                slug={slug}
                editingItemId={editingItemId}
                onItemAdded={() => {
                  loadData();
                }}
                onEditComplete={() => {
                  setEditingItemId(null);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Source mode toggle */}
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => { setSearchMode("logged"); setSearchQuery(""); setActiveTab("all"); }}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              searchMode === "logged"
                ? "bg-amber-500/20 text-amber-300"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
            }`}
          >
            Unconscious Eating
          </button>
          <button
            onClick={() => { setSearchMode("planned"); setSearchQuery(""); setActiveTab("all"); }}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              searchMode === "planned"
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
            }`}
          >
            Meal Plan
          </button>
          <button
            onClick={() => { setSearchMode("ecosystem"); setSearchQuery(""); }}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              searchMode === "ecosystem"
                ? "bg-blue-500/20 text-blue-300"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
            }`}
          >
            Search All Foods
          </button>
        </div>

        {/* Search + Add */}
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            type="text"
            placeholder={searchMode === "ecosystem" ? "Search all snacks, restaurants, meals..." : searchMode === "planned" ? "Search meal plan..." : "Search logged food..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-base text-white placeholder-zinc-500 outline-none transition-colors focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
          />
          <button
            onClick={() => setShowAddPanel(!showAddPanel)}
            className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold uppercase tracking-wider text-black transition-colors hover:bg-emerald-400"
          >
            {showAddPanel ? "Close" : "+ Add Item"}
          </button>
        </div>

        {/* Add Panel */}
        <AnimatePresence>
          {showAddPanel && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900/80"
            >
              <div className="p-4">
                <p className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                  Search snacks, restaurants, meals...
                </p>
                <input
                  type="text"
                  placeholder="Type to search the database..."
                  value={addSearchQuery}
                  onChange={(e) => setAddSearchQuery(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-base text-white placeholder-zinc-500 outline-none transition-colors focus:border-emerald-500/50"
                />
                {addSearchLoading && <p className="mt-2 text-sm text-zinc-500">Searching...</p>}
                {addSearchResults.length > 0 && (
                  <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
                    {addSearchResults.map((result, i) => {
                      const isSnack = result.type === "snack";
                      const originalBrand = isSnack ? result.original.brand : result.restaurant.name;
                      const originalName = isSnack ? result.original.name : result.name;
                      const originalCal = isSnack ? result.original.calories : result.nutrition.calories;
                      const swapName = isSnack ? result.swap.name : null;
                      const swapCal = isSnack ? result.swap.calories : null;
                      const badge = isSnack ? "Snack" : result.restaurant.name;
                      const resultKey = isSnack ? result.snack_swap_id : result.template_meal_id;

                      return (
                        <div
                          key={`${result.type}-${resultKey}-${i}`}
                          className="flex items-center justify-between gap-3 rounded-xl border border-zinc-700 bg-zinc-950/80 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                                  isSnack
                                    ? "bg-purple-500/15 text-purple-300"
                                    : "bg-orange-500/15 text-orange-300"
                                }`}
                              >
                                {badge}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-base font-semibold text-white">
                              <span className="text-zinc-400">{originalBrand}</span>{" "}
                              {originalName}
                              <span className="font-normal text-zinc-400"> ({originalCal} cal)</span>
                            </p>
                            {swapName && (
                              <p className="truncate text-sm text-emerald-300">
                                → {swapName}
                                {swapCal != null && ` (${swapCal} cal)`}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => addItemFromSearch(result)}
                            className="shrink-0 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold uppercase tracking-wider text-black"
                          >
                            Add
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {addSearchQuery.trim().length >= 2 && !addSearchLoading && addSearchResults.length === 0 && (
                  <p className="mt-2 text-sm text-zinc-500">No results found in database.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cumulative Impact Bar */}
        <div className="sticky top-2 z-20 mt-4 rounded-2xl border border-emerald-500/30 bg-zinc-950/90 p-3 shadow-[0_12px_48px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="grid gap-2 sm:grid-cols-3">
            <StickyMetric label="Weekly Calories Saved" value={totals.weeklyCalories} suffix="cal" decimals={0} />
            <StickyMetric label="Projected Fat Loss / Week" value={totals.weeklyFatLoss} suffix="lbs" decimals={2} />
            <StickyMetric label="Projected Fat Loss / Month" value={totals.monthlyFatLoss} suffix="lbs" decimals={1} />
          </div>
          <p className="mt-2 text-sm text-zinc-400">{totals.itemCount} items in ecosystem.</p>
        </div>

        {/* ─── Ecosystem-wide search results ─── */}
        {searchMode === "ecosystem" && (
          <div className="mt-5">
            {ecosystemLoading && <p className="py-8 text-center text-sm text-zinc-500">Searching all foods...</p>}
            {!ecosystemLoading && searchQuery.trim().length >= 2 && ecosystemResults.length === 0 && (
              <div className="py-10 text-center">
                <p className="text-zinc-400">No results for &ldquo;{searchQuery}&rdquo; in the database.</p>
              </div>
            )}
            {!ecosystemLoading && searchQuery.trim().length < 2 && (
              <div className="py-10 text-center">
                <p className="text-zinc-500">Type at least 2 characters to search all snacks, restaurants, and meals.</p>
              </div>
            )}
            {ecosystemResults.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-zinc-500">{ecosystemResults.length} result{ecosystemResults.length !== 1 ? "s" : ""} from database</p>
                {ecosystemResults.map((result, i) => {
                  const isSnack = result.type === "snack";
                  const name = isSnack ? result.original.name : result.name;
                  const brand = isSnack ? result.original.brand : result.restaurant.name;
                  const cal = isSnack ? result.original.calories : result.nutrition.calories;
                  const protein = isSnack ? result.original.protein_g : result.nutrition.protein_g;
                  const swapName = isSnack ? result.swap.name : null;
                  const swapCal = isSnack ? result.swap.calories : null;
                  const swapPro = isSnack ? result.swap.protein_g : null;

                  return (
                    <motion.div
                      key={`${result.type}-${i}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="rounded-2xl border border-zinc-700 bg-zinc-900/60 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isSnack ? "bg-purple-500/15 text-purple-300" : "bg-amber-500/15 text-amber-300"}`}>
                              {isSnack ? "Snack" : "Meal"}
                            </span>
                            {brand && <span className="text-xs text-zinc-500">{brand}</span>}
                          </div>
                          <p className="mt-1 text-base font-semibold text-white">{name}</p>
                          <div className="mt-1 flex items-baseline gap-1.5">
                            <span className="text-lg font-bold text-emerald-400">{cal}</span>
                            <span className="text-xs text-emerald-400/70">cal</span>
                            <span className="mx-1 text-zinc-600">·</span>
                            <span className="text-lg font-bold text-white">{protein}g</span>
                            <span className="text-xs text-zinc-400">protein</span>
                          </div>
                        </div>
                      </div>
                      {swapName && (
                        <div className="mt-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-1">Swap</p>
                          <p className="text-sm font-medium text-zinc-200">{swapName}</p>
                          <div className="mt-1 flex items-baseline gap-1.5">
                            <span className="text-sm font-bold text-emerald-400">{swapCal} cal</span>
                            {swapPro != null && <span className="text-xs text-zinc-400">· {swapPro}g protein</span>}
                            {swapCal != null && cal > swapCal && (
                              <span className="ml-auto rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-400">
                                -{cal - swapCal} cal
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── Client items (logged or planned mode) ─── */}
        {(searchMode === "logged" || searchMode === "planned") && (
          <>
            {/* Empty state */}
            {filteredItems.length === 0 && items.length === 0 && (
              <div className="mt-8 rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 p-8 text-center">
                <p className="text-xl font-semibold text-zinc-300">
                  {searchMode === "planned" ? "Meal plan is empty" : "Ecosystem is empty"}
                </p>
                <p className="mt-2 text-base text-zinc-500">
                  {searchMode === "planned"
                    ? "Use \"Search All Foods\" to find items and add them to the meal plan."
                    : "Use the search above to add snacks, takeout meals, and grocery items from the database."}
                </p>
              </div>
            )}
            {filteredItems.length === 0 && items.length > 0 && items.some((i) => (i.item_source || "logged") === (searchMode === "planned" ? "planned" : "logged")) === false && (
              <div className="mt-8 rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 p-8 text-center">
                <p className="text-xl font-semibold text-zinc-300">
                  {searchMode === "planned" ? "Meal plan is empty" : "No logged food yet"}
                </p>
                <p className="mt-2 text-base text-zinc-500">
                  {searchMode === "planned"
                    ? "Use \"Search All Foods\" to find items and add them to the meal plan."
                    : "Add items from the client's food photos and conversations."}
                </p>
              </div>
            )}

            {/* Items */}
            {filteredItems.length > 0 && (
              <div className="mt-5 space-y-4">
                {filteredItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02, duration: 0.2 }}
                  >
                    <EcosystemItemCard
                      item={item}
                      isRevealMode={isRevealMode}
                      isExpanded={expandedItems.has(item.id)}
                      clientFirstName={profile.client_name.split(" ")[0]}
                      onToggleExpand={() => toggleExpanded(item.id)}
                      onFrequencyChange={(freq) => updateItem(item.id, { frequency_per_week: clampFrequency(freq) })}
                      onToggle={() => updateItem(item.id, { is_toggled_on: item.is_toggled_on ? 0 : 1 })}
                      onApprove={() => updateItem(item.id, { is_approved: 1 })}
                      onUpdateState={(updates) => updateItem(item.id, updates)}
                      onEdit={() => {
                        setEditingItemId(item.id);
                        setShowBuilderPanel(true);
                        loadItemIntoBuilder(item);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      onDelete={() => deleteItem(item.id)}
                      onUpdateNote={(note) => updateItem(item.id, { coach_note: note })}
                      onImageClick={(src) => setLightboxSrc(src)}
                    />
                  </motion.div>
                ))}
              </div>
            )}

            {filteredItems.length === 0 && items.length > 0 && (
              <div className="mt-8 py-10 text-center">
                <p className="text-zinc-400">No items match that filter.</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* ─── Lightbox Modal ─── */}
      <AnimatePresence>
        {lightboxSrc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setLightboxSrc(null)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative max-h-[85vh] max-w-[85vw]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={lightboxSrc}
                alt="Full size"
                className="max-h-[85vh] max-w-[85vw] rounded-2xl object-contain"
              />
              <button
                onClick={() => setLightboxSrc(null)}
                className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 shadow-lg transition-colors hover:bg-zinc-700"
              >
                ✕
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Ecosystem Item Card ─── */

function EcosystemItemCard({
  item,
  isRevealMode,
  isExpanded,
  clientFirstName,
  onToggleExpand,
  onFrequencyChange,
  onToggle,
  onApprove,
  onUpdateState,
  onEdit,
  onDelete,
  onUpdateNote: _onUpdateNote,
  onImageClick,
}: {
  item: EcosystemItem;
  isRevealMode: boolean;
  isExpanded: boolean;
  clientFirstName: string;
  onToggleExpand: () => void;
  onFrequencyChange: (value: number) => void;
  onToggle: () => void;
  onApprove: () => void;
  onUpdateState: (updates: Record<string, unknown>) => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateNote: (note: string) => void;
  onImageClick?: (src: string) => void;
}) {
  const calorieSavings = getCalorieSavings(item);
  const proteinGain = getProteinGain(item);
  const weeklyCalorieSavings = calorieSavings * item.frequency_per_week;
  const weeklyFatLoss = weeklyCalorieSavings / 3500;
  const stateConfig = STATE_CONFIG[item.item_state as keyof typeof STATE_CONFIG] || STATE_CONFIG.swap;
  const showRevealDetails = isRevealMode || isExpanded;
  const hasExpandableDetails = item.why_they_eat_it || item.coach_analysis;

  // Edit Swap state
  const [showEditSwap, setShowEditSwap] = useState(false);
  const [swapSearchQuery, setSwapSearchQuery] = useState("");
  const [swapSearchResults, setSwapSearchResults] = useState<SuggestedSwap[]>([]);
  const [swapSearchLoading, setSwapSearchLoading] = useState(false);
  const swapSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const savedSwaps = useMemo(() => {
    if (!item.suggested_swaps_json) return [];
    try { return JSON.parse(item.suggested_swaps_json) as SuggestedSwap[]; } catch { return []; }
  }, [item.suggested_swaps_json]);

  // Debounced semantic search for swaps
  useEffect(() => {
    if (!swapSearchQuery.trim()) {
      setSwapSearchResults([]);
      return;
    }
    if (swapSearchTimerRef.current) clearTimeout(swapSearchTimerRef.current);
    swapSearchTimerRef.current = setTimeout(async () => {
      setSwapSearchLoading(true);
      try {
        const res = await fetch(`/api/ecosystem/semantic-search?q=${encodeURIComponent(swapSearchQuery)}&swaps_only=true&limit=6`);
        if (res.ok) {
          const data = await res.json();
          setSwapSearchResults(data);
        }
      } catch { /* ignore */ }
      setSwapSearchLoading(false);
    }, 300);
    return () => { if (swapSearchTimerRef.current) clearTimeout(swapSearchTimerRef.current); };
  }, [swapSearchQuery]);

  async function applySwap(swap: SuggestedSwap) {
    onUpdateState({
      swap_name: swap.name,
      swap_brand: swap.brand,
      swap_calories: swap.calories,
      swap_protein_g: swap.protein_g,
      swap_carbs_g: swap.carbs_g,
      swap_fat_g: swap.fat_g,
      item_state: "swap",
    });
    setShowEditSwap(false);
    setSwapSearchQuery("");
    setSwapSearchResults([]);
  }

  return (
    <article
      className={`overflow-hidden rounded-2xl border ${stateConfig.border} ${
        !item.is_toggled_on ? "opacity-50" : ""
      } bg-zinc-900/60 transition-opacity`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 p-5 pb-0">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wider ${stateConfig.badge}`}>
              {stateConfig.label}
            </span>
            <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              {TABS.find((t) => t.key === item.category)?.label || item.category}
            </span>
            {item.is_approved ? (
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                Approved
              </span>
            ) : null}
          </div>
          <h2 className="mt-2 text-xl font-semibold leading-tight text-white">{item.original_name}</h2>
          {item.original_brand && <p className="text-base text-zinc-400">{item.original_brand}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* Toggle on/off */}
          <button
            onClick={onToggle}
            className={`h-8 w-14 rounded-full transition-colors ${
              item.is_toggled_on ? "bg-emerald-500" : "bg-zinc-700"
            }`}
          >
            <div
              className={`h-6 w-6 rounded-full bg-white shadow transition-transform ${
                item.is_toggled_on ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Client photo + comment — always visible when available */}
      {(item.client_photo_url || item.client_comment) && (
        <div className="mx-5 mt-4 flex gap-4">
          {item.client_photo_url && (
            <div className="relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-zinc-700 transition-transform hover:scale-105" onClick={() => onImageClick?.(item.client_photo_url!)}>
              <Image src={item.client_photo_url} alt="Client photo" fill className="object-cover" sizes="80px" />
            </div>
          )}
          <div className="min-w-0">
            {item.client_comment && (
              <blockquote className="text-base italic text-zinc-300">
                &ldquo;{item.client_comment}&rdquo;
              </blockquote>
            )}
            {item.comment_date && (
              <p className="mt-1 text-sm text-zinc-500">
                — {clientFirstName}, {item.comment_date}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Expanded details: why, coach analysis (reveal mode or "See details") */}
      {showRevealDetails && (item.why_they_eat_it || item.coach_analysis) && (
        <div className="mx-5 mt-3 rounded-xl border border-zinc-700/50 bg-zinc-950/60 p-4">
          {item.why_they_eat_it && (
            <p className="text-sm text-zinc-400">
              <span className="font-semibold uppercase tracking-wider text-zinc-500">Why: </span>
              {item.why_they_eat_it}
            </p>
          )}
          {item.coach_analysis && (
            <div className={item.why_they_eat_it ? "mt-3 border-t border-zinc-700/50 pt-3" : ""}>
              <p className="text-sm font-semibold uppercase tracking-wider text-emerald-400">Eamon&apos;s Take</p>
              <p className="mt-1 text-base text-zinc-300">{item.coach_analysis}</p>
            </div>
          )}
        </div>
      )}

      {/* Delta badges */}
      {item.item_state === "swap" && calorieSavings > 0 && (
        <div className="mx-5 mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-1.5 text-sm font-semibold uppercase tracking-wider text-emerald-300">
            -{calorieSavings} cal per swap
          </span>
          {proteinGain > 0 && (
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-1.5 text-sm font-semibold uppercase tracking-wider text-emerald-300">
              +{proteinGain.toFixed(0)}g protein
            </span>
          )}
        </div>
      )}

      {/* Card body */}
      <div className="p-5">
        {item.item_state === "keep" ? (
          /* Keep card */
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-2xl text-emerald-300">
                ✓
              </div>
              <div>
                <p className="text-lg font-semibold text-emerald-300">Keep this one.</p>
                <p className="text-base text-zinc-400">
                  {item.coach_note || "You're already winning here. Don't change a thing."}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <MetricBox label="Calories" value={`${item.original_calories}`} />
              <MetricBox label="Protein" value={`${item.original_protein_g}g`} />
            </div>
          </div>
        ) : item.item_state === "open_question" ? (
          /* Open Question card — show swap side-by-side if swap data exists */
          <>
            {item.swap_name && item.swap_calories != null ? (
              /* Has a proposed swap — show side-by-side + question */
              <>
                <div className="mb-3 flex flex-wrap gap-2">
                  {calorieSavings > 0 && (
                    <span className="rounded-full bg-amber-500/15 px-2.5 py-1.5 text-sm font-semibold uppercase tracking-wider text-amber-300">
                      Proposed: -{calorieSavings} cal per swap
                    </span>
                  )}
                </div>
                <div className="grid items-stretch gap-3 xl:grid-cols-[1fr_1fr_280px]">
                  <div className="rounded-2xl border border-rose-500/35 bg-zinc-950/90 p-4">
                    <p className="text-sm font-semibold uppercase tracking-wider text-rose-300">Current</p>
                    <div className="mt-2 mb-3 flex h-[60px] items-center gap-3">
                      {(item.client_photo_url || item.original_image_url) && (
                        <div className="relative h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 transition-transform hover:scale-105" onClick={() => onImageClick?.(item.client_photo_url || item.original_image_url || "")}>
                          <Image src={item.client_photo_url || item.original_image_url || ""} alt={item.original_name} fill className="object-cover" sizes="48px" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-lg font-semibold leading-tight text-white">{item.original_name}</p>
                        {item.original_brand && <p className="text-sm text-zinc-400">{item.original_brand}</p>}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <MetricBox label="Calories" value={`${item.original_calories}`} valueTone="text-rose-300" />
                      <MetricBox label="Protein" value={`${item.original_protein_g}g`} />
                    </div>
                    {item.education_text && (
                      <IngredientList text={item.education_text} tone="rose" diffAgainst={item.swap_education_text || undefined} />
                    )}
                  </div>
                  <div className="rounded-2xl border border-amber-500/35 bg-zinc-950/90 p-4">
                    <p className="text-sm font-semibold uppercase tracking-wider text-amber-300">Proposed Swap</p>
                    <div className="mt-2 mb-3 flex h-[60px] items-center gap-3">
                      {item.swap_image_url ? (
                        <div className="relative h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 transition-transform hover:scale-105" onClick={() => onImageClick?.(item.swap_image_url!)}>
                          <Image src={item.swap_image_url} alt={item.swap_name || ""} fill className="object-cover" sizes="48px" />
                        </div>
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-2xl">
                          🍽️
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-lg font-semibold leading-tight text-white">{item.swap_name}</p>
                        {item.swap_brand && <p className="text-sm text-zinc-400">{item.swap_brand}</p>}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <MetricBox label="Calories" value={`${item.swap_calories ?? "—"}`} valueTone="text-amber-300" />
                      <MetricBox label="Protein" value={`${item.swap_protein_g}g`} />
                    </div>
                    {item.swap_education_text && (
                      <IngredientList text={item.swap_education_text} tone="amber" diffAgainst={item.education_text || undefined} />
                    )}
                    {(item.swap_instacart_url || item.swap_walmart_url) && (
                      <div className="mt-3 flex gap-2">
                        {item.swap_instacart_url && (
                          <a href={item.swap_instacart_url} target="_blank" rel="noreferrer"
                            className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-sm font-semibold uppercase tracking-wider text-amber-300 transition-colors hover:bg-amber-500/20">
                            Shop Instacart
                          </a>
                        )}
                        {item.swap_walmart_url && (
                          <a href={item.swap_walmart_url} target="_blank" rel="noreferrer"
                            className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-sm font-semibold uppercase tracking-wider text-zinc-300 transition-colors hover:border-zinc-500">
                            Shop Walmart
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  <aside className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4">
                    <p className="text-sm font-semibold uppercase tracking-wider text-amber-300">Weekly Impact</p>
                    <p className="mt-1 text-5xl font-black leading-none text-amber-300">
                      <AnimatedValue value={weeklyFatLoss} decimals={2} />
                    </p>
                    <p className="text-base font-medium text-zinc-200">lbs fat / week</p>
                    <p className="mt-3 text-sm uppercase tracking-wider text-zinc-300">Frequency</p>
                    <div className="mt-1 flex items-center gap-2">
                      <button
                        onClick={() => onFrequencyChange(item.frequency_per_week - 1)}
                        className="h-9 w-9 rounded-lg border border-zinc-700 bg-zinc-900 text-lg text-zinc-300 transition-colors hover:border-zinc-500"
                      >-</button>
                      <input
                        type="number" min={1} max={7}
                        value={item.frequency_per_week}
                        onChange={(e) => onFrequencyChange(Number(e.target.value))}
                        className="h-9 w-14 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-center text-base font-semibold text-white outline-none focus:border-amber-500"
                      />
                      <button
                        onClick={() => onFrequencyChange(item.frequency_per_week + 1)}
                        className="h-9 w-9 rounded-lg border border-zinc-700 bg-zinc-900 text-lg text-zinc-300 transition-colors hover:border-zinc-500"
                      >+</button>
                      <p className="text-sm text-zinc-400">times/week</p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {FREQUENCY_CHOICES.map((option) => (
                        <button
                          key={option}
                          onClick={() => onFrequencyChange(option)}
                          className={`rounded-full px-2.5 py-1.5 text-sm font-semibold uppercase tracking-wider transition-colors ${
                            item.frequency_per_week === option
                              ? "bg-amber-500/25 text-amber-200"
                              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                          }`}
                        >
                          {option}x
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 rounded-xl border border-zinc-700/70 bg-zinc-950/70 px-3 py-2">
                      <p className="text-sm uppercase tracking-wider text-zinc-400">Calories Saved / Week</p>
                      <p className="text-3xl font-bold text-amber-300">
                        -<AnimatedValue value={weeklyCalorieSavings} decimals={0} /> cal
                      </p>
                    </div>
                  </aside>
                </div>
                <div className="mt-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.04] p-4">
                  <p className="text-sm font-semibold uppercase tracking-wider text-amber-300">
                    Your coach has a question before confirming
                  </p>
                  <p className="mt-2 text-base text-zinc-300">
                    {item.coach_note || "Is this something you love, or just what's around? That changes what I'd suggest."}
                  </p>
                </div>
              </>
            ) : (
              /* No swap data — just the question */
              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.04] p-4">
                <p className="text-sm font-semibold uppercase tracking-wider text-amber-300">
                  Your coach has a question about this
                </p>
                <p className="mt-2 text-base text-zinc-300">
                  {item.coach_note || "Is this something you love, or just what's around? That changes what I'd suggest."}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <MetricBox label="Calories" value={`${item.original_calories}`} />
                  <MetricBox label="Protein" value={`${item.original_protein_g}g`} />
                </div>
              </div>
            )}
          </>
        ) : item.item_state === "education" ? (
          /* Education card */
          <div className="rounded-2xl border border-blue-500/25 bg-blue-500/[0.04] p-4">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-300">Good to know</p>
            <p className="mt-2 text-base text-zinc-300">
              {item.education_text || item.coach_note || "Here's what you should know about this food."}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <MetricBox label="Calories" value={`${item.original_calories}`} />
              <MetricBox label="Protein" value={`${item.original_protein_g}g`} />
            </div>
          </div>
        ) : (
          /* Swap card (default) */
          <div className="grid gap-3 xl:grid-cols-[1fr_1fr_280px]">
            {/* Original */}
            <div className="rounded-2xl border border-rose-500/35 bg-zinc-950/90 p-4">
              <p className="text-sm font-semibold uppercase tracking-wider text-rose-300">Your Order</p>
              <div className="mt-2 flex items-center gap-3">
                {(item.original_image_url || item.client_photo_url) ? (
                  <div className="relative h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 transition-transform hover:scale-105" onClick={() => onImageClick?.(item.original_image_url || item.client_photo_url || "")}>
                    <Image src={item.original_image_url || item.client_photo_url || ""} alt={item.original_name} fill className="object-cover" sizes="56px" />
                  </div>
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-lg font-bold text-zinc-500">
                    {item.original_name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-white">{item.original_name}</p>
                  {item.original_brand && <p className="truncate text-sm text-zinc-400">{item.original_brand}</p>}
                  {item.original_serving && <p className="truncate text-sm text-zinc-400">{item.original_serving}</p>}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <MetricBox label="Calories" value={`${item.original_calories}`} valueTone="text-rose-300" />
                <MetricBox label="Protein" value={`${item.original_protein_g}g`} />
              </div>
              {item.education_text && (
                <IngredientList text={item.education_text} tone="rose" diffAgainst={item.swap_education_text || undefined} />
              )}
            </div>

            {/* Swap */}
            <div className="rounded-2xl border border-emerald-500/35 bg-zinc-950/90 p-4">
              <p className="text-sm font-semibold uppercase tracking-wider text-emerald-300">Smarter Order</p>
              <div className="mt-2 flex items-center gap-3">
                {item.swap_image_url ? (
                  <div className="relative h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 transition-transform hover:scale-105" onClick={() => onImageClick?.(item.swap_image_url!)}>
                    <Image src={item.swap_image_url} alt={item.swap_name || ""} fill className="object-cover" sizes="56px" />
                  </div>
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-lg font-bold text-zinc-500">
                    {(item.swap_name || "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-white">{item.swap_name || "TBD"}</p>
                  {item.swap_brand && <p className="truncate text-sm text-zinc-400">{item.swap_brand}</p>}
                  {item.swap_serving && <p className="truncate text-sm text-zinc-400">{item.swap_serving}</p>}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <MetricBox label="Calories" value={`${item.swap_calories ?? "—"}`} valueTone="text-emerald-300" />
                <MetricBox label="Protein" value={`${item.swap_protein_g}g`} />
              </div>
              {item.swap_education_text && (
                <IngredientList text={item.swap_education_text} tone="amber" diffAgainst={item.education_text || undefined} />
              )}
              {(item.swap_instacart_url || item.swap_walmart_url) && (
                <div className="mt-3 flex gap-2">
                  {item.swap_instacart_url && (
                    <a
                      href={item.swap_instacart_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-sm font-semibold uppercase tracking-wider text-emerald-300 transition-colors hover:bg-emerald-500/20"
                    >
                      Shop Instacart
                    </a>
                  )}
                  {item.swap_walmart_url && (
                    <a
                      href={item.swap_walmart_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-sm font-semibold uppercase tracking-wider text-zinc-300 transition-colors hover:border-zinc-500"
                    >
                      Shop Walmart
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Impact panel */}
            <aside className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4">
              <p className="text-sm font-semibold uppercase tracking-wider text-emerald-300">Weekly Impact</p>
              <p className="mt-1 text-5xl font-black leading-none text-emerald-300">
                <AnimatedValue value={weeklyFatLoss} decimals={2} />
              </p>
              <p className="text-base font-medium text-zinc-200">lbs fat / week</p>

              <p className="mt-3 text-sm uppercase tracking-wider text-zinc-300">Frequency</p>
              <div className="mt-1 flex items-center gap-2">
                <button
                  onClick={() => onFrequencyChange(item.frequency_per_week - 1)}
                  className="h-9 w-9 rounded-lg border border-zinc-700 bg-zinc-900 text-lg text-zinc-300 transition-colors hover:border-zinc-500"
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={item.frequency_per_week}
                  onChange={(e) => onFrequencyChange(Number(e.target.value))}
                  className="h-9 w-14 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-center text-base font-semibold text-white outline-none focus:border-emerald-500"
                />
                <button
                  onClick={() => onFrequencyChange(item.frequency_per_week + 1)}
                  className="h-9 w-9 rounded-lg border border-zinc-700 bg-zinc-900 text-lg text-zinc-300 transition-colors hover:border-zinc-500"
                >
                  +
                </button>
                <p className="text-sm text-zinc-400">times/week</p>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {FREQUENCY_CHOICES.map((option) => (
                  <button
                    key={option}
                    onClick={() => onFrequencyChange(option)}
                    className={`rounded-full px-2.5 py-1.5 text-sm font-semibold uppercase tracking-wider transition-colors ${
                      item.frequency_per_week === option
                        ? "bg-emerald-500/25 text-emerald-200"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                    }`}
                  >
                    {option}x
                  </button>
                ))}
              </div>

              <div className="mt-3 rounded-xl border border-zinc-700/70 bg-zinc-950/70 px-3 py-2">
                <p className="text-sm uppercase tracking-wider text-zinc-400">Calories Saved / Week</p>
                <p className="text-3xl font-bold text-emerald-300">
                  -<AnimatedValue value={weeklyCalorieSavings} decimals={0} /> cal
                </p>
              </div>
            </aside>
          </div>
        )}

        {/* Coach note (dashboard mode) */}
        {!isRevealMode && item.coach_note && item.item_state === "swap" && (
          <p className="mt-3 text-base text-zinc-300">{item.coach_note}</p>
        )}

        {/* Reveal details toggle (dashboard mode only) */}
        {!isRevealMode && hasExpandableDetails && (
          <button
            onClick={onToggleExpand}
            className="mt-3 text-sm font-semibold uppercase tracking-wider text-zinc-500 transition-colors hover:text-zinc-300"
          >
            {isExpanded ? "Hide details" : "See details"}
          </button>
        )}

        {/* Action buttons */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-3">
          {item.is_approved ? (
            <span className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-sm font-semibold uppercase tracking-wider text-emerald-300">
              Approved
            </span>
          ) : item.item_state === "swap" ? (
            <button
              onClick={onApprove}
              className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-sm font-semibold uppercase tracking-wider text-emerald-300 transition-colors hover:bg-emerald-500/25"
            >
              Approve Swap
            </button>
          ) : item.item_state === "keep" ? (
            <button
              onClick={onApprove}
              className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-sm font-semibold uppercase tracking-wider text-emerald-300 transition-colors hover:bg-emerald-500/25"
            >
              Confirm Keep
            </button>
          ) : item.item_state === "open_question" ? (
            <>
              <button
                onClick={() => onUpdateState({ item_state: "swap", is_approved: 0 })}
                className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-sm font-semibold uppercase tracking-wider text-emerald-300 transition-colors hover:bg-emerald-500/25"
              >
                Convert to Swap
              </button>
              <button
                onClick={() => onUpdateState({ item_state: "keep", is_approved: 1 })}
                className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-sm font-semibold uppercase tracking-wider text-emerald-300 transition-colors hover:bg-emerald-500/25"
              >
                Convert to Keep
              </button>
            </>
          ) : (
            <button
              onClick={onApprove}
              className="rounded-lg bg-blue-500/15 px-3 py-1.5 text-sm font-semibold uppercase tracking-wider text-blue-300 transition-colors hover:bg-blue-500/25"
            >
              Acknowledged
            </button>
          )}
          <button
            onClick={onEdit}
            className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm font-semibold uppercase tracking-wider text-zinc-400 transition-colors hover:bg-amber-500/15 hover:text-amber-300"
          >
            Edit
          </button>
          <button
            onClick={() => setShowEditSwap(!showEditSwap)}
            className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm font-semibold uppercase tracking-wider text-zinc-400 transition-colors hover:bg-emerald-500/15 hover:text-emerald-300"
          >
            {showEditSwap ? "Close Swaps" : "Edit Swap"}
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm font-semibold uppercase tracking-wider text-zinc-400 transition-colors hover:bg-rose-500/15 hover:text-rose-300"
          >
            Remove
          </button>
          {item.client_context && (
            <span className="ml-auto text-sm text-zinc-500">
              {item.client_context}
            </span>
          )}
        </div>

        {/* Edit Swap Panel */}
        {showEditSwap && (
          <div className="mt-3 rounded-xl border border-emerald-500/20 bg-zinc-950/80 p-4">
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-300">Change Swap</p>

            {/* Saved Suggestions */}
            {savedSwaps.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Saved Suggestions</p>
                <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
                  {savedSwaps.map((swap, i) => (
                    <div
                      key={i}
                      className="min-w-[180px] shrink-0 rounded-xl border border-zinc-700 bg-zinc-900/80 p-3"
                    >
                      <p className="text-sm font-semibold text-white truncate">{swap.name}</p>
                      {swap.brand && <p className="text-xs text-zinc-400 truncate">{swap.brand}</p>}
                      <div className="mt-2 flex gap-3 text-xs text-zinc-400">
                        <span>{swap.calories} cal</span>
                        <span>{swap.protein_g}g P</span>
                      </div>
                      {swap.calorie_savings > 0 && (
                        <p className="mt-1 text-xs font-semibold text-emerald-400">-{swap.calorie_savings} cal saved</p>
                      )}
                      <button
                        onClick={() => applySwap(swap)}
                        className="mt-2 w-full rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-black transition-colors hover:bg-emerald-400"
                      >
                        Use This
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search for New Swaps */}
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Search for New Swaps</p>
              <input
                type="text"
                placeholder="e.g. quest pizza frozen, protein chips..."
                value={swapSearchQuery}
                onChange={(e) => setSwapSearchQuery(e.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-base text-white placeholder-zinc-500 outline-none focus:border-emerald-500"
              />
            </div>

            {/* Search Results */}
            {swapSearchLoading && (
              <p className="mt-3 text-sm text-zinc-500">Searching...</p>
            )}
            {!swapSearchLoading && swapSearchResults.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Results</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {swapSearchResults.map((swap, i) => (
                    <div
                      key={i}
                      className="min-w-[180px] flex-1 rounded-xl border border-zinc-700 bg-zinc-900/80 p-3"
                    >
                      <p className="text-sm font-semibold text-white truncate">{swap.name}</p>
                      {swap.brand && <p className="text-xs text-zinc-400 truncate">{swap.brand}</p>}
                      <div className="mt-2 flex gap-3 text-xs text-zinc-400">
                        <span>{swap.calories} cal</span>
                        <span>{swap.protein_g}g P</span>
                        <span>{swap.carbs_g}g C</span>
                        <span>{swap.fat_g}g F</span>
                      </div>
                      {swap.has_personal_size === true && (
                        <p className="mt-1.5 text-[11px] font-medium text-emerald-400">&#x1F4E6; Personal size</p>
                      )}
                      {swap.has_personal_size === false && (
                        <p className="mt-1.5 text-[11px] font-medium text-amber-400">&#x26A0;&#xFE0F; Bulk only &mdash; portion carefully</p>
                      )}
                      <button
                        onClick={() => applySwap(swap)}
                        className="mt-2 w-full rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-black transition-colors hover:bg-emerald-400"
                      >
                        Use This
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!swapSearchLoading && swapSearchQuery.trim() && swapSearchResults.length === 0 && (
              <p className="mt-3 text-sm text-zinc-500">No results found.</p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

/* ─── Shared Components ─── */

function StickyMetric({
  label,
  value,
  suffix,
  decimals,
}: {
  label: string;
  value: number;
  suffix: string;
  decimals: number;
}) {
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-2.5">
      <p className="text-sm uppercase tracking-wider text-zinc-400">{label}</p>
      <p className="text-3xl font-bold text-emerald-300">
        <AnimatedValue value={value} decimals={decimals} /> {suffix}
      </p>
    </div>
  );
}

function MetricBox({
  label,
  value,
  valueTone = "text-zinc-100",
}: {
  label: string;
  value: string;
  valueTone?: string;
}) {
  return (
    <div className="rounded-xl bg-zinc-900 px-3 py-2">
      <p className="text-sm uppercase tracking-wider text-zinc-400">{label}</p>
      <p className={`text-2xl font-bold leading-none ${valueTone}`}>{value}</p>
    </div>
  );
}

function parseIngredients(text: string) {
  return text.split("\n").filter(Boolean).map((line) => {
    const parts = line.split(":");
    const ingredient = parts[0]?.trim() || line;
    const calStr = parts.slice(1).join(":").trim();
    const calNum = parseInt(calStr) || 0;
    // Extract just the base name without portion for comparison
    const baseName = ingredient.replace(/\(.*?\)/g, "").trim().toLowerCase();
    return { ingredient, calStr, calNum, baseName };
  }).sort((a, b) => b.calNum - a.calNum);
}

function IngredientList({ text, tone = "zinc", diffAgainst }: {
  text: string;
  tone?: "zinc" | "emerald" | "amber" | "rose";
  diffAgainst?: string; // The OTHER side's education_text — for color-coding changes
}) {
  const toneMap = {
    zinc: { text: "text-zinc-300", cal: "text-zinc-400" },
    emerald: { text: "text-emerald-300", cal: "text-emerald-400" },
    amber: { text: "text-amber-300", cal: "text-amber-400" },
    rose: { text: "text-rose-300", cal: "text-rose-400" },
  };
  const defaultColors = toneMap[tone] || toneMap.zinc;
  const parsed = parseIngredients(text);

  // If diffAgainst is provided, compute which ingredients are kept vs changed
  const otherBaseNames = diffAgainst
    ? new Set(parseIngredients(diffAgainst).map((i) => i.baseName))
    : null;

  return (
    <div className="mt-3 space-y-1">
      {parsed.map((item, i) => {
        let textColor = defaultColors.text;
        let calColor = defaultColors.cal;

        if (otherBaseNames) {
          if (otherBaseNames.has(item.baseName)) {
            // UNCHANGED — same ingredient on both sides → white
            textColor = "text-zinc-300";
            calColor = "text-zinc-400";
          } else if (tone === "rose") {
            // Original side: ingredient NOT in swap → RED (removed)
            textColor = "text-rose-400";
            calColor = "text-rose-400";
          } else {
            // Swap side: ingredient NOT in original → AMBER/YELLOW (proposed new)
            textColor = "text-amber-300";
            calColor = "text-amber-300";
          }
        }

        return (
          <div key={i} className="flex items-center justify-between rounded-lg bg-zinc-900/80 px-3 py-1.5">
            <span className={`text-sm ${textColor}`}>{item.ingredient}</span>
            <span className={`text-sm font-semibold ${calColor}`}>{item.calStr}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Builder Panel ─── */

interface SuggestedSwap {
  name: string;
  brand: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  serving: string | null;
  calorie_savings: number;
  source: string;
  has_personal_size?: boolean | null;
}

interface BuilderFormState {
  images: string[];
  selectedPhotoIndex: number;
  clientComment: string;
  commentDate: string;
  category: string;
  whyTheyEatIt: string;
  foodName: string;
  brand: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  serving: string;
  ingredientBreakdown: string;
  coachAnalysis: string;
  coachPrompt: string;
  swapName: string;
  swapBrand: string;
  swapCalories: string;
  swapProtein: string;
  swapCarbs: string;
  swapFat: string;
  swapServing: string;
}

const EMPTY_BUILDER_FORM: BuilderFormState = {
  images: [],
  selectedPhotoIndex: 0,
  clientComment: "",
  commentDate: "",
  category: "at_home",
  whyTheyEatIt: "convenience",
  foodName: "",
  brand: "",
  calories: "",
  protein: "0",
  carbs: "0",
  fat: "0",
  serving: "",
  ingredientBreakdown: "",
  coachAnalysis: "",
  coachPrompt: "",
  swapName: "",
  swapBrand: "",
  swapCalories: "",
  swapProtein: "0",
  swapCarbs: "0",
  swapFat: "0",
  swapServing: "",
};

function BuilderPanel({
  slug,
  editingItemId,
  onItemAdded,
  onEditComplete,
}: {
  slug: string;
  editingItemId: number | null;
  onItemAdded: () => void;
  onEditComplete: () => void;
}) {
  const [form, setForm] = useState<BuilderFormState>({ ...EMPTY_BUILDER_FORM });
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  // Listen for item load events (when Edit is clicked on a card)
  useEffect(() => {
    function handleLoadItem(e: Event) {
      const item = (e as CustomEvent).detail as EcosystemItem;
      setForm({
        images: item.client_photo_url ? [item.client_photo_url] : [],
        selectedPhotoIndex: 0,
        clientComment: item.client_comment || "",
        commentDate: item.comment_date || "",
        category: item.category,
        whyTheyEatIt: item.why_they_eat_it || "convenience",
        foodName: item.original_name,
        brand: item.original_brand || "",
        calories: String(item.original_calories),
        protein: String(item.original_protein_g),
        carbs: String(item.original_carbs_g),
        fat: String(item.original_fat_g),
        serving: item.original_serving || "",
        ingredientBreakdown: item.education_text || "",
        coachAnalysis: item.coach_analysis || "",
        coachPrompt: "",
        swapName: item.swap_name || "",
        swapBrand: item.swap_brand || "",
        swapCalories: item.swap_calories != null ? String(item.swap_calories) : "",
        swapProtein: String(item.swap_protein_g || 0),
        swapCarbs: String(item.swap_carbs_g || 0),
        swapFat: String(item.swap_fat_g || 0),
        swapServing: item.swap_serving || "",
      });
      if (item.education_text) setShowIngredients(true);
      if (item.swap_name) setShowSwapFields(true);
      setLastSavedState(null);
      // Restore suggested swaps if saved
      if (item.suggested_swaps_json) {
        try {
          setSuggestedSwaps(JSON.parse(item.suggested_swaps_json));
        } catch {
          setSuggestedSwaps([]);
        }
      } else {
        setSuggestedSwaps([]);
      }
    }
    window.addEventListener("loadItemIntoBuilder", handleLoadItem);
    return () => window.removeEventListener("loadItemIntoBuilder", handleLoadItem);
  }, []);
  const [sessionCount, setSessionCount] = useState(0);
  const [sessionCalSaved, setSessionCalSaved] = useState(0);
  const [showIngredients, setShowIngredients] = useState(false);
  const [showSwapFields, setShowSwapFields] = useState(false);
  const [swapSearchQuery, setSwapSearchQuery] = useState("");
  const [swapSearchResults, setSwapSearchResults] = useState<SuggestedSwap[]>([]);
  const [swapSearchLoading, setSwapSearchLoading] = useState(false);

  // Debounced swap search
  useEffect(() => {
    const q = swapSearchQuery.trim();
    if (q.length < 2) { setSwapSearchResults([]); return; }
    const timeout = setTimeout(async () => {
      setSwapSearchLoading(true);
      try {
        const calParam = form.calories ? `&original_cal=${encodeURIComponent(form.calories)}` : "";
        const resp = await fetch(`/api/ecosystem/semantic-search?q=${encodeURIComponent(q)}&swaps_only=true&limit=8${calParam}`);
        if (resp.ok) {
          const data = await resp.json();
          const results = Array.isArray(data) ? data : (data.results || []);
          setSwapSearchResults(results);
        }
      } catch { /* ignore */ } finally { setSwapSearchLoading(false); }
    }, 300);
    return () => clearTimeout(timeout);
  }, [swapSearchQuery, form.calories]);
  const [lastSavedState, setLastSavedState] = useState<string | null>(null);
  const [suggestedSwaps, setSuggestedSwaps] = useState<SuggestedSwap[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function updateField<K extends keyof BuilderFormState>(key: K, value: BuilderFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newImages: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const dataUrl = await readFileAsDataURL(files[i]);
      newImages.push(dataUrl);
    }
    setForm((prev) => ({ ...prev, images: [...prev.images, ...newImages] }));
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    const newImages: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;
      const dataUrl = await readFileAsDataURL(file);
      newImages.push(dataUrl);
    }
    if (newImages.length > 0) {
      setForm((prev) => ({ ...prev, images: [...prev.images, ...newImages] }));
    }
  }

  function removeImage(index: number) {
    setForm((prev) => {
      const updated = prev.images.filter((_, i) => i !== index);
      let newSelected = prev.selectedPhotoIndex;
      if (index === prev.selectedPhotoIndex) {
        newSelected = 0;
      } else if (index < prev.selectedPhotoIndex) {
        newSelected = prev.selectedPhotoIndex - 1;
      }
      if (newSelected >= updated.length) newSelected = Math.max(0, updated.length - 1);
      return { ...prev, images: updated, selectedPhotoIndex: newSelected };
    });
  }

  async function extractWithAI() {
    if (form.images.length === 0) return;
    setExtracting(true);
    setExtractError(null);
    setSuggestedSwaps([]);
    try {
      const response = await fetch("/api/ecosystem/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: form.images, coach_prompt: form.coachPrompt || undefined }),
      });
      if (!response.ok) throw new Error("Extraction failed");
      const data = await response.json();
      setForm((prev) => ({
        ...prev,
        foodName: data.food_name ?? prev.foodName,
        clientComment: data.client_comment ?? prev.clientComment,
        commentDate: data.comment_date ?? prev.commentDate,
        calories: data.estimated_calories != null ? String(data.estimated_calories) : prev.calories,
        protein: data.estimated_protein_g != null ? String(data.estimated_protein_g) : prev.protein,
        carbs: data.estimated_carbs_g != null ? String(data.estimated_carbs_g) : prev.carbs,
        fat: data.estimated_fat_g != null ? String(data.estimated_fat_g) : prev.fat,
        serving: data.serving_size ?? prev.serving,
        ingredientBreakdown: data.ingredient_breakdown ?? prev.ingredientBreakdown,
        category: data.category_suggestion ?? prev.category,
        whyTheyEatIt: data.why_they_eat_it ?? prev.whyTheyEatIt,
        coachAnalysis: data.coach_analysis ?? prev.coachAnalysis,
        selectedPhotoIndex: data.food_photo_index != null ? data.food_photo_index : prev.selectedPhotoIndex,
      }));
      if (data.ingredient_breakdown) {
        setShowIngredients(true);
      }
      if (data.suggested_swaps && Array.isArray(data.suggested_swaps) && data.suggested_swaps.length > 0) {
        setSuggestedSwaps(data.suggested_swaps);
      }
    } catch {
      setExtractError("AI extraction failed. You can still fill the form manually.");
    } finally {
      setExtracting(false);
    }
  }

  function clearForm() {
    setForm({ ...EMPTY_BUILDER_FORM });
    setShowSwapFields(false);
    setShowIngredients(false);
    setLastSavedState(null);
    setSuggestedSwaps([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function saveItem(itemState: string) {
    if (!form.foodName.trim() || !form.calories) return;

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        category: form.category,
        item_state: itemState,
        original_name: form.foodName.trim(),
        original_brand: form.brand.trim() || null,
        original_calories: Number(form.calories),
        original_protein_g: Number(form.protein) || 0,
        original_carbs_g: Number(form.carbs) || 0,
        original_fat_g: Number(form.fat) || 0,
        original_serving: form.serving.trim() || null,
        client_photo_url: form.images[form.selectedPhotoIndex] || null,
        client_comment: form.clientComment.trim() || null,
        comment_date: form.commentDate.trim() || null,
        why_they_eat_it: form.whyTheyEatIt || null,
        coach_analysis: form.coachAnalysis.trim() || null,
        education_text: form.ingredientBreakdown.trim() || null,
        suggested_swaps_json: suggestedSwaps.length > 0 ? JSON.stringify(suggestedSwaps) : null,
        frequency_per_week: 3,
      };

      // Always save swap data if present — even for open_question (proposed swap)
      if (form.swapName.trim()) {
        body.swap_name = form.swapName.trim();
        body.swap_brand = form.swapBrand.trim() || null;
        body.swap_calories = form.swapCalories ? Number(form.swapCalories) : null;
        body.swap_protein_g = Number(form.swapProtein) || 0;
        body.swap_carbs_g = Number(form.swapCarbs) || 0;
        body.swap_fat_g = Number(form.swapFat) || 0;
        body.swap_serving = form.swapServing.trim() || null;
      }

      let response: Response;
      if (editingItemId) {
        // PATCH existing item
        response = await fetch(`/api/ecosystem/${slug}/items/${editingItemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        // POST new item
        response = await fetch(`/api/ecosystem/${slug}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error((errData as Record<string, string>).error || `HTTP ${response.status}`);
      }

      // Track session stats
      if (!editingItemId) {
        const calSaved =
          itemState === "swap" && form.swapCalories
            ? Math.max(0, Number(form.calories) - Number(form.swapCalories)) * 3
            : 0;
        setSessionCount((prev) => prev + 1);
        setSessionCalSaved((prev) => prev + calSaved);
      }
      setLastSavedState(editingItemId ? "updated" : itemState);

      onItemAdded();
      if (editingItemId) {
        onEditComplete();
      }
      clearForm();
    } catch (err) {
      setExtractError(`Save failed: ${err instanceof Error ? err.message : "Unknown error"}. Check browser console.`);
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-base text-white placeholder-zinc-500 outline-none transition-colors focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30";
  const labelClass = "mb-1 block text-sm font-semibold uppercase tracking-wider text-zinc-400";
  const selectClass =
    "w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-base text-white outline-none transition-colors focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30";

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-zinc-900/80 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold uppercase tracking-wider text-amber-300">
          {editingItemId ? "Editing Item" : "Builder Mode"}
        </h3>
        {sessionCount > 0 && (
          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <span>
              Items added: <span className="font-bold text-white">{sessionCount}</span>
            </span>
            {sessionCalSaved > 0 && (
              <span>
                Running savings:{" "}
                <span className="font-bold text-emerald-300">{sessionCalSaved} cal/week</span>
              </span>
            )}
          </div>
        )}
      </div>

      {lastSavedState && (
        <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
          Saved as {lastSavedState.replace("_", " ")}. Form cleared for next item.
        </div>
      )}

      {/* 1. Image Upload Zone */}
      <div className="mb-5">
        <label className={labelClass}>Trainerize Photos</label>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-950/60 px-4 py-6 transition-colors hover:border-zinc-500"
        >
          {form.images.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {form.images.map((img, idx) => (
                <div
                  key={idx}
                  className={`relative rounded-lg border-2 ${
                    idx === form.selectedPhotoIndex
                      ? "border-emerald-400"
                      : "border-transparent"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateField("selectedPhotoIndex", idx);
                  }}
                >
                  <img
                    src={img}
                    alt={`Photo ${idx + 1}`}
                    className="h-[120px] w-[120px] rounded-lg object-cover"
                  />
                  {idx === form.selectedPhotoIndex && (
                    <span className="absolute bottom-1 left-1 rounded bg-emerald-500/90 px-1.5 py-0.5 text-[10px] font-bold uppercase text-black">
                      Hero
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(idx);
                    }}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-xs text-zinc-400 shadow hover:bg-rose-500/80 hover:text-white"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center">
              <p className="text-base text-zinc-400">Drop images here or click to upload</p>
              <p className="mt-1 text-sm text-zinc-600">From Trainerize food photos (multiple OK)</p>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          className="hidden"
        />
        {form.images.length > 0 && (
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-zinc-500 hover:text-zinc-300"
            >
              + Add more images
            </button>
            <button
              onClick={() => {
                setForm((prev) => ({ ...prev, images: [], selectedPhotoIndex: 0 }));
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="text-sm text-zinc-500 hover:text-zinc-300"
            >
              Remove all
            </button>
          </div>
        )}
        {/* Coach's Prompt */}
        {form.images.length > 0 && (
          <div className="mt-3">
            <label className={labelClass}>Coach&apos;s instructions to AI (optional)</label>
            <textarea
              value={form.coachPrompt}
              onChange={(e) => updateField("coachPrompt", e.target.value)}
              placeholder='e.g., "This is Chinese takeout. Search Panda Express for similar options."'
              rows={2}
              className={inputClass + " resize-none"}
            />
          </div>
        )}
        {/* AI Extract Button */}
        {form.images.length > 0 && (
          <div className="mt-3">
            <button
              disabled={extracting}
              onClick={extractWithAI}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold uppercase tracking-wider text-amber-300 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
            >
              {extracting ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" />
                  Analyzing images...
                </>
              ) : (
                <>&#10024; Extract with AI</>
              )}
            </button>
            {extractError && (
              <p className="mt-2 text-sm text-rose-400">{extractError}</p>
            )}
          </div>
        )}

        {/* Suggested Swaps */}
        {suggestedSwaps.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-emerald-400">
              Suggested Swaps (from your database)
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {suggestedSwaps.map((swap, idx) => (
                <div
                  key={idx}
                  className="min-w-[200px] flex-shrink-0 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] p-4"
                >
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                    {swap.brand}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">{swap.name}</p>
                  <p className="mt-1 text-sm text-zinc-300">
                    {swap.calories} cal &middot; {swap.protein_g}g protein
                  </p>
                  {swap.calorie_savings > 0 && (
                    <p className="mt-1 text-sm font-semibold text-emerald-300">
                      Saves {swap.calorie_savings} cal
                    </p>
                  )}
                  <button
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        swapName: swap.name,
                        swapBrand: swap.brand,
                        swapCalories: String(swap.calories),
                        swapProtein: String(swap.protein_g),
                        swapCarbs: String(swap.carbs_g),
                        swapFat: String(swap.fat_g),
                        swapServing: swap.serving ?? "",
                      }));
                      setShowSwapFields(true);
                      setSuggestedSwaps([]);
                    }}
                    className="mt-3 w-full rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold uppercase tracking-wider text-black"
                  >
                    Use This Swap
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Search Swap Database */}
      <div className="mb-5">
        <label className={labelClass}>Search swap database</label>
        <input
          type="text"
          placeholder="Search all snacks, takeout meals, grocery items..."
          value={swapSearchQuery}
          onChange={(e) => setSwapSearchQuery(e.target.value)}
          className={inputClass}
        />
        {swapSearchLoading && <p className="mt-2 text-sm text-zinc-500">Searching...</p>}
        {swapSearchResults.length > 0 && (
          <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
            {swapSearchResults.map((s, i) => (
              <div key={i} className="min-w-[180px] shrink-0 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] p-3">
                <p className="text-xs text-zinc-400">{s.brand}</p>
                <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                <p className="mt-1 text-xs text-zinc-400">{s.calories} cal · {s.protein_g}g protein</p>
                {s.has_personal_size === true && (
                  <p className="mt-1 text-[11px] font-medium text-emerald-400">&#x1F4E6; Personal size</p>
                )}
                {s.has_personal_size === false && (
                  <p className="mt-1 text-[11px] font-medium text-amber-400">&#x26A0;&#xFE0F; Bulk only &mdash; portion carefully</p>
                )}
                <button
                  onClick={() => {
                    setForm((prev) => ({
                      ...prev,
                      swapName: s.name,
                      swapBrand: s.brand,
                      swapCalories: String(s.calories),
                      swapProtein: String(s.protein_g),
                      swapCarbs: String(s.carbs_g),
                      swapFat: String(s.fat_g),
                      swapServing: s.serving ?? "",
                    }));
                    setShowSwapFields(true);
                    setSwapSearchQuery("");
                    setSwapSearchResults([]);
                  }}
                  className="mt-2 w-full rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold uppercase tracking-wider text-black"
                >
                  Use This Swap
                </button>
              </div>
            ))}
          </div>
        )}
        {swapSearchQuery.length >= 2 && !swapSearchLoading && swapSearchResults.length === 0 && (
          <p className="mt-2 text-sm text-zinc-500">No results found.</p>
        )}
      </div>

      {/* 2. Context Fields */}
      <div className="mb-5 grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className={labelClass}>Client&apos;s Comment</label>
          <textarea
            value={form.clientComment}
            onChange={(e) => updateField("clientComment", e.target.value)}
            placeholder='e.g., "Coffee with tablespoon of heavy cream at 60 cal"'
            rows={2}
            className={inputClass + " resize-none"}
          />
        </div>
        <div>
          <label className={labelClass}>Date</label>
          <input
            type="text"
            value={form.commentDate}
            onChange={(e) => updateField("commentDate", e.target.value)}
            placeholder="e.g., Feb 8"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Category</label>
          <select
            value={form.category}
            onChange={(e) => updateField("category", e.target.value)}
            className={selectClass}
          >
            <option value="ordering_out">Ordering Out</option>
            <option value="snack">Snacks</option>
            <option value="at_home">At Home</option>
            <option value="dining_out">Dining Out</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Why They Eat It</label>
          <select
            value={form.whyTheyEatIt}
            onChange={(e) => updateField("whyTheyEatIt", e.target.value)}
            className={selectClass}
          >
            <option value="convenience">Convenience</option>
            <option value="love">Love</option>
            <option value="habit">Habit</option>
            <option value="social">Social</option>
            <option value="craving">Craving</option>
          </select>
        </div>
      </div>

      {/* 3. Food Details */}
      <div className="mb-5">
        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-300">
          Food Details
        </h4>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="md:col-span-2">
            <label className={labelClass}>Food Name</label>
            <input
              type="text"
              value={form.foodName}
              onChange={(e) => updateField("foodName", e.target.value)}
              placeholder="e.g., Coffee with Heavy Cream"
              className={inputClass}
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Brand / Restaurant</label>
            <input
              type="text"
              value={form.brand}
              onChange={(e) => updateField("brand", e.target.value)}
              placeholder='e.g., "Home" or "Panda Express"'
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Calories</label>
            <input
              type="number"
              value={form.calories}
              onChange={(e) => updateField("calories", e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Protein (g)</label>
            <input
              type="number"
              value={form.protein}
              onChange={(e) => updateField("protein", e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Carbs (g)</label>
            <input
              type="number"
              value={form.carbs}
              onChange={(e) => updateField("carbs", e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Fat (g)</label>
            <input
              type="number"
              value={form.fat}
              onChange={(e) => updateField("fat", e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </div>
          <div className="md:col-span-2 lg:col-span-4">
            <label className={labelClass}>Serving Size</label>
            <input
              type="text"
              value={form.serving}
              onChange={(e) => updateField("serving", e.target.value)}
              placeholder="e.g., 1 cup + 1 tbsp cream"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* 4. Ingredient Breakdown (expandable) */}
      <div className="mb-5">
        <button
          onClick={() => setShowIngredients(!showIngredients)}
          className="text-sm font-semibold uppercase tracking-wider text-zinc-500 transition-colors hover:text-zinc-300"
        >
          {showIngredients ? "- Hide" : "+ Show"} Ingredient Breakdown
        </button>
        {showIngredients && (
          <div className="mt-2">
            <textarea
              value={form.ingredientBreakdown}
              onChange={(e) => updateField("ingredientBreakdown", e.target.value)}
              placeholder={"Black coffee: 5 cal\nHeavy cream (1 tbsp): 52 cal"}
              rows={4}
              className={inputClass + " resize-none font-mono text-sm"}
            />
            <p className="mt-1 text-xs text-zinc-600">Saved as education_text on the item.</p>
          </div>
        )}
      </div>

      {/* 5. Coach's Analysis */}
      <div className="mb-5">
        <label className={labelClass}>Coach&apos;s Analysis</label>
        <textarea
          value={form.coachAnalysis}
          onChange={(e) => updateField("coachAnalysis", e.target.value)}
          placeholder="e.g., I don't know how much you love this. If the cream is your favorite part of the morning, we keep it."
          rows={3}
          className={inputClass + " resize-none"}
        />
      </div>

      {/* 6. Swap Section (toggle) */}
      <div className="mb-5">
        <button
          onClick={() => setShowSwapFields(!showSwapFields)}
          className="text-sm font-semibold uppercase tracking-wider text-emerald-400 transition-colors hover:text-emerald-300"
        >
          {showSwapFields ? "- Hide" : "+ Show"} Swap Details
        </button>
        {showSwapFields && (
          <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
            {/* Search for swaps */}
            <div className="mb-4">
              <label className={labelClass}>Search for a swap</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g., spicy protein pretzel, quest pizza, sugar free creamer..."
                  value={swapSearchQuery}
                  onChange={(e) => setSwapSearchQuery(e.target.value)}
                  className={inputClass}
                />
              </div>
              {swapSearchLoading && <p className="mt-2 text-sm text-zinc-500">Searching...</p>}
              {swapSearchResults.length > 0 && (
                <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
                  {swapSearchResults.map((s, i) => (
                    <div key={i} className="min-w-[180px] shrink-0 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] p-3">
                      <p className="text-xs text-zinc-400">{s.brand}</p>
                      <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                      <p className="mt-1 text-xs text-zinc-400">{s.calories} cal · {s.protein_g}g protein</p>
                      {s.has_personal_size === true && (
                        <p className="mt-1 text-[11px] font-medium text-emerald-400">&#x1F4E6; Personal size</p>
                      )}
                      {s.has_personal_size === false && (
                        <p className="mt-1 text-[11px] font-medium text-amber-400">&#x26A0;&#xFE0F; Bulk only &mdash; portion carefully</p>
                      )}
                      <button
                        onClick={() => {
                          setForm((prev) => ({
                            ...prev,
                            swapName: s.name,
                            swapBrand: s.brand,
                            swapCalories: String(s.calories),
                            swapProtein: String(s.protein_g),
                            swapCarbs: String(s.carbs_g),
                            swapFat: String(s.fat_g),
                            swapServing: s.serving ?? "",
                          }));
                          setSwapSearchQuery("");
                          setSwapSearchResults([]);
                        }}
                        className="mt-2 w-full rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold uppercase tracking-wider text-black"
                      >
                        Use This
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {swapSearchQuery.length >= 2 && !swapSearchLoading && swapSearchResults.length === 0 && (
                <p className="mt-2 text-sm text-zinc-500">No results found.</p>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="md:col-span-2">
                <label className={labelClass}>Swap Name</label>
                <input
                  type="text"
                  value={form.swapName}
                  onChange={(e) => updateField("swapName", e.target.value)}
                  placeholder="e.g., Coffee with Oat Milk"
                  className={inputClass}
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Swap Brand</label>
                <input
                  type="text"
                  value={form.swapBrand}
                  onChange={(e) => updateField("swapBrand", e.target.value)}
                  placeholder="e.g., Home"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Calories</label>
                <input
                  type="number"
                  value={form.swapCalories}
                  onChange={(e) => updateField("swapCalories", e.target.value)}
                  placeholder="0"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Protein (g)</label>
                <input
                  type="number"
                  value={form.swapProtein}
                  onChange={(e) => updateField("swapProtein", e.target.value)}
                  placeholder="0"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Carbs (g)</label>
                <input
                  type="number"
                  value={form.swapCarbs}
                  onChange={(e) => updateField("swapCarbs", e.target.value)}
                  placeholder="0"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Fat (g)</label>
                <input
                  type="number"
                  value={form.swapFat}
                  onChange={(e) => updateField("swapFat", e.target.value)}
                  placeholder="0"
                  className={inputClass}
                />
              </div>
              <div className="md:col-span-2 lg:col-span-4">
                <label className={labelClass}>Swap Serving</label>
                <input
                  type="text"
                  value={form.swapServing}
                  onChange={(e) => updateField("swapServing", e.target.value)}
                  placeholder="e.g., 1 cup + splash oat milk"
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 7. Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          disabled={saving || !form.foodName.trim() || !form.calories}
          onClick={() => {
            setShowSwapFields(true);
            saveItem("swap");
          }}
          className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold uppercase tracking-wider text-black transition-colors hover:bg-emerald-400 disabled:opacity-40"
        >
          {saving ? "Saving..." : "Save as Swap"}
        </button>
        <button
          disabled={saving || !form.foodName.trim() || !form.calories}
          onClick={() => saveItem("keep")}
          className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 text-sm font-semibold uppercase tracking-wider text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:opacity-40"
        >
          {saving ? "Saving..." : "Save as Keep"}
        </button>
        <button
          disabled={saving || !form.foodName.trim() || !form.calories}
          onClick={() => saveItem("open_question")}
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-5 py-3 text-sm font-semibold uppercase tracking-wider text-amber-300 transition-colors hover:bg-amber-500/20 disabled:opacity-40"
        >
          {saving ? "Saving..." : "Save as Open Question"}
        </button>
        <button
          onClick={clearForm}
          className="rounded-xl border border-zinc-700 bg-zinc-800 px-5 py-3 text-sm font-semibold uppercase tracking-wider text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
        >
          Clear Form
        </button>
      </div>
    </div>
  );
}
