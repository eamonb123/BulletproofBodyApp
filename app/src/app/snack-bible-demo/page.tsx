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
  foodLove?: string; // natural phrase for "without giving up your love for ___"
}

// Category → natural food love phrase (used in "Without giving up your love for ___")
const CATEGORY_FOOD_LOVE: Record<string, string> = {
  icecream: "ice cream",
  baked: "pastries",
  chips: "chips",
  candy: "candy",
  cookies: "cookies",
  cereal: "cereal",
  drinks: "soda",
  snack: "snacks",
};

// Calories verified from real serving sizes — "the size people actually buy"
const TUTORIAL_BRANDS: Record<string, TutorialBrand> = {
  // Ice Cream (full pints)
  benjerrys: { id: "benjerrys", name: "Ben & Jerry's", category: "icecream", calories: 1110 },
  haagendazs: { id: "haagendazs", name: "Häagen-Dazs", category: "icecream", calories: 1070 },
  talenti: { id: "talenti", name: "Talenti", category: "icecream", calories: 900 },
  drumstick: { id: "drumstick", name: "Drumstick", category: "icecream", calories: 290 },
  // Baked
  entenmanns: { id: "entenmanns", name: "Entenmann's", category: "baked", calories: 580 },
  poptarts: { id: "poptarts", name: "Pop-Tarts", category: "baked", calories: 370 },
  littledebbie: { id: "littledebbie", name: "Little Debbie", category: "baked", calories: 290 },
  // Chips (grab bag / gas station size)
  takis: { id: "takis", name: "Takis", category: "chips", calories: 490 },
  cheezit: { id: "cheezit", name: "Cheez-It", category: "chips", calories: 410 },
  lays: { id: "lays", name: "Lay's", category: "chips", calories: 420 },
  doritos: { id: "doritos", name: "Doritos", category: "chips", calories: 410 },
  ruffles: { id: "ruffles", name: "Ruffles", category: "chips", calories: 400 },
  pringles: { id: "pringles", name: "Pringles", category: "chips", calories: 375 },
  cheetos: { id: "cheetos", name: "Cheetos", category: "chips", calories: 320 },
  orville: { id: "orville", name: "Orville Redenbacher's", category: "chips", calories: 425, foodLove: "popcorn" },
  // Candy (king size / sharing bag)
  mms: { id: "mms", name: "M&M's", category: "candy", calories: 480 },
  skittles: { id: "skittles", name: "Skittles", category: "candy", calories: 440 },
  sourpatchkids: { id: "sourpatchkids", name: "Sour Patch Kids", category: "candy", calories: 360 },
  twix: { id: "twix", name: "Twix", category: "candy", calories: 440 },
  kitkat: { id: "kitkat", name: "Kit Kat", category: "candy", calories: 420 },
  snickers: { id: "snickers", name: "Snickers", category: "candy", calories: 440 },
  reeses: { id: "reeses", name: "Reese's", category: "candy", calories: 400, foodLove: "chocolate" },
  hersheys: { id: "hersheys", name: "Hershey's", category: "candy", calories: 370, foodLove: "chocolate" },
  // Cookies
  girlscoutcookies: { id: "girlscoutcookies", name: "Girl Scout Cookies", category: "cookies", calories: 320 },
  chipsahoy: { id: "chipsahoy", name: "Chips Ahoy", category: "cookies", calories: 320 },
  // Cereal (bowl + milk)
  cinnamontoastcrunch: { id: "cinnamontoastcrunch", name: "Cinnamon Toast Crunch", category: "cereal", calories: 345 },
  frostedflakes: { id: "frostedflakes", name: "Frosted Flakes", category: "cereal", calories: 315 },
  luckycharms: { id: "luckycharms", name: "Lucky Charms", category: "cereal", calories: 300 },
  cocoapuffs: { id: "cocoapuffs", name: "Cocoa Puffs", category: "cereal", calories: 300 },
  // Drinks
  cocacola: { id: "cocacola", name: "Coca-Cola", category: "drinks", calories: 240 },
  // Other
  snackpack: { id: "snackpack", name: "Snack Pack", category: "snack", calories: 180, foodLove: "pudding" },
  nutella: { id: "nutella", name: "Nutella", category: "snack", calories: 200, foodLove: "chocolate spread" },
  slimjim: { id: "slimjim", name: "Slim Jim", category: "snack", calories: 260, foodLove: "beef jerky" },
  almonds: { id: "almonds", name: "Almonds", category: "snack", calories: 330, foodLove: "nuts" },
  trailmix: { id: "trailmix", name: "Trail Mix", category: "snack", calories: 340, foodLove: "trail mix" },
};

// Fallback for unknown brands
const DEFAULT_TUTORIAL_BRAND: TutorialBrand = { id: "snack", name: "Your Snack", category: "snack", calories: 350 };

function getFoodLove(brand: TutorialBrand | null): string {
  if (!brand) return "your favorite snacks";
  if (brand.foodLove) return brand.foodLove;
  return CATEGORY_FOOD_LOVE[brand.category] ?? "snacks";
}

function getTutorialBrand(snackId: string | null): TutorialBrand | null {
  if (!snackId) return null;
  return TUTORIAL_BRANDS[snackId] ?? { ...DEFAULT_TUTORIAL_BRAND, id: snackId, name: snackId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) };
}

// Map landing-page brand IDs to their primary swap ID in the DB
const BRAND_TO_SWAP_ID: Record<string, string> = {
  benjerrys: "benjerrys-halotop",
  haagendazs: "haagendazs-halotop",
  talenti: "talenti-halotop",
  drumstick: "drumstick-halotop-bar",
  entenmanns: "entenmanns-legendary-donut",
  poptarts: "poptart-legendary-swap",
  littledebbie: "littledebbie-built",
  takis: "takis-quest-spicy",
  cheezit: "cheezit-whisps-parm",
  lays: "lays-quest-original",
  doritos: "doritos-quest-loaded",
  ruffles: "ruffles-quest-sco",
  pringles: "pringles-quest-cheddar",
  cheetos: "hot-cheetos",
  orville: "popcorn-moviebutter-smartpop",
  mms: "mms-lilys-almonds",
  skittles: "skittles-smartsweets",
  sourpatchkids: "sour-gummy-swap",
  twix: "twix-fitcrunch",
  kitkat: "kitkat-powercrunch",
  snickers: "snickers-hi-protein-swap",
  reeses: "reeses-quest-cups",
  hersheys: "hersheys-lilys-bar",
  girlscoutcookies: "girlscout-catalina",
  chipsahoy: "chipsahoy-highkey",
  cinnamontoastcrunch: "ctc-magicspoon",
  frostedflakes: "frostedflakes-magicspoon",
  luckycharms: "luckycharms-magicspoon",
  cocoapuffs: "cocoapuffs-magicspoon",
  cocacola: "cocacola-cokezero",
  snackpack: "snackpack-jello-sf",
  nutella: "nutella-professor-nutz",
  slimjim: "slimjim-chomps",
  almonds: "almonds-to-edamame",
  trailmix: "trail-mix",
};

