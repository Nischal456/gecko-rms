"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Key, Mail, ShieldCheck, Building2 } from "lucide-react";
import Link from "next/link";
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from "framer-motion";
import { loginUser } from "@/app/actions/auth";

// --- 3D TILT CARD COMPONENT ---
function TiltCard({ children }: { children: React.ReactNode }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseX = useSpring(x, { stiffness: 500, damping: 100 });
  const mouseY = useSpring(y, { stiffness: 500, damping: 100 });

  function onMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
    x.set(clientX - left - width / 2);
    y.set(clientY - top - height / 2);
  }

  const rotateX = useTransform(mouseY, [-400, 400], [5, -5]);
  const rotateY = useTransform(mouseX, [-400, 400], [-5, 5]);

  return (
    <motion.div
      style={{ rotateX, rotateY, perspective: 1000 }}
      onMouseMove={onMouseMove}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      className="relative z-20"
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

  // Logic: Hides code input ONLY if you type the Super Admin email exactly
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
      
      // Store local flag for client-side UI checks
      if(res.role === 'super_admin') localStorage.setItem("gecko_super_admin", "true");
      else localStorage.removeItem("gecko_super_admin");

      router.push(res.url);
    } else {
      toast.error("Access Denied", { description: res.error || "Unknown error occurred" });
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 relative overflow-hidden selection:bg-gecko-500 selection:text-white">
       
       {/* --- BACKGROUND ANIMATION --- */}
       <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, -50, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-gecko-200/40 rounded-full blur-[100px]" 
          />
          <motion.div 
            animate={{ scale: [1, 1.1, 1], x: [0, -30, 0], y: [0, 50, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-100/60 rounded-full blur-[80px]" 
          />
       </div>

       {/* --- BACK BUTTON --- */}
       <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors font-bold z-30 group">
          <div className="p-2 rounded-full bg-white border border-slate-200 shadow-sm group-hover:shadow-md transition-all">
            <ArrowLeft className="w-4 h-4" /> 
          </div>
          <span className="text-sm tracking-wide">Back Home</span>
       </Link>

       {/* --- LOGIN CARD --- */}
       <TiltCard>
         <motion.div 
           initial={{ opacity: 0, y: 30, scale: 0.95 }}
           animate={{ opacity: 1, y: 0, scale: 1 }}
           transition={{ duration: 0.6, ease: "easeOut" }}
           className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden"
         >
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
            
            <div className="relative z-10">
                <div className="text-center mb-8">
                   <motion.div 
                     initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}
                     className="w-20 h-20 bg-gecko-500 rounded-3xl mx-auto flex items-center justify-center text-white shadow-xl shadow-gecko-500/30 mb-6 relative group"
                   >
                      <ShieldCheck className="w-8 h-8 relative z-10" />
                      <div className="absolute inset-0 rounded-3xl border-2 border-white/30 animate-ping opacity-50" />
                   </motion.div>
                   
                   <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Gecko<span className="text-gecko-500"> RMS</span></h1>
                   <p className="text-slate-500 text-sm font-medium">Unified Access Terminal</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                   
                   {/* RESTAURANT CODE (Collapsible) */}
                   <AnimatePresence>
                     {!isSuperAdmin && (
                       <motion.div 
                         initial={{ height: "auto", opacity: 1 }} 
                         animate={{ height: "auto", opacity: 1 }} 
                         exit={{ height: 0, opacity: 0 }}
                         className="space-y-2 group overflow-hidden"
                       >
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-gecko-600 transition-colors">Restaurant Code</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              value={formData.code}
                              onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                              placeholder="e.g. KFC-01" 
                              className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-gecko-500/10 focus:border-gecko-500 transition-all shadow-inner group-hover:bg-white uppercase tracking-wider"
                            />
                            <Building2 className="absolute left-4 top-4 w-5 h-5 text-slate-400 group-focus-within:text-gecko-500 transition-colors" />
                          </div>
                       </motion.div>
                     )}
                   </AnimatePresence>

                   {/* EMAIL */}
                   <div className="space-y-2 group">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-gecko-600 transition-colors">Access Email</label>
                      <div className="relative">
                        <input 
                          type="email" 
                          required
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                          placeholder="admin@restaurant.com" 
                          className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-gecko-500/10 focus:border-gecko-500 transition-all shadow-inner group-hover:bg-white"
                        />
                        <Mail className="absolute left-4 top-4 w-5 h-5 text-slate-400 group-focus-within:text-gecko-500 transition-colors" />
                      </div>
                   </div>

                   {/* PASSWORD */}
                   <div className="space-y-2 group">
                      {/* ADDED: Flex container to hold Label + Forgot Password Link */}
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
                          className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-gecko-500/10 focus:border-gecko-500 transition-all shadow-inner group-hover:bg-white"
                        />
                        <Key className="absolute left-4 top-4 w-5 h-5 text-slate-400 group-focus-within:text-gecko-500 transition-colors" />
                      </div>
                   </div>

                   <motion.button 
                     whileHover={{ scale: 1.02 }}
                     whileTap={{ scale: 0.98 }}
                     disabled={loading}
                     className="w-full h-14 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-lg shadow-xl shadow-slate-900/20 transition-all flex items-center justify-center gap-3 mt-6 relative overflow-hidden group"
                   >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                      {loading ? <Loader2 className="animate-spin" /> : "Authenticate"}
                   </motion.button>
                </form>

                <div className="mt-8 text-center border-t border-slate-100 pt-6">
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Gecko Systems v2.1
                   </p>
                </div>
            </div>
         </motion.div>
       </TiltCard>
    </div>
  )
}