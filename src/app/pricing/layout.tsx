import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing Plans (Rs 1,499/mo) | Gecko RMS Nepal",
  description: "Gecko RMS All-in-One Pro Plan at Rs 1,499/mo. Includes 15-Day Free Trial, unlimited terminals, zero-paper KDS, branded QR menu, and 24/7 Nepali VIP support.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "Pricing Plans (Rs 1,499/mo) | Gecko RMS Nepal",
    description: "All-in-One Pro Plan with 15-Day Free Trial. Pay Rs 1,499/mo for unlimited terminals, KDS, QR Menu & Analytics.",
    url: "https://rms.geckoworksnepal.com.np/pricing",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
