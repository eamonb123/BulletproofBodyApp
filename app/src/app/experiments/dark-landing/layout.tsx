import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Takeout Cheat Code | Bulletproof Body",
  description: "Lose your next 10 pounds without giving up takeout",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
