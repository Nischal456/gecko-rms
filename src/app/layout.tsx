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
  alternates: {
    canonical: "/",
  },

  title: {
    default: "Gecko RMS | Restaurant Management System ",
    template: "%s | Gecko RMS",
  },

  description: "Gecko RMS is Nepal's best Restaurant Management System & Cloud POS. 0-lag real-time order syncing between Waiters, KDS Kitchen Displays, Digital QR Menus, and Central Billing.",
  keywords: [
    // Core Restaurant Keywords
    "restaurant",
    "restaurant management",
    "restaurant management system",
    "restaurant management software",
    "restaurant software",
    "restaurant system",
    "restaurant app",
    "restaurant technology",
    "restaurant solution",
    "restaurant platform",
    "restaurant automation",
    "restaurant operations",
    "restaurant operations software",
    "restaurant business software",
    "restaurant digital solution",
    "restaurant digital management",
    "restaurant management platform",
    "restaurant management app",
    "restaurant management tool",

    // Restaurant POS
    "restaurant POS",
    "restaurant POS system",
    "restaurant POS software",
    "restaurant point of sale",
    "restaurant point of sale system",
    "restaurant POS machine",
    "restaurant POS solution",
    "restaurant POS app",
    "restaurant POS platform",
    "restaurant POS billing",
    "POS for restaurant",
    "POS system for restaurant",
    "POS software for restaurant",
    "best restaurant POS",
    "best restaurant POS software",
    "best POS for restaurant",
    "modern restaurant POS",
    "cloud restaurant POS",
    "cloud based restaurant POS",
    "online restaurant POS",
    "digital restaurant POS",
    "smart restaurant POS",
    "restaurant billing POS",

    // Restaurant Billing
    "restaurant billing software",
    "restaurant billing system",
    "restaurant billing app",
    "restaurant billing solution",
    "restaurant invoice software",
    "restaurant invoice system",
    "restaurant bill management",
    "restaurant bill software",
    "restaurant billing POS",
    "restaurant billing application",
    "digital restaurant billing",
    "restaurant receipt software",
    "restaurant payment software",
    "restaurant payment system",
    "restaurant cash management",
    "restaurant sales management",
    "restaurant sales software",

    // Restaurant Ordering
    "restaurant ordering system",
    "restaurant order management",
    "restaurant order management system",
    "restaurant ordering software",
    "restaurant ordering app",
    "restaurant order system",
    "restaurant order taking system",
    "restaurant order management software",
    "digital restaurant ordering",
    "online restaurant ordering system",
    "restaurant online ordering",
    "restaurant order tracking",
    "restaurant order processing",
    "restaurant order automation",
    "restaurant table ordering",
    "restaurant dine in ordering system",
    "restaurant takeaway ordering system",
    "restaurant delivery ordering system",

    // QR Menu & QR Ordering
    "digital QR menu",
    "QR menu",
    "QR menu software",
    "QR menu system",
    "QR menu for restaurant",
    "restaurant QR menu",
    "digital menu restaurant",
    "digital restaurant menu",
    "online restaurant menu",
    "restaurant digital menu",
    "QR ordering system",
    "QR order system",
    "QR ordering restaurant",
    "restaurant QR ordering",
    "QR food ordering",
    "scan to order restaurant",
    "scan QR to order",
    "contactless restaurant ordering",
    "contactless menu",
    "contactless restaurant menu",
    "digital food menu",
    "digital menu software",
    "restaurant menu software",

    // Kitchen / KDS
    "Kitchen Display System",
    "KDS",
    "Kitchen Display System KDS",
    "KDS software",
    "KDS system",
    "restaurant KDS",
    "kitchen display software",
    "kitchen management system",
    "restaurant kitchen management",
    "kitchen order management",
    "kitchen order system",
    "digital kitchen display",
    "digital kitchen management",
    "restaurant kitchen software",
    "kitchen POS system",
    "restaurant kitchen automation",
    "kitchen order tracking",
    "kitchen ticket system",
    "digital KOT",
    "KOT system",
    "KOT management system",
    "restaurant KOT software",
    "kitchen order ticket",
    "kitchen order ticket system",

    // Inventory
    "restaurant inventory management",
    "restaurant inventory management software",
    "restaurant inventory system",
    "restaurant inventory software",
    "restaurant stock management",
    "restaurant stock management software",
    "restaurant stock system",
    "restaurant stock tracking",
    "restaurant inventory tracking",
    "food inventory management",
    "food stock management",
    "restaurant ingredient management",
    "ingredient inventory system",
    "restaurant purchase management",
    "restaurant supplier management",
    "restaurant wastage management",
    "restaurant waste tracking",
    "restaurant inventory control",
    "restaurant stock control",
    "restaurant procurement software",

    // Reports & Analytics
    "restaurant reporting software",
    "restaurant reports",
    "restaurant sales reports",
    "restaurant analytics",
    "restaurant analytics software",
    "restaurant business analytics",
    "restaurant dashboard",
    "restaurant sales dashboard",
    "restaurant management dashboard",
    "restaurant performance dashboard",
    "restaurant profit management",
    "restaurant profit tracking",
    "restaurant expense management",
    "restaurant revenue tracking",
    "restaurant business reports",
    "restaurant daily sales report",
    "restaurant financial reports",
    "restaurant employee reports",

    // Table Management
    "restaurant table management",
    "restaurant table management system",
    "restaurant table booking system",
    "restaurant table reservation system",
    "restaurant table ordering",
    "restaurant table management software",
    "restaurant seating management",
    "restaurant table tracking",
    "restaurant floor management",
    "restaurant floor plan software",
    "restaurant table POS",

    // Cloud & Online
    "cloud POS",
    "cloud POS software",
    "cloud POS system",
    "cloud restaurant management",
    "cloud restaurant software",
    "cloud restaurant POS",
    "cloud based POS",
    "cloud based restaurant software",
    "online POS restaurant",
    "online restaurant management system",
    "web based restaurant POS",
    "web based restaurant software",
    "restaurant SaaS",
    "restaurant SaaS platform",
    "restaurant cloud software",
    "restaurant management cloud",

    // Nepal Keywords
    "Restaurant Management System Nepal",
    "Restaurant Management Software Nepal",
    "Restaurant Software Nepal",
    "Restaurant POS Nepal",
    "Nepal Restaurant POS",
    "Nepal POS Software",
    "POS Software Nepal",
    "POS System Nepal",
    "Restaurant Billing Software Nepal",
    "Restaurant Billing System Nepal",
    "Restaurant Ordering System Nepal",
    "Restaurant Order Management Nepal",
    "Restaurant Inventory Management Nepal",
    "Restaurant Inventory Software Nepal",
    "Restaurant KDS Nepal",
    "Kitchen Display System Nepal",
    "KDS Software Nepal",
    "Restaurant QR Menu Nepal",
    "Digital QR Menu Nepal",
    "QR Ordering System Nepal",
    "Restaurant App Nepal",
    "Restaurant Management App Nepal",
    "Cloud POS Nepal",
    "Cloud Restaurant POS Nepal",
    "Restaurant Technology Nepal",
    "Restaurant Automation Nepal",
    "Restaurant Software Company Nepal",
    "Restaurant POS Company Nepal",
    "Restaurant Management Company Nepal",
    "Best Restaurant POS Nepal",
    "Best Restaurant Software Nepal",
    "Best Restaurant Billing Software Nepal",
    "Best Restaurant Management System Nepal",
    "Best POS System Nepal",
    "Affordable Restaurant POS Nepal",
    "Affordable Restaurant Software Nepal",
    "Restaurant POS Price Nepal",
    "Restaurant Software Price Nepal",
    "Free Restaurant POS Nepal",
    "Free Trial Restaurant POS Nepal",

    // Kathmandu Keywords
    "Restaurant POS Kathmandu",
    "Restaurant POS in Kathmandu",
    "Restaurant Software Kathmandu",
    "Restaurant Management System Kathmandu",
    "Restaurant Management Software Kathmandu",
    "Restaurant Billing Software Kathmandu",
    "Restaurant Billing System Kathmandu",
    "Restaurant Ordering System Kathmandu",
    "Restaurant POS System Kathmandu",
    "POS Software Kathmandu",
    "POS System Kathmandu",
    "Cloud POS Kathmandu",
    "Restaurant KDS Kathmandu",
    "Kitchen Display System Kathmandu",
    "Restaurant Inventory Software Kathmandu",
    "Restaurant QR Menu Kathmandu",
    "Digital QR Menu Kathmandu",
    "Restaurant Technology Kathmandu",
    "Restaurant Automation Kathmandu",
    "Best Restaurant POS Kathmandu",
    "Best Restaurant Software Kathmandu",
    "Restaurant POS Company Kathmandu",
    "Restaurant Software Company Kathmandu",

    // Nepal Cities
    "Restaurant POS Lalitpur",
    "Restaurant POS Bhaktapur",
    "Restaurant POS Pokhara",
    "Restaurant POS Chitwan",
    "Restaurant POS Biratnagar",
    "Restaurant POS Butwal",
    "Restaurant POS Dharan",
    "Restaurant POS Nepalgunj",
    "Restaurant Software Lalitpur",
    "Restaurant Software Bhaktapur",
    "Restaurant Software Pokhara",
    "Restaurant Management System Pokhara",
    "Restaurant Management System Lalitpur",
    "Restaurant Management System Bhaktapur",

    // Restaurant Types
    "cafe POS system",
    "cafe POS software",
    "cafe management system",
    "cafe management software",
    "cafe billing software",
    "cafe ordering system",
    "bar POS system",
    "bar management software",
    "bar billing software",
    "hotel restaurant POS",
    "hotel POS system",
    "hotel restaurant management",
    "fast food POS system",
    "fast food restaurant software",
    "fast food billing software",
    "fast food ordering system",
    "bakery POS system",
    "bakery management software",
    "bakery billing software",
    "bakery POS Nepal",
    "cloud kitchen software",
    "cloud kitchen POS",
    "cloud kitchen management system",
    "food court POS system",
    "food court management software",
    "food truck POS",
    "food truck management software",
    "fine dining POS system",
    "fine dining restaurant software",
    "multi restaurant POS",
    "multi outlet restaurant POS",
    "restaurant chain management software",
    "restaurant franchise management software",

    // Employee & Staff
    "restaurant employee management",
    "restaurant staff management",
    "restaurant staff management software",
    "restaurant employee software",
    "restaurant attendance system",
    "restaurant staff attendance",
    "restaurant payroll management",
    "restaurant staff scheduling",
    "restaurant staff management system",
    "restaurant waiter management",
    "waiter ordering system",
    "waiter POS system",
    "waiter app restaurant",
    "restaurant cashier software",

    // Customer Management
    "restaurant customer management",
    "restaurant CRM",
    "restaurant customer database",
    "restaurant customer loyalty",
    "restaurant loyalty system",
    "restaurant loyalty software",
    "restaurant customer experience",
    "restaurant feedback system",
    "restaurant customer feedback",
    "restaurant membership system",

    // Payments
    "restaurant payment system Nepal",
    "restaurant digital payment Nepal",
    "restaurant payment software Nepal",
    "restaurant POS payment",
    "restaurant cashless payment",
    "restaurant QR payment",
    "restaurant digital wallet payment",
    "restaurant Fonepay POS",
    "restaurant payment management",
    "restaurant split payment",
    "restaurant multiple payment methods",

    // Free / Trial / Pricing
    "free restaurant POS",
    "free restaurant POS software",
    "free restaurant management software",
    "free restaurant billing software",
    "free restaurant ordering system",
    "free restaurant software",
    "free POS for restaurant",
    "free POS system for restaurant",
    "restaurant POS free trial",
    "Free Trial Restaurant POS",
    "restaurant software free trial",
    "restaurant management software free trial",
    "restaurant POS demo",
    "restaurant POS software demo",
    "restaurant software demo",
    "restaurant POS pricing",
    "restaurant POS price",
    "restaurant software pricing",
    "affordable restaurant POS",
    "affordable restaurant management software",
    "low cost restaurant POS",

    // Best / Comparison Keywords
    "best restaurant management system",
    "best restaurant management software",
    "best restaurant software",
    "best restaurant POS",
    "best restaurant POS system",
    "best restaurant billing software",
    "best restaurant ordering system",
    "best restaurant inventory software",
    "best kitchen display system",
    "best KDS software",
    "best QR menu software",
    "best restaurant software Nepal",
    "best restaurant POS Nepal",
    "top restaurant POS software",
    "top restaurant management software",
    "top POS system for restaurants",
    "restaurant POS alternatives",
    "restaurant software alternatives",
    "restaurant POS comparison",

    // Brand Keywords
    "Gecko RMS",
    "Gecko RMS Nepal",
    "Gecko Restaurant Management System",
    "Gecko Restaurant POS",
    "Gecko POS",
    "Gecko POS Nepal",
    "Gecko restaurant software",
    "Gecko restaurant management",
    "Gecko restaurant management system",
    "Gecko Works Nepal",
    "Gecko Works",
    "Gecko RMS Kathmandu",
    "Gecko RMS POS",
    "Gecko RMS KDS",
    "Gecko RMS QR Menu",
    "Gecko RMS inventory",
    "Gecko RMS billing",
    "Gecko RMS ordering",
    "Gecko RMS restaurant software",
    "Gecko RMS restaurant POS"
  ],
  authors: [{ name: "Gecko Works Nepal", url: "https://www.geckoworksnepal.com" }],
  creator: "Gecko Works Nepal",
  publisher: "Gecko Works Nepal",
  formatDetection: { email: false, address: false, telephone: false },

  // Icons configured directly to /favicon.ico with cache buster
  icons: {
    icon: [
      { url: "/favicon.ico?v=4" },
      { url: "/paw.png?v=4", type: "image/png" }
    ],
    shortcut: "/favicon.ico?v=4",
    apple: "/favicon.ico?v=4",
  },

  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Gecko POS",
    startupImage: ["/favicon.ico?v=4"],
  },

  // --- 🚀 THE UPGRADE: FUTURISTIC DYNAMIC SOCIAL PREVIEWS ---
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://rms.geckoworksnepal.com.np",
    title: "Gecko RMS | Nepal's #1 Restaurant Management System 🚀",
    description: "One OS. Every Role. Gecko unifies your entire restaurant. What the waiter enters, the kitchen sees instantly, and the owner tracks globally.",
    siteName: "Gecko RMS",
    images: [{ url: "/api/og", width: 1200, height: 630, alt: "Gecko RMS - Premium Restaurant OS Nepal" }],
  },

  // Upgrade Twitter card to large billboard format
  twitter: {
    card: "summary_large_image",
    title: "Gecko RMS | #1 Restaurant OS & POS Nepal",
    description: "The 0-lag, real-time operating system for high-volume restaurants in Nepal.",
    images: ["/api/og"],
    creator: "@GeckoWorks",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
  },
};

