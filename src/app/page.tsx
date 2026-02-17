"use client";

import { useState } from "react";
import { motion } from "framer-motion"; 
import Link from "next/link";
import { 
  Menu, X, Server, LayoutGrid, Activity, 
  Lock, CheckCircle2, RefreshCw, Users, DollarSign, Bell, UtensilsCrossed, ChevronRight, TrendingUp, Clock
} from "lucide-react";

// Utility for class merging (using local version for simplicity as per your code)
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

// Simple Button component
function Button({ children, className, ...props }: { children: React.ReactNode, className?: string, [key: string]: any }) {
  return (
    <button className={cn("rounded-full px-6 h-10 font-bold transition-colors flex items-center justify-center", className)} {...props}>
      {children}
    </button>
  );
}

// --- FLOATING NOTIFICATION CARD ---
function FloatingOrderNotification() {
  return (
    <div className="absolute -top-6 -right-6 md:-right-12 md:-top-12 z-20 hidden md:block animate-[bounce_3s_infinite]">
       <div className="bg-white/90 backdrop-blur-xl border border-white/50 p-4 rounded-2xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)] w-72">
          <div className="flex justify-between items-start mb-3">
             <div className="flex gap-3">
                <div className="relative w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center">
                   <Bell className="w-5 h-5 text-orange-500 fill-orange-500/20" />
                   <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white"></span>
                   </span>
                </div>
                <div>
                   <h4 className="text-sm font-bold text-slate-800">New Order #204</h4>
                   <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Just Now</p>
                   </div>
                </div>
             </div>
             <div className="bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                <span className="text-xs font-bold text-emerald-600">Rs 450</span>
             </div>
          </div>
          <div className="h-px w-full bg-slate-100 mb-3" />
          <div className="space-y-2">
             <div className="flex justify-between items-center group cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                      <UtensilsCrossed className="w-4 h-4" />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700">Chicken Momo (C)</span>
                      <span className="text-[10px] text-slate-400">Extra Spicy</span>
                   </div>
                </div>
                <div className="text-xs font-bold text-slate-900">x2</div>
             </div>
          </div>
          <div className="mt-3 flex gap-2">
             <button className="flex-1 bg-slate-900 text-white text-xs font-bold py-2 rounded-lg hover:bg-black transition-colors">Accept</button>
             <button className="px-3 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
                <ChevronRight className="w-4 h-4" />
             </button>
          </div>
       </div>
    </div>
  )
}

// --- 3D MOCKUP ---
function HeroDashboardMockup() {
  return (
    <motion.div 
      initial={{ y: 40, opacity: 0, rotateX: 10 }}
      animate={{ y: 0, opacity: 1, rotateX: 0 }}
      transition={{ duration: 1, ease: "easeOut" }}
      style={{ perspective: 1000 }}
      className="relative w-full max-w-4xl mx-auto aspect-[16/10] bg-slate-900 rounded-2xl border-[4px] border-slate-800 shadow-2xl z-10"
    >
       <FloatingOrderNotification />
       <div className="absolute inset-0 p-3 md:p-4 flex flex-col gap-4 overflow-hidden rounded-xl bg-slate-900/95">
          <div className="h-8 md:h-12 w-full border-b border-slate-800 flex items-center justify-between px-2 md:px-4">
             <div className="flex gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/50" />
             </div>
             <div className="hidden md:flex gap-4 text-xs font-mono text-slate-500">
                <span className="text-emerald-500">GeckoRMS_Connected</span>
             </div>
          </div>
          <div className="flex-1 flex gap-4 overflow-hidden">
             <div className="w-12 md:w-16 h-full border-r border-slate-800 flex flex-col items-center gap-4 md:gap-6 py-2">
                 {[LayoutGrid, Activity, Users, DollarSign].map((Icon, i) => (
                    <div key={i} className={`p-2 rounded-xl transition-all duration-300 ${i===0 ? 'bg-gecko-500 text-slate-900 shadow-[0_0_15px_#84cc16]' : 'text-slate-600 hover:text-slate-400'}`}>
                       <Icon className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                 ))}
             </div>
             <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="col-span-1 md:col-span-2 bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 relative overflow-hidden flex flex-col justify-between group">
                    <div className="flex justify-between">
                        <div className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider">Live Revenue</div>
                        <div className="p-1 bg-emerald-500/10 rounded-lg">
                           <TrendingUp className="w-4 h-4 text-emerald-500" />
                        </div>
                    </div>
                    <div className="text-2xl md:text-3xl font-bold text-white z-10">NRs. 1,24,500</div>
                    <div className="absolute bottom-0 left-0 w-full h-16 opacity-50">
                        <svg viewBox="0 0 100 20" className="w-full h-full" preserveAspectRatio="none">
                           <path d="M0 20 L0 10 L10 15 L20 5 L30 12 L40 8 L50 18 L60 5 L70 10 L80 2 L90 12 L100 0 L100 20 Z" fill="url(#gradient)" />
                           <defs>
                              <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                                 <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
                                 <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                              </linearGradient>
                           </defs>
                        </svg>
                    </div>
                 </div>
                 <div className="col-span-1 bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 flex flex-col justify-between">
                    <div className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider">Active Tables</div>
                    <div className="text-2xl md:text-4xl font-black text-white">18<span className="text-sm md:text-lg text-slate-600 font-medium">/24</span></div>
                    <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden mt-2">
                       <div className="h-full bg-gecko-500 w-[75%] shadow-[0_0_10px_#84cc16]" />
                    </div>
                 </div>
                 <div className="col-span-3 h-full bg-slate-800/30 rounded-xl border border-slate-700/50 p-4">
                     <div className="flex justify-between items-center mb-3">
                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Live KOT Feed</div>
                        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]" />
                     </div>
                     <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 bg-slate-800 rounded-lg border border-slate-700">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 border border-slate-600">T4</div>
                              <div className="flex flex-col">
                                 <span className="text-xs font-bold text-white">Momo Platter</span>
                                 <span className="text-[10px] text-slate-400">Steam x2</span>
                              </div>
                           </div>
                           <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-[10px] font-bold rounded border border-orange-500/30 uppercase">Cooking</span>
                        </div>
                     </div>
                 </div>
             </div>
          </div>
       </div>
    </motion.div>
  );
}

