"use client";

const calendlyUrl = "https://calendly.com/eamon-barkhordarian/connect-time-clone";
const videoEmbedUrl = "https://www.youtube.com/embed/duikvHRIEWw?rel=0&vq=hd1080&hd=1";

export default function VslPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-8">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>

        <section className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-6 sm:p-10">
          <h1 className="text-4xl font-extrabold tracking-tight leading-[1.05] sm:text-6xl">
            You found{" "}
            <span className="text-emerald-400">hidden calories</span>{" "}
            in one order.
            <br />
            Imagine every meal.
          </h1>

          <p className="mt-5 max-w-3xl text-base leading-relaxed text-zinc-300 sm:text-lg">
            You saw how swapping one thing saves hundreds of calories without changing what you
            eat. This video shows how it works across everything — takeout, groceries, snacks —
            and what it looks like when someone builds it all for you.
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
          <h2 className="mt-1 text-2xl font-bold text-white">Want someone to do this for you?</h2>
          <p className="mt-2 max-w-3xl text-sm text-zinc-200">
            On a quick call, we&apos;ll look at what you actually eat and show you where the biggest
            calorie savings are hiding — across every restaurant, every snack, every grocery run.
          </p>

          <a
            href={calendlyUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-emerald-300 sm:w-auto"
          >
            Book a free call
          </a>
          <p className="mt-3 text-xs text-zinc-400">
            15 minutes. No meal plans. No judgment.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
            What happens on the call
          </h3>
          <div className="mt-3 grid gap-3 text-sm text-zinc-300 sm:grid-cols-3">
            <p className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
              We look at what you already eat — restaurants, snacks, groceries.
            </p>
            <p className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
              We show you where the biggest calorie savings are hiding.
            </p>
            <p className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
              You decide which swaps you actually want to make.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
