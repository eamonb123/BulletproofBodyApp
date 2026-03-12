import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lose Your Next 10 lbs Without Giving Up DoorDash",
  description:
    "Pick your takeout spot. We'll show you what to order there and still lose weight. Takes 60 seconds.",
  openGraph: {
    title: "Lose Your Next 10 lbs Without Giving Up DoorDash",
    description:
      "Pick your takeout spot. We'll show you what to order there and still lose weight. Takes 60 seconds.",
    siteName: "Bulletproof Body",
    type: "website",
    url: "https://bulletproofbody.ai/takeout",
    images: [
      {
        url: "https://bulletproofbody.ai/og-bible.png",
        width: 1200,
        height: 630,
        alt: "Lose Your Next 10 lbs Without Giving Up DoorDash",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lose Your Next 10 lbs Without Giving Up DoorDash",
    description:
      "Pick your takeout spot. We'll show you what to order there and still lose weight. Takes 60 seconds.",
    images: ["https://bulletproofbody.ai/og-bible.png"],
  },
};

export default function BibleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
