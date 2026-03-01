"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from "framer-motion";
import {
    Store, User, Mail, Phone, MessageSquare,
    ArrowRight, Loader2, CheckCircle2, ArrowLeft,
    Sparkles,Utensils
} from "lucide-react";
import { toast } from "sonner";
import { requestSubscription } from "@/app/actions/subscription";

// --- 1. ULTRA-PREMIUM TILT CARD (Physics Tuned) ---
function TiltCard({ children }: { children: React.ReactNode }) {
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Heavy, expensive-feeling spring physics
    const mouseX = useSpring(x, { stiffness: 200, damping: 25, mass: 0.8 });
    const mouseY = useSpring(y, { stiffness: 200, damping: 25, mass: 0.8 });

    function onMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
        const { left, top, width, height } = currentTarget.getBoundingClientRect();
        x.set(clientX - left - width / 2);
        y.set(clientY - top - height / 2);
    }

    // Subtle 3D rotation
    const rotateX = useTransform(mouseY, [-400, 400], [2.5, -2.5]);
    const rotateY = useTransform(mouseX, [-400, 400], [-2.5, 2.5]);
    const shineX = useTransform(mouseX, [-400, 400], ["0%", "100%"]);

    return (
        <motion.div
            style={{ rotateX, rotateY, perspective: 1200 }}
            onMouseMove={onMouseMove}
            onMouseLeave={() => { x.set(0); y.set(0); }}
            className="relative z-20 w-full max-w-[500px] perspective-container group"
        >
            {/* Shine Effect */}
            <motion.div
                style={{ background: useTransform(shineX, x => `linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.4) ${x}, transparent 80%)`) }}
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
        <div className="min-h-[100dvh] bg-[#F4F7F5] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden selection:bg-emerald-500 selection:text-white font-sans">

            {/* --- ALIVE BACKGROUND --- */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none transform-gpu">
                <motion.div
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 45, 0], x: [0, 50, 0] }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[-20%] left-[-10%] w-[120vw] h-[120vw] bg-gradient-to-br from-emerald-100/50 to-teal-50/40 rounded-full blur-[120px] will-change-transform mix-blend-multiply"
                />
                <motion.div
                    animate={{ scale: [1, 1.1, 1], rotate: [0, -45, 0], x: [0, -50, 0] }}
                    transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-[-20%] right-[-10%] w-[120vw] h-[120vw] bg-gradient-to-tr from-cyan-100/50 to-emerald-50/40 rounded-full blur-[100px] will-change-transform mix-blend-multiply"
                />
            </div>

            {/* --- NAVIGATION --- */}
            <Link href="/" className="absolute top-6 left-6 md:top-10 md:left-10 z-40 group">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-3 px-5 py-2.5 bg-white/70 backdrop-blur-xl border border-white/60 rounded-full shadow-sm hover:shadow-lg transition-all text-slate-500 hover:text-slate-900"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">Back</span>
                </motion.button>
            </Link>

            <Link href="/login" className="absolute top-6 right-6 md:top-10 md:right-10 z-40">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-3 px-5 py-2.5 bg-slate-900 text-white rounded-full shadow-lg hover:bg-emerald-600 transition-colors"
                >
                    <span className="text-xs font-bold uppercase tracking-widest">Login</span>
                    <ArrowRight className="w-4 h-4" />
                </motion.button>
            </Link>

            {/* --- MAIN INTERFACE --- */}
            <TiltCard>
                <motion.div
                    layout
                    initial={{ opacity: 0, y: 40, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full bg-white/60 backdrop-blur-3xl border border-white/60 shadow-[0_40px_100px_-30px_rgba(16,185,129,0.15)] rounded-[3rem] p-8 md:p-12 relative overflow-hidden ring-1 ring-white/50"
                >
                    {/* Texture Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent pointer-events-none opacity-80" />

                    <div className="relative z-10 flex flex-col items-center">

                        {success ? (
                            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10">
                                <div className="w-28 h-28 bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-emerald-500/40 mx-auto mb-8 relative border border-emerald-300">
                                    <CheckCircle2 className="w-14 h-14 text-white drop-shadow-md" />
                                    <div className="absolute inset-0 rounded-[2rem] ring-4 ring-white/30" />
                                </div>
                                <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-4">Request Received</h2>
                                <p className="text-slate-500 font-medium leading-relaxed mb-10 text-sm">
                                    We have sent a confirmation to <b className="text-slate-700">{formData.email}</b>.<br /> Our enterprise team will contact you shortly to configure your workspace.
                                </p>
                                <Link href="/">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full h-14 bg-slate-900 text-white rounded-3xl font-black text-lg shadow-xl shadow-slate-900/20"
                                    >
                                        Return Home
                                    </motion.button>
                                </Link>
                            </motion.div>
                        ) : (
                            <>
                                {/* --- PAW LOGO --- */}
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                    className="w-24 h-24 bg-gradient-to-b from-white to-emerald-50 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-emerald-500/20 mb-6 relative group border border-white"
                                >
                                    <img src="/paw.png" alt="Gecko Paw" className="w-12 h-12 object-contain drop-shadow-md group-hover:scale-110 transition-transform duration-500" />
                                    <div className="absolute inset-0 rounded-[2rem] ring-4 ring-white/30" />
                                    <div className="absolute -inset-4 bg-emerald-400/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                </motion.div>

                                <div className="text-center mb-8 space-y-2">
                                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                                        Request <span className="text-emerald-500">Access</span>
                                    </h1>
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.1em] flex items-center justify-center gap-1">
                                        <Utensils className="w-3 h-3 text-amber-500" />  Let’s set up your restaurant digitally
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="w-full space-y-4">

                                    {/* RESTAURANT NAME */}
                                    <motion.div layout>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4 mb-1.5 block">Business Details</label>
                                        <div className="relative group mb-3">
                                            <input
                                                name="restaurantName"
                                                type="text"
                                                required
                                                value={formData.restaurantName}
                                                onChange={handleChange}
                                                placeholder="Restaurant / Cafe Name"
                                                className="w-full h-14 pl-14 pr-6 bg-white/50 border border-slate-200/60 rounded-3xl font-bold text-slate-800 placeholder:text-slate-300 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm text-sm"
                                            />
                                            <Store className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                        </div>
                                        <div className="relative group">
                                            <input
                                                name="fullName"
                                                type="text"
                                                required
                                                value={formData.fullName}
                                                onChange={handleChange}
                                                placeholder="Your Full Name"
                                                className="w-full h-14 pl-14 pr-6 bg-white/50 border border-slate-200/60 rounded-3xl font-bold text-slate-800 placeholder:text-slate-300 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm text-sm"
                                            />
                                            <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                        </div>
                                    </motion.div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                        {/* EMAIL */}
                                        <motion.div layout>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4 mb-1.5 block">Contact</label>
                                            <div className="relative group">
                                                <input
                                                    name="email"
                                                    type="email"
                                                    required
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    placeholder="Email Address"
                                                    className="w-full h-14 pl-12 pr-4 bg-white/50 border border-slate-200/60 rounded-3xl font-bold text-slate-800 placeholder:text-slate-300 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm text-sm"
                                                />
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                            </div>
                                        </motion.div>

                                        {/* PHONE */}
                                        <motion.div layout>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4 mb-1.5 hidden sm:block">
                                                Phone
                                            </label>                                <div className="relative group">
                                                <input
                                                    name="phone"
                                                    type="tel"
                                                    required
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                    placeholder="Phone No."
                                                    className="w-full h-14 pl-12 pr-4 bg-white/50 border border-slate-200/60 rounded-3xl font-bold text-slate-800 placeholder:text-slate-300 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm text-sm"
                                                />
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                            </div>
                                        </motion.div>
                                    </div>

                                    {/* MESSAGE */}
                                    <motion.div layout className="pt-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4 mb-1.5 block">Requirements (Optional)</label>
                                        <div className="relative group">
                                            <textarea
                                                name="message"
                                                value={formData.message}
                                                onChange={handleChange}
                                                placeholder="Tell us about your setup needs..."
                                                className="w-full h-24 pl-12 pr-6 py-4 bg-white/50 border border-slate-200/60 rounded-3xl font-bold text-slate-800 placeholder:text-slate-300 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm text-sm resize-none custom-scrollbar"
                                            />
                                            <MessageSquare className="absolute left-5 top-5 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                        </div>
                                    </motion.div>

                                    {/* SUBMIT BUTTON */}
                                    <motion.button
                                        layout
                                        whileHover={{ scale: 1.02, boxShadow: "0 20px 40px -10px rgba(16,185,129,0.3)" }}
                                        whileTap={{ scale: 0.98 }}
                                        disabled={loading}
                                        className="w-full h-16 bg-slate-900 hover:bg-black text-white rounded-3xl font-black text-lg shadow-2xl shadow-slate-900/20 transition-all flex items-center justify-center gap-3 mt-6 relative overflow-hidden group"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                        <div className="relative flex items-center gap-2">
                                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "TRANSMIT REQUEST"}
                                        </div>
                                    </motion.button>
                                </form>
                            </>
                        )}
                    </div>
                </motion.div>
            </TiltCard>

            <div className="absolute bottom-6 flex items-center gap-2 opacity-40 hover:opacity-100 transition-opacity">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gecko Systems v2.1 • Encrypted Channel</p>
            </div>
        </div>
    )
}