import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

// --- 1. OPTIMIZED FONT LOADING (0 Cumulative Layout Shift) ---
const jakarta = Plus_Jakarta_Sans({ 
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap", 
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

// --- 2. NATIVE APP VIEWPORT CONFIGURATION (0 Lag & No Rubber-banding) ---
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#10b981" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" }
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, 
  viewportFit: "cover", 
};

// --- 3. NEXT-LEVEL SEO & DYNAMIC OG PREVIEWS ---
export const metadata: Metadata = {
  metadataBase: new URL("https://rms.geckoworksnepal.com.np"), 
  
  title: {
    default: "Gecko RMS | Intelligent Restaurant OS",
    template: "%s | Gecko RMS",
  },
  
  description: "Gecko RMS is Nepal's ultra-premium Restaurant Management System. Experience 0-lag syncing between Waiters, Kitchen, and Billing. The ultimate OS to scale your dining business.",
  keywords: ["Restaurant POS", "Gecko RMS", "SaaS", "Nepal POS", "Cloud Kitchen OS", "Restaurant Software", "Digital Menu", "KDS"],
  authors: [{ name: "Gecko Works Nepal", url: "https://rms.geckoworksnepal.com.np" }],
  creator: "Gecko Works Nepal",
  publisher: "Gecko Works Nepal",
  formatDetection: { email: false, address: false, telephone: false },
  
  // Favicons stay as the paw (browser tabs are too small for the big image)
  icons: {
    icon: "/paw.png", 
    apple: "/paw.png",
  },

  manifest: "/manifest.json", 
  appleWebApp: {
    capable: true,
    statusBarStyle: "default", 
    title: "Gecko POS",
    startupImage: ["/paw.png"], 
  },

  // --- 🚀 THE UPGRADE: FUTURISTIC DYNAMIC SOCIAL PREVIEWS ---
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://rms.geckoworksnepal.com.np",
    title: "Gecko RMS | The Future of Dining 🚀",
    description: "One OS. Every Role. Gecko unifies your entire restaurant. What the waiter enters, the kitchen sees instantly, and the owner tracks globally.",
    siteName: "Gecko RMS",
    images: [{ url: "/api/og", width: 1200, height: 630, alt: "Gecko RMS - Premium Restaurant OS" }],
  },
  
  // Upgrade Twitter card to large billboard format
  twitter: {
    card: "summary_large_image", 
    title: "Gecko RMS | Intelligent Restaurant OS",
    description: "The 0-lag, real-time operating system for high-volume restaurants.",
    images: ["/api/og"], 
    creator: "@GeckoWorks",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>

      <body className={`
        ${jakarta.variable} font-sans antialiased bg-[#F8FAFC] text-slate-900 
        selection:bg-emerald-500 selection:text-white h-full overflow-x-hidden 
        overscroll-none touch-pan-y relative
      `}>
        
        {/* --- GLOBAL AMBIENT ANIMATION (0 Lag, GPU Accelerated) --- */}
        {/* This runs silently in the background of your entire website giving it a premium "breathing" feel */}
        <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden flex items-center justify-center transform-gpu">
          <div className="absolute w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] bg-emerald-500/5 rounded-full blur-[100px] md:blur-[140px] animate-[spin_25s_linear_infinite]" />
          <div className="absolute w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] bg-teal-400/5 rounded-full blur-[80px] md:blur-[120px] animate-[spin_20s_reverse_linear_infinite]" />
        </div>

        {children}
        
        {/* Global Toast Notifications */}
        <Toaster 
          position="top-center" 
          richColors 
          closeButton
          theme="light"
          toastOptions={{
            style: {
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)', 
              border: '1px solid rgba(226, 232, 240, 0.8)',
              borderRadius: '20px',
              fontFamily: 'var(--font-jakarta)',
              fontWeight: 700,
              boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.08)',
              transform: 'translateZ(0)',
            },
            className: 'tracking-tight'
          }}
        />
      </body>
    </html>
  );
}