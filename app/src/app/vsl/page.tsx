import Link from "next/link";

const calendlyUrl = "https://calendly.com/eamon-barkhordarian/connect-time-clone";
const videoEmbedUrl = "https://www.youtube.com/embed/duikvHRIEWw";

export default function VslPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-8">
          <Link
            href="/experiments/dark-landing"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to swap tool
          </Link>
        </div>

        <section className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-6 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300/80">
            Post-Swap Stage
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight leading-[1.05] sm:text-6xl">
            You Just Saw The{" "}
            <span className="text-emerald-400">Calorie Math</span>
            <br />
            Now Build The Full System
          </h1>

          <p className="mt-5 max-w-3xl text-base leading-relaxed text-zinc-300 sm:text-lg">
            You already saw how one smarter order can save serious calories. This next step builds
            your full plan around what you actually eat across takeout, grocery, fast food, and
            restaurants, without forcing meal prep or giving up your favorites.
          </p>

          <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-[0_0_0_1px_rgba(16,185,129,0.1)]">
            <div className="aspect-video w-full">
              <iframe
                title="Bulletproof Body VSL"
                src={videoEmbedUrl}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
            Call With Eamon
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">Book a strategy call</h2>
          <p className="mt-2 max-w-3xl text-sm text-zinc-200">
            We&apos;ll map what you currently eat, build your exact swaps, and turn approved options
            into one-tap logged meals inside your fitness app.
          </p>

          <a
            href={calendlyUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-emerald-300 sm:w-auto"
          >
            Book Strategy Call
          </a>
          <p className="mt-3 text-xs text-zinc-400">
            30-minute clarity call. Built for busy professionals who want results without lifestyle
            restriction.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
            What Happens Next
          </h3>
          <div className="mt-3 grid gap-3 text-sm text-zinc-300 sm:grid-cols-3">
            <p className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
              Audit your current intake patterns from real photos and behavior.
            </p>
            <p className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
              Approve high-integrity swaps across takeout, grocery, fast food, and restaurants.
            </p>
            <p className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
              Sync approved options as custom logged meals in your fitness app.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
