"use client";

import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";

// ─── Types ──────────────────────────────────────────────
interface Ingredient {
  id: string;
  name: string;
  category_id: string;
  portion_size: string;
  calories: number;
  protein_g: number;
  total_fat_g: number;
  carbohydrate_g: number;
}

interface Category {
  id: string;
  name: string;
  display_order: number;
  selection_type: string;
}

interface TemplateMeal {
  id: string;
  name: string;
  description: string;
  meal_type: string;
  is_swap: number;
  swap_for: string | null;
  swap_rationale: string | null;
  sprite_url: string | null;
  ingredients: Ingredient[];
  totals: { calories: number; protein: number; fat: number; carbs: number };
}

interface Container {
  id: string;
  restaurant_id: string;
  name: string;
  description: string;
  display_order: number;
  sprite_path: string | null;
  rules: string; // JSON string
  meal_type_key: string;
}

interface RestaurantData {
  restaurant: { id: string; name: string; logo_emoji: string; cuisine: string };
  containers: Container[];
  categories: Category[];
  ingredients: Ingredient[];
  meals: TemplateMeal[];
}

// ─── Flow States ────────────────────────────────────────
type FlowState =
  | "landing"
  | "swipe"
  | "meal-type"
  | "pick-meal"
  | "build"
  | "reveal"
  | "weight"
  | "projection"
  | "generating"
  | "crossroads";

// Session: tracks all meals built across the session
interface CompletedMeal {
  restaurant: string;
  mealType: string;
  orderCalories: number;
  swapCalories: number;
  savings: number;
  swapName: string;
}

// ─── Restaurant cards for swipe ─────────────────────────
const restaurants = [
  { id: "chipotle", name: "Chipotle", heroImage: "/sprites/restaurant_chipotle_hero.png", hasData: true },
  { id: "pandaexpress", name: "Panda Express", heroImage: "/sprites/restaurant_pandaexpress_hero.png", hasData: true },
  { id: "cava", name: "CAVA", heroImage: "/sprites/cava_hero.png", hasData: true },
  { id: "thai", name: "Thai Food", heroImage: null, hasData: false },
  { id: "pizza", name: "Pizza", heroImage: null, hasData: false },
  { id: "indian", name: "Indian", heroImage: null, hasData: false },
  { id: "burgers", name: "Burgers", heroImage: null, hasData: false },
  { id: "sushi", name: "Sushi", heroImage: null, hasData: false },
  { id: "chickfila", name: "Chick-fil-A", heroImage: null, hasData: false },
];

// ─── Meal type cards ────────────────────────────────────
const mealTypes = [
  { id: "burrito", name: "Burrito", emoji: "🌯", sprite: "/sprites/chip_chicken_burrito.png", description: "Wrapped in a flour tortilla" },
  { id: "bowl", name: "Bowl", emoji: "🥗", sprite: "/sprites/chip_chicken_bowl.png", description: "No tortilla, all the fillings" },
  { id: "tacos", name: "Tacos", emoji: "🌮", sprite: "/sprites/chip_chicken_tacos.png", description: "3 crispy corn shells" },
  { id: "salad", name: "Salad", emoji: "🥬", sprite: "/sprites/chip_chicken_salad.png", description: "Supergreens base" },
];

// Build steps in Chipotle line order
const buildSteps = [
  { categoryId: "chipotle_rice", label: "Rice", hasNone: true },
  { categoryId: "chipotle_beans", label: "Beans", hasNone: true },
  { categoryId: "chipotle_protein", label: "Protein", hasNone: false, allowDouble: true },
  { categoryId: "chipotle_salsa", label: "Salsa", hasNone: false },
  { categoryId: "chipotle_toppings", label: "Toppings", hasNone: false },
  { categoryId: "chipotle_extras", label: "Extras", hasNone: false },
];

const reportGenerationDurationMs = 15000;
const swapsMissionStatement =
  "We build for your worst days — the days where you have no time for cardio, no energy for extra steps, and no interest in meal prep. If a plan works on those days, everything above it is a bonus.";
const swapsMissionPillars = [
  "We swap your real orders — not your lifestyle.",
  "Built for your worst days. No cardio. No meal prep.",
  "Small changes that add up to real weight loss every week.",
];
const reportGenerationSteps = [
  { threshold: 20, label: "Adding up your weekly calorie savings" },
  { threshold: 55, label: "Mapping your weight loss timeline" },
  { threshold: 85, label: "Putting together your swap plan" },
];

// ─── Animated Counter Component ─────────────────────────
function AnimatedCalories({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const spring = useSpring(0, { stiffness: 60, damping: 20, mass: 0.8 });
  const display = useTransform(spring, (v) => Math.round(v));
  const [displayVal, setDisplayVal] = useState(0);

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    const unsubscribe = display.on("change", (v) => setDisplayVal(v));
    return unsubscribe;
  }, [display]);

  return <span className={className}>{displayVal}</span>;
}

