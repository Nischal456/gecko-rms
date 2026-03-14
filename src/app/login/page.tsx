"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Key, Mail, Building2, User, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from "framer-motion";
import { loginUser } from "@/app/actions/auth";

// --- 1. ULTRA-PREMIUM TILT CARD (Physics Tuned for 0 Lag) ---
function TiltCard({ children }: { children: React.ReactNode }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Lighter mass for faster calculation on low-end CPUs, preventing math-loop lag
  const mouseX = useSpring(x, { stiffness: 200, damping: 30, mass: 0.5 });
  const mouseY = useSpring(y, { stiffness: 200, damping: 30, mass: 0.5 });

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
      className="relative z-20 w-full max-w-[460px] perspective-container group transform-gpu will-change-transform"
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

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ code: "", email: "", password: "" });
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);

  // Instant Admin Detection
  useEffect(() => {
    const email = formData.email.trim().toLowerCase();
    setIsSuperAdmin(email === "super@gecko.works");
    if (email.length > 0) setEmailValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    else setEmailValid(null);
  }, [formData.email]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (emailValid === false) return toast.error("Invalid Email Format");
    setLoading(true);

    const res = await loginUser(formData);

    if (res.success && res.url) {
      toast.success("Access Granted", { 
        description: res.role === 'super_admin' ? "Welcome back, Commander." : `Session active for ${res.name}`,
        icon: <div className="w-5 h-5 bg-emerald-500 rounded-full" />
      });
      
      if(res.role === 'super_admin') localStorage.setItem("gecko_super_admin", "true");
      else localStorage.removeItem("gecko_super_admin");

      router.push(res.url);
    } else {
      toast.error("Access Denied", { description: res.error || "Credentials rejected." });
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[#F4F7F5] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden selection:bg-emerald-500 selection:text-white font-sans">
       
       {/* --- ALIVE BACKGROUND (GPU ACCELERATED) --- */}
       <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ scale: [1, 1.2, 1], rotate: [0, 45, 0], x: [0, 50, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute top-[-20%] left-[-10%] w-[120vw] h-[120vw] bg-gradient-to-br from-emerald-100/50 to-teal-50/40 rounded-full blur-[120px] will-change-transform transform-gpu mix-blend-multiply" 
          />
          <motion.div 
            animate={{ scale: [1, 1.1, 1], rotate: [0, -45, 0], x: [0, -50, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-[-20%] right-[-10%] w-[120vw] h-[120vw] bg-gradient-to-tr from-green-100/50 to-emerald-50/40 rounded-full blur-[100px] will-change-transform transform-gpu mix-blend-multiply" 
          />
       </div>

       {/* --- NAVIGATION --- */}
       <Link href="/" className="absolute top-6 left-6 md:top-10 md:left-10 z-40 group">
          <motion.button 
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-3 px-5 py-2.5 bg-white/70 backdrop-blur-xl border border-white/60 rounded-full shadow-sm hover:shadow-lg transition-all text-slate-500 hover:text-slate-900 transform-gpu"
          >
            <ArrowLeft className="w-4 h-4" /> 
            <span className="text-xs font-bold uppercase tracking-widest">Back</span>
          </motion.button>
       </Link>

       {/* --- MAIN INTERFACE --- */}
       <TiltCard>
         <motion.div 
           layout
           initial={{ opacity: 0, y: 40, scale: 0.95 }}
           animate={{ opacity: 1, y: 0, scale: 1 }}
           transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
           className="w-full bg-white/60 backdrop-blur-3xl border border-white/60 shadow-[0_40px_100px_-30px_rgba(16,185,129,0.15)] rounded-[3rem] p-8 md:p-12 relative overflow-hidden ring-1 ring-white/50 transform-gpu"
         >
            {/* Texture Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent pointer-events-none opacity-80" />
            
            <div className="relative z-10 flex flex-col items-center">
                
                {/* --- PAW LOGO --- */}
                <motion.div 
                   initial={{ scale: 0 }} 
                   animate={{ scale: 1 }} 
                   transition={{ type: "spring", stiffness: 200, damping: 15 }}
                   className="w-28 h-28 bg-gradient-to-b from-white to-emerald-50 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-emerald-500/20 mb-8 relative group border border-white transform-gpu"
                >
                   {/* Custom Image */}
                   <img src="/paw.png" alt="Gecko Paw" className="w-16 h-16 object-contain drop-shadow-md group-hover:scale-110 transition-transform duration-500" />
                   
                   {/* Living Glow */}
                   <div className="absolute inset-0 rounded-[2rem] ring-4 ring-white/30 pointer-events-none" />
                   <div className="absolute -inset-4 bg-emerald-400/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                </motion.div>
                
                <div className="text-center mb-10 space-y-2">
                   <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                      Gecko<span className="text-emerald-500">RMS</span>
                   </h1>
                   <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">Unified Command Access</p>
                </div>

                <form onSubmit={handleLogin} className="w-full space-y-5">
                   
                   {/* RESTAURANT CODE (Height Animation) */}
                   <AnimatePresence initial={false} mode="popLayout">
                     {!isSuperAdmin && (
                       <motion.div 
                         layout
                         initial={{ height: 0, opacity: 0 }} 
                         animate={{ height: "auto", opacity: 1 }} 
                         exit={{ height: 0, opacity: 0 }}
                         transition={{ duration: 0.3, ease: "circOut" }}
                         className="overflow-hidden transform-gpu"
                       >
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4 mb-1.5 block">Restaurant ID</label>
                          <div className="relative group">
                            <input 
                              type="text" 
                              value={formData.code}
                              onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                              placeholder="e.g. KTM-01" 
                              className="w-full h-16 pl-14 pr-6 bg-white/50 border border-slate-200/60 rounded-3xl font-black text-slate-800 placeholder:text-slate-300 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm text-lg uppercase tracking-wider"
                            />
                            <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                          </div>
                       </motion.div>
                     )}
                   </AnimatePresence>

                   {/* EMAIL & PASSWORD (REMOVED 'layout' PROP HERE TO STOP TYPING LAG) */}
                   <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4 mb-1.5 block">Credentials</label>
                      <div className="relative group mb-3">
                        <input 
                          type="email" 
                          required
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                          placeholder="admin@gecko.works" 
                          className={`w-full h-16 pl-14 pr-6 bg-white/50 border rounded-3xl font-bold text-slate-800 placeholder:text-slate-300 outline-none focus:bg-white focus:ring-4 transition-all shadow-sm text-base ${emailValid === false ? 'border-red-200 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200/60 focus:border-emerald-500 focus:ring-emerald-500/10'}`}
                        />
                        <Mail className={`absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${emailValid === false ? 'text-red-400' : 'text-slate-400 group-focus-within:text-emerald-500'}`} />
                      </div>

                      {/* PASSWORD */}
                      <div className="relative group">
                        <input 
                          type={showPassword ? "text" : "password"}
                          required
                          value={formData.password}
                          onChange={e => setFormData({...formData, password: e.target.value})}
                          placeholder="••••••••" 
                          className="w-full h-16 pl-14 pr-14 bg-white/50 border border-slate-200/60 rounded-3xl font-bold text-slate-800 placeholder:text-slate-300 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm text-base"
                        />
                        <Key className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                        <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-5 top-1/2 -translate-y-1/2 p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      
                      <div className="flex justify-end mt-2 px-2">
                          <Link href="/forgot-password" className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors uppercase tracking-wider hover:underline">
                              Recover Access?
                          </Link>
                      </div>
                   </div>

                   {/* AUTH BUTTON */}
                   <motion.button 
                     layout
                     whileHover={{ scale: 1.02, boxShadow: "0 20px 40px -10px rgba(16,185,129,0.3)" }}
                     whileTap={{ scale: 0.98 }}
                     disabled={loading}
                     className="w-full h-16 bg-slate-900 hover:bg-black text-white rounded-3xl font-black text-lg shadow-2xl shadow-slate-900/20 transition-all flex items-center justify-center gap-3 mt-4 relative overflow-hidden group transform-gpu"
                   >
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="relative flex items-center gap-2">
                          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "AUTHENTICATE"}
                      </div>
                   </motion.button>
                </form>

                {/* --- FOOTER: STAFF LOGIN --- */}
                <div className="mt-10 pt-8 border-t border-slate-100/80 w-full text-center">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 opacity-70">Alternative Access</p>
                   <Link href="/staff/login">
                       <motion.button 
                         whileHover={{ scale: 1.02, backgroundColor: "#fff" }}
                         whileTap={{ scale: 0.98 }}
                         className="w-full h-14 bg-white/50 backdrop-blur-sm border border-slate-200 text-slate-600 rounded-3xl font-bold text-xs uppercase tracking-widest hover:border-emerald-200 hover:text-emerald-700 hover:shadow-lg transition-all flex items-center justify-center gap-3 transform-gpu"
                       >
                           <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                               <User className="w-4 h-4" /> 
                           </div>
                           Open Staff Terminal
                       </motion.button>
                   </Link>
                </div>
            </div>
         </motion.div>
       </TiltCard>
       
       <div className="absolute bottom-6 flex items-center gap-2 opacity-40 hover:opacity-100 transition-opacity">
           <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gecko Systems v2.1 • Secure Connection</p>
       </div>
    </div>
  )
}