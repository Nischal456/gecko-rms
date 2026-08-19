import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Start 15-Day Free Trial | Gecko RMS Signup",
  description: "Sign up for Gecko RMS and get immediate access to Nepal's #1 Restaurant Management System with a risk-free 15-Day Free Trial.",
  alternates: {
    canonical: "/signup",
  },
  openGraph: {
    title: "Start 15-Day Free Trial | Gecko RMS Signup",
    description: "Claim your 15-day risk-free trial for your restaurant today.",
    url: "https://rms.geckoworksnepal.com.np/signup",
  },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
