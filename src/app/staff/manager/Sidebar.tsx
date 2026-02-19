"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, UtensilsCrossed, Users, Store, 
  ChefHat, FileText, Settings, LogOut, Map, BellRing
} from "lucide-react";
import { motion } from "framer-motion";
import { logoutStaff } from "@/app/actions/staff-auth";
import { toast } from "sonner";

const MENU = [
  { name: "Overview", icon: LayoutDashboard, path: "/staff/manager" },
  { name: "Floor Plan", icon: Map, path: "/staff/manager/floor" },
  { name: "Staff Hub", icon: Users, path: "/staff/manager/staff" },
  { name: "Inventory", icon: Store, path: "/staff/manager/inventory" },
  { name: "Menu Mgmt", icon: UtensilsCrossed, path: "/staff/manager/menu" },
  { name: "Reports", icon: FileText, path: "/staff/manager/reports" },
];

export default function ManagerSidebar({ tenantName, tenantCode, logo }: any) {
  const pathname = usePathname();

  const handleLogout = () => {
      toast.custom((t) => (
          <div className="bg-white p-5 rounded-[1.5rem] shadow-2xl border border-slate-100 flex flex-col gap-4 w-full sm:w-[320px] pointer-events-auto">
              <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center shrink-0">
                      <LogOut className="w-5 h-5 ml-1" />
                  </div>
                  <div className="pt-0.5">
                      <h4 className="font-black text-slate-900 text-sm tracking-tight">End Manager Session?</h4>
                      <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
                          Are you sure you want to securely log out of the Operations Hub?
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
                          toast.loading("Securing session & signing out...");
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

  return (
    <>
      {/* We are keeping the mobile bottom nav hidden here because we built 
        that dedicated Premium Mobile Dock in page.tsx! 
        However, if you ever reuse this sidebar on other pages without the dock, 
        this sleek emerald version will show up. 
      */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-emerald-100 z-40 flex justify-around py-2 pb-6 px-2 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        {MENU.slice(0, 5).map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link key={item.path} href={item.path} className="relative group flex flex-col items-center gap-1">
              <div className={`p-2.5 rounded-[1.2rem] transition-all ${isActive ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 -translate-y-2" : "text-slate-400 hover:text-emerald-500"}`}>
                <item.icon className="w-5 h-5" />
              </div>
              {isActive && <span className="absolute -bottom-1 w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(0,200,83,0.8)]" />}
            </Link>
          );
        })}
      </nav>

      {/* DESKTOP SIDEBAR - Premium Gecko Green Theme */}
      <aside className="hidden md:flex w-72 h-screen bg-white border-r border-slate-100 flex-col relative z-50 shadow-[20px_0_50px_rgba(0,0,0,0.02)]">
        
        {/* LOGO AREA */}
        <div className="p-8 pb-4">
            <div className="flex items-center gap-4 mb-1 group cursor-pointer">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-500/30 group-hover:scale-105 transition-transform duration-300">
                    {logo ? <img src={logo} className="w-8 h-8 object-contain" /> : tenantName?.[0] || "M"}
                </div>
                <div>
                    <h2 className="font-black text-slate-900 text-lg leading-tight tracking-tight">{tenantName || "Manager"}</h2>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wider">{tenantCode || "DASHBOARD"}</span>
                </div>
            </div>
        </div>

        {/* NAVIGATION */}
        <div className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
            <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 opacity-60">Operations Center</p>
            {MENU.map((item) => {
                const isActive = pathname === item.path;
                return (
                    <Link key={item.path} href={item.path}>
                        <div className={`flex items-center gap-3 px-4 py-3.5 rounded-[1.2rem] transition-all group relative overflow-hidden ${isActive ? "bg-slate-900 text-white shadow-xl shadow-slate-900/20" : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"}`}>
                            <item.icon className={`w-5 h-5 transition-colors ${isActive ? "text-emerald-400" : "text-slate-400 group-hover:text-emerald-600"}`} />
                            <span className="font-bold text-sm tracking-wide">{item.name}</span>
                            {isActive && <motion.div layoutId="active-pill" className="absolute right-3 w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(0,200,83,0.8)]" />}
                        </div>
                    </Link>
                );
            })}
        </div>

        {/* FOOTER */}
        <div className="p-5 border-t border-slate-100">
            <div className="bg-slate-50 rounded-[1.8rem] p-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 font-black text-sm">M</div>
                    <div>
                        <p className="text-xs font-black text-slate-900">Manager Mode</p>
                        <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                          Full Access
                        </p>
                    </div>
                </div>
                <button 
                    onClick={handleLogout}
                    className="w-full py-3 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all flex items-center justify-center gap-2 group shadow-sm"
                >
                    <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" /> Sign Out
                </button>
            </div>
        </div>
      </aside>
    </>
  );
}