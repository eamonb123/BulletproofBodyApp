"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const bookingUrl = "https://calendly.com/eamon-barkhordarian/connect-time-clone";

const stats = [
  { value: "19 lbs", label: "avg fat lost in 12 weeks" },
  { value: "3x/wk", label: "clients still eat out" },
  { value: "0", label: "foods you give up" },
];

const transformations = [
  "transform-8", "transform-11", "transform-14",
  "transform-16", "transform-18", "transform-19",
  "transform-20", "transform-21", "transform-22",
  "transform-23", "transform-24", "transform-25",
  "transform-26", "transform-27", "transform-28", "transform-29",
];

const textTestimonials = [
  "travel-no-gain",
  "10-beers",
  "tux-too-loose",
  "down-10-lbs",
  "broke-280s",
  "energy-king",
];

// Styled quote cards — real results, ICP-relevant framing
const quoteCards = [
  {
    quote: "After 3 weeks of traveling and eating out every night, having pastries in Paris... I somehow managed to not gain a single pound.",
    name: "Suleiman J.",
    title: "Management Consultant",
    highlight: "not gain a single pound",
  },
  {
    quote: "Hit 219 today — down 10 pounds since we started. You explained it in such a simple way that made everything click.",
    name: "Ryan S.",
    title: "Software Engineer",
    highlight: "everything click",
  },
  {
    quote: "Somehow managed to still lose 2.3 lbs this week even though I went out partying and drank 10 beers. This system is unreal.",
    name: "Blake M.",
    title: "VP of Sales",
    highlight: "lose 2.3 lbs this week",
  },
  {
    quote: "I got fitted for this tux last week and today the wedding is next week. Should I get refitted? Does it look loose? HELP.",
    name: "Suleiman J.",
    title: "Management Consultant",
    highlight: "Does it look loose?",
  },
  {
    quote: "Haven't been in the 130s since the beginning of med school, which is 7 years ago. Feel like a completely different person.",
    name: "Priya K.",
    title: "Resident Physician",
    highlight: "7 years ago",
  },
  {
    quote: "Feel a lot more energy, waking up like a king at 4:50 AM. My friend said I'm in the best shape she's seen me in.",
    name: "Marcus D.",
    title: "Startup Founder",
    highlight: "best shape she\u2019s seen me in",
  },
];

// Split transformations into chunks of 9
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

const CTA_LABELS = [
  "Book a call",
  "Book a call",
  "Book a call",
  "Book a call",
];

