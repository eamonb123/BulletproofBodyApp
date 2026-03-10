"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";

// ─── Snack Brand Data ───────────────────────────────
interface SnackBrand {
  id: string;
  name: string;
  category: "chips" | "candy" | "cookies" | "icecream" | "baked" | "cereal" | "drinks";
}

const SNACK_BRANDS: SnackBrand[] = [
  // Chips & Salty Crunch
  { id: "doritos", name: "Doritos", category: "chips" },
  { id: "cheetos", name: "Cheetos", category: "chips" },
  { id: "lays", name: "Lay's", category: "chips" },
  { id: "pringles", name: "Pringles", category: "chips" },
  { id: "tostitos", name: "Tostitos", category: "chips" },
  { id: "goldfish", name: "Goldfish", category: "chips" },
  { id: "cheezit", name: "Cheez-It", category: "chips" },
  { id: "ruffles", name: "Ruffles", category: "chips" },
  { id: "takis", name: "Takis", category: "chips" },
  { id: "sunchips", name: "SunChips", category: "chips" },
  // Candy & Chocolate
  { id: "reeses", name: "Reese's", category: "candy" },
  { id: "snickers", name: "Snickers", category: "candy" },
  { id: "mms", name: "M&M's", category: "candy" },
  { id: "kitkat", name: "Kit Kat", category: "candy" },
  { id: "twix", name: "Twix", category: "candy" },
  { id: "hersheys", name: "Hershey's", category: "candy" },
  { id: "skittles", name: "Skittles", category: "candy" },
  { id: "sourpatchkids", name: "Sour Patch Kids", category: "candy" },
  // Cookies
  { id: "oreo", name: "Oreo", category: "cookies" },
  { id: "chipsahoy", name: "Chips Ahoy", category: "cookies" },
  { id: "nutterbutter", name: "Nutter Butter", category: "cookies" },
  { id: "girlscoutcookies", name: "Girl Scout Cookies", category: "cookies" },
  // Ice Cream
  { id: "benjerrys", name: "Ben & Jerry's", category: "icecream" },
  { id: "haagendazs", name: "Häagen-Dazs", category: "icecream" },
  { id: "talenti", name: "Talenti", category: "icecream" },
  { id: "drumstick", name: "Drumstick", category: "icecream" },
  // Baked / Snack Cakes
  { id: "poptarts", name: "Pop-Tarts", category: "baked" },
  { id: "littledebbie", name: "Little Debbie", category: "baked" },
  { id: "hostess", name: "Hostess", category: "baked" },
  { id: "entenmanns", name: "Entenmann's", category: "baked" },
  // Cereal
  { id: "frostedflakes", name: "Frosted Flakes", category: "cereal" },
  { id: "luckycharms", name: "Lucky Charms", category: "cereal" },
  { id: "cinnamontoastcrunch", name: "Cinnamon Toast Crunch", category: "cereal" },
  // Drinks
  { id: "cocacola", name: "Coca-Cola", category: "drinks" },
  { id: "gatorade", name: "Gatorade", category: "drinks" },
];

// Logo file extensions
const LOGO_EXTENSION: Record<string, string> = {
  doritos: "png",
  cheetos: "png",
  lays: "png",
  pringles: "png",
  tostitos: "png",
  goldfish: "png",
  cheezit: "png",
  ruffles: "png",
  takis: "png",
  sunchips: "png",
  reeses: "png",
  snickers: "png",
  mms: "png",
  kitkat: "png",
  twix: "png",
  hersheys: "png",
  skittles: "png",
  sourpatchkids: "png",
  oreo: "png",
  chipsahoy: "png",
  nutterbutter: "png",
  girlscoutcookies: "png",
  benjerrys: "png",
  haagendazs: "png",
  talenti: "png",
  drumstick: "png",
  poptarts: "png",
  littledebbie: "png",
  hostess: "png",
  entenmanns: "png",
  frostedflakes: "png",
  luckycharms: "png",
  cinnamontoastcrunch: "png",
  cocacola: "png",
  gatorade: "png",
};

