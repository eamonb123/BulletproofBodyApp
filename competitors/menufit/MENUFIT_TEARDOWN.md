# MenuFit App Teardown

> Captured: 2026-03-07 by Eamon
> 93 screenshots in chronological order (onboarding → paywall → in-app experience)
> Compressed screens saved in: `competitors/menufit/screens/`

## What MenuFit Is

A restaurant menu optimization app. Users input their goals/body stats, and it recommends healthier orders at any restaurant. $48/year after 7-day free trial. Claims 22.13M restaurants worldwide. Used by fitness influencers as an affiliate play.

## Our Advantage

MenuFit monetizes through software subscriptions. We monetize through high-ticket coaching ($3K+). This means we can give away MORE value for FREE — our lead magnet and Fast Food Bible don't need a paywall. We over-deliver upfront, build trust, and the backend is coaching. They gate everything behind a trial. We give everything away and capture the lead.

---

## PHASE 1: GOAL & IDENTITY (Screens 7350-7361)

### Screen-by-Screen

| # | Screen | What They Ask/Show |
|---|--------|--------------------|
| 7350 | Goal selection | "What's your goal?" — Gain/Lose/Maintain (single select cards) |
| 7351 | Frequency | "How many days per week do you eat out?" — 1-2/3-4/5+ days |
| 7352 | Pain points | "What's the hardest part?" — Finding low-cal, getting protein, avoiding fat/sugar, don't know options (multi-select) |
| 7353 | Ordering style | "How do you usually decide?" — Looks good, think it's healthy, always get same thing, check macros (multi-select) |
| 7354 | Social proof interstitial | "Here's the truth" — Weight chart showing MenuFit vs regular ordering over 60 days. "Users drop twice as much weight." CTA: "Let's Fix That" |
| 7355 | (Same as 7353 with selections made) | Shows selected state UI — black border + filled check |
| 7356 | (Same as 7354) | Duplicate capture of social proof screen |
| 7357 | Gender | Male/Female/Other (single select) |
| 7358 | Height | Scroll-wheel picker (ft/in) |
| 7359 | Current weight | "184.0 lbs" with horizontal slider/ruler |
| 7360 | Goal weight | "174.0 lbs" with green "-10.0 lbs" delta shown |
| 7361 | Timeline | 4 weeks / 8 weeks / 12+ weeks / No timeline |

### Team Commentary

**Marketing (Content Engine):**
- The pain point screen (7352) is gold for us. Those exact phrases — "finding lower-calorie meals," "getting enough protein," "don't know the healthy options" — are Joel's internal monologue. We should use these exact words in our reel hooks because MenuFit validated them with their user base.
- The social proof interstitial (7354) is smart — breaks up the monotony of questions. But it's a CLAIM with no proof. We can do better: show a REAL client's DoorDash order before/after with actual calorie savings. That's tangible.
- "Here's the truth: Eating out isn't the problem. Not knowing what to order is." — This is literally our ONE PROBLEM. They're saying the same thing we are. The market is validated.

**Sales (SalesAgent):**
- They're collecting buying signals disguised as personalization questions. "5+ days eating out" = high pain, high urgency. "Don't know the healthy options" = ready for guidance. We should track which answers our lead magnet users give (if we add similar questions) for lead scoring.
- The ordering style question (7353) maps to our prospect qualification: "Whatever looks good" = impulsive (harder client), "I check calories/macros first" = analytical (our ideal). Worth noting for future lead magnet enhancement.

**Fulfillment (Coaching):**
- The goal weight screen showing the delta (-10 lbs) in green is a nice psychological touch. It makes the gap feel small and achievable. Our projection screen does something similar but with weekly fat loss rate — we should also show "total to lose" as a concrete number.
- They ask for timeline but don't explain why it matters. We could add context: "Your body can safely lose 1-2 lbs/week" to set expectations and position ourselves as the knowledgeable option.

**Product/UX:**
- UI pattern: White cards, left icon, right radio/checkbox. Selected = black border. Disabled CTA until selection made. Clean, standard, nothing revolutionary.
- The weight slider (7359) is elegant — horizontal ruler with large centered number. Better than a text input for mobile.
- Progress bar is persistent but tiny — roughly 15-20 steps total. That's a LOT of onboarding before seeing any value. Our lead magnet gives value in 3 taps.

---

## PHASE 2: EDUCATION INTERSTITIALS (Screens 7362-7363)

### Screen-by-Screen

| # | Screen | What They Show |
|---|--------|----------------|
| 7362 | Food comparison | Subway wrap (430 cal) vs subs+drink (1230 cal) — side-by-side meal cards |
| 7363 | (Same, scrolled up) | Green "Better for cutting" tag on wrap, blue "Better for bulking" tag on sub |