// --- MAGNETIC BUTTON ---
function MagneticButton({ children, className, variant = "primary" }: { children: React.ReactNode, className?: string, variant?: "primary" | "outline" }) {
    return (
        <button
            className={cn(
                "relative h-14 px-8 rounded-full font-bold text-lg flex items-center justify-center gap-2 transition-transform hover:-translate-y-1 active:scale-95 duration-200",
                variant === "primary" ? "bg-slate-900 text-white shadow-xl shadow-slate-900/20 hover:bg-black" : "bg-white text-slate-900 border border-slate-200 hover:bg-slate-50",
                className
            )}
        >
            {children}
        </button>
    )
}

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-gecko-500 selection:text-white font-sans overflow-x-hidden">
      
      {/* --- BACKGROUND BLOBS --- */}
      <div className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-gecko-200/30 rounded-full blur-[80px] animate-blob" />
          <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-blue-100/40 rounded-full blur-[80px] animate-blob animation-delay-2000" />
          <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-emerald-100/30 rounded-full blur-[80px] animate-blob animation-delay-4000" />
      </div>

      {/* --- NAVBAR --- */}
      <nav className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4">
         <div className="w-full max-w-4xl h-16 bg-white/90 backdrop-blur-md border border-slate-200/60 shadow-lg rounded-full flex items-center justify-between px-6">
             <div className="flex items-center gap-2">
               {/* Replaced img with a pure CSS logo placeholder to avoid 404s */}
               <div className="w-8 h-8 bg-gecko-500 rounded-lg flex items-center justify-center text-white font-black text-xs">G</div>
               <span className="font-bold text-lg tracking-tight">Gecko<span className="text-gecko-600">RMS</span></span>
             </div>
             <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-500">
                <Link href="#" className="hover:text-gecko-600 transition-colors">Features</Link>
                <Link href="#" className="hover:text-gecko-600 transition-colors">Pricing</Link>
             </div>
             <div className="flex items-center gap-3">
                 <Link href="/login" className="hidden md:block text-sm font-bold text-slate-900 hover:text-gecko-600 px-4">Sign In</Link>
                 <Link href="/login">
                     <Button className="rounded-full bg-slate-900 text-white hover:bg-slate-800 px-6 h-10 shadow-lg shadow-slate-900/10 font-bold">Demo</Button>
                 </Link>
                 <button className="md:hidden ml-2" onClick={() => setMobileMenuOpen(true)}><Menu className="w-6 h-6"/></button>
             </div>
         </div>
      </nav>

      {/* --- MOBILE MENU --- */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col items-center justify-center gap-8 text-3xl font-black animate-in fade-in duration-200">
           <button className="absolute top-8 right-8 p-2 bg-slate-100 rounded-full" onClick={() => setMobileMenuOpen(false)}><X className="w-6 h-6"/></button>
           <Link href="#" onClick={() => setMobileMenuOpen(false)} className="text-slate-900">Features</Link>
           <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-gecko-600">Admin Login</Link>
        </div>
      )}

      {/* --- HERO --- */}
      <section className="pt-32 pb-20 container mx-auto px-4 relative z-10 flex flex-col items-center text-center">
         
         <motion.div 
           initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
           className="mb-8 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm"
         >
            <span className="flex h-2 w-2 relative">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gecko-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-gecko-500"></span>
            </span>
            <span className="text-xs font-bold text-slate-600 tracking-wide uppercase">Operational in Kathmandu</span>
         </motion.div>

         <motion.h1 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-8xl lg:text-9xl font-black tracking-tighter text-slate-900 mb-6 leading-[0.95]"
         >
            Speed <span className="text-transparent bg-clip-text bg-gradient-to-r from-gecko-500 to-emerald-600">Defined.</span>
         </motion.h1>

         <motion.p 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-2xl text-slate-500 max-w-2xl mx-auto mb-10 font-medium leading-relaxed"
         >
            The Restaurant OS built for high-volume dining. <br className="hidden md:block"/> No lag. No downtime.
         </motion.p>

         <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 mb-20"
         >
            <Link href="/login"><MagneticButton>Get Started</MagneticButton></Link>
            <MagneticButton variant="outline">View Pricing</MagneticButton>
         </motion.div>

        <div className="w-full px-2 md:px-0 hidden md:block">
            <HeroDashboardMockup />
        </div>
        <div className="md:hidden w-full aspect-video bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold border border-slate-800 shadow-xl">
            <p className="text-sm">Interactive Dashboard (Desktop View)</p>
        </div>
      </section>

      {/* --- FEATURES --- */}
      <section className="py-24 bg-slate-50 relative z-10">
         <div className="container mx-auto px-6">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {/* Feature 1 */}
                 <div className="col-span-1 md:col-span-2 p-8 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex flex-col md:flex-row gap-6 items-center">
                       <div className="flex-1 space-y-4">
                          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-900/20 group-hover:scale-110 transition-transform"><RefreshCw className="w-6 h-6" /></div>
                          <h3 className="text-2xl font-bold text-slate-900">Instant Sync</h3>
                          <p className="text-slate-500">Change a price in Inventory, and it updates within 200ms across all terminals.</p>
                       </div>
                       <div className="flex-1 flex justify-center">
                           <div className="relative w-32 h-32 bg-gecko-50 rounded-full flex items-center justify-center">
                               <Server className="w-12 h-12 text-gecko-600" />
                               <div className="absolute inset-0 border-2 border-dashed border-gecko-300 rounded-full animate-[spin_10s_linear_infinite]" />
                           </div>
                       </div>
                    </div>
                 </div>

                 {/* Feature 2 */}
                 <div className="col-span-1 p-8 bg-slate-900 text-white rounded-3xl shadow-xl flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl" />
                    <div className="relative z-10">
                       <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md border border-white/10"><Lock className="w-6 h-6 text-emerald-400" /></div>
                       <h3 className="text-2xl font-bold mb-2">Ironclad Audit</h3>
                       <p className="text-slate-400 text-sm">Every keypress logged. Theft is impossible.</p>
                    </div>
                 </div>

                 {/* Feature 3 */}
                 <div className="col-span-1 p-8 bg-white rounded-3xl border border-slate-200 shadow-sm hover:border-orange-200 transition-colors">
                    <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 mb-6 border border-orange-100"><LayoutGrid className="w-6 h-6" /></div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Table Turns</h3>
                    <p className="text-slate-500 text-sm">Visual timers on every table. Know who is camping.</p>
                 </div>

                 {/* Feature 4 */}
                 <div className="col-span-1 md:col-span-2 p-8 bg-white rounded-3xl border border-slate-200 shadow-sm hover:border-emerald-200 transition-colors">
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                       <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-100"><CheckCircle2 className="w-6 h-6" /></div>
                       <div>
                          <h3 className="text-2xl font-bold text-slate-900 mb-2">Kitchen Display System (KDS)</h3>
                          <p className="text-slate-500">Replace noisy ticket printers with silent, efficient screens. Reduce error rates by 94%.</p>
                       </div>
                    </div>
                 </div>
             </div>
         </div>
      </section>

      {/* --- FOOTER --- */}
      <section className="py-20 bg-white border-t border-slate-100 text-center relative z-10">
          <div className="container mx-auto px-6">
              <h2 className="text-4xl font-black tracking-tight mb-8 text-slate-900">Ready to fly?</h2>
              <div className="flex justify-center mb-8">
                 <Link href="/login">
                    <Button className="h-14 px-10 rounded-full bg-gecko-500 hover:bg-gecko-600 text-white font-bold text-lg shadow-lg shadow-gecko-500/20">
                       Get Started Now
                    </Button>
                 </Link>
              </div>
              <p className="text-slate-400 text-sm font-medium">© 2025 Gecko Works Nepal.</p>
          </div>
      </section>
    </div>
  );
}