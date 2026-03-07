# Bulletproof Body App — Product Spec

## Origin

Morning Download 2026-03-06. Eamon's stream of consciousness during fasted cardio.

## One-Liner

An interactive DoorDash/takeout food swap tool that shows busy professionals exactly how much fat they'd lose by making simple swaps — without meal prepping, without cardio, without changing their lifestyle.

## The Insight

Eamon's clients order DoorDash every night. They think they SHOULD meal prep. They feel guilty. They keep ordering anyway. The gap isn't motivation — it's information. Show them what to order INSTEAD, and show them the math.

---

## MVP User Flow

### Screen 1: The Tutorial (Value in <10 seconds)

No forms. No email. No friction. Immediate value.

1. Show 4-6 of the most common takeout meals (visual cards with photos):
   - Chipotle burrito bowl
   - Pad Thai
   - Pepperoni pizza (2 slices)
   - Chicken tikka masala + rice
   - Burger + fries
   - Poke bowl

2. User taps 2-3 they normally order

3. IMMEDIATELY show: "Here's what those cost you" (calories per meal, visual)

4. For each selected meal, show 1-2 swap options from the SAME restaurant/cuisine:
   - Same convenience, same restaurant, different macros
   - Show calories saved per swap

5. As they pick swaps, a running counter updates in real time:
   - "You just saved 847 calories"
   - "That's 0.24 lbs of fat — per day"
   - "Do this for 1 week = 1.7 lbs lost"

This is the TUTORIAL. They learn by doing. No reading. No explaining.

### Screen 2: "Want more?" (Expand the swap library)

"Those were the top 6. Here are 20+ more meals from DoorDash, UberEats, and Postmates."

Organized by cuisine type:
- Mexican (Chipotle, local spots)
- Asian (Thai, Chinese, Japanese, Indian)
- American (burgers, pizza, wings)
- Mediterranean
- Breakfast/Brunch
- Coffee shop orders

User picks more meals they normally order. Each one gets swap options. The running counter keeps updating.

### Screen 3: "Personalize Your Results" (Earn the data)

"Want to know EXACTLY how much you'd lose? Let me tailor this to your body."

Quick form (4 fields):
- Age
- Weight (current)
- Height
- Gender (Male/Female — for RMR calc)

Calculate RMR using Mifflin-St Jeor:
- Male: (10 x weight_kg) + (6.25 x height_cm) - (5 x age) + 5
- Female: (10 x weight_kg) + (6.25 x height_cm) - (5 x age) - 161

Assume SEDENTARY (x1.2 multiplier). This is the worst-case scenario model.
"We assume you don't work out at all. If you do — bonus."

TDEE = RMR x 1.2

### Screen 4: "Your Projection" (The Money Screen)

Now we have:
- Their TDEE (maintenance calories)
- Their current meals (from selections)
- Their swapped meals (from selections)
- The daily calorie deficit from swaps

Show:
- Daily deficit: X calories
- Weekly fat loss: X lbs (deficit x 7 / 3500)
- Monthly projection: X lbs
- Timeline to goal (if they set one)

**Add goal weight field here:**
"What's your goal weight?"

The projection updates live:
"At this rate, ordering DoorDash every night with these swaps, you'd hit [goal] by [date]."

Visual: Clean animated graph showing weight curve from current → goal.

### Screen 5: "Your Report" (Capture)

"Want us to send you a complete breakdown?"

- Email (required)
- Phone (optional — "for SMS updates")
- "Send My Report" button

### Screen 6: Trust Bridge (While "generating")

Show for 15-20 seconds while "generating report":

1. **Mission Statement:**
   "At Bulletproof Body, we work with entrepreneurs, executives, and ambitious professionals. Time is your scarcest resource. We don't build plans for your best days — we build for your worst. The days where you don't have time for cardio, energy for steps, or interest in meal prep. If we can build a plan for the worst-case scenario, everything above that builds confidence."

2. **Testimonial Videos:**
   - Clients talking about losing fat while eating takeout
   - Progress photos (high quality)
   - Specific quotes about DoorDash, CookUnity, restaurants

