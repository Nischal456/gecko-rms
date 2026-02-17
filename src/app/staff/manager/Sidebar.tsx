"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, UtensilsCrossed, Users, Store, 
  ChefHat, FileText, Settings, LogOut, Map, BellRing
} from "lucide-react";
import { motion } from "framer-motion";
import { logoutStaff } from "@/app/actions/staff-auth";

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

  const handleLogout = async () => {
      if(confirm("End Manager Session?")) {
          await logoutStaff();
          window.location.href = "/staff/login";
      }
  }

  return (
    <>
      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-200 z-50 flex justify-around py-3 px-2 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        {MENU.slice(0, 5).map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link key={item.path} href={item.path} className="relative group flex flex-col items-center gap-1">
              <div className={`p-2 rounded-2xl transition-all ${isActive ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30" : "text-slate-400"}`}>
                <item.icon className="w-5 h-5" />
              </div>
              {isActive && <span className="absolute -bottom-2 w-1 h-1 bg-indigo-600 rounded-full" />}
            </Link>
          );
        })}
      </nav>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex w-72 h-screen bg-white border-r border-slate-100 flex-col relative z-40 shadow-2xl shadow-slate-200/50">
        
        {/* LOGO AREA */}
        <div className="p-8 pb-4">
            <div className="flex items-center gap-4 mb-1">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/30">
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
            <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 opacity-50">Operations</p>
            {MENU.map((item) => {
                const isActive = pathname === item.path;
                return (
                    <Link key={item.path} href={item.path}>
                        <div className={`flex items-center gap-3 px-4 py-3.5 rounded-[1.2rem] transition-all group relative overflow-hidden ${isActive ? "bg-slate-900 text-white shadow-xl shadow-slate-900/20" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}>
                            <item.icon className={`w-5 h-5 transition-colors ${isActive ? "text-indigo-400" : "text-slate-400 group-hover:text-indigo-600"}`} />
                            <span className="font-bold text-sm tracking-wide">{item.name}</span>
                            {isActive && <motion.div layoutId="active-pill" className="absolute right-3 w-1.5 h-1.5 bg-indigo-500 rounded-full" />}
                        </div>
                    </Link>
                );
            })}
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-100">
            <div className="bg-slate-50 rounded-[1.5rem] p-4 border border-slate-100">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-indigo-700 font-bold">M</div>
                    <div>
                        <p className="text-xs font-black text-slate-900">Manager Mode</p>
                        <p className="text-[10px] font-bold text-slate-400">Full Access</p>
                    </div>
                </div>
                <button 
                    onClick={handleLogout}
                    className="w-full py-2.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors flex items-center justify-center gap-2"
                >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
            </div>
        </div>
      </aside>
    </>
  );
}