### Team Commentary

**Marketing:**
- "Better for cutting" vs "Better for bulking" reframes food as neither good nor bad — just goal-dependent. This is exactly our philosophy. But they're using it as education; we should use it as CONTENT. A reel showing this exact comparison would perform.
- The side-by-side meal comparison is the core UX mechanic of our lead magnet (original vs swap). Validates our approach.

**Fulfillment:**
- Smart that they don't say "bad food" — they say "better for bulking." This avoids shame and keeps the user in a positive frame. Our swap reveal should maintain this tone too. The swap isn't "the healthy version" — it's "the version that matches your goal."

**Product/UX:**
- The two-card comparison layout is effective. We do this on our SwapRevealScreen. Their version is static (just showing info); ours is interactive (you build the meal first, then see the swap). Ours is more engaging.

---

## PHASE 3: PREFERENCES DEEP DIVE (Screens 7364-7372)

### Screen-by-Screen

| # | Screen | What They Ask/Show |
|---|--------|--------------------|
| 7364 | Activity level | Sedentary → Very Active (5 options, icons get more active) |
| 7365 | Eating style | No preference / Keto / Carnivore / Vegan |
| 7366-7368 | Healthiness slider | Custom 3-tier thermometer: "Healthy" → "More Healthy" → "Most Healthy" with dynamic descriptions |
| 7369-7372 | Restaurant coverage | "22.13 million restaurants" — 3D globe, cafe, bar, fine dining illustrations rotating |

### Team Commentary

**Marketing:**
- The healthiness slider (7366-7368) is their most distinctive UI element. Three tiers with different commitment levels. This maps to our coaching phases — but for a lead magnet, it's overkill. People don't want to self-select their commitment level upfront; they want to see value.
- "22.13 million restaurants" is a big claim that creates FOMO. Our counter: we don't need millions. We need the 20 restaurants you ACTUALLY order from, done perfectly. Depth > breadth.

**Sales:**
- The 3D restaurant illustrations (7369-7372) are pure trust theater. Looks impressive, communicates scale. But it's fluff. Our AI food sprites are FUNCTIONAL — they show you what you're actually going to eat. Theirs are decorative.

**Product/UX:**
- The healthiness thermometer is clever UX but introduces complexity. "Healthy" vs "More Healthy" vs "Most Healthy" — what does that actually mean for my burrito? Our approach is simpler: here's what you order, here's the swap, here's how many calories you save.

---

## PHASE 4: RESTAURANT & FOOD SELECTION (Screens 7373-7394)

### Screen-by-Screen

| # | Screen | What They Show |
|---|--------|----------------|
| 7373-7383 | Restaurant list | "Pick your favorite spots" — scrollable list of 40+ chains with logos, price tiers ($-$$$), "Your Area" tags, checkboxes. Includes: Chipotle, Wendy's, Taco Bell, Panera, McDonald's, Chick-fil-A, In-N-Out, Sweetgreen, etc. |
| 7384 | Education interstitial | McDonald's photo: fit guy vs overweight guy eating different meals. "It's not where you eat, it's what you order." |
| 7385-7389 | Food preferences | "What types of food do you love?" — 2-column pill grid with emojis. Categories: Entrees (burger, taco, burrito, bowl, pizza...), Proteins (chicken, beef, pork...), Sides (rice, fries, vegetables...), Breakfast, Desserts, Drinks |
| 7390-7394 | Food dislikes | "What types of food DON'T you like?" — Same grid but removes items already selected as liked |

### Team Commentary

**Marketing:**
- The McDonald's comparison photo (7384) is effective but also kind of shamey — showing an overweight person with "bad" food next to a fit person with "good" food. We would NEVER do this. Our brand is "swap, don't shame." This is a weakness we can exploit in positioning.
- 40+ restaurants is impressive for onboarding but also fatiguing. Eamon had to scroll through 10+ screens just to see the full list. Our swipe card approach (one restaurant at a time) is more engaging.

**Sales:**
- The food preference system (likes + dislikes) is deep personalization. They're building a recommendation engine. We don't need this for the lead magnet — our value is simpler: "you already know what you order, we show you the smarter version." But for the Fast Food Bible, personalized filtering could be a future feature.

**Fulfillment:**
- The dislikes screen (7390) automatically removes items you said you liked — smart UX that prevents contradictions. If we ever add personalization to the Bible, steal this pattern.
- The food category taxonomy (Entrees → Proteins → Sides → Breakfast → Desserts → Drinks) is well-organized. Our ingredients DB uses similar categories per restaurant.

