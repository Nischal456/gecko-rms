import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

// --- 1. OPTIMIZED FONT LOADING ---
// Using "swap" ensures text is visible immediately.
// "variable" allows us to use it via Tailwind utility classes.
const jakarta = Plus_Jakarta_Sans({ 
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap", 
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

// --- 2. VIEWPORT CONFIGURATION (Mobile App Feel) ---
// This disables zooming on mobile inputs and sets the theme color
// to match your Emerald brand, giving it a native app feel.
export const viewport: Viewport = {
  themeColor: "#10b981", // Matches Emerald-500
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevents pinch-zoom, makes it feel like a native app
};

// --- 3. NEXT-LEVEL SEO & ICONS ---
export const metadata: Metadata = {
  metadataBase: new URL("https://gecko-rms.vercel.app/"), // Replace with your actual domain
  
  title: {
    default: "Gecko RMS | Intelligent Restaurant OS",
    template: "%s | Gecko RMS",
  },
  
  description: "The ultra-premium Restaurant Management System. Streamline operations, boost sales, and delight customers with the fastest POS on the market.",
  
  keywords: ["Restaurant POS", "SaaS", "Menu Management", "Gecko RMS", "Hospitality Software"],
  
  authors: [{ name: "Gecko Team" }],
  
  // --- ICONS CONFIGURATION (The Paw) ---
  icons: {
    icon: "/paw.png", // Standard Favicon
    shortcut: "/paw.png",
    apple: [
      { url: "/paw.png", sizes: "180x180", type: "image/png" }, // iPhone Home Screen
    ],
    other: [
      {
        rel: "apple-touch-icon-precomposed",
        url: "/paw.png",
      },
    ],
  },

  // --- SOCIAL MEDIA PREVIEWS (OpenGraph) ---
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://gecko-rms.vercel.app/",
    title: "Gecko RMS | The Future of Dining",
    description: "Manage your restaurant with speed and elegance.",
    siteName: "Gecko RMS",
    images: [
      {
        url: "/og-image.png", // Make sure to add a nice banner image in public/
        width: 1200,
        height: 630,
        alt: "Gecko RMS Dashboard",
      },
    ],
  },

  // --- TWITTER CARD ---
  twitter: {
    card: "summary_large_image",
    title: "Gecko RMS",
    description: "Premium Restaurant Management System",
    images: ["/og-image.png"], 
  },

  // --- PWA CAPABILITIES ---
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Gecko POS",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth h-full">
      {/* - antialiased: Makes fonts look crisp (Retina ready)
         - selection:*: Custom highlight color for premium feel
         - h-full: Ensures full height for layouts
      */}
      <body className={`${jakarta.variable} font-sans antialiased bg-[#F8FAFC] text-slate-900 selection:bg-emerald-500 selection:text-white h-full overflow-x-hidden`}>
        
        {children}
        
        {/* Global Toast Notifications */}
        <Toaster 
          position="top-center" 
          richColors 
          closeButton
          theme="light"
          toastOptions={{
            style: {
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              border: '1px solid #E2E8F0',
              borderRadius: '16px',
              fontFamily: 'var(--font-jakarta)',
              fontWeight: 600,
            },
            className: 'shadow-xl'
          }}
        />
      </body>
    </html>
  );
}