"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Wifi, ArrowRight, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { requestPasswordReset } from "@/app/actions/auth";
import Link from "next/link";
import { ShieldCheck } from "lucide-react"

export default function ForgotPassword() {
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setStatus("loading");

        const formData = new FormData(e.currentTarget);
        const code = formData.get("code") as string;
        const email = formData.get("email") as string;

        const res = await requestPasswordReset(code, email);

        if (res.success) {
            setStatus("success");
        } else {
            setErrorMsg(res.error || "Something went wrong");
            setStatus("error");
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 relative overflow-hidden">
            {/* Background Mesh (Reused for consistency) */}
            <div className="absolute inset-0 pointer-events-none opacity-30">
                <svg width="100%" height="100%"><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="1" /></pattern><rect width="100%" height="100%" fill="url(#grid)" /></svg>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl rounded-[2.5rem] p-8 md:p-12 relative z-10"
            >
                <div className="text-center mb-10">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="w-20 h-20 bg-gecko-500 rounded-3xl mx-auto flex items-center justify-center text-white shadow-xl shadow-gecko-500/30 mb-6 relative"
                    >
                        <ShieldCheck className="w-8 h-8 relative z-10" />
                        <div className="absolute inset-0 rounded-3xl border-2 border-white/30 animate-ping opacity-50" />
                    </motion.div>

                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
                        Recovery Mode
                    </h1>
                    <p className="text-slate-500 font-medium text-sm">
                        Enter your credentials to verify ownership.
                    </p>
                </div>


                {status === "success" ? (
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl text-center">
                        <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                        <h3 className="text-emerald-900 font-bold text-lg mb-1">Link Sent!</h3>
                        <p className="text-emerald-700 text-sm">Check your Gmail inbox for the secure reset link.</p>
                        <Link href="/login" className="block mt-6 text-xs font-bold text-emerald-600 hover:underline">Back to Login</Link>
                    </motion.div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Restaurant Code</label>
                                <div className="relative">
                                    <Wifi className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                                    <input name="code" required placeholder="e.g. KFC-01" className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none transition-all uppercase" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Registered Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                                    <input name="email" type="email" required placeholder="owner@restaurant.com" className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
                                </div>
                            </div>
                        </div>

                        {status === "error" && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold">
                                <AlertCircle className="w-4 h-4" /> {errorMsg}
                            </div>
                        )}

                        <button disabled={status === "loading"} className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-xl shadow-slate-900/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:scale-100">
                            {status === "loading" ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verify & Send Link <ArrowRight className="w-5 h-5" /></>}
                        </button>

                        <div className="text-center">
                            <Link href="/login" className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">Return to Login</Link>
                        </div>
                    </form>
                )}
            </motion.div>
        </div>
    )
}