function DarkLandingClient() {
  const [flow, setFlow] = useState<FlowState>("landing");
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<string | null>(null);
  const [selectedTemplateMeal, setSelectedTemplateMeal] = useState<TemplateMeal | null>(null);
  const [restaurantData, setRestaurantData] = useState<RestaurantData | null>(null);
  // Quantities: categoryId -> ingredientId -> quantity (0 = not selected)
  const [quantities, setQuantities] = useState<Record<string, Record<string, number>>>({});
  const [buildStep, setBuildStep] = useState(0);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [goalWeight, setGoalWeight] = useState<number | null>(null);
  const [swipeIndex, setSwipeIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [completedMeals, setCompletedMeals] = useState<CompletedMeal[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [notifyRestaurants, setNotifyRestaurants] = useState<string[]>([]);
  const searchParams = useSearchParams();
  const godMode = searchParams.get("god") === "1";

  // Bible deep-link: skip straight to weight input with savings pre-loaded
  const bibleSavings = searchParams.get("savings") ? Number(searchParams.get("savings")) : null;
  const bibleSwapName = searchParams.get("swap") || "";
  const bibleRestaurant = searchParams.get("restaurant") || "";

  // Restore session state from sessionStorage (e.g. when returning from /vsl via back button)
  const restoredRef = useRef(false);
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("dl_session");
      if (saved) {
        const s = JSON.parse(saved);
        if (s.flow && s.completedMeals) {
          restoredRef.current = true;
          setFlow(s.flow);
          setCompletedMeals(s.completedMeals);
          if (s.currentWeight) setCurrentWeight(s.currentWeight);
          if (s.goalWeight) setGoalWeight(s.goalWeight);
          if (s.userEmail) setUserEmail(s.userEmail);
        }
        sessionStorage.removeItem("dl_session");
      }
    } catch { /* ignore */ }
  }, []);

  // Bible deep-link: jump to weight input and seed session with the swap data
  const bibleInitRef = useRef(false);
  useEffect(() => {
    // Don't override if we just restored from sessionStorage
    if (restoredRef.current) return;
    if (bibleSavings && !bibleInitRef.current) {
      bibleInitRef.current = true;
      setFlow("weight");
      // Pre-populate the session so crossroads has data
      setCompletedMeals([{
        restaurant: bibleRestaurant,
        mealType: "",
        orderCalories: bibleSavings, // We only know the delta
        swapCalories: 0,
        savings: bibleSavings,
        swapName: bibleSwapName || "Your swap",
      }]);
    }
  }, [bibleSavings, bibleSwapName, bibleRestaurant]);

  // Load restaurant data when selected
  useEffect(() => {
    if (selectedRestaurant) {
      fetch(`/api/restaurant/${selectedRestaurant}`)
        .then((r) => r.json())
        .then((data) => setRestaurantData(data))
        .catch(console.error);
    }
  }, [selectedRestaurant]);

  // Shell calories based on meal type
  const getShellCalories = useCallback((): number => {
    if (!restaurantData || !selectedMealType) return 0;
    if (selectedMealType === "burrito") {
      const t = restaurantData.ingredients.find((i) => i.id === "chip_flour_tortilla_burrito");
      return t ? t.calories : 0;
    }
    if (selectedMealType === "tacos") {
      const t = restaurantData.ingredients.find((i) => i.id === "chip_crispy_corn_tortilla");
      return t ? t.calories * 3 : 0;
    }
    return 0;
  }, [restaurantData, selectedMealType]);

  // Get all selected ingredients as flat array (respects quantities)
  const getSelectedIngredients = useCallback((): Ingredient[] => {
    if (!restaurantData) return [];
    const result: Ingredient[] = [];
    for (const catMap of Object.values(quantities)) {
      for (const [id, qty] of Object.entries(catMap)) {
        if (qty <= 0) continue;
        const ing = restaurantData.ingredients.find((i) => i.id === id);
        if (ing) {
          for (let n = 0; n < qty; n++) result.push(ing);
        }
      }
    }
    return result;
  }, [restaurantData, quantities]);

  // Shell ingredients for reveal screen
  const getShellIngredients = useCallback((): Ingredient[] => {
    if (!restaurantData || !selectedMealType) return [];
    if (selectedMealType === "burrito") {
      const t = restaurantData.ingredients.find((i) => i.id === "chip_flour_tortilla_burrito");
      return t ? [t] : [];
    }
    if (selectedMealType === "tacos") {
      const t = restaurantData.ingredients.find((i) => i.id === "chip_crispy_corn_tortilla");
      return t ? [t, t, t] : [];
    }
    return [];
  }, [restaurantData, selectedMealType]);

  // Total calories
  const totalCalories = (() => {
    const shell = getShellCalories();
    const picked = getSelectedIngredients();
    return shell + picked.reduce((sum, i) => sum + i.calories, 0);
  })();

  // Total macros for reveal
  const totals = (() => {
    const shell = getShellIngredients();
    const picked = getSelectedIngredients();
    const all = [...shell, ...picked];
    return all.reduce(
      (acc, ing) => ({
        calories: acc.calories + ing.calories,
        protein: acc.protein + ing.protein_g,
        carbs: acc.carbs + ing.carbohydrate_g,
        fat: acc.fat + ing.total_fat_g,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  })();

  // Current step info
  const currentStep = buildSteps[buildStep];
  const currentCategory = restaurantData?.categories.find(
    (c) => c.id === currentStep?.categoryId
  );
  const currentIngredients =
    restaurantData?.ingredients.filter(
      (i) => i.category_id === currentStep?.categoryId
    ) ?? [];
  const isSingleSelect =
    currentCategory?.selection_type === "single";

  // Handle tap on an ingredient (radio toggle for single, checkbox toggle for multi)
  const handleSelect = (ingredientId: string) => {
    const catId = currentStep.categoryId;
    setQuantities((prev) => {
      const next = { ...prev };
      const catMap = { ...(next[catId] ?? {}) };
      if (isSingleSelect) {
        // Radio: if already selected, deselect; otherwise pick this one (clear others)
        if ((catMap[ingredientId] ?? 0) > 0) {
          next[catId] = {};
        } else {
          next[catId] = { [ingredientId]: 1 };
        }
      } else {
        // Checkbox: toggle between 0 and 1
        if ((catMap[ingredientId] ?? 0) > 0) {
          delete catMap[ingredientId];
        } else {
          catMap[ingredientId] = 1;
        }
        next[catId] = catMap;
      }
      return next;
    });
  };

  // Adjust quantity for an ingredient (protein stepper, +/- buttons)
  const handleQuantityChange = (ingredientId: string, delta: number) => {
    const catId = currentStep.categoryId;
    setQuantities((prev) => {
      const next = { ...prev };
      const catMap = { ...(next[catId] ?? {}) };
      const current = catMap[ingredientId] ?? 0;
      const newQty = Math.max(0, Math.min(4, current + delta));
      if (newQty === 0) {
        delete catMap[ingredientId];
      } else {
        catMap[ingredientId] = newQty;
      }
      next[catId] = catMap;
      return next;
    });
  };

  // Get quantity for a specific ingredient in current step
  const getQty = (ingredientId: string): number => {
    return quantities[currentStep?.categoryId]?.[ingredientId] ?? 0;
  };

  // Has any selection for current step
  const hasCurrentSelection = Object.values(quantities[currentStep?.categoryId] ?? {}).some((q) => q > 0);

  // Past protein step = can exit early
  const pastProtein = buildStep >= 3;

  // Handle swipe
  const handleSwipe = useCallback(
    (dir: "left" | "right") => {
      setSwipeDirection(dir);
      const current = restaurants[swipeIndex];
      if (dir === "right" && current.hasData) {
        setTimeout(() => {
          setSelectedRestaurant(current.id);
          setFlow("meal-type");
          setSwipeDirection(null);
        }, 300);
      } else {
        setTimeout(() => {
          setSwipeIndex((prev) => (prev + 1 >= restaurants.length ? 0 : prev + 1));
          setSwipeDirection(null);
        }, 300);
      }
    },
    [swipeIndex]
  );

  // Check if selected container is build-your-own
  const isBuildYourOwn = (): boolean => {
    if (!restaurantData || !selectedMealType) return true;
    const container = restaurantData.containers.find(
      (c) => c.id === selectedMealType || c.name.toLowerCase().replace(/\s+/g, "_") === selectedMealType
    );
    if (!container) return true; // default to build-your-own for backward compat
    try {
      const rules = JSON.parse(container.rules);
      return rules.build_your_own !== false;
    } catch { return true; }
  };

  // Find swap — works for both build-your-own and pick-meal flows
  const findSwap = (): TemplateMeal | null => {
    if (!restaurantData) return null;
    // For pick-meal flow: find the swap paired to the selected template meal
    if (selectedTemplateMeal) {
      return restaurantData.meals.find(
        (m) => m.is_swap && m.swap_for === selectedTemplateMeal.id
      ) ?? null;
    }
    // For build-your-own flow: find swap matching meal type
    return (
      restaurantData.meals.find(
        (m) => m.is_swap && m.meal_type === selectedMealType
      ) ??
      restaurantData.meals.find((m) => m.is_swap) ??
      null
    );
  };

  // Totals for pick-meal flow (use template meal's totals directly)
  const effectiveTotals = selectedTemplateMeal
    ? selectedTemplateMeal.totals
    : totals;

  // Session totals across all completed meals
  const sessionTotalSavings = completedMeals.reduce((sum, m) => sum + m.savings, 0);
  const sessionLbsPerWeek = (sessionTotalSavings * 7) / 3500;

  // Save current meal to session
  const saveCurrentMeal = () => {
    const swap = findSwap();
    if (!swap) return;
    const orderCals = selectedTemplateMeal ? selectedTemplateMeal.totals.calories : totals.calories;
    const meal: CompletedMeal = {
      restaurant: restaurantData?.restaurant.name ?? "",
      mealType: selectedMealType ?? "",
      orderCalories: orderCals,
      swapCalories: swap.totals.calories,
      savings: orderCals - swap.totals.calories,
      swapName: swap.name,
    };
    setCompletedMeals((prev) => [...prev, meal]);
  };

  // Start a new meal (keeps session data, resets build state)
  const startNewMeal = () => {
    setSelectedMealType(null);
    setSelectedTemplateMeal(null);
    setQuantities({});
    setBuildStep(0);
    setFlow("meal-type");
  };

  const resetAll = () => {
    setFlow("landing");
    setSelectedRestaurant(null);
    setSelectedMealType(null);
    setSelectedTemplateMeal(null);
    setQuantities({});
    setBuildStep(0);
    setCurrentWeight(null);
    setGoalWeight(null);
    setSwipeIndex(0);
    setCompletedMeals([]);
    setUserEmail(null);
    setNotifyRestaurants([]);
  };

  const seedGodModeSwap = useCallback(() => {
    setSelectedRestaurant("chipotle");
    setSelectedMealType("bowl");
    setSelectedTemplateMeal(null);
    setQuantities({
      chipotle_rice: { chip_white_rice: 1 },
      chipotle_beans: { chip_black_beans: 1 },
      chipotle_protein: { chip_chicken: 1 },
      chipotle_salsa: { chip_fresh_tomato_salsa: 1 },
      chipotle_toppings: { chip_romaine_lettuce: 1 },
    });
    setBuildStep(buildSteps.length - 1);
  }, []);

  const goToGodModeSwap = useCallback(() => {
    seedGodModeSwap();
    setFlow("reveal");
  }, [seedGodModeSwap]);

  const goToGodModeProjection = useCallback(() => {
    seedGodModeSwap();
    setCurrentWeight(205);
    setGoalWeight(185);
    setFlow("projection");
  }, [seedGodModeSwap]);

  const goToGodModeCrossroads = useCallback(() => {
    seedGodModeSwap();
    setCurrentWeight(205);
    setGoalWeight(185);
    setCompletedMeals([
      {
        restaurant: "Chipotle",
        mealType: "bowl",
        orderCalories: 790,
        swapCalories: 425,
        savings: 365,
        swapName: "Lean Chicken Bowl",
      },
    ]);
    setUserEmail("test@bulletproofbody.com");
    setFlow("crossroads");
  }, [seedGodModeSwap]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden">
      {/* Subtle gradient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-6 pt-6 pb-4 flex items-center justify-between">
        <p className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-500">
          Bulletproof Body
        </p>
        {flow !== "landing" && flow !== "swipe" && (
          <button
            onClick={resetAll}
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Start over
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        {/* Session total banner — shows during build when previous meals exist */}
        {completedMeals.length > 0 && flow !== "crossroads" && flow !== "landing" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <span className="text-xs text-emerald-400 font-bold">{completedMeals.length}</span>
              </div>
              <span className="text-xs text-zinc-400">
                {completedMeals.length} meal{completedMeals.length > 1 ? "s" : ""} optimized
              </span>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-emerald-400 tabular-nums">
                <AnimatedCalories value={sessionTotalSavings} className="text-sm font-bold text-emerald-400 tabular-nums" /> cal saved per order
              </p>
              <p className="text-[10px] text-zinc-500">{sessionLbsPerWeek.toFixed(1)} lbs/week</p>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {flow === "landing" && (
            <LandingScreen key="landing" onStart={() => setFlow("swipe")} />
          )}
          {flow === "swipe" && (
            <SwipeScreen
              key="swipe"
              restaurant={restaurants[swipeIndex]}
              index={swipeIndex}
              total={restaurants.length}
              direction={swipeDirection}
              onSwipe={handleSwipe}
            />
          )}
          {flow === "meal-type" && (
            <MealTypeScreen
              key="meal-type"
              restaurantName={restaurantData?.restaurant.name ?? ""}
              containers={restaurantData?.containers ?? []}
              onSelect={(containerId) => {
                setSelectedMealType(containerId);
                setSelectedTemplateMeal(null);
                setQuantities({});
                setBuildStep(0);
                // Check if this container is build-your-own
                const container = restaurantData?.containers.find(c => c.id === containerId);
                let buildOwn = true;
                if (container) {
                  try { buildOwn = JSON.parse(container.rules).build_your_own !== false; } catch {}
                }
                if (buildOwn) {
                  setFlow("build");
                } else {
                  setFlow("pick-meal");
                }
              }}
            />
          )}
          {flow === "pick-meal" && (
            <PickMealScreen
              key="pick-meal"
              restaurantName={restaurantData?.restaurant.name ?? ""}
              containerName={restaurantData?.containers.find(c => c.id === selectedMealType)?.name ?? ""}
              meals={(restaurantData?.meals ?? []).filter(
                (m) => !m.is_swap && m.meal_type === (
                  restaurantData?.containers.find(c => c.id === selectedMealType)?.meal_type_key ?? selectedMealType
                )
              )}
              onSelect={(meal) => {
                setSelectedTemplateMeal(meal);
                setFlow("reveal");
              }}
              onBack={() => {
                setSelectedMealType(null);
                setFlow("meal-type");
              }}
            />
          )}
          {flow === "build" && currentStep && (
            <BuildStepScreen
              key={`build-${buildStep}`}
              step={currentStep}
              stepIndex={buildStep}
              totalSteps={buildSteps.length}
              ingredients={currentIngredients}
              getQty={getQty}
              isSingleSelect={isSingleSelect}
              totalCalories={totalCalories}
              shellCalories={getShellCalories()}
              pastProtein={pastProtein}
              mealType={selectedMealType!}
              onSelect={handleSelect}
              onQuantityChange={handleQuantityChange}
              onNext={() => {
                if (buildStep < buildSteps.length - 1) {
                  setBuildStep((s) => s + 1);
                } else {
                  setFlow("reveal");
                }
              }}
              onDone={() => setFlow("reveal")}
              onBack={() => {
                if (buildStep > 0) {
                  setBuildStep((s) => s - 1);
                } else {
                  setFlow("meal-type");
                  setQuantities({});
                }
              }}
            />
          )}
          {flow === "reveal" && (
            <SwapRevealScreen
              key="reveal"
              totals={effectiveTotals}
              shellIngredients={selectedTemplateMeal ? [] : getShellIngredients()}
              selectedIngredients={selectedTemplateMeal ? (selectedTemplateMeal.ingredients ?? []) : getSelectedIngredients()}
              swap={findSwap()}
              mealType={selectedMealType!}
              originalMealName={selectedTemplateMeal?.name}
              onPersonalize={() => setFlow("weight")}
              onBack={() => {
                if (selectedTemplateMeal) {
                  setFlow("pick-meal");
                } else {
                  setFlow("build");
                  setBuildStep(buildSteps.length - 1);
                }
              }}
            />
          )}
          {flow === "weight" && (
            <WeightInputScreen
              key="weight"
              currentWeight={currentWeight}
              goalWeight={goalWeight}
              onCurrentChange={setCurrentWeight}
              onGoalChange={setGoalWeight}
              onContinue={() => setFlow("projection")}
              onBack={() => setFlow("reveal")}
            />
          )}
          {flow === "projection" && (
            <ProjectionScreen
              key="projection"
              currentWeight={currentWeight!}
              goalWeight={goalWeight!}
              calSavedPerOrder={
                bibleSavings ?? (findSwap() ? Math.max(0, effectiveTotals.calories - findSwap()!.totals.calories) : 0)
              }
              swapName={bibleSwapName || findSwap()?.name || ""}
              restaurantName={bibleRestaurant || "Chipotle"}
              sessionTotalSavings={bibleSavings ? bibleSavings * 7 : sessionTotalSavings}
              completedMeals={completedMeals}
              onEmailSubmit={(email) => {
                setUserEmail(email);
                if (!bibleSavings) saveCurrentMeal();
                setFlow("generating");
              }}
              isBibleDeepLink={!!bibleSavings}
              onBack={() => setFlow("weight")}
            />
          )}
          {flow === "generating" && (
            <GeneratingScreen
              key="generating"
              email={userEmail}
              restaurantName={completedMeals.length > 0 ? completedMeals[completedMeals.length - 1].restaurant : "your restaurant"}
              onContinue={() => setFlow("crossroads")}
              onBack={() => setFlow("projection")}
            />
          )}
          {flow === "crossroads" && (
            <CrossroadsScreen
              key="crossroads"
              completedMeals={completedMeals}
              currentWeight={currentWeight!}
              goalWeight={goalWeight!}
              sessionTotalSavings={sessionTotalSavings}
              sessionLbsPerWeek={sessionLbsPerWeek}
              onFindNextSwap={() => {
                sessionStorage.setItem("dl_session", JSON.stringify({
                  flow: "crossroads",
                  completedMeals,
                  currentWeight,
                  goalWeight,
                  userEmail,
                }));
                window.location.href = "/bible";
              }}
              onWatchVSL={() => {
                sessionStorage.setItem("dl_session", JSON.stringify({
                  flow: "crossroads",
                  completedMeals,
                  currentWeight,
                  goalWeight,
                  userEmail,
                }));
                window.location.href = "/vsl";
              }}
              onConcierge={() => {
                sessionStorage.setItem("dl_session", JSON.stringify({
                  flow: "crossroads",
                  completedMeals,
                  currentWeight,
                  goalWeight,
                  userEmail,
                }));
                window.location.href = "/concierge";
              }}
              onDone={resetAll}
              onBack={() => setFlow("projection")}
              isBibleDeepLink={!!bibleSavings}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      {flow !== "build" && (
        <footer className="relative z-10 px-6 pb-6 text-center">
          <p className="text-[11px] text-zinc-700">
            Built for busy professionals who order takeout
          </p>
        </footer>
      )}

      {godMode && (
        <div className="fixed bottom-4 right-4 z-50 rounded-2xl border border-emerald-500/30 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
            God Mode
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={goToGodModeSwap}
              className="rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-200 hover:border-zinc-500"
            >
              Swap
            </button>
            <button
              onClick={goToGodModeProjection}
              className="rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-200 hover:border-zinc-500"
            >
              Projection
            </button>
            <button
              onClick={goToGodModeCrossroads}
              className="rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-200 hover:border-zinc-500"
            >
              Crossroads
            </button>
            <button
              onClick={() => {
                sessionStorage.setItem("dl_session", JSON.stringify({
                  flow,
                  completedMeals,
                  currentWeight,
                  goalWeight,
                  userEmail,
                }));
                window.location.href = "/vsl";
              }}
              className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1.5 text-xs font-medium text-emerald-300 hover:border-emerald-400/70"
            >
              VSL
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DarkLandingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <DarkLandingClient />
    </Suspense>
  );
}

// ═══════════════════════════════════════════════════════════
// SCREENS
// ═══════════════════════════════════════════════════════════

function LandingScreen({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-sm text-center"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/80 px-4 py-1.5 mb-8"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs text-zinc-400">Takes 60 seconds</span>
      </motion.div>

      <h1 className="text-4xl font-bold tracking-tight leading-[1.1]">
        Lose Your Next{" "}
        <span className="text-emerald-400">10 Pounds</span>
        <br />
        Without Giving Up{" "}
        <span style={{ fontFamily: "'TT Norms Pro', 'Poppins', 'Nunito', sans-serif", fontWeight: 800, letterSpacing: "-0.02em" }}>
          DoorDash
        </span>
      </h1>

      <p className="mt-5 text-base text-zinc-400 leading-relaxed">
        Pick what you normally order. We&apos;ll show you exactly where
        the fat is hiding.
      </p>

      <motion.button
        onClick={onStart}
        whileTap={{ scale: 0.97 }}
        className="mt-10 w-full rounded-2xl bg-white px-8 py-4 text-base font-semibold text-black transition-all hover:bg-zinc-100 active:bg-zinc-200"
      >
        Show Me
      </motion.button>

      <p className="mt-4 text-xs text-zinc-600">
        Free. No signup required. See results instantly.
      </p>
    </motion.div>
  );
}

// ─── Swipe Screen ────────────────────────────────────────
function SwipeScreen({
  restaurant,
  index,
  total,
  direction,
  onSwipe,
}: {
  restaurant: (typeof restaurants)[0];
  index: number;
  total: number;
  direction: "left" | "right" | null;
  onSwipe: (dir: "left" | "right") => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full max-w-sm"
    >
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          {index + 1} of {total}
        </p>
        <div className="flex gap-1">
          {restaurants.map((_, i) => (
            <div
              key={i}
              className={`h-1 w-6 rounded-full transition-all ${
                i < index
                  ? "bg-emerald-500"
                  : i === index
                  ? "bg-white"
                  : "bg-zinc-800"
              }`}
            />
          ))}
        </div>
      </div>

      <p className="text-sm text-zinc-400 mb-4">Do you ever order...</p>

      <motion.div
        key={restaurant.id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{
          opacity: direction ? 0 : 1,
          x: direction === "left" ? -200 : direction === "right" ? 200 : 0,
          rotate: direction === "left" ? -10 : direction === "right" ? 10 : 0,
          scale: direction ? 0.9 : 1,
        }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/80 p-8"
      >
        <div className="text-center">
          {restaurant.heroImage ? (
            <div className="w-32 h-32 mx-auto rounded-2xl overflow-hidden">
              <img src={restaurant.heroImage} alt={restaurant.name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-32 h-32 mx-auto rounded-2xl bg-zinc-800 flex items-center justify-center">
              <span className="text-3xl font-bold text-zinc-600">{restaurant.name.charAt(0)}</span>
            </div>
          )}
          <h2 className="mt-4 text-2xl font-bold">{restaurant.name}</h2>
          {!restaurant.hasData && (
            <p className="mt-2 text-xs text-zinc-600">Coming soon</p>
          )}
        </div>
        <div className="mt-8 flex justify-between text-xs text-zinc-600">
          <span>&larr; Skip</span>
          <span>I order this &rarr;</span>
        </div>
      </motion.div>

      <div className="mt-6 flex gap-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onSwipe("left")}
          className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-900 py-4 text-sm font-medium text-zinc-400 transition-all hover:border-zinc-700"
        >
          Skip
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onSwipe("right")}
          className={`flex-1 rounded-2xl py-4 text-sm font-semibold transition-all ${
            restaurant.hasData
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
              : "bg-zinc-900 border border-zinc-800 text-zinc-500 cursor-not-allowed"
          }`}
          disabled={!restaurant.hasData}
        >
          {restaurant.hasData ? "I order this" : "Coming soon"}
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Meal Type Screen ────────────────────────────────────
function MealTypeScreen({
  restaurantName,
  containers,
  onSelect,
}: {
  restaurantName: string;
  containers: Container[];
  onSelect: (containerId: string) => void;
}) {
  // Fallback to hardcoded mealTypes if no containers in DB yet
  const items = containers.length > 0
    ? containers.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        sprite: c.sprite_path,
      }))
    : mealTypes.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        sprite: t.sprite,
      }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-sm"
    >
      <p className="text-sm text-zinc-500 mb-2">
        {restaurantName || "Loading..."}
      </p>
      <h2 className="text-2xl font-bold mb-8">What do you usually get?</h2>

      <div className="grid grid-cols-2 gap-3">
        {items.map((item, i) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(item.id)}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 text-left transition-all hover:border-zinc-600 hover:bg-zinc-800/80 flex flex-col items-center"
          >
            {item.sprite ? (
              <div className="w-20 h-20 relative">
                <img src={item.sprite} alt={item.name} className="w-full h-full object-cover rounded-xl" />
              </div>
            ) : (
              <div className="w-20 h-20 flex items-center justify-center rounded-xl bg-zinc-800/60">
                <span className="text-3xl font-bold text-zinc-400">{item.name.charAt(0)}</span>
              </div>
            )}
            <p className="mt-3 text-base font-semibold">{item.name}</p>
            <p className="mt-1 text-xs text-zinc-500 text-center">{item.description}</p>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Pick Meal Screen (for template-based restaurants like Panda Express) ──
function PickMealScreen({
  restaurantName,
  containerName,
  meals,
  onSelect,
  onBack,
}: {
  restaurantName: string;
  containerName: string;
  meals: TemplateMeal[];
  onSelect: (meal: TemplateMeal) => void;
  onBack: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-sm"
    >
      <button onClick={onBack} className="text-xs text-zinc-500 mb-4 flex items-center gap-1 hover:text-zinc-300 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Change size
      </button>

      <p className="text-sm text-zinc-500 mb-1">{restaurantName} — {containerName}</p>
      <h2 className="text-2xl font-bold mb-2">Which one hits closest?</h2>
      <p className="text-xs text-zinc-500 mb-6">Pick the order you&apos;d normally get</p>

      <div className="space-y-3">
        {meals.map((meal, i) => {
          const ingredientNames = (meal.ingredients ?? []).map((ing) => ing.name).join(" + ");
          return (
            <motion.button
              key={meal.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(meal)}
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 text-left transition-all hover:border-zinc-600 hover:bg-zinc-800/80"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold">{meal.name}</p>
                  <p className="text-xs text-zinc-500 mt-1 truncate">{ingredientNames}</p>
                </div>
                <div className="text-right ml-3 flex-shrink-0">
                  <p className="text-lg font-bold tabular-nums">{meal.totals.calories}</p>
                  <p className="text-[10px] text-zinc-500">cal</p>
                </div>
              </div>
              <div className="flex gap-3 mt-3 text-[11px] text-zinc-500">
                <span>{meal.totals.protein}g protein</span>
                <span>{meal.totals.fat}g fat</span>
                <span>{meal.totals.carbs}g carbs</span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Build Step Screen (Interactive quiz card) ───────────
function BuildStepScreen({
  step,
  stepIndex,
  totalSteps,
  ingredients,
  getQty,
  isSingleSelect,
  totalCalories,
  shellCalories,
  pastProtein,
  mealType,
  onSelect,
  onQuantityChange,
  onNext,
  onDone,
  onBack,
}: {
  step: (typeof buildSteps)[0];
  stepIndex: number;
  totalSteps: number;
  ingredients: Ingredient[];
  getQty: (id: string) => number;
  isSingleSelect: boolean;
  totalCalories: number;
  shellCalories: number;
  pastProtein: boolean;
  mealType: string;
  onSelect: (id: string) => void;
  onQuantityChange: (id: string, delta: number) => void;
  onNext: () => void;
  onDone: () => void;
  onBack: () => void;
}) {
  const isProteinStep = step.categoryId === "chipotle_protein";
  const isLastStep = stepIndex === totalSteps - 1;
  const hasSelection = ingredients.some((ing) => getQty(ing.id) > 0);

  // Auto-advance for simple single-select (rice/beans, NOT protein)
  const [justSelected, setJustSelected] = useState(false);

  const handlePick = (id: string) => {
    onSelect(id);
    if (isSingleSelect && !isProteinStep) {
      if (getQty(id) > 0) return; // deselecting, don't advance
      setJustSelected(true);
    }
  };

  useEffect(() => {
    if (justSelected && isSingleSelect && !isProteinStep) {
      const timer = setTimeout(() => {
        onNext();
        setJustSelected(false);
      }, 600);
      return () => clearTimeout(timer);
    }
    setJustSelected(false);
  }, [justSelected, isSingleSelect, isProteinStep, onNext]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-md"
    >
      {/* Back + progress */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div className="flex gap-1.5">
          {buildSteps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                i < stepIndex
                  ? "bg-emerald-500"
                  : i === stepIndex
                  ? "bg-white scale-125"
                  : "bg-zinc-800"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Calorie counter */}
      <div className="text-center mb-8">
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
          Your {mealType}
        </p>
        <div className="flex items-baseline justify-center gap-2">
          <AnimatedCalories
            value={totalCalories}
            className="text-5xl font-bold text-white tabular-nums"
          />
          <span className="text-lg text-zinc-500">cal</span>
        </div>
        {shellCalories > 0 && (
          <p className="text-xs text-zinc-600 mt-1">incl. {shellCalories} cal tortilla</p>
        )}
      </div>

      {/* Question */}
      <h2 className="text-xl font-bold mb-1">{step.label}</h2>
      <p className="text-sm text-zinc-500 mb-5">
        {isProteinStep
          ? "Pick your protein (use +/- for extra)"
          : isSingleSelect
          ? `Pick one${step.hasNone ? " (or skip)" : ""}`
          : "Add as many as you want"}
      </p>

      {/* Options */}
      <div className="space-y-2">
        {ingredients.map((ing, i) => {
          const qty = getQty(ing.id);
          const isSelected = qty > 0;

          return (
            <motion.div
              key={ing.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className={`rounded-2xl px-5 py-4 transition-all duration-200 flex items-center gap-3 ${
                isSelected
                  ? "bg-emerald-500/15 border-2 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                  : "bg-zinc-900/60 border-2 border-zinc-800 hover:border-zinc-600"
              }`}
            >
              {/* Checkbox / radio — clickable area */}
              <button
                onClick={() => isProteinStep ? onQuantityChange(ing.id, isSelected ? -qty : 1) : handlePick(ing.id)}
                className="flex-shrink-0"
              >
                <div
                  className={`h-6 w-6 ${
                    isSingleSelect && !isProteinStep ? "rounded-full" : "rounded-lg"
                  } border-2 flex items-center justify-center transition-all duration-200 ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-zinc-600"
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    >
                      {isSingleSelect && !isProteinStep ? (
                        <div className="h-2.5 w-2.5 rounded-full bg-black" />
                      ) : (
                        <svg className="h-3.5 w-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </motion.div>
                  )}
                </div>
              </button>

              {/* Name — also clickable */}
              <button
                onClick={() => isProteinStep ? onQuantityChange(ing.id, isSelected ? -qty : 1) : handlePick(ing.id)}
                className="flex-1 text-left min-w-0"
              >
                <p className={`font-medium ${isSelected ? "text-emerald-300" : "text-white"}`}>
                  {ing.name}
                </p>
                <p className="text-xs text-zinc-600 mt-0.5">{ing.portion_size}</p>
              </button>

              {/* Quantity stepper — shows for protein when selected */}
              {isProteinStep && isSelected && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1 flex-shrink-0"
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); onQuantityChange(ing.id, -1); }}
                    className="h-8 w-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
                  >
                    <svg className="w-4 h-4 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" d="M5 12h14" />
                    </svg>
                  </button>
                  <motion.span
                    key={qty}
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    className="w-8 text-center text-sm font-bold text-emerald-300 tabular-nums"
                  >
                    {qty}
                  </motion.span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onQuantityChange(ing.id, 1); }}
                    className="h-8 w-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
                  >
                    <svg className="w-4 h-4 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                </motion.div>
              )}

              {/* Calories badge */}
              <motion.div
                animate={isSelected ? { scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 0.3 }}
                className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-right ${
                  isSelected ? "bg-emerald-500/20" : "bg-zinc-800/60"
                }`}
              >
                <p className={`text-sm font-bold tabular-nums ${isSelected ? "text-emerald-300" : "text-zinc-300"}`}>
                  +{ing.calories * Math.max(qty, 1)}
                </p>
                <p className="text-[10px] text-zinc-600">
                  {(ing.protein_g * Math.max(qty, 1)).toFixed(0)}g P
                </p>
              </motion.div>
            </motion.div>
          );
        })}

        {/* "No [category]" option for rice/beans */}
        {step.hasNone && (
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ingredients.length * 0.05, duration: 0.3 }}
            onClick={onNext}
            className="w-full rounded-2xl px-5 py-4 text-left border-2 border-zinc-800/50 bg-zinc-900/30 hover:border-zinc-700 transition-all flex items-center gap-4"
          >
            <div className="h-6 w-6 rounded-full border-2 border-zinc-700 flex items-center justify-center">
              <svg className="w-3 h-3 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-sm text-zinc-500">No {step.label.toLowerCase()}</p>
          </motion.button>
        )}
      </div>

      {/* Bottom actions */}
      <div className="mt-6 space-y-3">
        {/* "I'm done" button - appears after protein */}
        {pastProtein && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.97 }}
            onClick={onDone}
            className="w-full rounded-2xl bg-emerald-500 px-6 py-4 text-base font-semibold text-black transition-all hover:bg-emerald-400 flex items-center justify-between"
          >
            <span>Done — see what this costs you</span>
            <AnimatedCalories
              value={totalCalories}
              className="text-lg font-bold tabular-nums"
            />
          </motion.button>
        )}

        {/* Next/Continue for multi-select categories */}
        {!isSingleSelect && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onNext}
            className={`w-full rounded-2xl px-6 py-3 text-sm font-medium transition-all ${
              pastProtein
                ? "border-2 border-zinc-800 text-zinc-400 hover:border-zinc-600"
                : "bg-white text-black hover:bg-zinc-100"
            }`}
          >
            {isLastStep
              ? "Done — see what this costs you"
              : hasSelection
              ? `Keep adding: ${buildSteps[stepIndex + 1]?.label ?? "Done"}`
              : `Skip ${step.label.toLowerCase()}`}
          </motion.button>
        )}

        {/* For protein — always show Next when something is selected */}
        {isProteinStep && hasSelection && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.97 }}
            onClick={onNext}
            className="w-full rounded-2xl bg-white px-6 py-4 text-base font-semibold text-black transition-all hover:bg-zinc-100"
          >
            Next: {buildSteps[stepIndex + 1]?.label ?? "Done"}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Swap Reveal Screen (combined reveal + results) ─────
function SwapRevealScreen({
  totals,
  shellIngredients,
  selectedIngredients,
  swap,
  mealType,
  originalMealName,
  onPersonalize,
  onBack,
}: {
  totals: { calories: number; protein: number; carbs: number; fat: number };
  shellIngredients: Ingredient[];
  selectedIngredients: Ingredient[];
  swap: TemplateMeal | null;
  mealType: string;
  originalMealName?: string;
  onPersonalize: () => void;
  onBack: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const savings = swap ? totals.calories - swap.totals.calories : 0;
  const weeklyLbs = swap ? ((savings * 7) / 3500).toFixed(1) : "0";
  const monthlyLbs = swap ? ((savings * 30) / 3500).toFixed(1) : "0";
  const allIngredients = [...shellIngredients, ...selectedIngredients];

  const mealEmoji =
    mealType === "burrito" ? "🌯" : mealType === "bowl" ? "🥗" : mealType === "tacos" ? "🌮" : "🥬";
  const mealTypeSprite = mealTypes.find((t) => t.id === mealType)?.sprite ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-lg"
    >
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Headline — top of screen */}
      {!revealed && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h2 className="text-2xl font-bold leading-tight">
            Want to learn how to lose{" "}
            <span className="text-emerald-400">{weeklyLbs} lb a week</span>{" "}
            simply by adjusting your current order at Chipotle?
          </h2>
        </motion.div>
      )}

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* LEFT: Your order */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className={`rounded-2xl border p-5 transition-all duration-700 ${
            revealed
              ? "border-red-500/30 bg-red-500/5"
              : "border-zinc-800 bg-zinc-900/60"
          }`}
        >
          <div className="text-center mb-4">
            {mealTypeSprite ? (
              <div className="w-20 h-20 mx-auto rounded-xl overflow-hidden">
                <img src={mealTypeSprite} alt={mealType} className="w-full h-full object-cover" />
              </div>
            ) : (
              <span className="text-4xl">{mealEmoji}</span>
            )}
            <p className="text-xs text-zinc-500 uppercase tracking-wider mt-2">
              Your {mealType}
            </p>
          </div>

          <div className="text-center mb-4">
            <AnimatedCalories
              value={totals.calories}
              className={`text-3xl font-bold tabular-nums transition-colors duration-700 ${
                revealed ? "text-red-400" : "text-white"
              }`}
            />
            <span className="text-sm text-zinc-500 ml-1">cal</span>
          </div>

          {/* Ingredient list — block rows */}
          <div className="space-y-1.5">
            {allIngredients.slice(0, 6).map((ing, i) => (
              <div
                key={`${ing.id}-${i}`}
                className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs"
                style={{ background: "rgba(39, 39, 42, 0.5)", boxShadow: "0 0 12px 2px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.05)" }}
              >
                <span className="text-zinc-400 truncate mr-2">{ing.name}</span>
                <span className="text-zinc-500 tabular-nums flex-shrink-0 font-medium">{ing.calories}</span>
              </div>
            ))}
            {allIngredients.length > 6 && (
              <p className="text-xs text-zinc-700 pl-1">+{allIngredients.length - 6} more</p>
            )}
          </div>

          {/* Fat callout after reveal */}
          {revealed && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-3 rounded-lg bg-red-500/10 px-3 py-2"
            >
              <p className="text-[11px] text-red-400/80">
                {totals.fat > 30
                  ? `${totals.fat.toFixed(0)}g of fat hiding in plain sight`
                  : `${totals.carbs.toFixed(0)}g carbs — more than you think`}
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* RIGHT: Mystery / Swap reveal */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={`rounded-2xl border p-5 transition-all duration-700 ${
            revealed
              ? "border-emerald-500/40 bg-emerald-500/5 shadow-[0_0_30px_rgba(16,185,129,0.08)]"
              : "border-zinc-800 bg-zinc-900/60"
          }`}
        >
          <div className="text-center mb-4">
            {revealed ? (
              swap?.sprite_url ? (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="relative w-20 h-20 mx-auto rounded-xl overflow-hidden"
                >
                  <img src={swap.sprite_url} alt={swap.name} className="w-full h-full object-cover" />
                </motion.div>
              ) : (
                mealTypeSprite ? (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="relative w-20 h-20 mx-auto rounded-xl overflow-hidden"
                  >
                    <img src={mealTypeSprite} alt={mealType} className="w-full h-full object-cover" />
                  </motion.div>
                ) : (
                  <motion.span
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="text-4xl inline-block"
                  >
                    {mealEmoji}
                  </motion.span>
                )
              )
            ) : (
              <div className="relative inline-block">
                {mealTypeSprite ? (
                  <div className="w-20 h-20 mx-auto rounded-xl overflow-hidden opacity-20 blur-sm">
                    <img src={mealTypeSprite} alt={mealType} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <span className="text-4xl opacity-20">{mealEmoji}</span>
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.span
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="text-2xl"
                  >
                    ?
                  </motion.span>
                </div>
              </div>
            )}
            <p className="text-xs uppercase tracking-wider mt-2">
              {revealed ? (
                <span className="text-emerald-400">The smarter order</span>
              ) : (
                <span className="text-zinc-500">Optimized Meal</span>
              )}
            </p>
          </div>

          <div className="text-center mb-4">
            {revealed && swap ? (
              <>
                <AnimatedCalories
                  value={swap.totals.calories}
                  className="text-3xl font-bold tabular-nums text-emerald-400"
                />
                <span className="text-sm text-zinc-500 ml-1">cal</span>
              </>
            ) : (
              <div className="h-[36px] flex items-center justify-center">
                <div className="flex gap-1">
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
            )}
          </div>

          {/* Ingredient list — same items, shows removals */}
          <div className="space-y-1.5">
            {allIngredients.slice(0, 6).map((ing, i) => {
              const swapHasIt = swap?.ingredients.some((si) => si.name === ing.name) ?? true;
              const isRemoved = revealed && !swapHasIt;
              return (
                <div
                  key={`swap-${ing.id}-${i}`}
                  className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs"
                  style={isRemoved
                    ? { background: "rgba(239, 68, 68, 0.08)", boxShadow: "0 0 12px 2px rgba(239,68,68,0.06), inset 0 1px 0 rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.15)" }
                    : { background: "rgba(39, 39, 42, 0.5)", boxShadow: "0 0 12px 2px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.05)" }
                  }
                >
                  {revealed ? (
                    isRemoved ? (
                      <>
                        <span className="flex items-center gap-1.5 truncate mr-2 text-red-400 line-through">
                          <span className="w-4 h-4 rounded bg-red-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-red-400 font-bold text-[9px] leading-none">✕</span>
                          </span>
                          {ing.name}
                        </span>
                        <span className="text-red-400 tabular-nums flex-shrink-0 font-semibold">
                          −{ing.calories}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-zinc-400 truncate mr-2">{ing.name}</span>
                        <span className="text-zinc-500 tabular-nums flex-shrink-0 font-medium">{ing.calories}</span>
                      </>
                    )
                  ) : (
                    <div className="h-3 rounded bg-zinc-800/50 w-full" />
                  )}
                </div>
              );
            })}
            {allIngredients.length > 6 && (
              <p className="text-xs text-zinc-700 pl-1">+{allIngredients.length - 6} more</p>
            )}
          </div>

          {/* Swap rationale after reveal */}
          {revealed && swap?.swap_rationale && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-3"
            >
              <p className="text-[11px] text-zinc-500 italic leading-relaxed">
                {swap.swap_rationale}
              </p>
            </motion.div>
          )}

          {/* Pre-reveal teaser */}
          {!revealed && (
            <div className="mt-4 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-3 rounded bg-zinc-800/50" style={{ width: `${90 - i * 15}%` }} />
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Reveal button or results */}
      <AnimatePresence mode="wait">
        {!revealed ? (
          <motion.div
            key="pre-reveal"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setRevealed(true)}
              className="w-full rounded-2xl bg-emerald-500 px-8 py-4 text-base font-semibold text-black transition-all hover:bg-emerald-400 flex items-center justify-center gap-3"
            >
              <span>Show me the swap</span>
              <motion.span
                animate={{ x: [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                &rarr;
              </motion.span>
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="post-reveal"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {/* Savings callout */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
              className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-center mb-4"
            >
              <motion.p
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
                className="text-4xl font-bold text-emerald-400 tabular-nums"
              >
                {savings} cal
              </motion.p>
              <p className="text-sm text-zinc-400 mt-2">saved per order</p>

              <div className="flex justify-center gap-6 mt-4">
                <div>
                  <p className="text-xl font-bold text-white">{weeklyLbs}</p>
                  <p className="text-xs text-zinc-500">lbs/week</p>
                </div>
                <div className="w-px bg-zinc-800" />
                <div>
                  <p className="text-xl font-bold text-white">{monthlyLbs}</p>
                  <p className="text-xs text-zinc-500">lbs/month</p>
                </div>
              </div>

              <p className="text-xs text-zinc-600 mt-3">
                No gym. No meal prep. Just ordering smarter.
              </p>
            </motion.div>

            <p className="text-center text-sm text-zinc-500 mb-4">
              Want to see exactly when you&apos;ll hit your goal weight?
            </p>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onPersonalize}
              className="w-full rounded-2xl bg-white px-8 py-4 text-base font-semibold text-black transition-all hover:bg-zinc-100"
            >
              Personalize this for me
            </motion.button>

            <p className="mt-3 text-xs text-zinc-600 text-center">
              2 quick questions. See your personal timeline.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Weight Input Screen ────────────────────────────────
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-sm"
    >
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-8"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <h2 className="text-2xl font-bold mb-2">
        Let&apos;s make this personal
      </h2>
      <p className="text-sm text-zinc-500 mb-8">
        Two numbers. That&apos;s it.
      </p>

      {/* Current weight */}
      <div className="mb-6">
        <label className="text-xs text-zinc-500 uppercase tracking-wider mb-2 block">
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
            className="w-full rounded-2xl border-2 border-zinc-800 bg-zinc-900/60 px-5 py-4 text-2xl font-bold text-white placeholder:text-zinc-700 focus:border-emerald-500/50 focus:outline-none transition-colors tabular-nums"
          />
          <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm text-zinc-600">
            lbs
          </span>
        </div>
      </div>

      {/* Goal weight */}
      <div className="mb-8">
        <label className="text-xs text-zinc-500 uppercase tracking-wider mb-2 block">
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
            className="w-full rounded-2xl border-2 border-zinc-800 bg-zinc-900/60 px-5 py-4 text-2xl font-bold text-white placeholder:text-zinc-700 focus:border-emerald-500/50 focus:outline-none transition-colors tabular-nums"
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
          className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 mb-6 text-center"
        >
          <p className="text-sm text-zinc-500">
            That&apos;s{" "}
            <span className="text-white font-semibold">
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
            : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
        }`}
      >
        Show me my timeline
      </motion.button>
    </motion.div>
  );
}

// ─── Projection Screen (animated graph + email capture) ──
function ProjectionScreen({
  currentWeight,
  goalWeight,
  calSavedPerOrder,
  swapName,
  restaurantName = "Chipotle",
  sessionTotalSavings,
  completedMeals,
  onEmailSubmit,
  onBack,
  isBibleDeepLink,
}: {
  currentWeight: number;
  goalWeight: number;
  calSavedPerOrder: number;
  swapName: string;
  restaurantName?: string;
  sessionTotalSavings: number;
  completedMeals: CompletedMeal[];
  onEmailSubmit: (email: string) => void;
  onBack: () => void;
  isBibleDeepLink?: boolean;
}) {
  const [animationDone, setAnimationDone] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [ordersPerWeek, setOrdersPerWeek] = useState(7);
  const weightToLose = currentWeight - goalWeight;
  // 3500 cal = 1 lb
  const lbsPerWeek = (calSavedPerOrder * ordersPerWeek) / 3500;
  const weeksToGoal = Math.ceil(weightToLose / lbsPerWeek);
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + weeksToGoal * 7);
  const targetDateStr = targetDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Generate curve points (ease-out: faster loss at start, slows down)
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

  // SVG — current weight at TOP-LEFT, goal weight at BOTTOM-RIGHT (weight goes DOWN)
  const svgW = 320;
  const svgH = 160;
  const padX = 40;
  const padY = 20;
  const chartW = svgW - padX * 2;
  const chartH = svgH - padY * 2;

  const toX = (i: number) => padX + (i / points) * chartW;
  const toY = (w: number) => {
    const range = currentWeight - goalWeight;
    const normalized = (currentWeight - w) / range;
    // normalized=0 at currentWeight (top), normalized=1 at goalWeight (bottom)
    return padY + normalized * chartH;
  };

  const pathD = curveData
    .map((d, i) => {
      const x = toX(i);
      const y = toY(d.weight);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(" ");

  // Trigger animation after mount
  useEffect(() => {
    const timer = setTimeout(() => setAnimationDone(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@") || submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/send-swap-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          currentWeight,
          goalWeight,
          calSavedPerOrder,
          lbsPerWeek,
          weeksToGoal,
          targetDate: targetDateStr,
          ordersPerWeek,
          swapName,
          completedMeals,
          sessionTotalSavings,
        }),
      });
    } catch {
      // Still proceed — email capture is best-effort
    }
    onEmailSubmit(email);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-md"
    >
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Headline */}
      <div className="text-center mb-6">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          className="text-2xl font-bold"
        >
          You&apos;ll hit your goal weight of{" "}
          <span className="text-emerald-400">{goalWeight} lbs</span> by{" "}
          <span className="text-emerald-400">{targetDateStr}</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="text-sm text-zinc-500 mt-2"
        >
          Just from changing your current order at {restaurantName}, {ordersPerWeek}x/week
        </motion.p>
      </div>

      {/* Graph */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 mb-6"
      >
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full">
          {/* Grid lines */}
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

          {/* Y-axis labels — current at top, goal at bottom */}
          <text x={padX - 5} y={padY + 4} textAnchor="end" fill="#ef4444" fontSize={10} fontWeight="bold">
            {currentWeight}
          </text>
          <text x={padX - 5} y={padY + chartH + 4} textAnchor="end" fill="#34d399" fontSize={10} fontWeight="bold">
            {goalWeight}
          </text>

          {/* Animated line */}
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

          {/* Start dot */}
          <motion.circle
            cx={toX(0)}
            cy={toY(currentWeight)}
            r={4}
            fill="#ef4444"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          />

          {/* End dot */}
          <motion.circle
            cx={toX(points)}
            cy={toY(goalWeight)}
            r={5}
            fill="#34d399"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 2, type: "spring", stiffness: 300 }}
          />

          {/* "YOU" label at start */}
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

          {/* Goal label */}
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

          {/* Date at bottom right */}
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

          {/* "Today" at bottom left */}
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
        className="flex items-center justify-center gap-3 mb-4"
      >
        <span className="text-xs text-zinc-500">Orders per week:</span>
        <div className="flex gap-1">
          {[3, 4, 5, 6, 7].map((n) => (
            <button
              key={n}
              onClick={() => setOrdersPerWeek(n)}
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
        className="flex justify-center gap-6 mb-8 text-center"
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
          Want us to email you this plan with your {swapName || "swap"}?
        </p>
        <form onSubmit={handleSubmit} className="flex gap-2">
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
            disabled={submitting}
            className="rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-black hover:bg-emerald-400 transition-colors flex-shrink-0 disabled:opacity-50"
          >
            {submitting ? "Sending..." : "Send it"}
          </motion.button>
        </form>
        <p className="text-center text-[11px] text-zinc-700 mt-3">
          Just the plan. No spam. Unsubscribe anytime.
        </p>
      </motion.div>
    </motion.div>
  );
}

function GeneratingScreen({
  email,
  restaurantName,
  onContinue,
  onBack,
}: {
  email: string | null;
  restaurantName: string;
  onContinue: () => void;
  onBack: () => void;
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    let finished = false;
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const pct = Math.min(100, Math.round((elapsed / reportGenerationDurationMs) * 100));
      setProgress(pct);
      if (!finished && pct >= 100) {
        finished = true;
        window.clearInterval(timer);
        onContinue();
      }
    }, 120);

    return () => window.clearInterval(timer);
  }, [onContinue]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.45 }}
      className="w-full max-w-md"
    >
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-4"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to projection
      </motion.button>

      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5 mb-4">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-400/80 mb-2">Generating report</p>
        <h2 className="text-xl font-bold text-white">Crunching the numbers on your {restaurantName} swap</h2>
        <p className="text-sm text-zinc-400 mt-2">
          {email ? `Preparing and sending to ${email}` : "Preparing your report now"}
        </p>

        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <motion.div
              className="h-full bg-emerald-500"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.15, ease: "linear" }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
            <span>About 15 seconds</span>
            <span className="font-semibold text-zinc-300">{progress}%</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 mb-4">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-2">Why this works</p>
        <p className="text-sm leading-relaxed text-zinc-300">{swapsMissionStatement}</p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 mb-4 space-y-2.5">
        {reportGenerationSteps.map((step) => {
          const complete = progress >= step.threshold;
          return (
            <div key={step.label} className="flex items-center gap-2.5">
              <div
                className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                  complete ? "border-emerald-500 bg-emerald-500/20" : "border-zinc-700"
                }`}
              >
                {complete && (
                  <svg className="w-2.5 h-2.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <p className={complete ? "text-sm text-zinc-200" : "text-sm text-zinc-500"}>{step.label}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 mb-4">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-2">How it works</p>
        <div className="space-y-2">
          {swapsMissionPillars.map((pillar) => (
            <p key={pillar} className="text-sm text-zinc-300 leading-relaxed">
              {pillar}
            </p>
          ))}
        </div>
      </div>

      <button
        onClick={onContinue}
        className="w-full rounded-xl border border-zinc-700 py-3 text-sm text-zinc-300 hover:border-zinc-500 transition-colors"
      >
        Continue now
      </button>
    </motion.div>
  );
}

// ─── Crossroads Screen (Post-Email) ─────────────────────
const comingSoonRestaurants = [
  { id: "burgers", name: "Burgers", initial: "B" },
  { id: "chickfila", name: "Chick-fil-A", initial: "C" },
  { id: "indian", name: "Indian", initial: "I" },
  { id: "pizza", name: "Pizza", initial: "P" },
  { id: "sushi", name: "Sushi", initial: "S" },
  { id: "thai", name: "Thai Food", initial: "T" },
];

function CrossroadsScreen({
  completedMeals,
  currentWeight,
  goalWeight,
  sessionTotalSavings,
  sessionLbsPerWeek,
  onFindNextSwap,
  onWatchVSL,
  onConcierge,
  onDone,
  onBack,
  isBibleDeepLink,
}: {
  completedMeals: CompletedMeal[];
  currentWeight: number;
  goalWeight: number;
  sessionTotalSavings: number;
  sessionLbsPerWeek: number;
  onFindNextSwap: () => void;
  onWatchVSL: () => void;
  onConcierge: () => void;
  onDone: () => void;
  onBack: () => void;
  isBibleDeepLink?: boolean;
}) {
  const alreadySeen = typeof window !== "undefined" && sessionStorage.getItem("crossroads_seen") === "1";
  const [showMultiplier, setShowMultiplier] = useState(alreadySeen);
  const [showCTA, setShowCTA] = useState(alreadySeen);
  const skipAnim = alreadySeen;
  const weightToLose = currentWeight - goalWeight;
  const weeksToGoal = sessionLbsPerWeek > 0 ? Math.ceil(weightToLose / sessionLbsPerWeek) : 999;
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + weeksToGoal * 7);
  const targetDateStr = targetDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  // Multiplier: location-based. Average person orders from ~4 different restaurants.
  const avgRestaurants = 4;
  const multipliedLbsPerWeek = sessionLbsPerWeek * avgRestaurants;
  const multipliedCalPerWeek = sessionTotalSavings * 7 * avgRestaurants;

  useEffect(() => {
    if (alreadySeen) return;
    const t1 = setTimeout(() => setShowMultiplier(true), 1500);
    const t2 = setTimeout(() => setShowCTA(true), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Mark crossroads as seen once it renders
  useEffect(() => {
    sessionStorage.setItem("crossroads_seen", "1");
  }, []);

  return (
    <motion.div
      initial={skipAnim ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: skipAnim ? 0 : 0.6 }}
      className="w-full max-w-md"
    >
      {/* Back button */}
      <motion.button
        initial={skipAnim ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-4"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to results
      </motion.button>

      {/* Phase 1: Completion reward */}
      <motion.div
        initial={skipAnim ? false : { scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center mb-6"
      >
        <motion.div
          initial={skipAnim ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={skipAnim ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 20 }}
          className="h-14 w-14 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4"
        >
          <svg className="h-7 w-7 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
        <h2 className="text-xl font-bold">Your swap plan is on its way</h2>
        <p className="text-sm text-zinc-500 mt-1">Check your inbox</p>
      </motion.div>

      {/* Completed meals recap */}
      <motion.div
        initial={skipAnim ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={skipAnim ? { duration: 0 } : { delay: 0.3 }}
        className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 mb-4"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-zinc-500 uppercase tracking-wider">Your session</span>
          <span className="text-xs text-emerald-400 font-bold">{completedMeals.length} swap{completedMeals.length !== 1 ? "s" : ""}</span>
        </div>
        {completedMeals.map((meal, i) => (
          <div key={i} className="flex items-center justify-between py-1.5">
            <span className="text-sm text-zinc-300">
              {meal.restaurant ? `${meal.restaurant} — ` : ""}{meal.swapName}
            </span>
            <span className="text-sm font-bold text-emerald-400 tabular-nums">-{meal.savings} cal</span>
          </div>
        ))}
        <div className="border-t border-zinc-800 mt-2 pt-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Total saved per order</span>
          <span className="text-lg font-bold text-emerald-400 tabular-nums">{sessionTotalSavings} cal</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-zinc-500">That&apos;s {sessionLbsPerWeek.toFixed(1)} lbs/week</span>
          <span className="text-xs text-zinc-500">Goal by {targetDateStr}</span>
        </div>
      </motion.div>

      {/* Phase 2: The Multiplier */}
      <AnimatePresence>
        {showMultiplier && (
          <motion.div
            initial={skipAnim ? false : { opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={skipAnim ? { duration: 0 } : { type: "spring", stiffness: 200, damping: 25 }}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 mb-6 text-center"
          >
            <p className="text-sm text-zinc-400 mb-2">
              That was <span className="text-white font-semibold">1 restaurant</span>.
            </p>
            <p className="text-sm text-zinc-400 mb-4">
              Most people order from <span className="text-white font-semibold">4 different spots</span> every week.
            </p>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">If you optimized all of them...</p>
            <div className="flex justify-center gap-6">
              <div>
                <AnimatedCalories
                  value={multipliedCalPerWeek}
                  className="text-2xl font-bold text-emerald-400 tabular-nums"
                />
                <p className="text-xs text-zinc-500">cal/week</p>
              </div>
              <div className="w-px bg-zinc-800" />
              <div>
                <p className="text-2xl font-bold text-emerald-400">{multipliedLbsPerWeek.toFixed(1)}</p>
                <p className="text-xs text-zinc-500">lbs/week</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase 3: Three CTAs */}
      <AnimatePresence>
        {showCTA && (
          <motion.div
            initial={skipAnim ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {/* CTA 1: Find next swap → bible */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onFindNextSwap}
              className="w-full rounded-2xl bg-emerald-500 px-6 py-4 text-base font-semibold text-black transition-all hover:bg-emerald-400 flex items-center justify-center gap-2"
            >
              <span>Find your next swap</span>
              <motion.span animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>&rarr;</motion.span>
            </motion.button>

            {/* CTA 2: Coaching bridge → concierge page */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onConcierge}
              className="w-full rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 px-6 py-4 text-sm font-medium text-emerald-400 transition-all hover:border-emerald-500/50 hover:bg-emerald-500/10 flex items-center justify-center gap-2"
            >
              <span>Want this done for everything you eat?</span>
            </motion.button>

            {/* CTA 3: VSL education */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onWatchVSL}
              className="w-full rounded-2xl border border-zinc-800 px-6 py-3.5 text-sm text-zinc-400 transition-all hover:border-zinc-600 hover:text-zinc-300 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>See why this works</span>
            </motion.button>

            {/* Done */}
            <button
              onClick={onDone}
              className="w-full text-center text-sm text-zinc-600 hover:text-zinc-400 transition-colors py-2"
            >
              Done for now
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
