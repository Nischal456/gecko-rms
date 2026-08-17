"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useMotionTemplate } from "framer-motion";
import Link from "next/link";
import { Check, Zap, Shield, Rocket, HelpCircle, MessageCircle, ChevronDown, ArrowLeft } from "lucide-react";

// --- UTILS ---
function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);
  return isTouch;
}

// --- 1. COMPONENT: SPOTLIGHT PRICING CARD (Light Premium) ---
function PricingCard({ plan, isAnnual }: any) {
  const isTouch = useIsTouchDevice();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const spotlightBackground = useMotionTemplate`
    radial-gradient(
      400px circle at ${mouseX}px ${mouseY}px,
      rgba(16, 185, 129, 0.06),
      transparent 80%
    )
  `;

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    if (isTouch) return;
    let { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;

  const currentFeatures = isAnnual
    ? [
      "15-Day Risk-Free Trial (FREE for 15 Days)",
      "ANNUAL BONUS: 3 MONTHS EXTRA FREE (16 Months Total Access)",
      "SECURITY DEPOSIT: Rs 0 (No Deposit Required)",
      "Annual Billing: Rs 17,988 / year (Rs 1,499 / mo)",
      "Unlimited Terminals, Staff Accounts & Users",
      "Kitchen Display System (KDS) & QR Menus",
      "Setup & Onboarding Assistance Available",
      "Hardware Independent (Use your own laptops/tablets)",
      "Data Ownership & Export Rights Retained",
      "Dedicated Nepalese Engineering Support"
    ]
    : [
      "15-Day Risk-Free Trial (FREE for 15 Days)",
      "Standard Monthly Billing: Rs 1,499 / month",
      "Security Deposit: Rs 3,000 (Refundable Deposit)",
      "Pay-as-you-go Monthly Flexibility",
      "Unlimited Terminals, Staff Accounts & Users",
      "Kitchen Display System (KDS) & QR Menus",
      "Setup & Onboarding Assistance Available",
      "Hardware Independent (Use your own laptops/tablets)",
      "Data Ownership & Export Rights Retained",
      "Dedicated Nepalese Engineering Support"
    ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
      onMouseMove={handleMouseMove}
      className="relative group flex flex-col p-8 md:p-10 rounded-[3rem] bg-white border-2 border-emerald-100 text-slate-900 shadow-[0_30px_80px_-15px_rgba(16,185,129,0.15)] will-change-transform transform-gpu mt-6"
    >
      {/* Light Mode Spotlight Glow */}
      {!isTouch && (
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-[3rem] opacity-0 transition duration-500 group-hover:opacity-100"
          style={{ background: spotlightBackground }}
        />
      )}

      {/* Dynamic Badge */}
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-full shadow-lg shadow-emerald-500/30 z-20">
        {isAnnual ? "BEST VALUE • 3 MONTHS EXTRA FREE" : "FLEXIBLE MONTHLY PLAN"}
      </div>

      <div className="text-center mb-8 relative z-10 mt-4">
        <h3 className="text-3xl md:text-4xl font-black mb-3 text-slate-900">{plan.name}</h3>
        <p className="text-sm font-bold text-slate-500">
          {isAnnual ? "Billed annually at Rs 17,988/year • Includes 3 Months Extra FREE" : "Billed monthly at Rs 1,499/month • Rs 3,000 Refundable Security Deposit"}
        </p>
      </div>

      <div className="mb-10 flex items-center justify-center gap-1 relative z-10 text-emerald-600">
        <span className="text-4xl font-black opacity-80 self-start mt-2">Rs</span>
        <div className="overflow-hidden h-[80px] flex items-center text-slate-900">
          <AnimatePresence mode="popLayout">
            <motion.span
              key={price}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.5 }}
              className="text-7xl md:text-8xl font-black tracking-tighter"
            >
              {price}
            </motion.span>
          </AnimatePresence>
        </div>
        <span className="text-sm font-bold text-slate-400 self-end mb-3">/mo</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 relative z-10 bg-slate-50/80 rounded-3xl p-6 border border-slate-100">
        {currentFeatures.map((feature: string, i: number) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-emerald-100 text-emerald-600 shadow-sm border border-emerald-200">
              <Check className="w-3.5 h-3.5 stroke-[3px]" />
            </div>
            <span className="text-sm font-bold text-slate-700">{feature}</span>
          </div>
        ))}
      </div>

      <Link href="/signup" className="w-full relative z-10">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full h-16 rounded-2xl font-black text-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-xl shadow-emerald-500/25 hover:shadow-2xl hover:shadow-emerald-500/40 transition-all flex items-center justify-center gap-2 transform-gpu"
        >
          {plan.cta}
          <Rocket className="w-5 h-5" />
        </motion.button>
      </Link>
    </motion.div>
  );
}

