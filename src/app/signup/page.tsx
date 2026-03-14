"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from "framer-motion";
import {
    Store, User, Mail, Phone, MessageSquare,
    ArrowRight, Loader2, CheckCircle2, ArrowLeft, Utensils
} from "lucide-react";
import { toast } from "sonner";
import { requestSubscription } from "@/app/actions/subscription";

// --- 1. ULTRA-PREMIUM TILT CARD (Light Premium - GPU Accelerated) ---
function TiltCard({ children }: { children: React.ReactNode }) {
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Light mass prevents trailing calculation lag on low-end CPUs
    const mouseX = useSpring(x, { stiffness: 200, damping: 30, mass: 0.5 });
    const mouseY = useSpring(y, { stiffness: 200, damping: 30, mass: 0.5 });

    function onMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
        const { left, top, width, height } = currentTarget.getBoundingClientRect();
        x.set(clientX - left - width / 2);
        y.set(clientY - top - height / 2);
    }

    const rotateX = useTransform(mouseY, [-400, 400], [2.5, -2.5]);
    const rotateY = useTransform(mouseX, [-400, 400], [-2.5, 2.5]);
    const shineX = useTransform(mouseX, [-400, 400], ["0%", "100%"]);

    return (
        <motion.div
            style={{ rotateX, rotateY, perspective: 1200 }}
            onMouseMove={onMouseMove}
            onMouseLeave={() => { x.set(0); y.set(0); }}
            className="relative z-20 w-full max-w-[500px] perspective-container group transform-gpu will-change-transform"
        >
            <motion.div
                style={{ background: useTransform(shineX, x => `linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.7) ${x}, transparent 80%)`) }}
                className="absolute inset-0 rounded-[3rem] z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"
            />
            {children}
        </motion.div>
    );
}

