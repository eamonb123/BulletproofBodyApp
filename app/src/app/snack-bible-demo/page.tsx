"use client";

import { Suspense, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion, useSpring, useTransform } from "framer-motion";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

// ─── Types ───────────────────────────────────────
interface SnackItem {
  id: string;
  name: string;
  brand: string;
  calories: number;
  protein: number;
  sugar: number;
  carbs: number;
  fat: number;
  serving: string;
  image_url: string | null;
  instacart_url: string;
  walmart_url: string;
}

interface SnackSwapPair {
  id: string;
  title: string;
  context: string;
  craving: string;
  rationale: string;
  original: SnackItem;
  swap: SnackItem;
}

type FlowState = "compare" | "weight" | "projection" | "dashboard";

// ─── Brand data for tutorial (mirrors landing page) ───
interface TutorialBrand {
  id: string;
  name: string;
  category: string;
  calories: number; // realistic typical serving
}

const TUTORIAL_BRANDS: Record<string, TutorialBrand> = {
  doritos: { id: "doritos", name: "Doritos", category: "chips", calories: 280 },
  cheetos: { id: "cheetos", name: "Cheetos", category: "chips", calories: 320 },
  lays: { id: "lays", name: "Lay's", category: "chips", calories: 240 },
  pringles: { id: "pringles", name: "Pringles", category: "chips", calories: 260 },
  tostitos: { id: "tostitos", name: "Tostitos", category: "chips", calories: 280 },
  goldfish: { id: "goldfish", name: "Goldfish", category: "chips", calories: 250 },
  cheezit: { id: "cheezit", name: "Cheez-It", category: "chips", calories: 310 },
  ruffles: { id: "ruffles", name: "Ruffles", category: "chips", calories: 300 },
  takis: { id: "takis", name: "Takis", category: "chips", calories: 290 },
  sunchips: { id: "sunchips", name: "SunChips", category: "chips", calories: 210 },
  reeses: { id: "reeses", name: "Reese's", category: "candy", calories: 340 },
  snickers: { id: "snickers", name: "Snickers", category: "candy", calories: 450 },
  mms: { id: "mms", name: "M&M's", category: "candy", calories: 480 },
  kitkat: { id: "kitkat", name: "Kit Kat", category: "candy", calories: 280 },
  twix: { id: "twix", name: "Twix", category: "candy", calories: 380 },
  hersheys: { id: "hersheys", name: "Hershey's", category: "candy", calories: 380 },
  skittles: { id: "skittles", name: "Skittles", category: "candy", calories: 400 },
  sourpatchkids: { id: "sourpatchkids", name: "Sour Patch Kids", category: "candy", calories: 390 },
  oreo: { id: "oreo", name: "Oreo", category: "cookies", calories: 320 },
  chipsahoy: { id: "chipsahoy", name: "Chips Ahoy", category: "cookies", calories: 300 },
  nutterbutter: { id: "nutterbutter", name: "Nutter Butter", category: "cookies", calories: 290 },
  girlscoutcookies: { id: "girlscoutcookies", name: "Girl Scout Cookies", category: "cookies", calories: 280 },
  benjerrys: { id: "benjerrys", name: "Ben & Jerry's", category: "icecream", calories: 520 },
  haagendazs: { id: "haagendazs", name: "Häagen-Dazs", category: "icecream", calories: 540 },
  talenti: { id: "talenti", name: "Talenti", category: "icecream", calories: 480 },
  drumstick: { id: "drumstick", name: "Drumstick", category: "icecream", calories: 360 },
  poptarts: { id: "poptarts", name: "Pop-Tarts", category: "baked", calories: 380 },
  littledebbie: { id: "littledebbie", name: "Little Debbie", category: "baked", calories: 340 },
  hostess: { id: "hostess", name: "Hostess", category: "baked", calories: 350 },
  entenmanns: { id: "entenmanns", name: "Entenmann's", category: "baked", calories: 370 },
  frostedflakes: { id: "frostedflakes", name: "Frosted Flakes", category: "cereal", calories: 280 },
  luckycharms: { id: "luckycharms", name: "Lucky Charms", category: "cereal", calories: 290 },
  cinnamontoastcrunch: { id: "cinnamontoastcrunch", name: "Cinnamon Toast Crunch", category: "cereal", calories: 310 },
  cocacola: { id: "cocacola", name: "Coca-Cola", category: "drinks", calories: 240 },
  gatorade: { id: "gatorade", name: "Gatorade", category: "drinks", calories: 190 },
};

// Fallback for unknown brands
const DEFAULT_TUTORIAL_BRAND: TutorialBrand = { id: "snack", name: "Your Snack", category: "snack", calories: 350 };

function getTutorialBrand(snackId: string | null): TutorialBrand | null {
  if (!snackId) return null;
  return TUTORIAL_BRANDS[snackId] ?? { ...DEFAULT_TUTORIAL_BRAND, id: snackId, name: snackId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) };
}

function getSwapCalories(original: number): number {
  // Roughly 45-55% of original, rounded to nearest 10
  return Math.round((original * 0.48) / 10) * 10;
}

// ─── Constants ───────────────────────────────────
const DEMO_SWAP_IDS = [
  "hot-cheetos",
  "snickers",
  "oreos",
  "half-baked",
  "trail-mix",
];

const frequencyChoices = [7, 6, 5, 4, 3, 2, 1] as const;

const TOUR_STEPS = [
  {
    target: "center",
    message:
      "This is a sample of what your personalized dashboard looks like.",
  },
  {
    target: "frequency",
    message:
      "Change the frequency based on how often you eat this snack. Watch the numbers update live.",
  },
];

// ─── Helpers ─────────────────────────────────────
function getCalorieSavings(pair: SnackSwapPair) {
  return Math.max(0, pair.original.calories - pair.swap.calories);
}

function getProteinGain(pair: SnackSwapPair) {
  return pair.swap.protein - pair.original.protein;
}

function clampFrequency(value: number) {
  if (Number.isNaN(value)) return 7;
  return Math.max(1, Math.min(7, Math.round(value)));
}

// ─── Wrapper with Suspense ───────────────────────
export default function SnackBibleDemoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <SnackBibleDemoInner />
    </Suspense>
  );
}

