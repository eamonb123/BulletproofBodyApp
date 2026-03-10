import Link from "next/link";

const modules = [
  {
    name: "Fast Food Bible",
    href: "/bible",
    description: "Pick your restaurant. See the swap. Lose the fat.",
  },
  {
    name: "Snack Bible",
    href: "/snack-bible",
    description: "Client tool — personalized snack swaps with weekly impact.",
  },
  {
    name: "Snack Bible Lead Magnet",
    href: "/snack-bible-landing",
    description: "Landing page — hero + brand grid + demo experience.",
  },
  {
    name: "Snack Bible Demo",
    href: "/snack-bible-demo",
    description: "Interactive demo — sample swaps, live stats, search + capture.",
  },
  {
    name: "Concierge",
    href: "/concierge",
    description: "Coaching sales page.",
  },
  {
    name: "VSL",
    href: "/vsl",
    description: "Video sales letter.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          BULLETPROOF BODY
        </h1>
        <p className="text-gray-400 mb-8">Directory</p>

        <div className="space-y-4">
          {modules.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="block p-4 rounded-lg border border-gray-800 hover:border-emerald-500/50 hover:bg-gray-900/50 transition-all"
            >
              <div className="font-semibold text-lg">{m.name}</div>
              <div className="text-sm text-gray-400 mt-1">
                {m.description}
              </div>
              <div className="text-xs text-gray-600 mt-1 font-mono">
                {m.href}
              </div>
            </Link>
          ))}
        </div>

        <p className="text-gray-600 text-xs mt-8">
          bulletproofbody.ai
        </p>
      </div>
    </main>
  );
}
