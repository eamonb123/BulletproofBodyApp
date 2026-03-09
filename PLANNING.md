# Bulletproof Body App — Planning HQ

> **Last Updated:** 2026-03-07
> **Status:** Planning Mode — UX/Design First
> **Live MVP:** https://app-chi-five-61.vercel.app

---

## The Team

### 1. Joel (The End User)
**Role:** The person we're building for. Every decision runs through him.

**Who he is:** Career-driven man, 30-38, used to be in shape, sits at a desk all day, orders DoorDash most nights. Kids under 10. $100K+ income. Overthinks everything. Watches Huberman. Has tried keto, IF, calorie counting, personal trainers — all failed. Feels guilty about food but too depleted to meal prep.

**Where he is RIGHT NOW (Level 1):**
- "I've tried everything. Nothing works."
- "I know what to do, I just can't do it."
- "I don't have time to meal prep."
- "I keep ordering the same stuff on DoorDash."
- He does NOT want another diet. He wants someone to show him what he's doing wrong.

**What he needs from this tool (his first quick win):**
- To SEE where the fat is hiding in food he already orders
- To feel smart, not guilty — "Oh, THAT'S the problem?"
- A swap he can make TONIGHT — not a 12-week plan
- Proof it works (math, not motivation)
- To feel like someone finally gets his life

**His emotional state when he lands on this page:**
- Skeptical ("What if this doesn't work either?")
- Depleted ("I have nothing left after work")
- Curious but guarded ("Show me, don't tell me")
- Wants it to be easy ("Please don't make me count macros")

**Joel Test:** Before ANY design decision, ask: "Would Joel, exhausted after a 10-hour day, with his kids screaming in the background, scrolling his phone on the couch — would he keep going?"

### 2. Maya (Product Manager)
**Role:** Keeps us focused. Cuts scope. Pushes back on complexity. Her mantra: "What's the simplest version that delivers the win?"

**Maya's rules:**
- Every screen must earn the next screen. If Joel can leave satisfied, you've gone too far too fast.
- No feature ships without answering: "Does Joel need this to get his first win?"
- If Eamon says "what if we also..." Maya says "Park it. Is it in the critical path?"
- The flow should feel like a conversation, not a form.
- 3 taps to first value. 90 seconds to "holy shit" moment.
- Mobile-first means ONLY mobile. Desktop is a bonus, not a requirement.

**Maya pushes back when:**
- We're adding screens before perfecting existing ones
- We're building backend before nailing the UX
- We're optimizing for edge cases instead of the happy path
- We're making Joel think instead of making Joel feel

### 3. Kai (UX Designer)
**Role:** Obsessed with how it FEELS. Believes the best design is invisible. Joel should never notice the design — he should just keep going.

**Kai's principles:**
- White space is a feature, not wasted space
- Animation serves emotion (the counter going up = dopamine), never decoration
- One action per screen. One decision per moment.
- The "holy shit" moment is the product. Everything else is a delivery vehicle.
- Typography does 80% of the work. Big numbers. Short sentences. No paragraphs.
- Color = meaning. Green = good/saved. Red = bad/current. That's it.
- If Joel has to read instructions, the design failed.

**Kai's design language:**
- Apple Health meets Typeform meets a really good calculator
- Feels premium, not "fitness bro"
- No stock photos. Emojis > images for MVP (faster, more fun, universal)
- Rounded corners, subtle shadows, buttery transitions

### 4. Nick (Lead Magnet Strategist — channeling Nick Komodina's framework)
**Role:** Knows where Joel is in the funnel. Knows what a lead magnet's JOB is. The lead magnet isn't the product — it's the first taste.

**Nick's framework for this tool:**
- This is Stage 3 (Resource) in the organic funnel
- The resource must solve a MICRO problem completely — not tease the full solution
- Joel should walk away thinking: "If the free tool is this good, what's the paid version like?"
- The email capture is EARNED, not demanded. He gives it because he wants MORE, not because we gate value.
- The CTA at the end is soft. "Want help building your full plan?" Not "BUY NOW."

**Nick's rules for lead magnets:**
- Ungated first, gated second. Give value BEFORE asking for anything.
- The resource should make Joel feel SMART, not sold to.
- It should create a "gap" — he sees what's possible but knows he needs help to get there.
- It should be shareable. Joel should want to send it to his buddy who also orders DoorDash.

