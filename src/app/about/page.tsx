"use client";

import React, { useRef, useState, useEffect } from "react";
import {
    motion, useMotionTemplate, useMotionValue, AnimatePresence
} from "framer-motion";
import Link from "next/link";
import {
    Menu, X, Zap, Globe, ShieldCheck, ArrowRight, ArrowLeft, Activity, Server, Code2, Rocket, HeartHandshake, Laptop, Sparkles, Check, Clock, UserCheck, Utensils, Award, MessageSquareQuote, CheckCircle2, XCircle
} from "lucide-react";
import AIChatWidget from "@/components/landing/AIChatWidget";

// --- 1. UTILITY: TOUCH DETECTION ---
function useIsTouchDevice() {
    const [isTouch, setIsTouch] = useState(false);
    useEffect(() => {
        setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
    }, []);
    return isTouch;
}

// --- 2. COMPONENT: LIGHT SPOTLIGHT CARD ---
function LightSpotlightCard({ children, className = "" }: { children: React.ReactNode, className?: string }) {
    const isTouch = useIsTouchDevice();
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const spotlightBackground = useMotionTemplate`
        radial-gradient(
            500px circle at ${mouseX}px ${mouseY}px,
            rgba(16, 185, 129, 0.08),
            transparent 80%
        )
    `;

    function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
        if (isTouch) return;
        let { left, top } = currentTarget.getBoundingClientRect();
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
            onMouseMove={handleMouseMove}
            className={`group relative bg-white border-2 border-slate-300/80 rounded-[2.5rem] p-8 md:p-10 shadow-xl shadow-slate-200/40 hover:border-emerald-300 transition-all duration-300 transform-gpu ${className}`}
        >
            {!isTouch && (
                <motion.div
                    className="pointer-events-none absolute -inset-px rounded-[2.5rem] opacity-0 transition duration-500 group-hover:opacity-100"
                    style={{ background: spotlightBackground }}
                />
            )}
            <div className="relative z-10">{children}</div>
        </motion.div>
    );
}

