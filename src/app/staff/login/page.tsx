"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChefHat, User, ArrowRight, Loader2, Store, Hash, LogOut, 
  Calculator, Briefcase, UtensilsCrossed, ScanFace, Leaf, CheckCircle2, ShieldCheck,Building, Utensils, Wine
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { getPublicStaffList, linkDeviceToRestaurant, staffLogin, unlinkDevice } from "@/app/actions/staff-auth";

export default function StaffLoginPage() {
  // STATES
  const [view, setView] = useState<"loading" | "setup" | "staff" | "pin">("loading");
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  
  // INPUTS
  const [restCode, setRestCode] = useState("");
  const [pin, setPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => { loadSystem(); }, []);

  async function loadSystem() {
      try {
          const res = await getPublicStaffList();
          if (res.needsSetup) {
              setView("setup");
          } else if (res.success) {
              setTenantInfo({ name: res.tenantName, code: res.tenantCode, logo_url: res.logo });
              setStaffList(res.staff || []); 
              setView("staff");
          } else {
              setView("setup"); 
          }
      } catch (e) {
          setView("setup");
      }
  }

  // --- ACTIONS ---
  async function handleLink(e: React.FormEvent) {
      e.preventDefault();
      if (!restCode) return;
      setIsSubmitting(true);
      
      const res = await linkDeviceToRestaurant(restCode);
      
      if (res.success) {
          toast.success(`Device Linked to ${res.name}`, { description: "Setting up terminal..." });
          setTimeout(() => window.location.reload(), 1000); 
      } else {
          toast.error("Invalid Restaurant Code");
          setIsSubmitting(false);
      }
  }

  async function handleLogin() {
      if (pin.length < 4) return;
      setIsSubmitting(true);
      
      const res = await staffLogin(selectedStaff.id, pin);
      
      if (res.success) {
          setIsSuccess(true);
          toast.success(`Welcome, ${selectedStaff.full_name}`, { description: "Starting your session..." });
          
          setTimeout(() => {
              window.location.replace(res.url || '/staff/pos'); 
          }, 800);
      } else {
          toast.error("Access Denied", { description: "Incorrect PIN code provided." });
          setPin("");
          setIsSubmitting(false);
      }
  }

  async function handleUnlink() {
      if(!confirm("Unlink device from this restaurant?")) return;
      await unlinkDevice();
      window.location.reload();
  }

  // --- HELPER: ROLE STYLING ---
  const getRoleIcon = (role: string) => {
    switch(role) {
        case 'manager': return <Briefcase className="w-6 h-6" />;
        case 'chef': return <ChefHat className="w-6 h-6" />;
        case 'cashier': return <Calculator className="w-6 h-6" />;
        case 'waiter': return <UtensilsCrossed className="w-6 h-6" />;
        case 'bartender': return <Wine className="w-6 h-6" />;
        default: return <User className="w-6 h-6" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch(role) {
        case 'manager': return 'bg-purple-50 text-purple-600 border-purple-200 shadow-purple-100';
        case 'chef': return 'bg-orange-50 text-orange-600 border-orange-200 shadow-orange-100';
        case 'cashier': return 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-emerald-100';
        case 'waiter': return 'bg-blue-50 text-blue-600 border-blue-200 shadow-blue-100';
        case 'bartender': return 'bg-indigo-50 text-indigo-600 border-indigo-200 shadow-indigo-100';
        default: return 'bg-slate-50 text-slate-600 border-slate-200 shadow-slate-100';
    }
  };

  const handleNum = (n: string) => { if(pin.length < 4) setPin(p => p + n) };
  const handleBack = () => setPin(p => p.slice(0, -1));

  // --- RENDER ---
  if (view === "loading") return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="relative">
            <div className="w-16 h-16 border-4 border-emerald-100 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
        </div>
        <p className="text-emerald-900/40 font-bold text-xs uppercase tracking-widest animate-pulse">Initializing System...</p>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] flex items-center justify-center p-4 font-sans text-slate-900 selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      
      <Toaster position="top-center" richColors theme="light" />

      {/* PREMIUM BACKGROUND (CSS ONLY - 0 LAG) */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white via-[#F8FAFC] to-[#F1F5F9]" />
      <div className="fixed top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-emerald-50/50 to-transparent pointer-events-none" />

      {/* HEADER */}
      {view !== "setup" && (
          <motion.div 
            initial={{ y: -20, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.5 }}
            className="fixed top-0 left-0 right-0 p-4 md:p-8 flex justify-between items-center z-10 pointer-events-none transform-gpu"
          >
              <div className="flex items-center gap-4 bg-white/80 backdrop-blur-xl p-2.5 pr-6 rounded-2xl border border-white/60 shadow-sm ring-1 ring-slate-100 pointer-events-auto">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md border border-slate-100 overflow-hidden relative">
                      {tenantInfo?.logo_url ? (
                          <img src={tenantInfo.logo_url} alt={tenantInfo.name} className="w-full h-full object-contain p-1" />
                      ) : (
                          <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                             <Store className="w-5 h-5 text-white" />
                          </div>
                      )}
                  </div>
                  <div>
                      <h3 className="text-xs font-black text-slate-900 leading-none">{tenantInfo?.name || "Terminal"}</h3>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Terminal Active
                      </p>
                  </div>
              </div>
              <button onClick={handleUnlink} className="px-4 py-2.5 bg-white/80 backdrop-blur-xl border border-white/60 rounded-xl text-slate-400 text-[10px] font-bold hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all shadow-sm ring-1 ring-slate-100 pointer-events-auto active:scale-95">
                  Disconnect
              </button>
          </motion.div>
      )}

      <AnimatePresence mode="wait">
        
        {/* --- VIEW 1: SETUP --- */}
        {view === "setup" && (
            <motion.div
                key="setup"
                initial={{ opacity: 0, y: 40, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.5 }}
                className="relative w-full max-w-md z-10 transform-gpu will-change-transform"
            >
                <div className="absolute -inset-6 bg-gradient-to-br from-emerald-400/20 via-emerald-300/10 to-transparent blur-3xl rounded-[3rem] pointer-events-none" />

                <div className="relative bg-white/80 backdrop-blur-2xl rounded-[3rem] shadow-[0_40px_120px_-30px_rgba(16,185,129,0.35)] border border-white/40 ring-1 ring-emerald-100/50 overflow-hidden">
                    <div className="text-center px-10 pt-12 pb-8">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 30, mass: 0.5 }}
                            className="w-28 h-28 mx-auto mb-8 rounded-[2.5rem] bg-gradient-to-br from-emerald-100 via-white to-emerald-50 shadow-2xl shadow-emerald-300/60 ring-1 ring-white flex items-center justify-center transform-gpu"
                        >
                            <Utensils className="w-14 h-14 text-emerald-500 drop-shadow-lg" />
                        </motion.div>

                        <h1 className="text-4xl font-black tracking-tight text-slate-900">System Setup</h1>
                        <p className="mt-3 text-slate-400 font-semibold">Enter your Restaurant ID to activate</p>
                    </div>

                    <div className="h-px bg-gradient-to-r from-transparent via-emerald-200/60 to-transparent" />

                    <form onSubmit={handleLink} className="px-10 py-10 space-y-8">
                        <div className="relative group">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 w-14 h-14 rounded-2xl bg-white shadow-xl shadow-emerald-300/50 border border-white flex items-center justify-center text-emerald-500 transition-transform group-focus-within:scale-110">
                            <Hash className="w-6 h-6" />
                            </div>

                            <input
                            autoFocus
                            value={restCode}
                            onChange={(e) => setRestCode(e.target.value.toUpperCase())}
                            placeholder="GECKO-01"
                            className="w-full h-20 pl-24 pr-6 rounded-3xl bg-white/70 backdrop-blur-md border-2 border-transparent focus:border-emerald-500 focus:bg-white text-2xl font-black tracking-[0.3em] text-slate-900 outline-none transition-all placeholder:text-slate-300 shadow-inner"
                            />
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={!restCode || isSubmitting}
                            className="relative w-full h-16 rounded-2xl font-extrabold text-lg text-white bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 shadow-2xl shadow-emerald-400/40 flex items-center justify-center gap-3 overflow-hidden disabled:opacity-50 transform-gpu"
                        >
                            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-700" />
                            {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Activate System <ArrowRight className="w-5 h-5" /></>}
                        </motion.button>
                    </form>
                </div>
            </motion.div>
        )}

        {/* --- VIEW 2: STAFF GRID --- */}
        {view === "staff" && (
            <motion.div key="staff" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full max-w-7xl mt-24 z-10 pb-10 transform-gpu">
                <div className="text-center mb-10 md:mb-16">
                    <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.5 }} className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                        Who is working?
                    </motion.h1>
                    <p className="text-slate-400 mt-3 font-bold text-base md:text-lg">Select your profile to begin shift</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 px-4 md:px-6">
                    {staffList.map((staff, i) => (
                        <motion.button 
                            layoutId={`staff-card-${staff.id}`} 
                            key={staff.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.02, type: "spring", stiffness: 300, damping: 30, mass: 0.5 }}
                            onClick={() => { setSelectedStaff(staff); setView("pin"); }}
                            className="bg-white p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] flex flex-col items-center gap-4 md:gap-5 transition-all active:scale-95 shadow-lg shadow-slate-200/50 hover:shadow-2xl hover:shadow-emerald-900/5 hover:-translate-y-1 relative overflow-hidden ring-1 ring-slate-100 group touch-manipulation transform-gpu will-change-transform"
                        >
                            <motion.div 
                                layoutId={`staff-avatar-${staff.id}`}
                                transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.5 }}
                                className={`w-20 h-20 md:w-24 md:h-24 rounded-[1.5rem] md:rounded-[1.8rem] flex items-center justify-center border-2 transition-transform duration-300 shadow-sm ${getRoleColor(staff.role)} transform-gpu`}
                            >
                                {getRoleIcon(staff.role)}
                            </motion.div>
                            <div className="text-center relative z-10">
                                <h3 className="text-slate-900 font-black text-lg md:text-xl leading-tight group-hover:text-emerald-600 transition-colors">{staff.full_name.split(' ')[0]}</h3>
                                <span className="inline-block mt-1.5 px-3 py-1 bg-slate-50 rounded-xl text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest border border-slate-100 group-hover:bg-emerald-50 group-hover:text-emerald-600 group-hover:border-emerald-100 transition-all">{staff.role}</span>
                            </div>
                        </motion.button>
                    ))}
                </div>
            </motion.div>
        )}

        {/* --- VIEW 3: PIN ENTRY --- */}
        {view === "pin" && selectedStaff && (
            <motion.div 
                layoutId={`staff-card-${selectedStaff.id}`} 
                key="pin" 
                transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.5 }}
                className="w-full max-w-[360px] z-20 transform-gpu will-change-transform"
            >
                <div className="bg-white/90 backdrop-blur-2xl rounded-[3rem] p-8 shadow-2xl shadow-slate-200/50 border border-white ring-1 ring-slate-100 relative overflow-hidden">
                    
                    <div className="flex justify-between items-center mb-6">
                        <button onClick={() => { setSelectedStaff(null); setPin(""); setView("staff"); }} className="text-slate-400 hover:text-slate-900 transition-colors p-2 hover:bg-slate-100 rounded-xl touch-manipulation active:bg-slate-200"><LogOut className="w-5 h-5 rotate-180" /></button>
                        <div className="w-9 h-9" /> 
                    </div>

                    <div className="text-center mb-8">
                        <motion.div 
                            layoutId={`staff-avatar-${selectedStaff.id}`}
                            transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.5 }}
                            className={`w-20 h-20 mx-auto rounded-[1.8rem] flex items-center justify-center border-2 mb-4 shadow-xl transform-gpu ${getRoleColor(selectedStaff.role)}`}
                        >
                            {getRoleIcon(selectedStaff.role)}
                        </motion.div>
                        <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-3xl font-black text-slate-900 tracking-tight">{selectedStaff.full_name.split(' ')[0]}</motion.h2>
                        <p className="text-emerald-600 font-bold text-[10px] uppercase tracking-widest mt-1">Enter Security PIN</p>
                    </div>

                    {/* PIN DOTS */}
                    <div className="flex justify-center gap-4 mb-8 h-4">
                        {[0, 1, 2, 3].map((i) => (
                            <motion.div 
                                key={i} 
                                animate={{ 
                                    scale: i < pin.length ? 1.4 : 1,
                                    backgroundColor: i < pin.length ? '#10b981' : '#e2e8f0',
                                    borderColor: i < pin.length ? '#10b981' : '#cbd5e1'
                                }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }} 
                                className="w-3.5 h-3.5 rounded-full border-[3px] transform-gpu" 
                            />
                        ))}
                    </div>

                    {/* NUMPAD */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                            <button key={num} onClick={() => handleNum(num.toString())} className="h-16 rounded-[1.5rem] bg-white border border-slate-100 shadow-sm shadow-slate-200/50 text-xl font-black text-slate-900 active:scale-90 active:bg-slate-100 transition-transform duration-75 touch-manipulation transform-gpu">
                                {num}
                            </button>
                        ))}
                        <div />
                        <button onClick={() => handleNum("0")} className="h-16 rounded-[1.5rem] bg-white border border-slate-100 shadow-sm shadow-slate-200/50 text-xl font-black text-slate-900 active:scale-90 active:bg-slate-100 transition-transform duration-75 touch-manipulation transform-gpu">0</button>
                        <button onClick={handleBack} className="h-16 rounded-[1.5rem] bg-red-50/50 border border-red-50 text-red-400 active:scale-90 active:bg-red-100 transition-transform duration-75 flex items-center justify-center touch-manipulation transform-gpu"><LogOut className="w-5 h-5 rotate-180" /></button>
                    </div>

                    <button 
                        onClick={handleLogin} 
                        disabled={pin.length !== 4 || isSubmitting || isSuccess}
                        className={`w-full h-16 rounded-[1.5rem] font-bold text-lg shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all touch-manipulation transform-gpu ${
                            isSuccess 
                            ? 'bg-emerald-500 text-white shadow-emerald-500/30 ring-2 ring-emerald-200' 
                            : 'bg-slate-900 text-white shadow-slate-900/20'
                        }`}
                    >
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                         isSuccess ? <><CheckCircle2 className="w-5 h-5" /> Authorized</> : 
                         <>Start Shift <ArrowRight className="w-5 h-5" /></>}
                    </button>
                </div>
            </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}