### 5. Lex (Copywriter / Brand Voice)
**Role:** Writes the words Joel sees. Every headline, button, micro-copy line. Knows that copy IS the product in a lead magnet — the design delivers it, but the words do the selling.

**Lex's principles:**
- Write at Joel's Level 1. His words, not coach words.
- Headlines promise OUTCOMES, not processes. "Lose 10 lbs" not "Understand nutrition."
- Every line answers: "What's in it for Joel RIGHT NOW?"
- Short. Punchy. Conversational. Like a smart friend texting you.
- No fitness jargon. No "macros." No "caloric deficit." Joel says "lose weight" and "eat better."
- The name of the tool IS the first piece of copy. It should make Joel click before he even knows what it is.
- Copy creates curiosity gaps: "There's 400 calories hiding in your DoorDash order" — he HAS to find out where.

**Lex's voice (from ONE/ONE/ONE):**
- "Same DoorDash. Different order. Different body."
- "We plan for your worst day, not your best."
- "You don't have to become a meal prep person."
- Simple. Repetitive. Direct. The "too easy" voice is the saboteur.

### 6. Remy (Game Designer / Dopamine Architect)
**Role:** Makes the tool feel like a game, not a form. Every interaction should trigger a micro-reward. Joel should feel SMARTER and more POWERFUL with every tap.

**Remy's principles:**
- Every tap = visible feedback. Something moves, changes color, counts up.
- Progress must be FELT, not just shown. The running counter isn't a number — it's a score.
- Gamification =/= points and badges. It's: action → immediate reward → desire for next action.
- The "holy shit" moment should hit like checking your bank account and seeing more than you expected.
- Loss aversion > gain framing. "You're LOSING 847 calories to bad orders" hits harder than "You could SAVE 847."
- Streaks and accumulation: each swap ADDS to the total. Joel should want to keep going to see the number grow.
- Sound/haptics (future): a subtle "cha-ching" or vibration when calories saved would be chef's kiss.

**Remy's dopamine map for this tool:**
1. **Tap a meal** → card animates, feels selected (micro-reward)
2. **See the swap** → red vs green, calorie difference appears with emphasis (revelation reward)
3. **Pick the swap** → counter JUMPS up with animation (accumulation reward)
4. **See projection** → big bold number, "18 lbs by June" (identity reward — he sees future Joel)
5. **Get report** → checkmark, "Sent!" (completion reward)

**Remy pushes back when:**
- An interaction has no visible feedback
- Joel has to wait without something happening on screen
- Numbers appear without animation or emphasis
- The experience feels like filling out a medical form

---

## Lead Magnet Name

### The Criteria (from the team)

**Joel:** Would I click this in an Instagram story at 9pm on the couch?
**Maya:** Is it clear what I'm getting in 3 words or less?
**Lex:** Does it promise an outcome in Joel's language?
**Nick:** Does it position the resource, not the coaching?
**Remy:** Does it sound fun/interactive, not like homework?

### Name Candidates

| # | Name | Headline | Why It Works | Why It Might Not |
|---|------|----------|-------------|-----------------|
| 1 | **The Swap Calculator** | "Find out how much fat is hiding in your takeout" | Clear mechanism. Interactive. Not a PDF. | "Calculator" might feel clinical |
| 2 | **The Takeout Swap** | "Lose your next 10 lbs without giving up DoorDash" | Outcome + permission. Joel's dream. | Slightly generic |
| 3 | **The Fat Finder** | "There's 400+ hidden calories in your DoorDash order tonight" | Curiosity gap. Specific. Urgent ("tonight"). | Could feel negative/shamey |
| 4 | **The DoorDash Diet** | "Same orders. Fewer calories. Zero meal prep." | Catchy. Memorable. Paradox. | "Diet" is a trigger word for Joel (failed diets) |
| 5 | **The Swap Tool** | "Pick what you order. See what to swap. Lose the weight." | Dead simple. 3 steps. | Might be too plain |
| 6 | **The Takeout Cheat Code** | "The DoorDash hack that burns fat while you eat" | Speaks to the engineer/gamer brain. Fun. | "Hack" and "cheat code" might feel gimmicky |
| 7 | **What's It Costing You?** | "Your DoorDash order is costing you more than money" | Emotional. Curiosity. Loss aversion. | Name is a question, not a noun — harder to reference |

### Recommendation (Lex + Nick)