// --- MAIN ABOUT PAGE ---
export default function AboutPage() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-[100dvh] bg-[#F8FAFC] selection:bg-emerald-500 selection:text-white font-sans overflow-x-hidden scroll-smooth">

            {/* 🌊 DYNAMIC LIGHT BACKGROUND BLOB (GPU Accelerated) */}
            <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden transform-gpu flex items-center justify-center">
                <motion.div
                    animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-200/30 rounded-full blur-[100px] will-change-transform"
                />
                <motion.div
                    animate={{ x: [0, -40, 0], y: [0, -50, 0] }}
                    transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-teal-100/40 rounded-full blur-[100px] will-change-transform"
                />
            </div>

            {/* --- PREMIUM FLOATING NAVBAR --- */}
            <nav className="fixed top-4 left-0 right-0 z-50 px-4">
                <div className="max-w-5xl mx-auto bg-white/80 backdrop-blur-2xl border border-white shadow-xl shadow-slate-200/40 rounded-full px-5 py-3 flex items-center justify-between transform-gpu">
                    <Link href="/" className="font-black text-xl tracking-tighter text-slate-900 flex items-center gap-2">
                        <ArrowLeft className="w-5 h-5 text-slate-400 hover:text-emerald-500 transition-colors" />
                        <img
                            src="/rms.png"
                            alt="Gecko RMS"
                            className="h-8 md:h-8 w-auto object-contain shrink-0"
                        />
                    </Link>

                    <div className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-500 uppercase tracking-widest shrink-0">
                        <Link href="/features" className="hover:text-emerald-600 transition-colors">Features</Link>
                        <Link href="/pricing" className="hover:text-emerald-600 transition-colors">Pricing</Link>
                        <Link href="/about" className="text-emerald-600 font-black">About</Link>
                    </div>

                    <div className="flex items-center gap-3 md:gap-4 shrink-0">
                        <Link href="/login" className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-emerald-600 transition-colors hidden sm:block">
                            Login
                        </Link>
                        <Link href="/signup" className="bg-emerald-500 text-white px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-emerald-600 shadow-md shadow-emerald-500/20 transition-all transform-gpu active:scale-95">
                            Start 15-Day Free Trial
                        </Link>
                        <button className="md:hidden p-2 bg-slate-100 rounded-full text-slate-900 z-50 relative hover:bg-slate-200 transition-colors shrink-0" onClick={() => setMobileMenuOpen(true)}>
                            <Menu className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </nav>

            {/* --- HERO SECTION --- */}
            <section className="pt-40 pb-16 px-6 text-center max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, type: "spring", stiffness: 300, damping: 30 }}
                    className="transform-gpu"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-black uppercase tracking-wider mb-6 shadow-sm">
                        <Utensils className="w-3.5 h-3.5 text-emerald-600" />
                        Gecko Works Nepal Pvt. Ltd. • Official Story
                    </div>

                    <h1 className="text-3xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-6 leading-[1.05] max-w-5xl mx-auto">
                        <span className="block whitespace-nowrap text-slate-900">Engineered for speed.</span>
                        <span className="block whitespace-nowrap text-emerald-600">Built for modern dining.</span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-500 font-bold max-w-2xl mx-auto mb-10 leading-relaxed">
                        Gecko RMS was born from a simple mission: eliminating lag, hardware lock-in, and operational chaos for modern restaurants.
                    </p>
                </motion.div>
            </section>

            {/* --- 1. FOUNDER'S ORIGIN STORY BLOCK --- */}
            <section className="max-w-6xl mx-auto px-6 pb-28">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

                    {/* Left: Origin Narrative */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black uppercase tracking-widest rounded-full shadow-sm">
                            <Utensils className="w-3.5 h-3.5 text-emerald-600" />
                            Origin Story • Gecko Works
                        </div>

                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-[1.05]">
                            “We watched high stress kitchens drown in paper KOT tickets.”
                        </h2>

                        <p className="text-base md:text-lg text-slate-600 font-medium leading-relaxed">
                            <span className="text-emerald-600 font-black">B</span>ack in 2024, our founding engineering team evaluated real-world kitchen operations during peak dining hours at a busy restaurant in Basantapur. Orders were taking nearly 40 minutes, KOT tickets were getting lost in paper spikes, and thermal printers were repeatedly jamming during the peak rush—causing delays, confusion, and unnecessary pressure on the kitchen team.
                        </p>

                        <p className="text-base md:text-lg text-slate-600 font-medium leading-relaxed">
                            When we asked restaurant managers why they didn't switch to digital displays, the answer was always the same: legacy POS software was too slow, required significant proprietary hardware lock-in, and lagged terribly on slow networks.
                        </p>

                        <div className="p-5 bg-emerald-50/80 border-l-4 border-emerald-500 rounded-r-2xl text-slate-900 font-bold text-base md:text-lg leading-relaxed shadow-sm">
                            We decided to build <span className="text-emerald-700 font-black">Gecko RMS</span> — an ultra-fast, zero-lag operating system that runs on any tablet or laptop, syncing floor and kitchen orders in <span className="text-emerald-600 underline decoration-emerald-400 decoration-2 font-black">under 200 milliseconds</span>.
                        </div>
                    </div>

                    {/* Right: Founder Spotlight Card */}
                    <div className="lg:col-span-5">
                        <LightSpotlightCard className="p-8">
                            <div className="flex items-center justify-center gap-3 mb-6 bg-slate-50 p-5 rounded-3xl border border-slate-100 shadow-sm">
                                <img src="/rms.png" alt="Gecko RMS" className="h-10 w-auto object-contain" />
                            </div>

                            <div className="text-center mb-6">
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800 bg-emerald-100 px-4 py-1.5 rounded-full border border-emerald-200 inline-flex items-center gap-1.5 mb-3 shadow-sm">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                    Bhotebahal, Kathmandu
                                </span>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                                    Gecko Works
                                </h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">
                                    Lead Architect & Product Engineering Team
                                </p>
                            </div>

                            <div className="relative bg-emerald-50/70 border border-emerald-200/80 rounded-3xl p-5 text-left shadow-sm">
                                <MessageSquareQuote className="w-6 h-6 text-emerald-600 mb-2" />
                                <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed italic">
                                    "Our promise is simple: zero software lag, zero proprietary hardware lock-in, and 100% direct engineering support whenever you call."
                                </p>
                            </div>
                        </LightSpotlightCard>
                    </div>

                </div>
            </section>

            {/* --- 2. BEFORE vs. AFTER GECKO COMPARISON SECTION --- */}
            <section className="max-w-6xl mx-auto px-6 pb-28">
                <div className="text-center mb-14">
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-3">Why Restaurants Upgrade</h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Traditional POS vs. Gecko RMS Engine</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* Before Gecko Card (Grayscale / Pain Points) */}
                    <div className="bg-slate-100/90 border border-slate-300 rounded-[2.5rem] p-8 md:p-10 text-slate-700 shadow-xl shadow-slate-300/60">
                        <div className="flex items-center gap-3 mb-6 text-red-600 font-black text-sm uppercase tracking-widest">
                            <XCircle className="w-6 h-6 shrink-0" />
                            Traditional POS Systems (The Old Way)
                        </div>
                        <ul className="space-y-4 text-sm font-medium text-slate-600">
                            <li className="flex items-start gap-3">
                                <span className="w-2 h-2 rounded-full bg-red-400 mt-2 shrink-0" />
                                <span><strong>Paper Ticket Chaos:</strong> Lost KOT tickets, grease stains, and delayed kitchen communication.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-2 h-2 rounded-full bg-red-400 mt-2 shrink-0" />
                                <span><strong>5–10 Second Sync Delays:</strong> Waiters waiting for spinners while tables wait for bills.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-2 h-2 rounded-full bg-red-400 mt-2 shrink-0" />
                                <span><strong>Proprietary Hardware Lock-In:</strong> Overpriced touchscreens requiring massive initial investment.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-2 h-2 rounded-full bg-red-400 mt-2 shrink-0" />
                                <span><strong>Unverified Voids & Theft:</strong> No real-time alerts when cash orders are cancelled or discounted.</span>
                            </li>
                        </ul>
                    </div>

                    {/* After Gecko Card (Emerald / High-Performance) */}
                    <div className="bg-white border-2 border-emerald-400/80 rounded-[2.5rem] p-8 md:p-10 text-slate-900 shadow-2xl shadow-emerald-500/10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl">
                            Next-Gen Engine
                        </div>
                        <div className="flex items-center gap-3 mb-6 text-emerald-600 font-black text-sm uppercase tracking-widest">
                            <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-500" />
                            Gecko RMS (The Modern Way)
                        </div>
                        <ul className="space-y-4 text-sm font-bold text-slate-800">
                            <li className="flex items-start gap-3">
                                <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                <span><strong>Digital KDS Touch Displays:</strong> Zero paper, color-coded timer alerts, and instant station routing.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                <span><strong>&lt; 200ms Instant Sync:</strong> Orders appear on kitchen screens the millisecond a waiter taps send.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                <span><strong>Use Any Hardware:</strong> Run on your existing iPads, Android tablets, laptops, or smartphones.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                <span><strong>100% Real-Time Audit Logs:</strong> Every void, discount, and cash settlement logged instantly.</span>
                            </li>
                        </ul>
                    </div>

                </div>
            </section>

            {/* --- 3. TIMELINE & MILESTONES STRIP --- */}
            <section className="max-w-6xl mx-auto px-6 pb-28">
                <div className="text-center mb-16">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-100 px-4 py-1.5 rounded-full border border-emerald-200 inline-block mb-3 shadow-sm">
                        GECKO WORKS • EVOLUTION
                    </span>
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-3">Our Growth Journey</h2>
                    <p className="text-slate-500 text-xs sm:text-sm font-bold max-w-xl mx-auto">From initial kitchen prototypes to a modern restaurant operating system.</p>
                </div>

                <div className="relative">
                    {/* 🔌 CONNECTING GRADIENT TIMELINE LINE (Desktop) */}
                    <div className="hidden lg:block absolute top-[52px] left-[10%] right-[10%] h-1 bg-gradient-to-r from-emerald-200 via-teal-300 to-emerald-500 rounded-full z-0" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                        {[
                            {
                                step: "01",
                                year: "2024",
                                badge: "Beta Pilot",
                                title: "Early Kitchen Pilots",
                                desc: "Tested zero-lag order dispatch prototypes in high-volume kitchens to replace paper ticket spikes."
                            },
                            {
                                step: "02",
                                year: "2025",
                                badge: "Architecture",
                                title: "Sub-200ms Sync Engine",
                                desc: "Engineered real-time WebSocket syncing and offline-first cache resilience for floor tablets & KDS screens."
                            },
                            {
                                step: "03",
                                year: "2026",
                                badge: "Grand Launch",
                                isCurrent: true,
                                title: "Commercial Release",
                                desc: "Official commercial rollout featuring 15-Day Free Trial, transparent pricing & 3 months free on annual plans."
                            },
                            {
                                step: "04",
                                year: "2027+",
                                badge: "Future Roadmap",
                                title: "AI Kitchen Forecasting",
                                desc: "Automated ingredient inventory prediction, floor optimization & real-time operational analytics."
                            }
                        ].map((item, idx) => (
                            <LightSpotlightCard key={idx} className={`flex flex-col justify-between p-7 ${item.isCurrent ? 'border-2 border-emerald-400 shadow-2xl shadow-emerald-500/10' : ''}`}>
                                <div>
                                    {/* Top Step Pill & Year */}
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white font-black text-xs flex items-center justify-center shadow-md">
                                            {item.step}
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${item.isCurrent
                                            ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm animate-pulse'
                                            : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                            }`}>
                                            {item.badge}
                                        </span>
                                    </div>

                                    <div className="text-3xl font-black text-slate-900 tracking-tighter mb-2">
                                        {item.year}
                                    </div>
                                    <h4 className="text-lg font-black text-slate-900 tracking-tight mb-2">
                                        {item.title}
                                    </h4>
                                    <p className="text-xs font-medium text-slate-500 leading-relaxed">
                                        {item.desc}
                                    </p>
                                </div>
                            </LightSpotlightCard>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- 4. REAL-TIME ARCHITECTURE INTERACTIVE SHOWCASE --- */}
            <section className="max-w-6xl mx-auto px-6 pb-28">
                <div className="text-center mb-14">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800 bg-emerald-100 px-4 py-1.5 rounded-full border border-emerald-200 inline-block mb-3 shadow-sm">
                        ⚡ LIVE ENGINE INFRASTRUCTURE
                    </span>
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-3">
                        Real-Time KDS & Floor Sync
                    </h2>
                    <p className="text-slate-500 text-xs sm:text-sm font-bold max-w-xl mx-auto">
                        How Gecko RMS dispatches orders from floor staff to kitchen displays in under 200 milliseconds.
                    </p>
                </div>

                <div className="bg-white border-2 border-slate-300 rounded-[2.5rem] p-8 md:p-12 text-slate-900 shadow-2xl shadow-slate-200/60 relative overflow-hidden">
                    {/* Glow Blobs */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-100/50 rounded-full blur-[100px] pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-100/40 rounded-full blur-[90px] pointer-events-none" />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                        {/* Terminal 1: Waiter App */}
                        <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-6 flex flex-col justify-between shadow-sm hover:border-emerald-300 transition-all">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">01 • Waiter Terminal</span>
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                </div>
                                <h4 className="text-lg font-black text-slate-900 mb-2">Order #104 Sent</h4>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">
                                    Waiter enters items on mobile or tablet. Order payload is compressed & dispatched instantly.
                                </p>
                            </div>
                            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200 text-center">
                                <span className="text-xs font-black uppercase tracking-widest text-emerald-700">STATUS: DISPATCHED [180ms]</span>
                            </div>
                        </div>

                        {/* Terminal 2: Kitchen KDS (Active Highlight) */}
                        <div className="bg-gradient-to-b from-emerald-50/90 to-teal-50/70 border-2 border-emerald-400 rounded-2xl p-6 flex flex-col justify-between shadow-xl shadow-emerald-500/10">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">02 • Kitchen Display (KDS)</span>
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                </div>
                                <h4 className="text-lg font-black text-slate-900 mb-2">Live KOT Displayed</h4>
                                <p className="text-xs text-slate-600 font-medium leading-relaxed mb-6">
                                    Kitchen screen rings with color-coded timers. Cooks mark station prep status in real-time.
                                </p>
                            </div>
                            <div className="bg-emerald-500 text-white rounded-xl p-3 text-center shadow-md shadow-emerald-500/20">
                                <span className="text-xs font-black uppercase tracking-widest">KOT RECEIVED: 00:00:00.180</span>
                            </div>
                        </div>

                        {/* Terminal 3: Audit & Cashier */}
                        <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-6 flex flex-col justify-between shadow-sm hover:border-emerald-300 transition-all">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">03 • Cashier & Audit Log</span>
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                </div>
                                <h4 className="text-lg font-black text-slate-900 mb-2">Instant Settlement</h4>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">
                                    Bill generation, tax breakdown, and void audit logging updated live without reloading.
                                </p>
                            </div>
                            <div className="bg-slate-900 text-white rounded-xl p-3 text-center shadow-md">
                                <span className="text-xs font-black uppercase tracking-widest text-emerald-400">AUDIT: LOGGED & SETTLED</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- 5. GRAND LAUNCH GUARANTEE & EARLY ADOPTER PERKS --- */}
            <section className="max-w-6xl mx-auto px-6 pb-28">
                <div className="text-center mb-14">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800 bg-emerald-100 px-4 py-1.5 rounded-full border border-emerald-200 inline-block mb-3 shadow-sm">
                        🚀 BHADRA 1 GRAND LAUNCH OFFER
                    </span>
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-3">
                        Grand Launch VIP Privileges
                    </h2>
                    <p className="text-slate-500 text-xs sm:text-sm font-bold max-w-xl mx-auto">
                        Everything you need to upgrade your restaurant risk-free on day one.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <LightSpotlightCard className="p-8">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 font-black flex items-center justify-center text-xl mb-6 shadow-sm">
                            15
                        </div>
                        <h4 className="text-xl font-black text-slate-900 tracking-tight mb-2">15-Day Free Trial</h4>
                        <p className="text-xs font-medium text-slate-500 leading-relaxed">
                            Full access to waiter POS, kitchen displays, inventory tracking, and reports. Zero credit card or deposit required to start.
                        </p>
                    </LightSpotlightCard>

                    <LightSpotlightCard className="p-8">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 font-black flex items-center justify-center text-xl mb-6 shadow-sm">
                            +3
                        </div>
                        <h4 className="text-xl font-black text-slate-900 tracking-tight mb-2">3 Months Extra Free</h4>
                        <p className="text-xs font-medium text-slate-500 leading-relaxed">
                            Choose the Annual Plan to unlock 16 full months of access for the price of 12 (NPR 1,499/mo) and enjoy NPR 0 security deposit.
                        </p>
                    </LightSpotlightCard>

                    <LightSpotlightCard className="p-8">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 font-black flex items-center justify-center text-xl mb-6 shadow-sm">
                            24/7
                        </div>
                        <h4 className="text-xl font-black text-slate-900 tracking-tight mb-2">Direct Engineering Support</h4>
                        <p className="text-xs font-medium text-slate-500 leading-relaxed">
                            Our core engineering team assists with menu setup, staff training, and provides priority phone & WhatsApp support.
                        </p>
                    </LightSpotlightCard>
                </div>
            </section>

            {/* --- PREMIUM CTA BANNER --- */}
            <section className="max-w-5xl mx-auto px-6 pb-32">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="relative overflow-hidden rounded-[3rem] p-10 md:p-16 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white text-center shadow-2xl shadow-slate-900/40 border border-slate-800"
                >
                    <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none" />

                    <div className="relative z-10 max-w-2xl mx-auto font-sans">
                        <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full mb-6 inline-block">
                            ⚡ READY TO UPGRADE YOUR RESTAURANT?
                        </span>

                        <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-6 leading-tight">
                            Experience zero-lag dining management today.
                        </h2>

                        <p className="text-slate-300 font-medium text-base md:text-lg mb-10 leading-relaxed">
                            Join Nepal's fastest growing restaurants. Start your 15-day risk-free trial with zero commitments.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link href="/pricing" className="w-full sm:w-auto">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full sm:w-auto h-14 px-8 rounded-2xl font-black text-sm bg-emerald-500 hover:bg-emerald-400 text-white shadow-xl shadow-emerald-500/30 transition-all flex items-center justify-center gap-2"
                                >
                                    View Pricing & Policy
                                    <ArrowRight className="w-4 h-4" />
                                </motion.button>
                            </Link>
                            <Link href="/signup" className="w-full sm:w-auto">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full sm:w-auto h-14 px-8 rounded-2xl font-black text-sm bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all flex items-center justify-center gap-2"
                                >
                                    Start 15-Day Free Trial
                                </motion.button>
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* --- FOOTER --- */}
            <footer className="border-t border-slate-200 py-10 bg-white text-center text-xs font-bold text-slate-500">
                <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <img src="/rms.png" alt="Gecko RMS" className="h-6 w-auto" />
                        <span>© 2026 Gecko Works Nepal Pvt. Ltd. All rights reserved.</span>
                    </div>
                    <div className="flex items-center gap-6 text-slate-400">
                        <Link href="/pricing" className="hover:text-emerald-600 transition-colors">Pricing</Link>
                        <Link href="/features" className="hover:text-emerald-600 transition-colors">Features</Link>
                        <Link href="/login" className="hover:text-emerald-600 transition-colors">Login</Link>
                    </div>
                </div>
            </footer>

            {/* --- AI CHAT WIDGET --- */}
            <AIChatWidget />

            {/* --- MOBILE MENU --- */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[60] bg-white/95 backdrop-blur-xl flex flex-col transform-gpu"
                    >
                        <div className="flex justify-end p-4 md:p-6 shrink-0">
                            <button className="p-2 md:p-3 bg-slate-100 rounded-full text-slate-900 shrink-0" onClick={() => setMobileMenuOpen(false)}>
                                <X className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                        </div>

                        <motion.div
                            initial="hidden"
                            animate="show"
                            exit="exit"
                            className="flex-1 flex flex-col items-center justify-center gap-6 md:gap-8 text-3xl md:text-4xl font-black text-slate-900 overflow-y-auto min-h-0"
                        >
                            <Link href="/features" onClick={() => setMobileMenuOpen(false)} className="hover:text-emerald-500 transition-colors">Features</Link>
                            <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} className="hover:text-emerald-500 transition-colors">Pricing</Link>
                            <Link href="/about" onClick={() => setMobileMenuOpen(false)} className="text-emerald-600">About</Link>

                            <div className="w-10 h-1 bg-slate-100 rounded-full my-2 md:my-4 shrink-0" />

                            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-emerald-600 text-xl md:text-2xl font-bold">Login</Link>

                            <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="bg-emerald-500 text-white text-lg md:text-xl font-black px-8 py-3 rounded-full shadow-lg shadow-emerald-500/20">
                                Start 15-Day Free Trial
                            </Link>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}