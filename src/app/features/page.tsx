"use client";

import React, { useRef, useState, useEffect } from "react";
import { 
  motion, useScroll, useTransform, useSpring, useMotionTemplate, useMotionValue, useInView, type Variants 
} from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Globe, Database, Zap, WifiOff, Laptop, CheckCircle2, Cloud, Smartphone, Lock, Scan, Cpu, Layers } from "lucide-react";
import AIChatWidget from "@/components/landing/AIChatWidget"; // Ensure this path matches your project structure

// --- UTILS ---
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

const EASE_ELASTIC = [0.25, 0.4, 0.25, 1.4] as const; // Bouncy feel

// --- 1. COMPONENT: MAGNETIC BACK BUTTON ---
function BackButton() {
    const ref = useRef<HTMLAnchorElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const handleMouse = (e: React.MouseEvent) => {
        const rect = ref.current?.getBoundingClientRect();
        if (rect) {
            x.set((e.clientX - (rect.left + rect.width / 2)) * 0.3);
            y.set((e.clientY - (rect.top + rect.height / 2)) * 0.3);
        }
    };

    return (
        <motion.div style={{ x, y }} className="fixed top-6 left-6 z-50">
            <Link 
                href="/" 
                ref={ref}
                onMouseMove={handleMouse}
                onMouseLeave={() => { x.set(0); y.set(0); }}
                className="group relative flex items-center justify-center w-14 h-14 bg-white/80 backdrop-blur-xl border border-slate-200 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-emerald-500/20 hover:border-emerald-500/50 transition-all duration-300"
            >
                <ArrowLeft className="w-6 h-6 text-slate-600 group-hover:text-emerald-600 transition-colors group-hover:-translate-x-1" />
            </Link>
        </motion.div>
    );
}

// --- 2. COMPONENT: PARALLAX PARTICLES (Floating Dust) ---
function ParallaxParticles() {
    const { scrollYProgress } = useScroll();
    const y1 = useTransform(scrollYProgress, [0, 1], [0, -200]);
    const y2 = useTransform(scrollYProgress, [0, 1], [0, -400]);
    const y3 = useTransform(scrollYProgress, [0, 1], [0, -100]);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {/* Layer 1 (Fast) */}
            <motion.div style={{ y: y2 }} className="absolute inset-0">
                {[...Array(10)].map((_, i) => (
                    <div 
                        key={`l1-${i}`}
                        className="absolute w-2 h-2 bg-emerald-400/20 rounded-full blur-[1px]"
                        style={{ 
                            top: `${Math.random() * 100}%`, 
                            left: `${Math.random() * 100}%`,
                        }} 
                    />
                ))}
            </motion.div>
            {/* Layer 2 (Medium) */}
            <motion.div style={{ y: y1 }} className="absolute inset-0">
                {[...Array(15)].map((_, i) => (
                    <div 
                        key={`l2-${i}`}
                        className="absolute w-1 h-1 bg-teal-500/30 rounded-full"
                        style={{ 
                            top: `${Math.random() * 100}%`, 
                            left: `${Math.random() * 100}%`,
                        }} 
                    />
                ))}
            </motion.div>
             {/* Layer 3 (Slow - Big Orbs) */}
             <motion.div style={{ y: y3 }} className="absolute inset-0">
                {[...Array(3)].map((_, i) => (
                    <div 
                        key={`l3-${i}`}
                        className="absolute w-64 h-64 bg-emerald-300/5 rounded-full blur-3xl"
                        style={{ 
                            top: `${Math.random() * 100}%`, 
                            left: `${Math.random() * 100}%`,
                        }} 
                    />
                ))}
            </motion.div>
        </div>
    );
}

// --- 3. COMPONENT: THE NEURAL SPINE (SVG Scroll Tracer) ---
function NeuralSpine() {
    const { scrollYProgress } = useScroll();
    const pathLength = useSpring(scrollYProgress, { stiffness: 400, damping: 90 });

    return (
        <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-20 -translate-x-1/2 pointer-events-none z-0 hidden md:block h-full">
            <svg className="h-full w-full overflow-visible" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="spineGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" stopOpacity="0" />
                        <stop offset="10%" stopColor="#10b981" />
                        <stop offset="90%" stopColor="#059669" />
                        <stop offset="100%" stopColor="#047857" stopOpacity="0" />
                    </linearGradient>
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Base Track */}
                <path d="M 10 0 V 10000" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="10 10" strokeOpacity="0.5" />

                {/* Neon Drawing Line */}
                <motion.path
                    d="M 10 0 V 10000"
                    fill="none"
                    stroke="url(#spineGradient)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    style={{ pathLength }}
                    filter="url(#glow)"
                />
            </svg>

            {/* Path-Following Dot */}
            <motion.div
                className="absolute top-0 left-1/2 -ml-[8px] -mt-[8px] w-4 h-4 bg-white border-4 border-emerald-500 rounded-full shadow-[0_0_30px_rgba(16,185,129,1)] z-10"
                style={{ 
                    top: useTransform(scrollYProgress, (val) => `${val * 100}%`),
                }}
            >
                <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-75" />
            </motion.div>
        </div>
    );
}

