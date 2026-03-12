import Link from "next/link";

const modules = [
  {
    name: "How to Lose 10 lbs Without Giving Up Fast Food",
    href: "/takeout",
    description: "Pick your restaurant. See the swap. Lose the fat.",
  },
  {
    name: "How to Lose 10 lbs Without Giving Up Your Favorite Snacks",
    href: "/snacks",
    description: "See where the hidden calories are in your go-to snacks.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          BULLETPROOF BODY
        </h1>
        <p className="text-gray-400 mb-8">Free Tools</p>

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
