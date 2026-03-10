import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lose Fat Without Giving Up Your Favorite Snacks",
  description:
    "See the swap. Same taste, no prep, already packaged. Takes 60 seconds.",
  openGraph: {
    title: "Lose Fat Without Giving Up Your Favorite Snacks",
    description:
      "See the swap. Same taste, no prep, already packaged. Takes 60 seconds.",
    siteName: "Bulletproof Body",
    type: "website",
    url: "https://bulletproofbody.ai/snack-bible",
    images: [
      {
        url: "/og-snack-bible.png",
        width: 1200,
        height: 630,
        alt: "Lose Fat Without Giving Up Your Favorite Snacks",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lose Fat Without Giving Up Your Favorite Snacks",
    description:
      "See the swap. Same taste, no prep, already packaged. Takes 60 seconds.",
    images: ["/og-snack-bible.png"],
  },
};

export default function SnackBibleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