function getInitials(name: string): string {
  return name
    .replace(/['']/g, "")
    .split(/[\s&-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// Brand colors for the initials fallback
const BRAND_COLORS: Record<string, { bg: string; text: string }> = {
  doritos: { bg: "#D52B1E", text: "#FFD700" },
  cheetos: { bg: "#F26522", text: "#FFFFFF" },
  lays: { bg: "#FFD700", text: "#D52B1E" },
  pringles: { bg: "#D52B1E", text: "#FFD700" },
  tostitos: { bg: "#E31837", text: "#FFD700" },
  goldfish: { bg: "#FF6B00", text: "#FFFFFF" },
  cheezit: { bg: "#E31837", text: "#FFD700" },
  ruffles: { bg: "#003DA5", text: "#FFFFFF" },
  takis: { bg: "#7B2D8B", text: "#00FF00" },
  sunchips: { bg: "#4CAF50", text: "#FFD700" },
  reeses: { bg: "#FF8C00", text: "#3D1F00" },
  snickers: { bg: "#3D1F00", text: "#FFFFFF" },
  mms: { bg: "#D52B1E", text: "#FFD700" },
  kitkat: { bg: "#D52B1E", text: "#FFFFFF" },
  twix: { bg: "#C5872D", text: "#3D1F00" },
  hersheys: { bg: "#3D1F00", text: "#C0C0C0" },
  skittles: { bg: "#D52B1E", text: "#00FF00" },
  sourpatchkids: { bg: "#00B200", text: "#FFD700" },
  oreo: { bg: "#003DA5", text: "#FFFFFF" },
  chipsahoy: { bg: "#003DA5", text: "#D52B1E" },
  nutterbutter: { bg: "#C5872D", text: "#FFFFFF" },
  girlscoutcookies: { bg: "#006B3F", text: "#FFFFFF" },
  benjerrys: { bg: "#0073CF", text: "#FFFFFF" },
  haagendazs: { bg: "#8B0000", text: "#C5872D" },
  talenti: { bg: "#1A1A1A", text: "#C5872D" },
  drumstick: { bg: "#3D1F00", text: "#FFD700" },
  poptarts: { bg: "#003DA5", text: "#FF6B00" },
  littledebbie: { bg: "#D52B1E", text: "#FFFFFF" },
  hostess: { bg: "#003DA5", text: "#FFFFFF" },
  entenmanns: { bg: "#003DA5", text: "#FFD700" },
  frostedflakes: { bg: "#FF6B00", text: "#003DA5" },
  luckycharms: { bg: "#6B3FA0", text: "#FFD700" },
  cinnamontoastcrunch: { bg: "#C5872D", text: "#FFFFFF" },
  cocacola: { bg: "#D52B1E", text: "#FFFFFF" },
  gatorade: { bg: "#FF6B00", text: "#000000" },
};

// Per-logo style overrides for grid cards.
// size = max-height/max-width %. Default 92%. yOffset = px shift up.
const SNACK_LOGO_OVERRIDES: Record<string, { size?: number; yOffset?: number }> = {
  // Wide logos — bump size so they fill width better
  snickers: { size: 98 },
  twix: { size: 98 },
  hersheys: { size: 98 },
  reeses: { size: 98 },
  skittles: { size: 98 },
  mms: { size: 98 },
  entenmanns: { size: 98 },
  kitkat: { size: 96 },
  hostess: { size: 96 },
  nutterbutter: { size: 96 },
  chipsahoy: { size: 96 },
  // Tall logos — bump size so they fill height better
  pringles: { size: 98 },
  gatorade: { size: 98 },
  cocacola: { size: 98 },
  sourpatchkids: { size: 96 },
  luckycharms: { size: 96 },
  cinnamontoastcrunch: { size: 96 },
};

function SnackLogo({ brand }: { brand: SnackBrand }) {
  const [imgError, setImgError] = useState(false);
  const ext = LOGO_EXTENSION[brand.id];
  const hasLogo = ext && !imgError;
  const colors = BRAND_COLORS[brand.id] ?? { bg: "#333", text: "#FFF" };

  if (hasLogo) {
    const overrides = SNACK_LOGO_OVERRIDES[brand.id];
    const maxSize = overrides?.size ?? 92;
    const yOffset = overrides?.yOffset ?? 0;
    const imgStyle: React.CSSProperties = {
      maxHeight: `${maxSize}%`,
      maxWidth: `${maxSize}%`,
      objectFit: "contain" as const,
    };
    if (yOffset) imgStyle.transform = `translateY(-${yOffset}px)`;

    return (
      <div className="flex h-full w-full items-center justify-center bg-white">
        <Image
          src={`/snack-logos/${brand.id}.${ext}`}
          alt={brand.name}
          width={200}
          height={200}
          className="h-auto w-auto"
          style={imgStyle}
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // Branded initials fallback
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-0.5 p-1.5"
      style={{ backgroundColor: colors.bg }}
    >
      <span
        className="text-lg font-black leading-none sm:text-xl"
        style={{ color: colors.text }}
      >
        {getInitials(brand.name)}
      </span>
      <span
        className="text-center text-[7px] font-bold leading-tight sm:text-[8px]"
        style={{ color: colors.text, opacity: 0.8 }}
      >
        {brand.name}
      </span>
    </div>
  );
}

// ─── Main Page Component ───────────────────────────
export default function SnackBibleLanding() {
  const router = useRouter();
  const [awake, setAwake] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return SNACK_BRANDS;
    return SNACK_BRANDS.filter(
      (b) => b.name.toLowerCase().includes(q) || b.category.toLowerCase().includes(q)
    );
  }, [search]);

  const row1 = SNACK_BRANDS.slice(0, Math.ceil(SNACK_BRANDS.length / 2));
  const row2 = SNACK_BRANDS.slice(Math.ceil(SNACK_BRANDS.length / 2));

  return (
    <div className="min-h-screen bg-black">
      <AnimatePresence mode="wait">
        {/* ── SLEEPING STATE: marquee + headline + CTA ── */}
        {!awake && (
          <div key="hero" className="relative flex min-h-[100dvh] flex-col items-center justify-center px-5">
            {/* Brand mark */}
            <div className="absolute top-0 left-0 z-20 px-5 pt-5">
              <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-zinc-500">Bulletproof Body</p>
            </div>

            {/* Headline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8 text-center"
            >
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                Lose your next 10 lbs
                <br />
                <span className="text-emerald-400">without giving up</span>
                {" "}
                <span className="text-white">your favorite snacks</span>
              </h1>
            </motion.div>

            {/* Scrolling logo marquee */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="mb-10 w-full max-w-3xl overflow-hidden"
            >
              <div className="marquee-row mb-3">
                <div className="marquee-track marquee-left">
                  {[...row1, ...row1].map((b, i) => (
                    <div key={`r1-${b.id}-${i}`} className="mx-1.5 h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-zinc-800 sm:h-20 sm:w-20">
                      <SnackLogo brand={b} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="marquee-row">
                <div className="marquee-track marquee-right">
                  {[...row2, ...row2].map((b, i) => (
                    <div key={`r2-${b.id}-${i}`} className="mx-1.5 h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-zinc-800 sm:h-20 sm:w-20">
                      <SnackLogo brand={b} />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* CTA */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setAwake(true)}
              className="rounded-2xl bg-emerald-500 px-10 py-4 text-base font-bold text-black transition-all hover:bg-emerald-400 sm:text-lg"
            >
              Show me how.
            </motion.button>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-4 text-sm text-zinc-500"
            >
              See the swap. Same taste, no prep. Takes 60 seconds.
            </motion.p>

            <style jsx>{`
              .marquee-row {
                width: 100%;
                overflow: hidden;
                -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
                mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
              }
              .marquee-track {
                display: flex;
                width: max-content;
              }
              .marquee-left {
                animation: scroll-left 35s linear infinite;
              }
              .marquee-right {
                animation: scroll-right 35s linear infinite;
              }
              @keyframes scroll-left {
                0% { transform: translateX(0); }
                100% { transform: translateX(-50%); }
              }
              @keyframes scroll-right {
                0% { transform: translateX(-50%); }
                100% { transform: translateX(0); }
              }
            `}</style>

            {/* Footer tagline */}
            <p className="absolute bottom-6 left-0 right-0 text-center text-[11px] text-zinc-700">
              Built for busy professionals who snack on autopilot
            </p>
          </div>
        )}

        {/* ── AWAKE STATE: full grid of all snack brands ── */}
        {awake && (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex min-h-[100dvh] flex-col items-center px-4 py-10 sm:px-8"
          >
            {/* Brand mark */}
            <div className="mb-6">
              <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-zinc-500">Bulletproof Body</p>
            </div>

            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-6 text-center text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400"
            >
              Pick the snack you think you can&apos;t eat and still lose weight.
            </motion.p>

            {/* Search */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-6 w-full max-w-6xl"
            >
              <div className="relative">
                <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search snacks..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 py-3 pl-12 pr-10 text-base text-white placeholder-zinc-500 outline-none transition-colors focus:border-emerald-500/50"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </motion.div>

            {/* Grid */}
            <div className="grid w-full max-w-6xl grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
              {filtered.map((b, idx) => (
                <motion.button
                  key={b.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.01, duration: 0.3 }}
                  onClick={() => router.push(`/snack-bible-demo?snack=${b.id}`)}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-zinc-800 bg-white transition-all duration-200 hover:scale-105 hover:border-emerald-500/50 hover:shadow-[0_0_24px_rgba(16,185,129,0.12)]"
                >
                  <SnackLogo brand={b} />
                  {/* Name on hover */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1.5 pt-5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <p className="text-center text-[10px] font-semibold leading-tight text-white">{b.name}</p>
                  </div>
                </motion.button>
              ))}
            </div>

            {filtered.length === 0 && search && (
              <div className="py-16 text-center">
                <p className="text-zinc-500">No snacks match &ldquo;{search}&rdquo;</p>
              </div>
            )}

            {/* Back to hero */}
            <button
              onClick={() => setAwake(false)}
              className="mt-10 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              &larr; Back
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
