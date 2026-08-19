import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features: POS, KDS, QR Menu & Analytics | Gecko RMS",
  description: "Explore Gecko RMS features: 0-lag waiter ordering, Kitchen Display System (KDS), branded QR digital menus, real-time inventory & sales analytics.",
  alternates: {
    canonical: "/features",
  },
  openGraph: {
    title: "Features: POS, KDS, QR Menu & Analytics | Gecko RMS",
    description: "Discover Nepal's most powerful restaurant OS features.",
    url: "https://rms.geckoworksnepal.com.np/features",
  },
};

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
