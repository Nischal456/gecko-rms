"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  motion, useScroll, useTransform, useSpring, useMotionTemplate, useMotionValue, AnimatePresence, type Variants, PanInfo
} from "framer-motion"; 
import Link from "next/link";
import { 
  Menu, X, Server, LayoutGrid, Activity, QrCode, Globe,
  RefreshCw, Users, DollarSign, Bell, TrendingUp, ArrowRight, Zap, ChevronRight, Leaf, Clock, MapPin, Wifi, Laptop, Smartphone, ChefHat, Search, ShoppingBag, CheckCircle2, AlertCircle, LogOut, Grid, List, Moon, Sun, Utensils, Plus, Minus, Trash2, Copy, Share, ExternalLink, CloudLightning, MessageSquare
,Banknote
} from "lucide-react";
import AIChatWidget from "@/components/landing/AIChatWidget";

// --- 1. CONFIG & UTILS ---
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

// Apple-style easing for 120fps feel
const EASE_PREMIUM = [0.16, 1, 0.3, 1] as const; 

// --- 2. ANIMATION VARIANTS ---
const drawVariant: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (i: number = 0) => ({
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { delay: i * 0.2, type: "spring", duration: 1.5, bounce: 0 },
      opacity: { delay: i * 0.2, duration: 0.01 }
    }
  })
};

const fadeUpVariant: Variants = {
  hidden: { opacity: 0, y: 30 }, // Reduced travel distance for snappier feel
  visible: (delay: number = 0) => ({ 
    opacity: 1, 
    y: 0, 
    transition: { delay, duration: 0.6, ease: EASE_PREMIUM } 
  })
};

const menuStagger: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: 0.1 }
    },
    exit: {
        opacity: 0,
        transition: { staggerChildren: 0.05, staggerDirection: -1 }
    }
};

const menuItemVariant: Variants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { ease: EASE_PREMIUM } },
    exit: { y: 20, opacity: 0 }
};

// --- 3. MICRO-COMPONENTS ---

function MagneticButton({ children, className, variant = "primary" }: { children: React.ReactNode, className?: string, variant?: "primary" | "outline" | "ghost" }) {
    const ref = useRef<HTMLButtonElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    // Added a state to disable physics on mobile touch for zero lag
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        setIsMobile(window.innerWidth < 768);
    }, []);

    const mouseX = useSpring(x, { stiffness: 150, damping: 15, mass: 0.1 });
    const mouseY = useSpring(y, { stiffness: 150, damping: 15, mass: 0.1 });

    const handleMouse = (e: React.MouseEvent) => {
        if (isMobile) return; // Prevent layout thrashing on mobile
        const { left, top, width, height } = ref.current!.getBoundingClientRect();
        const centerX = left + width / 2;
        const centerY = top + height / 2;
        x.set((e.clientX - centerX) * 0.3); 
        y.set((e.clientY - centerY) * 0.3);
    };

    const reset = () => {
        if (isMobile) return;
        x.set(0);
        y.set(0);
    };

    return (
        <motion.button
            ref={ref}
            style={isMobile ? {} : { x: mouseX, y: mouseY }}
            onMouseMove={handleMouse}
            onMouseLeave={reset}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
                "relative flex items-center justify-center gap-2 transition-colors duration-300 overflow-hidden isolate transform-gpu",
                variant === "primary" ? "bg-slate-900 text-white shadow-2xl shadow-slate-900/30 hover:shadow-slate-900/50" : 
                variant === "outline" ? "bg-white text-slate-900 border border-slate-200 shadow-sm hover:border-slate-300 hover:bg-slate-50" :
                "bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100",
                className
            )}
        >
            <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
            <span className="relative z-10 flex items-center gap-2 whitespace-nowrap">{children}</span>
        </motion.button>
    )
}

