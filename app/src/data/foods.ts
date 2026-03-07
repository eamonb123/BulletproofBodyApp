export interface FoodItem {
  id: string;
  name: string;
  restaurant: string;
  cuisine: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving: string;
  emoji: string;
}

export interface FoodSwap {
  original: FoodItem;
  swaps: FoodItem[];
  rationale: string;
}

const foods: Record<string, FoodItem> = {
  // ── Originals ──────────────────────────────────────
  chipotle_burrito: {
    id: "chipotle_burrito",
    name: "Burrito",
    restaurant: "Chipotle",
    cuisine: "Mexican",
    calories: 1100,
    protein: 52,
    carbs: 120,
    fat: 42,
    serving: "1 burrito (rice, beans, chicken, sour cream, cheese)",
    emoji: "🌯",
  },
  pad_thai: {
    id: "pad_thai",
    name: "Pad Thai",
    restaurant: "Thai",
    cuisine: "Asian",
    calories: 900,
    protein: 35,
    carbs: 110,
    fat: 32,
    serving: "1 order with chicken",
    emoji: "🍜",
  },
  pepperoni_pizza: {
    id: "pepperoni_pizza",
    name: "Pepperoni Pizza",
    restaurant: "Pizza",
    cuisine: "American",
    calories: 700,
    protein: 28,
    carbs: 72,
    fat: 32,
    serving: "2 slices",
    emoji: "🍕",
  },
  tikka_masala: {
    id: "tikka_masala",
    name: "Chicken Tikka Masala",
    restaurant: "Indian",
    cuisine: "Indian",
    calories: 1200,
    protein: 45,
    carbs: 95,
    fat: 55,
    serving: "1 order + naan + rice",
    emoji: "🍛",
  },
  burger_fries: {
    id: "burger_fries",
    name: "Burger + Fries",
    restaurant: "Burger Joint",
    cuisine: "American",
    calories: 1100,
    protein: 42,
    carbs: 90,
    fat: 55,
    serving: "1 burger + medium fries",
    emoji: "🍔",
  },
  poke_bowl: {
    id: "poke_bowl",
    name: "Poke Bowl",
    restaurant: "Poke",
    cuisine: "Japanese",
    calories: 850,
    protein: 38,
    carbs: 100,
    fat: 28,
    serving: "1 bowl (white rice, spicy mayo)",
    emoji: "🥗",
  },
  orange_chicken: {
    id: "orange_chicken",
    name: "Orange Chicken + Fried Rice",
    restaurant: "Chinese",
    cuisine: "Chinese",
    calories: 1400,
    protein: 40,
    carbs: 160,
    fat: 52,
    serving: "1 plate",
    emoji: "🥡",
  },
  chick_fil_a_combo: {
    id: "chick_fil_a_combo",
    name: "Sandwich + Fries + Soda",
    restaurant: "Chick-fil-A",
    cuisine: "Fast Food",
    calories: 1300,
    protein: 42,
    carbs: 140,
    fat: 52,
    serving: "1 combo meal",
    emoji: "🐔",
  },
  caesar_wrap: {
    id: "caesar_wrap",
    name: "Chicken Caesar Wrap",
    restaurant: "Deli",
    cuisine: "American",
    calories: 780,
    protein: 35,
    carbs: 55,
    fat: 42,
    serving: "1 wrap",
    emoji: "🌮",
  },
  breakfast_burrito: {
    id: "breakfast_burrito",
    name: "Breakfast Burrito",
    restaurant: "Breakfast",
    cuisine: "Breakfast",
    calories: 900,
    protein: 32,
    carbs: 70,
    fat: 50,
    serving: "1 burrito (bacon, egg, cheese, potatoes)",
    emoji: "🥚",
  },

  // ── Swaps ──────────────────────────────────────────
  chipotle_bowl: {
    id: "chipotle_bowl",
    name: "Bowl (No Rice)",
    restaurant: "Chipotle",
    cuisine: "Mexican",
    calories: 540,
    protein: 50,
    carbs: 35,
    fat: 18,
    serving: "1 bowl (fajita veggies, chicken, salsa, lettuce)",
    emoji: "🥗",
  },
  basil_chicken: {
    id: "basil_chicken",
    name: "Thai Basil Chicken",
    restaurant: "Thai",
    cuisine: "Asian",
    calories: 450,
    protein: 40,
    carbs: 35,
    fat: 15,
    serving: "1 order (half rice)",
    emoji: "🌿",
  },
  thin_crust_veggie: {
    id: "thin_crust_veggie",
    name: "Thin Crust Veggie",
    restaurant: "Pizza",
    cuisine: "American",
    calories: 420,
    protein: 22,
    carbs: 48,
    fat: 16,
    serving: "2 slices",
    emoji: "🍕",
  },
  tandoori_chicken: {
    id: "tandoori_chicken",
    name: "Tandoori Chicken + Salad",
    restaurant: "Indian",
    cuisine: "Indian",
    calories: 550,
    protein: 52,
    carbs: 20,
    fat: 22,
    serving: "1 order + side salad",
    emoji: "🍗",
  },
  lettuce_wrap_burger: {
    id: "lettuce_wrap_burger",
    name: "Lettuce-Wrap Burger + Salad",
    restaurant: "Burger Joint",
    cuisine: "American",
    calories: 500,
    protein: 38,
    carbs: 15,
    fat: 30,
    serving: "1 burger (no bun) + side salad",
    emoji: "🥬",
  },
  poke_bowl_swap: {
    id: "poke_bowl_swap",
    name: "Poke Bowl (Brown Rice)",
    restaurant: "Poke",
    cuisine: "Japanese",
    calories: 550,
    protein: 42,
    carbs: 60,
    fat: 14,
    serving: "1 bowl (brown rice, no mayo, extra protein)",
    emoji: "🐟",
  },
  steamed_chicken_broccoli: {
    id: "steamed_chicken_broccoli",
    name: "Steamed Chicken + Broccoli",
    restaurant: "Chinese",
    cuisine: "Chinese",
    calories: 550,
    protein: 48,
    carbs: 45,
    fat: 12,
    serving: "1 plate (brown rice)",
    emoji: "🥦",
  },
  chick_fil_a_swap: {
    id: "chick_fil_a_swap",
    name: "Grilled Nuggets + Salad",
    restaurant: "Chick-fil-A",
    cuisine: "Fast Food",
    calories: 350,
    protein: 38,
    carbs: 18,
    fat: 10,
    serving: "12ct nuggets + side salad + water",
    emoji: "🥗",
  },
  grilled_chicken_salad: {
    id: "grilled_chicken_salad",
    name: "Grilled Chicken Salad",
    restaurant: "Deli",
    cuisine: "American",
    calories: 400,
    protein: 40,
    carbs: 15,
    fat: 18,
    serving: "1 salad (dressing on side)",
    emoji: "🥗",
  },
  egg_white_wrap: {
    id: "egg_white_wrap",
    name: "Egg White Wrap + Avocado",
    restaurant: "Breakfast",
    cuisine: "Breakfast",
    calories: 380,
    protein: 28,
    carbs: 30,
    fat: 16,
    serving: "1 wrap",
    emoji: "🥑",
  },
};

