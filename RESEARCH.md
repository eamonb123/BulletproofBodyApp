# Competitive Research — Lead Magnet Tools (2026-03-06)

## Market Gap (CONFIRMED)

**No one has built a "what's hiding in your DoorDash orders" swap calculator.** FDA exempts delivery apps from calorie labels. Every existing tool either asks you to track from scratch (MyFitnessPal) or swaps within rigid meal plan categories (Team Atlas). A tool that says "You eat X for lunch? Here's the same meal, 300 cal lighter, with one swap" — for busy professionals who don't want to track — is novel and differentiated.

## Key Stats

- Interactive calculators: **28% conversion** vs 3.2% traditional (Outgrow)
- Ungated-first strategy: **10x lead velocity** (FounderPal/CXL)
- Visual projection tools: **42% higher 6-month retention** (View2Lose)
- Interactive content converts **70%** vs 36% passive (Outgrow)

## Competitor Tools

| Tool | URL | Good | Bad | Steal |
|------|-----|------|-----|-------|
| Built With Science Calculator | builtwithscience.com/calorie-calculator | Clean, science-backed | Generic calorie calc | Results shown immediately (trust-first) |
| Eric Roberts Fitness | ericrobertsfitness.com/free-calorie-calculator/ | Framed as coaching tool | Still just a calculator | Calculator IS the qualification |
| Team Atlas Food Swap | teamatlasfitness.com/food-swap-calculator/ | Only real food-swap tool | Category-locked, basic UX | "Swap within category" teaches nutrition |
| Model My Diet | modelmydiet.com | Visual body transformation | Not food-specific | "Future you" visualization is compelling |
| Calorie Comparison Tool | calorie-calculator.app/tools/calorie-comparison | Side-by-side comparison | No personalization | Visual comparison makes swaps obvious |

## UX Patterns to Steal

1. **One thing per screen** — Typeform-style, not cramming
2. **Results FIRST, email SECOND** — ungated value, gated save/export
3. **Multiple outputs from single input** — makes user feel they got more value
4. **Color-coded data** — green = good swap, red = current meal
5. **Visual "future you"** — timeline projections are the hook
6. **Calculator = qualification** — if you need help interpreting, that's coaching

## Tech Stack (Confirmed)

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js (App Router) | SSR for SEO, API routes, Vercel deploy |
| Styling | Tailwind CSS | Mobile-first by default, utility classes |
| Animation | Framer Motion | Multistep wizard pattern, smooth transitions |
| Charts | Chart.js or Tremor | Canvas = fast on mobile, Tremor = Tailwind-native |
| Forms | React Hook Form | Lightweight state management |
| Deploy | Vercel or Render | Auto-deploy, edge functions |

## The Optimal Flow (Research-Validated)

1. User lands → no email required
2. User inputs current meals (interactive, visual)
3. Tool shows swaps + personalized projection IMMEDIATELY
4. Soft gate: "Want me to email your custom plan?"
5. Hard value after email: personalized PDF, 3-day swap guide
6. Bridge: "Want help implementing? Book a free strategy call"

## Sources

- Outgrow: Fitness Marketing Tools Conversion Guide
- CXL: Accelerate Lead Gen by Ungating
- Team Atlas Food Swap Calculator
- Built With Science Calorie Calculator
- Framer Motion Multistep Wizard (buildui.com)
- FDA Delivery App Calorie Exemption (Washington Post)