function CtaButton({ index }: { index: number }) {
  const label = CTA_LABELS[Math.min(index, CTA_LABELS.length - 1)];
  const isFinal = index === CTA_LABELS.length - 1;
  return (
    <div className="flex justify-center py-8">
      <motion.a
        href={bookingUrl}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className={`group relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-2xl font-bold text-black ${
          isFinal
            ? "w-full max-w-sm px-10 py-5 text-lg bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.4)]"
            : "w-full max-w-xs px-8 py-4 text-base bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
        }`}
      >
        {/* Shimmer gloss on hover */}
        <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
        <span className="relative">{label}</span>
        <motion.span
          className="relative text-lg"
          animate={{ x: [0, 4, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
        >
          &rarr;
        </motion.span>
      </motion.a>
    </div>
  );
}

export default function ConciergeSimplePage() {
  const transformChunks = chunk(transformations, 9);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero — face + one-liner */}
      <div className="flex flex-col items-center justify-center px-4 pt-16 pb-8 text-center">
        {/* Photo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <Image
            src="/eamon-founder.jpeg"
            alt="Eamon Barkhordarian"
            width={120}
            height={120}
            className="rounded-full border-2 border-emerald-500/40 object-cover"
            style={{ width: 120, height: 120, objectPosition: "center 35%" }}
          />
        </motion.div>

        {/* Name + title */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-zinc-500 uppercase tracking-[0.2em] mb-2"
        >
          Eamon Barkhordarian
        </motion.p>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl sm:text-3xl font-extrabold leading-snug max-w-md mb-3"
        >
          I&apos;ll build this for{" "}
          <span className="text-emerald-400">everything you eat.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-base text-zinc-400 max-w-sm mb-8"
        >
          15-minute call. I&apos;ll show you exactly where the hidden calories
          are and what your personalized food ecosystem looks like.
        </motion.p>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex gap-6 sm:gap-10 mb-6"
        >
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold text-emerald-400 tabular-nums">{s.value}</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-[80px]">{s.label}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* CTA 1: curiosity — "See what's hiding in your food" */}
      <CtaButton index={0} />

      {/* Transformation grid — 3 per row, chunked with CTA after every 9 */}
      <div className="px-4 max-w-2xl mx-auto">
        <p className="text-xs text-zinc-500 uppercase tracking-[0.25em] text-center mb-4">Real clients. Real results.</p>
        {transformChunks.map((group, gi) => (
          <div key={gi}>
            <div className="grid grid-cols-3 gap-2">
              {group.map((name) => (
                <div key={name} className="rounded-xl overflow-hidden border border-zinc-800 aspect-square relative">
                  <Image
                    src={`/transformations/${name}.jpg`}
                    alt="Client transformation"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 33vw, 220px"
                    unoptimized
                  />
                </div>
              ))}
            </div>
            {/* CTA 2 after first chunk, CTA 3 after second */}
            <CtaButton index={gi + 1} />
          </div>
        ))}
      </div>

      {/* ── FOUNDER SECTION ─────────────────────────── */}
      <section className="border-t border-zinc-800/60">
        <div className="mx-auto max-w-2xl px-5 py-16 sm:py-20">
          <div className="flex flex-col items-center text-center sm:text-left sm:flex-row sm:items-start gap-8">
            <div className="relative flex-shrink-0 overflow-hidden rounded-2xl border border-zinc-700/60 bg-zinc-900/40 w-48 sm:w-56">
              <Image
                src="/eamon-before-after.png"
                alt="Eamon Barkhordarian transformation"
                width={224}
                height={300}
                className="w-full object-cover object-top"
                unoptimized
              />
              <div className="absolute inset-x-2 bottom-2 rounded-lg border border-emerald-500/20 bg-zinc-950/70 px-3 py-2 backdrop-blur-md">
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
                  CEO @ Bulletproof Body
                </p>
                <p className="text-sm font-extrabold text-white">Eamon Barkhordarian</p>
                <p className="text-[10px] text-zinc-400">Engineer &amp; Nutrition Strategist</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400">The Founder</p>
              <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold">
                Built by someone who <span className="text-emerald-400">lived it.</span>
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                Eamon isn&apos;t a fitness influencer. He&apos;s an{" "}
                <span className="text-white font-semibold">entrepreneur and ex-engineer</span> who
                watched the weight creep on while ordering DoorDash every night.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                He figured out the math,{" "}
                <span className="text-white font-semibold">lost the weight without giving up the food he loved</span>,
                and built the system so you don&apos;t have to figure it out yourself.
              </p>
              <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <p className="text-sm italic text-zinc-300">
                  &ldquo;I was the guy eating <span className="text-emerald-400 font-semibold">4,000 calories a day</span> without
                  realizing it. I built Bulletproof Body because{" "}
                  <span className="text-white font-semibold">I needed it first.</span>&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CtaButton index={2} />

      {/* ── STYLED TESTIMONIAL CARDS ─────────────────── */}
      <section className="border-t border-zinc-800/60">
        <div className="mx-auto max-w-2xl px-5 py-16 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400 text-center">Social Proof</p>
          <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold text-center">
            Real people. <span className="text-emerald-400">Real words.</span>
          </h2>
          <p className="mt-2 text-sm text-zinc-500 text-center">
            We don&apos;t ask for reviews — we deliver results that compel them.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {quoteCards.map((card) => (
              <div
                key={card.name + card.highlight}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5"
              >
                <p className="text-2xl text-emerald-500/30 font-serif leading-none">&ldquo;</p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                  {card.quote.split(card.highlight).map((part, i, arr) => (
                    <span key={i}>
                      {part}
                      {i < arr.length - 1 && (
                        <span className="text-white font-semibold">{card.highlight}</span>
                      )}
                    </span>
                  ))}
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
                    {card.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{card.name}</p>
                    <p className="text-xs text-emerald-400 uppercase tracking-wider">{card.title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <CtaButton index={3} />

      {/* Screenshot testimonials — 3 per row */}
      <div className="px-4 max-w-2xl mx-auto mb-10">
        <p className="text-xs text-zinc-500 uppercase tracking-[0.25em] text-center mb-4">Straight from the DMs</p>
        <div className="grid grid-cols-3 gap-2">
          {textTestimonials.map((name) => (
            <div key={name} className="rounded-xl overflow-hidden border border-zinc-800 aspect-[3/4] relative">
              <Image
                src={`/testimonials/${name}.jpg`}
                alt="Client testimonial"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 33vw, 220px"
                unoptimized
              />
            </div>
          ))}
        </div>
        <CtaButton index={3} />
      </div>

      {/* Footer escape */}
      <div className="text-center pb-12">
        <a
          href="/concierge-full"
          className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          Want to learn more first?
        </a>
      </div>
    </div>
  );
}