// --- 4. COMPONENT: 3D TILT CARD (The "Wow" Card) ---
function TiltFeatureCard({ title, desc, icon: Icon, align = "left", step }: any) {
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-50px" });
    
    // Mouse Motion Values
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // 3D Transforms
    const rotateX = useTransform(y, [-100, 100], [10, -10]);
    const rotateY = useTransform(x, [-100, 100], [-10, 10]);

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = ref.current?.getBoundingClientRect();
        if (rect) {
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            x.set(e.clientX - rect.left - centerX);
            y.set(e.clientY - rect.top - centerY);
        }
    };

    // Connector Line Path
    const pathD = align === "left" 
        ? "M 100 20 C 50 20, 50 80, 0 80" 
        : "M 0 20 C 50 20, 50 80, 100 80";

    return (
        <div className={`relative flex items-center mb-40 ${align === "left" ? "justify-start md:pr-24" : "justify-end md:pl-24"} pl-16 md:pl-0 perspective-1000`}>
            
            {/* The Spine Node */}
            <div className="absolute left-8 md:left-1/2 -translate-x-1/2 w-5 h-5 bg-white border-4 border-emerald-500 rounded-full z-10 hidden md:block shadow-[0_0_15px_rgba(16,185,129,0.5)]" />

            {/* The Drawing Connector */}
            <div className={`absolute top-10 ${align === "left" ? "right-[-50px] md:right-[-100px]" : "left-[-50px] md:left-[-100px]"} w-[50px] md:w-[100px] h-[100px] pointer-events-none hidden md:block`}>
                <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <motion.path
                        d={pathD}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2"
                        initial={{ pathLength: 0 }}
                        animate={isInView ? { pathLength: 1 } : { pathLength: 0 }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                    />
                </svg>
            </div>

            {/* The 3D Card */}
            <motion.div
                ref={ref}
                style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => { x.set(0); y.set(0); }}
                initial={{ opacity: 0, y: 100, scale: 0.8 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
                className="group relative border border-white/60 bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-10 w-full md:w-[48%] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] hover:shadow-[0_30px_60px_-15px_rgba(16,185,129,0.2)] transition-shadow duration-500 z-10"
            >
                {/* Spotlight Effect */}
                <motion.div
                    className="pointer-events-none absolute -inset-px rounded-[2.5rem] opacity-0 transition duration-500 group-hover:opacity-100"
                    style={{
                        background: useMotionTemplate`
                            radial-gradient(
                                600px circle at ${x}px ${y}px,
                                rgba(16, 185, 129, 0.15),
                                transparent 80%
                            )
                        `,
                    }}
                />
                
                <div style={{ transform: "translateZ(50px)" }} className="relative z-10">
                    <div className="flex justify-between items-start mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-emerald-50 to-white rounded-2xl flex items-center justify-center border border-emerald-100 shadow-sm group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
                            <Icon className="w-8 h-8 text-emerald-600" />
                        </div>
                        <span className="text-7xl font-black text-slate-100/80 select-none absolute right-0 top-0 -z-10">{step}</span>
                    </div>
                    
                    <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight group-hover:text-emerald-700 transition-colors">{title}</h3>
                    <p className="text-slate-500 font-medium leading-relaxed text-lg">{desc}</p>
                </div>
            </motion.div>
        </div>
    );
}

// --- 5. COMPONENT: RADAR SCAN (For Tech Grid) ---
function RadarScan() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[3rem]">
            <motion.div 
                className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/10 to-transparent w-full h-[50%]"
                animate={{ top: ["-50%", "150%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
            {/* Grid Lines */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
        </div>
    )
}

// --- MAIN PAGE ---
export default function FeaturesPage() {
    return (
        <div className="min-h-screen bg-[#F8FAFC] selection:bg-emerald-500 selection:text-white font-sans overflow-x-hidden">
            <BackButton />
            <ParallaxParticles />
            
            {/* --- HERO SECTION --- */}
            <section className="pt-48 pb-32 relative">
                <div className="max-w-5xl mx-auto text-center px-6 relative z-10">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm mb-10"
                    >
                        <Zap className="w-4 h-4 text-emerald-500 fill-emerald-500" />
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Fastest Flow v2.0</span>
                    </motion.div>
                    
                    <h1 className="text-6xl md:text-9xl font-black text-slate-900 tracking-tighter mb-10 leading-[0.85]">
                        <span className="block">Zero Hardware.</span>
                        <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-600 pb-4">
                            100% Web.
                            {/* Sketch Underline */}
                            <svg className="absolute -bottom-2 left-0 w-full h-6 overflow-visible" viewBox="0 0 100 10" preserveAspectRatio="none">
                                <motion.path
                                    d="M0 5 Q 50 15 100 5"
                                    fill="none"
                                    stroke="#10b981"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 1.5, ease: "easeInOut", delay: 0.5 }}
                                />
                            </svg>
                        </span>
                    </h1>
                    
                    <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-2xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed"
                    >
                        Forget bulky servers. Run your entire restaurant from <span className="text-slate-900 font-bold bg-slate-100 px-2 py-0.5 rounded-lg">any browser</span> on the planet.
                    </motion.p>
                </div>
            </section>

            {/* --- TIMELINE SECTION (The Neural Spine) --- */}
            <section className="relative py-20 pb-40 px-6 max-w-7xl mx-auto">
                <NeuralSpine />

                {/* STEP 1 */}
                <TiltFeatureCard 
                    step="01"
                    title="Browser Native"
                    desc="No downloads needed. Open Chrome on your iPad, Safari on your iPhone, or Edge on your Laptop. Log in and start selling in 5 seconds."
                    icon={Globe}
                    align="left"
                />

                {/* STEP 2 */}
                <TiltFeatureCard 
                    step="02"
                    title="Menu Cloud Sync"
                    desc="Update a price on your laptop, and it updates on every waiter's phone instantly. Our real-time socket engine handles the magic automatically."
                    icon={Cloud}
                    align="right"
                />

                {/* STEP 3 */}
                <TiltFeatureCard 
                    step="03"
                    title="Kitchen Direct"
                    desc="KOTs fly straight to the kitchen display. No paper waste, no lost tickets, and 100% accurate order times. Chefs see orders instantly."
                    icon={Scan}
                    align="left"
                />
            </section>

            {/* --- TECH SPECS GRID (Radar Effect) --- */}
            <section className="bg-slate-950 py-40 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-emerald-500/10 rounded-full blur-[150px]" />

                <div className="container mx-auto px-6 relative z-10">
                    <div className="text-center mb-24">
                        <h2 className="text-5xl md:text-6xl font-black text-white mb-6">Engineered for Speed</h2>
                        <p className="text-slate-400 text-xl max-w-2xl mx-auto">
                            Built on the same infrastructure that powers Netflix & Facebook.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { 
                                title: "Smart Cache", 
                                desc: "Internet cut out? No problem. Gecko stores data locally and syncs automatically when connection returns.",
                                icon: WifiOff,
                                color: "text-orange-500"
                            },
                            { 
                                title: "16ms Latency", 
                                desc: "Interactions feel instant. We optimize every frame to run at 60fps on even low-end devices.",
                                icon: Cpu,
                                color: "text-emerald-500"
                            },
                            { 
                                title: "Bank Grade Security", 
                                desc: "256-bit encryption for all data. Role-based access control keeps your revenue data safe.",
                                icon: Lock,
                                color: "text-blue-500"
                            }
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.15 }}
                                className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[2.5rem] hover:bg-white/10 transition-colors group relative overflow-hidden"
                            >
                                <RadarScan />
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 bg-slate-900 border border-slate-800 group-hover:scale-110 transition-transform shadow-2xl relative z-10`}>
                                    <feature.icon className={`w-7 h-7 ${feature.color}`} />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-4 relative z-10">{feature.title}</h3>
                                <p className="text-slate-400 leading-relaxed text-lg relative z-10">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- FAQ SECTION (Progressive Reveal) --- */}
            <section className="py-32 px-6 max-w-4xl mx-auto relative">
                <div className="text-center mb-20">
                    <h2 className="text-4xl font-black text-slate-900">Common Questions</h2>
                </div>
                <div className="space-y-6">
                    {[
                        { q: "Do I need to buy a specific tablet?", a: "No. Any device with a browser works." },
                        { q: "What happens if the internet goes down?", a: "You keep selling. We sync automatically when it returns." },
                        { q: "Is there a setup fee?", a: "Zero. You can set it up yourself in 15 minutes." },
                        { q: "Can I manage multiple locations?", a: "Yes. Switch between branches with one click." }
                    ].map((faq, i) => (
                        <motion.div 
                            key={i}
                            initial={{ opacity: 0, height: 0 }}
                            whileInView={{ opacity: 1, height: "auto" }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                            className="group"
                        >
                            <div className="bg-white border border-slate-200 p-8 rounded-[2rem] hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 cursor-pointer">
                                <div className="flex items-start gap-5">
                                    <div className="mt-1 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500 transition-colors">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-600 group-hover:text-white transition-colors" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-xl mb-2 group-hover:text-emerald-600 transition-colors">{faq.q}</h4>
                                        <p className="text-slate-500 text-lg leading-relaxed">{faq.a}</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* --- AI CHAT WIDGET --- */}
            <AIChatWidget />
        </div>
    );
}