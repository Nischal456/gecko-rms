"use client";

import React, { useRef, useState, useEffect } from "react";
import {
    motion, useScroll, useTransform, useSpring, useMotionTemplate, useMotionValue, AnimatePresence, type Variants
} from "framer-motion";
import Link from "next/link";
import {
    Menu, X, Zap, Globe, ShieldCheck, MessageSquare, ArrowRight, ArrowLeft, Activity, Server, Code2
} from "lucide-react";
import AIChatWidget from "@/components/landing/AIChatWidget";

// --- 1. CONFIG & UTILS ---
function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(" ");
}

const EASE_PREMIUM = [0.16, 1, 0.3, 1] as const;

// --- 2. MICRO-COMPONENTS (GPU Optimized) ---

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

function SpotlightCard({ title, desc, icon: Icon, delay = 0 }: { title: string, desc: string, icon: any, delay?: number }) {
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

    // FIX: Hook moved to the top level so it runs unconditionally
    const spotlightBackground = useMotionTemplate`radial-gradient(600px circle at ${mouseX}px ${mouseY}px, rgba(16, 185, 129, 0.08), transparent 80%)`;

    return (
        <motion.div
            ref={divRef}
            onMouseMove={handleMouseMove}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay, duration: 0.6, ease: EASE_PREMIUM }}
            className="group relative border border-slate-200 bg-white overflow-hidden rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-sm hover:shadow-2xl transition-all duration-500 transform-gpu"
        >
            {!isMobile && (
                <motion.div
                    className="pointer-events-none absolute -inset-px rounded-[2.5rem] opacity-0 transition duration-300 group-hover:opacity-100"
                    style={{ background: spotlightBackground }}
                />
            )}
            <div className="relative z-10">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl flex items-center justify-center mb-6 md:mb-8 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500 shadow-inner group-hover:shadow-emerald-500/30 transform-gpu">
                    <Icon className="w-6 h-6 md:w-8 md:h-8 transition-colors" />
                </div>
                <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-3 md:mb-4 tracking-tight">{title}</h3>
                <p className="text-sm md:text-base text-slate-500 font-medium leading-relaxed">{desc}</p>
            </div>
        </motion.div>
    );
}

function ParallaxText({ children, baseVelocity = 100 }: { children: string, baseVelocity?: number }) {
    const { scrollYProgress } = useScroll();
    const x = useTransform(scrollYProgress, [0, 1], [0, baseVelocity]);
    const smoothX = useSpring(x, { stiffness: 400, damping: 90 });

    return (
        <div className="overflow-hidden whitespace-nowrap flex flex-nowrap w-full">
            <motion.div style={{ x: smoothX }} className="flex whitespace-nowrap transform-gpu will-change-transform">
                <span className="block text-6xl md:text-8xl lg:text-[12rem] font-black uppercase text-slate-900/5 tracking-tighter mr-6 md:mr-10 select-none shrink-0">
                    {children}
                </span>
                <span className="block text-6xl md:text-8xl lg:text-[12rem] font-black uppercase text-slate-900/5 tracking-tighter select-none shrink-0">
                    {children}
                </span>
            </motion.div>
        </div>
    );
}

function TextReveal({ text }: { text: string }) {
    const words = text.split(" ");
    return (
        <span className="inline-block">
            {words.map((word, i) => (
                <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.6, delay: i * 0.1, ease: EASE_PREMIUM }}
                    className="inline-block mr-[0.25em] transform-gpu will-change-transform"
                >
                    {word}
                </motion.span>
            ))}
        </span>
    );
}