**"The Swap Calculator"** as the tool name.
**"Find out how much fat is hiding in your takeout order"** as the headline.

Why:
- "Calculator" = interactive, data-driven, NOT a PDF. Joel is analytical. He wants a tool.
- "Fat hiding in your takeout" = direct callback to ONE/ONE/ONE: "I show you where the fat is hiding"
- It's a NOUN Joel can refer to: "Have you tried the swap calculator?"
- It works in every context: story CTA, DM, bio link, reel hook

**Usage examples:**
- Story: "I built a free swap calculator. Pick your DoorDash order, see exactly where the fat is hiding. Link in bio."
- DM: "Hey — I just built this free tool. You pick what you normally order and it shows you exactly where the hidden calories are. Want the link?"
- Reel hook: "There's 400 calories hiding in your Chipotle order. I built a tool that finds them."
- Bio: "Free Swap Calculator below"

### Eamon's Direction (2026-03-07)

**Title working draft:** "The Takeout Fat Loss Cheat Code"
**Headline:** "Lose Your Next 10 Pounds Without Giving Up Takeout"

**Lex's notes on the title:**
- "Cheat Code" is strong — speaks to Joel's engineer/gamer brain
- "Takeout Fat Loss" = mechanism + outcome in 3 words
- Headline is the promise: outcome (10 lbs) + permission (keep takeout)
- For link-in-bio: "Free Cheat Code" or "The Takeout Cheat Code" (shorter)
- For DMs: "I built a free cheat code that shows you how to lose 10 lbs just by changing what you order on DoorDash"

**Short versions for different contexts:**
- Bio: "Free Takeout Cheat Code below"
- Story CTA: "The Takeout Cheat Code — link in bio"
- Reel hook: "I built a cheat code for losing fat on DoorDash"
- DM: "Want the takeout cheat code? It takes 60 seconds."

---

## Design Direction

