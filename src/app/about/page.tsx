"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform, useSpring, useMotionTemplate, useMotionValue } from "framer-motion";
import Link from "next/link";
import { 
  ArrowLeft, Target, Zap, Globe, ShieldCheck, Cpu, 
  MessageSquare, ArrowRight, Lock as LockIcon 
} from "lucide-react";

// --- 1. COMPONENT: MAGNETIC BUTTON ---
function MagneticButton({ children, className, variant = "primary" }: any) {
    const ref = useRef<HTMLButtonElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const handleMouse = (e: React.MouseEvent) => {
        const rect = ref.current?.getBoundingClientRect();
        if (rect) {
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            x.set((e.clientX - centerX) * 0.15);
            y.set((e.clientY - centerY) * 0.15);
        }
    };

    return (
        <motion.button
            ref={ref}
            style={{ x, y }}
            onMouseMove={handleMouse}
            onMouseLeave={() => { x.set(0); y.set(0); }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`relative flex items-center justify-center rounded-full font-black transition-all ${
                variant === "primary" ? "bg-white text-slate-950 shadow-2xl" : "bg-transparent text-white border border-white/20 hover:bg-white/5"
            } ${className}`}
        >
            {children}
        </motion.button>
    );
}

// --- 2. COMPONENT: PARALLAX KINETIC TEXT ---
function ParallaxText({ children, baseVelocity = 100 }: any) {
  const { scrollYProgress } = useScroll();
  const x = useTransform(scrollYProgress, [0, 1], [0, baseVelocity]);
  const smoothX = useSpring(x, { stiffness: 400, damping: 90 });

  return (
    <div className="overflow-hidden whitespace-nowrap flex flex-nowrap">
      <motion.div style={{ x: smoothX }} className="flex whitespace-nowrap">
        <span className="block text-8xl md:text-[12rem] font-black uppercase text-slate-900/5 tracking-tighter mr-10 select-none">
          {children}
        </span>
        <span className="block text-8xl md:text-[12rem] font-black uppercase text-slate-900/5 tracking-tighter select-none">
          {children}
        </span>
      </motion.div>
    </div>
  );
}

// --- 3. COMPONENT: CORE VALUE CARD ---
function ValueCard({ title, desc, icon: Icon, delay }: any) {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="group p-10 bg-white border border-slate-100 rounded-[3rem] shadow-sm hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500"
        >
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500 shadow-inner">
                <Icon className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-4">{title}</h3>
            <p className="text-slate-500 font-medium leading-relaxed">{desc}</p>
        </motion.div>
    );
}