function getSwapCalories(original: number): number {
  // Fallback only — real swap cals come from DB via BRAND_TO_SWAP_ID
  return Math.round((original * 0.48) / 10) * 10;
}

// ─── Constants ───────────────────────────────────
const DEMO_SWAP_IDS = [
  "benjerrys-halotop",        // 780 cal saved — Creamy Dessert
  "entenmanns-legendary-donut", // 420 cal saved — Sweet Crunch
  "takis-quest-spicy",        // 350 cal saved — Spicy Crunch
];

const frequencyChoices = [7, 6, 5, 4, 3, 2, 1] as const;

const TOUR_STEPS = [
  {
    target: "center",
    message:
      "This is a sample of what your personalized snack dashboard looks like.",
    waitForAction: false,
  },
  {
    target: "frequency",
    message:
      "Try it — tap a frequency to change how often you eat this snack.",
    waitForAction: true, // must click frequency to advance
  },
  {
    target: "stats",
    message:
      "See how the numbers changed? Every swap, every frequency — your body keeps score.",
    waitForAction: false,
  },
  {
    target: "dismiss",
    message:
      "We added a few options to get you started. Don\u2019t want one? Tap the X to remove it.",
    waitForAction: true, // must click X to advance
  },
  {
    target: "search",
    message:
      "Now add your own. Search for any snack you love.",
    waitForAction: false,
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
  const skipToDashboard = searchParams.get("skip") === "dashboard";

  const [allPairs, setAllPairs] = useState<SnackSwapPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [frequencyByPairId, setFrequencyByPairId] = useState<Record<string, number>>({});

  // Flow state machine — ?skip=dashboard bypasses tutorial, otherwise show tutorial if snackParam
  const [flowState, setFlowState] = useState<FlowState>(skipToDashboard ? "dashboard" : snackParam ? "compare" : "dashboard");

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
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [userAddedCount, setUserAddedCount] = useState(0);
  const [showPaceToast, setShowPaceToast] = useState(false);
  const paceToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Snack request
  const [showSnackRequest, setShowSnackRequest] = useState(false);
  const [snackRequestText, setSnackRequestText] = useState("");
  const [snackRequestEmail, setSnackRequestEmail] = useState("");
  const [snackRequestSent, setSnackRequestSent] = useState(false);
  const [snackRequestSubmitting, setSnackRequestSubmitting] = useState(false);

  // Idle hint for + button in search results
  const [showAddHint, setShowAddHint] = useState(false);
  const addHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTrackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tour
  const [tourStep, setTourStep] = useState(0);
  const [tourDismissed, setTourDismissed] = useState(false);
  const [tourTriggered, setTourTriggered] = useState(skipToDashboard);

  // Projection
  const [ordersPerWeek, setOrdersPerWeek] = useState(7);

  const searchRef = useRef<HTMLInputElement>(null);
  const searchSectionRef = useRef<HTMLDivElement>(null);
  const firstCardRef = useRef<HTMLDivElement>(null);
  const frequencyAsideRef = useRef<HTMLElement | null>(null);
  const statsBannerRef = useRef<HTMLDivElement>(null);
  const secondCardRef = useRef<HTMLDivElement>(null);
  const dismissButtonRef = useRef<HTMLButtonElement>(null);
  const [tourDialogPos, setTourDialogPos] = useState<{ top: number; left: number; arrowDir: "left" | "up" | "up-right" } | null>(null);

  // ─── Analytics (shared session via sessionStorage) ──────────────────────────────────
  const sessionIdRef = useRef<string>("");
  const capturedEmailRef = useRef<string | null>(null);

  // Initialize session from sessionStorage (persists across page navigations)
  useEffect(() => {
    const existingSession = sessionStorage.getItem("bb_session_id");
    if (existingSession) {
      sessionIdRef.current = existingSession;
    } else {
      const newId = `sb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
        source: "Snack Bible",
        timestamp: new Date().toISOString(),
        screen_width: window.innerWidth,
        screen_height: window.innerHeight,
        device_pixel_ratio: window.devicePixelRatio,
      },
      referrer: document.referrer || null,
      page_url: window.location.href,
    };
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {}); // fire-and-forget
  }, []);

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

        // Build initial plan: tutorial snack's swap + demo swaps
        const planSet = new Set<string>();
        if (snackParam) {
          const mappedId = BRAND_TO_SWAP_ID[snackParam];
          if (mappedId) planSet.add(mappedId);
        }
        DEMO_SWAP_IDS.forEach((id) => planSet.add(id));
        setMyPlanIds(planSet);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [snackParam]);

  // ─── Tutorial brand + real swap data from DB ────
  const tutorialBrand = useMemo(() => getTutorialBrand(snackParam), [snackParam]);
  const tutorialSwapPair = useMemo(() => {
    if (!snackParam || allPairs.length === 0) return null;
    const swapId = BRAND_TO_SWAP_ID[snackParam];
    if (!swapId) return null;
    return allPairs.find((p) => p.id === swapId) ?? null;
  }, [snackParam, allPairs]);
  const tutorialOriginalCal = tutorialSwapPair?.original.calories ?? tutorialBrand?.calories ?? 350;
  const tutorialSwapCal = tutorialSwapPair?.swap.calories ?? getSwapCalories(tutorialOriginalCal);
  const tutorialCalSaved = tutorialOriginalCal - tutorialSwapCal;

  const planPairs = useMemo(() => {
    if (allPairs.length === 0) return [];
    // Tutorial snack first, then the rest
    const ordered: SnackSwapPair[] = [];
    const seen = new Set<string>();

    if (snackParam) {
      const mappedId = BRAND_TO_SWAP_ID[snackParam] ?? snackParam;
      const tp = allPairs.find((p) => p.id === mappedId);
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
    trackEvent("snack_bible_dismiss_swap", { pair_id: pairId });
    // Step 3 = "tap the X to remove" — when they do, advance to step 4 (search)
    if (tourStep === 3 && !tourDismissed) {
      setTimeout(() => {
        setTourStep(4);
        searchSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 400);
    }
  }

  function handleFrequencyChange(pairId: string, value: number) {
    const next = clampFrequency(value);
    const prev = frequencyByPairId[pairId] ?? 7;
    setFrequencyByPairId((old) => ({ ...old, [pairId]: next }));
    trackEvent("snack_bible_frequency_change", { pair_id: pairId, old_freq: prev, new_freq: next });
    // Step 1 = "tap a frequency" — when they do, advance to step 2 (stats reaction)
    if (tourStep === 1 && !tourDismissed) {
      setTimeout(() => {
        setTourStep(2);
        // Scroll to stats banner so they see the numbers change
        if (statsBannerRef.current) {
          statsBannerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 400);
    }
  }

  function handleAddToPlan(pairId: string) {
    setMyPlanIds((prev) => new Set(prev).add(pairId));
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.delete(pairId);
      return next;
    });
    setShowAddHint(false);
    if (addHintTimerRef.current) clearTimeout(addHintTimerRef.current);
    const newCount = userAddedCount + 1;
    setUserAddedCount(newCount);
    trackEvent("snack_bible_add_swap", { pair_id: pairId, plan_size: myPlanIds.size + 1, add_number: newCount });

    // Every add: show pace toast immediately, then auto-dismiss
    if (paceToastTimerRef.current) clearTimeout(paceToastTimerRef.current);
    setShowPaceToast(true);
    paceToastTimerRef.current = setTimeout(() => setShowPaceToast(false), 3500);

    // First user-added swap: bridge modal appears 2s after toast
    if (newCount === 1) {
      setTimeout(() => {
        setShowPaceToast(false);
        setShowSaveModal(true);
        trackEvent("snack_bible_bridge_shown", { weekly_cal_saved: totals.weeklyCalories, fat_loss: totals.weeklyFatLoss, plan_size: planPairs.length });
      }, 2000);
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
      trackEvent("snack_bible_tutorial_start", { snack_param: snackParam, plan_size: myPlanIds.size });
    }
  }

  // Dynamic tour positioning — re-calculates on scroll/resize so dialog
  // always stays anchored to its target element
  const updateTourPosition = useCallback(() => {
    // Step 0 is centered — no element to track
    if (tourStep === 0) {
      setTourDialogPos(null);
      return;
    }
    const targetRef = tourStep === 1 ? frequencyAsideRef.current
                    : tourStep === 2 ? statsBannerRef.current
                    : tourStep === 3 ? dismissButtonRef.current
                    : tourStep === 4 ? searchSectionRef.current
                    : null;
    if (!targetRef) return;
    const rect = targetRef.getBoundingClientRect();
    const vw = window.innerWidth;
    // Tour overlay is position:fixed so all coords are viewport-relative (no scrollY)
    if (tourStep === 3) {
      // Position below the X button, right-aligned so dialog doesn't overflow right edge
      const xCenter = rect.left + rect.width / 2;
      setTourDialogPos({
        top: rect.bottom + 12,
        // Right-align: dialog right edge aligns with X button center + small offset
        left: xCenter,
        arrowDir: "up-right",
      });
    } else if (vw < 1280 || tourStep === 2 || tourStep === 4) {
      setTourDialogPos({
        top: rect.bottom + 12,
        left: Math.max(16, Math.min(rect.left + rect.width / 2, vw - 200)),
        arrowDir: "up",
      });
    } else {
      setTourDialogPos({
        top: rect.top + rect.height / 2,
        left: rect.right + 16,
        arrowDir: "left",
      });
    }
  }, [tourStep]);

  // Re-position dialog on scroll, resize, and step changes
  useEffect(() => {
    if (tourDismissed || !tourTriggered) return;
    if (tourStep === 0) return; // centered step — no element to track
    // Initial position after a short delay (for scroll to settle)
    const timer = setTimeout(updateTourPosition, 100);
    window.addEventListener("scroll", updateTourPosition, true);
    window.addEventListener("resize", updateTourPosition);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", updateTourPosition, true);
      window.removeEventListener("resize", updateTourPosition);
    };
  }, [tourStep, tourDismissed, tourTriggered, updateTourPosition]);

  const handleTourNext = useCallback(() => {
    const next = tourStep + 1;
    if (next >= TOUR_STEPS.length) {
      setTourDismissed(true);
      setTourDialogPos(null);
      trackEvent("snack_bible_tour_completed");
      return;
    }
    setTourStep(next);
    trackEvent("snack_bible_tour_step", { step: next, step_name: TOUR_STEPS[next]?.target });
    if (next === 1 && firstCardRef.current) {
      // Scroll to first card — position will auto-update via useEffect
      firstCardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    } else if (next === 3 && secondCardRef.current) {
      // Step 3 = "dismiss" — scroll to second card to show X button
      secondCardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    } else if (next === 4 && searchSectionRef.current) {
      // Step 4 = "search for any snack" — scroll to search and focus it
      searchSectionRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        if (searchRef.current) {
          searchRef.current.focus();
        }
      }, 600);
    } else {
      // Steps 0 and 2 are centered
      setTourDialogPos(null);
    }
  }, [tourStep]);

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
    capturedEmailRef.current = emailDialogEmail;
    sessionStorage.setItem("bb_email", emailDialogEmail);
    trackEvent("snack_bible_email_captured", { email: emailDialogEmail, plan_size: planPairs.length, weekly_cal_saved: totals.weeklyCalories });
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
              swapPair={tutorialSwapPair}
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
                snackName={getFoodLove(tutorialBrand)}
                originalFullName={tutorialSwapPair ? `${tutorialSwapPair.original.brand} ${tutorialSwapPair.original.name}` : tutorialBrand?.name ?? "Your snack"}
                swapFullName={tutorialSwapPair ? `${tutorialSwapPair.swap.brand} ${tutorialSwapPair.swap.name}` : "Low-Cal Swap"}
                originalCalories={tutorialOriginalCal}
                swapCalories={tutorialSwapCal}
                ordersPerWeek={ordersPerWeek}
                onOrdersChange={setOrdersPerWeek}
                onContinue={advanceToDashboard}
                onEmailCapture={(capturedEmail) => {
                  setEmailDialogEmail(capturedEmail);
                  setEmailSent(true);
                }}
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
              <div className="mb-4 sm:mb-6 text-center">
                <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">
                  Snack Bible
                </p>
                <h1 className="mt-1 text-xl sm:text-3xl font-bold leading-tight">
                  Your Personalized Swap Plan
                </h1>
                <p className="mt-1 sm:mt-2 text-sm sm:text-base text-zinc-400">
                  Adjust frequency. Search for more. Watch the math change.
                </p>
              </div>

              {/* Stats banner */}
              {!loading && planPairs.length > 0 && (
                <div ref={statsBannerRef} className="sticky top-2 z-20 rounded-xl sm:rounded-2xl border border-emerald-500/30 bg-zinc-950/90 p-2 sm:p-3 shadow-[0_12px_48px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-300">
                      My Plan
                    </span>
                    <span className="text-[10px] sm:text-xs text-zinc-500">{planPairs.length} swaps</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 sm:gap-2">
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
                      setShowAddHint(false);
                      // Auto-dismiss tour when user starts typing (step 4)
                      if (tourStep === 4 && !tourDismissed && e.target.value.trim()) {
                        setTourDismissed(true);
                        setTourDialogPos(null);
                      }
                      // Idle hint timer — show hint after 1.2s of no typing (only first time)
                      if (addHintTimerRef.current) clearTimeout(addHintTimerRef.current);
                      if (e.target.value.trim() && userAddedCount === 0) {
                        addHintTimerRef.current = setTimeout(() => {
                          setShowAddHint(true);
                        }, 1200);
                      }
                      // Debounced search tracking (fire after 800ms idle)
                      if (searchTrackTimerRef.current) clearTimeout(searchTrackTimerRef.current);
                      const q = e.target.value.trim();
                      if (q) {
                        searchTrackTimerRef.current = setTimeout(() => {
                          trackEvent("snack_bible_search", { query: q, results_count: allPairs.filter(p => [p.title, p.original.name, p.original.brand, p.swap.name, p.craving, p.context].join(" ").toLowerCase().includes(q.toLowerCase())).length });
                        }, 800);
                      }
                    }}
                    placeholder="Search for your favorite snack..."
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 sm:px-4 py-3 sm:py-3.5 text-base sm:text-lg text-white placeholder-zinc-500 outline-none transition-colors focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
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
                        {searchResults.map((pair, idx) => {
                          const inPlan = myPlanIds.has(pair.id) && !dismissedIds.has(pair.id);
                          return (
                            <div key={pair.id} className="relative [&>article]:pr-0">
                              <SnackSwapRow
                                pair={pair}
                                frequency={frequencyByPairId[pair.id] ?? 7}
                                onFrequencyChange={(v) => handleFrequencyChange(pair.id, v)}
                                hasTopRightButton
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
                              {/* Idle hint — appears on first result after 1.2s pause */}
                              {idx === 0 && showAddHint && !inPlan && (
                                <motion.div
                                  initial={{ opacity: 0, x: 8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0 }}
                                  className="absolute right-14 top-2 z-10 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black shadow-lg"
                                >
                                  Tap + to add to your plan
                                  <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 rotate-45 bg-emerald-500" />
                                </motion.div>
                              )}
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

              {!loading && planPairs.length > 0 && !searchQuery.trim() && (
                <div className="mt-5 space-y-4">
                  <AnimatePresence mode="popLayout">
                    {planPairs.map((pair, index) => (
                      <motion.div
                        key={pair.id}
                        ref={index === 0 ? firstCardRef : index === 1 ? secondCardRef : undefined}
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
                          dismissRef={index === 1 ? dismissButtonRef : undefined}
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

              {/* Bottom CTA — gap message + concierge/VSL */}
              {!loading && planPairs.length > 0 && !searchQuery.trim() && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                  className="mt-16 mb-8"
                >
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-center">
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-3">The bigger picture</p>
                    <p className="text-lg font-semibold text-white mb-2">
                      You just optimized {planPairs.length} snacks.
                    </p>
                    <p className="text-base text-zinc-400 mb-1">
                      Most people eat 20-30 different things a week.
                    </p>
                    <p className="text-base text-zinc-400 mb-6">
                      Imagine this for every restaurant, every grocery run, every meal in your week — built from <span className="text-white font-semibold">your</span> actual eating patterns.
                    </p>

                    <a
                      href="/concierge?from=snack-bible"
                      onClick={() => trackEvent("snack_bible_bottom_cta_concierge", { plan_size: planPairs.length })}
                      className="block w-full rounded-xl bg-emerald-500 px-8 py-4 text-base font-bold text-black transition-colors hover:bg-emerald-400"
                    >
                      Want this for your entire week?
                    </a>
                    <a
                      href="/vsl?from=snack-bible"
                      onClick={() => trackEvent("snack_bible_bottom_cta_vsl", { plan_size: planPairs.length })}
                      className="mt-3 block w-full rounded-xl border border-zinc-700 px-6 py-3 text-center text-sm font-medium text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
                    >
                      Watch the free training
                    </a>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Don't See Your Snack? ─── */}
        {flowState === "dashboard" && (
          <div className="mt-12 mb-8 text-center">
            {!showSnackRequest ? (
              <button
                onClick={() => setShowSnackRequest(true)}
                className="text-sm text-zinc-500 underline underline-offset-4 decoration-zinc-700 hover:text-zinc-300 transition-colors"
              >
                Don&apos;t see your snack? Let us know and we&apos;ll add it.
              </button>
            ) : snackRequestSent ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <p className="text-sm text-emerald-400 font-medium">Got it! We&apos;ll add your snack and let you know.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 max-w-sm mx-auto">
                <p className="text-sm font-medium text-white mb-3">What snack do you want us to add?</p>
                <input
                  type="text"
                  value={snackRequestText}
                  onChange={(e) => setSnackRequestText(e.target.value)}
                  placeholder="e.g. Takis Fuego, Cosmic Brownies..."
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 mb-2"
                />
                <input
                  type="email"
                  value={snackRequestEmail}
                  onChange={(e) => setSnackRequestEmail(e.target.value)}
                  placeholder="Your email (we'll notify you)"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 mb-3"
                />
                <div className="flex gap-2">
                  <button
                    disabled={!snackRequestText.trim() || snackRequestSubmitting}
                    onClick={async () => {
                      setSnackRequestSubmitting(true);
                      try {
                        await fetch("/api/feedback", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            rating: "snack_request",
                            comment: snackRequestText.trim(),
                            notifyEmail: snackRequestEmail.trim() || null,
                            page: "snack-bible",
                          }),
                        });
                        trackEvent("snack_bible_snack_request", { snack: snackRequestText.trim() });
                        setSnackRequestSent(true);
                      } catch {
                        // silent
                      } finally {
                        setSnackRequestSubmitting(false);
                      }
                    }}
                    className="flex-1 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-emerald-400 disabled:opacity-40"
                  >
                    {snackRequestSubmitting ? "Sending..." : "Submit"}
                  </button>
                  <button
                    onClick={() => setShowSnackRequest(false)}
                    className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
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
            {/* Overlay — step 1 cuts out frequency, step 2 cuts out stats, step 3 cuts out search */}
            {(() => {
              // Determine which ref to cut out for this step
              const cutoutRef = tourStep === 1 ? frequencyAsideRef.current
                              : tourStep === 2 ? statsBannerRef.current
                              : tourStep === 3 ? dismissButtonRef.current
                              : tourStep === 4 ? searchSectionRef.current
                              : null;
              const maskId = `tour-mask-${tourStep}`;
              if (cutoutRef) {
                const r = cutoutRef.getBoundingClientRect();
                return (
                  <>
                    <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ zIndex: 1 }}>
                      <defs>
                        <mask id={maskId}>
                          <rect width="100%" height="100%" fill="white" />
                          <rect
                            x={r.left - 4}
                            y={r.top - 4}
                            width={r.width + 8}
                            height={r.height + 8}
                            rx={16}
                            fill="black"
                          />
                        </mask>
                      </defs>
                      <rect width="100%" height="100%" fill="rgba(0,0,0,0.5)" mask={`url(#${maskId})`} />
                    </svg>
                    {/* Click-blocker everywhere EXCEPT the cutout (so buttons inside are clickable) */}
                    {TOUR_STEPS[tourStep]?.waitForAction && (
                      <div
                        className="pointer-events-auto absolute inset-0"
                        style={{ zIndex: 2, clipPath: `polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% ${r.top - 4}px, ${r.left - 4}px ${r.top - 4}px, ${r.left - 4}px ${r.bottom + 4}px, ${r.right + 4}px ${r.bottom + 4}px, ${r.right + 4}px ${r.top - 4}px, 0% ${r.top - 4}px)` }}
                      />
                    )}
                    {/* For non-waitForAction steps, clicking the dark area advances */}
                    {!TOUR_STEPS[tourStep]?.waitForAction && (
                      <div
                        className="pointer-events-auto absolute inset-0"
                        style={{ zIndex: 2, clipPath: `polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% ${r.top - 4}px, ${r.left - 4}px ${r.top - 4}px, ${r.left - 4}px ${r.bottom + 4}px, ${r.right + 4}px ${r.bottom + 4}px, ${r.right + 4}px ${r.top - 4}px, 0% ${r.top - 4}px)` }}
                        onClick={handleTourNext}
                      />
                    )}
                  </>
                );
              }
              // No cutout (step 0) — plain dark overlay
              return (
                <div
                  className="pointer-events-auto absolute inset-0 bg-black/40"
                  onClick={TOUR_STEPS[tourStep]?.waitForAction ? undefined : handleTourNext}
                />
              );
            })()}
            <motion.div
              key={tourStep}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="pointer-events-auto z-50 rounded-2xl border border-emerald-500/40 bg-zinc-900 p-4 sm:p-5 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
              style={(() => {
                const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
                const base = { position: "fixed" as const };
                if (tourStep === 0) {
                  return { ...base, left: 16, right: 16, top: "50%", transform: "translateY(-50%)", maxWidth: 384 };
                }
                if (!tourDialogPos) {
                  return { ...base, left: 16, right: 16, bottom: "2rem", maxWidth: 384 };
                }
                // Mobile: always full-width with 16px margins
                if (isMobile) {
                  return { ...base, top: Math.min(tourDialogPos.top, window.innerHeight - 180), left: 16, right: 16 };
                }
                // Desktop: precise positioning
                if (tourDialogPos.arrowDir === "up-right") {
                  return { ...base, top: tourDialogPos.top, right: Math.max(16, window.innerWidth - tourDialogPos.left - 16), width: 384 };
                }
                if (tourDialogPos.arrowDir === "up") {
                  return { ...base, top: tourDialogPos.top, left: tourDialogPos.left, transform: "translateX(-50%)", width: 384 };
                }
                return { ...base, top: tourDialogPos.top, left: tourDialogPos.left, transform: "translateY(-50%)", width: 384 };
              })()}
            >
              {/* Arrow pointing at target — positioned to point at the target element */}
              {tourStep >= 1 && tourDialogPos && (
                tourDialogPos.arrowDir === "left" ? (
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2">
                    <div className="h-0 w-0 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent border-r-emerald-500/40" />
                  </div>
                ) : (
                  /* "up" and "up-right" — arrow points up, positioned at target's X relative to dialog's left edge (16px) */
                  <div className="absolute -top-2" style={{ left: Math.max(16, Math.min(tourDialogPos.left - 16, (typeof window !== "undefined" ? window.innerWidth : 400) - 48)) }}>
                    <div className="h-0 w-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-emerald-500/40" />
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
                  onClick={() => { setTourDismissed(true); setTourDialogPos(null); trackEvent("snack_bible_tour_skipped", { skipped_at_step: tourStep }); }}
                  className="text-sm text-zinc-500 hover:text-zinc-300"
                >
                  Skip tour
                </button>
                {TOUR_STEPS[tourStep]?.waitForAction ? (
                  <span className="text-xs text-emerald-500/70 italic">{tourStep === 3 ? "Tap the X to remove" : "Try it now"}</span>
                ) : (
                  <button
                    onClick={handleTourNext}
                    className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-black transition-colors hover:bg-emerald-400"
                  >
                    {tourStep === TOUR_STEPS.length - 1 ? "Got it" : "Next"}
                  </button>
                )}
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
                  href="/concierge?from=snack-bible"
                  onClick={() => trackEvent("snack_bible_crossroads_concierge", { plan_size: planPairs.length })}
                  className="block w-full rounded-xl bg-emerald-500 px-6 py-3 text-center text-base font-bold uppercase tracking-wider text-black transition-colors hover:bg-emerald-400"
                >
                  Want this for your entire week?
                </a>
                <a
                  href="/vsl?from=snack-bible"
                  onClick={() => trackEvent("snack_bible_crossroads_vsl", { plan_size: planPairs.length })}
                  className="block w-full rounded-xl border border-zinc-700 px-6 py-3 text-center text-base font-semibold text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
                >
                  Watch the free training
                </a>
                <button
                  onClick={() => { setShowEmailDialog(false); trackEvent("snack_bible_crossroads_dismissed", { plan_size: planPairs.length }); }}
                  className="w-full py-2 text-center text-sm text-zinc-500 transition-colors hover:text-zinc-300"
                >
                  Keep building my plan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Bridge Modal (triggers on first user-added swap) ─── */}
      <AnimatePresence>
        {showSaveModal && (
          <motion.div
            key="save-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
          >
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setShowSaveModal(false)}
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
              <p className="text-center text-lg font-semibold text-white">
                {totals.weeklyFatLoss >= 0.1
                  ? `You're on pace to lose ${totals.weeklyFatLoss.toFixed(1)} lbs of fat a week.`
                  : "Your first swap is locked in."}
              </p>
              <p className="mt-2 text-center text-sm text-zinc-400">
                Just from {planPairs.length} snack swap{planPairs.length === 1 ? "" : "s"}.
              </p>

              <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                <p className="text-sm text-zinc-300 leading-relaxed">
                  You haven&apos;t even touched your <span className="text-white font-medium">DoorDash orders</span> yet.
                </p>
              </div>

              <div className="mt-5 space-y-3">
                <a
                  href="/concierge?from=snack-bible"
                  onClick={() => trackEvent("snack_bible_bridge_concierge", { weekly_cal_saved: totals.weeklyCalories, plan_size: planPairs.length })}
                  className="block w-full rounded-xl bg-emerald-500 px-6 py-3.5 text-center text-base font-bold text-black transition-colors hover:bg-emerald-400"
                >
                  Want someone to do this for everything you eat?
                </a>
                <a
                  href="/vsl?from=snack-bible"
                  onClick={() => trackEvent("snack_bible_bridge_vsl", { weekly_cal_saved: totals.weeklyCalories, plan_size: planPairs.length })}
                  className="block w-full rounded-xl border border-zinc-700 px-6 py-3 text-center text-sm font-semibold text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
                >
                  Watch the free training
                </a>
              </div>

              <button
                onClick={() => { setShowSaveModal(false); trackEvent("snack_bible_bridge_dismissed", { weekly_cal_saved: totals.weeklyCalories, plan_size: planPairs.length }); }}
                className="mt-4 w-full py-2 text-center text-sm text-zinc-500 transition-colors hover:text-zinc-300"
              >
                Keep building my plan
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* Pace toast — appears after each swap add (except first which shows bridge) */}
        {showPaceToast && totals.weeklyFatLoss >= 0.1 && (
          <motion.div
            key="pace-toast"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-emerald-500/30 bg-zinc-900/95 px-5 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-sm"
            onClick={() => setShowPaceToast(false)}
          >
            <p className="whitespace-nowrap text-sm font-semibold text-white">
              You&apos;re on pace to lose <span className="text-emerald-400">{totals.weeklyFatLoss.toFixed(1)} lbs</span> of fat a week
            </p>
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

// ─── Snack Feedback Widget (mirrors Bible's FeedbackWidget) ──
const SNACK_RATING_OPTIONS = [
  { value: "Spot on" as const, label: "Spot on", color: "emerald" },
  { value: "Close but off" as const, label: "Close but off", color: "yellow" },
  { value: "Bad swap" as const, label: "Bad swap", color: "red" },
] as const;
type SnackRatingValue = typeof SNACK_RATING_OPTIONS[number]["value"];

function SnackFeedbackWidget({ snackId, originalName, originalCal, swapName, swapCal, calSaved }: {
  snackId: string;
  originalName: string;
  originalCal: number;
  swapName: string;
  swapCal: number;
  calSaved: number;
}) {
  const [state, setState] = useState<"idle" | "open" | "sent">("idle");
  const [rating, setRating] = useState<SnackRatingValue | null>(null);
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
        page: "snack-bible",
        section: "swap_feedback",
        snackId,
        originalMeal: originalName,
        originalCalories: originalCal,
        swapMeal: swapName,
        swapCalories: swapCal,
        savings: calSaved,
        url: typeof window !== "undefined" ? window.location.href : "",
        ...(wantNotify && notifyEmail ? { notifyEmail } : {}),
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
          <motion.svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-3 text-center">
        <button onClick={() => setState("open")} className="text-xs text-zinc-500 transition-colors hover:text-zinc-300">
          Not quite right? <span className="text-emerald-400 hover:text-emerald-300">Suggest a better swap &rarr;</span>
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
        {SNACK_RATING_OPTIONS.map(({ value, label, color }) => (
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
      <AnimatePresence>
        {showNotify && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="mt-3 overflow-hidden">
            <label className="flex items-center gap-2 cursor-pointer group">
              <button type="button" onClick={() => setWantNotify(!wantNotify)}
                className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-all ${
                  wantNotify ? "border-emerald-500 bg-emerald-500" : "border-zinc-600 bg-zinc-900 group-hover:border-zinc-500"
                }`}>
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

// ─── Compare Screen (Template-based, no DB lookup) ──
function CompareScreen({
  brand,
  originalCal,
  swapCal,
  swapRevealed,
  onReveal,
  onContinue,
  calSaved,
  swapPair,
}: {
  brand: TutorialBrand | null;
  originalCal: number;
  swapCal: number;
  swapRevealed: boolean;
  onReveal: () => void;
  onContinue: () => void;
  calSaved: number;
  swapPair?: SnackSwapPair | null;
}) {
  const brandName = brand?.name ?? "Your Snack";
  const brandId = brand?.id ?? "snack";
  const logoSrc = swapPair?.original.image_url ?? `/snack-logos/${brandId}.png`;
  const swapLogoSrc = swapPair?.swap.image_url ?? logoSrc;
  const swapName = swapPair ? `${swapPair.swap.brand} ${swapPair.swap.name}` : `Low-Cal ${brandName}`;

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
            <span className="text-emerald-400">{lbsPerWeek.toFixed(1)} lbs a week</span>
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
            <div className="relative h-40 w-40 sm:h-48 sm:w-48 mx-auto overflow-hidden rounded-xl bg-white">
              <Image
                src={logoSrc}
                alt={brandName}
                fill
                className="object-contain p-[6px]"
                sizes="208px"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
            <p className="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-wider mt-1.5 sm:mt-2">
              Your Favorite Snack
            </p>
          </div>
          <div className="min-h-[2.5rem] sm:min-h-[3rem] flex items-end justify-center mb-2 sm:mb-3">
            <p className="text-center text-base sm:text-lg font-semibold text-white">{brandName}</p>
          </div>
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
                  <div className="w-40 h-40 sm:w-48 sm:h-48 mx-auto rounded-xl overflow-hidden opacity-20 blur-sm bg-white">
                    <Image
                      src={logoSrc}
                      alt=""
                      fill
                      className="object-contain p-[6px]"
                      sizes="208px"
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
              <div className="min-h-[2.5rem] sm:min-h-[3rem] flex items-end justify-center mb-2 sm:mb-3">
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
                  className="relative w-40 h-40 sm:w-48 sm:h-48 mx-auto rounded-xl overflow-hidden bg-white"
                >
                  <Image
                    src={swapLogoSrc}
                    alt={swapName}
                    fill
                    className="object-contain p-[6px]"
                    sizes="208px"
                    unoptimized
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </motion.div>
                <p className="text-[10px] sm:text-xs uppercase tracking-wider mt-1.5 sm:mt-2">
                  <span className="text-emerald-400">Optimized Snack</span>
                </p>
              </div>
              <p className="text-center text-base sm:text-lg font-semibold text-white mb-2 sm:mb-3">{swapName}</p>
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

      {/* Post-reveal rationale */}
      <AnimatePresence>
        {swapRevealed && swapPair?.rationale && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-3 sm:mt-4 text-center text-xs sm:text-sm italic text-zinc-400 leading-relaxed px-2"
          >
            {swapPair.rationale}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Pre-reveal: Show me the swap button */}
      {!swapRevealed && (
        <div className="mt-4 sm:mt-8 text-center">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onReveal}
            className="w-full rounded-2xl bg-emerald-500 px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-bold uppercase tracking-wider text-black transition-all hover:bg-emerald-400 sm:w-auto"
          >
            Show me the swap
          </motion.button>
          <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-zinc-500">
            No gym. No meal prep. Just ordering smarter.
          </p>
        </div>
      )}

      {/* Post-reveal: Bible-style bottom section */}
      <AnimatePresence>
        {swapRevealed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {/* JUST FROM THIS ONE SWAP card */}
            <div className="mt-3 sm:mt-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-6 text-center">
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-zinc-500 font-medium mb-3">
                Just from this one swap
              </p>
              <div className="flex justify-center gap-6 sm:gap-10">
                <div>
                  <p className="text-2xl sm:text-3xl font-black text-emerald-400">
                    <AnimatedCalories value={calSaved} className="text-2xl sm:text-3xl font-black text-emerald-400" />
                  </p>
                  <p className="text-[10px] sm:text-xs text-zinc-500">cal saved per swap</p>
                </div>
                <div className="w-px bg-zinc-800" />
                <div>
                  <p className="text-2xl sm:text-3xl font-black text-white">{lbsPerWeek.toFixed(1)}</p>
                  <p className="text-[10px] sm:text-xs text-zinc-500">lbs/week</p>
                </div>
              </div>

              <p className="mt-4 text-xs sm:text-sm text-zinc-500">
                No gym. No meal prep. Just ordering smarter.
              </p>

              <p className="mt-4 text-xs sm:text-sm text-zinc-400">
                Want to see exactly when you&apos;ll hit your goal weight?
              </p>

              {/* White CTA button (matches Bible) */}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                whileTap={{ scale: 0.97 }}
                onClick={onContinue}
                className="mt-3 w-full rounded-2xl bg-white px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-semibold text-black transition-all hover:bg-zinc-200"
              >
                Personalize this for my goals
              </motion.button>

              <p className="mt-2 text-xs text-zinc-600">
                2 quick questions. See your personal timeline.
              </p>
            </div>

            {/* "Not quite right?" feedback widget — outside the card */}
            <SnackFeedbackWidget
              snackId={brand?.id ?? "unknown"}
              originalName={brandName}
              originalCal={originalCal}
              swapName={swapName}
              swapCal={swapCal}
              calSaved={calSaved}
            />
          </motion.div>
        )}
      </AnimatePresence>
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
// ─── Snack Bible generating screen constants ───
const SNACK_REPORT_DURATION_MS = 10500;
const SNACK_GENERATING_BLOCKS = [
  {
    threshold: 10,
    label: "Why diets failed you",
    copy: "They asked you to eat less. We just showed you how to snack smarter.",
  },
  {
    threshold: 40,
    label: "What just happened",
    copy: "Same craving. Same satisfaction. Fewer calories. No willpower required.",
  },
  {
    threshold: 70,
    label: "How it works",
    bullets: [
      "We swap your real snacks, not your lifestyle.",
      "Built for your worst cravings. No restriction.",
      "Small changes that add up to real weight loss every week.",
    ],
  },
];
const SNACK_REPORT_STEPS = [
  { threshold: 20, label: "Adding up your weekly calorie savings" },
  { threshold: 55, label: "Mapping your weight loss timeline" },
  { threshold: 85, label: "Putting together your swap plan" },
];

function ProjectionScreen({
  currentWeight,
  goalWeight,
  calSavedPerSwap,
  snackName,
  originalFullName,
  swapFullName,
  originalCalories,
  swapCalories,
  ordersPerWeek,
  onOrdersChange,
  onContinue,
  onEmailCapture,
  onBack,
}: {
  currentWeight: number;
  goalWeight: number;
  calSavedPerSwap: number;
  snackName: string;
  originalFullName: string;
  swapFullName: string;
  originalCalories: number;
  swapCalories: number;
  ordersPerWeek: number;
  onOrdersChange: (n: number) => void;
  onContinue: () => void;
  onEmailCapture?: (email: string) => void;
  onBack: () => void;
}) {
  const [animationDone, setAnimationDone] = useState(false);
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<"projection" | "generating">("projection");
  const [genProgress, setGenProgress] = useState(0);
  const [genComplete, setGenComplete] = useState(false);

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

  // Generating screen progress + send email at 100%
  useEffect(() => {
    if (phase !== "generating") return;
    const startedAt = Date.now();
    let emailFired = false;
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const pct = Math.min(100, Math.round((elapsed / SNACK_REPORT_DURATION_MS) * 100));
      setGenProgress(pct);
      if (pct >= 100) {
        window.clearInterval(timer);
        setGenComplete(true);
        if (!emailFired && email.includes("@")) {
          emailFired = true;
          onEmailCapture?.(email);
          fetch("/api/send-swap-plan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              currentWeight,
              goalWeight,
              calSavedPerOrder: calSavedPerSwap,
              lbsPerWeek,
              weeksToGoal,
              targetDate: targetDateStr,
              ordersPerWeek,
              swapName: swapFullName,
              restaurantName: originalFullName,
              originalCalories,
              swapCalories,
              source: "Snack Bible",
            }),
          }).catch(() => { /* best-effort */ });
        }
      }
    }, 120);
    return () => window.clearInterval(timer);
  }, [phase, email, currentWeight, goalWeight, calSavedPerSwap, lbsPerWeek, weeksToGoal, targetDateStr, ordersPerWeek, snackName]);

  const handleEmailSubmit = () => {
    if (!email.includes("@")) return;
    setGenProgress(0);
    setGenComplete(false);
    setPhase("generating");
  };

  // ─── Generating phase (full-screen) ───
  if (phase === "generating") {
    return (
      <div className="w-full max-w-md">
        <motion.div
          key="generating"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
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
                <h2 className="text-xl font-bold text-white mb-1">Crunching the numbers on your {snackName} swap</h2>
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
                  {SNACK_REPORT_STEPS.map((step) => {
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
                  onClick={onContinue}
                  className="w-full rounded-2xl bg-emerald-500 px-8 py-4 text-base font-bold text-black transition-all hover:bg-emerald-400"
                >
                  See My Full Swap Dashboard
                </motion.button>
              </motion.div>
            )}
          </motion.div>

          {/* Content blocks — fade in at staggered thresholds */}
          {SNACK_GENERATING_BLOCKS.map((block) => {
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
      </div>
    );
  }

  // ─── Projection phase (graph + email capture) ───
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
          Without giving up your love for{" "}
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

      {/* Email capture */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.5 }}
      >
        <p className="text-center text-sm text-zinc-400 mb-4">
          Want us to email you this plan with your {snackName} swap?
        </p>
        <form onSubmit={(e) => { e.preventDefault(); handleEmailSubmit(); }} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="flex-1 rounded-xl border-2 border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none transition-colors"
          />
          <motion.button
            type="submit"
            whileTap={{ scale: 0.95 }}
            className="rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-black hover:bg-emerald-400 transition-colors flex-shrink-0"
          >
            Send it
          </motion.button>
        </form>
        <p className="text-center text-[11px] text-zinc-700 mt-3">Just the plan. No spam. Unsubscribe anytime.</p>
      </motion.div>

      {/* Skip email — go straight to dashboard */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: animationDone ? 1 : 0 }}
        transition={{ duration: 0.5 }}
        className="mt-6 text-center"
      >
        <button
          onClick={onContinue}
          className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          Skip — show me the full dashboard
        </button>
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
    <div className="rounded-lg sm:rounded-xl border border-zinc-700 bg-zinc-900/80 px-2 sm:px-3 py-1.5 sm:py-2.5">
      <p className="text-[10px] sm:text-sm uppercase tracking-wider text-zinc-400 leading-tight">{label}</p>
      <p className="text-lg sm:text-3xl font-bold text-emerald-300">
        <AnimatedValue value={value} decimals={decimals} /> {suffix}
      </p>
    </div>
  );
}

function SnackSwapRow({ pair, frequency, onFrequencyChange, onDismiss, highlighted, frequencyRef, hasTopRightButton, dismissRef }: { pair: SnackSwapPair; frequency: number; onFrequencyChange: (value: number) => void; onDismiss?: () => void; highlighted?: boolean; frequencyRef?: React.RefObject<HTMLElement | null>; hasTopRightButton?: boolean; dismissRef?: React.RefObject<HTMLButtonElement | null> }) {
  const calorieSavings = getCalorieSavings(pair);
  const proteinGain = getProteinGain(pair);
  const weeklyCalorieSavings = calorieSavings * frequency;
  const weeklyFatLoss = weeklyCalorieSavings / 3500;

  return (
    <article className={`relative overflow-hidden rounded-2xl border bg-zinc-900/60 p-3 sm:p-5 ${
      highlighted ? "border-emerald-500/50 shadow-[0_0_24px_rgba(16,185,129,0.1)]" : "border-zinc-800"
    }`}>
      {onDismiss && (
        <button
          ref={dismissRef}
          onClick={onDismiss}
          className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800/80 text-zinc-500 transition-colors hover:bg-rose-500/20 hover:text-rose-400"
          aria-label="Remove swap"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      <div className={`mb-1.5 sm:mb-3 flex items-start justify-between gap-2 sm:gap-3 ${(onDismiss || hasTopRightButton) ? "pr-10 sm:pr-12" : ""}`}>
        <div>
          <h2 className="text-sm sm:text-xl font-semibold leading-tight text-white">{pair.title}</h2>
          <p className="text-xs sm:text-base text-zinc-400 leading-snug">{pair.context}</p>
        </div>
        <span className="shrink-0 rounded-full bg-zinc-800 px-2 sm:px-3 py-0.5 sm:py-1.5 text-[10px] sm:text-sm font-semibold uppercase tracking-wider text-zinc-300">
          {pair.craving}
        </span>
      </div>

      <div className="mb-1.5 sm:mb-3 flex flex-wrap gap-1 sm:gap-2">
        <span className="rounded-full bg-emerald-500/15 px-1.5 sm:px-2.5 py-0.5 sm:py-1.5 text-[10px] sm:text-sm font-semibold uppercase tracking-wider text-emerald-300">
          -{calorieSavings} cal per swap
        </span>
        {proteinGain > 0 && (
          <span className="rounded-full bg-emerald-500/15 px-1.5 sm:px-2.5 py-0.5 sm:py-1.5 text-[10px] sm:text-sm font-semibold uppercase tracking-wider text-emerald-300">
            +{proteinGain}g protein
          </span>
        )}
      </div>

      {/* ── Mobile compact layout (< sm) ── */}
      <div className="sm:hidden">
        <div className="grid grid-cols-2 gap-1.5">
          <CompactSnackCard item={pair.original} tone="rose" label="Current" />
          <CompactSnackCard item={pair.swap} tone="emerald" label="Swap" />
        </div>

        {/* Compact Weekly Impact */}
        <aside ref={(el) => { if (frequencyRef && el && el.offsetHeight > 0) (frequencyRef as React.MutableRefObject<HTMLElement | null>).current = el; }} className="mt-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] px-3 py-2">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Weekly Impact</p>
              <p className="text-2xl font-black leading-none text-emerald-300">
                <AnimatedValue value={weeklyFatLoss} decimals={2} />
                <span className="ml-1 text-xs font-medium text-zinc-300">lbs/wk</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-zinc-400">Saved/Week</p>
              <p className="text-lg font-bold text-emerald-300">
                -<AnimatedValue value={weeklyCalorieSavings} decimals={0} /> cal
              </p>
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-1">
            <p className="text-[10px] uppercase tracking-wider text-zinc-400 mr-0.5">Freq</p>
            {frequencyChoices.map((option) => (
              <button
                key={option}
                onClick={() => onFrequencyChange(option)}
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                  frequency === option ? "bg-emerald-500/25 text-emerald-200" : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {option}x
              </button>
            ))}
          </div>
        </aside>
      </div>

      {/* ── Desktop/tablet layout (>= sm) ── */}
      <div className="hidden sm:block">
        <div className="grid gap-3 xl:grid-cols-[1fr_1fr_280px]">
          <SnackCard label="Current Snack" item={pair.original} tone="rose" />
          <SnackCard label="Smarter Swap" item={pair.swap} tone="emerald" rationale={pair.rationale} />

          <aside ref={(el) => { if (frequencyRef && el && el.offsetHeight > 0) (frequencyRef as React.MutableRefObject<HTMLElement | null>).current = el; }} className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4">
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
      </div>
    </article>
  );
}

/* Compact snack card for mobile — horizontal layout with image + name + calories in one tight row */
function CompactSnackCard({ item, tone, label }: { item: SnackItem; tone: "rose" | "emerald"; label: string }) {
  const borderTone = tone === "emerald" ? "border-emerald-500/35" : "border-rose-500/35";
  const labelTone = tone === "emerald" ? "text-emerald-300" : "text-rose-300";
  const caloriesTone = tone === "emerald" ? "text-emerald-300" : "text-rose-300";

  return (
    <div className={`rounded-xl border ${borderTone} bg-zinc-950/90 p-2`}>
      <p className={`text-[10px] font-semibold uppercase tracking-wider ${labelTone} mb-1`}>{label}</p>
      <div className="flex items-center gap-2">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white">
          {item.image_url ? (
            <Image src={item.image_url} alt={item.name} fill className="object-contain p-[3px]" sizes="48px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-bold text-zinc-400">
              {item.name.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold leading-tight text-white truncate">{item.name}</p>
          <p className="text-[10px] text-zinc-500 truncate">{item.brand}</p>
          <p className={`text-lg font-bold leading-none ${caloriesTone}`}>{item.calories}<span className="text-[10px] font-normal text-zinc-500 ml-0.5">cal</span></p>
        </div>
      </div>
    </div>
  );
}

function SnackCard({ label, item, tone, rationale }: { label: string; item: SnackItem; tone: "rose" | "emerald"; rationale?: string }) {
  const borderTone = tone === "emerald" ? "border-emerald-500/35" : "border-rose-500/35";
  const labelTone = tone === "emerald" ? "text-emerald-300" : "text-rose-300";
  const caloriesTone = tone === "emerald" ? "text-emerald-300" : "text-rose-300";

  return (
    <div className={`flex flex-col rounded-2xl border ${borderTone} bg-zinc-950/90 p-4`}>
      {/* Top section — grows to fill space, pushing image+calories to bottom */}
      <div className="flex-1">
        <p className={`text-sm font-semibold uppercase tracking-wider ${labelTone}`}>{label}</p>
        <p className="mt-2 text-lg font-semibold leading-tight text-white">{item.name}</p>
        <p className="text-sm text-zinc-400">{item.brand} · {item.serving}</p>
        {rationale && (
          <p className="mt-2 text-sm italic text-zinc-400">{rationale}</p>
        )}
      </div>
      {/* Bottom section — always aligned across sibling cards */}
      <div className="mt-3 flex justify-center">
        <div className="relative h-32 w-32 overflow-hidden rounded-xl bg-white">
          {item.image_url ? (
            <Image src={item.image_url} alt={item.name} fill className="object-contain p-[6px]" sizes="144px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-zinc-400">
              {item.name.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-zinc-900 px-3 py-2 text-center">
        <p className="text-sm uppercase tracking-wider text-zinc-400">Calories</p>
        <p className={`text-3xl font-bold leading-none ${caloriesTone}`}>{item.calories}</p>
      </div>
    </div>
  );
}