**Aesthetic:** Dark, clean, premium. Apple meets Cluely meets Strapi Launchpad.
- Dark background (#000 or near-black)
- Bold white typography (large, confident)
- Minimal color — green for "good/saved", subtle accents
- High contrast. No clutter. Lots of breathing room.
- Feels like an app, not a website. Not "fitness bro."

**Reference sites:** Rollout, Cluely, Strapi Launchpad (screenshots saved 2026-03-07)

---

## Joel's Journey v2 (Tinder-Style Swipe Flow)

### The New Flow (Eamon's vision, 2026-03-07)

**Step 0: Landing**
- Dark screen. Bold headline: "Lose Your Next 10 Pounds Without Giving Up Takeout"
- Subtitle: "Swipe through your favorites. We'll show you where the fat is hiding."
- One button: "Start" or "Show Me"

**Step 1: "What do you order?" (Tinder Swipe — 5 seconds)**
- Cards fly in one at a time. Each card = a takeout category/restaurant
  - Chipotle, Thai, Pizza, Indian, Burgers, Sushi, Chinese, Poke, Chick-fil-A, etc.
- Swipe RIGHT = "I order this" / Swipe LEFT = "Nah"
- ~10-15 options. Fast. Fun. Zero thinking.
- Remy: Each swipe = micro-reward. Card flies off screen with satisfying physics.
- Counter at top: "4 of 12" or similar progress

**Step 2: "What exactly do you get?" (Drill Down)**
- For EACH right-swiped category, show 3-4 specific menu items
  - e.g., Chipotle: Burrito Bowl / Burrito / Tacos / Quesadilla
- User taps their usual order
- Shows: calories, protein, fat for that item
- Emotional state: "Oh... that's a lot" or "That's not bad actually"

**Step 3: "Here's your swap" (The Reveal)**
- Automatically shows 2-3 healthier alternatives from the SAME restaurant
- Side-by-side comparison: current vs swap
- User picks the swap that sounds best
- BOOM: animated counter shows calories saved, protein gained
- "You just saved 560 calories — that's 1.1 lbs of fat per week from ONE meal"

**Step 4: "Keep going?" (Loop)**
- "You swiped right on 4 restaurants. Let's do the next one."
- Repeat Step 2-3 for each right-swiped category
- Running total keeps growing: "Total saved: 1,247 calories/day"

**Step 5: "Your projection" (The Money Screen)**
- Quick personalization (age, weight, height, goal — 15 sec)
- Animated chart: "At this rate, you'll hit [goal] by [date]"
- "All from ordering differently. No gym. No meal prep."

**Step 6: "Want your full plan?" (Capture + Trust)**
- Email capture → personalized report
- Trust bridge → soft CTA

### Team Notes on v2

**Remy:** The swipe mechanic is genius. Tinder is the most gamified app ever built. Every swipe = dopamine. The "keep going" loop creates accumulation addiction — Joel wants to see the number get bigger.

**Maya (pushback):** Love the swipe but watch the math. 10 right-swipes x 4 menu items each = 40 decisions before Joel sees his first swap. That might be too many steps to first value. COUNTER-PROPOSAL: Maybe swipe 3-5 restaurants max, then immediately start showing swaps. Don't make him swipe ALL before the payoff.

**Kai:** Dark theme + swipe cards = premium feel. The card physics matter — needs to feel like Tinder, not like a cheap quiz. Framer Motion can do this.

**Lex:** "What do you order?" is the perfect question. Not "what do you eat" (judgmental) or "pick your meals" (formal). It's casual. It's HIS language.

**Nick:** The loop is key. Each restaurant = another "round" of the game. He's playing, not filling out a form. By the time he hits the projection, he's invested. The email capture is a no-brainer at that point.

---

## PREVIOUS: Joel's Journey v1 (Tap Flow — original MVP)

### The Story Arc

Joel sees a reel: "There's 400 calories hiding in your DoorDash order tonight."
He clicks the link in bio.
He lands on the tool.

**Act 1: "Oh, I order that" (Recognition)**
- He sees meals he literally ordered this week
- He taps 2-3. Zero friction. Just tapping.
- Emotional state: Curious, engaged, low commitment

**Act 2: "Wait, THAT much?" (Revelation)**
- He sees his meals side-by-side with swaps
- Same restaurant. Same convenience. Wildly different calories.
- The running counter ticks up: "You just saved 847 calories"
- Emotional state: Surprised, energized, "no way"

**Act 3: "What does that mean for ME?" (Personalization)**
- Quick body stats (15 seconds)
- His specific projection appears
- "At this rate, you'd lose 18 lbs by June — just by ordering differently"
- Emotional state: Holy shit. This is real. This is about MY body.

**Act 4: "I want more" (Capture)**
- "Want your full swap guide? Where should we send it?"
- He WANTS to give his email because he wants the report
- Emotional state: Bought in. Trusting. Wants the next step.

**Act 5: "These people get me" (Trust)**
- Brief mission statement while "generating"
- Soft CTA: "Want to build your full plan?"
- Emotional state: "This isn't a scam. This is someone who understands my life."

---

## The Ledger

### DONE (Shipped)
| # | Item | Date | Notes |
|---|------|------|-------|
| 1 | Project setup (Next.js + Tailwind + Framer Motion) | 2026-03-06 | |
| 2 | Food database schema + SQLite | 2026-03-06 | |
| 3 | 10 food swap pairs seeded | 2026-03-06 | |
| 4 | Screen 0: Pick your meals | 2026-03-06 | |
| 5 | Screen 1: See your swaps + running counter | 2026-03-06 | |
| 6 | Screen 2: Expanded library | 2026-03-06 | |
| 7 | Screen 3: Personalize (RMR calc) | 2026-03-06 | |
| 8 | Screen 4: Projection chart | 2026-03-06 | |
| 9 | Screen 5: Email capture + trust bridge | 2026-03-06 | |
| 10 | Deploy to Vercel | 2026-03-06 | |
| 11 | Session tracking + funnel events API | 2026-03-06 | |
| 12 | MCP server (bulletproof-body) | 2026-03-06 | |

### NOW (Current Sprint — UX/Design Polish)
| # | Item | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 13 | UX audit of current flow against Joel's journey | Kai | TODO | Walk through as Joel. What's friction? What's confusing? |
| 14 | Visual design system (colors, type, spacing) | Kai | TODO | Define the design tokens |
| 15 | Mobile UX polish (tap targets, scroll behavior, keyboard handling) | Kai | TODO | Test on actual phone |
| 16 | Meal card redesign (more appetizing, clearer hierarchy) | Kai | TODO | |
| 17 | Running counter polish (animation, positioning) | Kai | TODO | The dopamine hit |
| 18 | Projection chart redesign (cleaner, more impactful) | Kai | TODO | The "holy shit" screen |

### NEXT (After Design is Solid)
| # | Item | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 19 | Custom domain (swap.bulletproofbody.com) | Eamon | TODO | |
| 20 | Email integration (Resend API — send actual reports) | Dev | TODO | |
| 21 | GHL webhook (create contact on email capture) | Dev | TODO | |
| 22 | Expand food database (20 more swap pairs) | Content | TODO | Chain-specific: Cava, Sweetgreen, etc. |
| 23 | Book a Call CTA → real calendar link | Eamon | TODO | |

### DONE (Ingredient-Level Database — 2026-03-07)
| # | Item | Date | Notes |
|---|------|------|-------|
| 13 | Ingredient-level DB schema (restaurants, ingredients, menu_categories, template_meals) | 2026-03-07 | 5 new tables with indexes |
| 14 | Universal nutrition validator (range checks, macro math, cal-from-fat, meal totals) | 2026-03-07 | `scripts/nutrition_validator.py` — reusable for ALL restaurants |
| 15 | Generic restaurant ingestion framework | 2026-03-07 | `scripts/ingest_restaurant.py` — JSON in, validated SQLite out |
| 16 | Chipotle full ingredient data (29 ingredients, 9 categories) | 2026-03-07 | Source: official Chipotle PDF March 2025, cross-checked against Nutritionix/FatSecret/CalorieKing |
| 17 | 5 original + 4 swap template meals for Chipotle | 2026-03-07 | Chicken Burrito (1085 cal) → Lean Bowl (585 cal) = 500 cal saved |
| 18 | JSON source files for auditability | 2026-03-07 | `data/chipotle.json` — every number traceable to PDF |

### PARKED (Good ideas, not now)
| # | Item | Source | Notes |
|---|------|--------|-------|
| P1 | SMS notification (Twilio) | Morning download | Nice but not critical path |
| P2 | Funnel analytics dashboard | Spec | Need volume first |
| P3 | Additional skins (restaurant, sweets, snacks) | Spec | Same architecture, different data |
| P4 | ~~Menu PDF ingestion / OCR~~ | ~~Spec~~ | DONE — generic pipeline built |
| P5 | Testimonial videos on trust bridge | Spec | Need video assets first |
| P6 | A/B testing framework | Spec | Need traffic first |
| P7 | Referral tracking | Spec | |

### IDEA CAPTURE (Random ideas as they come)
| Date | Idea | From | Disposition |
|------|------|------|-------------|
| | | | |

---

## Design Decisions Log

Track WHY we made choices, not just what.

| Date | Decision | Rationale | Decided By |
|------|----------|-----------|------------|
| 2026-03-06 | Emojis instead of food photos | Faster to load, universal, fun. Photos can come later. | Kai |
| 2026-03-06 | Ungated — full value before email | Nick's framework: earn the capture. Joel is skeptical. | Nick |
| 2026-03-06 | Sedentary assumption for TDEE | Worst-case planning. "We assume you don't work out. If you do — bonus." | Maya |
| 2026-03-06 | 6 tutorial meals, then expanded library | Don't overwhelm. Tutorial = teach the mechanic. Library = let him explore. | Maya |

---

## Open Questions

| # | Question | Who Should Answer | Status |
|---|----------|-------------------|--------|
| 1 | What's the "holy shit" moment? Is it the running counter or the projection? | Joel (test) | OPEN |
| 2 | Should the personalization step be optional? Some Joels won't want to enter weight. | Maya + Kai | OPEN |
| 3 | What happens after email capture — what's actually in the "report"? | Nick + Maya | OPEN |
| 4 | Is the current 6-screen flow too many steps? Can we compress? | Kai | OPEN |
| 5 | What's the right CTA? Calendar link? DM? Reply to email? | Nick | OPEN |

---

## How We Work

**Eamon shares ideas freely.** The team catches, sorts, and prioritizes.

**Process:**
1. Eamon has an idea → it goes to IDEA CAPTURE
2. Maya evaluates: critical path or park?
3. If critical path → Kai designs, then we build
4. If park → it waits in PARKED with a note

**Guardrails (since this is Eamon's first app):**
- Design before code. Always.
- Ship ugly, then polish. But design the FLOW first.
- One screen at a time. Perfect it. Then move on.
- Test on your actual phone. Desktop doesn't matter.
- Every change = commit + deploy. Small iterations.
- When in doubt, ask: "What would Joel do here?"
