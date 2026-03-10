"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const calendlyUrl = "https://calendly.com/eamon-barkhordarian/connect-time-clone";

// ─── FAQ Data (from ICP fears) ─────────────────────────
const faqSections = [
  {
    label: "Food & Lifestyle",
    items: [
      {
        q: "Do I have to give up my favorite foods?",
        a: "No. That's the whole point. We don't remove anything. We swap it for a smarter version that satisfies the same craving. If you love Chipotle, you're still eating Chipotle. If you love cereal before bed, cereal stays. We just find the version that costs you 300 fewer calories.",
      },
      {
        q: "I eat out a lot. Is that a problem?",
        a: "It's actually an advantage. Restaurants have predictable menus. Once we map your go-to spots, every order becomes a decision you've already made. Most of our clients eat out 4-5 times a week and still lose a pound of fat every week.",
      },
      {
        q: "Can I still drink?",
        a: "Yes. One of our clients went on a 10-day cruise to Italy, drank every day, and came back four pounds lighter. Alcohol has calories. We just build it into the math instead of pretending it doesn't exist.",
      },
    ],
  },
  {
    label: "The Program",
    items: [
      {
        q: "I've tried everything and nothing worked. Why is this different?",
        a: "Because everything you've tried asked you to change your life. We don't. We take the life you're already living. The restaurants, the snacks, the grocery runs. And we find where the calories are hiding. You've never had someone build around YOUR worst week, not your ideal one.",
      },
      {
        q: "My schedule is insane. How much time does this take?",
        a: "One of our clients works 12-hour days, 7 to 7. He still hits his goals every week. The nutrition piece doesn't require more time. It requires understanding. We do the research. You make the swaps.",
      },
      {
        q: "What if I quit again?",
        a: "Every plan you've tried was designed to make you quit. They demanded perfection. And when you missed one day, the guilt spiral wrote off the whole week. Our system is built for your worst days. Miss a workout? Drop your calories 300 and keep moving. No drama. No restart Monday.",
      },
    ],
  },
  {
    label: "Getting Started",
    items: [
      {
        q: "Is this worth the investment?",
        a: "You've already spent thousands on gym memberships you don't use, supplements that didn't work, and programs that gave you a PDF meal plan. This is the first time someone builds the entire system around your actual life. And you keep the knowledge forever.",
      },
      {
        q: "How do I get a spot?",
        a: "Book a free 15-minute food audit. We'll look at what you actually eat, show you where the biggest calorie savings are hiding, and you'll decide if you want us to build the full system. No pressure. Even if you don't hire us, you'll leave with answers.",
      },
    ],
  },
];

// ─── Proof metrics ─────────────────────────────────────
const metrics = [
  { value: "19 lbs", label: "avg fat lost in 12 weeks", icon: "scale" },
  { value: "3x/wk", label: "still eating out", icon: "food" },
  { value: "12-hr", label: "workdays, still hitting goals", icon: "clock" },
  { value: "1 day", label: "to get back on track after a holiday", icon: "refresh" },
];

// ─── Protocol steps ────────────────────────────────────
const steps = [
  {
    num: "01",
    title: "SEE IT",
    desc: "We look at everything you eat. Every restaurant, every snack, every grocery run. No judgment. Just data. We find exactly where the hidden calories are.",
  },
  {
    num: "02",
    title: "SWAP IT",
    desc: "Same food. Smarter version. We build side-by-side swaps that honor what you love. Same craving, fewer calories, more protein. You choose which ones you want.",
  },
  {
    num: "03",
    title: "LIVE IT",
    desc: "We build your personalized food ecosystem and keep it updated. New restaurant? We add it. New craving? We find a swap. The system evolves with your life.",
  },
];

// ─── Testimonials ──────────────────────────────────────
const testimonials = [
  {
    quote: "I went on a cruise. Ate as much as I wanted. Drank alcohol every day. Come back, down four pounds of body fat on a 10-day trip to Italy with all the pasta.",
    name: "Joel G.",
    title: "Business Owner",
    weeks: "Week 15",
  },
  {
    quote: "In the midst of extremely high stress, changing schedule, when everything just kind of went down. I hit all my calorie goals, hit my protein goals, got my workouts every day. It's become my safe haven.",
    name: "Joel G.",
    title: "Business Owner",
    weeks: "Week 18",
  },
  {
    quote: "I have too much information. There's no chance I'm going to be over 20% again, probably even 15.",
    name: "Joel G.",
    title: "Business Owner",
    weeks: "Week 41",
  },
];

