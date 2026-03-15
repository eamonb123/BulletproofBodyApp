"use client";

import { useRef, useEffect } from "react";
import { motion, useSpring, useTransform, useInView } from "framer-motion";
import dynamic from "next/dynamic";
import { generateProjection } from "@/lib/calculator";

const ProjectionChart = dynamic(() => import("@/components/ProjectionChart"), {
  ssr: false,
});

/* ─── Animated spring number ─── */
function AnimatedNum({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const spring = useSpring(0, { stiffness: 80, damping: 20, mass: 1.2 });
  const display = useTransform(spring, (v) => v.toFixed(decimals));
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (inView) spring.set(value);
  }, [spring, value, inView]);

  useEffect(() => {
    const unsub = display.on("change", (v) => {
      if (ref.current) ref.current.textContent = v;
    });
    return unsub;
  }, [display]);

  return <span ref={ref}>0</span>;
}

/* ─── Section wrapper (fades in on scroll) ─── */
function RevealSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className={`flex min-h-[70vh] flex-col justify-center px-4 py-12 ${className}`}
    >
      {children}
    </motion.section>
  );
}

/* ─── Types ─── */
interface TopSwap {
  originalName: string;
  originalCalories: number;
  originalImage: string | null;
  swapName: string;
  swapCalories: number;
  swapImage: string | null;
  saved: number;
  category: string;
}

interface RevealNarrativeProps {
  clientFirstName: string;
  currentWeight: number;
  goalWeight: number;
  maintenance: number;
  dailyDeficit: number;
  calorieTarget: number;
  weeklyFatLoss: number;
  weeksToGoal: number;
  goalDate: string;
  lbsToLose: number;
  topSwaps: TopSwap[];
  favoriteSnacks: { name: string; calories: number; serving: string }[];
}

