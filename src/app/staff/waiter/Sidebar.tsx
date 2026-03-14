"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { 
  LayoutDashboard, PlusCircle, Coffee, 
  FileBarChart, LogOut, UtensilsCrossed 
} from "lucide-react";
import { logoutStaff } from "@/app/actions/staff-auth"; 
import { toast } from "sonner";

interface SidebarProps {
    tenantName?: string;
    tenantCode?: string;
    logo?: string;
}

const MENU = [
  { name: "Overview", icon: LayoutDashboard, path: "/staff/waiter", exact: true },
  { name: "New Order", icon: PlusCircle, path: "/staff/waiter/new-order", exact: false }, 
  { name: "Active Orders", icon: Coffee, path: "/staff/waiter/orders", exact: false },
  { name: "Reports", icon: FileBarChart, path: "/staff/waiter/reports", exact: false }, 
];

export default function WaiterSidebar({ tenantName, tenantCode, logo }: SidebarProps) {
  const pathname = usePathname();
  
  // CACHE STATE TO PREVENT LOGO FLICKER ON NAVIGATION
  const [cachedMeta, setCachedMeta] = useState({ name: "Waiter", code: "POS", logo: "" });

  useEffect(() => {
      // 1. Load instantly from cache on mount
      const saved = localStorage.getItem("gecko_waiter_meta");
      if (saved) {
          try { setCachedMeta(JSON.parse(saved)); } catch (e) {}
      }
  }, []);

  useEffect(() => {
      // 2. Update cache smoothly when real data arrives
      if (tenantName || tenantCode || logo) {
          const newData = {
              name: tenantName || cachedMeta.name,
              code: tenantCode || cachedMeta.code,
              logo: logo || cachedMeta.logo
          };
          setCachedMeta(newData);
          localStorage.setItem("gecko_waiter_meta", JSON.stringify(newData));
      }
  }, [tenantName, tenantCode, logo]);

  const displayLogo = logo || cachedMeta.logo;
  const displayName = tenantName || cachedMeta.name;
  const displayCode = tenantCode || cachedMeta.code;

  const handleLogout = () => {
      toast.custom((t) => (
          <div className="bg-white p-5 rounded-[1.5rem] shadow-2xl border border-slate-100 flex flex-col gap-4 w-full sm:w-[320px] pointer-events-auto transform-gpu">
              <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center shrink-0">
                      <LogOut className="w-5 h-5 ml-1" />
                  </div>
                  <div className="pt-0.5">
                      <h4 className="font-black text-slate-900 text-sm tracking-tight">End Shift & Sign Out?</h4>
                      <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
                          Are you sure you want to securely log out of the Waiter Hub?
                      </p>
                  </div>
              </div>
              <div className="flex gap-2 mt-1">
                  <button 
                      onClick={() => toast.dismiss(t)} 
                      className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-xl transition-colors active:scale-95"
                  >
                      Cancel
                  </button>
                  <button 
                      onClick={async () => {
                          toast.dismiss(t);
                          toast.loading("Ending shift...");
                          localStorage.removeItem("gecko_waiter_meta"); // Clear cache on logout
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

  return (
    <>
      {/* ULTRA-PREMIUM MOBILE NAV (GPU ACCELERATED & iOS SAFE) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-2xl border-t border-slate-200 z-[150] flex justify-around pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] px-2 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] transform-gpu will-change-transform">
        {MENU.map((item) => {
          const isActive = item.exact 
              ? pathname === item.path 
              : pathname.startsWith(item.path) && pathname !== "/staff/waiter";
          
          return (
            <Link key={item.name} href={item.path} className="relative group flex flex-col items-center gap-1 active:scale-90 transition-transform">
              <div className={`p-2 rounded-2xl transition-all duration-300 ${isActive ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 transform -translate-y-1" : "text-slate-400"}`}>
                <item.icon className="w-5 h-5" />
              </div>
              {isActive && <span className="absolute -bottom-2 w-1.5 h-1.5 bg-emerald-600 rounded-full shadow-sm" />}
            </Link>
          );
        })}
      </nav>

      {/* ZERO-LAG DESKTOP SIDEBAR */}
      <aside className="hidden md:flex w-72 h-screen bg-white border-r border-slate-100 flex-col relative z-40 shadow-2xl shadow-slate-200/50 transform-gpu">
        <div className="p-8 pb-4 shrink-0">
            <div className="flex items-center gap-4 mb-1">
                {/* PREMIUM TRANSPARENT LOGO CONTAINER */}
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-800 border border-slate-100 shadow-sm overflow-hidden shrink-0">
                    {displayLogo ? (
                        <img src={displayLogo} className="w-full h-full object-contain p-1" alt="Logo" />
                    ) : (
                        <UtensilsCrossed className="w-6 h-6 text-slate-300" />
                    )}
                </div>
                <div className="flex flex-col justify-center min-w-0">
                    <h2 className="font-black text-slate-900 text-lg leading-tight tracking-tight truncate">{displayName}</h2>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wider w-fit mt-0.5">{displayCode}</span>
                </div>
            </div>
        </div>

        <div className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar overscroll-contain transform-gpu">
            <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 opacity-60">Station</p>
            {MENU.map((item) => {
                const isActive = item.exact 
                    ? pathname === item.path 
                    : pathname.startsWith(item.path) && pathname !== "/staff/waiter";

                return (
                    <Link key={item.name} href={item.path}>
                        <div className={`flex items-center gap-3 px-4 py-3.5 rounded-[1.2rem] transition-all duration-300 group relative overflow-hidden active:scale-[0.98] ${isActive ? "bg-slate-900 text-white shadow-xl shadow-slate-900/20" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}>
                            <item.icon className={`w-5 h-5 transition-colors duration-300 ${isActive ? "text-emerald-400" : "text-slate-400 group-hover:text-emerald-600"}`} />
                            <span className="font-bold text-sm tracking-wide">{item.name}</span>
                            {isActive && <div className="absolute right-4 w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
                        </div>
                    </Link>
                );
            })}
        </div>

        <div className="p-5 border-t border-slate-100 shrink-0 bg-slate-50/50">
            <div className="bg-white rounded-[1.5rem] p-4 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-emerald-700 font-bold shadow-sm">W</div>
                    <div className="flex flex-col">
                        <p className="text-xs font-black text-slate-900 leading-tight">Waiter Mode</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">Restricted Access</p>
                    </div>
                </div>
                <button onClick={handleLogout} className="w-full py-3 bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-300 flex items-center justify-center gap-2 active:scale-95">
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
            </div>
        </div>
      </aside>
    </>
  );
}