// --- MAIN PAGE ---
export default function AboutPage() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-emerald-500 selection:text-white overflow-x-hidden">

            {/* NAVBAR */}
            <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-3 px-3 md:pt-6">
                <motion.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="w-full max-w-6xl h-14 md:h-16 bg-white/90 backdrop-blur-xl border border-slate-200/60 shadow-lg shadow-slate-200/10 rounded-full flex items-center justify-between px-3 md:px-6 transform-gpu shrink-0"
                >
                    <Link href="/" className="font-black text-xl tracking-tighter text-slate-900 flex items-center gap-2">
                        <ArrowLeft className="w-5 h-5 text-slate-400 hover:text-emerald-500 transition-colors" />
                        <img
                            src="/rms.png"
                            alt="Gecko RMS"
                            // Swapped fixed width for w-auto to maintain the rectangular proportion
                            className="h-8 md:h-8 w-auto object-contain shrink-0"
                        />
                    </Link>

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
                            <MagneticButton className="h-9 px-4 md:h-11 md:px-6 text-xs bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 text-white border-none rounded-full whitespace-nowrap">
                                Get Started
                            </MagneticButton>
                        </Link>
                        <button className="md:hidden p-2 bg-slate-100 rounded-full text-slate-900 z-50 relative hover:bg-slate-200 transition-colors shrink-0" onClick={() => setMobileMenuOpen(true)}>
                            <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                    </div>
                </motion.div>
            </nav>


            {/* --- HERO: THE VISION --- */}
            <section className="relative pt-32 md:pt-48 pb-16 md:pb-20 flex flex-col items-center justify-center text-center px-4 md:px-6 min-h-[70vh] md:min-h-[85vh] overflow-hidden">
                <div className="max-w-5xl relative z-10">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4 }}
                        className="mb-6 md:mb-8 inline-flex items-center gap-2 px-3 md:px-4 py-1 md:py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 shadow-sm transform-gpu shrink-0"
                    >
                        <Zap className="w-3 h-3 md:w-4 md:h-4 fill-emerald-600 shrink-0" />
                        <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] shrink-0">Est. 2026 // Gecko-RMS</span>
                    </motion.div>

                    <h1 className="text-[3.5rem] leading-[0.9] sm:text-7xl md:text-[7rem] lg:text-[8rem] font-black text-slate-900 tracking-tighter md:leading-[0.85] mb-6 md:mb-10 transform-gpu">
                        <TextReveal text="WE BUILD THE" /> <br className="hidden sm:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-b from-emerald-400 to-emerald-700">
                            <TextReveal text="FUTURE." />
                        </span>
                    </h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.6, ease: EASE_PREMIUM }}
                        className="text-base sm:text-lg md:text-2xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed px-4 transform-gpu"
                    >
                        GeckoRMS was born from a simple obsession: <br className="hidden md:block" />
                        making restaurant technology faster than the speed of service.
                    </motion.p>
                </div>

                {/* Floating Decorative Blobs (GPU Accelerated) */}
                <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden transform-gpu">
                    <motion.div
                        animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.4, 0.3] }}
                        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-[10%] md:top-[20%] left-[5%] md:left-[10%] w-48 h-48 md:w-72 md:h-72 bg-emerald-300/30 rounded-full blur-[80px] md:blur-[100px] will-change-transform"
                    />
                    <motion.div
                        animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.3, 0.2] }}
                        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                        className="absolute bottom-[5%] md:bottom-[10%] right-[5%] md:right-[10%] w-64 h-64 md:w-96 md:h-96 bg-teal-200/30 rounded-full blur-[100px] md:blur-[120px] will-change-transform"
                    />
                </div>
            </section>

            {/* --- KINETIC TYPOGRAPHY SECTION --- */}
            <section className="py-12 md:py-24 border-y border-slate-100 bg-white relative z-10 overflow-hidden">
                <div className="space-y-4 md:space-y-8">
                    <ParallaxText baseVelocity={-30}>FASTEST POS IN NEPAL</ParallaxText>
                    <ParallaxText baseVelocity={30}>GECKO RMS EASIEST</ParallaxText>
                </div>
            </section>

            {/* --- THE MISSION: THE LAG KILLER (3D Spec Section) --- */}
            <section className="py-20 md:py-32 px-4 md:px-6 max-w-7xl mx-auto relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 md:gap-16 items-center">

                    {/* Left: The Specs */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{ duration: 0.6, ease: EASE_PREMIUM }}
                        className="lg:col-span-7 space-y-6 md:space-y-8 transform-gpu"
                    >
                        <div className="inline-flex items-center gap-2 md:gap-3 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full text-red-500 font-black text-[9px] md:text-[10px] uppercase tracking-widest shrink-0">
                            <motion.div animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-1.5 h-1.5 md:w-2 md:h-2 bg-red-500 rounded-full shrink-0" />
                            Live Target: Nullify Lag
                        </div>

                        <h2 className="text-4xl sm:text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-[0.95]">
                            Our Mission is <br className="hidden sm:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-orange-500 to-amber-500">to kill the lag.</span>
                        </h2>

                        <p className="text-base sm:text-lg md:text-2xl text-slate-500 leading-relaxed font-medium max-w-2xl">
                            Traditional POS systems are slow, complex, and prone to theft. We built GeckoRMS to be a high-performance OS that empowers staff and protects owners.
                        </p>

                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 pt-6 md:pt-10">
                            <div className="p-5 md:p-8 bg-white border border-slate-100 rounded-2xl md:rounded-[2rem] shadow-sm hover:border-emerald-500/50 transition-all group shrink-0">
                                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 md:mb-2 group-hover:text-emerald-500 transition-colors">Sync Latency</p>
                                <h4 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter">200<span className="text-sm md:text-xl ml-1 text-slate-300">ms</span></h4>
                            </div>
                            <div className="p-5 md:p-8 bg-white border border-slate-100 rounded-2xl md:rounded-[2rem] shadow-sm hover:border-emerald-500/50 transition-all group shrink-0">
                                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 md:mb-2 group-hover:text-emerald-500 transition-colors">Uptime</p>
                                <h4 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter">99.9<span className="text-sm md:text-xl ml-1 text-slate-300">%</span></h4>
                            </div>
                            <div className="col-span-2 lg:col-span-1 p-5 md:p-8 bg-white border border-slate-100 rounded-2xl md:rounded-[2rem] shadow-sm hover:border-emerald-500/50 transition-all group shrink-0">
                                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 md:mb-2 group-hover:text-emerald-500 transition-colors">Runtime</p>
                                <h4 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter">V8<span className="text-sm md:text-xl ml-1 text-slate-300">JS</span></h4>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right: The Virtual Hardware */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, rotateY: 10 }}
                        whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ duration: 0.8, ease: EASE_PREMIUM }}
                        className="lg:col-span-5 relative h-[350px] md:h-auto md:aspect-[4/5] rounded-[2rem] md:rounded-[3rem] overflow-hidden bg-slate-950 shadow-2xl group transform-gpu"
                        style={{ perspective: 1000 }}
                    >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.15),transparent)] transform-gpu" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            {/* Glowing Neural Core */}
                            <motion.div
                                animate={{
                                    boxShadow: ["0 0 20px rgba(16,185,129,0.1)", "0 0 50px rgba(16,185,129,0.25)", "0 0 20px rgba(16,185,129,0.1)"],
                                    scale: [1, 1.02, 1]
                                }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="w-48 h-48 md:w-56 md:h-56 bg-slate-900 border border-white/10 rounded-full md:rounded-[3rem] flex items-center justify-center relative z-10 transform-gpu will-change-transform"
                            >
                                <img
                                    src="/rms.png"
                                    alt="Gecko RMS"
                                    // Swapped fixed width for w-auto to maintain the rectangular proportion
                                    className="h-8 md:h-8 w-auto object-contain shrink-0"
                                />
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* --- CORE VALUES BENTO --- */}
            <section className="py-20 md:py-32 px-4 md:px-6 bg-slate-50 relative z-10 border-t border-slate-100">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-12 md:mb-24">
                        <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-slate-900 mb-4 md:mb-6 tracking-tight">Our DNA.</h2>
                        <p className="text-slate-500 text-base md:text-xl font-medium max-w-xl mx-auto px-4">The principles that guide every single line of code we ship.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
                        <SpotlightCard delay={0.1} icon={Zap} title="Velocity First" desc="If it's not instant, it's not good enough. We optimize for the sub-millisecond experience." />
                        <SpotlightCard delay={0.2} icon={Globe} title="Kathmandu Roots" desc="Built locally for Nepal. We solve local challenges with world-class engineering." />
                        <SpotlightCard delay={0.3} icon={ShieldCheck} title="Zero-Trust" desc="We believe in total transparency. Every void, discount, and tap is secured forever." />
                    </div>
                </div>
            </section>

            {/* --- PREMIUM TITANIUM CTA SECTION --- */}
            <section className="relative py-24 md:py-48 bg-[#020617] overflow-hidden transform-gpu">
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.1] [mask-image:radial-gradient(ellipse_at_center,black,transparent)] pointer-events-none transform-gpu" />

                <motion.div
                    animate={{ scale: [1, 1.05, 1], opacity: [0.15, 0.25, 0.15] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[1000px] h-[300px] md:h-[600px] bg-emerald-500/20 rounded-full blur-[80px] md:blur-[160px] pointer-events-none transform-gpu will-change-transform"
                />

                <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-6 md:mb-10 inline-flex items-center gap-2 md:gap-3 px-4 md:px-5 py-1.5 md:py-2 bg-white/5 border border-white/10 backdrop-blur-md rounded-full transform-gpu shrink-0">
                        <span className="relative flex h-1.5 w-1.5 md:h-2 md:w-2 shrink-0">
                            <span className="animate-ping absolute inset-0 rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 md:h-2 md:w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-[9px] md:text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] shrink-0">Next-Gen Alpha Phase</span>
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, ease: EASE_PREMIUM }}
                        className="text-5xl sm:text-6xl md:text-[8rem] lg:text-[10rem] font-black tracking-tighter text-white mb-6 md:mb-8 leading-[0.85] md:leading-[0.8] drop-shadow-2xl transform-gpu"
                    >
                        Ready to <br className="hidden sm:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/20">EVOLVE?</span>
                    </motion.h2>

                    <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="text-slate-400 text-base md:text-xl lg:text-2xl mb-10 md:mb-16 max-w-2xl mx-auto font-medium leading-relaxed px-2 transform-gpu">
                        Stop losing revenue to slow systems. Join the elite group of restaurants weaponizing speed with GeckoOS.
                    </motion.p>

                    <div className="flex flex-col items-center gap-6 md:gap-8">
                        <Link href="/login" className="group relative shrink-0">
                            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 transform-gpu z-0"></div>
                            <MagneticButton variant="ghost" className="relative z-10 !bg-white !text-slate-950 h-16 md:h-20 px-10 md:px-16 rounded-full font-black text-lg md:text-2xl shadow-2xl transform-gpu shrink-0">
                                Join the Alpha <ArrowRight className="w-5 h-5 md:w-6 md:h-6 ml-2 group-hover:translate-x-2 transition-transform shrink-0" />
                            </MagneticButton>
                        </Link>

                        <Link href="https://wa.me/9779765009755" target="_blank" className="flex items-center gap-2 md:gap-3 text-slate-500 hover:text-emerald-400 transition-colors py-2 px-4 rounded-full border border-transparent hover:border-white/10 hover:bg-white/5 font-bold text-xs md:text-sm tracking-wide shrink-0">
                            <MessageSquare className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
                            Talk to an Engineer
                        </Link>
                    </div>

                    <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.4 }} className="mt-16 md:mt-24 pt-8 md:pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 text-slate-600 font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] text-[9px] md:text-[10px] transform-gpu">
                        <div className="flex items-center gap-3 shrink-0"><div className="w-4 md:w-8 h-[1px] bg-white/10 shrink-0" />KATHMANDU, NEPAL<div className="w-4 md:w-8 h-[1px] bg-white/10 shrink-0" /></div>
                        <div className="flex items-center gap-3 shrink-0"><div className="w-4 md:w-8 h-[1px] bg-white/10 shrink-0" />Gecko Resturant management System <div className="w-4 md:w-8 h-[1px] bg-white/10 shrink-0" /></div>
                    </motion.div>
                </div>
            </section>

            {/* --- AI CHAT WIDGET --- */}
            <AIChatWidget />

            {/* --- MOBILE MENU (Synced with Main Page Style) --- */}
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
                            {["Features", "Pricing", "About"].map(item => (
                                <motion.div key={item} className="shrink-0">
                                    <Link href={`/${item.toLowerCase()}`} onClick={() => setMobileMenuOpen(false)} className="hover:text-emerald-500 transition-colors">
                                        {item}
                                    </Link>
                                </motion.div>
                            ))}

                            <div className="w-10 h-1 bg-slate-100 rounded-full my-2 md:my-4 shrink-0" />

                            <motion.div className="shrink-0">
                                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-emerald-600 text-xl md:text-2xl font-bold">Login</Link>
                            </motion.div>

                            <motion.div className="shrink-0 pb-10">
                                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-slate-900 text-lg md:text-xl font-medium border border-slate-200 px-6 md:px-8 py-2.5 md:py-3 rounded-full mt-2 md:mt-4 block bg-white">
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