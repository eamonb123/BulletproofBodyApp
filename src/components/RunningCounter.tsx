"use client";

import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";

interface RunningCounterProps {
  caloriesSaved: number;
  showWeekly?: boolean;
}

function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const spring = useSpring(0, { stiffness: 100, damping: 30 });
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

  return <span ref={ref}>0</span>;
}

export default function RunningCounter({
  caloriesSaved,
  showWeekly = true,
}: RunningCounterProps) {
  const dailyFatLbs = caloriesSaved / 3500;
  const weeklyFatLbs = dailyFatLbs * 7;

  if (caloriesSaved === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky bottom-4 z-10 mx-auto w-full max-w-md"
    >
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 shadow-lg backdrop-blur-sm">
        <div className="text-center">
          <p className="text-sm font-medium text-emerald-700">
            You just saved
          </p>
          <p className="mt-1 text-3xl font-bold text-emerald-600">
            <AnimatedNumber value={caloriesSaved} /> calories
          </p>
          <p className="mt-0.5 text-sm text-emerald-600">per day</p>
        </div>

        {showWeekly && caloriesSaved > 0 && (
          <div className="mt-3 flex justify-center gap-6 border-t border-emerald-200 pt-3">
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-700">
                <AnimatedNumber value={weeklyFatLbs} decimals={1} /> lbs
              </p>
              <p className="text-xs text-emerald-600">per week</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-700">
                <AnimatedNumber value={weeklyFatLbs * 4} decimals={1} /> lbs
              </p>
              <p className="text-xs text-emerald-600">per month</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
