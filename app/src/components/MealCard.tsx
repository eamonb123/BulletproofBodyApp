"use client";

import { motion } from "framer-motion";
import type { FoodItem } from "@/data/foods";

interface MealCardProps {
  food: FoodItem;
  selected?: boolean;
  onClick?: () => void;
  variant?: "original" | "swap";
  compact?: boolean;
}

export default function MealCard({
  food,
  selected = false,
  onClick,
  variant = "original",
  compact = false,
}: MealCardProps) {
  const isSwap = variant === "swap";

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className={`
        w-full rounded-2xl border-2 p-4 text-left transition-all
        ${compact ? "p-3" : "p-4"}
        ${
          selected
            ? isSwap
              ? "border-emerald-500 bg-emerald-50"
              : "border-zinc-900 bg-zinc-50"
            : "border-zinc-200 bg-white hover:border-zinc-300"
        }
      `}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{food.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-zinc-900 truncate">{food.name}</p>
            {isSwap && (
              <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                swap
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-500">{food.restaurant}</p>
          {!compact && (
            <p className="mt-1 text-xs text-zinc-400">{food.serving}</p>
          )}
          <div className="mt-2 flex gap-3 text-sm">
            <span
              className={`font-semibold ${isSwap ? "text-emerald-600" : "text-zinc-900"}`}
            >
              {food.calories} cal
            </span>
            <span className="text-zinc-400">
              {food.protein}g protein
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}
