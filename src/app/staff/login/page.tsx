"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChefHat, User, ArrowRight, Loader2, Store, Hash, LogOut, 
  Calculator, Briefcase, UtensilsCrossed, ScanFace, Leaf, CheckCircle2, ShieldCheck,Building
} from "lucide-react";
import { toast, Toaster } from "sonner"; // Ensure you have installed sonner
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
              setTenantInfo({ name: res.tenantName, code: res.tenantCode });
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
          
          // Smooth delay for visual confirmation
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
        default: return <User className="w-6 h-6" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch(role) {
        case 'manager': return 'bg-purple-50 text-purple-600 border-purple-200 shadow-purple-100';
        case 'chef': return 'bg-orange-50 text-orange-600 border-orange-200 shadow-orange-100';
        case 'cashier': return 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-emerald-100';
        case 'waiter': return 'bg-blue-50 text-blue-600 border-blue-200 shadow-blue-100';
        default: return 'bg-slate-50 text-slate-600 border-slate-200 shadow-slate-100';
    }
  };

  const handleNum = (n: string) => { if(pin.length < 4) setPin(p => p + n) };
  const handleBack = () => setPin(p => p.slice(0, -1));

  // --- RENDER ---
  if (view === "loading") return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="relative">
            <div className="w-16 h-16 border-4 border-emerald-100 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
        </div>
        <p className="text-emerald-900/40 font-bold text-xs uppercase tracking-widest animate-pulse">Initializing System...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 font-sans text-slate-900 selection:bg-emerald-500 selection:text-white relative overflow-hidden transform-gpu">
      
      {/* INTEGRATED TOAST NOTIFICATIONS */}
      <Toaster position="top-center" richColors theme="light" />

      {/* PREMIUM BACKGROUND (CSS ONLY - 0 LAG) */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white via-[#F8FAFC] to-[#F1F5F9]" />
      <div className="fixed top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-emerald-50/50 to-transparent pointer-events-none" />

      {/* HEADER */}
      {view !== "setup" && (
          <motion.div 
            initial={{ y: -20, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            className="fixed top-0 left-0 right-0 p-4 md:p-8 flex justify-between items-center z-10 pointer-events-none"
          >
              <div className="flex items-center gap-4 bg-white/80 backdrop-blur-xl p-2.5 pr-6 rounded-2xl border border-white/60 shadow-sm ring-1 ring-slate-100 pointer-events-auto">
                  <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/20"><Store className="w-5 h-5 text-white" /></div>
                  <div>
                      <h3 className="text-xs font-black text-slate-900 leading-none">{tenantInfo?.name}</h3>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Terminal Active</p>
                  </div>
              </div>
              <button onClick={handleUnlink} className="px-4 py-2.5 bg-white/80 backdrop-blur-xl border border-white/60 rounded-xl text-slate-400 text-[10px] font-bold hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all shadow-sm ring-1 ring-slate-100 pointer-events-auto">
                  Disconnect
              </button>
          </motion.div>
      )}

      <AnimatePresence mode="wait">
        
        {/* --- VIEW 1: SETUP --- */}
       {view === "setup" && (
  <motion.div
    key="setup"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 1.05 }}
    className="w-full max-w-md z-10"
  >
    {/* Header */}
    <div className="text-center mb-10">
      <div className="w-28 h-28 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-[2.5rem] shadow-2xl shadow-emerald-200/60 mx-auto flex items-center justify-center mb-8 ring-1 ring-white/40 backdrop-blur-sm">
        <Building className="w-14 h-14 text-emerald-500 drop-shadow-md animate-bounce-slow" />
      </div>
      <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Setup</h1>
      <p className="text-slate-400 font-semibold mt-2 text-base">
        Enter Restaurant ID to activate
      </p>
    </div>

    {/* Form */}
    <form
      onSubmit={handleLink}
      className="bg-white/80 backdrop-blur-md p-8 rounded-[2.5rem] shadow-2xl shadow-slate-300/40 border border-white/30 ring-1 ring-slate-100 relative overflow-hidden transform-gpu transition-all hover:shadow-3xl hover:shadow-slate-300/50"
    >
      <div className="space-y-6">
        {/* Input */}
        <div className="relative group/input">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 backdrop-blur-[1px] rounded-xl flex items-center justify-center text-emerald-500 shadow-lg shadow-emerald-300/50 border border-white transition-all group-focus-within/input:scale-105">
            <Hash className="w-5 h-5" />
          </div>
          <input
            autoFocus
            value={restCode}
            onChange={(e) => setRestCode(e.target.value.toUpperCase())}
            placeholder="e.g. GECKO-01"
            className="w-full h-20 pl-24 pr-6 bg-white/50 border-2 border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl font-extrabold text-2xl text-slate-900 outline-none transition-all placeholder:text-slate-300 uppercase tracking-widest backdrop-blur-sm"
          />
        </div>

        {/* Button */}
        <button
          disabled={!restCode || isSubmitting}
          className="w-full h-16 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-emerald-400/30 flex items-center justify-center gap-3 hover:scale-[1.03] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
        >
          {isSubmitting ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              Activate <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </form>
  </motion.div>
)}

        {/* --- VIEW 2: STAFF GRID --- */}
        {view === "staff" && (
            <motion.div key="staff" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full max-w-7xl mt-24 z-10 pb-10 transform-gpu">
                <div className="text-center mb-16">
                    <motion.h1 
                        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                        className="text-5xl font-black text-slate-900 tracking-tight"
                    >
                        Who is working?
                    </motion.h1>
                    <p className="text-slate-400 mt-3 font-bold text-lg">Select your profile to begin shift</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8 px-6">
                    {staffList.map((staff, i) => (
                        <motion.button 
                            layoutId={`staff-card-${staff.id}`} // THE MAGIC MORPH
                            key={staff.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03, ease: "easeOut" }}
                            onClick={() => { setSelectedStaff(staff); setView("pin"); }}
                            className="bg-white p-6 rounded-[2.5rem] flex flex-col items-center gap-5 transition-all active:scale-95 shadow-lg shadow-slate-200/50 hover:shadow-2xl hover:shadow-emerald-900/5 hover:-translate-y-1 relative overflow-hidden ring-1 ring-slate-100 group touch-manipulation"
                        >
                            <motion.div 
                                layoutId={`staff-avatar-${staff.id}`} // Avatar Travels to Next Screen
                                className={`w-24 h-24 rounded-[1.8rem] flex items-center justify-center border-2 transition-transform duration-300 shadow-sm ${getRoleColor(staff.role)}`}
                            >
                                {getRoleIcon(staff.role)}
                            </motion.div>
                            <div className="text-center relative z-10">
                                <h3 className="text-slate-900 font-black text-xl leading-tight group-hover:text-emerald-600 transition-colors">{staff.full_name.split(' ')[0]}</h3>
                                <span className="inline-block mt-2 px-3 py-1 bg-slate-50 rounded-xl text-slate-400 text-[10px] font-black uppercase tracking-widest border border-slate-100 group-hover:bg-emerald-50 group-hover:text-emerald-600 group-hover:border-emerald-100 transition-all">{staff.role}</span>
                            </div>
                        </motion.button>
                    ))}
                </div>
            </motion.div>
        )}

        {/* --- VIEW 3: PIN ENTRY (COMPACT & FAST) --- */}
        {view === "pin" && selectedStaff && (
            <motion.div 
                layoutId={`staff-card-${selectedStaff.id}`} 
                key="pin" 
                className="w-full max-w-[360px] z-20 transform-gpu"
            >
                <div className="bg-white/90 backdrop-blur-2xl rounded-[3rem] p-8 shadow-2xl shadow-slate-200/50 border border-white ring-1 ring-slate-100 relative overflow-hidden">
                    
                    {/* Header */}
                    <div className="flex justify-between items-center mb-8">
                        <button onClick={() => { setSelectedStaff(null); setPin(""); setView("staff"); }} className="text-slate-400 hover:text-slate-900 transition-colors p-2 hover:bg-slate-100 rounded-xl touch-manipulation active:bg-slate-200"><LogOut className="w-5 h-5 rotate-180" /></button>
                        <div className="w-9 h-9" /> 
                    </div>

                    <div className="text-center mb-8">
                        <motion.div 
                            layoutId={`staff-avatar-${selectedStaff.id}`}
                            className={`w-20 h-20 mx-auto rounded-[1.8rem] flex items-center justify-center border-2 mb-4 shadow-xl ${getRoleColor(selectedStaff.role)}`}
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
                                transition={{ type: "spring", stiffness: 500, damping: 30 }} // Snappy
                                className="w-3.5 h-3.5 rounded-full border-[3px]" 
                            />
                        ))}
                    </div>

                    {/* NUMPAD (Optimized Size) */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                            <button key={num} onClick={() => handleNum(num.toString())} className="h-16 rounded-[1.5rem] bg-white border border-slate-100 shadow-sm shadow-slate-200/50 text-xl font-black text-slate-900 hover:bg-slate-50 hover:border-slate-200 active:scale-90 active:bg-slate-100 transition-all duration-75 touch-manipulation">
                                {num}
                            </button>
                        ))}
                        <div />
                        <button onClick={() => handleNum("0")} className="h-16 rounded-[1.5rem] bg-white border border-slate-100 shadow-sm shadow-slate-200/50 text-xl font-black text-slate-900 hover:bg-slate-50 hover:border-slate-200 active:scale-90 active:bg-slate-100 transition-all duration-75 touch-manipulation">0</button>
                        <button onClick={handleBack} className="h-16 rounded-[1.5rem] bg-red-50/50 border border-red-50 text-red-400 hover:bg-red-50 hover:text-red-500 active:scale-90 transition-all duration-75 flex items-center justify-center touch-manipulation"><LogOut className="w-5 h-5 rotate-180" /></button>
                    </div>

                    <button 
                        onClick={handleLogin} 
                        disabled={pin.length !== 4 || isSubmitting || isSuccess}
                        className={`w-full h-16 rounded-[1.5rem] font-bold text-lg shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all touch-manipulation ${
                            isSuccess 
                            ? 'bg-emerald-500 text-white shadow-emerald-500/30 ring-2 ring-emerald-200' 
                            : 'bg-slate-900 text-white shadow-slate-900/20 hover:shadow-2xl hover:-translate-y-0.5'
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