**Product/UX:**
- The pill-button grid for food selection is clean. Selected = black border on pill. Much more mobile-friendly than checkboxes.
- The onboarding is now ~25 screens deep and the user STILL hasn't seen a single menu recommendation. This is the biggest vulnerability: they're asking for a LOT before delivering value. Our lead magnet delivers value in under 10 seconds.

---

## PHASE 5: SOCIAL PROOF → PAYWALL (Screens 7395-7409)

### Screen-by-Screen

| # | Screen | What They Show |
|---|--------|----------------|
| 7395 | Weight loss claim | "Lose twice as much weight with MenuFit" — simple 1x vs 2x bar chart |
| 7396 | Rating prompt | "Give us a rating" — 5 stars, user photos, testimonial cards from Gabriell Carney and Patrick Gleason |
| 7397 | Ready confirmation | "Ready for us to generate your personalized menu?" — green checkmark, "Yes!" CTA |
| 7398-7399 | Loading animation | "We're getting your menu ready" — 16% → 100% with status messages ("Filtering restaurants") |
| 7400-7403 | Meal preview carousel | "Congratulations!" — rotating phone mockup showing personalized meals (KFC "Greens & Grill" 295cal, "Grilled Gains" 445cal, Taco Bell "High Protein Bowl" 320cal) |
| 7404 | Referral code | "Do you have a referral code?" (skippable) |
| 7405 | Account creation | Sign in with Apple / Google |
| 7406 | Paywall - trial offer | "Try MenuFit for free" — phone mockup showing Carbone restaurant, brand logo wallpaper. Blue "Try for $0.00" CTA |
| 7407 | Paywall - reminder promise | "We'll send you a reminder before your trial ends" — bell icon with notification badge |
| 7408 | Paywall - plan selection | 7-day free trial (selected) or 30-day trial ($3.99). Timeline: Today→Day 5 reminder→Day 7 billing. "$48/year ($0.92/wk)" |
| 7409 | App Store confirmation | iOS subscription modal — "Apex Plan" $48/year after 7-day trial |

### Team Commentary

**Marketing:**
- The fake loading screen (7398-7399) is a well-known conversion tactic. "Filtering restaurants... Analyzing menu items..." — it's doing nothing, but it creates perceived value. Every SaaS app does this. It works.
- The meal preview carousel (7400-7403) is the ONLY value the user sees before paying. After 25+ onboarding screens, they get a peek at 3-4 meals. That's it. Then paywall. This is where we CRUSH them — our entire lead magnet experience is free. They see one meal preview; our users build their own swap, see the calorie savings, get a fat loss projection, AND can keep going with more restaurants. All free.
- "Congratulations!" with party popper — creates excitement before the ask. Standard but effective.

**Sales:**
- $48/year = $4/month = $0.92/week. The pricing anchoring is smart. But this is software pricing competing against our coaching. We don't need to compete on price — we compete on TRANSFORMATION. Their app gives recommendations; we give accountability + expertise + personal attention.
- The referral code screen (7404) confirms they have an affiliate program. This is how fitness influencers are pushing it — they get a cut of every subscription. Our lead magnet doesn't need referral codes because the "referral" is the content itself (reels → lead magnet → coaching).
- Multi-step paywall (3 screens: offer → reminder → plan) reduces friction incrementally. Each screen handles one objection: "Is it free?" → "Will I forget to cancel?" → "Which plan?"

**Fulfillment:**
- They show KFC and Taco Bell meals with names like "Greens & Grill" and "High Protein Bowl" — these are GENERATED names, not real menu items. The meals are assembled from real ingredients but branded with MenuFit's own names. This could confuse users at the counter. Our approach (showing the actual Chipotle ingredients you'll ask for) is more practical.
- 295 cal for a KFC meal with 41g protein is actually impressive if accurate. But can you actually order this? "Greens & Grill" isn't on KFC's menu. You'd have to know to ask for grilled chicken + corn + side salad. Our swap approach is more explicit about what to actually say when you order.

**Product/UX:**
- The paywall is 4 screens deep (offer → reminder → plan → App Store). That's a lot of soft selling. Shows they know the conversion is fragile — they need to handle objections one at a time.
- "No Payment Due Now" appears on every paywall screen — they're fighting the #1 objection hard.
- The "Try for $0.00" blue CTA is the most prominent colored button in the entire app. Everything else is black/white. The color draws the eye.

---

## PHASE 6: IN-APP EXPERIENCE (Screens 7410-7442)

### Screen-by-Screen