export default function SubscriptionPage() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        restaurantName: "",
        fullName: "",
        email: "",
        phone: "",
        message: ""
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const res = await requestSubscription(formData);

        if (res.success) {
            setSuccess(true);
            toast.success("Request Transmitted!", {
                description: "Our enterprise team will contact you shortly.",
                icon: <div className="w-5 h-5 bg-emerald-500 rounded-full" />
            });
        } else {
            toast.error("Transmission Failed", { description: res.error });
        }

        setLoading(false);
    };

    return (
        <div className="min-h-[100dvh] bg-[#F8FAFC] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden selection:bg-emerald-500 selection:text-white font-sans">

            {/* --- ALIVE BACKGROUND (Light/Premium GPU) --- */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 45, 0], x: [0, 50, 0] }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[-20%] left-[-10%] w-[120vw] h-[120vw] bg-emerald-200/20 rounded-full blur-[120px] will-change-transform transform-gpu"
                />
                <motion.div
                    animate={{ scale: [1, 1.1, 1], rotate: [0, -45, 0], x: [0, -50, 0] }}
                    transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-[-20%] right-[-10%] w-[120vw] h-[120vw] bg-teal-100/30 rounded-full blur-[100px] will-change-transform transform-gpu"
                />
            </div>

            {/* --- PREMIUM FLOATING NAVBAR --- */}
            <nav className="absolute top-4 left-0 right-0 z-50 px-4 pointer-events-none">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <Link href="/" className="pointer-events-auto group bg-white/80 backdrop-blur-xl border border-white shadow-lg shadow-slate-200/30 px-5 py-2.5 rounded-full flex items-center gap-3 hover:shadow-emerald-500/10 transition-all transform-gpu">
                        <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-emerald-600 transition-colors" />
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-900 group-hover:text-emerald-600 transition-colors">Back</span>
                    </Link>
                    
                    <Link href="/login" className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-full shadow-md hover:border-emerald-200 hover:text-emerald-600 transition-all transform-gpu active:scale-95">
                        <span className="text-xs font-bold uppercase tracking-widest">Login</span>
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </nav>

            {/* --- MAIN INTERFACE --- */}
            <TiltCard>
                <motion.div
                    initial={{ opacity: 0, y: 40, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.5 }}
                    className="w-full bg-white/80 backdrop-blur-2xl border border-white shadow-[0_30px_80px_-15px_rgba(0,0,0,0.08)] rounded-[3rem] p-8 md:p-12 relative overflow-hidden ring-1 ring-slate-100 transform-gpu will-change-transform mt-16 md:mt-0"
                >
                    <div className="relative z-10 flex flex-col items-center">

                        <AnimatePresence mode="wait">
                        {success ? (
                            <motion.div 
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }} 
                                animate={{ opacity: 1, scale: 1 }} 
                                transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.5 }}
                                className="text-center py-10 transform-gpu"
                            >
                                <div className="w-24 h-24 bg-emerald-50 rounded-[2rem] flex items-center justify-center shadow-inner mx-auto mb-8 border border-emerald-100">
                                    <CheckCircle2 className="w-12 h-12 text-emerald-500 drop-shadow-sm" />
                                </div>
                                <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-4">Request Received</h2>
                                <p className="text-slate-500 font-bold leading-relaxed mb-10 text-sm">
                                    We have sent a confirmation to <b className="text-slate-800">{formData.email}</b>.<br /> Our enterprise team will contact you shortly to configure your workspace.
                                </p>
                                <Link href="/">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.5 }}
                                        className="w-full h-16 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-emerald-500/20 transform-gpu"
                                    >
                                        Return Home
                                    </motion.button>
                                </Link>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="form" 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                exit={{ opacity: 0, y: -20 }} 
                                transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.5 }}
                                className="w-full transform-gpu"
                            >
                                {/* --- PAW LOGO --- */}
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.5, delay: 0.1 }}
                                    className="w-20 h-20 bg-gradient-to-b from-white to-slate-50 rounded-2xl flex items-center justify-center shadow-xl shadow-slate-200/50 mx-auto mb-8 relative group border border-slate-100 transform-gpu"
                                >
                                    <img src="/paw.png" alt="Gecko Paw" className="w-10 h-10 object-contain drop-shadow-sm group-hover:scale-110 transition-transform duration-500" />
                                </motion.div>

                                <div className="text-center mb-8 space-y-2">
                                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                                        Request Access
                                    </h1>
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-1.5">
                                        <Utensils className="w-3.5 h-3.5 text-emerald-500" />  Let’s set up your restaurant
                                    </p>
                                </div>

                                {/* REMOVED layout PROPS FROM FORM ELEMENTS TO FIX TYPING LAG */}
                                <form onSubmit={handleSubmit} className="w-full space-y-4">

                                    {/* RESTAURANT NAME */}
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1.5 block">Business Details</label>
                                        <div className="relative group mb-3">
                                            <input
                                                name="restaurantName"
                                                type="text"
                                                required
                                                value={formData.restaurantName}
                                                onChange={handleChange}
                                                placeholder="Restaurant / Cafe Name"
                                                className="w-full h-14 pl-12 pr-6 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm transform-gpu"
                                            />
                                            <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                        </div>
                                        <div className="relative group">
                                            <input
                                                name="fullName"
                                                type="text"
                                                required
                                                value={formData.fullName}
                                                onChange={handleChange}
                                                placeholder="Your Full Name"
                                                className="w-full h-14 pl-12 pr-6 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm transform-gpu"
                                            />
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                        {/* EMAIL */}
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1.5 block">Contact</label>
                                            <div className="relative group">
                                                <input
                                                    name="email"
                                                    type="email"
                                                    required
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    placeholder="Email Address"
                                                    className="w-full h-14 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm transform-gpu"
                                                />
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                            </div>
                                        </div>

                                        {/* PHONE */}
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1.5 hidden sm:block">Phone</label>                                
                                            <div className="relative group">
                                                <input
                                                    name="phone"
                                                    type="tel"
                                                    required
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                    placeholder="Phone No."
                                                    className="w-full h-14 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm transform-gpu"
                                                />
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* MESSAGE */}
                                    <div className="pt-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1.5 block">Requirements (Optional)</label>
                                        <div className="relative group">
                                            <textarea
                                                name="message"
                                                value={formData.message}
                                                onChange={handleChange}
                                                placeholder="Tell us about your setup needs..."
                                                className="w-full h-24 pl-11 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm resize-none custom-scrollbar transform-gpu"
                                            />
                                            <MessageSquare className="absolute left-4 top-4 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                        </div>
                                    </div>

                                    {/* SUBMIT BUTTON */}
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.5 }}
                                        disabled={loading}
                                        className="w-full h-16 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-3 mt-6 relative overflow-hidden group transform-gpu hover:shadow-2xl hover:shadow-emerald-500/40 disabled:opacity-60"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                                        <div className="relative flex items-center gap-2">
                                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "TRANSMIT REQUEST"}
                                        </div>
                                    </motion.button>
                                </form>
                            </motion.div>
                        )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </TiltCard>

            <div className="absolute bottom-6 flex items-center gap-2 opacity-60">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gecko Systems v2.1 • Secure Channel</p>
            </div>
        </div>
    )
}