3. **"Sent!" confirmation**

4. **Soft CTA:**
   "Want to build your full plan? Book a free call with our team."
   → Calendar link

---

## Technical Architecture

### Frontend

**Framework:** Next.js (App Router) or plain React + Vite
- Mobile-first responsive design
- Apple-like aesthetic: white space, clean typography, smooth animations
- No heavy UI framework — custom CSS or Tailwind CSS
- Framer Motion for animations (swap cards, counter updates, graph)

**Charting:** Lightweight, animated
- Options: Chart.js (simple), Recharts (React), or custom SVG
- Need: animated line graph (weight projection), animated counters, progress bars

**Multi-step form:** Custom (NOT Typeform embed)
- Smooth transitions between screens
- Progress indicator
- Back navigation
- Mobile swipe gestures (nice-to-have)

### Backend

**Runtime:** Node.js or Python (FastAPI)

**Database:** PostgreSQL or SQLite (for MVP)

**Food Database Schema:**

```sql
-- Core food items
CREATE TABLE food_items (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    restaurant TEXT,           -- "Chipotle", "Generic Thai", etc.
    cuisine_type TEXT,         -- "Mexican", "Asian", "American", etc.
    category TEXT,             -- "takeout", "restaurant", "snack", "sweet"
    calories INTEGER NOT NULL,
    protein_g NUMERIC(5,1),
    carbs_g NUMERIC(5,1),
    fat_g NUMERIC(5,1),
    fiber_g NUMERIC(5,1),
    image_url TEXT,
    source TEXT,               -- where nutrition data came from
    created_at TIMESTAMP DEFAULT NOW()
);

-- Human-readable serving sizes
CREATE TABLE serving_sizes (
    id SERIAL PRIMARY KEY,
    food_item_id INTEGER REFERENCES food_items(id),
    description TEXT NOT NULL,  -- "1 burrito", "2 slices", "1 bowl"
    multiplier NUMERIC(4,2) DEFAULT 1.0,
    is_default BOOLEAN DEFAULT false
);

-- Swap pairs (original → healthier alternative)
CREATE TABLE food_swaps (
    id SERIAL PRIMARY KEY,
    original_id INTEGER REFERENCES food_items(id),
    swap_id INTEGER REFERENCES food_items(id),
    calorie_savings INTEGER,   -- computed: original.calories - swap.calories
    protein_gain NUMERIC(5,1), -- computed: swap.protein - original.protein
    same_restaurant BOOLEAN,   -- can you get this from the same place?
    swap_rationale TEXT,        -- "Same flavor profile, half the calories"
    difficulty TEXT DEFAULT 'easy' -- 'easy', 'medium' (for future)
);

-- User sessions (anonymous until email capture)
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Demographics (optional, filled in Screen 3)
    age INTEGER,
    weight_lbs NUMERIC(5,1),
    height_inches NUMERIC(4,1),
    gender TEXT,
    goal_weight_lbs NUMERIC(5,1),
    -- Calculated
    rmr NUMERIC(7,1),
    tdee NUMERIC(7,1),
    daily_deficit NUMERIC(7,1),
    weekly_fat_loss_lbs NUMERIC(4,2),
    projected_goal_date DATE,
    -- Contact (filled in Screen 5)
    email TEXT,
    phone TEXT,
    -- Tracking
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT
);

-- What meals user selected and swapped
CREATE TABLE user_selections (
    id SERIAL PRIMARY KEY,
    session_id UUID REFERENCES user_sessions(id),
    original_food_id INTEGER REFERENCES food_items(id),
    swap_food_id INTEGER REFERENCES food_items(id),
    step INTEGER -- which screen/step they made this selection
);

-- Funnel analytics
CREATE TABLE funnel_events (
    id SERIAL PRIMARY KEY,
    session_id UUID REFERENCES user_sessions(id),
    event_type TEXT NOT NULL, -- 'page_view', 'meal_selected', 'swap_chosen',
                              -- 'personalized', 'goal_set', 'email_captured',
                              -- 'report_sent', 'cta_clicked'
    event_data JSONB,
    screen_number INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Deployment

**Hosting:** Render (free tier for MVP)
- Auto-deploy from GitHub on push
- Custom domain: tool.bulletproofbody.com or similar

**CI/CD:**
- GitHub repo: `BulletproofBodyApp`
- Push to main → auto-deploy to Render
- Preview deploys for PRs (nice-to-have)

### Email/SMS Integration

**Email:** Resend (simple API, good deliverability, free tier)
- Send personalized report PDF/HTML
- No spam folder issues (proper DKIM/SPF setup)

**SMS (optional):** Twilio or simple webhook to GHL
- "Your Bulletproof Body report is ready"

**Webhook to GHL:**
- On email capture → create/update contact in GoHighLevel
- Tag: "lead_magnet_takeout_swaps"
- Custom field: projected_fat_loss, daily_deficit, goal_weight

### Analytics

**Built-in funnel tracking** (funnel_events table):
- Screen-by-screen drop-off rates
- Completion rate
- Email capture rate
- CTA click rate

**Simple dashboard** (admin route or CLI):
- Today's sessions / completions / emails captured
- Funnel conversion by step
- Most popular meals selected
- Most popular swaps chosen

---

## Food Database — Initial Seed (Top 20)

### Priority 1: DoorDash/UberEats Staples

| Original Meal | Cal | Swap | Cal | Savings | Restaurant |
|---|---|---|---|---|---|
| Chipotle burrito (rice, beans, chicken, sour cream, cheese) | 1100 | Chipotle bowl (no rice, extra fajita veggies, chicken, salsa) | 540 | 560 | Chipotle |
| Pad Thai with chicken | 900 | Thai basil chicken (no rice or half rice) | 450 | 450 | Generic Thai |
| Pepperoni pizza (2 slices) | 700 | Thin crust veggie pizza (2 slices) | 420 | 280 | Generic Pizza |
| Chicken tikka masala + naan + rice | 1200 | Tandoori chicken + side salad | 550 | 650 | Generic Indian |
| Burger + fries | 1100 | Lettuce-wrap burger + side salad | 500 | 600 | Generic American |
| Poke bowl (white rice, spicy mayo) | 850 | Poke bowl (brown rice, no mayo, extra protein) | 550 | 300 | Generic Poke |
| Orange chicken + fried rice | 1400 | Steamed chicken + broccoli + brown rice | 550 | 850 | Chinese |
| California roll + spicy tuna roll (12 pcs) | 750 | Sashimi platter + miso soup | 350 | 400 | Sushi |
| Chicken Caesar wrap | 780 | Grilled chicken salad (dressing on side) | 400 | 380 | Deli |
| Breakfast burrito (bacon, egg, cheese, potatoes) | 900 | Egg white wrap + avocado | 380 | 520 | Breakfast |

### Priority 2: Chain-Specific

| Original | Cal | Swap | Cal | Savings | Chain |
|---|---|---|---|---|---|
| Chick-fil-A sandwich + fries + soda | 1300 | Grilled nuggets (12ct) + side salad + water | 350 | 950 | Chick-fil-A |
| Sweetgreen harvest bowl | 705 | Sweetgreen kale Caesar (half grains) | 430 | 275 | Sweetgreen |
| Panera bacon turkey bravo | 730 | Panera Mediterranean veggie (half) + soup | 440 | 290 | Panera |
| Shake Shack burger + fries + shake | 1800 | ShackBurger (no fries, water) | 530 | 1270 | Shake Shack |

### Database Ingestion Process

For each food item:
1. Name + restaurant + cuisine type
2. Full nutrition facts (cal, protein, carbs, fat, fiber) per serving
3. Human-readable serving size ("1 burrito", "2 slices", "1 bowl")
4. Backend: precise grams + all micronutrients available
5. Image (photo or high-quality stock)
6. Ingredient-level breakdown when available (Chick-fil-A nuggets = chicken + breading + oil, each with individual calories)
7. Source URL for nutrition data

**Future ingestion features (backlog):**
- Upload fast food menu PDF → auto-extract nutrition facts
- Screenshot of nutrition label → OCR → parse into DB
- Scrape restaurant website nutrition pages

---

## Design Principles

1. **Mobile-first** — Instagram bio link → phone screen. Every interaction must work with thumbs.
2. **Value before capture** — They see their fat loss projection BEFORE entering email.
3. **Speed** — First value hit in <10 seconds. Full flow completable in 90 seconds.
4. **Apple aesthetic** — White space, SF Pro or Inter font, smooth animations, no clutter.
5. **Data-driven** — Real math (Mifflin-St Jeor RMR), not generic advice. "Based on YOUR body."
6. **Worst-case planning** — Sedentary assumption. No workouts. No steps. Just food swaps. Everything else is bonus.
7. **Gamified** — Running counter, real-time projection updates, "You just saved X calories"
8. **Educational** — Brief, embedded copy that teaches (not lectures). "2 lb/week = 500 cal deficit/day"

---

## Design References (To Source)

- Apple product pages (animation, white space, typography)
- Typeform (multi-step flow, one question at a time)
- Carbon Health / One Medical (clean health UX)
- MyFitnessPal onboarding (goal setting flow)
- Lemonade insurance (gamified, fast, trust-building)

---

## Scalability (Same Skin, Different Wrapper)

The MVP is "takeout swaps." But the same architecture supports:

| Resource | Target Behavior | Same DB? |
|---|---|---|
| **Takeout Bible** (MVP) | DoorDash/UberEats ordering | Yes — food_items where category='takeout' |
| **Restaurant Bible** | Dining out at restaurants | Yes — category='restaurant' |
| **Sweets Swap** | Candy, desserts, ice cream | Yes — category='sweet' |
| **Snack Swap** | Protein snacks vs junk snacks | Yes — category='snack' |
| **Travel Guide** | Airport food, hotel room, road trips | Yes — category='travel' |
| **Grocery Swap** | Grocery store shelf items | Yes — category='grocery' |

Each lead magnet:
- Same frontend template (different branding/copy)
- Same RMR calc + projection engine
- Different food_items filtered by category
- Different entry URL (tool.bulletproofbody.com/takeout vs /restaurant vs /sweets)
- Same user_sessions table + analytics

---

## Today's Build Priorities

### P0 — Must ship today
1. Project setup (Next.js + Tailwind + deploy pipeline)
2. Food database schema + seed with top 20 takeout swaps
3. Screen 1: Tutorial flow (pick meals → see swaps → running counter)
4. Screen 2: Expanded swap library
5. Mobile-first responsive design
6. Deploy to Render with auto-deploy from GitHub

### P1 — Ship today if time allows
7. Screen 3: Personalization (RMR calc)
8. Screen 4: Projection graph (animated weight curve)
9. Screen 5: Email capture
10. Screen 6: Trust bridge + CTA

### P2 — This week
11. Email delivery (Resend integration)
12. GHL webhook (contact creation)
13. Funnel analytics dashboard
14. SMS notification (Twilio)

### P3 — Backlog
15. Menu PDF ingestion
16. Nutrition label OCR
17. Additional lead magnet skins (restaurant, sweets, snacks)
18. A/B testing framework
19. Referral tracking

---

## Success Metrics

- **Completion rate:** % who finish the full flow (target: 40%+)
- **Email capture rate:** % who give email (target: 60%+ of completers)
- **CTA click rate:** % who click "Book a call" (target: 15%+)
- **Call booking rate:** % who actually book (target: 30%+ of CTA clicks)
- **Time to value:** Seconds until first swap shown (target: <10s)

---

## Copy/Brand Notes

- Voice: Simple. Direct. Data-driven. Not preachy.
- "You don't have to become a meal prep person."
- "We plan for your worst day, not your best."
- "Same DoorDash. Different order. Different body."
- Brand: Bulletproof Body
- Target: Career-driven men in their 30s who used to be in shape
- The tool should feel like talking to a smart friend who happens to know nutrition, not a fitness bro lecturing you
