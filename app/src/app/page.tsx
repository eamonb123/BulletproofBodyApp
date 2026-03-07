"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { tutorialMeals, allMeals, type FoodSwap } from "@/data/foods";
import MealCard from "@/components/MealCard";
import RunningCounter from "@/components/RunningCounter";
import dynamic from "next/dynamic";
import {
  calculateRMR,
  calculateTDEE,
  weeklyFatLoss,
  generateProjection,
  daysToGoal,
  estimateGeneralRange,
} from "@/lib/calculator";

const ProjectionChart = dynamic(() => import("@/components/ProjectionChart"), {
  ssr: false,
});

// ─── Types ───────────────────────────────────────────
interface SwapSelection {
  originalId: string;
  swapId: string;
  caloriesSaved: number;
}

interface PersonalData {
  age: number;
  weight: number;
  height: number;
  gender: "male" | "female";
  goalWeight: number;
}

// ─── Step Transition ─────────────────────────────────
const stepVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

// ─── Main App ────────────────────────────────────────
export default function Home() {
  const [step, setStep] = useState(0);
  const [selectedMeals, setSelectedMeals] = useState<Set<string>>(new Set());
  const [swaps, setSwaps] = useState<SwapSelection[]>([]);
  const [personalData, setPersonalData] = useState<PersonalData | null>(null);
  const [formData, setFormData] = useState({
    age: "",
    weight: "",
    heightFt: "",
    heightIn: "",
    gender: "male" as "male" | "female",
    goalWeight: "",
  });
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // ─── Computed values ─────────────────────────────
  const totalCaloriesSaved = useMemo(
    () => swaps.reduce((sum, s) => sum + s.caloriesSaved, 0),
    [swaps]
  );

  const generalRange = useMemo(
    () => estimateGeneralRange(totalCaloriesSaved),
    [totalCaloriesSaved]
  );

  const projection = useMemo(() => {
    if (!personalData) return null;
    const rmr = calculateRMR(
      personalData.weight,
      personalData.height,
      personalData.age,
      personalData.gender
    );
    const tdee = calculateTDEE(rmr);
    const weekly = weeklyFatLoss(totalCaloriesSaved);
    const days = daysToGoal(
      personalData.weight,
      personalData.goalWeight,
      totalCaloriesSaved
    );
    const curve = generateProjection(
      personalData.weight,
      personalData.goalWeight,
      totalCaloriesSaved
    );
    return { rmr, tdee, weekly, days, curve };
  }, [personalData, totalCaloriesSaved]);

  // ─── Handlers ────────────────────────────────────
  function toggleMeal(id: string) {
    setSelectedMeals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setSwaps((s) => s.filter((sw) => sw.originalId !== id));
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectSwap(originalId: string, swap: FoodSwap) {
    const saved = swap.original.calories - swap.swaps[0].calories;
    setSwaps((prev) => {
      const filtered = prev.filter((s) => s.originalId !== originalId);
      return [
        ...filtered,
        { originalId, swapId: swap.swaps[0].id, caloriesSaved: saved },
      ];
    });
  }

  function handlePersonalize() {
    const heightInches =
      parseInt(formData.heightFt) * 12 + parseInt(formData.heightIn);
    setPersonalData({
      age: parseInt(formData.age),
      weight: parseFloat(formData.weight),
      height: heightInches,
      gender: formData.gender,
      goalWeight: parseFloat(formData.goalWeight),
    });
    setStep(4);
  }

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setStep(5);
  }

  // ─── Which meals to show ─────────────────────────
  const mealsToShow = step <= 1 ? tutorialMeals : allMeals;

  // ─── Render ──────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-zinc-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-zinc-900">
              Bulletproof Body
            </h1>
            <p className="text-xs text-zinc-400">
              Same DoorDash. Smarter Order.
            </p>
          </div>
          {/* Progress dots */}
          <div className="flex gap-1.5">
            {[0, 1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-2 w-2 rounded-full transition-all ${
                  s <= step ? "bg-emerald-500" : "bg-zinc-200"
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-lg px-5 pb-32 pt-6">
        <AnimatePresence mode="wait">
          {/* ─── STEP 0: Pick Your Meals ──────────── */}
          {step === 0 && (
            <motion.div
              key="step0"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-2xl font-bold text-zinc-900">
                What do you normally order?
              </h2>
              <p className="mt-2 text-zinc-500">
                Pick the meals you order most on DoorDash or UberEats.
              </p>

              <div className="mt-6 grid gap-3">
                {mealsToShow.map((swap) => (
                  <MealCard
                    key={swap.original.id}
                    food={swap.original}
                    selected={selectedMeals.has(swap.original.id)}
                    onClick={() => toggleMeal(swap.original.id)}
                  />
                ))}
              </div>

              {selectedMeals.size >= 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6"
                >
                  <button
                    onClick={() => setStep(1)}
                    className="w-full rounded-2xl bg-zinc-900 px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-zinc-800"
                  >
                    Show me the swaps
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ─── STEP 1: See Your Swaps ──────────── */}
          {step === 1 && (
            <motion.div
              key="step1"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-2xl font-bold text-zinc-900">
                Here&apos;s where the fat is hiding
              </h2>
              <p className="mt-2 text-zinc-500">
                Same restaurants. Same convenience. Different outcome.
              </p>

              <div className="mt-6 space-y-6">
                {mealsToShow
                  .filter((s) => selectedMeals.has(s.original.id))
                  .map((swap) => {
                    const isSwapped = swaps.some(
                      (s) => s.originalId === swap.original.id
                    );
                    return (
                      <div key={swap.original.id}>
                        {/* Original */}
                        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">
                              {swap.original.emoji}
                            </span>
                            <div>
                              <p className="font-semibold text-zinc-900">
                                {swap.original.name}
                              </p>
                              <p className="text-sm text-zinc-500">
                                {swap.original.restaurant}
                              </p>
                            </div>
                            <p className="ml-auto text-lg font-bold text-red-600">
                              {swap.original.calories} cal
                            </p>
                          </div>
                        </div>

                        {/* Arrow */}
                        <div className="flex justify-center py-2">
                          <svg
                            className="h-6 w-6 text-emerald-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2.5}
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3"
                            />
                          </svg>
                        </div>

                        {/* Swap */}
                        <button
                          onClick={() => selectSwap(swap.original.id, swap)}
                          className={`w-full rounded-2xl border-2 p-4 text-left transition-all ${
                            isSwapped
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-zinc-200 bg-white hover:border-emerald-300"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xl">
                              {swap.swaps[0].emoji}
                            </span>
                            <div>
                              <p className="font-semibold text-zinc-900">
                                {swap.swaps[0].name}
                              </p>
                              <p className="text-sm text-zinc-500">
                                {swap.swaps[0].restaurant}
                              </p>
                            </div>
                            <p className="ml-auto text-lg font-bold text-emerald-600">
                              {swap.swaps[0].calories} cal
                            </p>
                          </div>
                          <p className="mt-2 text-sm text-zinc-500">
                            {swap.rationale}
                          </p>
                          {isSwapped && (
                            <motion.p
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="mt-2 text-sm font-semibold text-emerald-600"
                            >
                              -{swap.original.calories - swap.swaps[0].calories}{" "}
                              cal saved per day
                            </motion.p>
                          )}
                        </button>
                      </div>
                    );
                  })}
              </div>

              {swaps.length >= 2 && (
                <div className="mt-8 space-y-3">
                  <button
                    onClick={() => setStep(2)}
                    className="w-full rounded-2xl bg-zinc-900 px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-zinc-800"
                  >
                    See more meals
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="w-full rounded-2xl border-2 border-emerald-500 px-6 py-4 text-lg font-semibold text-emerald-600 transition-colors hover:bg-emerald-50"
                  >
                    Personalize my results
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ─── STEP 2: Expanded Library ─────────── */}
          {step === 2 && (
            <motion.div
              key="step2"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-2xl font-bold text-zinc-900">
                More meals, more savings
              </h2>
              <p className="mt-2 text-zinc-500">
                Pick any meals you order regularly. Each swap adds to your total.
              </p>

              <div className="mt-6 space-y-6">
                {allMeals
                  .filter((s) => !selectedMeals.has(s.original.id))
                  .map((swap) => {
                    const isSwapped = swaps.some(
                      (s) => s.originalId === swap.original.id
                    );
                    return (
                      <div key={swap.original.id}>
                        <div className="flex items-center gap-3 rounded-xl border border-zinc-200 p-3">
                          <span className="text-xl">
                            {swap.original.emoji}
                          </span>
                          <div className="flex-1">
                            <p className="font-semibold text-zinc-900">
                              {swap.original.name}
                            </p>
                            <p className="text-xs text-zinc-400">
                              {swap.original.restaurant} &middot;{" "}
                              {swap.original.calories} cal
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              toggleMeal(swap.original.id);
                              selectSwap(swap.original.id, swap);
                            }}
                            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                              isSwapped
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                            }`}
                          >
                            {isSwapped ? (
                              <>
                                Swapped &middot; -
                                {swap.original.calories -
                                  swap.swaps[0].calories}{" "}
                                cal
                              </>
                            ) : (
                              <>
                                Swap to {swap.swaps[0].calories} cal
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="mt-8">
                <button
                  onClick={() => setStep(3)}
                  className="w-full rounded-2xl bg-zinc-900 px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-zinc-800"
                >
                  Personalize my results
                </button>
              </div>
            </motion.div>
          )}

          {/* ─── STEP 3: Personalize ──────────────── */}
          {step === 3 && (
            <motion.div
              key="step3"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              {/* General range teaser */}
              {totalCaloriesSaved > 0 && (
                <div className="mb-6 rounded-2xl bg-emerald-50 p-5 text-center">
                  <p className="text-sm text-emerald-700">
                    Based on your swaps, you&apos;d lose roughly
                  </p>
                  <p className="mt-1 text-3xl font-bold text-emerald-600">
                    {generalRange.lowLbs}–{generalRange.highLbs} lbs
                  </p>
                  <p className="text-sm text-emerald-600">per week</p>
                </div>
              )}

              <h2 className="text-2xl font-bold text-zinc-900">
                Want exact numbers?
              </h2>
              <p className="mt-2 text-zinc-500">
                We&apos;ll tailor the projection to your body. Takes 15 seconds.
              </p>

              <div className="mt-6 space-y-4">
                {/* Gender */}
                <div className="flex gap-3">
                  {(["male", "female"] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() =>
                        setFormData((f) => ({ ...f, gender: g }))
                      }
                      className={`flex-1 rounded-xl border-2 px-4 py-3 text-center font-medium transition-all ${
                        formData.gender === g
                          ? "border-zinc-900 bg-zinc-50"
                          : "border-zinc-200 text-zinc-500 hover:border-zinc-300"
                      }`}
                    >
                      {g === "male" ? "Male" : "Female"}
                    </button>
                  ))}
                </div>

                {/* Age */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-600">
                    Age
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="33"
                    value={formData.age}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, age: e.target.value }))
                    }
                    className="w-full rounded-xl border-2 border-zinc-200 px-4 py-3 text-lg focus:border-zinc-900 focus:outline-none"
                  />
                </div>

                {/* Weight */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-600">
                    Current Weight (lbs)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="195"
                    value={formData.weight}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, weight: e.target.value }))
                    }
                    className="w-full rounded-xl border-2 border-zinc-200 px-4 py-3 text-lg focus:border-zinc-900 focus:outline-none"
                  />
                </div>

                {/* Height */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-600">
                    Height
                  </label>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="5"
                        value={formData.heightFt}
                        onChange={(e) =>
                          setFormData((f) => ({
                            ...f,
                            heightFt: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border-2 border-zinc-200 px-4 py-3 text-lg focus:border-zinc-900 focus:outline-none"
                      />
                      <p className="mt-1 text-center text-xs text-zinc-400">
                        feet
                      </p>
                    </div>
                    <div className="flex-1">
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="10"
                        value={formData.heightIn}
                        onChange={(e) =>
                          setFormData((f) => ({
                            ...f,
                            heightIn: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border-2 border-zinc-200 px-4 py-3 text-lg focus:border-zinc-900 focus:outline-none"
                      />
                      <p className="mt-1 text-center text-xs text-zinc-400">
                        inches
                      </p>
                    </div>
                  </div>
                </div>

                {/* Goal Weight */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-600">
                    Goal Weight (lbs)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="175"
                    value={formData.goalWeight}
                    onChange={(e) =>
                      setFormData((f) => ({
                        ...f,
                        goalWeight: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border-2 border-zinc-200 px-4 py-3 text-lg focus:border-zinc-900 focus:outline-none"
                  />
                </div>

                <p className="text-center text-xs text-zinc-400">
                  We assume zero exercise. If you work out — bonus.
                </p>

                <button
                  onClick={handlePersonalize}
                  disabled={
                    !formData.age ||
                    !formData.weight ||
                    !formData.heightFt ||
                    !formData.heightIn ||
                    !formData.goalWeight
                  }
                  className="w-full rounded-2xl bg-zinc-900 px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-40"
                >
                  Show my projection
                </button>
              </div>
            </motion.div>
          )}

          {/* ─── STEP 4: Projection ───────────────── */}
          {step === 4 && projection && personalData && (
            <motion.div
              key="step4"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-2xl font-bold text-zinc-900">
                Your projection
              </h2>
              <p className="mt-2 text-zinc-500">
                Just by ordering differently on DoorDash. No gym. No meal prep.
              </p>

              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-emerald-50 p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">
                    {projection.weekly.toFixed(1)}
                  </p>
                  <p className="text-xs text-emerald-700">lbs/week</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">
                    {(projection.weekly * 4).toFixed(0)}
                  </p>
                  <p className="text-xs text-emerald-700">lbs/month</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">
                    {projection.days > 0
                      ? Math.ceil(projection.days / 7)
                      : "—"}
                  </p>
                  <p className="text-xs text-emerald-700">weeks to goal</p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-zinc-100 p-4">
                <p className="mb-3 text-sm font-medium text-zinc-600">
                  {personalData.weight} lbs → {personalData.goalWeight} lbs
                </p>
                <ProjectionChart
                  data={projection.curve}
                  goalWeight={personalData.goalWeight}
                />
              </div>

              <div className="mt-4 rounded-2xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-600">
                  <span className="font-semibold">How this works:</span> Your
                  body burns ~{Math.round(projection.tdee)} calories/day at rest
                  (RMR: {Math.round(projection.rmr)} cal). Your swaps save{" "}
                  {totalCaloriesSaved} cal/day, creating a deficit that burns
                  fat. No exercise needed.
                </p>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => setStep(5)}
                  className="w-full rounded-2xl bg-zinc-900 px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-zinc-800"
                >
                  Get my full report
                </button>
                <p className="mt-2 text-center text-xs text-zinc-400">
                  We&apos;ll email you a personalized breakdown with your swap
                  plan.
                </p>
              </div>
            </motion.div>
          )}

          {/* ─── STEP 5: Email Capture ────────────── */}
          {step === 5 && !submitted && (
            <motion.div
              key="step5"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-2xl font-bold text-zinc-900">
                Your report is ready
              </h2>
              <p className="mt-2 text-zinc-500">
                Where should we send your personalized swap plan?
              </p>

              <form onSubmit={handleEmailSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-600">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border-2 border-zinc-200 px-4 py-3 text-lg focus:border-zinc-900 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-2xl bg-emerald-600 px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-emerald-500"
                >
                  Send My Report
                </button>
              </form>
            </motion.div>
          )}

          {/* ─── STEP 5 (submitted): Trust Bridge ─── */}
          {step === 5 && submitted && (
            <motion.div
              key="step5b"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <TrustBridge projection={projection} personalData={personalData} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Running counter (visible from step 1 onward) */}
      {step >= 1 && step <= 3 && totalCaloriesSaved > 0 && (
        <div className="fixed bottom-4 left-0 right-0 px-5">
          <RunningCounter caloriesSaved={totalCaloriesSaved} />
        </div>
      )}
    </div>
  );
}

// ─── Trust Bridge Component ──────────────────────────
function TrustBridge({
  projection,
  personalData,
}: {
  projection: ReturnType<typeof generateProjection> extends infer T ? {
    rmr: number;
    tdee: number;
    weekly: number;
    days: number;
    curve: { week: number; weight: number }[];
  } | null : never;
  personalData: PersonalData | null;
}) {
  const [showSent, setShowSent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowSent(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="text-center">
      {!showSent ? (
        <div className="py-12">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          <p className="mt-4 text-lg font-medium text-zinc-600">
            Generating your report...
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="rounded-2xl bg-emerald-50 p-5">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m4.5 12.75 6 6 9-13.5"
                />
              </svg>
            </div>
            <p className="mt-3 text-lg font-semibold text-emerald-700">
              Sent! Check your inbox.
            </p>
          </div>
        </motion.div>
      )}

      {/* Mission statement */}
      <div className="mt-8 rounded-2xl border border-zinc-100 p-6 text-left">
        <h3 className="text-xl font-bold text-zinc-900">Bulletproof Body</h3>
        <p className="mt-3 leading-relaxed text-zinc-600">
          We work with entrepreneurs, executives, and ambitious professionals.
          Time is your scarcest resource.
        </p>
        <p className="mt-3 leading-relaxed text-zinc-600">
          We don&apos;t build plans for your best days — we build for your
          worst. The days where you don&apos;t have time for cardio, energy for
          steps, or interest in meal prep.
        </p>
        <p className="mt-3 leading-relaxed text-zinc-600">
          If we can build a plan for the worst-case scenario, everything above
          that builds confidence.
        </p>
        <p className="mt-3 font-medium text-zinc-800">
          Small, simple wins that compound over time. That&apos;s how you build
          a sustainable lifestyle that works.
        </p>
      </div>

      {/* CTA */}
      {showSent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-6"
        >
          <a
            href="#book"
            className="block w-full rounded-2xl bg-zinc-900 px-6 py-4 text-center text-lg font-semibold text-white transition-colors hover:bg-zinc-800"
          >
            Book a Free Strategy Call
          </a>
          <p className="mt-2 text-sm text-zinc-400">
            Let&apos;s build your full plan together. No pressure. 15 minutes.
          </p>
        </motion.div>
      )}
    </div>
  );
}