// --- 2. COMPONENT: SLEEK FAQ ---
function FAQItem({ q, a }: { q: string, a: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 py-5 last:border-0">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between text-left py-2 group">
        <span className="font-black text-slate-800 group-hover:text-emerald-600 transition-colors text-lg tracking-tight">{q}</span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ type: "spring", stiffness: 200 }} className="transform-gpu bg-slate-50 p-2 rounded-full group-hover:bg-emerald-50">
          <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-emerald-500" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden transform-gpu"
          >
            <p className="pb-4 text-slate-500 font-medium leading-relaxed pt-3">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// --- MAIN PRICING PAGE ---
export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true);

  const plan = {
    name: "Gecko RMS Pro",
    desc: "Official Commercial, Trial, Onboarding & Service Policy v1.0",
    monthlyPrice: "1,499",
    annualPrice: "1,499",
    cta: "Start 15-Day Free Trial",
    popular: true
  };

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
          <div className="flex items-center gap-3 md:gap-6">
            <Link href="/login" className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-emerald-600 transition-colors hidden sm:block">
              Terminal Login
            </Link>
            <Link href="/signup" className="bg-emerald-500 text-white px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-emerald-600 shadow-md shadow-emerald-500/20 transition-all transform-gpu active:scale-95">
              Start 15-Day Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* --- HERO --- */}
      <section className="pt-40 pb-16 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 300, damping: 30 }}
          className="transform-gpu"
        >
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter mb-6 leading-[0.9]">
            One powerful platform. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500 pb-2 inline-block">One simple price.</span>
          </h1>
          <p className="text-base md:text-lg text-slate-500 font-bold max-w-2xl mx-auto mb-10 leading-relaxed px-2">
            Gecko Works Nepal Pvt. Ltd. Official Commercial Policy v1.0
            <span className="block sm:inline font-bold text-slate-600 mt-1 sm:mt-0">
              {" "}• <span className="whitespace-nowrap text-emerald-700">15-Day Free Trial</span> & Transparent Subscriptions
            </span>
          </p>
        </motion.div>

        {/* Toggle Billing */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 30 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mb-12 transform-gpu"
        >
          <div className="flex items-center gap-4 bg-white p-2 rounded-full border border-slate-200 shadow-md">
            <span className={`text-sm font-black pl-4 transition-colors ${!isAnnual ? "text-slate-900" : "text-slate-400"}`}>Monthly</span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="w-16 h-8 bg-slate-100 rounded-full p-1 relative transition-colors shadow-inner"
            >
              <motion.div
                animate={{ x: isAnnual ? 32 : 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25, mass: 0.5 }}
                className="w-6 h-6 bg-white rounded-full shadow-md z-10 relative flex items-center justify-center transform-gpu"
              >
                <div className={`w-2 h-2 rounded-full transition-colors ${isAnnual ? "bg-emerald-500" : "bg-slate-300"}`} />
              </motion.div>
              <div className={`absolute inset-0 rounded-full transition-opacity duration-300 ${isAnnual ? "bg-emerald-400/20 opacity-100" : "opacity-0"}`} />
            </button>
            <span className={`text-sm font-black pr-4 transition-colors ${isAnnual ? "text-slate-900" : "text-slate-400"}`}>Yearly</span>
          </div>

          <div className="text-emerald-700 bg-emerald-100 border border-emerald-200 px-4 py-2 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-wider shadow-sm text-center max-w-full">
            {isAnnual ? "GET 3 MONTHS EXTRA FREE (16 MONTHS ACCESS) + RS 0 DEPOSIT!" : "15-DAY FREE TRIAL • RS 3,000 REFUNDABLE DEPOSIT"}
          </div>
        </motion.div>
      </section>

      {/* --- PRICING GRID (Centered Single Plan) --- */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <PricingCard plan={plan} isAnnual={isAnnual} />
      </section>

      {/* --- FAQ SECTION --- */}
      <section className="max-w-3xl mx-auto px-6 pb-32">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Frequently Asked Commercial Questions</h2>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Gecko Works Nepal Pvt. Ltd. Policy v1.0</p>
        </div>
        <div className="bg-white rounded-[2rem] border border-slate-200 p-6 md:p-10 shadow-xl shadow-slate-200/40">
          <FAQItem q="How does the 15-day free trial policy work?" a="Gecko Works offers eligible customers a 15-day free trial of Gecko RMS. No software subscription fee is charged during this 15 calendar days period. Setup, menu configuration, and onsite work are quoted separately." />
          <FAQItem q="What is the security deposit policy?" a="For monthly subscriptions, a refundable NPR 3,000 security deposit is collected upon entering a paid arrangement. For annual subscriptions, the security deposit is waived (NPR 0)." />
          <FAQItem q="What bonus comes with annual billing?" a="When you subscribe annually at NPR 1,499/month (NPR 17,988/year), you get 3 extra months FREE (16 months total access) plus Rs 0 Security Deposit!" />
          <FAQItem q="What hardware do I need to run Gecko RMS?" a="Gecko RMS is a web-based software system. You run it on standard laptops, tablets, touchscreens, and smartphones using standard web browsers. Hardware is purchased directly by the customer." />
          <FAQItem q="How are setup, onboarding, and training handled?" a="Account setup, menu entry, and staff training are quoted according to your restaurant's scope and confirmed in writing before work begins." />
          <FAQItem q="Is my restaurant data safe upon cancellation?" a="Yes. Customers retain full ownership of all data entered into Gecko RMS. Upon suspension or termination, data export methods are provided per agreement terms." />
        </div>
      </section>

      {/* --- TRUST FOOTER (LIGHT PREMIUM) --- */}
      <section className="bg-white py-24 relative overflow-hidden border-t border-slate-200">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 text-center lg:text-left">
            <div className="col-span-1 lg:col-span-2 flex flex-col items-center lg:items-start justify-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-emerald-100">
                <Rocket className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">Ready to upgrade?</h2>
              <p className="text-slate-500 font-medium text-lg mb-8 max-w-md">Our engineers can visit your location in Kathmandu for a free physical demo.</p>
              <Link href="https://wa.me/9779765009755" target="_blank" className="group bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-8 h-16 rounded-2xl flex items-center justify-center gap-3 font-black shadow-[0_10px_30px_rgba(16,185,129,0.3)] hover:shadow-[0_15px_40px_rgba(16,185,129,0.4)] hover:scale-[1.02] transition-all w-full sm:w-auto">
                <MessageCircle className="w-5 h-5 group-hover:animate-bounce" /> Chat with Sales
              </Link>
            </div>

            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start text-center sm:text-left">
                <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center flex-shrink-0 text-emerald-500 shadow-sm"><Shield className="w-5 h-5" /></div>
                <div>
                  <h4 className="text-slate-900 font-black mb-1 text-base">Ironclad Security</h4>
                  <p className="text-slate-500 font-medium text-sm leading-relaxed">Full audit trails for every transaction.</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start text-center sm:text-left">
                <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center flex-shrink-0 text-emerald-500 shadow-sm"><Zap className="w-5 h-5" /></div>
                <div>
                  <h4 className="text-slate-900 font-black mb-1 text-base">12ms Latency</h4>
                  <p className="text-slate-500 font-medium text-sm leading-relaxed">Fastest cloud database. Zero lag POS.</p>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start text-center sm:text-left">
                <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center flex-shrink-0 text-emerald-500 shadow-sm"><Check className="w-5 h-5" /></div>
                <div>
                  <h4 className="text-slate-900 font-black mb-1 text-base">Scale Fast</h4>
                  <p className="text-slate-500 font-medium text-sm leading-relaxed">Open new locations in minutes.</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start text-center sm:text-left">
                <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center flex-shrink-0 text-emerald-500 shadow-sm"><HelpCircle className="w-5 h-5" /></div>
                <div>
                  <h4 className="text-slate-900 font-black mb-1 text-base">24/7 Support</h4>
                  <p className="text-slate-500 font-medium text-sm leading-relaxed">Dedicated Nepali-based engineering support.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-16 py-6 border-t border-slate-100 text-center relative z-10">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">© 2026 Gecko Works Nepal Pvt. Ltd. • All rights reserved. • Policy Version 1.0</p>
        </div>
      </section>
    </div>
  );
}