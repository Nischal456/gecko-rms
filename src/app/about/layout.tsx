import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us & Gecko Works Nepal | Gecko RMS",
  description: "Learn about Gecko RMS, engineered in Kathmandu by Gecko Works Nepal to empower dining businesses with zero-lag cloud technology.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About Us & Gecko Works Nepal | Gecko RMS",
    description: "Built in Nepal for Nepalese restaurants.",
    url: "https://rms.geckoworksnepal.com.np/about",
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
