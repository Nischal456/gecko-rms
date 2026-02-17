"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Key, Mail, ShieldCheck, Building2 } from "lucide-react";
import Link from "next/link";
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from "framer-motion";
import { loginUser } from "@/app/actions/auth";

// --- OPTIMIZED 3D TILT CARD ---
function TiltCard({ children }: { children: React.ReactNode }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smoother physics (Apple-like spring feel)
  const mouseX = useSpring(x, { stiffness: 400, damping: 30, mass: 0.5 });
  const mouseY = useSpring(y, { stiffness: 400, damping: 30, mass: 0.5 });

  function onMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
    x.set(clientX - left - width / 2);
    y.set(clientY - top - height / 2);
  }

  const rotateX = useTransform(mouseY, [-400, 400], [4, -4]); // Reduced rotation for cleaner look
  const rotateY = useTransform(mouseX, [-400, 400], [-4, 4]);

  return (
    <motion.div
      style={{ rotateX, rotateY, perspective: 1200 }}
      onMouseMove={onMouseMove}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      className="relative z-20 w-full max-w-md perspective-container"
    >
      {children}
    </motion.div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ code: "", email: "", password: "" });
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    if(formData.email.trim() === "super@gecko.works") {
        setIsSuperAdmin(true);
    } else {
        setIsSuperAdmin(false);
    }
  }, [formData.email]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await loginUser(formData);

    if (res.success && res.url) {
      toast.success("Identity Verified", { 
        description: res.role === 'super_admin' ? "Initializing God Mode..." : `Connecting to ${res.name}...` 
      });
      
      if(res.role === 'super_admin') localStorage.setItem("gecko_super_admin", "true");
      else localStorage.removeItem("gecko_super_admin");

      router.push(res.url);
    } else {
      toast.error("Access Denied", { description: res.error || "Unknown error occurred" });
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden selection:bg-gecko-500 selection:text-white touch-none">
       
       {/* --- BACKGROUND ANIMATION (GPU Optimized) --- */}
       <div className="absolute inset-0 overflow-hidden pointer-events-none transform-gpu">
          <motion.div 
            animate={{ scale: [1, 1.1, 1], x: [0, 30, 0], y: [0, -30, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-10%] left-[-10%] w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-gecko-200/40 rounded-full blur-[80px] will-change-transform" 
          />
          <motion.div 
            animate={{ scale: [1, 1.05, 1], x: [0, -20, 0], y: [0, 40, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-[-10%] right-[-10%] w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] bg-emerald-100/60 rounded-full blur-[60px] will-change-transform" 
          />
       </div>

       {/* --- BACK BUTTON --- */}
       <Link href="/" className="absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors font-bold z-30 group">
          <div className="p-2 rounded-full bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm group-hover:shadow-md transition-all">
            <ArrowLeft className="w-4 h-4" /> 
          </div>
          <span className="text-sm tracking-wide hidden sm:block">Back Home</span>
       </Link>

       {/* --- LOGIN CARD --- */}
       <TiltCard>
         <motion.div 
           layout
           initial={{ opacity: 0, y: 20, scale: 0.98 }}
           animate={{ opacity: 1, y: 0, scale: 1 }}
           transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }} // Cubic bezier for "premium" feel
           className="w-full bg-white/80 backdrop-blur-2xl border border-white/60 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] rounded-3xl md:rounded-[2.5rem] p-6 sm:p-10 md:p-12 relative overflow-hidden will-change-transform"
         >
            <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent pointer-events-none" />
            
            <div className="relative z-10">
                <div className="text-center mb-8">
                   <motion.div 
                     initial={{ scale: 0, rotate: -180 }} 
                     animate={{ scale: 1, rotate: 0 }} 
                     transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
                     className="w-16 h-16 md:w-20 md:h-20 bg-gecko-500 rounded-2xl md:rounded-3xl mx-auto flex items-center justify-center text-white shadow-xl shadow-gecko-500/20 mb-6 relative group"
                   >
                      <ShieldCheck className="w-8 h-8 md:w-9 md:h-9 relative z-10" />
                      <div className="absolute inset-0 rounded-2xl md:rounded-3xl border-2 border-white/30 animate-ping opacity-40" />
                   </motion.div>
                   
                   <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-2">Gecko<span className="text-gecko-500"> RMS</span></h1>
                   <p className="text-slate-500 text-xs md:text-sm font-medium uppercase tracking-wider">Unified Access Terminal</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                   
                   {/* RESTAURANT CODE (Smooth Layout Collapse) */}
                   <AnimatePresence mode="popLayout">
                     {!isSuperAdmin && (
                       <motion.div 
                         layout
                         initial={{ height: 0, opacity: 0 }} 
                         animate={{ height: "auto", opacity: 1 }} 
                         exit={{ height: 0, opacity: 0 }}
                         transition={{ duration: 0.3, ease: "easeInOut" }}
                         className="space-y-2 group overflow-hidden"
                       >
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-gecko-600 transition-colors">Restaurant Code</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              value={formData.code}
                              onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                              placeholder="e.g. KFC-01" 
                              className="w-full h-12 md:h-14 pl-12 pr-4 bg-slate-50/50 border border-slate-200 rounded-xl md:rounded-2xl font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-gecko-500/10 focus:border-gecko-500 transition-all shadow-sm group-hover:bg-white uppercase tracking-wider text-sm md:text-base"
                            />
                            <Building2 className="absolute left-4 top-3.5 md:top-4 w-5 h-5 text-slate-400 group-focus-within:text-gecko-500 transition-colors" />
                          </div>
                       </motion.div>
                     )}
                   </AnimatePresence>

                   {/* EMAIL */}
                   <motion.div layout className="space-y-2 group">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-gecko-600 transition-colors">Access Email</label>
                      <div className="relative">
                        <input 
                          type="email" 
                          required
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                          placeholder="admin@restaurant.com" 
                          className="w-full h-12 md:h-14 pl-12 pr-4 bg-slate-50/50 border border-slate-200 rounded-xl md:rounded-2xl font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-gecko-500/10 focus:border-gecko-500 transition-all shadow-sm group-hover:bg-white text-sm md:text-base"
                        />
                        <Mail className="absolute left-4 top-3.5 md:top-4 w-5 h-5 text-slate-400 group-focus-within:text-gecko-500 transition-colors" />
                      </div>
                   </motion.div>

                   {/* PASSWORD */}
                   <motion.div layout className="space-y-2 group">
                      <div className="flex justify-between items-center px-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-focus-within:text-gecko-600 transition-colors">Secure Key</label>
                          <Link href="/forgot-password" className="text-[10px] font-bold text-slate-400 hover:text-gecko-500 transition-colors cursor-pointer uppercase tracking-wider">
                              Forgot?
                          </Link>
                      </div>
                      <div className="relative">
                        <input 
                          type="password"
                          required
                          value={formData.password}
                          onChange={e => setFormData({...formData, password: e.target.value})}
                          placeholder="••••••••" 
                          className="w-full h-12 md:h-14 pl-12 pr-4 bg-slate-50/50 border border-slate-200 rounded-xl md:rounded-2xl font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-gecko-500/10 focus:border-gecko-500 transition-all shadow-sm group-hover:bg-white text-sm md:text-base"
                        />
                        <Key className="absolute left-4 top-3.5 md:top-4 w-5 h-5 text-slate-400 group-focus-within:text-gecko-500 transition-colors" />
                      </div>
                   </motion.div>

                   <motion.button 
                     layout
                     whileHover={{ scale: 1.01, y: -2 }}
                     whileTap={{ scale: 0.98 }}
                     disabled={loading}
                     className="w-full h-12 md:h-14 bg-slate-900 hover:bg-black text-white rounded-xl md:rounded-2xl font-black text-base md:text-lg shadow-xl shadow-slate-900/20 transition-all flex items-center justify-center gap-3 mt-6 relative overflow-hidden group"
                   >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
                      {loading ? <Loader2 className="animate-spin" /> : "Authenticate"}
                   </motion.button>
                </form>

                <div className="mt-8 text-center border-t border-slate-100/50 pt-6">
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Gecko Systems v2.1
                   </p>
                </div>
            </div>
         </motion.div>
       </TiltCard>
    </div>
  )
}