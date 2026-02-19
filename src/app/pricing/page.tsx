"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useMotionTemplate, useInView } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Check, Zap, Shield, Rocket, HelpCircle, MessageCircle, ChevronDown } from "lucide-react";

// --- UTILS ---
// Detect touch devices to disable heavy JS mouse tracking on mobile for 120fps performance
function useIsTouchDevice() {
    const [isTouch, setIsTouch] = useState(false);
    useEffect(() => {
        setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
    }, []);
    return isTouch;
}

// --- 1. COMPONENT: SPOTLIGHT PRICING CARD ---
function PricingCard({ plan, isAnnual, index }: any) {
  const isTouch = useIsTouchDevice();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    if (isTouch) return; // Skip on mobile for buttery scrolling
    let { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;

  return (
    
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.1, type: "spring", stiffness: 100 }}
      onMouseMove={handleMouseMove}
      className={`relative group flex flex-col p-8 rounded-[2.5rem] border will-change-transform ${
        plan.popular 
          ? "bg-slate-900 border-slate-800 text-white shadow-[0_20px_50px_-12px_rgba(16,185,129,0.3)] md:scale-105 z-10" 
          : "bg-white border-slate-200 text-slate-900 shadow-xl shadow-slate-200/20"
      } transition-all duration-500 hover:-translate-y-2`}
    >
      
      {/* Spotlight Glow (Desktop Only) */}
      {!isTouch && (
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-[2.5rem] opacity-0 transition duration-500 group-hover:opacity-100"
          style={{
            background: useMotionTemplate`
              radial-gradient(
                400px circle at ${mouseX}px ${mouseY}px,
                ${plan.popular ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.08)"},
                transparent 80%
              )
            `,
          }}
        />
      )}

      {plan.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-400 to-emerald-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg shadow-emerald-500/30">
          Most Popular
        </div>
      )}

      <div className="mb-8 relative z-10">
        <h3 className={`text-2xl font-black mb-2 ${plan.popular ? "text-emerald-400" : "text-slate-900"}`}>{plan.name}</h3>
        <p className={`text-sm font-medium ${plan.popular ? "text-slate-400" : "text-slate-500"}`}>{plan.desc}</p>
      </div>

      <div className="mb-8 flex items-baseline gap-1 relative z-10">
        <span className="text-4xl font-black opacity-80">Rs</span>
        <div className="overflow-hidden h-[70px] flex items-center">
            <AnimatePresence mode="popLayout">
                <motion.span 
                    key={price}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -40 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="text-6xl md:text-7xl font-black tracking-tighter"
                >
                    {price}
                </motion.span>
            </AnimatePresence>
        </div>
        <span className={`text-sm font-bold ${plan.popular ? "text-slate-500" : "text-slate-400"}`}>/mo</span>
      </div>

      <div className="space-y-4 mb-10 flex-1 relative z-10">
        {plan.features.map((feature: string, i: number) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${plan.popular ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>
              <Check className="w-3.5 h-3.5 stroke-[3px]" />
            </div>
            <span className="text-sm font-bold opacity-90">{feature}</span>
          </div>
        ))}
      </div>

      <Link href="https://wa.me/9779765009755" target="_blank" className="w-full relative z-10">
        <button className={`w-full h-14 rounded-2xl font-black text-sm transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 ${
          plan.popular 
            ? "bg-white text-slate-900 hover:bg-emerald-50 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]" 
            : "bg-slate-900 text-white hover:bg-slate-800 hover:shadow-[0_0_20px_rgba(0,0,0,0.2)]"
        }`}>
          {plan.cta}
          <ArrowLeft className="w-4 h-4 rotate-180" />
        </button>
      </Link>
    </motion.div>
  );
}

// --- 2. COMPONENT: SLEEK FAQ ---
function FAQItem({ q, a }: { q: string, a: string }) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-slate-200 py-4 last:border-0">
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="w-full flex items-center justify-between text-left py-2 group"
            >
                <span className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">{q}</span>
                <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ type: "spring", stiffness: 200 }}>
                    <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-emerald-500" />
                </motion.div>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <p className="pb-4 text-slate-500 leading-relaxed pt-2">{a}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// --- MAIN PRICING PAGE ---
