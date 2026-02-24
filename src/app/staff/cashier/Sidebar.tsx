"use client";

import { LayoutDashboard, LogOut, Settings, PieChart, Store, PlusCircle, Clock, Menu, X, Plus } from "lucide-react";
import { logoutStaff } from "@/app/actions/staff-auth";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function CashierSidebar({ tenantName, tenantCode, logo, currentView, setView, hasUpdates }: any) {
  
  const handleLogout = () => {
      toast.custom((t) => (
          <div className="bg-white p-5 rounded-[1.5rem] shadow-2xl border border-slate-100 flex flex-col gap-4 w-full sm:w-[320px] pointer-events-auto">
              <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center shrink-0">
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

  // --- DESKTOP SIDEBAR CONTENT ---
  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white/80 backdrop-blur-xl border-r border-slate-200/60">
        {/* LOGO AREA */}
        <div className="p-8 pb-6">
            <div className="flex items-center gap-4 p-3 bg-white/50 rounded-2xl border border-white/60 shadow-sm">
                {logo ? (
                    <img src={logo} alt="Logo" className="w-10 h-10 rounded-xl object-contain bg-white" />
                ) : (
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg shrink-0">
                        <Store className="w-5 h-5" />
                    </div>
                )}
                <div className="overflow-hidden">
                    <h2 className="font-black text-slate-900 leading-tight truncate text-sm">{tenantName || "POS"}</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tenantCode || "ID: --"}</p>
                </div>
            </div>
        </div>

        {/* NAV ITEMS */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
            <p className="px-4 text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">Menu</p>
            {navItems.map((item) => (
                <button 
                    key={item.id}
                    onClick={() => setView(item.id)}
                    className={`w-full flex items-center gap-4 p-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${
                        currentView === item.id || (item.id === 'new_order_select' && (currentView === 'table_select' || currentView === 'pos'))
                        ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 translate-x-1' 
                        : 'text-slate-500 hover:bg-white hover:shadow-sm'
                    }`}
                >
                    <div className="relative">
                        <item.icon className={`w-5 h-5 transition-colors ${currentView === item.id || (item.id === 'new_order_select' && (currentView === 'table_select' || currentView === 'pos')) ? 'text-emerald-400' : 'group-hover:text-emerald-500'}`} />
                        {/* RED PULSE DOT */}
                        {item.badge && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                        )}
                    </div>
                    <span className="font-bold text-sm">{item.label}</span>
                </button>
            ))}
        </nav>

        {/* FOOTER */}
        <div className="p-6 border-t border-slate-100/50 mt-auto">
            <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 relative group overflow-hidden">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-emerald-600 font-black text-sm shadow-sm">CM</div>
                    <div><p className="font-bold text-slate-900 text-sm">Cashier</p><p className="text-[10px] text-slate-400 font-medium">Online</p></div>
                </div>
                <button onClick={handleLogout} className="w-full h-9 flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all"><LogOut className="w-3 h-3" /> Sign Out</button>
            </div>
        </div>
    </div>
  );

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:block w-72 h-full relative z-30 shadow-2xl shadow-slate-200/50">
          <SidebarContent />
      </aside>
      
      {/* MOBILE TOP HEADER (Compact) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-xl border-b border-slate-200 z-[60] flex items-center justify-between px-5 shadow-sm">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white shadow-md">
                 {logo ? <img src={logo} alt="Logo" className="w-6 h-6 object-contain" /> : <Store className="w-4 h-4"/>}
             </div>
             <div>
                 <span className="font-black text-slate-900 leading-tight block">{tenantName || "POS"}</span>
                 <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Active Terminal</span>
             </div>
          </div>
          <button onClick={handleLogout} className="p-2 bg-slate-50 text-slate-400 hover:text-red-500 rounded-full transition-colors">
              <LogOut className="w-5 h-5"/>
          </button>
      </div>

      {/* MOBILE BOTTOM NAVIGATION DOCK (App-Like) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-[72px] bg-white border-t border-slate-200 z-[70] flex items-center justify-around px-2 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          
          <button onClick={() => setView('terminal')} className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${currentView === 'terminal' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>
              <LayoutDashboard className={`w-6 h-6 ${currentView === 'terminal' ? 'fill-emerald-50 text-emerald-600' : ''}`} />
              <span className="text-[9px] font-bold tracking-wide">Terminal</span>
          </button>

          <button onClick={() => setView('active_orders')} className={`relative flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${currentView === 'active_orders' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>
              <Clock className={`w-6 h-6 ${currentView === 'active_orders' ? 'fill-emerald-50 text-emerald-600' : ''}`} />
              <span className="text-[9px] font-bold tracking-wide">Orders</span>
              {hasUpdates && <span className="absolute top-2 right-1/4 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />}
          </button>

          {/* Prominent Center Add Button */}
          <div className="w-full flex justify-center -mt-8">
              <button 
                  onClick={() => setView('new_order_select')} 
                  className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all border-4 border-white ${currentView === 'new_order_select' || currentView === 'table_select' || currentView === 'pos' ? 'bg-slate-900 text-white shadow-slate-900/30' : 'bg-emerald-500 text-white shadow-emerald-500/30'}`}
              >
                  <Plus className="w-7 h-7" />
              </button>
          </div>

          <button onClick={() => setView('reports')} className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${currentView === 'reports' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>
              <PieChart className={`w-6 h-6 ${currentView === 'reports' ? 'fill-emerald-50 text-emerald-600' : ''}`} />
              <span className="text-[9px] font-bold tracking-wide">Reports</span>
          </button>

          <button onClick={() => setView('settings')} className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${currentView === 'settings' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>
              <Settings className={`w-6 h-6 ${currentView === 'settings' ? 'fill-emerald-50 text-emerald-600' : ''}`} />
              <span className="text-[9px] font-bold tracking-wide">Settings</span>
          </button>

      </div>
    </>
  );
}