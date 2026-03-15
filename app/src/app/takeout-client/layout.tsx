import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fast Food Bible — Client",
  description:
    "Your personalized takeout ordering guide. Verified nutrition data for every swap.",
};

export default function TakeoutClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
