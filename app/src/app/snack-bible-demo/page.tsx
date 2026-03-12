"use client";

import { Suspense, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion, useSpring, useTransform } from "framer-motion";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";

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
  const router = useRouter();
  const snackParam = searchParams.get("snack");
  const skipToDashboard = searchParams.get("skip") === "dashboard";

  const [allPairs, setAllPairs] = useState<SnackSwapPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [frequencyByPairId, setFrequencyByPairId] = useState<Record<string, number>>({});

  // Flow state machine — ?skip=dashboard shows client dashboard, ?snack= starts tutorial, otherwise redirect to landing
  const [flowState, setFlowState] = useState<FlowState>(skipToDashboard ? "dashboard" : snackParam ? "compare" : "compare");

  // Redirect to landing if no snack param and not skipping to dashboard
  useEffect(() => {
    if (!snackParam && !skipToDashboard) {
      router.replace("/snack-bible-landing?pick=1");
    }
  }, [snackParam, skipToDashboard, router]);

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

  // Stack swap: highest-gap swap from a different craving category
  // Prefer pairs where BOTH original and swap have images (for the product card)
  const stackSwap = useMemo(() => {
    if (allPairs.length === 0 || !tutorialSwapPair) return null;
    const myCategory = tutorialSwapPair.craving;
    const candidates = allPairs
      .filter((p) => p.craving !== myCategory && p.id !== tutorialSwapPair.id)
      .map((p) => ({
        pair: p,
        gap: p.original.calories - p.swap.calories,
        hasImages: p.original.image_url && p.swap.image_url ? 1 : 0,
      }))
      // Sort by: has both images first, then by gap descending
      .sort((a, b) => b.hasImages - a.hasImages || b.gap - a.gap);
    return candidates[0]?.pair ?? null;
  }, [allPairs, tutorialSwapPair]);

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
    router.push("/snack-bible-landing?pick=1");
  }

  function advanceToDashboard() {
    // Demo flow loops back to landing — dashboard is only accessible via /snack-bible-demo?skip=dashboard
    router.push("/snack-bible-landing?pick=1");
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
        {/* Skip tutorial removed — demo flow should always complete */}

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
              onContinue={() => { setFlowState("weight"); requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "instant" })); }}
              onBack={() => window.history.back()}
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
              className="mx-auto flex min-h-[70vh] items-start justify-center pt-16"
            >
              <WeightInputScreen
                currentWeight={currentWeight}
                goalWeight={goalWeight}
                onCurrentChange={setCurrentWeight}
                onGoalChange={setGoalWeight}
                onContinue={() => { setFlowState("projection"); requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "instant" })); }}
                onBack={() => { setFlowState("compare"); requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "instant" })); }}
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
              className="mx-auto flex min-h-[70vh] items-start justify-center pt-16"
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
                onBack={() => { setFlowState("weight"); requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "instant" })); }}
                stackSwap={stackSwap ? {
                  name: getFoodLove(getTutorialBrand(Object.entries(BRAND_TO_SWAP_ID).find(([, v]) => v === stackSwap.id)?.[0] ?? null)),
                  calSaved: stackSwap.original.calories - stackSwap.swap.calories,
                  originalName: stackSwap.original.brand,
                  swapName: stackSwap.swap.brand,
                  originalImageUrl: stackSwap.original.image_url,
                  swapImageUrl: stackSwap.swap.image_url,
                  originalCalories: stackSwap.original.calories,
                  swapCalories: stackSwap.swap.calories,
                } : undefined}
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
  onBack,
  calSaved,
  swapPair,
}: {
  brand: TutorialBrand | null;
  originalCal: number;
  swapCal: number;
  swapRevealed: boolean;
  onReveal: () => void;
  onContinue: () => void;
  onBack: () => void;
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
  const pctFewer = Math.round(((originalCal - swapCal) / originalCal) * 100);

  return (
    <motion.div
      key="compare"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="mx-auto max-w-2xl py-4 sm:py-8"
    >
      {/* Back */}
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Title — pre-reveal: hook question. Post-reveal: money line */}
      <div className="mb-4 sm:mb-8 text-center">
        {!swapRevealed ? (
          <h1 className="text-xl font-bold leading-tight sm:text-3xl text-white">
            What if you could lose fat without giving up <span className="text-emerald-400">{brandName}?</span>
          </h1>
        ) : (
          <motion.h1
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring" }}
            className="text-xl font-bold leading-tight sm:text-3xl text-white"
          >
            Same craving. <span className="text-emerald-400">{pctFewer}% fewer calories.</span>
          </motion.h1>
        )}
      </div>

      {/* Two images side by side */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2">
        {/* Left: Their snack */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 sm:p-4 mb-2">
            <div className="relative h-36 w-36 sm:h-44 sm:w-44 mx-auto overflow-hidden rounded-xl bg-white">
              <Image
                src={logoSrc}
                alt={brandName}
                fill
                className="object-contain p-[6px]"
                sizes="176px"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          </div>
          <p className="text-sm sm:text-base font-semibold text-white">{brandName}</p>
          <p className="text-2xl sm:text-3xl font-bold tabular-nums text-white mt-1">{originalCal} <span className="text-sm sm:text-base font-normal text-zinc-500">cal</span></p>
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
              className="text-center"
            >
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 sm:p-4 mb-2">
                <div className="relative h-36 w-36 sm:h-44 sm:w-44 mx-auto rounded-xl overflow-hidden">
                  <div className="absolute inset-0 opacity-20 blur-sm bg-white">
                    <Image
                      src={logoSrc}
                      alt=""
                      fill
                      className="object-contain p-[6px]"
                      sizes="176px"
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
              </div>
              <div className="h-4 sm:h-5 w-2/3 mx-auto rounded bg-zinc-800 mb-2" />
              <div className="h-7 sm:h-8 w-1/3 mx-auto rounded bg-zinc-800" />
            </motion.div>
          ) : (
            <motion.div
              key="revealed"
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="text-center"
            >
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-3 sm:p-4 mb-2 shadow-[0_0_30px_rgba(16,185,129,0.08)]">
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="relative h-36 w-36 sm:h-44 sm:w-44 mx-auto rounded-xl overflow-hidden bg-white"
                >
                  <Image
                    src={swapLogoSrc}
                    alt={swapName}
                    fill
                    className="object-contain p-[6px]"
                    sizes="176px"
                    unoptimized
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </motion.div>
              </div>
              <p className="text-sm sm:text-base font-semibold text-white">{swapName}</p>
              <p className="mt-1">
                <AnimatedCalories
                  value={swapCal}
                  className="text-2xl sm:text-3xl font-bold tabular-nums text-emerald-400"
                />
                <span className="text-sm sm:text-base font-normal text-zinc-500 ml-1">cal</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pre-reveal: Show me the swap button */}
      {!swapRevealed && (
        <div className="mt-6 sm:mt-8 text-center">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onReveal}
            className="w-full rounded-2xl bg-emerald-500 px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-bold uppercase tracking-wider text-black transition-all hover:bg-emerald-400 sm:w-auto"
          >
            Show me the swap
          </motion.button>
        </div>
      )}

      {/* Post-reveal: minimal bottom */}
      <AnimatePresence>
        {swapRevealed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              whileTap={{ scale: 0.97 }}
              onClick={onContinue}
              className="mt-6 w-full rounded-2xl bg-white px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-semibold text-black transition-all hover:bg-zinc-200"
            >
              Personalize this for my goals
            </motion.button>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-2 text-xs text-zinc-600"
            >
              Takes 30 seconds.
            </motion.p>
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
const SNACK_REPORT_DURATION_MS = 9000;
const PROGRESS_FILL_MS = 1200;       // bar fills in 1.2s
const CHECKMARK_PAUSE_MS = 600;      // checkmark visible before sliding up
const BRIDGE_STAGGER_MS = 1800;      // 1.8s between each bridge line

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
  stackSwap,
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
  stackSwap?: {
    name: string;
    calSaved: number;
    originalName: string;
    swapName: string;
    originalImageUrl: string | null;
    swapImageUrl: string | null;
    originalCalories: number;
    swapCalories: number;
  };
}) {
  const [animationDone, setAnimationDone] = useState(false);
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<"projection" | "generating">("projection");
  const [genProgress, setGenProgress] = useState(0);
  const [showStack, setShowStack] = useState(false);
  const [rollingDate, setRollingDate] = useState<string | null>(null);

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

  // Stack math
  const stackCalSaved = stackSwap ? calSavedPerSwap + stackSwap.calSaved : calSavedPerSwap;
  const stackLbsPerWeek = (stackCalSaved * ordersPerWeek) / 3500;
  const stackWeeksToGoal = stackLbsPerWeek > 0 ? Math.ceil(weightToLose / stackLbsPerWeek) : 999;
  const stackTargetDate = new Date();
  stackTargetDate.setDate(stackTargetDate.getDate() + stackWeeksToGoal * 7);
  const stackTargetDateStr = stackTargetDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Slot machine date roller — runs once when showStack fires, stops at stack date
  const rollerRanRef = useRef(false);
  const rollerDoneRef = useRef(false);
  // Stable values for the effect (not Date objects which change identity each render)
  const weeksToGoalStable = weeksToGoal;
  const stackWeeksToGoalStable = stackWeeksToGoal;
  useEffect(() => {
    if (!showStack || rollerRanRef.current) return;
    rollerRanRef.current = true;

    // Build month steps from original date → stack date
    const now = new Date();
    const origDate = new Date(now);
    origDate.setDate(origDate.getDate() + weeksToGoalStable * 7);
    const stackDate = new Date(now);
    stackDate.setDate(stackDate.getDate() + stackWeeksToGoalStable * 7);
    const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

    const steps: string[] = [];
    const cursor = new Date(origDate);
    while (cursor >= stackDate) {
      steps.push(fmt(cursor));
      cursor.setMonth(cursor.getMonth() - 1);
    }
    steps.push(fmt(stackDate));

    if (steps.length < 2) { setRollingDate(fmt(stackDate)); rollerDoneRef.current = true; return; }

    let i = 0;
    let cancelled = false;
    const totalSteps = steps.length;
    const tick = () => {
      if (cancelled) return;
      i++;
      if (i >= totalSteps) {
        setRollingDate(steps[totalSteps - 1]);
        rollerDoneRef.current = true;
        return;
      }
      setRollingDate(steps[i]);
      const progress = i / totalSteps;
      const delay = 80 + Math.pow(progress, 2) * 300;
      setTimeout(tick, delay);
    };
    // Start after graph line begins drawing
    const timeout = setTimeout(() => {
      setRollingDate(steps[0]);
      setTimeout(tick, 80);
    }, 1200);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [showStack, weeksToGoalStable, stackWeeksToGoalStable]);

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
    setPhase("generating");
  };

  // ─── Generating phase — progress bar → checkmark → bridge with staggered pauses ───
  const swapCount = showStack && stackSwap ? 2 : 1;
  const displayLbs = showStack && stackSwap ? stackLbsPerWeek : lbsPerWeek;
  const displayLbsStr = displayLbs >= 1 ? displayLbs.toFixed(1) : displayLbs.toFixed(2);

  // Phase timeline: bar fills → checkmark → slides up → bridge lines stagger in
  const [barDone, setBarDone] = useState(false);
  const [cardGone, setCardGone] = useState(false);
  const [bridgeStep, setBridgeStep] = useState(0); // 0-5: each bridge line

  useEffect(() => {
    if (phase !== "generating") return;
    // Step 1: bar fills
    const t1 = setTimeout(() => setBarDone(true), PROGRESS_FILL_MS);
    // Step 2: card slides up and disappears (after checkmark pause)
    const t2 = setTimeout(() => setCardGone(true), PROGRESS_FILL_MS + CHECKMARK_PAUSE_MS + 400);
    // Step 3: bridge lines stagger in
    const bridgeStart = PROGRESS_FILL_MS + CHECKMARK_PAUSE_MS + 900;
    const timers: ReturnType<typeof setTimeout>[] = [t1, t2];
    for (let i = 1; i <= 5; i++) {
      timers.push(setTimeout(() => setBridgeStep(i), bridgeStart + (i - 1) * BRIDGE_STAGGER_MS));
    }
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  if (phase === "generating") {
    return (
      <div className="w-full max-w-md">
        <motion.div
          key="generating"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center justify-start min-h-[70vh] text-center px-2 pt-16"
        >
          {/* Progress card — fills → checkmark → slides up */}
          <AnimatePresence>
            {!cardGone && (
              <motion.div
                exit={{ opacity: 0, y: -40, height: 0, marginBottom: 0, padding: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="w-full rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5 mb-6 overflow-hidden"
              >
                <h2 className="text-lg font-bold text-white mb-1">
                  Crunching the numbers on your {snackName} swap
                </h2>
                <p className="text-sm text-zinc-500 mb-3">
                  {email ? `Sending to ${email}` : "Hang tight"}
                </p>
                {/* Bar or checkmark */}
                {!barDone ? (
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                    <motion.div
                      className="h-full rounded-full bg-emerald-500"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: PROGRESS_FILL_MS / 1000, ease: "easeOut" }}
                    />
                  </div>
                ) : (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="flex justify-center"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bridge content — staggers in with pauses */}

          {/* Line 1: Personalized anchor */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: bridgeStep >= 1 ? 1 : 0, y: bridgeStep >= 1 ? 0 : 20 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-xs text-zinc-500 uppercase tracking-[0.25em] mb-3">Just now</p>
            <p className="text-4xl sm:text-5xl font-extrabold text-emerald-400 tabular-nums">
              {displayLbsStr} lbs
            </p>
            <p className="text-lg text-zinc-400 mt-2">
              of fat per week from{" "}
              <span className="text-white font-semibold">
                {swapCount === 1 ? "1 snack swap" : `${swapCount} snack swaps`}
              </span>
            </p>
          </motion.div>

          {/* Line 2: Bridge reframe */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: bridgeStep >= 2 ? 1 : 0, y: bridgeStep >= 2 ? 0 : 15 }}
            transition={{ duration: 0.5 }}
            className="max-w-sm mt-8"
          >
            <p className="text-xl sm:text-2xl font-bold text-white leading-snug">
              {swapCount === 1 ? "That was one snack." : "That was two snacks."}
            </p>
            <p className="text-xl sm:text-2xl text-zinc-400 mt-2 leading-snug">
              You probably grab 4 or 5 a week.
            </p>
          </motion.div>

          {/* Line 3: Scale expand */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: bridgeStep >= 3 ? 1 : 0 }}
            transition={{ duration: 0.5 }}
            className="text-base text-zinc-400 mt-8 max-w-sm"
          >
            Now imagine we did that for{" "}
            <span className="text-white font-semibold">every snack, every meal, every restaurant.</span>
          </motion.p>

          {/* Line 4: Killer line */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: bridgeStep >= 4 ? 1 : 0, y: bridgeStep >= 4 ? 0 : 12 }}
            transition={{ duration: 0.5 }}
            className="text-base sm:text-lg text-emerald-400 font-semibold leading-relaxed mt-8 max-w-sm"
          >
            What if all you had to do was eat — and the weight just came off?
          </motion.p>

          {/* Line 5: CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: bridgeStep >= 5 ? 1 : 0, y: bridgeStep >= 5 ? 0 : 10 }}
            transition={{ duration: 0.4 }}
            className="mt-10 w-full max-w-sm space-y-3"
          >
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => window.location.href = "/concierge"}
              className="w-full rounded-2xl bg-emerald-500 px-6 py-4 text-base font-bold text-black transition-all hover:bg-emerald-400 flex items-center justify-center gap-2"
            >
              <span>See how it works</span>
              <motion.span animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>&rarr;</motion.span>
            </motion.button>
            <button
              onClick={() => window.location.href = "/snack-bible-landing?pick=1"}
              className="w-full text-center text-sm text-zinc-600 hover:text-zinc-400 transition-colors py-2"
            >
              Keep exploring swaps
            </button>
          </motion.div>

        </motion.div>
      </div>
    );
  }

  // ─── Graph: both lines always use the same X-axis (original timeline) ───
  // Stack line reaches goal earlier, so its endpoint is partway through the graph
  const stackRatio = weeksToGoal > 0 ? Math.min(stackWeeksToGoal / weeksToGoal, 1) : 1;

  // Stack curve: reaches goal weight at stackRatio of the X-axis
  // Only draw up to the goal point — no flat line beyond it
  const stackGoalXIndex = Math.round(stackRatio * points);
  const stackCurveData: { x: number; weight: number }[] = [];
  for (let i = 0; i <= stackGoalXIndex; i++) {
    const t = i / points;
    const scaledT = stackRatio > 0 ? Math.min(t / stackRatio, 1) : 1;
    const progress = 1 - Math.pow(1 - scaledT, 1.8);
    const weight = currentWeight - weightToLose * progress;
    stackCurveData.push({ x: i, weight: Math.max(goalWeight, Math.round(weight * 10) / 10) });
  }

  const stackPathD = stackCurveData
    .map((d, i) => {
      const x = toX(d.x);
      const y = toY(d.weight);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(" ");

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

      {/* Headline — biggest element on screen */}
      <div className="mb-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          className="text-3xl sm:text-4xl font-extrabold leading-tight"
        >
          You&apos;ll hit{" "}
          <span className="text-emerald-400">{goalWeight} lbs</span> by{" "}
          <span className="text-emerald-400 inline-block overflow-hidden">
            {rollingDate ? (
              <motion.span
                key={rollingDate}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.06 }}
                className="inline-block"
              >
                {rollingDate}
              </motion.span>
            ) : showStack && rollerDoneRef.current ? (
              stackTargetDateStr
            ) : (
              targetDateStr
            )}
          </span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 2 }}
          className="mt-2 text-sm text-zinc-400"
        >
          {showStack
            ? <>
                {weeksToGoal > 0 && stackWeeksToGoal > 0 && (
                  <span className="text-emerald-400 font-semibold">{Math.round(weeksToGoal / stackWeeksToGoal)}x faster</span>
                )}{" "}
                by stacking your {snackName} + nightly {stackSwap?.name ?? "ice cream"} swaps.
              </>
            : <>Without giving up your love for <span className="text-emerald-400">{snackName}</span>.</>
          }
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

          {/* Original single-swap line (green → dotted gray when stack shown) */}
          <motion.path
            d={pathD}
            fill="none"
            stroke={showStack ? "#52525b" : "#34d399"}
            strokeWidth={showStack ? 1.5 : 2.5}
            strokeDasharray={showStack ? "6 4" : "none"}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1, stroke: showStack ? "#52525b" : "#34d399", strokeWidth: showStack ? 1.5 : 2.5 }}
            transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
          />

          {/* Stack line (brighter green, steeper, reaches goal sooner) */}
          {showStack && (
            <motion.path
              d={stackPathD}
              fill="none"
              stroke="#34d399"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            />
          )}

          {/* Original endpoint anchor — stays visible when stack is shown */}
          {showStack && (
            <>
              <circle
                cx={toX(points)}
                cy={toY(goalWeight)}
                r={3}
                fill="#52525b"
              />
              <text
                x={toX(points)}
                y={svgH - 4}
                textAnchor="middle"
                fill="#52525b"
                fontSize={8}
              >
                {targetDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </text>
            </>
          )}

          {/* NOW dot */}
          <motion.circle
            cx={toX(0)}
            cy={toY(currentWeight)}
            r={4}
            fill="#ef4444"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          />

          {/* GOAL dot — slides left when stack is shown */}
          <motion.circle
            r={5}
            fill="#34d399"
            initial={{ opacity: 0, scale: 0, cx: toX(points), cy: toY(goalWeight) }}
            animate={{
              opacity: 1,
              scale: 1,
              cx: showStack ? toX(stackGoalXIndex) : toX(points),
              cy: toY(goalWeight),
            }}
            transition={showStack
              ? { cx: { duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 2 }, default: { delay: 2, type: "spring", stiffness: 300 } }
              : { delay: 2, type: "spring", stiffness: 300 }
            }
          />

          {/* NOW label */}
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

          {/* GOAL label — slides with dot */}
          <motion.text
            textAnchor="middle"
            fill="#34d399"
            fontSize={9}
            fontWeight="bold"
            initial={{ opacity: 0, x: toX(points), y: toY(goalWeight) - 12 }}
            animate={{
              opacity: 1,
              x: showStack ? toX(stackGoalXIndex) : toX(points),
              y: toY(goalWeight) - 12,
            }}
            transition={showStack
              ? { x: { duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 2 }, default: { delay: 2.2 } }
              : { delay: 2.2 }
            }
          >
            GOAL
          </motion.text>

          {/* Date label — slides with dot */}
          <motion.text
            textAnchor="middle"
            fill="#34d399"
            fontSize={9}
            fontWeight="bold"
            initial={{ opacity: 0, x: toX(points), y: svgH - 4 }}
            animate={{
              opacity: 1,
              x: showStack ? toX(stackGoalXIndex) : toX(points),
              y: svgH - 4,
            }}
            transition={showStack
              ? { x: { duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 2 }, default: { delay: 2.2 } }
              : { delay: 2.2 }
            }
          >
            {showStack
              ? stackTargetDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })
              : targetDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
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

      {/* Speed it up — one big tappable card */}
      {stackSwap && !showStack && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{
            opacity: 1,
            y: 0,
            boxShadow: [
              "0 0 0 0 rgba(52, 211, 153, 0)",
              "0 0 24px 6px rgba(52, 211, 153, 0.2)",
              "0 0 0 0 rgba(52, 211, 153, 0)",
            ],
          }}
          transition={{
            opacity: { delay: 2.5 },
            y: { delay: 2.5 },
            boxShadow: { duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 3 },
          }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowStack(true)}
          className="relative mb-6 w-full overflow-hidden rounded-2xl border border-emerald-500/30 bg-zinc-900/80 p-5 text-center transition-all hover:border-emerald-400/50"
        >
          {/* Shimmer sweep */}
          <motion.div
            className="pointer-events-none absolute inset-0"
            style={{
              background: "linear-gradient(105deg, transparent 40%, rgba(52,211,153,0.07) 50%, transparent 60%)",
            }}
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.5 }}
          />
          <p className="relative text-lg font-bold text-white mb-3">Want to speed it up?</p>
          <div className="relative flex items-center justify-center gap-3">
            <div className="relative h-20 w-20 rounded-xl bg-zinc-800 overflow-hidden ring-1 ring-zinc-700">
              {stackSwap.originalImageUrl && (
                <Image src={stackSwap.originalImageUrl} alt={stackSwap.originalName} fill className="object-contain p-1" sizes="80px" unoptimized />
              )}
            </div>
            <svg className="h-4 w-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <div className="relative h-20 w-20 rounded-xl bg-zinc-800 overflow-hidden ring-1 ring-zinc-700">
              {stackSwap.swapImageUrl && (
                <Image src={stackSwap.swapImageUrl} alt={stackSwap.swapName} fill className="object-contain p-1" sizes="80px" unoptimized />
              )}
            </div>
          </div>
          <p className="relative mt-3 text-sm text-zinc-400">
            Add {stackSwap.name} swap &middot; {stackSwap.originalCalories} → {stackSwap.swapCalories} cal
          </p>
        </motion.button>
      )}

      {/* Email capture — only show after stack animation OR if no stack swap available */}
      {(showStack || !stackSwap) && (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: showStack ? 3.5 : 2.8 }}
      >
        <p className="text-center text-sm text-zinc-400 mb-4">
          Save your plan + see how the full system works
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
      )}

      {/* Spacer below email capture */}
      <div className="mt-6" />
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
