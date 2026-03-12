"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ───────────────────────────────────────────
interface Recipe {
  id: string;
  name: string;
  emoji: string;
  category: string;
  image_url: string | null;
  original_calories: number;
  swap_calories: number;
  original_protein: number;
  swap_protein: number;
}

interface Ingredient {
  id: number;
  recipe_id: string;
  name: string;
  quantity: string;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  is_swap: number;
  display_order: number;
}

interface RecipeDetail {
  recipe: { id: string; name: string; emoji: string; image_url?: string; video_url?: string };
  original: Ingredient[];
  swap: Ingredient[];
}

const PROGRESS_FILL_MS = 1200;
const CHECKMARK_PAUSE_MS = 600;
const BRIDGE_STAGGER_MS = 1800;

// ─── Recipe Grid (pick a meal) ───────────────────────
function RecipeGrid({
  recipes,
  onSelect,
}: {
  recipes: Recipe[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mx-auto max-w-lg px-4 pt-6 pb-20">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-white">
          Which meal do you want the{" "}
          <span className="text-emerald-400">low-calorie, high-protein</span>{" "}
          recipe for?
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Same taste. Fraction of the calories.
        </p>
      </div>

      <div className="space-y-3">
        {recipes.map((recipe, idx) => {
          const savings = recipe.original_calories - recipe.swap_calories;
          const pctSaved = Math.round((savings / recipe.original_calories) * 100);
          return (
            <motion.button
              key={recipe.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
              onClick={() => onSelect(recipe.id)}
              className="flex w-full items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 text-left transition-all hover:border-emerald-500/40 hover:bg-zinc-900"
            >
              {recipe.image_url ? (
                <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-zinc-700">
                  <Image
                    src={recipe.image_url}
                    alt={recipe.name}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
              ) : (
                <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 text-3xl">
                  {recipe.emoji || "🍽️"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold text-white">{recipe.name}</p>
                <p className="text-sm text-zinc-400 capitalize">{recipe.category}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-lg font-bold text-emerald-400">-{savings} cal</p>
                <p className="text-xs text-zinc-500">{pctSaved}% fewer</p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Side-by-side Reveal + Personalization Flow ──────
function RecipeReveal({
  detail,
  onBack,
}: {
  detail: RecipeDetail;
  onBack: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [phase, setPhase] = useState<"reveal" | "weight" | "projection" | "generating">("reveal");
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [goalWeight, setGoalWeight] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [barDone, setBarDone] = useState(false);
  const [cardGone, setCardGone] = useState(false);
  const [bridgeStep, setBridgeStep] = useState(0);

  const recipe = detail.recipe;
  const original = detail.original;
  const swap = detail.swap;

  const origTotal = original.reduce((s, i) => s + i.calories, 0);
  const swapTotal = swap.reduce((s, i) => s + i.calories, 0);
  const savings = origTotal - swapTotal;
  const pctSaved = Math.round((savings / origTotal) * 100);
  const weeklyLbs = ((savings * 7) / 3500).toFixed(1);

  // Weight form derived math
  const cw = currentWeight ?? 200;
  const gw = goalWeight ?? 180;
  const weightToLose = cw - gw;
  const lbsPerWeekNum = (savings * 7) / 3500;
  const lbsPerWeek = lbsPerWeekNum.toFixed(1);
  const weeksToGoal = lbsPerWeekNum > 0 ? Math.ceil(weightToLose / lbsPerWeekNum) : 52;
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + weeksToGoal * 7);
  const targetDateStr = targetDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const targetShort = targetDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });

  const canContinueWeight = currentWeight !== null && goalWeight !== null && currentWeight > goalWeight && (currentWeight - goalWeight) <= 150;

  const handleWeightInput = (value: string, setter: (w: number | null) => void) => {
    const stripped = value.replace(/[^0-9]/g, "");
    setter(stripped === "" ? null : parseInt(stripped, 10));
  };

  // SVG projection curve
  const svgW = 320, svgH = 160, padX = 40, padY = 20;
  const plotW = svgW - padX * 2, plotH = svgH - padY * 2;
  const pathData = Array.from({ length: 13 }, (_, i) => {
    const t = i / 12;
    const progress = 1 - Math.pow(1 - t, 1.8);
    const x = padX + t * plotW;
    const y = padY + progress * plotH;
    return `${i === 0 ? "M" : "L"}${x},${y}`;
  }).join(" ");

  // Generating phase timers
  useEffect(() => {
    if (phase !== "generating") return;
    if (email.includes("@")) {
      fetch("/api/send-swap-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email, currentWeight: cw, goalWeight: gw,
          calSavedPerOrder: savings, lbsPerWeek: lbsPerWeekNum, weeksToGoal,
          targetDate: targetDateStr, ordersPerWeek: 7, swapName: recipe.name, restaurantName: recipe.name,
          originalCalories: origTotal, swapCalories: swapTotal,
          source: "Recipe Bible",
          videoUrl: recipe.video_url || "",
          recipeIngredients: {
            original: original.map(i => ({ name: i.name, quantity: i.quantity, calories: i.calories, protein_g: i.protein_g })),
            swap: swap.map(i => ({ name: i.name, quantity: i.quantity, calories: i.calories, protein_g: i.protein_g })),
          },
        }),
      }).catch(() => {});
    }
    const t1 = setTimeout(() => setBarDone(true), PROGRESS_FILL_MS);
    const t2 = setTimeout(() => setCardGone(true), PROGRESS_FILL_MS + CHECKMARK_PAUSE_MS + 400);
    const bridgeStart = PROGRESS_FILL_MS + CHECKMARK_PAUSE_MS + 900;
    const timers: ReturnType<typeof setTimeout>[] = [t1, t2];
    for (let i = 1; i <= 5; i++) {
      timers.push(setTimeout(() => setBridgeStep(i), bridgeStart + (i - 1) * BRIDGE_STAGGER_MS));
    }
    return () => timers.forEach(clearTimeout);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Weight / Projection / Generating phases (fullscreen) ───
  if (phase !== "reveal") {
    return (
      <motion.div key="fullscreen-phase" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 overflow-y-auto bg-black">
        <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5 py-10">
          <AnimatePresence mode="wait">

            {/* Weight form */}
            {phase === "weight" && (
              <motion.div key="weight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
                <button onClick={() => setPhase("reveal")}
                  className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>

                <h2 className="text-2xl font-bold text-white mb-2">Let&apos;s tie this to your goals</h2>
                <p className="text-sm text-zinc-500 mb-8">Two numbers. That&apos;s it.</p>

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

            {/* Projection graph + email */}
            {phase === "projection" && (
              <motion.div key="projection" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <button onClick={() => setPhase("weight")}
                  className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>

                <div className="text-center mb-6">
                  <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }}
                    className="text-3xl sm:text-4xl font-extrabold leading-tight text-white">
                    You&apos;ll hit{" "}
                    <span className="text-emerald-400">{gw} lbs</span> by{" "}
                    <span className="text-emerald-400">{targetDateStr}</span>
                  </motion.h2>
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
                    className="mt-2 text-sm text-zinc-400">
                    Just by making your <span className="text-emerald-400">{recipe.name}</span> the smarter way.
                  </motion.p>
                </div>

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

                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.5 }}>
                  <p className="text-center text-sm text-zinc-400 mb-4">
                    Want us to email you this recipe with your plan?
                  </p>
                  <form onSubmit={(e) => { e.preventDefault(); if (email.includes("@")) { setBarDone(false); setCardGone(false); setBridgeStep(0); setPhase("generating"); } }} className="flex gap-2">
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      className="flex-1 rounded-xl border-2 border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none transition-colors" />
                    <motion.button type="submit" whileTap={{ scale: 0.95 }}
                      className="rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-black hover:bg-emerald-400 transition-colors flex-shrink-0">
                      Send it
                    </motion.button>
                  </form>
                  <p className="text-center text-[11px] text-zinc-700 mt-3">Just the recipe. No spam. Unsubscribe anytime.</p>
                </motion.div>
              </motion.div>
            )}

            {/* Generating → Bridge to concierge */}
            {phase === "generating" && (
              <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
                className="flex flex-col items-center justify-center min-h-[70vh] text-center px-2">
                <AnimatePresence>
                  {!cardGone && (
                    <motion.div exit={{ opacity: 0, y: -40, height: 0, marginBottom: 0, padding: 0 }} transition={{ duration: 0.4, ease: "easeOut" }}
                      className="w-full rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5 mb-6 overflow-hidden">
                      <h2 className="text-lg font-bold text-white mb-1">{barDone ? "Recipe sent to your email!" : "Sending..."}</h2>
                      {!barDone ? (
                        <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                          <motion.div className="h-full rounded-full bg-emerald-500" initial={{ width: "0%" }} animate={{ width: "100%" }}
                            transition={{ duration: PROGRESS_FILL_MS / 1000, ease: "easeOut" }} />
                        </div>
                      ) : (
                        <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }} className="flex justify-center">
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

                <motion.div initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: bridgeStep >= 1 ? 1 : 0, y: bridgeStep >= 1 ? 0 : 20 }} transition={{ duration: 0.5 }}>
                  <p className="text-xs text-zinc-500 uppercase tracking-[0.25em] mb-3">Just now</p>
                  <p className="text-4xl sm:text-5xl font-extrabold text-emerald-400 tabular-nums">{lbsPerWeek} lbs</p>
                  <p className="text-lg text-zinc-400 mt-2">of fat per week from <span className="text-white font-semibold">1 recipe swap</span></p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: bridgeStep >= 2 ? 1 : 0, y: bridgeStep >= 2 ? 0 : 15 }} transition={{ duration: 0.5 }} className="max-w-sm mt-8">
                  <p className="text-xl sm:text-2xl font-bold text-white leading-snug">That was one recipe.</p>
                  <p className="text-xl sm:text-2xl text-zinc-400 mt-2 leading-snug">You probably cook 3 or 4 meals a week.</p>
                </motion.div>

                <motion.p initial={{ opacity: 0 }}
                  animate={{ opacity: bridgeStep >= 3 ? 1 : 0 }} transition={{ duration: 0.5 }} className="text-base text-zinc-400 mt-8 max-w-sm">
                  Now imagine we did that for <span className="text-white font-semibold">every recipe, every restaurant, every snack.</span>
                </motion.p>

                <motion.p initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: bridgeStep >= 4 ? 1 : 0, y: bridgeStep >= 4 ? 0 : 12 }} transition={{ duration: 0.5 }}
                  className="text-base sm:text-lg text-emerald-400 font-semibold leading-relaxed mt-8 max-w-sm">
                  What if all you had to do was eat — and the weight just came off?
                </motion.p>

                <motion.div initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: bridgeStep >= 5 ? 1 : 0, y: bridgeStep >= 5 ? 0 : 10 }} transition={{ duration: 0.4 }}
                  className="mt-10 w-full max-w-sm space-y-3">
                  <motion.button whileTap={{ scale: 0.97 }}
                    onClick={() => { window.location.href = "/concierge?from=recipe"; }}
                    className="w-full rounded-2xl bg-emerald-500 px-6 py-4 text-base font-bold text-black transition-all hover:bg-emerald-400 flex items-center justify-center gap-2">
                    <span>See how it works</span>
                    <motion.span animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>&rarr;</motion.span>
                  </motion.button>
                  <button onClick={onBack} className="w-full text-center text-sm text-zinc-600 hover:text-zinc-400 transition-colors py-2">
                    Keep exploring recipes
                  </button>
                </motion.div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    );
  }

  // ─── Phase: Reveal (side-by-side cards) ───
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black">
      <div className="mx-auto max-w-lg px-4 pb-20 pt-4">
        {/* Back */}
        <button onClick={onBack}
          className="mb-4 flex items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-white">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Back
        </button>

        {/* Title */}
        <AnimatePresence mode="wait">
          {!revealed ? (
            <motion.div key="pre-reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -10 }} className="mb-6 text-center">
              <h2 className="text-2xl font-bold leading-tight text-white">
                Want to learn how to lose{" "}
                <span className="text-emerald-400">{weeklyLbs} lb a week</span>{" "}
                simply by adjusting your current {recipe.name} recipe?
              </h2>
            </motion.div>
          ) : (
            <motion.div key="post-reveal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
              <h2 className="text-2xl font-bold leading-tight text-white">
                Same {recipe.name} experience.{" "}
                <span className="text-emerald-400">{pctSaved}% fewer calories.</span>
              </h2>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Side-by-side comparison (ingredients INSIDE boxes) */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          {/* LEFT: Normal Recipe */}
          <motion.div
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
            className={`rounded-2xl border p-5 transition-all duration-700 ${revealed ? "border-red-500/30 bg-red-500/5" : "border-zinc-800 bg-zinc-900/60"}`}
          >
            <div className="mb-4 text-center">
              {recipe.image_url ? (
                <div className="relative mx-auto h-20 w-20 overflow-hidden rounded-xl">
                  <Image src={recipe.image_url} alt={recipe.name} fill className="object-cover" sizes="80px" />
                </div>
              ) : (
                <span className="text-4xl">🍽️</span>
              )}
              <p className="mt-2 text-xs uppercase tracking-wider text-zinc-500">Normal Recipe</p>
            </div>
            <div className="mb-4 text-center">
              <span className={`text-3xl font-bold tabular-nums transition-colors duration-700 ${revealed ? "text-red-400" : "text-white"}`}>{origTotal}</span>
              <span className="ml-1 text-sm text-zinc-500">cal</span>
            </div>
            <div className="space-y-1.5">
              {original.map((ing) => (
                <div key={ing.id} className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs"
                  style={{ background: "rgba(39, 39, 42, 0.5)", boxShadow: "0 0 12px 2px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.05)" }}>
                  <span className="mr-2 truncate text-zinc-400">{ing.name}</span>
                  <span className="flex-shrink-0 font-medium tabular-nums text-zinc-500">{ing.calories}</span>
                </div>
              ))}
            </div>
            {revealed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                className="mt-3 rounded-lg bg-rose-500/10 px-2.5 py-2 text-center">
                <p className="text-xs font-semibold text-rose-400">{savings} calories hiding in this recipe</p>
              </motion.div>
            )}
          </motion.div>

          {/* RIGHT: Optimized Recipe */}
          <motion.div
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className={`rounded-2xl border p-5 transition-all duration-700 ${revealed ? "border-emerald-500/40 bg-emerald-500/5 shadow-[0_0_30px_rgba(16,185,129,0.08)]" : "border-zinc-800 bg-zinc-900/60"}`}
          >
            <div className="mb-4 text-center">
              {revealed ? (
                recipe.image_url ? (
                  <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="relative mx-auto h-20 w-20 overflow-hidden rounded-xl">
                    <Image src={recipe.image_url} alt={recipe.name} fill className="object-cover" sizes="80px" />
                  </motion.div>
                ) : (
                  <motion.span initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="inline-block text-4xl">🍽️</motion.span>
                )
              ) : (
                <div className="relative flex h-20 w-20 mx-auto items-center justify-center">
                  <div className="absolute inset-0 rounded-xl bg-emerald-500/10 blur-xl" />
                  <motion.span animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }} transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }} className="relative text-4xl font-bold text-white/80">?</motion.span>
                </div>
              )}
              <p className="mt-2 text-xs uppercase tracking-wider">
                {revealed ? <span className="text-emerald-400">Optimized Recipe</span> : <span className="text-zinc-500">Optimized Recipe</span>}
              </p>
            </div>
            <div className="mb-4 text-center">
              {revealed ? (
                <><span className="text-3xl font-bold tabular-nums text-emerald-400">{swapTotal}</span><span className="ml-1 text-sm text-zinc-500">cal</span></>
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
                {swap.map((ing, i) => (
                  <motion.div key={ing.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.08 }}
                    className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs"
                    style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16,185,129,0.15)" }}>
                    <span className="mr-2 truncate text-emerald-400">{ing.name}</span>
                    <span className="flex-shrink-0 font-medium tabular-nums text-emerald-400">{ing.calories}</span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="space-y-1.5">
                {original.map((_, i) => (
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

        {/* CTA */}
        {!revealed ? (
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setRevealed(true)}
            className="mt-6 w-full rounded-2xl bg-emerald-500 px-6 py-4 text-base font-bold text-black transition-all hover:bg-emerald-400">
            Show me the swap &rarr;
          </motion.button>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-6 space-y-2">
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setPhase("weight")}
              className="w-full rounded-2xl bg-white px-6 py-4 text-base font-bold text-black transition-all hover:bg-zinc-200">
              Personalize this for my goals
            </motion.button>
            <p className="text-center text-xs text-zinc-500">Takes 30 seconds.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page (inner, needs Suspense for useSearchParams) ──
function RecipePageInner() {
  const searchParams = useSearchParams();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<RecipeDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deepLinked, setDeepLinked] = useState(false);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    fetch(`/api/recipes/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setDetail(data);
        setDetailLoading(false);
      })
      .catch(() => setDetailLoading(false));
    window.scrollTo(0, 0);
    // Update URL so it's shareable
    window.history.replaceState(null, "", `/recipe?id=${id}`);
  }, []);

  useEffect(() => {
    fetch("/api/recipes")
      .then((res) => res.json())
      .then((data) => {
        setRecipes(data.recipes || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Deep-link: ?id=french_toast auto-selects
  useEffect(() => {
    if (deepLinked || loading) return;
    const paramId = searchParams.get("id");
    if (paramId) {
      setDeepLinked(true);
      handleSelect(paramId);
    }
  }, [loading, deepLinked, searchParams, handleSelect]);

  const handleBack = useCallback(() => {
    setSelectedId(null);
    setDetail(null);
    window.scrollTo(0, 0);
    window.history.replaceState(null, "", "/recipe");
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-800 bg-black/90 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-5 pt-4 pb-1">
          <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-zinc-500">Bulletproof Body</p>
        </div>
        <div className="mx-auto max-w-6xl px-5 py-4 text-center">
          <h1 className="text-lg font-semibold uppercase tracking-[0.22em] text-emerald-400">Recipe Swaps</h1>
          <p className="mt-1 text-base text-zinc-400">Same meal. Half the calories. More protein.</p>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-400" />
        </div>
      ) : selectedId && detailLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-400" />
        </div>
      ) : selectedId && detail ? (
        <RecipeReveal detail={detail} onBack={handleBack} />
      ) : (
        <RecipeGrid recipes={recipes} onSelect={handleSelect} />
      )}
    </div>
  );
}

// ─── Default export with Suspense boundary ──────────
export default function RecipeClient() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-400" />
      </div>
    }>
      <RecipePageInner />
    </Suspense>
  );
}