function SpotlightCard({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const divRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
      setIsMobile(window.innerWidth < 768);
  }, []);

  const handleMouseMove = ({ currentTarget, clientX, clientY }: React.MouseEvent) => {
    if (isMobile) return; 
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  };

  // ✅ FIX: Moved the hook outside of the return/conditional statement
  const backgroundTemplate = useMotionTemplate`
    radial-gradient(
      600px circle at ${mouseX}px ${mouseY}px,
      rgba(16, 185, 129, 0.08),
      transparent 80%
    )
  `;

  return (
    <motion.div
      ref={divRef}
      variants={fadeUpVariant}
      custom={delay}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      onMouseMove={handleMouseMove}
      className={cn(
        "group relative border border-slate-200 bg-white overflow-hidden rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-sm hover:shadow-2xl transition-all duration-500 transform-gpu",
        className
      )}
    >
      {!isMobile && (
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-[2.5rem] opacity-0 transition duration-300 group-hover:opacity-100"
          style={{ background: backgroundTemplate }} // ✅ Used the variable here
        />
      )}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

// --- 4. THE "QUAD-OS" DASHBOARD SIMULATION ---
function TrinityDashboardShowcase() {
    const [activeTab, setActiveTab] = useState<"admin" | "pos" | "kitchen" | "waiter">("admin");

    return (
        <section className="py-24 bg-slate-50 relative overflow-hidden">
             {/* Background Gradients - Reduced opacity and disabled events to prevent mobile lag */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] md:w-[1000px] h-[400px] md:h-[600px] bg-emerald-500/5 rounded-full blur-[80px] md:blur-[120px] pointer-events-none transform-gpu" />

            <div className="container mx-auto px-4 max-w-7xl relative z-10">
                <div className="text-center mb-10 md:mb-12">
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4 md:mb-6 leading-tight">One OS. Every Role.</h2>
                    <p className="text-slate-500 text-base md:text-lg max-w-2xl mx-auto px-4">
                        GeckoRMS unifies your entire restaurant. What the waiter enters, the kitchen sees instantly, and the owner tracks globally.
                    </p>
                </div>

                {/* Tab Switcher - Added full width scrollability for mobile */}
                <div className="flex justify-center mb-8 md:mb-12 w-full px-2">
                    <div className="bg-white p-1.5 rounded-full border border-slate-200 shadow-xl flex gap-1 items-center overflow-x-auto no-scrollbar max-w-full">
                        {[
                            { id: "admin", label: "Admin", icon: LayoutGrid },
                            { id: "pos", label: "POS / Menu", icon: Utensils },
                            { id: "kitchen", label: "Kitchen KDS", icon: ChefHat },
                            { id: "waiter", label: "Waiter Hub", icon: Users }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={cn(
                                    "relative px-4 md:px-6 py-2.5 md:py-3 rounded-full text-xs md:text-sm font-bold transition-all z-10 flex items-center gap-2 whitespace-nowrap shrink-0",
                                    activeTab === tab.id ? "text-white" : "text-slate-500 hover:text-slate-900"
                                )}
                            >
                                {activeTab === tab.id && (
                                    <motion.div 
                                        layoutId="activeTab" 
                                        className="absolute inset-0 bg-slate-900 rounded-full z-[-1] shadow-lg transform-gpu" 
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} 
                                    />
                                )}
                                <tab.icon className="w-4 h-4" />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* THE DASHBOARD WINDOW - Responsive Height Fix */}
                <div className="relative w-full h-[80vh] min-h-[600px] md:h-auto md:aspect-[16/9] md:max-h-[800px] bg-white rounded-2xl md:rounded-3xl border border-slate-200 shadow-2xl overflow-hidden ring-4 ring-slate-900/5 transform-gpu flex flex-col">
                    <AnimatePresence mode="wait">
                        
                        {/* --- 1. ADMIN DASHBOARD --- */}
                        {activeTab === "admin" && (
                            <motion.div 
                                key="admin"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.02 }}
                                transition={{ duration: 0.3, ease: EASE_PREMIUM }}
                                className="absolute inset-0 flex bg-[#F8F9FB] flex-col md:flex-row transform-gpu"
                            >
                                {/* Sidebar (Desktop) */}
                                <div className="w-64 bg-white border-r border-slate-100 hidden md:flex flex-col p-6 shrink-0">
                                    <div className="flex items-center gap-3 mb-10">
                                        <div className="w-10 h-10 bg-green-400 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-yellow-400/30 shrink-0">G</div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-sm">Gecko RMS</h3>
                                            <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded font-bold">RMS</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        {["Overview", "Floor Plan", "Menu Engine", "Inventory", "Staff"].map((item, i) => (
                                            <div key={item} className={cn("px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3 cursor-pointer transition-all", i === 0 ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20" : "text-slate-500 hover:bg-slate-50 hover:pl-6")}>
                                                <div className={cn("w-2 h-2 rounded-full shrink-0", i===0 ? "bg-emerald-400" : "bg-slate-300")} />
                                                {item}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-auto bg-slate-900 text-white p-4 rounded-2xl relative overflow-hidden group cursor-pointer">
                                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="text-[10px] opacity-60 font-bold uppercase">Local Time</div>
                                        <div className="text-2xl font-mono font-bold">01:14 AM</div>
                                    </div>
                                </div>

                                {/* Main Content */}
                                <div className="flex-1 p-4 md:p-8 overflow-y-auto no-scrollbar">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 md:mb-8 gap-4">
                                        <div>
                                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Good Morning, Executive</p>
                                            <h2 className="text-2xl md:text-3xl font-black text-slate-900">Gecko RMS</h2>
                                        </div>
                                        <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2">
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shrink-0" /> Falgun 7, 2082
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
                                        {[
                                            { label: "Revenue", val: "Rs 4,070", icon: Banknote, color: "text-emerald-600", bg: "bg-emerald-50", up: "109%" },
                                            { label: "Orders", val: "10", icon: ShoppingBag, color: "text-blue-600", bg: "bg-blue-50", up: "233%" },
                                            { label: "Kitchen Active", val: "7", icon: ChefHat, color: "text-orange-600", bg: "bg-orange-50", up: null },
                                            { label: "Avg Ticket", val: "Rs 407", icon: Activity, color: "text-purple-600", bg: "bg-purple-50", up: null },
                                        ].map((stat, i) => (
                                            <div key={i} className="bg-white p-4 md:p-5 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between h-28 md:h-32">
                                                <div className="flex justify-between items-start">
                                                    <div className={cn("w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center shrink-0", stat.bg)}>
                                                        <stat.icon className={cn("w-4 h-4 md:w-5 md:h-5", stat.color)} />
                                                    </div>
                                                    {stat.up && <span className="text-[9px] md:text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full shrink-0">↗ {stat.up}</span>}
                                                </div>
                                                <div>
                                                    <div className="text-xl md:text-2xl font-black text-slate-900 truncate">{stat.val}</div>
                                                    <div className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase truncate">{stat.label}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                                        <div className="col-span-1 lg:col-span-2 bg-white rounded-2xl md:rounded-3xl border border-slate-100 p-4 md:p-6 shadow-sm overflow-hidden flex flex-col">
                                            <div className="flex justify-between items-center mb-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-emerald-50 rounded-lg shrink-0"><Activity className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" /></div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 text-sm md:text-base">Live Monitor</h3>
                                                        <p className="text-[10px] md:text-xs text-slate-400">Real-time transactions</p>
                                                    </div>
                                                </div>
                                                <button className="bg-slate-900 text-white text-[10px] md:text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors shrink-0">Export CSV</button>
                                            </div>
                                            <div className="space-y-2 md:space-y-4 flex-1 overflow-y-auto pr-1">
                                                {[1,2,3].map((i) => (
                                                    <div key={i} className="flex items-center justify-between p-2 md:p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100">
                                                        <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                                                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-100 flex items-center justify-center text-[10px] md:text-xs font-bold text-slate-500 shrink-0">#{860+i}</div>
                                                            <div className="truncate">
                                                                <div className="font-bold text-slate-900 text-xs md:text-sm truncate">{3-i} Items Ordered</div>
                                                                <div className="text-[9px] md:text-[10px] font-bold text-orange-400 truncate">SERVED • 01:06 PM</div>
                                                            </div>
                                                        </div>
                                                        <div className="font-bold text-slate-900 text-xs md:text-sm shrink-0">Rs {1300 - (i*200)}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="col-span-1 bg-[#0B1120] rounded-2xl md:rounded-3xl p-5 md:p-6 text-white relative overflow-hidden shadow-2xl">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl animate-pulse" />
                                            <h3 className="font-bold mb-6 relative z-10 flex items-center gap-2 text-sm md:text-base"><div className="w-1 h-4 bg-emerald-500 rounded-full shrink-0"/> Top Movers</h3>
                                            <div className="space-y-3 md:space-y-4 relative z-10">
                                                {[
                                                    { n: "Chicken Momo", q: 5, bg: "bg-emerald-500" },
                                                    { n: "Mojito", q: 4, bg: "bg-blue-500" },
                                                    { n: "Fried Momo", q: 3, bg: "bg-orange-500" }
                                                ].map((item, i) => (
                                                    <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                                                        <div className="flex items-center gap-2 md:gap-3 truncate pr-2">
                                                            <div className="text-emerald-400 font-bold text-[10px] md:text-xs shrink-0">0{i+1}</div>
                                                            <div className="text-xs md:text-sm font-bold truncate">{item.n}</div>
                                                        </div>
                                                        <div className="text-[10px] md:text-xs font-mono text-slate-400 shrink-0">{item.q} SOLD</div>
                                                        <div className={cn("absolute bottom-0 left-0 h-0.5 rounded-full transition-all duration-1000", item.bg)} style={{ width: `${(item.q/5)*100}%` }} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* --- 2. POS / MENU (Mobile Fixed Stack) --- */}
                         {activeTab === "pos" && (
                             <motion.div 
                                key="pos"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.02 }}
                                transition={{ duration: 0.3, ease: EASE_PREMIUM }}
                                className="absolute inset-0 flex flex-col lg:flex-row bg-[#F8FAFC] transform-gpu"
                            >
                                {/* Menu Grid */}
                                <div className="flex-1 p-4 md:p-6 overflow-y-auto no-scrollbar">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                                        <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                                            <button className="p-2 md:p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shrink-0"><ArrowRight className="w-4 h-4 rotate-180"/></button>
                                            <div className="truncate">
                                                <h2 className="text-xl md:text-2xl font-black text-slate-900 truncate">Menu</h2>
                                                <div className="text-[10px] md:text-xs text-slate-500 truncate">Ordering for <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">Table M-1</span></div>
                                            </div>
                                        </div>
                                        <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center sm:items-end shrink-0">
                                            <span className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase">Revenue</span>
                                            <span className="text-base md:text-lg font-black text-slate-900">Rs 3,140</span>
                                        </div>
                                    </div>

                                    {/* Search & Filter - Horizontal scroll on mobile */}
                                    <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-6">
                                        <div className="flex-1 relative shrink-0">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input type="text" placeholder="Search dishes..." className="w-full pl-10 pr-4 py-2.5 md:py-3 rounded-xl border border-slate-200 bg-white text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
                                        </div>
                                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0 shrink-0">
                                            <button className="px-4 py-2.5 md:py-3 bg-slate-900 text-white rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 whitespace-nowrap shrink-0"><Utensils className="w-3 h-3 md:w-4 md:h-4"/> All</button>
                                            <button className="px-4 py-2.5 md:py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs md:text-sm font-bold hover:bg-slate-50 whitespace-nowrap shrink-0">Chef Specials</button>
                                            <button className="px-4 py-2.5 md:py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs md:text-sm font-bold hover:bg-slate-50 whitespace-nowrap shrink-0">Bar</button>
                                        </div>
                                    </div>

                                    {/* Items Grid */}
                                    <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 md:gap-6 pb-20 lg:pb-0">
                                        {[
                                            { name: "Signature Burger", price: 650, desc: "Double patty with cheese.", icon: "🍔" },
                                            { name: "Mojito", price: 450, desc: "Fresh mint and lime.", icon: "🍹" },
                                            { name: "Chicken Momo", price: 350, desc: "Steamed perfection.", icon: "🥟" },
                                            { name: "Spaghetti", price: 550, desc: "Italian tomato sauce.", icon: "🍝" }
                                        ].map((item, i) => (
                                            <div key={i} className="bg-white p-3 md:p-5 rounded-2xl md:rounded-3xl border border-slate-200 hover:border-emerald-500 hover:shadow-lg transition-all group cursor-pointer relative flex flex-col h-full">
                                                <div className="flex justify-between items-start mb-2 md:mb-4">
                                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center font-bold text-sm md:text-lg shrink-0">{item.icon}</div>
                                                    <span className="text-[10px] md:text-sm font-black text-slate-900 shrink-0">Rs {item.price}</span>
                                                </div>
                                                <h3 className="font-bold text-slate-900 text-xs md:text-base mb-1 truncate">{item.name}</h3>
                                                <p className="text-[10px] md:text-xs text-slate-500 mb-4 flex-1 line-clamp-2">{item.desc}</p>
                                                <button className="w-full py-1.5 md:py-2 rounded-xl bg-slate-50 text-slate-600 font-bold text-[10px] md:text-xs group-hover:bg-slate-900 group-hover:text-white transition-colors mt-auto shrink-0">+ Add</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Current Order Sidebar - Responsive positioning */}
                                <div className="w-full lg:w-80 h-[280px] lg:h-full bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col shadow-xl z-20 shrink-0">
                                    <div className="p-4 md:p-6 border-b border-slate-100 shrink-0">
                                        <div className="flex justify-between items-center mb-1">
                                            <h3 className="font-bold text-base md:text-lg text-slate-900">Current Order</h3>
                                            <span className="bg-slate-900 text-white text-[9px] md:text-[10px] font-bold px-2 py-0.5 rounded shrink-0">0 Items</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-bold text-emerald-600 uppercase">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" /> Table M-1 • Available
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 opacity-50 min-h-0">
                                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3 md:mb-4 shrink-0">
                                            <ShoppingBag className="w-6 h-6 md:w-8 md:h-8 text-slate-300" />
                                        </div>
                                        <p className="text-xs md:text-sm font-bold text-slate-400 text-center px-4">Add items to start</p>
                                    </div>

                                    <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-200 shrink-0">
                                        <div className="flex justify-between items-center mb-3 md:mb-4 text-xs md:text-sm">
                                            <span className="text-slate-500">Subtotal</span>
                                            <span className="font-bold text-slate-900">Rs 0</span>
                                        </div>
                                        <div className="flex justify-between items-center mb-4 md:mb-6 text-lg md:text-xl">
                                            <span className="font-bold text-slate-900">Total</span>
                                            <span className="font-black text-slate-900">Rs 0</span>
                                        </div>
                                        <div className="flex gap-2 md:gap-3">
                                            <button className="p-2 md:p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-red-500 hover:border-red-200 shrink-0"><Trash2 className="w-4 h-4 md:w-5 md:h-5"/></button>
                                            <button className="flex-1 bg-slate-400 text-white font-bold rounded-xl py-2 md:py-3 flex items-center justify-center gap-2 cursor-not-allowed text-sm">
                                                <Zap className="w-4 h-4 fill-white" /> Place Order
                                            </button>
                                        </div>
                                    </div>
                                </div>
                             </motion.div>
                         )}

                        {/* --- 3. KITCHEN DISPLAY (KitchenOS) --- */}
                        {activeTab === "kitchen" && (
                            <motion.div 
                                key="kitchen"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.02 }}
                                transition={{ duration: 0.3, ease: EASE_PREMIUM }}
                                className="absolute inset-0 bg-[#F1F5F9] flex flex-col transform-gpu"
                            >
                                <div className="h-12 md:h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shadow-sm z-20 shrink-0">
                                    <div className="flex items-center gap-2 md:gap-3">
                                        <div className="p-1 md:p-1.5 bg-slate-900 rounded-lg text-white shrink-0"><ChefHat className="w-4 h-4 md:w-5 md:h-5"/></div>
                                        <span className="font-black text-base md:text-xl text-slate-900 hidden sm:inline">Kitchen<span className="text-emerald-500">OS</span></span>
                                        <span className="text-[9px] md:text-[10px] font-bold bg-emerald-100 text-emerald-600 px-1.5 md:px-2 py-0.5 rounded-full ml-1 md:ml-2 flex items-center gap-1 shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/> LIVE</span>
                                    </div>
                                    <div className="text-base md:text-xl font-mono font-bold text-slate-900 shrink-0">01:14 AM</div>
                                </div>
                                <div className="flex-1 p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 overflow-y-auto no-scrollbar pb-10">
                                    {/* New Orders Column */}
                                    <div className="flex flex-col h-full bg-white rounded-2xl border-2 border-slate-200/60 border-dashed relative min-h-[250px] md:min-h-[400px]">
                                        <div className="p-3 md:p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl shrink-0">
                                            <span className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Bell className="w-3 h-3 md:w-4 md:h-4"/> New</span>
                                            <span className="bg-blue-500 text-white text-[9px] md:text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">0</span>
                                        </div>
                                        <div className="flex-1 flex items-center justify-center opacity-30 min-h-0">
                                            <div className="text-center">
                                                <Utensils className="w-8 h-8 md:w-12 md:h-12 text-slate-300 mx-auto mb-2" />
                                                <p className="text-[10px] md:text-xs font-bold text-slate-400">ALL CAUGHT UP</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Cooking Column */}
                                    <div className="flex flex-col h-full bg-white rounded-2xl border border-orange-100 shadow-[0_0_30px_-10px_rgba(249,115,22,0.1)] min-h-[350px] md:min-h-[400px]">
                                        <div className="p-3 md:p-4 border-b border-orange-100 flex justify-between items-center bg-orange-50/50 rounded-t-2xl shrink-0">
                                            <span className="text-[10px] md:text-xs font-bold text-orange-600 uppercase tracking-widest flex items-center gap-2"><div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-orange-500 animate-pulse shrink-0"/> Cooking</span>
                                            <span className="bg-orange-500 text-white text-[9px] md:text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">2</span>
                                        </div>
                                        <div className="p-3 md:p-4 space-y-3 md:space-y-4 overflow-y-auto min-h-0">
                                            {[1, 2].map(i => (
                                                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i*0.1 }} key={i} className="p-3 md:p-4 bg-white rounded-xl border border-slate-200 shadow-sm relative overflow-hidden transform-gpu shrink-0">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-orange-500 shrink-0" />
                                                    <div className="flex justify-between mb-2 md:mb-3 pl-2 md:pl-3">
                                                        <span className="font-bold text-slate-900 text-sm md:text-base">Table {i+2}</span>
                                                        <span className="text-[10px] md:text-xs font-mono text-slate-400 bg-slate-100 px-1.5 md:px-2 py-0.5 md:py-1 rounded shrink-0">4:2{i} PM</span>
                                                    </div>
                                                    <div className="space-y-1.5 md:space-y-2 mb-3 md:mb-4 pl-2 md:pl-3">
                                                        <div className="text-xs md:text-sm font-bold text-slate-700 flex justify-between items-start gap-2"><span>1x Chicken Momo</span> <span className="text-slate-400 font-normal shrink-0">Steam</span></div>
                                                        <div className="text-xs md:text-sm font-bold text-slate-700 flex justify-between items-start gap-2"><span>2x Coke</span> <span className="text-slate-400 font-normal shrink-0">Chilled</span></div>
                                                    </div>
                                                    <button className="w-full py-1.5 md:py-2 bg-emerald-500 text-white text-[10px] md:text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 shrink-0">Mark Ready</button>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Ready Column */}
                                    <div className="flex flex-col h-full bg-white rounded-2xl border-2 border-slate-200/60 border-dashed min-h-[250px] md:min-h-[400px]">
                                        <div className="p-3 md:p-4 border-b border-slate-100 flex justify-between items-center bg-emerald-50/50 rounded-t-2xl shrink-0">
                                            <span className="text-[10px] md:text-xs font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-2"><CheckCircle2 className="w-3 h-3 md:w-4 md:h-4"/> Ready</span>
                                            <span className="bg-emerald-500 text-white text-[9px] md:text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">0</span>
                                        </div>
                                        <div className="flex-1 flex items-center justify-center opacity-30 min-h-0">
                                            <div className="text-center">
                                                <Bell className="w-8 h-8 md:w-12 md:h-12 text-slate-300 mx-auto mb-2" />
                                                <p className="text-[10px] md:text-xs font-bold text-slate-400">NO PENDING</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* --- 4. WAITER HUB --- */}
                        {activeTab === "waiter" && (
                            <motion.div 
                                key="waiter"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.02 }}
                                transition={{ duration: 0.3, ease: EASE_PREMIUM }}
                                className="absolute inset-0 bg-[#F8F9FB] flex flex-col md:flex-row transform-gpu"
                            >
                                <div className="w-20 bg-white border-r border-slate-100 hidden md:flex flex-col items-center py-6 gap-6 z-20 shadow-sm shrink-0">
                                    <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center text-white font-bold shadow-md shrink-0">Y</div>
                                    <div className="flex-1 flex flex-col gap-4">
                                        {[Grid, Plus, Bell].map((Icon, i) => (
                                            <div key={i} className={cn("p-3 rounded-xl cursor-pointer transition-colors shrink-0", i === 0 ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-50")}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs shrink-0">W</div>
                                </div>
                                <div className="flex-1 p-4 md:p-8 overflow-y-auto no-scrollbar flex flex-col">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-8 gap-4 shrink-0">
                                        <h2 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2">Waiter Hub <RefreshCw className="w-3 h-3 md:w-4 md:h-4 text-emerald-500"/></h2>
                                        <div className="flex gap-2 overflow-x-auto w-full sm:w-auto no-scrollbar pb-2 sm:pb-0 shrink-0">
                                            {["All", "Main Hall", "Rooftop"].map((loc, i) => (
                                                <button key={loc} className={cn("px-3 md:px-4 py-1.5 rounded-full text-[10px] md:text-xs font-bold transition-all whitespace-nowrap shrink-0", i===0 ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300")}>{loc}</button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-8 shrink-0">
                                        <div className="col-span-2 lg:col-span-1 bg-emerald-600 rounded-2xl md:rounded-3xl p-5 md:p-6 text-white shadow-lg shadow-emerald-600/20 relative overflow-hidden flex flex-col justify-center">
                                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl transform-gpu" />
                                            <div className="text-[10px] md:text-xs font-bold opacity-80 uppercase mb-1 relative z-10">My Sales</div>
                                            <div className="text-2xl md:text-3xl font-black relative z-10">Rs 3,140</div>
                                        </div>
                                        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 border border-slate-100 shadow-sm flex flex-col justify-center items-center h-24 md:h-auto">
                                            <div className="text-2xl md:text-3xl font-black text-slate-900 mb-0 md:mb-1">5</div>
                                            <div className="text-[9px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Vacant</div>
                                        </div>
                                        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 border border-slate-100 shadow-sm flex flex-col justify-center items-center h-24 md:h-auto">
                                            <div className="text-2xl md:text-3xl font-black text-slate-900 mb-0 md:mb-1">3</div>
                                            <div className="text-[9px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Occupied</div>
                                        </div>
                                    </div>

                                    {/* Interactive Floor Plan Grid - Mobile Optimized (touch-none) */}
                                    <div className="flex-1 bg-white rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 min-h-[300px] md:min-h-[400px] relative p-4 md:p-6 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] shadow-inner overflow-hidden mb-16 md:mb-0">
                                        <div className="absolute top-4 left-4 md:top-6 md:left-6 text-[9px] md:text-xs font-bold text-slate-400 uppercase bg-white/80 px-2 py-1 rounded backdrop-blur-sm z-10">Live Floor Map</div>
                                        
                                        {/* Draggable Tables Simulation */}
                                        <motion.div 
                                            drag 
                                            dragConstraints={{ left: 0, right: 150, top: 0, bottom: 150 }} 
                                            whileHover={{ scale: 1.05 }}
                                            className="absolute top-1/4 left-1/4 bg-white border-2 border-emerald-500 shadow-xl w-24 md:w-28 h-24 md:h-28 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center cursor-grab active:cursor-grabbing z-20 touch-none transform-gpu"
                                        >
                                            <span className="font-bold text-slate-900 text-sm md:text-lg">Table 1</span>
                                            <div className="flex items-center gap-1 text-[9px] md:text-[10px] text-slate-500 bg-slate-100 px-1.5 md:px-2 py-0.5 rounded-full mt-1 shrink-0">
                                                <Users className="w-2.5 h-2.5 md:w-3 md:h-3" /> 4 Pax
                                            </div>
                                        </motion.div>

                                        <motion.div 
                                            className="absolute top-[10%] right-[10%] bg-white border border-slate-200 w-20 md:w-36 h-16 md:h-24 rounded-xl md:rounded-3xl flex flex-col items-center justify-center opacity-60 hover:opacity-100 transition-opacity cursor-pointer transform-gpu"
                                        >
                                            <span className="font-bold text-slate-400 text-sm md:text-lg">R-2</span>
                                            <span className="text-[8px] md:text-[10px] text-slate-300">Empty</span>
                                        </motion.div>

                                        <motion.div 
                                            className="absolute bottom-1/4 right-1/4 md:left-1/3 bg-white border border-slate-200 w-16 md:w-24 h-16 md:h-24 rounded-full flex flex-col items-center justify-center opacity-60 hover:opacity-100 transition-opacity cursor-pointer transform-gpu"
                                        >
                                            <span className="font-bold text-slate-400 text-sm md:text-lg">M-1</span>
                                            <span className="text-[8px] md:text-[10px] text-slate-300">Empty</span>
                                        </motion.div>

                                        {/* Floating Action Bar */}
                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] md:w-auto bg-slate-900 text-white p-1.5 md:p-2 pl-4 md:pl-6 pr-1.5 md:pr-2 rounded-full shadow-2xl flex items-center justify-between md:justify-center gap-4 md:gap-6 z-30 transform-gpu">
                                            <span className="text-[10px] md:text-sm font-bold truncate">Quick Actions</span>
                                            <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 md:px-4 py-2 rounded-full font-bold text-[10px] md:text-xs transition-colors flex items-center gap-1 md:gap-2 shrink-0 whitespace-nowrap">
                                                <Plus className="w-3 h-3 md:w-4 md:h-4"/> New Order
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </div>
        </section>
    )
}

// --- 5. QR & MOBILE SHOWCASE ---
function QREcosystemShowcase() {
    return (
        <section className="py-20 md:py-24 bg-white overflow-hidden">
            <div className="container mx-auto px-4 md:px-6 max-w-7xl">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-12 items-center">
                    
                    {/* LEFT: QR Generator Card */}
                    <SpotlightCard className="p-8 md:p-12 border-slate-100 bg-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-40 md:w-64 h-40 md:h-64 bg-slate-50 rounded-bl-[60px] md:rounded-bl-[100px] -z-10 transform-gpu" />
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-white border border-slate-200 rounded-xl md:rounded-2xl flex items-center justify-center shadow-sm mb-6 md:mb-8">
                            <QrCode className="w-6 h-6 md:w-8 md:h-8 text-slate-900" />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 md:mb-6 leading-tight">Instant QR Menus.</h2>
                        <p className="text-slate-500 text-base md:text-lg mb-8 md:mb-10 leading-relaxed">
                            Generate unique QR codes for every table. Customers scan to view your live menu, updated instantly. No reprints needed.
                        </p>
                        
                        <div className="bg-white p-6 md:p-8 rounded-3xl md:rounded-[2rem] border border-slate-200 shadow-2xl max-w-[280px] md:max-w-sm mx-auto relative group">
                            <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl md:rounded-[2rem]" />
                            <div className="flex flex-col items-center">
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full shadow-md flex items-center justify-center mb-4 md:mb-6 border border-slate-100 relative z-10 shrink-0">
                                    <Leaf className="w-5 h-5 md:w-6 md:h-6 text-emerald-500" />
                                </div>
                                <div className="p-3 md:p-4 bg-slate-900 rounded-xl md:rounded-2xl mb-3 md:mb-4 shrink-0">
                                     <QrCode className="w-24 h-24 md:w-32 md:h-32 text-white" />
                                </div>
                                <h3 className="text-lg md:text-xl font-bold text-slate-900">Gecko RMS</h3>
                                <div className="flex items-center gap-1.5 md:gap-2 mt-1 md:mt-2">
                                    <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-emerald-500 rounded-full animate-pulse shrink-0" />
                                    <span className="text-[10px] md:text-xs font-bold text-emerald-600 uppercase">Active Menu</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 md:gap-3 mt-6 md:mt-8">
                                <button className="flex items-center justify-center gap-1 md:gap-2 py-2.5 md:py-3 bg-slate-50 hover:bg-slate-100 rounded-lg md:rounded-xl text-slate-600 text-[10px] md:text-xs font-bold transition-colors shrink-0">
                                    <Copy className="w-3 h-3 md:w-4 md:h-4"/> Copy
                                </button>
                                <button className="flex items-center justify-center gap-1 md:gap-2 py-2.5 md:py-3 bg-slate-900 text-white rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold shadow-lg shadow-slate-900/20 shrink-0">
                                    <Share className="w-3 h-3 md:w-4 md:h-4"/> Save
                                </button>
                            </div>
                        </div>
                    </SpotlightCard>

                    {/* RIGHT: Mobile Preview */}
                    <div className="relative flex justify-center lg:justify-end py-10 lg:py-0">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-slate-100/50 rounded-full blur-[60px] md:blur-[80px] -z-10 transform-gpu" />
                        
                        {/* Phone Mockup */}
                        <motion.div 
                            initial={{ y: 20, opacity: 0 }}
                            whileInView={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.6, ease: EASE_PREMIUM }}
                            viewport={{ once: true, amount: 0.1 }}
                            className="w-[280px] md:w-[320px] h-[580px] md:h-[650px] bg-slate-900 rounded-[2.5rem] md:rounded-[3rem] border-[6px] md:border-[8px] border-slate-900 shadow-2xl relative overflow-hidden transform-gpu shrink-0"
                        >
                            {/* Dynamic Island */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 md:w-28 h-5 md:h-7 bg-black rounded-b-xl md:rounded-b-2xl z-30 shrink-0" />
                            
                            {/* Screen Content */}
                            <div className="w-full h-full bg-[#FAFAFA] overflow-y-auto no-scrollbar pb-20">
                                <div className="p-4 md:p-6 pt-10 md:pt-12 bg-white sticky top-0 z-20 shadow-sm shrink-0">
                                    <div className="flex justify-between items-center mb-3 md:mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 md:w-8 md:h-8 bg-emerald-100 rounded-full flex items-center justify-center shrink-0"><Leaf className="w-3 h-3 md:w-4 md:h-4 text-emerald-600"/></div>
                                            <div>
                                                <h3 className="text-xs md:text-sm font-bold text-slate-900 leading-tight">Gecko RMS.</h3>
                                                <p className="text-[9px] md:text-[10px] text-emerald-600 font-bold leading-tight">● Live Menu</p>
                                            </div>
                                        </div>
                                        <Search className="w-4 h-4 md:w-5 md:h-5 text-slate-400 shrink-0" />
                                    </div>
                                    <div className="w-full h-8 md:h-10 bg-slate-100 rounded-lg md:rounded-xl flex items-center px-3 md:px-4 text-[10px] md:text-xs text-slate-400">Search for dishes...</div>
                                </div>

                                {/* Menu Items */}
                                <div className="p-4 space-y-4 md:space-y-6">
                                    <div>
                                        <h4 className="text-[10px] md:text-xs font-bold text-slate-500 uppercase mb-2 md:mb-3 flex justify-between">Chef Specials <span className="text-slate-300">2</span></h4>
                                        <div className="space-y-2 md:space-y-3">
                                            {[
                                                { n: "Signature Burger", p: 650, d: "Double patty.", i: "🍔" },
                                                { n: "Chicken Momo", p: 350, d: "Steam/Jhol.", i: "🥟" }
                                            ].map((item, i) => (
                                                <div key={i} className="bg-white p-2.5 md:p-3 rounded-xl md:rounded-2xl shadow-sm border border-slate-100 flex gap-2.5 md:gap-3 shrink-0">
                                                    <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-50 rounded-lg md:rounded-xl flex items-center justify-center text-xl md:text-2xl shrink-0">{item.i}</div>
                                                    <div className="flex-1 min-w-0">
                                                        <h5 className="font-bold text-slate-900 text-xs md:text-sm truncate">{item.n}</h5>
                                                        <p className="text-[9px] md:text-[10px] text-slate-400 mb-1.5 md:mb-2 truncate">{item.d}</p>
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-bold text-[10px] md:text-xs text-slate-900 shrink-0">Rs {item.p}</span>
                                                            <button className="w-5 h-5 md:w-6 md:h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs shrink-0">+</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-[10px] md:text-xs font-bold text-slate-500 uppercase mb-2 md:mb-3">Bar & Drinks</h4>
                                        <div className="bg-white p-2.5 md:p-3 rounded-xl md:rounded-2xl shadow-sm border border-slate-100 flex gap-2.5 md:gap-3 shrink-0">
                                            <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-50 rounded-lg md:rounded-xl flex items-center justify-center text-xl md:text-2xl shrink-0">🍹</div>
                                            <div className="flex-1 min-w-0">
                                                <h5 className="font-bold text-slate-900 text-xs md:text-sm truncate">Mojito</h5>
                                                <p className="text-[9px] md:text-[10px] text-slate-400 mb-1.5 md:mb-2 truncate">Fresh mint.</p>
                                                <div className="flex justify-between items-center">
                                                    <span className="font-bold text-[10px] md:text-xs text-slate-900 shrink-0">Rs 450</span>
                                                    <button className="w-5 h-5 md:w-6 md:h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs shrink-0">+</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Bottom Bar */}
                            <div className="absolute bottom-3 md:bottom-4 left-3 md:left-4 right-3 md:right-4 bg-slate-900 text-white p-3 md:p-4 rounded-xl md:rounded-2xl shadow-2xl flex justify-between items-center z-30 cursor-pointer transform-gpu shrink-0">
                                <div className="flex items-center gap-2 md:gap-3">
                                    <div className="w-6 h-6 md:w-8 md:h-8 bg-white/20 rounded-full flex items-center justify-center text-[10px] md:text-xs shrink-0">1</div>
                                    <div className="text-[10px] md:text-xs font-bold">View Order</div>
                                </div>
                                <span className="font-bold text-xs md:text-sm shrink-0">Rs 450</span>
                            </div>

                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    )
}

// --- 6. HERO COMPONENT ---
function Hero() {
    return (
        <section className="pt-28 md:pt-40 lg:pt-44 pb-16 md:pb-20 container mx-auto px-4 md:px-6 relative z-10">
         <div className="flex flex-col items-center text-center max-w-5xl mx-auto">
             <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="mb-6 md:mb-8 inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1 md:py-1.5 rounded-full bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-default transform-gpu shrink-0"
             >
                <CloudLightning className="w-3 h-3 text-emerald-500 shrink-0" />
                <span className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">Powerful. Fast. Seamless.</span>
             </motion.div>

             <h1 className="text-[2.75rem] sm:text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter text-slate-900 mb-6 md:mb-8 leading-[0.95] md:leading-[0.9] drop-shadow-sm relative z-20">
                Speed is a <br className="hidden sm:block" />
                <span className="relative inline-block text-slate-900">
                    Superpower<span className="text-emerald-500">.</span>
                    <svg className="absolute w-full h-3 md:h-4 -bottom-1 left-0 overflow-visible pointer-events-none transform-gpu" viewBox="0 0 100 10" preserveAspectRatio="none">
                        <motion.path 
                            d="M0,5 Q50,10 100,5"
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="8"
                            strokeLinecap="round"
                            variants={drawVariant}
                            initial="hidden"
                            animate="visible"
                            className="opacity-80"
                        />
                    </svg>
                </span>
            </h1>

             <motion.p variants={fadeUpVariant} initial="hidden" animate="visible" custom={0.2} className="text-base sm:text-lg md:text-2xl text-slate-500 font-medium leading-relaxed max-w-2xl mb-8 md:mb-12 px-2">
                The <span className="text-slate-900 font-bold">web-based</span> operating system for high-volume restaurants in Nepal. 
                Syncs menus, orders, and inventory in real-time.
             </motion.p>

             <motion.div variants={fadeUpVariant} initial="hidden" animate="visible" custom={0.3} className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-16 md:mb-24 w-full sm:w-auto justify-center px-4">
                <Link href="/signup" className="w-full sm:w-auto shrink-0">
                    <MagneticButton className="h-14 md:h-16 px-8 md:px-12 text-base md:text-lg w-full bg-slate-900 text-white rounded-full">
                        Start Free Trial <ArrowRight className="w-4 h-4 md:w-5 md:h-5 ml-1 md:ml-2 group-hover:translate-x-1 transition-transform shrink-0" />
                    </MagneticButton>
                </Link>
                <MagneticButton variant="outline" className="h-14 md:h-16 px-8 md:px-10 text-base md:text-lg w-full sm:w-auto rounded-full shrink-0">Watch Demo</MagneticButton>
             </motion.div>
         </div>
      </section>
    )
}

// --- 7. MAIN PAGE COMPONENT ---
export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const pathLength = useSpring(scrollYProgress, { stiffness: 400, damping: 90 });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-emerald-500 selection:text-white overflow-x-hidden">
      
      {/* SCROLL BEAM (Desktop) */}
      <div className="fixed left-6 md:left-12 top-0 bottom-0 w-px z-0 hidden xl:block pointer-events-none transform-gpu">
          <svg viewBox="0 0 10 1000" className="h-full w-full overflow-visible transform-gpu">
              <motion.path d="M 5 0 V 10000" fill="none" stroke="#E2E8F0" strokeWidth="2" strokeDasharray="4 4" />
              <motion.circle cx="5" cy="0" r="3" fill="#10b981" style={{ offsetDistance: pathLength }} />
              <motion.path d="M 5 0 V 10000" fill="none" stroke="#10B981" strokeWidth="2" style={{ pathLength }} strokeLinecap="round" />
          </svg>
      </div>

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-3 px-3 md:pt-6">
         <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full max-w-6xl h-14 md:h-16 bg-white/90 backdrop-blur-xl border border-slate-200/60 shadow-lg shadow-slate-200/10 rounded-full flex items-center justify-between px-3 md:px-6 transform-gpu shrink-0"
         >
             <div className="flex items-center gap-2 md:gap-3 shrink-0">
               <img src="/paw.png" alt="Gecko" className="w-6 h-6 md:w-8 md:h-8 object-contain shrink-0" />
               <span className="font-black text-lg md:text-xl tracking-tight text-slate-900 z-50 relative shrink-0">Gecko<span className="text-emerald-500">RMS</span></span>
             </div>
             
             <div className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-500 uppercase tracking-widest shrink-0">
                {["Features", "Pricing", "About"].map(item => (
                    <Link key={item} href={`/${item.toLowerCase()}`} className="hover:text-emerald-600 transition-colors relative group whitespace-nowrap">
                        {item}
                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-emerald-500 transition-all group-hover:w-full" />
                    </Link>
                ))}
             </div>

             <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                 <Link href="/login" className="hidden sm:block shrink-0">
                    <MagneticButton variant="ghost" className="h-9 px-3 md:h-11 md:px-5 text-xs whitespace-nowrap">Login</MagneticButton>
                 </Link>
                 <Link href="/signup" className="shrink-0">
                     <MagneticButton className="h-9 px-4 md:h-11 md:px-6 text-xs bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 text-white border-none whitespace-nowrap">
                        Get Started
                     </MagneticButton>
                 </Link>
                 <button className="md:hidden p-2 bg-slate-100 rounded-full text-slate-900 z-50 relative hover:bg-slate-200 transition-colors shrink-0" onClick={() => setMobileMenuOpen(true)}>
                    <Menu className="w-4 h-4 sm:w-5 sm:h-5"/>
                 </button>
             </div>
         </motion.div>
      </nav>

      {/* 1. HERO */}
      <Hero />

      {/* 2. PARTNERS MARQUEE */}
      <section className="py-6 md:py-10 bg-white border-y border-slate-100 overflow-hidden transform-gpu">
          <p className="text-center text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 md:mb-8">Trusted RMS for Nepal’s Restaurants</p>
          <div className="relative flex overflow-x-hidden transform-gpu">
              <motion.div 
                 animate={{ x: ["0%", "-50%"] }} 
                 transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
                 className="flex gap-10 md:gap-16 whitespace-nowrap px-4 md:px-8 transform-gpu will-change-transform"
              >
                  {[...Array(2)].map((_, i) => (
                      <React.Fragment key={i}>
                        {[
                          "GeckoRMS", "Orders", "Tables", "Kitchen", "Menu", "POS", "Revenue", "Sales", "Staff", "Inventory", "Customers", "Order Up"
                        ].map((item, j) => (
                          <span key={j} className="text-lg md:text-2xl font-black text-slate-200 uppercase shrink-0">{item}</span>
                        ))}
                      </React.Fragment>
                  ))}
              </motion.div>
          </div>
      </section>

      {/* 3. QUAD-OS DASHBOARD (Interactive) */}
      <TrinityDashboardShowcase />

      {/* 4. QR ECOSYSTEM SHOWCASE */}
      <QREcosystemShowcase />

      {/* 5. FEATURES BENTO GRID */}
      <section className="py-20 md:py-32 relative z-10 overflow-hidden" id="features">
         <div className="container mx-auto px-4 md:px-6 max-w-7xl">
             <motion.div 
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.6, ease: EASE_PREMIUM }}
                className="mb-16 md:mb-24 pl-4 md:pl-10 border-l-4 border-emerald-500 transform-gpu"
             >
                 <h2 className="text-3xl sm:text-4xl md:text-6xl font-black text-slate-900 mb-4 md:mb-6 leading-tight">Built for Speed. <br className="hidden sm:block"/> Designed for Web.</h2>
                 <p className="text-base sm:text-lg md:text-xl text-slate-500 max-w-xl font-medium">Access your restaurant from anywhere. Your phone, laptop, or tablet is now a powerful POS.</p>
             </motion.div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 relative">
                 {/* Feature 1: Instant Sync */}
                 <SpotlightCard className="col-span-1 md:col-span-2 bg-slate-50/50 border-white/50">
                    <div className="p-6 sm:p-10 md:p-14 h-full flex flex-col md:flex-row items-center gap-8 md:gap-10 text-center md:text-left">
                        <div className="flex-1 space-y-4 md:space-y-6">
                            <div className="w-12 h-12 md:w-14 md:h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/10 border border-slate-100 mx-auto md:mx-0 shrink-0">
                                <RefreshCw className="w-6 h-6 md:w-7 md:h-7 text-emerald-600" />
                            </div>
                            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Instant Sync Engine</h3>
                            <p className="text-slate-500 text-base md:text-lg leading-relaxed">Changes propagate to all terminals in under 200ms. No refreshing required.</p>
                        </div>
                        <div className="flex-1 w-full flex justify-center py-6 md:py-0">
                            <div className="relative w-40 h-40 md:w-56 md:h-56 bg-white rounded-full flex items-center justify-center shadow-[0_0_60px_-15px_rgba(16,185,129,0.3)] shrink-0 transform-gpu">
                                <Server className="w-16 h-16 md:w-20 md:h-20 text-emerald-500 shrink-0" />
                                <div className="absolute inset-0 border-[3px] md:border-[4px] border-dashed border-emerald-200 rounded-full animate-[spin_8s_linear_infinite]" />
                            </div>
                        </div>
                    </div>
                 </SpotlightCard>

                 {/* Feature 2: Offline Mode */}
                 <SpotlightCard className="col-span-1 bg-white border-slate-200">
                     <div className="p-8 md:p-10 h-full flex flex-col justify-center text-center">
                         <div className="w-14 h-14 md:w-16 md:h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5 md:mb-6 shrink-0">
                            <Wifi className="w-7 h-7 md:w-8 md:h-8 text-red-500" />
                         </div>
                         <h3 className="text-xl md:text-2xl font-bold mb-2">Offline Mode</h3>
                         <p className="text-slate-500 text-sm md:text-base">Internet down? No problem. Gecko keeps working and syncs when back online.</p>
                     </div>
                 </SpotlightCard>

                  {/* Feature 3: Inventory */}
                  <SpotlightCard className="col-span-1 md:col-span-3">
                    <div className="p-6 sm:p-10 h-full flex flex-col md:flex-row items-center gap-8 md:gap-12 text-center md:text-left">
                        <div className="flex-1">
                            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3 md:mb-4">Inventory Intelligence</h3>
                            <p className="text-slate-500 text-base md:text-lg">Real-time stock deduction. Get alerts when you're running low on Momos or Beer.</p>
                        </div>
                        <div className="flex-1 w-full max-w-md bg-white border border-slate-100 rounded-xl md:rounded-2xl p-3 md:p-4 shadow-xl shrink-0">
                            <div className="flex items-center gap-2 md:gap-3 p-2.5 md:p-3 bg-red-50 rounded-lg md:rounded-xl border border-red-100">
                                <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-red-500 shrink-0" />
                                <div className="flex-1 text-left min-w-0">
                                    <p className="text-[10px] md:text-xs font-bold text-red-800 uppercase truncate">Low Stock Alert</p>
                                    <p className="text-xs md:text-sm font-bold text-slate-900 truncate">Tuborg Beer (650ml)</p>
                                </div>
                                <span className="text-lg md:text-xl font-black text-red-500 shrink-0">04</span>
                            </div>
                        </div>
                    </div>
                 </SpotlightCard>
             </div>
         </div>
      </section>

      {/* FOOTER CTA */}
      <section className="relative py-24 md:py-40 bg-[#020617] overflow-hidden transform-gpu">
          {/* Animated Mesh Grid */}
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.15] [mask-image:radial-gradient(ellipse_at_center,black,transparent)] pointer-events-none transform-gpu" />
          
          {/* Breathing Emerald Core */}
          <motion.div 
            animate={{ 
                scale: [1, 1.05, 1], // reduced scale factor to save repaint cost
                opacity: [0.15, 0.25, 0.15],
            }} 
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }} 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[1000px] h-[300px] md:h-[600px] bg-emerald-500/20 rounded-full blur-[80px] md:blur-[160px] pointer-events-none transform-gpu will-change-transform" 
          />

          <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.4 }}
                className="mb-6 md:mb-10 inline-flex items-center gap-2 md:gap-3 px-4 md:px-5 py-1.5 md:py-2 bg-white/5 border border-white/10 backdrop-blur-md rounded-full transform-gpu"
              >
                  <span className="relative flex h-1.5 w-1.5 md:h-2 md:w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 md:h-2 md:w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[9px] md:text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] shrink-0">Next-Gen Alpha Phase</span>
              </motion.div>

              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.6, ease: EASE_PREMIUM }}
                className="text-5xl sm:text-6xl md:text-[8rem] lg:text-[10rem] font-black tracking-tighter text-white mb-6 md:mb-8 leading-[0.85] md:leading-[0.8] drop-shadow-2xl transform-gpu"
              >
                Ready to <br className="hidden sm:block"/>
                <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/20">EVOLVE?</span>
              </motion.h2>

              <motion.p 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ delay: 0.2 }}
                className="text-slate-400 text-base md:text-xl lg:text-2xl mb-10 md:mb-16 max-w-2xl mx-auto font-medium leading-relaxed px-2 transform-gpu"
              >
                Stop losing revenue to slow systems. Join the elite group of restaurants weaponizing speed with GeckoOS.
              </motion.p>
              
              <div className="flex flex-col items-center gap-6 md:gap-8">
                 <Link href="/login" className="group relative shrink-0">
                    {/* Background Glow */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 transform-gpu z-0"></div>
                    
                    {/* The Button */}
                    <MagneticButton 
                        variant="ghost"
                        className="relative z-10 !bg-white !text-slate-950 h-16 md:h-20 px-10 md:px-16 rounded-full font-black text-lg md:text-2xl shadow-2xl transition-transform active:scale-95 transform-gpu shrink-0"
                    >
                        Join the Alpha <ArrowRight className="w-5 h-5 md:w-6 md:h-6 ml-2 group-hover:translate-x-2 transition-transform shrink-0" />
                    </MagneticButton>
                </Link>
                 <Link href="https://wa.me/9779765009755" target="_blank" className="flex items-center gap-2 md:gap-3 text-slate-500 hover:text-emerald-400 transition-colors py-2 px-4 rounded-full border border-transparent hover:border-white/10 hover:bg-white/5 font-bold text-xs md:text-sm tracking-wide shrink-0">
                    <MessageSquare className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
                    Talk to an Engineer
                 </Link>
              </div>
              
              <motion.div 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="mt-16 md:mt-24 pt-8 md:pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 text-slate-600 font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] text-[9px] md:text-[10px] transform-gpu"
              >
                  <div className="flex items-center gap-3 shrink-0">
                      <div className="w-4 md:w-8 h-[1px] bg-white/10 shrink-0" />
                      KATHMANDU, NEPAL
                      <div className="w-4 md:w-8 h-[1px] bg-white/10 shrink-0" />
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                      <div className="w-4 md:w-8 h-[1px] bg-white/10 shrink-0" />
                      GECKO RESTURANT MANAGEMENT SYSTEM
                      <div className="w-4 md:w-8 h-[1px] bg-white/10 shrink-0" />
                  </div>
              </motion.div>
          </div>

          {/* 3. PERFORMANCE DECORATION (Floating Particles) */}
          {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ 
                    y: [0, -100, 0],
                    x: [0, 50, 0],
                    opacity: [0, 1, 0] 
                }}
                transition={{ 
                    duration: 5 + i, 
                    repeat: Infinity, 
                    delay: i * 2,
                    ease: "easeInOut" 
                }}
                className="absolute w-1 h-1 bg-emerald-500/40 rounded-full transform-gpu will-change-transform pointer-events-none hidden md:block" // Hidden on mobile to save GPU processing
                style={{ 
                    top: `${20 + (i * 15)}%`, 
                    left: `${10 + (i * 20)}%` 
                }}
              />
          ))}
      </section>

      <AIChatWidget />

      {/* MOBILE MENU (Smoother Animation) */}
      <AnimatePresence>
        {mobileMenuOpen && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[60] bg-white/95 backdrop-blur-xl flex flex-col transform-gpu" // reduced blur for mobile performance
            >
                <div className="flex justify-end p-4 md:p-6 shrink-0">
                    <button className="p-2 md:p-3 bg-slate-100 rounded-full text-slate-900 shrink-0" onClick={() => setMobileMenuOpen(false)}>
                        <X className="w-5 h-5 md:w-6 md:h-6"/>
                    </button>
                </div>
                
                <motion.div 
                    variants={menuStagger}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    className="flex-1 flex flex-col items-center justify-center gap-6 md:gap-8 text-3xl md:text-4xl font-black text-slate-900 overflow-y-auto min-h-0"
                >
                    {["Features", "Pricing", "About"].map(item => (
                        <motion.div key={item} variants={menuItemVariant} className="shrink-0">
                            <Link href={`/${item.toLowerCase()}`} onClick={() => setMobileMenuOpen(false)} className="hover:text-emerald-500 transition-colors">
                                {item}
                            </Link>
                        </motion.div>
                    ))}
                    
                    <motion.div variants={menuItemVariant} className="w-10 h-1 bg-slate-100 rounded-full my-2 md:my-4 shrink-0" />
                    
                    <motion.div variants={menuItemVariant} className="shrink-0">
                         <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-emerald-600 text-xl md:text-2xl font-bold">Login</Link>
                    </motion.div>
                    
                    <motion.div variants={menuItemVariant} className="shrink-0 pb-10">
                        <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="text-slate-900 text-lg md:text-xl font-medium border border-slate-200 px-6 md:px-8 py-2.5 md:py-3 rounded-full mt-2 md:mt-4 block bg-white">
                            Start Free Trial
                        </Link>
                    </motion.div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}