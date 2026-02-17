"use client";

import { useState, use } from "react";
import { motion } from "framer-motion";
import { Key, ArrowRight, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { resetPassword } from "@/app/actions/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  // Unwrap params for Next.js 15+
  const unwrappedParams = use(params);
  const token = unwrappedParams.token;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");

    // --- FIX: Ensure we are targeting the form element ---
    const formElement = e.currentTarget; 
    
    // Double check we actually have a form (Solves Runtime Error)
    if (!(formElement instanceof HTMLFormElement)) {
        console.error("Event target is not a form!");
        return;
    }

    const formData = new FormData(formElement);
    const pass = formData.get("password") as string;
    const confirm = formData.get("confirm") as string;

    if (pass !== confirm) {
        setStatus("error");
        setErrorMsg("Passwords do not match");
        return;
    }

    const res = await resetPassword(token, pass);

    if (res.success) {
      setStatus("success");
      setTimeout(() => router.push("/login"), 3000);
    } else {
      setErrorMsg(res.error || "Link expired or invalid");
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 relative">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-white shadow-2xl rounded-[2.5rem] p-10 border border-slate-100">
            <div className="text-center mb-8">
                <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
                    <Key className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-2xl font-black text-slate-900">Set New Password</h1>
            </div>

            {status === "success" ? (
                <div className="text-center py-8">
                    <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-900">Password Updated!</h3>
                    <p className="text-slate-500 text-sm mt-2">Redirecting to login...</p>
                </div>
            ) : (
                /* --- CRITICAL: onSubmit MUST go on the <form> tag, NOT the button --- */
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">New Password</label>
                        <input name="password" type="password" required className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Confirm Password</label>
                        <input name="confirm" type="password" required className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>

                    {status === "error" && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold">
                            <AlertCircle className="w-4 h-4" /> {errorMsg}
                        </div>
                    )}

                    {/* Button type must be "submit" */}
                    <button 
                        type="submit" 
                        disabled={status === "loading"} 
                        className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2 transition-transform active:scale-95"
                    >
                        {status === "loading" ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Password"}
                    </button>
                </form>
            )}
        </motion.div>
    </div>
  )
}