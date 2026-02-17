"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, PlusCircle, Coffee, 
  FileBarChart, LogOut, UtensilsCrossed // Swapped History for FileBarChart
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
  { name: "Reports", icon: FileBarChart, path: "/staff/waiter/reports", exact: false }, // Updated Label & Icon
];

export default function WaiterSidebar({ tenantName, tenantCode, logo }: SidebarProps) {
  const pathname = usePathname();

  const handleLogout = async () => {
      if(confirm("End Shift?")) {
          await logoutStaff();
          toast.success("Shift Ended");
          window.location.href = "/staff/login";
      }
  }

  return (
    <>
      {/* MOBILE NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-200 z-50 flex justify-around py-3 px-2 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        {MENU.map((item) => {
          const isActive = item.exact ? pathname === item.path : pathname.startsWith(item.path);
          
          // Special case: If on POS page, don't highlight Overview
          const isOverview = item.path === "/staff/waiter" && item.exact;
          if (isOverview && pathname !== "/staff/waiter") return (
            <Link key={item.name} href={item.path} className="relative group flex flex-col items-center gap-1 text-slate-400"><div className="p-2 rounded-2xl"><item.icon className="w-5 h-5" /></div></Link>
          );

          return (
            <Link key={item.name} href={item.path} className="relative group flex flex-col items-center gap-1">
              <div className={`p-2 rounded-2xl transition-all ${isActive ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30" : "text-slate-400"}`}>
                <item.icon className="w-5 h-5" />
              </div>
              {isActive && <span className="absolute -bottom-2 w-1 h-1 bg-emerald-600 rounded-full" />}
            </Link>
          );
        })}
      </nav>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex w-72 h-screen bg-white border-r border-slate-100 flex-col relative z-40 shadow-2xl shadow-slate-200/50">
        <div className="p-8 pb-4">
            <div className="flex items-center gap-4 mb-1">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-500/30">
                    {logo ? <img src={logo} className="w-8 h-8 object-contain" alt="Logo" /> : <UtensilsCrossed className="w-6 h-6" />}
                </div>
                <div>
                    <h2 className="font-black text-slate-900 text-lg leading-tight tracking-tight truncate w-32">{tenantName || "Waiter"}</h2>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wider">{tenantCode || "POS"}</span>
                </div>
            </div>
        </div>

        <div className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
            <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 opacity-50">Station</p>
            {MENU.map((item) => {
                let isActive = false;
                if (item.path === "/staff/waiter") {
                    isActive = pathname === "/staff/waiter";
                } else {
                    isActive = pathname.startsWith(item.path);
                }

                return (
                    <Link key={item.name} href={item.path}>
                        <div className={`flex items-center gap-3 px-4 py-3.5 rounded-[1.2rem] transition-all group relative overflow-hidden ${isActive ? "bg-slate-900 text-white shadow-xl shadow-slate-900/20" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}>
                            <item.icon className={`w-5 h-5 transition-colors ${isActive ? "text-emerald-400" : "text-slate-400 group-hover:text-emerald-600"}`} />
                            <span className="font-bold text-sm tracking-wide">{item.name}</span>
                            {isActive && <div className="absolute right-3 w-1.5 h-1.5 bg-emerald-500 rounded-full" />}
                        </div>
                    </Link>
                );
            })}
        </div>

        <div className="p-4 border-t border-slate-100">
            <div className="bg-slate-50 rounded-[1.5rem] p-4 border border-slate-100">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-emerald-700 font-bold">W</div>
                    <div>
                        <p className="text-xs font-black text-slate-900">Waiter Mode</p>
                        <p className="text-[10px] font-bold text-slate-400">Restricted</p>
                    </div>
                </div>
                <button onClick={handleLogout} className="w-full py-2.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors flex items-center justify-center gap-2">
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
            </div>
        </div>
      </aside>
    </>
  );
}