export default function AboutPage() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);
    const opacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);

    return (
        <div ref={containerRef} className="min-h-screen bg-[#F8FAFC] selection:bg-emerald-500 selection:text-white font-sans overflow-x-hidden">
            
            {/* --- BACK NAVIGATION --- */}
            <nav className="fixed top-6 left-6 z-50">
                <Link href="/" className="group flex items-center gap-3 bg-white/90 backdrop-blur-xl border border-slate-200 px-5 py-2.5 rounded-full shadow-lg hover:border-emerald-500/50 transition-all">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform text-slate-600" />
                    <span className="text-sm font-black text-slate-900">Back to Home</span>
                </Link>
            </nav>

            {/* --- HERO: THE VISION --- */}
            <section className="relative h-[90vh] flex flex-col items-center justify-center text-center px-6">
                <motion.div style={{ scale, opacity }} className="max-w-5xl">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-8 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 shadow-sm"
                    >
                        <Zap className="w-4 h-4 fill-emerald-600" />
                        <span className="text-xs font-bold uppercase tracking-[0.2em]">Est. 2026 // Kathmandu</span>
                    </motion.div>
                    
                    <h1 className="text-6xl md:text-[8rem] font-black text-slate-900 tracking-tighter leading-[0.85] mb-10">
                        WE BUILD THE <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-b from-emerald-400 to-emerald-700">FUTURE.</span>
                    </h1>
                    
                    <p className="text-xl md:text-2xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
                        GeckoRMS was born from a simple obsession: <br className="hidden md:block" /> 
                        making restaurant technology faster than the speed of service.
                    </p>
                </motion.div>

                {/* Floating Decorative Blobs */}
                <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
                    <div className="absolute top-[20%] left-[10%] w-72 h-72 bg-emerald-100/40 rounded-full blur-[100px] animate-pulse" />
                    <div className="absolute bottom-[10%] right-[10%] w-96 h-96 bg-blue-100/30 rounded-full blur-[120px] animate-pulse delay-1000" />
                </div>
            </section>

            {/* --- KINETIC TYPOGRAPHY SECTION --- */}
            <section className="py-24 border-y border-slate-100 bg-white">
                <ParallaxText baseVelocity={-40}>FASTEST POS IN NEPAL</ParallaxText>
                <ParallaxText baseVelocity={40}>ENGINEERED FOR SPEED</ParallaxText>
            </section>

            {/* --- THE MISSION: THE LAG KILLER --- */}
            <section className="py-32 px-6 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
                    
                    {/* Left: The Specs */}
                    <motion.div 
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="lg:col-span-7 space-y-8"
                    >
                        <div className="inline-flex items-center gap-3 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-red-500 font-black text-[10px] uppercase tracking-widest">
                            <motion.div animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-2 h-2 bg-red-500 rounded-full" />
                            Live Target: Nullify Lag
                        </div>
                        
                        <h2 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-[0.95]">
                            Our Mission is <br/> 
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-orange-500 to-amber-500">to kill the lag.</span>
                        </h2>
                        
                        <p className="text-xl md:text-2xl text-slate-500 leading-relaxed font-medium max-w-2xl">
                            Traditional POS systems are slow, complex, and prone to theft. We built GeckoRMS to be a high-performance OS that empowers staff and protects owners.
                        </p>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-10">
                            <div className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:border-emerald-500/50 transition-all group">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover:text-emerald-500 transition-colors">Sync Latency</p>
                                <h4 className="text-5xl font-black text-slate-900 tracking-tighter">200<span className="text-xl ml-1 text-slate-300">ms</span></h4>
                            </div>
                            <div className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:border-emerald-500/50 transition-all group">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover:text-emerald-500 transition-colors">Uptime</p>
                                <h4 className="text-5xl font-black text-slate-900 tracking-tighter">99.9<span className="text-xl ml-1 text-slate-300">%</span></h4>
                            </div>
                            <div className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:border-emerald-500/50 transition-all group">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover:text-emerald-500 transition-colors">Runtime</p>
                                <h4 className="text-5xl font-black text-slate-900 tracking-tighter">V8<span className="text-xl ml-1 text-slate-300">JS</span></h4>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right: The Virtual Hardware */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="lg:col-span-5 relative aspect-[4/5] rounded-[4rem] overflow-hidden bg-slate-950 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] group"
                    >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.15),transparent)]" />
                        <div className="absolute inset-0 flex items-center justify-center">
                             <motion.div 
                                animate={{ 
                                    boxShadow: ["0 0 20px rgba(16,185,129,0.1)", "0 0 60px rgba(16,185,129,0.3)", "0 0 20px rgba(16,185,129,0.1)"],
                                    rotate: [0, 5, 0]
                                }}
                                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                                className="w-56 h-56 bg-slate-900 border border-white/10 rounded-[3rem] flex items-center justify-center relative z-10"
                             >
                                <img src="/paw.png" className="w-24 h-24 brightness-200 grayscale contrast-200" alt="Core" />
                                <div className="absolute bottom-6 font-mono text-[9px] text-emerald-500/50 font-bold uppercase tracking-[0.3em]">
                                    GECKO_NEURAL_ENGINE
                                </div>
                             </motion.div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* --- CORE VALUES BENTO --- */}
            <section className="py-32 px-6 bg-slate-50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-24">
                        <h2 className="text-4xl md:text-7xl font-black text-slate-900 mb-6 tracking-tight">Our DNA.</h2>
                        <p className="text-slate-500 text-xl font-medium max-w-xl mx-auto">The principles that guide every single line of code we ship.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <ValueCard delay={0.1} icon={Zap} title="Velocity First" desc="If it's not instant, it's not good enough. We optimize for the sub-millisecond experience." />
                        <ValueCard delay={0.2} icon={Globe} title="Kathmandu Roots" desc="Built locally for Nepal. We solve local challenges with world-class engineering." />
                        <ValueCard delay={0.3} icon={ShieldCheck} title="Zero-Trust" desc="We believe in total transparency. Every void, discount, and tap is secured forever." />
                    </div>
                </div>
            </section>

            {/* --- PREMIUM TITANIUM CTA SECTION --- */}
            <section className="relative py-48 bg-[#020617] overflow-hidden">
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.1] [mask-image:radial-gradient(ellipse_at_center,black,transparent)]" />
                
                <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }} 
                    transition={{ duration: 10, repeat: Infinity }} 
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[800px] bg-emerald-500/20 rounded-full blur-[160px] pointer-events-none" 
                />

                <div className="container mx-auto px-6 relative z-10 text-center">
                    <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="mb-12 inline-flex items-center gap-3 px-6 py-2 bg-white/5 border border-white/10 backdrop-blur-md rounded-full">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inset-0 rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">Alpha Deployment Phase</span>
                    </motion.div>

                    <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} className="text-7xl md:text-[11rem] font-black tracking-tighter text-white mb-10 leading-[0.8]">
                        Ready to <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/10">EVOLVE?</span>
                    </motion.h2>

                    <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="text-slate-400 text-xl md:text-2xl mb-20 max-w-2xl mx-auto font-medium leading-relaxed">
                        Weaponize speed. Eliminate theft. Join the elite group of restaurants running on GeckoOS.
                    </motion.p>
                    
                    <div className="flex flex-col items-center gap-10">
                        <Link href="/login" className="group relative">
                            <div className="absolute -inset-1 bg-emerald-500 rounded-full blur opacity-20 group-hover:opacity-60 transition duration-500"></div>
                            <MagneticButton className="h-24 px-20 text-3xl">
                                Join the Alpha <ArrowRight className="ml-3 w-8 h-8 group-hover:translate-x-2 transition-transform" />
                            </MagneticButton>
                        </Link>

                        <Link href="https://wa.me/9779765009755" target="_blank" className="flex items-center gap-3 text-slate-500 hover:text-emerald-400 transition-colors font-bold tracking-widest text-xs uppercase">
                            <MessageSquare className="w-4 h-4" />
                            Direct VIP Line: +977 9765009755
                        </Link>
                    </div>

                    <div className="mt-32 pt-16 border-t border-white/5 flex flex-col md:flex-row items-center justify-center gap-12 text-slate-600 font-black uppercase tracking-[0.4em] text-[10px]">
                        <span>Kathmandu, NP</span>
                        <div className="w-1 h-1 bg-white/20 rounded-full hidden md:block" />
                        <span>Global Access Ready</span>
                        <div className="w-1 h-1 bg-white/20 rounded-full hidden md:block" />
                        <span>2025 // Gecko Works</span>
                    </div>
                </div>
            </section>

            <footer className="py-12 bg-white border-t border-slate-100 text-center">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Designed for High-Volume Excellence // © 2025</p>
            </footer>
        </div>
    );
}