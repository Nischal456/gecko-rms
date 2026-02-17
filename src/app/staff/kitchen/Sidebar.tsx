"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  ChefHat, History, LogOut, Flame, Menu as MenuIcon, LayoutDashboard 
} from "lucide-react";
import { logoutStaff } from "@/app/actions/staff-auth";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export default function Sidebar({ tenantName, tenantCode, logo }: any) {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(true);

    const handleLogout = async () => {
        if(confirm("Close Kitchen Station?")) {
            await logoutStaff();
            window.location.href = "/staff/login";
        }
    };

    const isActive = (path: string) => pathname === path;

    return (
        <motion.div 
            animate={{ width: isCollapsed ? 80 : 240 }}
            className="flex-shrink-0 h-full bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-all duration-300 z-50"
        >
            {/* LOGO */}
            <div className="h-20 flex items-center justify-center border-b border-slate-800">
                <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
                    {logo ? (
                        <img src={logo} alt="Logo" className="w-10 h-10 object-contain rounded-lg" />
                    ) : (
                        <ChefHat className="w-8 h-8 text-emerald-500" />
                    )}
                </button>
            </div>

            {/* NAV */}
            <div className="flex-1 py-6 flex flex-col gap-2 px-3">
                <NavItem 
                    href="/staff/kitchen" 
                    icon={Flame} 
                    label="Live KDS" 
                    active={isActive('/staff/kitchen')} 
                    collapsed={isCollapsed} 
                />
                <NavItem 
                    href="/staff/kitchen/history" 
                    icon={History} 
                    label="History" 
                    active={isActive('/staff/kitchen/history')} 
                    collapsed={isCollapsed} 
                />
            </div>

            {/* FOOTER */}
            <div className="p-4 border-t border-slate-800">
                <button 
                    onClick={handleLogout}
                    className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all ${isCollapsed ? 'justify-center' : ''} text-red-400 hover:bg-red-500/10 hover:text-red-300`}
                >
                    <LogOut className="w-5 h-5" />
                    {!isCollapsed && <span className="font-bold text-sm">Station Off</span>}
                </button>
            </div>
        </motion.div>
    );
}

function NavItem({ href, icon: Icon, label, active, collapsed }: any) {
    return (
        <Link href={href} className={`flex items-center gap-3 p-3 rounded-xl transition-all group ${active ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'} ${collapsed ? 'justify-center' : ''}`}>
            <Icon className={`w-5 h-5 ${active ? 'animate-pulse' : ''}`} />
            {!collapsed && <span className="font-bold text-sm">{label}</span>}
            {collapsed && active && <div className="absolute left-16 bg-emerald-600 text-white text-xs font-bold px-2 py-1 rounded-md shadow-md">{label}</div>}
        </Link>
    )
}