export const foodSwaps: FoodSwap[] = [
  {
    original: foods.chipotle_burrito,
    swaps: [foods.chipotle_bowl],
    rationale: "Skip the tortilla and rice. Same Chipotle, 560 fewer calories.",
  },
  {
    original: foods.pad_thai,
    swaps: [foods.basil_chicken],
    rationale: "Thai basil chicken is packed with protein and half the carbs.",
  },
  {
    original: foods.pepperoni_pizza,
    swaps: [foods.thin_crust_veggie],
    rationale: "Thin crust + veggies. Still pizza. 280 calories lighter.",
  },
  {
    original: foods.tikka_masala,
    swaps: [foods.tandoori_chicken],
    rationale: "Tandoori is grilled, not swimming in cream sauce. Same spices, half the calories.",
  },
  {
    original: foods.burger_fries,
    swaps: [foods.lettuce_wrap_burger],
    rationale: "Ditch the bun and fries. You keep the burger — that's the part you actually want.",
  },
  {
    original: foods.poke_bowl,
    swaps: [foods.poke_bowl_swap],
    rationale: "Brown rice + extra protein, skip the spicy mayo. Same bowl, 300 calories saved.",
  },
  {
    original: foods.orange_chicken,
    swaps: [foods.steamed_chicken_broccoli],
    rationale: "Same Chinese restaurant. Steamed instead of deep-fried. 850 fewer calories.",
  },
  {
    original: foods.chick_fil_a_combo,
    swaps: [foods.chick_fil_a_swap],
    rationale: "Grilled nuggets are 38g protein for 350 calories. The combo was 1,300.",
  },
  {
    original: foods.caesar_wrap,
    swaps: [foods.grilled_chicken_salad],
    rationale: "Same chicken, lose the wrap and heavy dressing. Ask for it on the side.",
  },
  {
    original: foods.breakfast_burrito,
    swaps: [foods.egg_white_wrap],
    rationale: "Egg whites + avocado. Healthy fats, high protein, 520 fewer calories.",
  },
];

// The 6 most common meals for the tutorial screen
export const tutorialMeals: FoodSwap[] = foodSwaps.slice(0, 6);

// All meals for the expanded library
export const allMeals: FoodSwap[] = foodSwaps;

export default foods;