// ─── FAQ Accordion Item ────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-zinc-800">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left text-[15px] font-medium text-white transition-colors hover:text-emerald-400"
      >
        {q}
        <svg
          className={`ml-4 h-5 w-5 shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="pb-5 text-sm leading-relaxed text-zinc-400"
        >
          {a}
        </motion.div>
      )}
    </div>
  );
}

// ─── CTA Button ────────────────────────────────────────
function CtaButton({ className = "" }: { className?: string }) {
  return (
    <a
      href={calendlyUrl}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center justify-center rounded-full bg-emerald-400 px-8 py-4 text-sm font-bold uppercase tracking-wider text-black transition-all hover:bg-emerald-300 hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] ${className}`}
    >
      Book Your Free Food Audit
    </a>
  );
}

// ─── Sticky Nav ────────────────────────────────────────
function StickyNav() {
  const links = [
    { id: "problem", label: "Problem" },
    { id: "protocol", label: "Protocol" },
    { id: "solution", label: "Solution" },
    { id: "proof", label: "Results" },
    { id: "founder", label: "Founder" },
    { id: "faq", label: "FAQ" },
  ];
  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <span className="text-sm font-bold tracking-wider text-white">
          BULLETPROOF<span className="text-emerald-400"> BODY</span>
        </span>
        <div className="hidden items-center gap-6 sm:flex">
          {links.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              className="text-xs font-medium uppercase tracking-wider text-zinc-400 transition-colors hover:text-white"
            >
              {l.label}
            </a>
          ))}
          <a
            href={calendlyUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-emerald-400 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-black transition-colors hover:bg-emerald-300"
          >
            Book Free Audit
          </a>
        </div>
      </div>
    </nav>
  );
}

