"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  ChefHat, LayoutGrid, FileBarChart, LogOut, Flame, History 
} from "lucide-react";
import { toast } from "sonner";
import { logoutStaff } from "@/app/actions/staff-auth";

export default function KitchenSidebar({ tenantName, logo }: { tenantName?: string, logo?: string }) {
  const pathname = usePathname();

  const handleLogout = () => {
    toast.custom((t) => (
        <div className="bg-white p-5 rounded-[1.5rem] shadow-2xl border border-slate-100 flex flex-col gap-4 w-full sm:w-[320px] pointer-events-auto transform-gpu">
            <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center shrink-0 shadow-inner">
                    <LogOut className="w-5 h-5 ml-1" />
                </div>
                <div className="pt-0.5">
                    <h4 className="font-black text-slate-900 text-sm tracking-tight">End Shift & Sign Out?</h4>
                    <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
                        Are you sure you want to close the Kitchen Terminal and sign out?
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
                        toast.loading("Closing terminal...");
                        sessionStorage.removeItem("gecko_kitchen_init");
                        await logoutStaff();
                        window.location.href = "/staff/login";
                    }} 
                    className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-red-500/25 active:scale-95"
                >
                    Yes, Sign Out
                </button>
            </div>
        </div>
    ), { duration: 8000 });
  };

  const navLinks = [
    { name: "Live KDS", href: "/staff/kitchen", icon: Flame },
    { name: "Menu", href: "/staff/kitchen/menu", icon: LayoutGrid },
    { name: "History", href: "/staff/kitchen/history", icon: History },
    { name: "Reports", href: "/staff/kitchen/reports", icon: FileBarChart },
  ];

  return (
    <div className="hidden md:flex w-[260px] lg:w-[280px] flex-col h-full py-6 px-4 z-40 shrink-0 border-r border-slate-200/60 bg-[#F8FAFC]">
      
      {/* 1. Tenant / Brand Card */}
      <div className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-slate-100 mb-8 transform-gpu">
        <div className="w-12 h-12 rounded-full flex items-center justify-center border border-slate-100 shadow-inner shrink-0 overflow-hidden bg-slate-50">
          {logo ? <img src={logo} alt="Logo" className="w-full h-full object-cover" /> : <ChefHat className="w-6 h-6 text-emerald-600" />}
        </div>
        <div className="overflow-hidden">
          <h2 className="font-black text-slate-900 text-[15px] truncate leading-tight">{tenantName || "Gecko Kitchen"}</h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]"></div>
            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Active</p>
          </div>
        </div>
      </div>

      {/* 2. Navigation Menu */}
      <div className="px-2 mb-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Menu</span>
      </div>
      <nav className="flex-1 space-y-1.5">
        {navLinks.map((link) => {
          const isActive = pathname === link.href || (pathname.includes(link.href) && link.href !== "/staff/kitchen");
          return (
            <Link 
              key={link.name} 
              href={link.href} 
              className={`flex items-center justify-between px-4 py-3.5 rounded-2xl font-bold transition-all duration-300 group transform-gpu ${isActive ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10 scale-[1.02]' : 'text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm border border-transparent hover:border-slate-100'}`}
            >
              <div className="flex items-center gap-3">
                  <link.icon className={`w-[18px] h-[18px] shrink-0 transition-colors ${isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-emerald-500'}`} />
                  <span className="text-sm tracking-wide">{link.name}</span>
              </div>
              {isActive && (
                  <motion.div layoutId="active-kitchen-indicator" className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></motion.div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* 3. User Profile & Logout Card */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mt-auto transform-gpu">
          <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm shadow-inner border border-emerald-100">
                  C
              </div>
              <div>
                  <h3 className="font-black text-slate-900 text-sm leading-tight">Chef</h3>
                  <div className="flex items-center gap-1 mt-0.5">
                      <div className="w-1 h-1 bg-emerald-500 rounded-full"></div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">KOT Session</p>
                  </div>
              </div>
          </div>
          <button 
              onClick={handleLogout} 
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-slate-500 bg-slate-50 hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-200 transition-all duration-300 group active:scale-95 transform-gpu"
          >
              <LogOut className="w-4 h-4 shrink-0 group-hover:-translate-x-1 transition-transform" />
              <span className="text-xs tracking-wide">Sign Out</span>
          </button>
      </div>
    </div>
  );
}