export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true);

  const plans = [
    {
      name: "Starter",
      desc: "Perfect for cloud kitchens & small cafes.",
      monthlyPrice: "2,500",
      annualPrice: "1,999",
      features: ["Single Terminal", "Basic Inventory", "Digital QR Menu", "Daily Email Reports"],
      cta: "Get Started",
      popular: false
    },
    {
      name: "Standard",
      desc: "Best for high-volume full-service restaurants.",
      monthlyPrice: "5,500",
      annualPrice: "4,499",
      features: ["Multi-Terminal Sync", "Kitchen Display (KDS)", "Advanced Inventory", "Staff Performance Audit", "SMS/WhatsApp Alerts"],
      cta: "Go Pro",
      popular: true
    },
    {
      name: "Business",
      desc: "Custom solutions for multi-location chains.",
      monthlyPrice: "Custom",
      annualPrice: "Custom",
      features: ["Unlimited Outlets", "Centralized Analytics", "VIP Priority Support", "White-label Domain", "Custom API Access"],
      cta: "Talk to Sales",
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] selection:bg-emerald-500 selection:text-white font-sans overflow-x-hidden scroll-smooth">
      
      {/* 🌊 DYNAMIC BACKGROUND BLOB (GPU Accelerated) */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
          <motion.div 
            animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-300/20 rounded-full blur-[120px] will-change-transform" 
          />
          <motion.div 
            animate={{ x: [0, -40, 0], y: [0, -50, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-teal-200/20 rounded-full blur-[100px] will-change-transform" 
          />
      </div>

      {/* --- NAVBAR --- */}
      <nav className="fixed top-6 left-6 z-50">
        <Link href="/" className="group flex items-center gap-3 bg-white/80 backdrop-blur-xl border border-slate-200 px-5 py-2.5 rounded-full shadow-lg hover:shadow-emerald-500/10 transition-all">
          <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-emerald-600 group-hover:-translate-x-1 transition-all" />
          <span className="text-sm font-black text-slate-900 group-hover:text-emerald-600 transition-colors">Back</span>
        </Link>
      </nav>

      {/* --- HERO --- */}
      <section className="pt-40 pb-20 px-6 text-center">
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, type: "spring" }}
        >
            <h1 className="text-5xl md:text-8xl font-black text-slate-900 tracking-tighter mb-6 leading-[0.9]">
                Pricing that <br/> 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500 pb-2 inline-block">Scales.</span>
            </h1>
            <p className="text-xl text-slate-500 font-medium max-w-xl mx-auto mb-12 leading-relaxed">
                Transparent rates. No setup fees. <br className="hidden md:block" />
                Join the fastest restaurant network in Nepal.
            </p>
        </motion.div>

        {/* Toggle Billing */}
        <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-16"
        >
          <div className="flex items-center gap-4 bg-white p-2 rounded-full border border-slate-200 shadow-sm">
              <span className={`text-sm font-black pl-4 transition-colors ${!isAnnual ? "text-slate-900" : "text-slate-400"}`}>Monthly</span>
              <button 
                onClick={() => setIsAnnual(!isAnnual)}
                className="w-16 h-8 bg-slate-100 rounded-full p-1 relative transition-colors shadow-inner"
                aria-label="Toggle billing period"
              >
                <motion.div 
                    animate={{ x: isAnnual ? 32 : 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="w-6 h-6 bg-white rounded-full shadow-md z-10 relative flex items-center justify-center" 
                >
                    <div className={`w-2 h-2 rounded-full transition-colors ${isAnnual ? "bg-emerald-500" : "bg-slate-300"}`} />
                </motion.div>
                <div className={`absolute inset-0 rounded-full transition-opacity duration-300 ${isAnnual ? "bg-emerald-400/20 opacity-100" : "opacity-0"}`} />
              </button>
              <span className={`text-sm font-black pr-4 transition-colors ${isAnnual ? "text-slate-900" : "text-slate-400"}`}>Yearly</span>
          </div>
          
          <motion.div 
            animate={{ y: [0, -5, 0] }} 
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="text-emerald-700 bg-emerald-100 border border-emerald-200 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-sm"
          >
              Save up to 20%
          </motion.div>
        </motion.div>
      </section>

      {/* --- PRICING GRID --- */}
      <section className="max-w-6xl mx-auto px-6 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6 items-center">
          {plans.map((plan, i) => (
            <PricingCard key={i} index={i} plan={plan} isAnnual={isAnnual} />
          ))}
        </div>
      </section>

      {/* --- FAQ SECTION (NEW ADDITION) --- */}
      <section className="max-w-3xl mx-auto px-6 pb-32">
          <div className="text-center mb-12">
              <h2 className="text-3xl font-black text-slate-900">Frequently Asked Questions</h2>
          </div>
          <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
            <FAQItem q="Do you charge a setup or installation fee?" a="No, our setup is 100% free. You can do it yourself in 15 minutes, or our team can guide you over a quick phone call." />
            <FAQItem q="Can I change my plan later?" a="Absolutely. You can upgrade or downgrade your plan at any time. Prorated charges will be applied automatically." />
            <FAQItem q="What hardware do I need to buy?" a="None! Gecko runs purely on the web. You can use your existing iPads, Android tablets, laptops, or even smartphones." />
            <FAQItem q="Is my restaurant data safe?" a="Yes. We use bank-grade 256-bit encryption and back up your data in real-time. Only you have access to your financial reports." />
          </div>
      </section>

      {/* --- TRUST FOOTER --- */}
      <section className="bg-slate-950 py-24 relative overflow-hidden rounded-t-[3rem] mt-10">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-16 text-center lg:text-left">
            <div className="col-span-1 lg:col-span-2 flex flex-col items-center lg:items-start justify-center">
                <h2 className="text-4xl md:text-5xl font-black text-white mb-6">Ready to upgrade?</h2>
                <p className="text-slate-400 text-lg mb-8 max-w-md">Our engineers can visit your location in Kathmandu for a free physical demo.</p>
                <Link href="https://wa.me/9779765009755" target="_blank" className="group bg-emerald-500 text-white px-8 h-14 rounded-2xl flex items-center justify-center gap-3 font-black shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:bg-emerald-400 hover:scale-[1.02] transition-all w-full sm:w-auto">
                    <MessageCircle className="w-5 h-5 group-hover:animate-bounce" /> Chat with Sales
                </Link>
            </div>
            
            <div className="space-y-10">
                <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start text-center sm:text-left">
                    <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center flex-shrink-0 text-emerald-400 shadow-inner"><Shield className="w-6 h-6" /></div>
                    <div>
                        <h4 className="text-white font-bold mb-2 text-lg">Ironclad Security</h4>
                        <p className="text-slate-400 text-sm leading-relaxed">Full audit trails for every transaction. Say goodbye to revenue leakage.</p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start text-center sm:text-left">
                    <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center flex-shrink-0 text-emerald-400 shadow-inner"><Zap className="w-6 h-6" /></div>
                    <div>
                        <h4 className="text-white font-bold mb-2 text-lg">12ms Latency</h4>
                        <p className="text-slate-400 text-sm leading-relaxed">Fastest cloud database in the RMS world. Zero lag POS experience.</p>
                    </div>
                </div>
            </div>

            <div className="space-y-10">
                <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start text-center sm:text-left">
                    <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center flex-shrink-0 text-emerald-400 shadow-inner"><Rocket className="w-6 h-6" /></div>
                    <div>
                        <h4 className="text-white font-bold mb-2 text-lg">Scale Fast</h4>
                        <p className="text-slate-400 text-sm leading-relaxed">Open new locations in minutes with auto-syncing global inventory.</p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start text-center sm:text-left">
                    <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center flex-shrink-0 text-emerald-400 shadow-inner"><HelpCircle className="w-6 h-6" /></div>
                    <div>
                        <h4 className="text-white font-bold mb-2 text-lg">24/7 Support</h4>
                        <p className="text-slate-400 text-sm leading-relaxed">Dedicated Nepali-based engineering support available on call.</p>
                    </div>
                </div>
            </div>
          </div>
        </div>
        
        {/* Footer Bottom */}
        <div className="mt-24 py-8 border-t border-white/10 text-center relative z-10">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">© 2026 Gecko Works Nepal. All rights reserved.</p>
        </div>
      </section>
    </div>
  );
}