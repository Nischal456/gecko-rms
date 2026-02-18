"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useMotionTemplate } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Check, Zap, Shield, Rocket, HelpCircle, MessageCircle } from "lucide-react";

// --- 1. COMPONENT: SPOTLIGHT PRICING CARD ---
function PricingCard({ plan, isAnnual }: any) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    let { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`relative group flex flex-col p-8 rounded-[2.5rem] border ${
        plan.popular ? "bg-slate-900 border-slate-800 text-white shadow-2xl scale-105 z-10" : "bg-white border-slate-200 text-slate-900"
      } transition-all duration-500`}
    >
      {/* Spotlight Glow */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-[2.5rem] opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              400px circle at ${mouseX}px ${mouseY}px,
              ${plan.popular ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.08)"},
              transparent 80%
            )
          `,
        }}
      />

      {plan.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
          Most Popular
        </div>
      )}

      <div className="mb-8">
        <h3 className={`text-xl font-black mb-2 ${plan.popular ? "text-emerald-400" : "text-slate-900"}`}>{plan.name}</h3>
        <p className={`text-sm font-medium ${plan.popular ? "text-slate-400" : "text-slate-500"}`}>{plan.desc}</p>
      </div>

      <div className="mb-8 flex items-baseline gap-1">
        <span className="text-4xl font-black">Rs</span>
        <motion.span 
            key={price}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl font-black tracking-tighter"
        >
            {price}
        </motion.span>
        <span className={`text-sm font-bold ${plan.popular ? "text-slate-500" : "text-slate-400"}`}>/mo</span>
      </div>

      <div className="space-y-4 mb-10 flex-1">
        {plan.features.map((feature: string, i: number) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${plan.popular ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>
              <Check className="w-3 h-3 stroke-[3px]" />
            </div>
            <span className="text-sm font-bold opacity-90">{feature}</span>
          </div>
        ))}
      </div>

      <Link href="https://wa.me/9779765009755" target="_blank" className="w-full">
        <button className={`w-full h-14 rounded-2xl font-black text-sm transition-all active:scale-95 ${
          plan.popular ? "bg-white text-slate-900 hover:bg-emerald-50" : "bg-slate-900 text-white hover:bg-black"
        }`}>
          {plan.cta}
        </button>
      </Link>
    </motion.div>
  );
}

// --- MAIN PRICING PAGE ---
export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true);

  const plans = [
    {
      name: "Lite",
      desc: "Perfect for cloud kitchens & small cafes.",
      monthlyPrice: "2,500",
      annualPrice: "1,999",
      features: ["Single Terminal", "Basic Inventory", "Digital QR Menu", "Daily Email Reports"],
      cta: "Get Started",
      popular: false
    },
    {
      name: "Pro",
      desc: "Best for high-volume full-service restaurants.",
      monthlyPrice: "5,500",
      annualPrice: "4,499",
      features: ["Multi-Terminal Sync", "Kitchen Display (KDS)", "Advanced Inventory", "Staff Performance Audit", "SMS/WhatsApp Alerts"],
      cta: "Go Pro",
      popular: true
    },
    {
      name: "Scale",
      desc: "Custom solutions for multi-location chains.",
      monthlyPrice: "Custom",
      annualPrice: "Custom",
      features: ["Unlimited Outlets", "Centralized Analytics", "VIP Priority Support", "White-label Domain", "Custom API Access"],
      cta: "Talk to Sales",
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] selection:bg-emerald-500 selection:text-white font-sans overflow-x-hidden">
      
      {/* 🌊 DYNAMIC BACKGROUND BLOB */}
      <div className="fixed top-0 left-0 right-0 h-[600px] pointer-events-none -z-10 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-100/40 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-blue-100/30 rounded-full blur-[100px] animate-pulse delay-700" />
      </div>

      {/* --- NAVBAR --- */}
      <nav className="fixed top-6 left-6 z-50">
        <Link href="/" className="group flex items-center gap-3 bg-white/80 backdrop-blur-xl border border-slate-200 px-5 py-2.5 rounded-full shadow-lg hover:shadow-emerald-500/10 transition-all">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-black text-slate-900">Back to Gecko</span>
        </Link>
      </nav>

      {/* --- HERO --- */}
      <section className="pt-32 pb-20 px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter mb-6 leading-[0.9]">
                Pricing that <br/> 
                <span className="text-transparent bg-clip-text bg-gradient-to-b from-emerald-400 to-emerald-700 underline decoration-emerald-200 decoration-4 underline-offset-8">Scales.</span>
            </h1>
            <p className="text-xl text-slate-500 font-medium max-w-xl mx-auto mb-12">
                Transparent rates. No setup fees. <br className="hidden md:block" />
                Join the fastest restaurant network in Nepal.
            </p>
        </motion.div>

        {/* Toggle Billing */}
        <div className="flex items-center justify-center gap-4 mb-16">
          <span className={`text-sm font-black ${!isAnnual ? "text-slate-900" : "text-slate-400"}`}>Monthly</span>
          <button 
            onClick={() => setIsAnnual(!isAnnual)}
            className="w-16 h-8 bg-slate-200 rounded-full p-1 relative transition-colors group"
          >
            <motion.div 
                animate={{ x: isAnnual ? 32 : 0 }}
                className="w-6 h-6 bg-white rounded-full shadow-md z-10 relative" 
            />
            <div className={`absolute inset-0 rounded-full transition-opacity ${isAnnual ? "bg-emerald-500 opacity-100" : "opacity-0"}`} />
          </button>
          <span className={`text-sm font-black ${isAnnual ? "text-slate-900" : "text-slate-400"}`}>
            Yearly <span className="ml-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg text-[10px] uppercase tracking-wider animate-pulse">Save 20%</span>
          </span>
        </div>
      </section>

      {/* --- PRICING GRID --- */}
      <section className="max-w-7xl mx-auto px-6 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {plans.map((plan, i) => (
            <PricingCard key={i} plan={plan} isAnnual={isAnnual} />
          ))}
        </div>
      </section>

      {/* --- TRUST FOOTER --- */}
      <section className="bg-slate-900 py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 text-center md:text-left">
            <div className="col-span-1 md:col-span-2">
                <h2 className="text-3xl font-black text-white mb-4 italic">Still not sure?</h2>
                <p className="text-slate-400 text-lg mb-8 max-w-md">Our team of restaurant engineers can visit your location and set up a free physical demo.</p>
                <div className="flex flex-col sm:flex-row gap-4">
                    <Link href="https://wa.me/9779765009755" target="_blank" className="bg-emerald-500 text-white px-8 h-14 rounded-2xl flex items-center justify-center gap-2 font-black shadow-lg shadow-emerald-500/20 hover:scale-[1.02] transition-transform">
                        <MessageCircle className="w-5 h-5" /> Chat with Us
                    </Link>
                </div>
            </div>
            
            <div className="space-y-8">
                <div className="flex gap-4 items-start">
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center flex-shrink-0 text-emerald-400"><Shield className="w-6 h-6" /></div>
                    <div>
                        <h4 className="text-white font-bold mb-1">Ironclad Security</h4>
                        <p className="text-slate-500 text-sm">Full audit trails for every transaction. No more theft.</p>
                    </div>
                </div>
                <div className="flex gap-4 items-start">
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center flex-shrink-0 text-emerald-400"><Zap className="w-6 h-6" /></div>
                    <div>
                        <h4 className="text-white font-bold mb-1">12ms Latency</h4>
                        <p className="text-slate-500 text-sm">Fastest database in the RMS world. Zero lag POS.</p>
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                <div className="flex gap-4 items-start">
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center flex-shrink-0 text-emerald-400"><Rocket className="w-6 h-6" /></div>
                    <div>
                        <h4 className="text-white font-bold mb-1">Scale Fast</h4>
                        <p className="text-slate-500 text-sm">Open new locations in minutes. Auto-sync inventory.</p>
                    </div>
                </div>
                <div className="flex gap-4 items-start">
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center flex-shrink-0 text-emerald-400"><HelpCircle className="w-6 h-6" /></div>
                    <div>
                        <h4 className="text-white font-bold mb-1">24/7 Support</h4>
                        <p className="text-slate-500 text-sm">Nepali based support team available on call.</p>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <footer className="py-12 border-t border-slate-200 text-center">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">© 2025 Gecko Works Nepal</p>
      </footer>
    </div>
  );
}