// ─── Page ──────────────────────────────────────────────
export default function ConciergePage() {
  const [hasHistory, setHasHistory] = useState(false);
  useEffect(() => {
    // If there's a referrer from the same origin, user navigated here from another page
    if (document.referrer && new URL(document.referrer).origin === window.location.origin) {
      setHasHistory(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <StickyNav />

      {/* ── HERO ──────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-5xl px-5 pb-16 pt-20 sm:px-8 sm:pt-28">
          {hasHistory && (
            <button
              onClick={() => window.history.back()}
              className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          )}
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            You run your career with{" "}
            <span className="text-emerald-400">data.</span>
            <br />
            Why are you running your body on guesswork?
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400 sm:text-xl">
            There are 15+ lbs of fat hiding in the food you already eat.
            Not because you&apos;re eating too much. Because nobody showed you
            where the calories are hiding.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
            <CtaButton />
            <span className="text-sm text-zinc-500">
              15-minute food audit. Complimentary for qualified applicants.
            </span>
          </div>
        </div>
      </section>

      {/* ── PROBLEM ───────────────────────────────────── */}
      <section id="problem" className="border-t border-zinc-800/60">
        <div className="mx-auto max-w-5xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-400">
                The Problem
              </p>
              <h2 className="mt-4 text-3xl font-extrabold leading-tight sm:text-5xl">
                You&apos;re a high-performer{" "}
                <span className="text-red-400">running on autopilot.</span>
              </h2>
              <p className="mt-6 text-base leading-relaxed text-zinc-400">
                You manage teams. You close deals. You solve problems that would
                make most people&apos;s heads spin. But you can&apos;t figure out lunch
                without ordering DoorDash.
              </p>
              <p className="mt-4 text-base leading-relaxed text-zinc-400">
                You know more about nutrition than most people. And you&apos;re still here.
              </p>
            </div>
            <div className="space-y-4">
              {[
                "Ordering the same takeout you've always ordered. Not realizing it's 400 calories more than it needs to be.",
                "Forgetting to eat until 2 PM, then inhaling whatever's fastest.",
                "Hitting 9 PM, scrolling fitness videos, knowing more than the guy in the reel. And weighing 40 pounds more.",
                "Starting fresh every Monday. Again.",
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
                >
                  <span className="mt-0.5 text-red-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </span>
                  <p className="text-sm leading-relaxed text-zinc-300">{item}</p>
                </div>
              ))}
              <div className="mt-6 rounded-xl border border-zinc-700 bg-zinc-900/60 p-4">
                <p className="text-sm font-medium italic text-zinc-300">
                  &ldquo;I manage a team. I solve problems that would make most
                  people&apos;s heads spin. But I can&apos;t figure out how to eat
                  lunch without ordering DoorDash.&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROTOCOL ──────────────────────────────────── */}
      <section id="protocol" className="border-t border-zinc-800/60 bg-zinc-900/30">
        <div className="mx-auto max-w-5xl px-5 py-20 sm:px-8 sm:py-28">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400">
            The Protocol
          </p>
          <h2 className="mt-4 text-center text-3xl font-extrabold sm:text-5xl">
            From autopilot to{" "}
            <span className="text-emerald-400">control.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-zinc-400">
            We don&apos;t ask you to meal prep. We don&apos;t give you a PDF. We take
            what you already eat and make it work for you.
          </p>
          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            {steps.map((s) => (
              <div
                key={s.num}
                className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6"
              >
                <span className="text-4xl font-extrabold text-emerald-400/30">{s.num}</span>
                <h3 className="mt-3 text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <CtaButton />
          </div>
        </div>
      </section>

      {/* ── CTA REFRAME ───────────────────────────────── */}
      <section className="border-t border-zinc-800/60">
        <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8 sm:py-28">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
            <svg className="h-7 w-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold sm:text-5xl">
            This is not a diet consultation.
            <br />
            This is a{" "}
            <span className="text-emerald-400">food audit.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base text-zinc-400">
            We work with a small number of high-performing professionals. In 15 minutes,
            we&apos;ll look at what you actually eat and show you exactly where the biggest
            calorie savings are hiding.
          </p>
          <p className="mt-3 text-sm text-zinc-500">
            Even if you don&apos;t hire us, you&apos;ll leave with answers.
          </p>
          <div className="mt-8">
            <CtaButton />
          </div>
        </div>
      </section>

      {/* ── SOLUTION ──────────────────────────────────── */}
      <section id="solution" className="border-t border-zinc-800/60 bg-zinc-900/30">
        <div className="mx-auto max-w-5xl px-5 py-20 sm:px-8 sm:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400">
            The Solution
          </p>
          <h2 className="mt-4 text-3xl font-extrabold sm:text-5xl">
            Your personalized{" "}
            <span className="text-emerald-400">food ecosystem.</span>
          </h2>
          <p className="mt-4 max-w-2xl text-base text-zinc-400">
            Not a meal plan. Not a PDF. A living system built around everything you
            already eat. One that evolves with your life.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {[
              {
                title: "Every Restaurant",
                desc: "Your go-to spots, mapped and optimized. Chipotle, CAVA, the Thai place on the corner. We find the swap that saves 300+ calories at each one.",
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                ),
              },
              {
                title: "Every Snack",
                desc: "The protein bar that replaces the candy bar. The chips that cut calories in half. Same craving profile, fraction of the cost.",
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                ),
              },
              {
                title: "Every Grocery Run",
                desc: "What to buy, where to buy it, one click to order. We don't ask you to go to the store. We bring the store to your door.",
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                ),
              },
              {
                title: "Always Evolving",
                desc: "New restaurant? We add it. Traveling? We build a travel plan. Your life changes. The ecosystem adapts. You never start over.",
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                ),
              },
            ].map((item, i) => (
              <div
                key={i}
                className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10">
                  <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {item.icon}
                  </svg>
                </div>
                <h3 className="text-lg font-bold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROOF / METRICS ───────────────────────────── */}
      <section id="proof" className="border-t border-zinc-800/60">
        <div className="mx-auto max-w-5xl px-5 py-20 sm:px-8 sm:py-28">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400">
            Proven Results
          </p>
          <h2 className="mt-4 text-center text-3xl font-extrabold sm:text-5xl">
            Metrics that{" "}
            <span className="text-emerald-400">move.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-base text-zinc-400">
            Our clients don&apos;t just &ldquo;feel better.&rdquo; They see measurable
            changes while eating the food they love.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {metrics.map((m, i) => (
              <div
                key={i}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-center"
              >
                <p className="text-3xl font-extrabold text-emerald-400 sm:text-4xl">{m.value}</p>
                <p className="mt-2 text-xs leading-snug text-zinc-400">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────── */}
      <section className="border-t border-zinc-800/60 bg-zinc-900/30">
        <div className="mx-auto max-w-5xl px-5 py-20 sm:px-8 sm:py-28">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400">
            Real Results
          </p>
          <h2 className="mt-4 text-center text-3xl font-extrabold sm:text-5xl">
            From high-performers{" "}
            <span className="text-emerald-400">like you.</span>
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6"
              >
                <div className="mb-4 text-3xl text-emerald-400/40">&ldquo;</div>
                <p className="text-sm leading-relaxed text-zinc-300">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-5 border-t border-zinc-800 pt-4">
                  <p className="text-sm font-bold text-white">{t.name}</p>
                  <p className="text-xs text-emerald-400">{t.title}</p>
                  <p className="mt-1 text-[11px] text-zinc-500">{t.weeks}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <CtaButton />
          </div>
        </div>
      </section>

      {/* ── FOUNDER ───────────────────────────────────── */}
      <section id="founder" className="border-t border-zinc-800/60">
        <div className="mx-auto max-w-5xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-5 lg:gap-16">
            <div className="lg:col-span-2">
              <div className="relative overflow-hidden rounded-2xl border border-zinc-700/60 bg-zinc-900/40">
                <img
                  src="/eamon-before-after.png"
                  alt="Eamon Barkhordarian — before and after transformation"
                  className="w-full max-h-[500px] object-cover object-top"
                />
                {/* Frosted card overlay */}
                <div className="absolute inset-x-3 bottom-3 rounded-xl border border-emerald-500/20 bg-zinc-950/70 px-5 py-4 backdrop-blur-md">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-400">
                    CEO @ Bulletproof Body
                  </p>
                  <p className="mt-1 text-lg font-extrabold tracking-tight text-white">
                    Eamon Barkhordarian
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    Engineer &amp; Nutrition Strategist
                  </p>
                </div>
              </div>
            </div>
            <div className="lg:col-span-3">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400">
                The Founder
              </p>
              <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl">
                Built by someone who{" "}
                <span className="text-emerald-400">lived it.</span>
              </h2>
              <p className="mt-5 text-base leading-relaxed text-zinc-400">
                Eamon isn&apos;t a fitness influencer. He&apos;s an entrepreneur and
                ex-engineer who used to be athletic. Built a career, and watched the
                weight creep on while ordering DoorDash every night.
              </p>
              <p className="mt-4 text-base leading-relaxed text-zinc-400">
                He lived the exact life you&apos;re living. Desk all day, business on
                his mind, body on the back burner. He figured out the math, lost the
                weight without giving up the food he loved, and built the system so you
                don&apos;t have to figure it out yourself.
              </p>
              <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                <p className="text-sm font-medium italic text-zinc-300">
                  &ldquo;I was the guy eating 4,000 calories a day without realizing it.
                  I was the guy who knew more about nutrition than his trainer. And
                  weighed 40 pounds more. I built Bulletproof Body because I needed it
                  first.&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURED ON / AUTHORITY ─────────────────── */}
      <section className="border-t border-zinc-800/60">
        <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
          <p className="text-center text-sm font-semibold uppercase tracking-[0.25em] text-zinc-300">
            Featured On
          </p>
          <div className="mt-8 grid grid-cols-2 gap-0 overflow-hidden rounded-2xl border border-zinc-700 sm:grid-cols-4">
            {[
              { src: "/authority/tedx.webp", alt: "TEDx", cls: "h-10 sm:h-14" },
              { src: "/authority/tony-robbins-coaching.svg", alt: "Tony Robbins Coaching", cls: "h-14 brightness-0 invert sm:h-20" },
              { src: "/authority/mastermind-summit.webp", alt: "Mastermind World Summit", cls: "h-16 sm:h-24" },
              { src: "/authority/tonight-show.webp", alt: "The Tonight Show Starring Jimmy Fallon", cls: "h-14 sm:h-20" },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-center border-zinc-700 px-6 py-8 opacity-80 transition-all duration-300 hover:bg-zinc-800/50 hover:opacity-100 [&:not(:last-child)]:border-r max-sm:[&:nth-child(-n+2)]:border-b"
              >
                <img src={item.src} alt={item.alt} className={`w-auto object-contain ${item.cls}`} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────── */}
      <section id="faq" className="border-t border-zinc-800/60 bg-zinc-900/30">
        <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8 sm:py-28">
          <h2 className="text-center text-3xl font-extrabold sm:text-5xl">
            No gimmicks.{" "}
            <span className="text-emerald-400">Just answers.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-base text-zinc-400">
            Here&apos;s exactly how the program works, what we expect from you, and what
            you can expect from us.
          </p>
          <div className="mt-14 space-y-10">
            {faqSections.map((section) => (
              <div key={section.label}>
                <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400">
                  {section.label}
                </p>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-6">
                  {section.items.map((item, i) => (
                    <FaqItem key={i} q={item.q} a={item.a} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────── */}
      <section className="border-t border-zinc-800/60">
        <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8 sm:py-28">
          <h2 className="text-3xl font-extrabold sm:text-5xl">
            You&apos;ve already seen the math.
            <br />
            <span className="text-emerald-400">Let us build the system.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base text-zinc-400">
            In 15 minutes, we&apos;ll look at what you actually eat and show you where
            the biggest calorie savings are hiding. You&apos;ll leave with a clear
            picture. Whether you hire us or not.
          </p>
          <div className="mt-8">
            <CtaButton />
          </div>
          <p className="mt-4 text-sm text-zinc-500">
            15-minute food audit. No meal plans. No judgment.
          </p>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────── */}
      <footer className="border-t border-zinc-800/60 py-8 text-center text-xs text-zinc-600">
        Bulletproof Body. Built for busy professionals who eat out.
      </footer>
    </div>
  );
}
