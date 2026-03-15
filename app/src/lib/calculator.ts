/**
 * Mifflin-St Jeor RMR Calculator
 * The gold standard for estimating resting metabolic rate.
 *
 * Male:   (10 x weight_kg) + (6.25 x height_cm) - (5 x age) + 5
 * Female: (10 x weight_kg) + (6.25 x height_cm) - (5 x age) - 161
 */

export function calculateRMR(
  weightLbs: number,
  heightInches: number,
  age: number,
  gender: "male" | "female"
): number {
  const weightKg = weightLbs * 0.453592;
  const heightCm = heightInches * 2.54;

  if (gender === "male") {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
}

/**
 * TDEE = RMR x activity multiplier
 * We assume SEDENTARY (1.2) — worst-case scenario planning.
 * "We assume you don't work out at all. If you do — bonus."
 */
export function calculateTDEE(rmr: number): number {
  return rmr * 1.2;
}

/**
 * Calculate weekly fat loss from a daily calorie deficit.
 * 1 lb of fat = ~3,500 calories
 */
export function weeklyFatLoss(dailyDeficit: number): number {
  return (dailyDeficit * 7) / 3500;
}

/**
 * Calculate days to reach goal weight given a daily deficit.
 */
export function daysToGoal(
  currentWeight: number,
  goalWeight: number,
  dailyDeficit: number
): number {
  const lbsToLose = currentWeight - goalWeight;
  if (lbsToLose <= 0 || dailyDeficit <= 0) return 0;
  const lbsPerDay = dailyDeficit / 3500;
  return Math.ceil(lbsToLose / lbsPerDay);
}

/**
 * Generate a projection curve — weight at each week for the chart.
 */
export function generateProjection(
  currentWeight: number,
  goalWeight: number,
  dailyDeficit: number,
  maxWeeks: number = 24
): { week: number; weight: number }[] {
  const points: { week: number; weight: number }[] = [];
  const lbsPerWeek = weeklyFatLoss(dailyDeficit);

  for (let w = 0; w <= maxWeeks; w++) {
    const projected = currentWeight - lbsPerWeek * w;
    const weight = Math.max(projected, goalWeight);
    points.push({ week: w, weight: Math.round(weight * 10) / 10 });
    if (weight <= goalWeight) break;
  }

  return points;
}

/**
 * Estimate a general fat loss range without personal data.
 * Based on population averages for a 180lb sedentary male, age 33.
 */
export function estimateGeneralRange(dailyCaloriesSaved: number): {
  lowLbs: number;
  highLbs: number;
} {
  // Low estimate: lighter person (150lb) has lower TDEE, deficit matters less
  // High estimate: heavier person (220lb) has higher TDEE, deficit matters more
  const lowWeekly = (dailyCaloriesSaved * 7) / 3500;
  const highWeekly = lowWeekly * 1.3; // heavier individuals lose slightly faster
  return {
    lowLbs: Math.round(lowWeekly * 10) / 10,
    highLbs: Math.round(highWeekly * 10) / 10,
  };
}

/**
 * Full Metabolism Equation (from EPM integrity_math.py)
 *
 * Total Daily Burn = RMR + Step Calories + Workout Calories + Cardio Calories
 * Daily Deficit = Total Burn - Calories Consumed
 *
 * Coefficients:
 *   Steps: 0.05 cal per step (100 cal per 2,000 steps)
 *   Workout: 250 cal per session (default)
 *   Cardio: estimated from minutes and avg HR
 */

const STEP_CAL_RATE = 0.05;
const DEFAULT_WORKOUT_CAL = 250;

export interface MetabolismEquation {
  rmr: number;
  stepsPerDay: number;
  stepCaloriesPerDay: number;
  workoutsPerWeek: number;
  workoutCalPerSession: number;
  workoutCaloriesPerDay: number;
  cardioMinPerDay: number;
  cardioCaloriesPerDay: number;
  totalDailyBurn: number;
  dailyCalorieTarget: number;
  dailyDeficit: number;
  weeklyFatLossLbs: number;
}

export function calculateMetabolismEquation(params: {
  rmr: number;
  stepsPerDay: number;
  workoutsPerWeek: number;
  workoutCalPerSession?: number;
  cardioMinPerDay: number;
  dailyCalorieTarget: number;
}): MetabolismEquation {
  const workoutCal = params.workoutCalPerSession ?? DEFAULT_WORKOUT_CAL;
  const stepCalPerDay = params.stepsPerDay * STEP_CAL_RATE;
  const workoutCalPerDay = (params.workoutsPerWeek * workoutCal) / 7;
  // ~8 cal/min at moderate intensity
  const cardioCalPerDay = params.cardioMinPerDay * 8;

  const totalDailyBurn =
    params.rmr + stepCalPerDay + workoutCalPerDay + cardioCalPerDay;
  const dailyDeficit = totalDailyBurn - params.dailyCalorieTarget;
  const weeklyLoss = (dailyDeficit * 7) / 3500;

  return {
    rmr: params.rmr,
    stepsPerDay: params.stepsPerDay,
    stepCaloriesPerDay: Math.round(stepCalPerDay),
    workoutsPerWeek: params.workoutsPerWeek,
    workoutCalPerSession: workoutCal,
    workoutCaloriesPerDay: Math.round(workoutCalPerDay),
    cardioMinPerDay: params.cardioMinPerDay,
    cardioCaloriesPerDay: Math.round(cardioCalPerDay),
    totalDailyBurn: Math.round(totalDailyBurn),
    dailyCalorieTarget: params.dailyCalorieTarget,
    dailyDeficit: Math.round(dailyDeficit),
    weeklyFatLossLbs: Math.round(weeklyLoss * 100) / 100,
  };
}
