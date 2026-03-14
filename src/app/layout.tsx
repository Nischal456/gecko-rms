import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

// --- 1. OPTIMIZED FONT LOADING (0 Cumulative Layout Shift) ---
const jakarta = Plus_Jakarta_Sans({ 
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap", // Ensures text is instantly visible while font loads
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
  userScalable: false, // Prevents pinch-zoom, locking in the native app feel
  viewportFit: "cover", // Expands beautifully into the iPhone notch/dynamic island
};

// --- 3. NEXT-LEVEL SEO & PROGRESSIVE WEB APP (PWA) ICONS ---
export const metadata: Metadata = {
  metadataBase: new URL("https://rms.geckoworksnepal.com.np/"), 
  
  title: {
    default: "Gecko RMS | Intelligent Restaurant OS",
    template: "%s | Gecko RMS",
  },
  
  description: "The ultra-premium Restaurant Management System. Streamline operations, boost sales, and delight customers with the fastest POS on the market.",
  keywords: ["Restaurant POS", "SaaS", "Menu Management", "Gecko RMS", "Hospitality Software", "Nepal POS", "Cloud Kitchen OS"],
  authors: [{ name: "Gecko Works Nepal", url: "https://rms.geckoworksnepal.com.np/" }],
  creator: "Gecko Works Nepal",
  publisher: "Gecko Works Nepal",
  formatDetection: { email: false, address: false, telephone: false }, // Stops iOS from turning numbers into ugly blue links
  
  // --- THE PAW ICON (Perfectly mapped for every device on Earth) ---
  icons: {
    icon: [
      { url: "/paw.png", type: "image/png" },
      { url: "/paw.png", sizes: "192x192", type: "image/png" },
      { url: "/paw.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/paw.png",
    apple: [
      { url: "/paw.png", sizes: "180x180", type: "image/png" },
      { url: "/paw.png", sizes: "152x152", type: "image/png" },
      { url: "/paw.png", sizes: "167x167", type: "image/png" },
    ],
    other: [
      { rel: "apple-touch-icon-precomposed", url: "/paw.png" },
    ],
  },

  // --- NATIVE APP MANIFEST SETTINGS (Save to Homescreen Magic) ---
  manifest: "/manifest.json", // Optional: Add a manifest.json in public/ later for full offline PWA support
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent", // Makes the iOS status bar transparent over your app
    title: "Gecko POS",
    startupImage: ["/paw.png"], 
  },

  // --- SOCIAL MEDIA PREVIEWS ---
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://rms.geckoworksnepal.com.np/",
    title: "Gecko RMS | The Future of Dining",
    description: "Manage your restaurant with speed and elegance.",
    siteName: "Gecko RMS",
    images: [{ url: "/paw.png", width: 800, height: 800, alt: "Gecko RMS Dashboard" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gecko RMS | The Future of Dining",
    description: "Premium Restaurant Management System",
    images: ["/paw.png"], 
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
    // 'scroll-smooth' = Native hardware-accelerated smooth scrolling (0 JS cost)
    <html lang="en" className="scroll-smooth h-full">
      <head>
        {/* --- PRECONNECT ENGINE (Super Duper Fast Data Fetching) --- */}
        {/* This forces the browser to open TCP/TLS connections to your database before the page even finishes rendering */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* If you know your Supabase URL, uncomment and add it here for 0-latency database requests: */}
        {/* <link rel="preconnect" href="https://YOUR_SUPABASE_URL.supabase.co" crossOrigin="anonymous" /> */}
        {/* <link rel="dns-prefetch" href="https://YOUR_SUPABASE_URL.supabase.co" /> */}
      </head>

      {/* - antialiased: Crisp retina text
        - overscroll-none: Prevents the browser from "bouncing" when you scroll too far (Native app feel)
        - touch-pan-y: Offloads touch tracking to the GPU for 120fps scrolling on cheap Androids
      */}
      <body className={`
        ${jakarta.variable} font-sans antialiased bg-[#F8FAFC] text-slate-900 
        selection:bg-emerald-500 selection:text-white h-full overflow-x-hidden 
        overscroll-none touch-pan-y
      `}>
        
        {children}
        
        {/* Global Toast Notifications (Premium Frosted Glass) */}
        <Toaster 
          position="top-center" 
          richColors 
          closeButton
          theme="light"
          toastOptions={{
            style: {
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)', // Safari support
              border: '1px solid rgba(226, 232, 240, 0.8)',
              borderRadius: '20px',
              fontFamily: 'var(--font-jakarta)',
              fontWeight: 700,
              boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.08)',
              transform: 'translateZ(0)', // Force GPU acceleration on the toasts
            },
            className: 'tracking-tight'
          }}
        />
      </body>
    </html>
  );
}