| # | Screen | What They Show |
|---|--------|----------------|
| 7410-7413 | Home screen | Location-based restaurant browse. Search bar, protein filter chips (Chicken, Seafood, Lamb...), "Fast Food" horizontal scroll, "Near Me" cards with photos/distance/price, "Most Popular" ranked list with heart counts |
| 7414 | Location picker | Text input for location with GPS icon |
| 7415-7416 | Preference filter | Bottom sheet with calorie gauge (600 cal target), protein/carb/fat sliders, diet type pills, meal type, likes/dislikes tags |
| 7417-7418 | Suggested meals feed | Vertical card feed: "Buffalo Bites" Applebee's (390cal), "Blackened Beauty" sweetgreen (345cal), "Lean Machine" sweetgreen (415cal). Each with green "100 EXCELLENT" score badge, description, macros, "Order Now" CTA |
| 7419 | AI chat | "Ask anything about eating healthy" — pre-built prompts + text input + voice |
| 7420 | Settings/Profile | Height, weight, goal, donut chart macro breakdown (1.6K cal, 118g P / 158g C / 52g F), edit preferences |
| 7421 | Data sources disclaimer | Uses Nutritionix + OpenAI, Mifflin-St Jeor formula |
| 7422 | Preference bottom sheet (custom) | Same filter as 7415 but labeled "Custom" with "Set default" checkbox |
| 7423-7426 | Loading/analysis | 3D restaurant buildings rotating, progress 2%→20%→92%→100%, checklist: Locating Menu → Analyzing Items → Filtering Goals → Personal Menu |
| 7427-7428 | Restaurant detail | Dinah's Garden Hotel — map, "Best for you" tab vs "All menu items" tab |
| 7429 | Item selection | Checking off menu items (green checkmarks), "See Full Meal Macros" CTA |
| 7430 | Meal macro summary | Selected items totaled: 1371 cal, 126g P, 58g C, 68g F. "Healthify" CTA |
| 7431 | Healthifying loading | "Please wait, we're healthifying your meal" with loading animation |
| 7432-7433 | Healthified results | Modification instructions (e.g., "request without gravy"), before/after macros (1371→1100 cal), "Coach Insight" explanation |
| 7434 | Shareable meal card | Designed for screenshots/sharing. "Warning: this order may get you lean." Save/Copy/Share buttons |
| 7435-7439 | Category browsing | "Best For Me" (scores 92-95), "High Protein" (93-94), "Slightly Better" (88-90), "Low Calorie Drinks" (98-99). Each with score badge + Coach Insight |
| 7440 | Favorited restaurant | Heart icon filled red |
| 7441 | AI chat (restaurant-specific) | "Ask anything about Dinah's Garden Hotel" — contextual AI prompts |
| 7442 | Updated preferences | Calories adjusted to 716, macros shifted |

### Team Commentary

**Marketing:**
- The shareable meal card (7434) with "Warning: this order may get you lean" is BRILLIANT for virality. Users screenshot this, post to stories, tag the restaurant. Free marketing. We should steal this concept — after our swap reveal, give users a shareable card with their savings ("You just saved 470 calories at Chipotle").
- The "100 EXCELLENT" score badges create gamification and shareability. People want to find the "100" meals. Our calorie savings number serves the same purpose but isn't as badge-like. Consider adding a visual score/rating to our swaps.
- The meal names ("Blackened Beauty," "Lean Machine," "Grilled Gains") are catchy but fake — you can't order a "Lean Machine" at sweetgreen. Our approach of showing real ingredient modifications is more honest and practical.

**Sales:**
- "Order Now" CTA on every meal card — they're trying to capture the moment of intent. Do they get affiliate revenue from restaurant orders? If so, that's a second revenue stream beyond subscriptions. Smart.
- The 4-tab navigation (Home, Meals, AI Chat, Profile) keeps the user in a loop. Home discovers restaurants → Meals shows recommendations → AI answers questions → Profile tracks progress. Our two tools (Lead Magnet for discovery, Bible for reference) serve similar but simpler purposes.

**Fulfillment:**
- The "Healthify" feature (7430-7432) is their killer feature. You select what you WANT to eat, and it tells you how to modify it. "Request without gravy," "request steamed vegetables instead of heavier sides." This is exactly what a coach does. The difference: their AI gives generic modifications; our coaches give personalized guidance based on the client's specific phase, habits, and history.
- The Coach Insight text (green gradient cards) adds context to every recommendation. "Elite match — exactly what you're looking for at this stage." This language creates trust. But it's LLM-generated and generic. Our coaching is human and specific.
- The scoring system (88 GREAT → 95 EXCELLENT) creates a clear hierarchy. "Best For Me" > "High Protein" > "Slightly Better." Our lead magnet doesn't score swaps — it just shows savings. A quality score could add perceived value.
- They include beverage pairings with every meal (Sparkling Water, Iced Tea). Subtle but smart — drinks are a hidden calorie source. We should consider adding drink recommendations to our swaps.