const JSON_LD_SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://rms.geckoworksnepal.com.np/#website",
      "url": "https://rms.geckoworksnepal.com.np/",
      "name": "Gecko RMS",
      "description": "Nepal's #1 Restaurant Management System & Cloud POS",
      "publisher": { "@id": "https://rms.geckoworksnepal.com.np/#organization" }
    },
    {
      "@type": "Organization",
      "@id": "https://rms.geckoworksnepal.com.np/#organization",
      "name": "Gecko Works Nepal",
      "url": "https://www.geckoworksnepal.com/",
      "logo": "https://rms.geckoworksnepal.com.np/favicon.ico",
      "sameAs": [
        "https://www.geckoworksnepal.com/"
      ],
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+977-9761424028",
        "contactType": "customer service",
        "areaServed": "NP",
        "availableLanguage": ["English", "Nepali"]
      }
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://rms.geckoworksnepal.com.np/#software",
      "name": "Gecko RMS",
      "operatingSystem": "Web, iOS, Android, macOS, Windows",
      "applicationCategory": "BusinessApplication",
      "description": "Zero-lag cloud restaurant management system in Nepal with POS, Kitchen Display System (KDS), Digital QR Menu, and Inventory Tracking.",
      "offers": {
        "@type": "Offer",
        "price": "1499.00",
        "priceCurrency": "NPR",
        "priceValidUntil": "2030-12-31",
        "seller": { "@id": "https://rms.geckoworksnepal.com.np/#organization" }
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "ratingCount": "128"
      }
    },
    {
      "@type": "ItemList",
      "@id": "https://rms.geckoworksnepal.com.np/#sitelinks",
      "name": "Gecko RMS Main Navigation",
      "itemListElement": [
        {
          "@type": "SiteNavigationElement",
          "position": 1,
          "name": "Pricing",
          "description": "Rs 1,499/mo All-in-One Pro Plan with 15-Day Free Trial",
          "url": "https://rms.geckoworksnepal.com.np/pricing"
        },
        {
          "@type": "SiteNavigationElement",
          "position": 2,
          "name": "Features",
          "description": "Zero-Lag POS, KDS Kitchen Display, Digital QR Menu & Analytics",
          "url": "https://rms.geckoworksnepal.com.np/features"
        },
        {
          "@type": "SiteNavigationElement",
          "position": 3,
          "name": "About Us",
          "description": "Engineered in Kathmandu by Gecko Works Nepal",
          "url": "https://rms.geckoworksnepal.com.np/about"
        },
        {
          "@type": "SiteNavigationElement",
          "position": 4,
          "name": "Sign Up Free Trial",
          "description": "Claim 15-Day Free Trial for your restaurant",
          "url": "https://rms.geckoworksnepal.com.np/signup"
        }
      ]
    }
  ]
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_SCHEMA) }}
        />
      </head>

      <body className={`
        ${jakarta.variable} font-sans antialiased bg-[#F8FAFC] text-slate-900 
        selection:bg-emerald-500 selection:text-white h-full overflow-x-hidden 
        touch-pan-y relative custom-scrollbar
      `}>

        {/* --- GLOBAL AMBIENT ANIMATION (0 Lag, GPU Accelerated) --- */}
        {/* This runs silently in the background of your entire website giving it a premium "breathing" feel */}
        <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden flex items-center justify-center transform-gpu">
          <div className="absolute w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] bg-emerald-500/5 rounded-full blur-[40px] md:blur-[140px] transform-gpu hidden sm:block md:animate-[spin_25s_linear_infinite]" />
          <div className="absolute w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] bg-teal-400/5 rounded-full blur-[30px] md:blur-[120px] transform-gpu hidden sm:block md:animate-[spin_20s_reverse_linear_infinite]" />
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