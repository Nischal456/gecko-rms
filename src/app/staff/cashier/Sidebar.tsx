"use client";

import { LayoutDashboard, LogOut, Settings, PieChart, Store, PlusCircle, Clock, Menu, X, Plus } from "lucide-react";
import { logoutStaff } from "@/app/actions/staff-auth";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function CashierSidebar({ tenantName, tenantCode, logo, currentView, setView, hasUpdates }: any) {

  const handleLogout = () => {
      toast.custom((t) => (
          <div className="bg-white p-5 rounded-[1.5rem] shadow-2xl border border-slate-100 flex flex-col gap-4 w-full sm:w-[320px] pointer-events-auto">
              <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center shrink-0 shadow-inner">
                      <LogOut className="w-5 h-5 ml-1" />
                  </div>
                  <div className="pt-0.5">
                      <h4 className="font-black text-slate-900 text-sm tracking-tight">End Shift & Logout?</h4>
                      <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
                          Are you sure you want to close the terminal and end your current shift?
                      </p>
                  </div>
              </div>
              <div className="flex gap-2 mt-1">
                  <button 
                      onClick={() => toast.dismiss(t)} 
                      className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-xl transition-colors"
                  >
                      Cancel
                  </button>
                  <button 
                      onClick={async () => {
                          toast.dismiss(t);
                          toast.loading("Ending shift...");
                          await logoutStaff();
                          window.location.href = "/staff/login";
                      }} 
                      className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-red-500/25 active:scale-95"
                  >
                      Yes, Logout
                  </button>
              </div>
          </div>
      ), { duration: 8000 });
  };

  const navItems = [
    { id: "terminal", icon: LayoutDashboard, label: "Overview" },
    { id: "new_order_select", icon: PlusCircle, label: "New Order" }, 
    { id: "active_orders", icon: Clock, label: "Kitchen Status", badge: hasUpdates }, 
    { id: "reports", icon: PieChart, label: "Reports" },
    { id: "settings", icon: Settings, label: "Settings" }, 
  ];

  return (
    <>
      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden md:block w-72 h-full relative z-30 shadow-2xl shadow-slate-200/50">
        <div className="flex flex-col h-full bg-[#f8fafc]/80 backdrop-blur-3xl border-r border-slate-200/60">
            
            {/* --- ULTRA PREMIUM LOGO AREA (Code Removed) --- */}
            <div className="p-5 pb-2">
                <div className="relative p-4 rounded-[1.5rem] bg-gradient-to-b from-white/90 to-white/50 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden group transition-all duration-500 hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)]">
                    
                    {/* Subtle ambient glow behind */}
                    <div className="absolute -inset-10 bg-gradient-to-br from-emerald-400/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl pointer-events-none" />

                    <div className="relative z-10 flex items-center gap-4">
                        {/* 3D Floating Logo */}
                        <div className="relative shrink-0">
                            <div className="absolute inset-0 bg-slate-900 rounded-[1rem] blur-md opacity-15 translate-y-1.5 transition-all group-hover:translate-y-2 group-hover:opacity-20" />
                            {logo ? (
                                <img src={logo} alt="Logo" className="w-12 h-12 rounded-[1rem] object-cover border-2 border-white relative z-10 shadow-sm bg-white" />
                            ) : (
                                <div className="w-12 h-12 rounded-[1rem] bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-white relative z-10 shadow-sm border border-slate-700">
                                    <Store className="w-5 h-5" />
                                </div>
                            )}
                        </div>

                        {/* Clean Text Area */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <h2 className="text-[17px] font-black tracking-tight text-slate-900 truncate drop-shadow-sm">
                                {tenantName || "POS"}
                            </h2>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Active</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* NAV ITEMS */}
            <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar mt-4">
                <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Menu</p>
                {navItems.map((item) => {
                    const isActive = currentView === item.id || (item.id === 'new_order_select' && (currentView === 'table_select' || currentView === 'pos'));
                    return (
                        <button 
                            key={item.id}
                            onClick={() => setView(item.id)}
                            className={`w-full flex items-center gap-4 p-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${
                                isActive
                                ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 translate-x-1' 
                                : 'text-slate-500 hover:bg-white hover:shadow-sm'
                            }`}
                        >
                            <div className="relative">
                                <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-emerald-500'}`} />
                                {/* RED PULSE DOT */}
                                {item.badge && (
                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse shadow-sm" />
                                )}
                            </div>
                            <span className="font-bold text-sm tracking-wide">{item.label}</span>
                            {isActive && <div className="absolute right-3 w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]" />}
                        </button>
                    );
                })}
            </nav>

            {/* FOOTER */}
            <div className="p-5 border-t border-slate-200/50 mt-auto bg-white/30 backdrop-blur-md">
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-[0_4px_15px_rgb(0,0,0,0.03)] relative group overflow-hidden">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-black text-sm shadow-inner">
                            CM
                        </div>
                        <div>
                            <p className="font-black text-slate-900 text-sm leading-tight">Cashier</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Online Session</p>
                            </div>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="w-full h-10 flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all shadow-sm active:scale-95">
                        <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                </div>
            </div>
        </div>
      </aside>
      
      {/* --- MOBILE TOP HEADER (Compact & Premium) --- */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-[76px] bg-white/80 backdrop-blur-2xl border-b border-slate-200/60 z-[60] flex items-center justify-between px-5 shadow-sm">
          <div className="flex items-center gap-3 w-full pr-4">
             {/* Mobile Floating Logo */}
             <div className="relative shrink-0 mt-1">
                 <div className="absolute inset-0 bg-slate-900 rounded-xl blur-sm opacity-20 translate-y-1" />
                 {logo ? (
                     <img src={logo} alt="Logo" className="w-10 h-10 object-cover rounded-xl border border-white relative z-10 bg-white" />
                 ) : (
                     <div className="w-10 h-10 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center text-white relative z-10 border border-slate-700">
                        <Store className="w-5 h-5"/>
                     </div>
                 )}
             </div>

             <div className="flex-1 min-w-0 flex flex-col justify-center">
                 <span className="font-black text-slate-900 text-base leading-tight block truncate drop-shadow-sm">{tenantName || "POS"}</span>
                 <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Live</span>
                 </div>
             </div>
          </div>
          <button onClick={handleLogout} className="p-2.5 bg-white text-slate-500 hover:text-red-500 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-full transition-colors shadow-sm shrink-0 active:scale-90">
              <LogOut className="w-5 h-5"/>
          </button>
      </div>

      {/* --- MOBILE BOTTOM NAVIGATION DOCK (App-Like) --- */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-[72px] bg-white/95 backdrop-blur-lg border-t border-slate-200 z-[70] flex items-center justify-around px-2 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          
          <button onClick={() => setView('terminal')} className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors relative ${currentView === 'terminal' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>
              <LayoutDashboard className={`w-6 h-6 transition-transform ${currentView === 'terminal' ? 'fill-emerald-50 text-emerald-600 scale-110' : ''}`} />
              <span className="text-[9px] font-bold tracking-wide">Terminal</span>
              {currentView === 'terminal' && <motion.div layoutId="nav-indicator" className="absolute top-0 w-8 h-1 bg-emerald-500 rounded-b-full" />}
          </button>

          <button onClick={() => setView('active_orders')} className={`relative flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${currentView === 'active_orders' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>
              <Clock className={`w-6 h-6 transition-transform ${currentView === 'active_orders' ? 'fill-emerald-50 text-emerald-600 scale-110' : ''}`} />
              <span className="text-[9px] font-bold tracking-wide">Orders</span>
              {hasUpdates && <span className="absolute top-2 right-1/4 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse shadow-sm" />}
              {currentView === 'active_orders' && <motion.div layoutId="nav-indicator" className="absolute top-0 w-8 h-1 bg-emerald-500 rounded-b-full" />}
          </button>

          {/* Prominent Center Add Button */}
          <div className="w-full flex justify-center -mt-8">
              <button 
                  onClick={() => setView('new_order_select')} 
                  className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl active:scale-95 transition-all border-4 border-white ${currentView === 'new_order_select' || currentView === 'table_select' || currentView === 'pos' ? 'bg-slate-900 text-white shadow-slate-900/30 rotate-45' : 'bg-emerald-500 text-white shadow-emerald-500/40 hover:bg-emerald-400'}`}
              >
                  <Plus className="w-7 h-7" />
              </button>
          </div>

          <button onClick={() => setView('reports')} className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors relative ${currentView === 'reports' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>
              <PieChart className={`w-6 h-6 transition-transform ${currentView === 'reports' ? 'fill-emerald-50 text-emerald-600 scale-110' : ''}`} />
              <span className="text-[9px] font-bold tracking-wide">Reports</span>
              {currentView === 'reports' && <motion.div layoutId="nav-indicator" className="absolute top-0 w-8 h-1 bg-emerald-500 rounded-b-full" />}
          </button>

          <button onClick={() => setView('settings')} className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors relative ${currentView === 'settings' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>
              <Settings className={`w-6 h-6 transition-transform ${currentView === 'settings' ? 'fill-emerald-50 text-emerald-600 scale-110' : ''}`} />
              <span className="text-[9px] font-bold tracking-wide">Settings</span>
              {currentView === 'settings' && <motion.div layoutId="nav-indicator" className="absolute top-0 w-8 h-1 bg-emerald-500 rounded-b-full" />}
          </button>

      </div>
    </>
  );
}