**Product/UX:**
- The "Healthify" flow is their unique value prop. Select items → see total macros → tap Healthify → get modification instructions + new macros. This is what people pay $48/year for. Our free tool doesn't have this "modify your existing order" feature — we show pre-built swaps instead. Both approaches work; ours is simpler.
- The macro comparison (before vs after) in the Healthified results (7432) is clean. Color-coded tiles showing the delta. We do this on our SwapRevealScreen but could make it more visual.
- 3D restaurant illustrations during loading (7423-7425) are charming but unnecessary. Our approach is faster — no loading screens because the data is pre-computed.
- The AI chat (7419, 7441) is their future play. Context-aware AI that answers nutrition questions per restaurant. This is where coaching meets software. We don't need this because WE ARE the coach — but it shows where the market is heading.
- Bottom tab navigation with 4 tabs is standard mobile app UX. Our web-based tools don't need this but should maintain clear navigation between Lead Magnet and Bible.

---

## STRATEGIC SUMMARY

### What MenuFit Does Well
1. **Massive restaurant coverage** — 22M+ restaurants, location-aware
2. **Deep personalization** — goals, body stats, food preferences, diet type, healthiness level
3. **"Healthify" feature** — modify your actual order with specific instructions
4. **Shareable meal cards** — built for social media virality
5. **Coach Insights** — AI-generated explanations for every recommendation
6. **Scoring system** — 88-100 ratings create gamification
7. **Multi-step paywall** — handles objections incrementally

### What MenuFit Does Poorly
1. **25+ screens before ANY value** — massive drop-off risk
2. **Fake meal names** — "Lean Machine" isn't on sweetgreen's menu
3. **Generic AI modifications** — "request without gravy" isn't personalized coaching
4. **Shamey McDonald's photo** — fit guy vs overweight guy comparison
5. **No community or accountability** — it's a solo tool
6. **$48/year paywall** — gates everything, including basic meal info
7. **Influencer-driven acquisition** — affiliate play, not organic trust

### How We Beat Them

| MenuFit | Bulletproof Body |
|---------|-----------------|
| Paywall before value | ALL value free — lead magnet + Bible |
| 25+ screens to first insight | Value in 3 taps |
| AI-generated generic advice | Eamon-verified, coach-validated swaps |
| Fake meal names | Real ingredients you actually order |
| Software subscription ($48/yr) | Free tool → high-ticket coaching ($3K+) |
| Solo app experience | Community + accountability + human coaching |
| "Healthify" = generic AI modifications | Specific swap rationales from a real coach |
| Influencer affiliates drive traffic | Organic content (reels) drives traffic |
| Shame-based comparison photos | "Swap, don't shame" brand positioning |

### Ideas to Steal (Adapted for Our Brand)
1. **Shareable swap card** — After reveal, generate a screenshot-ready card with savings + "Powered by Bulletproof Body"
2. **Meal scoring** — Add a visual quality score to swaps (not just calorie delta)
3. **Beverage pairings** — Include drink swaps (Diet Coke vs regular = 140 cal saved)
4. **"Healthify" concept for Bible** — In Fast Food Bible, let users select items and see a healthier modification (Phase 2 feature)
5. **Food preference questions** — Add 2-3 preference questions to lead magnet for personalization + lead scoring
6. **Before/after macro comparison** — Make our SwapRevealScreen comparison more visual with color-coded tiles

---

## File Index

```
competitors/menufit/
├── MENUFIT_TEARDOWN.md          ← This file
└── screens/
    ├── IMG_7350.jpg → IMG_7361.jpg   (Phase 1: Goal & Identity, 12 screens)
    ├── IMG_7362.jpg → IMG_7363.jpg   (Phase 2: Education, 2 screens)
    ├── IMG_7364.jpg → IMG_7372.jpg   (Phase 3: Preferences, 9 screens)
    ├── IMG_7373.jpg → IMG_7394.jpg   (Phase 4: Restaurant & Food Selection, 22 screens)
    ├── IMG_7395.jpg → IMG_7409.jpg   (Phase 5: Social Proof → Paywall, 15 screens)
    └── IMG_7410.jpg → IMG_7442.jpg   (Phase 6: In-App Experience, 33 screens)
```
