import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lose Your Next 10 lbs Without Giving Up Your Favorite Snacks",
  description:
    "Pick your guilty pleasure. We'll show you how to lose weight without giving it up. Takes 60 seconds.",
  openGraph: {
    title: "Lose Your Next 10 lbs Without Giving Up Your Favorite Snacks",
    description:
      "Pick your guilty pleasure. We'll show you how to lose weight without giving it up. Takes 60 seconds.",
    siteName: "Bulletproof Body",
    type: "website",
    url: "https://bulletproofbody.ai/snack-bible-landing",
    images: [
      {
        url: "https://bulletproofbody.ai/og-snack-bible.png",
        width: 1200,
        height: 630,
        alt: "Lose Fat Without Giving Up Your Favorite Snacks",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lose Your Next 10 lbs Without Giving Up Your Favorite Snacks",
    description:
      "Pick your guilty pleasure. We'll show you how to lose weight without giving it up. Takes 60 seconds.",
    images: ["https://bulletproofbody.ai/og-snack-bible.png"],
  },
};

export default function SnackBibleLandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