export default function RevealNarrative({
  clientFirstName,
  currentWeight,
  goalWeight,
  maintenance,
  dailyDeficit,
  calorieTarget,
  weeklyFatLoss,
  weeksToGoal,
  goalDate,
  lbsToLose,
  topSwaps,
  favoriteSnacks,
}: RevealNarrativeProps) {
  // Reveal always uses clean 500 cal deficit = 1 lb/week exactly
  const revealTarget = maintenance - 500;
  const revealWeeklyLoss = 1.0;
  const revealWeeksToGoal = Math.ceil(lbsToLose / revealWeeklyLoss);
  const revealGoalDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + revealWeeksToGoal * 7);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  })();

  // Week-by-week: 5 low days (Mon-Thu + Sun), 2 big days (Fri + Sat)
  // maintenance * 7 = lowCal * 5 + highCal * 2
  // highCal = lowCal * 2.8 (big nights are ~2.8x a normal day)
  // So: maintenance * 7 = lowCal * 5 + lowCal * 2.8 * 2 = lowCal * 10.6
  const lowCal = Math.round((maintenance * 7) / 10.6);
  const highCal = Math.round(lowCal * 2.8);
  const avgExamples = [
    { day: "Mon", cal: lowCal, label: "Busy workday" },
    { day: "Tue", cal: lowCal, label: "Desk lunch" },
    { day: "Wed", cal: lowCal, label: "Light dinner" },
    { day: "Thu", cal: lowCal, label: "Normal day" },
    { day: "Fri", cal: highCal, label: "Happy hour + dinner" },
    { day: "Sat", cal: highCal, label: "Brunch + date night" },
    { day: "Sun", cal: lowCal, label: "Recovery mode" },
  ];
  const avgTotal = avgExamples.reduce((s, d) => s + d.cal, 0);
  const avgDaily = Math.round(avgTotal / 7);

  return (
    <div className="mx-auto max-w-4xl">
      {/* ═══ SECTION 1: YOUR MAINTENANCE ═══ */}
      <RevealSection>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400">
          Step 1
        </p>
        <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
          Your body burns calories just to keep you alive.
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-zinc-400">
          Your heart beating. Your lungs breathing. Your brain running.
          Even if you laid in a hospital bed all day and did nothing — your body
          would still burn calories just to exist.
        </p>
        <div className="mt-8 text-center">
          <p className="text-sm uppercase tracking-wider text-zinc-500">
            {clientFirstName}, your body burns
          </p>
          <p className="mt-1 text-7xl font-black text-emerald-300 sm:text-8xl">
            <AnimatedNum value={maintenance} />
          </p>
          <p className="text-xl text-zinc-400">calories every day</p>
        </div>
        <p className="mt-8 text-lg text-zinc-400">
          That means to stay at{" "}
          <span className="font-semibold text-white">{currentWeight} lbs</span>,
          you&apos;ve been averaging about {maintenance} calories a day.
          Whether you knew it or not.
        </p>
      </RevealSection>

      {/* ═══ SECTION 2: IT AVERAGES OUT ═══ */}
      <RevealSection>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400">
          Step 2
        </p>
        <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
          It doesn&apos;t have to be the same every day.
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-zinc-400">
          You eat light during the week. Then Friday hits — happy hour, dinner out.
          Saturday is brunch and date night. Sunday you barely eat.
          Your body doesn&apos;t care about individual days. It cares about the{" "}
          <span className="font-semibold text-emerald-300">weekly average</span>.
        </p>

        <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-700/50 bg-zinc-800/30">
          <div className="grid grid-cols-7 text-center">
            {avgExamples.map((d) => (
              <div key={d.day} className="border-b border-zinc-700/30 p-3 sm:p-4">
                <p className="text-xs font-semibold uppercase text-zinc-500">{d.day}</p>
                <p className={`mt-1 text-xl font-bold ${
                  d.cal > maintenance ? "text-rose-400" : "text-emerald-300"
                }`}>
                  {d.cal.toLocaleString()}
                </p>
                <p className="mt-1 hidden text-[10px] text-zinc-600 sm:block">{d.label}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col items-center gap-1 p-4">
            <p className="text-sm text-zinc-500">Weekly average</p>
            <p className="text-3xl font-bold text-white">{avgDaily.toLocaleString()} cal/day</p>
            <p className="text-sm text-zinc-500">= {maintenance.toLocaleString()} maintenance → weight stays at {currentWeight}</p>
          </div>
        </div>

        <p className="mt-6 text-lg text-zinc-400">
          Sound familiar? Light Monday through Thursday.
          Big Friday and Saturday. Barely anything Sunday.
          The math still adds up. That&apos;s why your weight hasn&apos;t moved.
        </p>
      </RevealSection>

      {/* ═══ SECTION 3: THE RULE ═══ */}
      <RevealSection>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400">
          Step 3
        </p>
        <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
          One pound of fat = 3,500 calories.
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-zinc-400">
          To lose one pound of fat per week, you just spread that 3,500 across 7 days:
        </p>

        {/* 500 × 7 = 3,500 visual */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-700/50 bg-zinc-800/30">
          <div className="grid grid-cols-7 text-center">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => (
              <motion.div
                key={day}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.3 }}
                className="border-b border-zinc-700/30 p-3 sm:p-4"
              >
                <p className="text-xs font-semibold uppercase text-zinc-500">{day}</p>
                <p className="mt-1 text-2xl font-bold text-emerald-300">-500</p>
                <p className="mt-0.5 text-[10px] text-zinc-600">cal</p>
              </motion.div>
            ))}
          </div>
          <div className="flex flex-col items-center gap-1 p-4">
            <p className="text-sm text-zinc-500">500 × 7 days =</p>
            <p className="text-4xl font-black text-emerald-300">-3,500 cal/week</p>
            <p className="text-lg font-semibold text-white">= 1 pound of fat gone</p>
          </div>
        </div>

        <p className="mt-6 text-lg text-zinc-400">
          That&apos;s all it is. <span className="font-semibold text-emerald-300">500 fewer calories a day</span>.
          And here&apos;s how close you already are — look at your own food:
        </p>

        {/* Top swap from each category */}
        <div className="mt-8 space-y-4">
          {topSwaps.slice(0, 3).map((swap, i) => {
            const categoryLabels: Record<string, string> = {
              dining_out: "When you dine out",
              ordering_out: "When you order in",
              snack: "Your snacks",
              at_home: "When you eat at home",
            };
            const label = categoryLabels[swap.category] || swap.category;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="overflow-hidden rounded-2xl border border-zinc-700/50 bg-zinc-800/30"
              >
                <div className="border-b border-zinc-700/30 bg-zinc-800/50 px-4 py-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    {label}
                  </p>
                </div>
                <div className="flex items-stretch">
                  <div className="flex-1 border-r border-zinc-700/30 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-400">
                      What you had
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      {swap.originalImage && (
                        <img src={swap.originalImage} alt="" className="h-14 w-14 shrink-0 rounded-xl border border-zinc-700 object-cover" />
                      )}
                      <div>
                        <p className="text-base font-semibold text-white">{swap.originalName}</p>
                        <p className="mt-1 text-2xl font-bold text-rose-300">{swap.originalCalories} cal</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                      The swap
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      {swap.swapImage && (
                        <img src={swap.swapImage} alt="" className="h-14 w-14 shrink-0 rounded-xl border border-zinc-700 object-cover" />
                      )}
                      <div>
                        <p className="text-base font-semibold text-white">{swap.swapName}</p>
                        <p className="mt-1 text-2xl font-bold text-emerald-300">{swap.swapCalories} cal</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border-t border-zinc-700/30 bg-emerald-500/[0.06] px-4 py-2 text-center">
                  <span className="text-lg font-bold text-emerald-300">
                    -{swap.saved} calories saved
                  </span>
                  {swap.saved >= 500 && (
                    <span className="ml-2 text-sm text-emerald-400/70">
                      — this ONE swap covers your daily deficit
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </RevealSection>

      {/* ═══ SECTION 4: YOUR NUMBER ═══ */}
      <RevealSection>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400">
          Step 4
        </p>
        <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
          Your number.
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-zinc-400">
          {maintenance.toLocaleString()} calories to maintain. Minus 500 calories.
        </p>

        <div className="mt-8 rounded-3xl border border-emerald-500/30 bg-emerald-500/[0.06] p-8 text-center">
          <p className="text-sm uppercase tracking-wider text-emerald-400/70">
            Eat what you want. Stop at this number.
          </p>
          <p className="mt-2 text-8xl font-black text-emerald-300 sm:text-9xl">
            <AnimatedNum value={revealTarget} />
          </p>
          <p className="text-2xl text-emerald-400/60">calories a day</p>
        </div>

        {favoriteSnacks.length > 0 && (
          <div className="mt-8 space-y-3">
            {favoriteSnacks.slice(0, 2).map((snack, i) => {
              const count = Math.floor(revealTarget / snack.calories);
              const totalCal = count * snack.calories;
              // Build a readable label like "8 bags of Cheetos Flamin' Hot Puffs"
              const rawUnit = snack.serving
                ? snack.serving.replace(/^1\s+/, "").replace(/\(.*\)/, "").trim()
                : "";
              // If unit is descriptive enough (contains key words from the name), don't append name
              const nameWords = snack.name.toLowerCase().split(/\s+/);
              const unitHasName = nameWords.some((w) => w.length > 3 && rawUnit.toLowerCase().includes(w));
              const pluralUnit = rawUnit && count > 1 && !rawUnit.endsWith("s") ? rawUnit + "s" : rawUnit;
              const servingLabel = rawUnit
                ? unitHasName
                  ? `${count} ${pluralUnit}`
                  : `${count} ${pluralUnit} of ${snack.name}`
                : `${count} ${snack.name}`;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12, duration: 0.4 }}
                  className="rounded-2xl border border-zinc-700/50 bg-zinc-800/30 p-5 text-center"
                >
                  <p className="text-lg text-zinc-400">
                    You could eat{" "}
                    <span className="font-bold text-emerald-300">
                      {servingLabel}
                    </span>{" "}
                    every single day ({snack.calories} cal × {count} = {totalCal.toLocaleString()} cal) and still lose weight.
                  </p>
                </motion.div>
              );
            })}
            <p className="pt-2 text-center text-sm text-zinc-500">
              It&apos;s not about restriction. It&apos;s not about eating clean.
              It&apos;s about knowing your number.
            </p>
          </div>
        )}
      </RevealSection>

      {/* ═══ SECTION 5: YOUR PROJECTION ═══ */}
      <RevealSection>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400">
          Step 5
        </p>
        <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
          Here&apos;s what happens next.
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-zinc-400">
          At {revealTarget.toLocaleString()} calories a day, you lose{" "}
          <span className="font-semibold text-emerald-300">1 pound of fat every week</span>.
          {" "}{lbsToLose} lbs to lose. {revealWeeksToGoal} weeks. {revealGoalDate}.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-700 bg-zinc-900/80 p-4 text-center">
            <p className="text-sm uppercase tracking-wider text-zinc-400">Fat Loss</p>
            <p className="text-4xl font-bold text-emerald-300">
              <AnimatedNum value={revealWeeklyLoss} decimals={2} />
            </p>
            <p className="text-sm text-zinc-500">lbs/week</p>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
            <p className="text-sm uppercase tracking-wider text-emerald-400/70">
              {currentWeight} → {goalWeight}
            </p>
            <p className="text-4xl font-bold text-emerald-300">
              <AnimatedNum value={revealWeeksToGoal} />
            </p>
            <p className="text-sm text-zinc-500">weeks</p>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
            <p className="text-sm uppercase tracking-wider text-emerald-400/70">Goal Date</p>
            <p className="text-2xl font-bold text-emerald-300">{revealGoalDate}</p>
            <p className="text-sm text-zinc-500">from food swaps alone</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-zinc-700/50 bg-zinc-900/60 p-4">
          <ProjectionChart
            data={generateProjection(currentWeight, goalWeight, 500, revealWeeksToGoal + 4)}
            startDate={new Date()}
            goalMarkers={[
              { weight: goalWeight, label: "Goal", color: "#10b981" },
            ]}
          />
        </div>

        <p className="mt-4 text-center text-sm text-zinc-500 italic">
          Zero workouts. Zero cardio. Just food swaps. Anything else is bonus.
        </p>
      </RevealSection>

      {/* ═══ SECTION 6: REVEAL TRANSITION ═══ */}
      <RevealSection className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400">
          Step 6
        </p>
        <h2 className="mt-2 text-4xl font-bold text-white sm:text-5xl">
          Now let me show you everything I built for you.
        </h2>
        <p className="mt-4 text-lg text-zinc-400">
          Every meal. Every snack. Every order. Every situation in your life.
          Mapped, optimized, and ready.
        </p>
        <div className="mx-auto mt-6 h-px w-32 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
      </RevealSection>
    </div>
  );
}