// ─── Main Page ──────────────────────────────────
function SnackBibleDemoInner() {
  const searchParams = useSearchParams();
  const snackParam = searchParams.get("snack");

  const [allPairs, setAllPairs] = useState<SnackSwapPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [frequencyByPairId, setFrequencyByPairId] = useState<Record<string, number>>({});

  // Flow state machine — always show tutorial if snackParam exists
  const [flowState, setFlowState] = useState<FlowState>(snackParam ? "compare" : "dashboard");

  // Weight inputs
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [goalWeight, setGoalWeight] = useState<number | null>(null);

  // Dashboard state
  const [myPlanIds, setMyPlanIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  // Compare state
  const [swapRevealed, setSwapRevealed] = useState(false);

  // Email capture dialog
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailDialogEmail, setEmailDialogEmail] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Tour
  const [tourStep, setTourStep] = useState(0);
  const [tourDismissed, setTourDismissed] = useState(false);
  const [tourTriggered, setTourTriggered] = useState(false);

  // Projection
  const [ordersPerWeek, setOrdersPerWeek] = useState(7);

  const searchRef = useRef<HTMLInputElement>(null);
  const searchSectionRef = useRef<HTMLDivElement>(null);
  const firstCardRef = useRef<HTMLDivElement>(null);
  const frequencyAsideRef = useRef<HTMLElement | null>(null);
  const [tourDialogPos, setTourDialogPos] = useState<{ top: number; left: number; arrowDir: "left" | "up" } | null>(null);

  // ─── Data Fetching ───────────────────────────────
  useEffect(() => {
    fetch("/api/snack-swaps")
      .then((r) => r.json())
      .then((data: { swaps?: SnackSwapPair[] }) => {
        const swaps = Array.isArray(data.swaps) ? data.swaps : [];
        setAllPairs(swaps);
        const freqs: Record<string, number> = {};
        swaps.forEach((p) => { freqs[p.id] = 7; });
        setFrequencyByPairId(freqs);

        // Build initial plan: tutorial snack + demo swaps
        const planSet = new Set<string>();
        if (snackParam) planSet.add(snackParam);
        DEMO_SWAP_IDS.forEach((id) => planSet.add(id));
        setMyPlanIds(planSet);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [snackParam]);

  // ─── Tutorial brand (template, no DB lookup) ────
  const tutorialBrand = useMemo(() => getTutorialBrand(snackParam), [snackParam]);
  const tutorialOriginalCal = tutorialBrand?.calories ?? 350;
  const tutorialSwapCal = getSwapCalories(tutorialOriginalCal);
  const tutorialCalSaved = tutorialOriginalCal - tutorialSwapCal;

  const planPairs = useMemo(() => {
    if (allPairs.length === 0) return [];
    // Tutorial snack first, then the rest
    const ordered: SnackSwapPair[] = [];
    const seen = new Set<string>();

    if (snackParam) {
      const tp = allPairs.find((p) => p.id === snackParam);
      if (tp && myPlanIds.has(tp.id) && !dismissedIds.has(tp.id)) {
        ordered.push(tp);
        seen.add(tp.id);
      }
    }

    for (const id of myPlanIds) {
      if (seen.has(id) || dismissedIds.has(id)) continue;
      const p = allPairs.find((pair) => pair.id === id);
      if (p) {
        ordered.push(p);
        seen.add(id);
      }
    }

    return ordered;
  }, [allPairs, myPlanIds, dismissedIds, snackParam]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return allPairs
      .filter((p) => {
        const haystack = [p.title, p.original.name, p.original.brand, p.swap.name, p.craving, p.context].join(" ").toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 8);
  }, [allPairs, searchQuery]);

  const totals = useMemo(() => {
    const weeklyCalories = planPairs.reduce((sum, pair) => {
      const freq = frequencyByPairId[pair.id] ?? 5;
      return sum + getCalorieSavings(pair) * freq;
    }, 0);
    return {
      weeklyCalories,
      weeklyFatLoss: weeklyCalories / 3500,
      monthlyFatLoss: (weeklyCalories * 4) / 3500,
    };
  }, [planPairs, frequencyByPairId]);

  const calSavedPerSwap = tutorialCalSaved;

  // ─── Handlers ────────────────────────────────────
  function handleDismiss(pairId: string) {
    setDismissedIds((prev) => new Set(prev).add(pairId));
  }

  function handleFrequencyChange(pairId: string, value: number) {
    const next = clampFrequency(value);
    setFrequencyByPairId((prev) => ({ ...prev, [pairId]: next }));
    if (tourStep === 0 && !tourDismissed) {
      setTimeout(() => setTourStep(1), 600);
    }
  }

  function handleAddToPlan(pairId: string) {
    setMyPlanIds((prev) => new Set(prev).add(pairId));
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.delete(pairId);
      return next;
    });
    // Show email dialog after adding a snack via search
    if (!emailSent) {
      setTimeout(() => setShowEmailDialog(true), 400);
    }
  }

  function handleSkipTutorial() {
    setFlowState("dashboard");
  }

  function advanceToDashboard() {
    setFlowState("dashboard");
    // Trigger tour on first dashboard visit
    if (!tourTriggered) {
      setTourTriggered(true);
    }
  }

  const positionTourDialog = useCallback(() => {
    if (frequencyAsideRef.current) {
      const rect = frequencyAsideRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      // On mobile / narrow screens, position below the aside
      if (vw < 1280) {
        setTourDialogPos({
          top: rect.bottom + 12 + window.scrollY,
          left: Math.max(16, Math.min(rect.left + rect.width / 2, vw - 200)),
          arrowDir: "up",
        });
      } else {
        // On wide screens, position to the right of the aside
        setTourDialogPos({
          top: rect.top + window.scrollY + rect.height / 2,
          left: rect.right + 16,
          arrowDir: "left",
        });
      }
    }
  }, []);

  const handleTourNext = useCallback(() => {
    const next = tourStep + 1;
    if (next >= TOUR_STEPS.length) {
      setTourDismissed(true);
      setTourDialogPos(null);
      return;
    }
    setTourStep(next);
    if (next === 1 && firstCardRef.current) {
      firstCardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      // Position dialog after scroll settles
      setTimeout(positionTourDialog, 500);
    }
  }, [tourStep, positionTourDialog]);

  async function handleFeedbackSubmit() {
    const snackName = searchQuery.trim();
    if (!snackName) return;
    setFeedbackSubmitting(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: "snack_request",
          comment: snackName,
          notifyEmail: feedbackEmail.trim() || null,
          page: "snack-bible-demo",
        }),
      });
      setFeedbackSent(true);
    } catch {
      // silent fail
    } finally {
      setFeedbackSubmitting(false);
    }
  }

  async function handleEmailCapture() {
    if (!emailDialogEmail.includes("@") || emailSubmitting) return;
    setEmailSubmitting(true);
    try {
      const planSnacks = planPairs.map((p) => ({
        id: p.id,
        original: p.original.name,
        swap: p.swap.name,
        caloriesSaved: getCalorieSavings(p),
        frequency: frequencyByPairId[p.id] ?? 5,
      }));

      await fetch("/api/send-swap-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailDialogEmail,
          currentWeight: currentWeight ?? 200,
          goalWeight: goalWeight ?? 180,
          calSavedPerOrder: totals.weeklyCalories / 7,
          lbsPerWeek: totals.weeklyFatLoss,
          weeksToGoal: totals.weeklyFatLoss > 0 ? Math.ceil(((currentWeight ?? 200) - (goalWeight ?? 180)) / totals.weeklyFatLoss) : 52,
          targetDate: new Date(Date.now() + (totals.weeklyFatLoss > 0 ? Math.ceil(((currentWeight ?? 200) - (goalWeight ?? 180)) / totals.weeklyFatLoss) : 52) * 7 * 86400000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
          ordersPerWeek: 5,
          swapName: "Snack Bible Plan",
          restaurantName: "Snack Bible",
          completedMeals: planSnacks,
          sessionTotalSavings: totals.weeklyCalories,
        }),
      });
    } catch {
      // best effort
    }
    setEmailSubmitting(false);
    setEmailSent(true);
    setShowEmailDialog(false);
  }

  const showNoResults = searchQuery.trim().length > 0 && searchResults.length === 0;
  const showTour = tourTriggered && !tourDismissed && !loading && planPairs.length > 0 && flowState === "dashboard";

  // ─── Render ──────────────────────────────────────
  return (
    <div className="min-h-screen bg-black text-white">
      <main className="relative mx-auto w-full max-w-6xl px-4 pb-20 pt-6">
        {/* Skip tutorial link — visible during tutorial steps */}
        {flowState !== "dashboard" && (
          <button
            onClick={handleSkipTutorial}
            className="absolute right-4 top-6 z-30 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
          >
            Skip tutorial
          </button>
        )}

        <AnimatePresence mode="wait">
          {/* ─── COMPARE STEP ─── */}
          {flowState === "compare" && (
            <CompareScreen
              key="compare"
              brand={tutorialBrand}
              originalCal={tutorialOriginalCal}
              swapCal={tutorialSwapCal}
              swapRevealed={swapRevealed}
              onReveal={() => setSwapRevealed(true)}
              onContinue={() => setFlowState("weight")}
              calSaved={tutorialCalSaved}
            />
          )}

          {/* ─── WEIGHT STEP ─── */}
          {flowState === "weight" && (
            <motion.div
              key="weight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto flex min-h-[70vh] items-center justify-center"
            >
              <WeightInputScreen
                currentWeight={currentWeight}
                goalWeight={goalWeight}
                onCurrentChange={setCurrentWeight}
                onGoalChange={setGoalWeight}
                onContinue={() => setFlowState("projection")}
                onBack={() => setFlowState("compare")}
              />
            </motion.div>
          )}

          {/* ─── PROJECTION STEP ─── */}
          {flowState === "projection" && currentWeight && goalWeight && (
            <motion.div
              key="projection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="mx-auto flex min-h-[70vh] items-center justify-center"
            >
              <ProjectionScreen
                currentWeight={currentWeight}
                goalWeight={goalWeight}
                calSavedPerSwap={calSavedPerSwap}
                snackName={tutorialBrand?.name ?? "your snack"}
                ordersPerWeek={ordersPerWeek}
                onOrdersChange={setOrdersPerWeek}
                onContinue={advanceToDashboard}
                onBack={() => setFlowState("weight")}
              />
            </motion.div>
          )}

          {/* ─── DASHBOARD STEP ─── */}
          {flowState === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              {/* Header */}
              <div className="mb-6 text-center">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">
                  Snack Bible
                </p>
                <h1 className="mt-1 text-2xl font-bold leading-tight sm:text-3xl">
                  Your Personalized Swap Plan
                </h1>
                <p className="mt-2 text-base text-zinc-400">
                  Adjust frequency. Search for more. Watch the math change.
                </p>
              </div>

              {/* Stats banner */}
              {!loading && planPairs.length > 0 && (
                <div className="sticky top-2 z-20 rounded-2xl border border-emerald-500/30 bg-zinc-950/90 p-3 shadow-[0_12px_48px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-300">
                      My Plan
                    </span>
                    <span className="text-xs text-zinc-500">{planPairs.length} swaps</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <StickyMetric label="Weekly Calories Saved" value={totals.weeklyCalories} suffix="cal" decimals={0} />
                    <StickyMetric label="Projected Fat Loss / Week" value={totals.weeklyFatLoss} suffix="lbs" decimals={2} />
                    <StickyMetric label="Projected Fat Loss / Month" value={totals.monthlyFatLoss} suffix="lbs" decimals={1} />
                  </div>
                </div>
              )}

              {/* Search bar */}
              {!loading && (
                <div ref={searchSectionRef} className="mt-4">
                  <input
                    ref={searchRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setFeedbackSent(false);
                    }}
                    placeholder="Search for your favorite snack..."
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3.5 text-lg text-white placeholder-zinc-500 outline-none transition-colors focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                  />

                  {/* Search results */}
                  <AnimatePresence mode="wait">
                    {searchResults.length > 0 && (
                      <motion.div
                        key="results"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-4 space-y-3"
                      >
                        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
                          We found a swap for that
                        </p>
                        {searchResults.map((pair) => {
                          const inPlan = myPlanIds.has(pair.id) && !dismissedIds.has(pair.id);
                          return (
                            <div key={pair.id} className="relative">
                              <SnackSwapRow
                                pair={pair}
                                frequency={frequencyByPairId[pair.id] ?? 7}
                                onFrequencyChange={(v) => handleFrequencyChange(pair.id, v)}
                              />
                              {/* Add / Already in plan badge */}
                              <button
                                onClick={() => !inPlan && handleAddToPlan(pair.id)}
                                disabled={inPlan}
                                className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                                  inPlan
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "bg-emerald-500 text-black hover:bg-emerald-400"
                                }`}
                                aria-label={inPlan ? "Already in plan" : "Add to plan"}
                              >
                                {inPlan ? (
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}

                    {showNoResults && !feedbackSent && (
                      <motion.div
                        key="no-results"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"
                      >
                        <p className="text-lg font-semibold text-white">
                          We don&apos;t have &ldquo;{searchQuery.trim()}&rdquo; yet.
                        </p>
                        <p className="mt-1 text-base text-zinc-400">
                          We&apos;re adding new snacks every week. Drop yours below and we&apos;ll build the swap for you.
                        </p>
                        <div className="mt-4 space-y-3">
                          <div className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5">
                            <p className="text-sm text-zinc-400">Snack requested</p>
                            <p className="text-lg font-semibold text-white">{searchQuery.trim()}</p>
                          </div>
                          <input
                            type="email"
                            value={feedbackEmail}
                            onChange={(e) => setFeedbackEmail(e.target.value)}
                            placeholder="Email (optional) -- we'll notify you when it's ready"
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-base text-white placeholder-zinc-500 outline-none focus:border-emerald-500/50"
                          />
                          <button
                            onClick={handleFeedbackSubmit}
                            disabled={feedbackSubmitting}
                            className="w-full rounded-xl bg-emerald-500 py-3 text-base font-bold uppercase tracking-wider text-black transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
                          >
                            {feedbackSubmitting ? "Submitting..." : "Request This Swap"}
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {feedbackSent && (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.08] p-5 text-center"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
                          className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500"
                        >
                          <svg className="h-8 w-8 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </motion.div>
                        <p className="text-lg font-semibold text-emerald-300">Got it.</p>
                        <p className="mt-1 text-base text-zinc-400">
                          We&apos;ll build the swap for &ldquo;{searchQuery.trim()}&rdquo;
                          {feedbackEmail.trim() ? " and notify you when it's ready." : "."}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Plan swap cards */}
              {loading && (
                <div className="py-14 text-center">
                  <p className="text-zinc-400">Loading swaps...</p>
                </div>
              )}

              {!loading && planPairs.length > 0 && (
                <div className="mt-5 space-y-4">
                  <AnimatePresence mode="popLayout">
                    {planPairs.map((pair, index) => (
                      <motion.div
                        key={pair.id}
                        ref={index === 0 ? firstCardRef : undefined}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
                        exit={{ opacity: 0, x: -80, scale: 0.95 }}
                        transition={{
                          layout: { type: "spring", stiffness: 300, damping: 30 },
                          delay: index * 0.06,
                          duration: 0.3,
                        }}
                      >
                        <SnackSwapRow
                          pair={pair}
                          frequency={frequencyByPairId[pair.id] ?? 7}
                          onFrequencyChange={(v) => handleFrequencyChange(pair.id, v)}
                          onDismiss={() => handleDismiss(pair.id)}
                          highlighted={pair.id === snackParam}
                          frequencyRef={index === 0 ? frequencyAsideRef : undefined}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {!loading && planPairs.length === 0 && (
                <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center">
                  <p className="text-lg font-semibold text-zinc-300">No swaps in your plan yet.</p>
                  <p className="mt-2 text-base text-zinc-500">Search above to find and add snack swaps.</p>
                </div>
              )}

              {/* Bottom CTA */}
              {!loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="mt-12 text-center"
                >
                  <p className="text-base text-zinc-400">
                    Want this done for everything you eat?
                  </p>
                  <a
                    href="/concierge"
                    className="mt-3 inline-block rounded-xl bg-emerald-500 px-8 py-3.5 text-base font-bold uppercase tracking-wider text-black transition-colors hover:bg-emerald-400"
                  >
                    See How the Full Plan Works
                  </a>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ─── Floating Tour Dialog ─── */}
      <AnimatePresence>
        {showTour && (
          <motion.div
            key="tour-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-50"
          >
            {/* Overlay — on step 1, cut out the frequency aside */}
            {tourStep === 1 && frequencyAsideRef.current ? (
              <svg className="pointer-events-auto absolute inset-0 h-full w-full" onClick={handleTourNext}>
                <defs>
                  <mask id="tour-mask">
                    <rect width="100%" height="100%" fill="white" />
                    {(() => {
                      const r = frequencyAsideRef.current!.getBoundingClientRect();
                      return (
                        <rect
                          x={r.left - 4}
                          y={r.top - 4}
                          width={r.width + 8}
                          height={r.height + 8}
                          rx={16}
                          fill="black"
                        />
                      );
                    })()}
                  </mask>
                </defs>
                <rect width="100%" height="100%" fill="rgba(0,0,0,0.5)" mask="url(#tour-mask)" />
              </svg>
            ) : (
              <div
                className="pointer-events-auto absolute inset-0 bg-black/40"
                onClick={handleTourNext}
              />
            )}
            <motion.div
              key={tourStep}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="pointer-events-auto fixed z-50 w-[90vw] max-w-sm rounded-2xl border border-emerald-500/40 bg-zinc-900 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
              style={
                tourStep === 0
                  ? { left: "50%", top: "50%", transform: "translate(-50%, -50%)" }
                  : tourDialogPos
                    ? tourDialogPos.arrowDir === "up"
                      ? { position: "absolute", top: tourDialogPos.top, left: tourDialogPos.left, transform: "translateX(-50%)" }
                      : { position: "absolute", top: tourDialogPos.top, left: tourDialogPos.left, transform: "translateY(-50%)" }
                    : { left: "50%", bottom: "2rem", transform: "translateX(-50%)" }
              }
            >
              {/* Arrow pointing at frequency aside */}
              {tourStep === 1 && tourDialogPos && (
                tourDialogPos.arrowDir === "up" ? (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                    <div className="h-0 w-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-emerald-500/40" />
                  </div>
                ) : (
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2">
                    <div className="h-0 w-0 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent border-r-emerald-500/40" />
                  </div>
                )
              )}
              <div className="mb-3 flex items-center gap-2">
                {TOUR_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      i <= tourStep ? "bg-emerald-500" : "bg-zinc-700"
                    }`}
                  />
                ))}
              </div>
              <p className="text-base leading-relaxed text-zinc-200">
                {TOUR_STEPS[tourStep]?.message}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => { setTourDismissed(true); setTourDialogPos(null); }}
                  className="text-sm text-zinc-500 hover:text-zinc-300"
                >
                  Skip tour
                </button>
                <button
                  onClick={handleTourNext}
                  className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-black transition-colors hover:bg-emerald-400"
                >
                  {tourStep === TOUR_STEPS.length - 1 ? "Got it" : "Next"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Email Capture Dialog ─── */}
      <AnimatePresence>
        {showEmailDialog && !emailSent && (
          <motion.div
            key="email-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
          >
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setShowEmailDialog(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative z-10 w-full max-w-sm rounded-2xl border border-emerald-500/30 bg-zinc-900 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            >
              <h3 className="text-xl font-bold text-white">Want us to send your personalized plan?</h3>
              <p className="mt-2 text-sm text-zinc-400">
                We&apos;ll email you your swap plan with calorie savings and fat loss projections.
              </p>
              <input
                type="email"
                value={emailDialogEmail}
                onChange={(e) => setEmailDialogEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEmailCapture()}
                placeholder="you@email.com"
                className="mt-4 w-full rounded-xl border-2 border-zinc-800 bg-zinc-950 px-4 py-3 text-base text-white placeholder-zinc-600 outline-none transition-colors focus:border-emerald-500/50"
                autoFocus
              />
              <button
                onClick={handleEmailCapture}
                disabled={emailSubmitting || !emailDialogEmail.includes("@")}
                className={`mt-3 w-full rounded-xl px-6 py-3 text-base font-bold uppercase tracking-wider transition-all ${
                  emailDialogEmail.includes("@") && !emailSubmitting
                    ? "bg-emerald-500 text-black hover:bg-emerald-400"
                    : "cursor-not-allowed bg-zinc-800 text-zinc-600"
                }`}
              >
                {emailSubmitting ? "Sending..." : "Send it"}
              </button>
              <button
                onClick={() => setShowEmailDialog(false)}
                className="mt-2 w-full py-2 text-center text-sm text-zinc-500 transition-colors hover:text-zinc-300"
              >
                Not now
              </button>
              <p className="mt-2 text-center text-[11px] text-zinc-700">
                Just the plan. No spam. Unsubscribe anytime.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Crossroads after email sent ─── */}
      <AnimatePresence>
        {emailSent && showEmailDialog && (
          <motion.div
            key="crossroads-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
          >
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setShowEmailDialog(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative z-10 w-full max-w-sm rounded-2xl border border-emerald-500/30 bg-zinc-900 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500"
              >
                <svg className="h-8 w-8 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              <p className="text-center text-lg font-semibold text-emerald-300">Plan sent.</p>
              <p className="mt-1 text-center text-sm text-zinc-400">Check your inbox.</p>

              <div className="mt-6 space-y-3">
                <a
                  href="/concierge"
                  className="block w-full rounded-xl bg-emerald-500 px-6 py-3 text-center text-base font-bold uppercase tracking-wider text-black transition-colors hover:bg-emerald-400"
                >
                  See how the full plan works
                </a>
                <a
                  href="/vsl"
                  className="block w-full rounded-xl border border-zinc-700 px-6 py-3 text-center text-base font-semibold text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
                >
                  Watch the VSL
                </a>
                <button
                  onClick={() => setShowEmailDialog(false)}
                  className="w-full py-2 text-center text-sm text-zinc-500 transition-colors hover:text-zinc-300"
                >
                  Keep building my plan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Animated calorie counter (spring acceleration, matches dark-landing) ──
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

// ─── Compare Screen (Template-based, no DB lookup) ──
function CompareScreen({
  brand,
  originalCal,
  swapCal,
  swapRevealed,
  onReveal,
  onContinue,
  calSaved,
}: {
  brand: TutorialBrand | null;
  originalCal: number;
  swapCal: number;
  swapRevealed: boolean;
  onReveal: () => void;
  onContinue: () => void;
  calSaved: number;
}) {
  const brandName = brand?.name ?? "Your Snack";
  const brandId = brand?.id ?? "snack";
  const logoSrc = `/snack-logos/${brandId}.png`;

  // Math assumes 7x/week (daily snack)
  const lbsPerWeek = ((calSaved * 7) / 3500);
  const lbsPerMonth = lbsPerWeek * 4;

  return (
    <motion.div
      key="compare"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="mx-auto max-w-2xl py-4 sm:py-8"
    >
      <div className="mb-4 sm:mb-8 text-center">
        <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">
          Snack Bible
        </p>
        {!swapRevealed ? (
          <h1 className="mt-1.5 text-lg font-bold leading-tight sm:text-3xl">
            Want to learn how to lose up to{" "}
            <span className="text-emerald-400">{lbsPerWeek.toFixed(1)} lb a week</span>
            {" "}simply by adjusting your current {brandName}?
          </h1>
        ) : (
          <>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-1.5 text-lg font-bold leading-tight sm:text-3xl"
            >
              We find you the lowest-calorie healthy version of all your favorite snacks
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-1 text-sm text-zinc-400 sm:text-base"
            >
              So you can lose fat without giving up the snacks you love.
            </motion.p>
          </>
        )}
      </div>

      {/* Two-card comparison */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2">
        {/* Left: Their snack */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 sm:p-5"
        >
          <div className="text-center mb-2 sm:mb-4">
            <div className="relative h-14 w-14 sm:h-20 sm:w-20 mx-auto overflow-hidden rounded-xl bg-white">
              <Image
                src={logoSrc}
                alt={brandName}
                fill
                className="object-contain p-1"
                sizes="80px"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
            <p className="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-wider mt-1.5 sm:mt-2">
              Your Favorite Snack
            </p>
          </div>
          <p className="text-center text-base sm:text-lg font-semibold text-white mb-2 sm:mb-3">{brandName}</p>
          <div className="rounded-xl bg-zinc-950/70 px-2 py-2 sm:px-3 sm:py-3 text-center" style={{ boxShadow: "0 0 12px 2px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.05)" }}>
            <p className="text-[10px] sm:text-xs uppercase tracking-wider text-zinc-500">Calories</p>
            <p className="text-3xl sm:text-4xl font-bold tabular-nums text-white">{originalCal}</p>
          </div>
        </motion.div>

        {/* Right: Swap or placeholder */}
        <AnimatePresence mode="wait">
          {!swapRevealed ? (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 sm:p-5"
            >
              <div className="text-center mb-2 sm:mb-4">
                {/* Breathing "?" with blurred snack behind */}
                <div className="relative inline-block">
                  <div className="w-14 h-14 sm:w-20 sm:h-20 mx-auto rounded-xl overflow-hidden opacity-20 blur-sm bg-white">
                    <Image
                      src={logoSrc}
                      alt=""
                      fill
                      className="object-contain p-1"
                      sizes="80px"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.span
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                      className="text-2xl sm:text-3xl font-bold text-zinc-400"
                    >
                      ?
                    </motion.span>
                  </div>
                </div>
                <p className="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-wider mt-1.5 sm:mt-2">
                  Optimized Snack
                </p>
              </div>
              {/* Skeleton name */}
              <div className="flex justify-center mb-2 sm:mb-3">
                <div className="h-4 sm:h-5 w-2/3 rounded bg-zinc-800" />
              </div>
              <div className="rounded-xl bg-zinc-950/70 px-2 py-2 sm:px-3 sm:py-3 text-center" style={{ boxShadow: "0 0 12px 2px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.05)" }}>
                <p className="text-[10px] sm:text-xs uppercase tracking-wider text-zinc-500">Calories</p>
                <div className="h-[36px] sm:h-[40px] flex items-center justify-center">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}
                        className="h-2 w-2 rounded-full bg-emerald-500/50"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="revealed"
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-3 sm:p-5 shadow-[0_0_30px_rgba(16,185,129,0.08)]"
            >
              <div className="text-center mb-2 sm:mb-4">
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="relative w-14 h-14 sm:w-20 sm:h-20 mx-auto rounded-xl overflow-hidden bg-white"
                >
                  <Image
                    src={logoSrc}
                    alt={`Low-cal ${brandName}`}
                    fill
                    className="object-contain p-1"
                    sizes="80px"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </motion.div>
                <p className="text-[10px] sm:text-xs uppercase tracking-wider mt-1.5 sm:mt-2">
                  <span className="text-emerald-400">Optimized Snack</span>
                </p>
              </div>
              <p className="text-center text-base sm:text-lg font-semibold text-white mb-2 sm:mb-3">Low-Cal {brandName}</p>
              <div className="rounded-xl bg-zinc-950/70 px-2 py-2 sm:px-3 sm:py-3 text-center" style={{ boxShadow: "0 0 12px 2px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.05)" }}>
                <p className="text-[10px] sm:text-xs uppercase tracking-wider text-zinc-500">Calories</p>
                <AnimatedCalories
                  value={swapCal}
                  className="text-3xl sm:text-4xl font-bold tabular-nums text-emerald-400"
                />
                <span className="text-xs sm:text-sm text-zinc-500 ml-1">cal</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Savings stats (after reveal) */}
      <AnimatePresence>
        {swapRevealed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-3 sm:mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-3 sm:p-5 text-center"
          >
            <p className="text-2xl sm:text-3xl font-black text-emerald-300">
              -<AnimatedCalories value={calSaved} className="text-2xl sm:text-3xl font-black text-emerald-300" /> cal
            </p>
            <p className="text-xs sm:text-sm text-zinc-400">saved per swap</p>
            <div className="mt-2 sm:mt-3 flex justify-center gap-6">
              <div>
                <p className="text-lg sm:text-xl font-bold text-white">-{lbsPerWeek.toFixed(1)}</p>
                <p className="text-[10px] sm:text-xs text-zinc-500">lbs/week</p>
              </div>
              <div className="w-px bg-zinc-800" />
              <div>
                <p className="text-lg sm:text-xl font-bold text-white">-{lbsPerMonth.toFixed(1)}</p>
                <p className="text-[10px] sm:text-xs text-zinc-500">lbs/month</p>
              </div>
            </div>
            <p className="mt-2 sm:mt-3 text-[10px] sm:text-xs text-zinc-600">
              Every 500 cal/day cut = 1 lb of fat per week. That&apos;s the whole game.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action button */}
      <div className="mt-4 sm:mt-8 text-center">
        {!swapRevealed ? (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onReveal}
            className="w-full rounded-2xl bg-emerald-500 px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-bold uppercase tracking-wider text-black transition-all hover:bg-emerald-400 sm:w-auto"
          >
            Show me the swap
          </motion.button>
        ) : (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            whileTap={{ scale: 0.97 }}
            onClick={onContinue}
            className="w-full rounded-2xl bg-emerald-500 px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-bold uppercase tracking-wider text-black transition-all hover:bg-emerald-400 sm:w-auto"
          >
            Personalize this for me
          </motion.button>
        )}
        {!swapRevealed && (
          <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-zinc-500">
            No gym. No meal prep. Just ordering smarter.
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Weight Input Screen ─────────────────────────
function WeightInputScreen({
  currentWeight,
  goalWeight,
  onCurrentChange,
  onGoalChange,
  onContinue,
  onBack,
}: {
  currentWeight: number | null;
  goalWeight: number | null;
  onCurrentChange: (w: number | null) => void;
  onGoalChange: (w: number | null) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const canContinue =
    currentWeight !== null &&
    goalWeight !== null &&
    currentWeight > goalWeight &&
    currentWeight > 80 &&
    currentWeight < 500 &&
    goalWeight > 80;

  const handleInput = (
    value: string,
    setter: (w: number | null) => void
  ) => {
    const stripped = value.replace(/[^0-9]/g, "");
    if (stripped === "") {
      setter(null);
    } else {
      setter(parseInt(stripped, 10));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canContinue) {
      onContinue();
    }
  };

  return (
    <div className="w-full max-w-sm">
      {/* Back */}
      <button
        onClick={onBack}
        className="mb-8 flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <h2 className="mb-2 text-2xl font-bold">
        Let&apos;s tie this to your goals
      </h2>
      <p className="mb-8 text-sm text-zinc-500">
        Two numbers. That&apos;s it.
      </p>

      {/* Current weight */}
      <div className="mb-6">
        <label className="mb-2 block text-xs uppercase tracking-wider text-zinc-500">
          How much do you weigh?
        </label>
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            value={currentWeight ?? ""}
            onChange={(e) => handleInput(e.target.value, onCurrentChange)}
            onKeyDown={handleKeyDown}
            placeholder="200"
            className="w-full rounded-2xl border-2 border-zinc-800 bg-zinc-900/60 px-5 py-4 text-2xl font-bold tabular-nums text-white transition-colors placeholder:text-zinc-700 focus:border-emerald-500/50 focus:outline-none"
          />
          <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm text-zinc-600">
            lbs
          </span>
        </div>
      </div>

      {/* Goal weight */}
      <div className="mb-8">
        <label className="mb-2 block text-xs uppercase tracking-wider text-zinc-500">
          What&apos;s your goal?
        </label>
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            value={goalWeight ?? ""}
            onChange={(e) => handleInput(e.target.value, onGoalChange)}
            onKeyDown={handleKeyDown}
            placeholder="180"
            className="w-full rounded-2xl border-2 border-zinc-800 bg-zinc-900/60 px-5 py-4 text-2xl font-bold tabular-nums text-white transition-colors placeholder:text-zinc-700 focus:border-emerald-500/50 focus:outline-none"
          />
          <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm text-zinc-600">
            lbs
          </span>
        </div>
      </div>

      {/* Weight to lose preview */}
      {currentWeight && goalWeight && currentWeight > goalWeight && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 text-center"
        >
          <p className="text-sm text-zinc-500">
            That&apos;s{" "}
            <span className="font-semibold text-white">
              {currentWeight - goalWeight} lbs
            </span>{" "}
            to lose
          </p>
        </motion.div>
      )}

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onContinue}
        disabled={!canContinue}
        className={`w-full rounded-2xl px-8 py-4 text-base font-semibold transition-all ${
          canContinue
            ? "bg-emerald-500 text-black hover:bg-emerald-400"
            : "cursor-not-allowed bg-zinc-800 text-zinc-600"
        }`}
      >
        Show me my timeline
      </motion.button>
    </div>
  );
}

// ─── Projection Screen ──────────────────────────
function ProjectionScreen({
  currentWeight,
  goalWeight,
  calSavedPerSwap,
  snackName,
  ordersPerWeek,
  onOrdersChange,
  onContinue,
  onBack,
}: {
  currentWeight: number;
  goalWeight: number;
  calSavedPerSwap: number;
  snackName: string;
  ordersPerWeek: number;
  onOrdersChange: (n: number) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const [animationDone, setAnimationDone] = useState(false);

  const weightToLose = currentWeight - goalWeight;
  const lbsPerWeek = (calSavedPerSwap * ordersPerWeek) / 3500;
  const weeksToGoal = lbsPerWeek > 0 ? Math.ceil(weightToLose / lbsPerWeek) : 999;
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + weeksToGoal * 7);
  const targetDateStr = targetDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Generate curve points
  const points = 12;
  const curveData: { week: number; weight: number }[] = [];
  for (let i = 0; i <= points; i++) {
    const t = i / points;
    const progress = 1 - Math.pow(1 - t, 1.8);
    const weight = currentWeight - weightToLose * progress;
    curveData.push({
      week: Math.round(t * weeksToGoal),
      weight: Math.round(weight * 10) / 10,
    });
  }

  const svgW = 320;
  const svgH = 160;
  const padX = 40;
  const padY = 20;
  const chartW = svgW - padX * 2;
  const chartH = svgH - padY * 2;

  const toX = (i: number) => padX + (i / points) * chartW;
  const toY = (w: number) => {
    const range = currentWeight - goalWeight;
    if (range === 0) return padY;
    const normalized = (currentWeight - w) / range;
    return padY + normalized * chartH;
  };

  const pathD = curveData
    .map((d, i) => {
      const x = toX(i);
      const y = toY(d.weight);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(" ");

  useEffect(() => {
    const timer = setTimeout(() => setAnimationDone(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full max-w-md">
      {/* Back */}
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Headline */}
      <div className="mb-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          className="text-2xl font-bold"
        >
          You&apos;ll hit{" "}
          <span className="text-emerald-400">{goalWeight} lbs</span> by{" "}
          <span className="text-emerald-400">{targetDateStr}</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="mt-3 text-xl font-bold text-white"
        >
          Without giving up{" "}
          <span className="text-emerald-400">{snackName}</span>.
        </motion.p>
      </div>

      {/* Graph */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"
      >
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <line
              key={t}
              x1={padX}
              y1={padY + t * chartH}
              x2={svgW - padX}
              y2={padY + t * chartH}
              stroke="#27272a"
              strokeWidth={0.5}
            />
          ))}

          <text x={padX - 5} y={padY + 4} textAnchor="end" fill="#ef4444" fontSize={10} fontWeight="bold">
            {currentWeight}
          </text>
          <text x={padX - 5} y={padY + chartH + 4} textAnchor="end" fill="#34d399" fontSize={10} fontWeight="bold">
            {goalWeight}
          </text>

          <motion.path
            d={pathD}
            fill="none"
            stroke="#34d399"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
          />

          <motion.circle
            cx={toX(0)}
            cy={toY(currentWeight)}
            r={4}
            fill="#ef4444"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          />

          <motion.circle
            cx={toX(points)}
            cy={toY(goalWeight)}
            r={5}
            fill="#34d399"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 2, type: "spring", stiffness: 300 }}
          />

          <motion.text
            x={toX(0)}
            y={toY(currentWeight) - 12}
            textAnchor="middle"
            fill="#ef4444"
            fontSize={9}
            fontWeight="bold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            NOW
          </motion.text>

          <motion.text
            x={toX(points)}
            y={toY(goalWeight) - 12}
            textAnchor="middle"
            fill="#34d399"
            fontSize={9}
            fontWeight="bold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.2 }}
          >
            GOAL
          </motion.text>

          <motion.text
            x={toX(points)}
            y={svgH - 4}
            textAnchor="middle"
            fill="#71717a"
            fontSize={9}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.2 }}
          >
            {targetDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
          </motion.text>

          <motion.text
            x={toX(0)}
            y={svgH - 4}
            textAnchor="middle"
            fill="#71717a"
            fontSize={9}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Today
          </motion.text>
        </svg>
      </motion.div>

      {/* Frequency toggle */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2 }}
        className="mb-4 flex items-center justify-center gap-3"
      >
        <span className="text-xs text-zinc-500">Times per week:</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <button
              key={n}
              onClick={() => onOrdersChange(n)}
              className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${
                ordersPerWeek === n
                  ? "bg-emerald-500 text-black"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.2 }}
        className="mb-8 flex justify-center gap-6 text-center"
      >
        <div>
          <p className="text-lg font-bold text-white">{weeksToGoal}</p>
          <p className="text-xs text-zinc-500">weeks</p>
        </div>
        <div className="w-px bg-zinc-800" />
        <div>
          <p className="text-lg font-bold text-white">{lbsPerWeek.toFixed(1)}</p>
          <p className="text-xs text-zinc-500">lbs/week</p>
        </div>
        <div className="w-px bg-zinc-800" />
        <div>
          <p className="text-lg font-bold text-emerald-400">{weightToLose}</p>
          <p className="text-xs text-zinc-500">lbs total</p>
        </div>
      </motion.div>

      {/* Transition message */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: animationDone ? 1 : 0, y: animationDone ? 0 : 15 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <p className="mb-4 text-sm text-zinc-400">
          That was ONE snack. Here&apos;s what happens when you optimize all of them.
        </p>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onContinue}
          className="w-full rounded-2xl bg-emerald-500 px-8 py-4 text-base font-bold uppercase tracking-wider text-black transition-all hover:bg-emerald-400"
        >
          Show me the full dashboard
        </motion.button>
      </motion.div>
    </div>
  );
}

// ─── Shared Components ──────────────────────────

function AnimatedValue({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const spring = useSpring(value, { stiffness: 115, damping: 24, mass: 0.9 });
  const display = useTransform(spring, (v) => v.toFixed(decimals));
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => { spring.set(value); }, [spring, value]);

  useEffect(() => {
    const unsubscribe = display.on("change", (v) => {
      if (ref.current) ref.current.textContent = v;
    });
    return unsubscribe;
  }, [display]);

  return <span ref={ref}>{value.toFixed(decimals)}</span>;
}

function StickyMetric({ label, value, suffix, decimals }: { label: string; value: number; suffix: string; decimals: number }) {
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-2.5">
      <p className="text-sm uppercase tracking-wider text-zinc-400">{label}</p>
      <p className="text-3xl font-bold text-emerald-300">
        <AnimatedValue value={value} decimals={decimals} /> {suffix}
      </p>
    </div>
  );
}

function SnackSwapRow({ pair, frequency, onFrequencyChange, onDismiss, highlighted, frequencyRef }: { pair: SnackSwapPair; frequency: number; onFrequencyChange: (value: number) => void; onDismiss?: () => void; highlighted?: boolean; frequencyRef?: React.RefObject<HTMLElement | null> }) {
  const calorieSavings = getCalorieSavings(pair);
  const proteinGain = getProteinGain(pair);
  const weeklyCalorieSavings = calorieSavings * frequency;
  const weeklyFatLoss = weeklyCalorieSavings / 3500;

  return (
    <article className={`relative overflow-hidden rounded-2xl border bg-zinc-900/60 p-5 ${
      highlighted ? "border-emerald-500/50 shadow-[0_0_24px_rgba(16,185,129,0.1)]" : "border-zinc-800"
    }`}>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800/80 text-zinc-500 transition-colors hover:bg-rose-500/20 hover:text-rose-400"
          aria-label="Remove swap"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold leading-tight text-white">{pair.title}</h2>
          <p className="text-base text-zinc-400">{pair.context}</p>
        </div>
        <span className="shrink-0 rounded-full bg-zinc-800 px-3 py-1.5 text-sm font-semibold uppercase tracking-wider text-zinc-300">
          {pair.craving}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-emerald-500/15 px-2.5 py-1.5 text-sm font-semibold uppercase tracking-wider text-emerald-300">
          -{calorieSavings} cal per swap
        </span>
        {proteinGain > 0 && (
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-1.5 text-sm font-semibold uppercase tracking-wider text-emerald-300">
            +{proteinGain}g protein
          </span>
        )}
      </div>

      <div className="grid gap-3 xl:grid-cols-[1fr_1fr_280px]">
        <SnackCard label="Current Snack" item={pair.original} tone="rose" />
        <SnackCard label="Smarter Swap" item={pair.swap} tone="emerald" rationale={pair.rationale} />

        <aside ref={frequencyRef ?? undefined} className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-300">Weekly Impact</p>
          <p className="mt-1 text-5xl font-black leading-none text-emerald-300">
            <AnimatedValue value={weeklyFatLoss} decimals={2} />
          </p>
          <p className="text-base font-medium text-zinc-200">lbs fat / week</p>

          <p className="mt-3 text-sm uppercase tracking-wider text-zinc-300">Frequency</p>
          <div className="mt-1 flex items-center gap-2">
            <button onClick={() => onFrequencyChange(frequency - 1)} className="h-9 w-9 rounded-lg border border-zinc-700 bg-zinc-900 text-lg text-zinc-300 transition-colors hover:border-zinc-500">-</button>
            <input type="number" min={1} max={7} value={frequency} onChange={(e) => onFrequencyChange(clampFrequency(Number(e.target.value)))} className="h-9 w-14 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-center text-base font-semibold text-white outline-none focus:border-emerald-500" />
            <button onClick={() => onFrequencyChange(frequency + 1)} className="h-9 w-9 rounded-lg border border-zinc-700 bg-zinc-900 text-lg text-zinc-300 transition-colors hover:border-zinc-500">+</button>
            <p className="text-sm text-zinc-400">times/week</p>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {frequencyChoices.map((option) => (
              <button
                key={option}
                onClick={() => onFrequencyChange(option)}
                className={`rounded-full px-2.5 py-1.5 text-sm font-semibold uppercase tracking-wider transition-colors ${
                  frequency === option ? "bg-emerald-500/25 text-emerald-200" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
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
    </article>
  );
}

function SnackCard({ label, item, tone, rationale }: { label: string; item: SnackItem; tone: "rose" | "emerald"; rationale?: string }) {
  const borderTone = tone === "emerald" ? "border-emerald-500/35" : "border-rose-500/35";
  const labelTone = tone === "emerald" ? "text-emerald-300" : "text-rose-300";
  const caloriesTone = tone === "emerald" ? "text-emerald-300" : "text-rose-300";

  return (
    <div className={`rounded-2xl border ${borderTone} bg-zinc-950/90 p-4`}>
      <p className={`text-sm font-semibold uppercase tracking-wider ${labelTone}`}>{label}</p>
      <div className="mt-2 flex items-center gap-3">
        <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900">
          {item.image_url ? (
            <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="64px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl font-bold text-zinc-500">
              {item.name.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xl font-semibold leading-tight text-white">{item.name}</p>
          <p className="truncate text-base text-zinc-400">{item.brand}</p>
          <p className="truncate text-base text-zinc-400">{item.serving}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-zinc-900 px-3 py-2">
          <p className="text-sm uppercase tracking-wider text-zinc-400">Calories</p>
          <p className={`text-3xl font-bold leading-none ${caloriesTone}`}>{item.calories}</p>
        </div>
        <div className="rounded-xl bg-zinc-900 px-3 py-2">
          <p className="text-sm uppercase tracking-wider text-zinc-400">Protein</p>
          <p className="text-3xl font-bold leading-none text-zinc-100">{item.protein}g</p>
        </div>
      </div>
      {rationale && (
        <p className="mt-3 text-sm italic text-zinc-400">{rationale}</p>
      )}
    </div>
  );
}
