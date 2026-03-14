"use client";

import { useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { Mail, Building2, ArrowRight, CheckCircle, AlertTriangle, Loader2, ArrowLeft } from "lucide-react";
import { requestPasswordReset } from "@/app/actions/auth";
import Link from "next/link";

// --- 1. PHYSICS TILT CARD (Optimized for 0 lag) ---
function TiltCard({ children }: { children: React.ReactNode }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

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
      className="relative z-20 w-full max-w-[460px] perspective-container group transform-gpu will-change-transform"
    >
      <motion.div 
        style={{ background: useTransform(shineX, x => `linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.4) ${x}, transparent 80%)`) }}
        className="absolute inset-0 rounded-[3rem] z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" 
      />
      {children}
    </motion.div>
  );
}

export default function ForgotPassword() {
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setStatus("loading");

        const formData = new FormData(e.currentTarget);
        
        // FIX: Strip hidden spaces and force uppercase BEFORE sending to backend
        const code = (formData.get("code") as string).trim().toUpperCase();
        const email = (formData.get("email") as string).trim();

        const res = await requestPasswordReset(code, email);

        if (res.success) {
            setStatus("success");
        } else {
            setErrorMsg(res.error || "Verification failed. Check credentials.");
            setStatus("error");
        }
    }

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
                    className="absolute bottom-[-20%] right-[-10%] w-[120vw] h-[120vw] bg-gradient-to-tr from-green-100/50 to-emerald-50/40 rounded-full blur-[100px] will-change-transform mix-blend-multiply" 
                />
            </div>

            {/* --- BACK BUTTON --- */}
            <Link href="/login" className="absolute top-6 left-6 md:top-10 md:left-10 z-40 group">
                <motion.button 
                    whileHover={{ scale: 1.05 }} 
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-3 px-5 py-2.5 bg-white/70 backdrop-blur-xl border border-white/60 rounded-full shadow-sm hover:shadow-lg transition-all text-slate-500 hover:text-slate-900 transform-gpu"
                >
                    <ArrowLeft className="w-4 h-4" /> 
                    <span className="text-xs font-bold uppercase tracking-widest">Login</span>
                </motion.button>
            </Link>

            {/* --- MAIN CARD --- */}
            <TiltCard>
                <motion.div 
                    initial={{ opacity: 0, y: 40, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.5 }}
                    className="w-full bg-white/60 backdrop-blur-3xl border border-white/60 shadow-[0_40px_100px_-30px_rgba(16,185,129,0.15)] rounded-[3rem] p-8 md:p-12 relative overflow-hidden ring-1 ring-white/50 transform-gpu"
                >
                    {/* Gloss Texture */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent pointer-events-none opacity-80" />

                    <div className="relative z-10 flex flex-col items-center">
                        
                        {/* --- PAW IDENTIFIER (ANIMATED) --- */}
                        <motion.div 
                            initial={{ scale: 0 }} 
                            animate={{ scale: 1 }} 
                            transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.5 }}
                            className="w-24 h-24 bg-gradient-to-b from-white to-emerald-50 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-emerald-500/20 mb-8 relative group border border-white transform-gpu"
                        >
                            <img src="/paw.png" alt="Gecko Paw" className="w-14 h-14 object-contain drop-shadow-md group-hover:scale-110 transition-transform duration-500" />
                            <div className="absolute inset-0 rounded-[2rem] ring-4 ring-white/30" />
                            {status === 'loading' && (
                                <div className="absolute inset-0 border-4 border-emerald-500/30 border-t-emerald-500 rounded-[2rem] animate-spin" />
                            )}
                        </motion.div>

                        <div className="text-center mb-8 space-y-2">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Recovery Mode</h1>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">Verify System Ownership</p>
                        </div>

                        <AnimatePresence mode="wait">
                            {status === "success" ? (
                                <motion.div 
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="w-full bg-emerald-50/80 border border-emerald-100 rounded-3xl p-8 text-center transform-gpu"
                                >
                                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                                        <CheckCircle className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-black text-emerald-900 mb-2">Protocol Initiated</h3>
                                    <p className="text-emerald-700/80 text-sm font-medium mb-6">
                                        A secure restoration link has been dispatched to your registered email frequency.
                                    </p>
                                    <Link href="/login">
                                        <motion.button 
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className="w-full h-14 bg-emerald-600 text-white rounded-2xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-emerald-600/20 transform-gpu"
                                        >
                                            Return to Login
                                        </motion.button>
                                    </Link>
                                </motion.div>
                            ) : (
                                <motion.form 
                                    key="form"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onSubmit={handleSubmit} 
                                    className="w-full space-y-5 transform-gpu"
                                >
                                    {/* RESTAURANT CODE */}
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4 mb-1.5 block">Restaurant ID</label>
                                        <div className="relative group">
                                            <input 
                                                name="code" 
                                                required 
                                                placeholder="e.g. KTM-01" 
                                                className="w-full h-16 pl-14 pr-6 bg-white/50 border border-slate-200/60 rounded-3xl font-black text-slate-800 placeholder:text-slate-300 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm text-lg uppercase tracking-wider" 
                                            />
                                            <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                        </div>
                                    </div>

                                    {/* EMAIL */}
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4 mb-1.5 block">Admin Email</label>
                                        <div className="relative group">
                                            <input 
                                                name="email" 
                                                type="email" 
                                                required 
                                                placeholder="owner@gecko.works" 
                                                className="w-full h-16 pl-14 pr-6 bg-white/50 border border-slate-200/60 rounded-3xl font-bold text-slate-800 placeholder:text-slate-300 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm text-base" 
                                            />
                                            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                        </div>
                                    </div>

                                    {/* ERROR MESSAGE */}
                                    {status === "error" && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: -10 }} 
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold"
                                        >
                                            <AlertTriangle className="w-5 h-5 flex-shrink-0" /> 
                                            {errorMsg}
                                        </motion.div>
                                    )}

                                    {/* SUBMIT BUTTON */}
                                    <motion.button 
                                        whileHover={{ scale: 1.02, boxShadow: "0 20px 40px -10px rgba(16,185,129,0.3)" }}
                                        whileTap={{ scale: 0.98 }}
                                        disabled={status === "loading"}
                                        className="w-full h-16 bg-slate-900 hover:bg-black text-white rounded-3xl font-black text-lg shadow-2xl shadow-slate-900/20 transition-all flex items-center justify-center gap-3 mt-4 relative overflow-hidden group disabled:opacity-70 transform-gpu"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                        <div className="relative flex items-center gap-2">
                                            {status === "loading" ? <Loader2 className="w-5 h-5 animate-spin" /> : <>SEND LINK <ArrowRight className="w-5 h-5" /></>}
                                        </div>
                                    </motion.button>
                                </motion.form>
                            )}
                        </AnimatePresence>

                    </div>
                </motion.div>
            </TiltCard>

            <div className="absolute bottom-6 flex items-center gap-2 opacity-40">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gecko Systems v2.1 • Secure Recovery</p>
            </div>
        </div>
    )
}