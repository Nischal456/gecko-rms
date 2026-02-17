"use client";

import { useState, useEffect, useRef } from "react";
import { 
  LayoutGrid, UtensilsCrossed, Users, BarChart3, Settings, 
  ChefHat, LogOut, Menu, X, Home, Camera, Wifi, Loader2, Package
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link"; // <--- THE SECRET TO INSTANT SPEED
import { logoutUser } from "@/app/actions/auth";
import { uploadRestaurantLogo } from "@/app/actions/dashboard";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function Sidebar({ tenantName, tenantCode, logo }: { tenantName: string, tenantCode: string, logo?: string }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [currentTime, setCurrentTime] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Safe Client-Side Time Setting
        setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
        const timer = setInterval(() => {
            setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const menuItems = [
        { icon: Home, label: "Overview", path: "/admin" },
        { icon: LayoutGrid, label: "Floor Plan", path: "/admin/floor" },
        { icon: UtensilsCrossed, label: "Menu Engine", path: "/admin/menu" },
        { icon: Package, label: "Inventory", path: "/admin/inventory" }, // <--- NEW
        { icon: ChefHat, label: "Kitchen (KDS)", path: "/admin/kitchen" },
        { icon: Users, label: "Staff", path: "/admin/staff" },
        { icon: BarChart3, label: "Reports", path: "/admin/reports" },
        { icon: Settings, label: "Settings", path: "/admin/settings" },
    ];

    async function handleLogout() {
        toast.promise(logoutUser(), {
            loading: 'Disconnecting...',
            success: () => {
                // Force a hard reload to clear all client states
                window.location.href = "/login";
                return 'Session Closed';
            },
            error: 'Error disconnecting'
        });
    }

    async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files || !e.target.files[0]) return;
        setIsUploading(true);
        
        const formData = new FormData();
        formData.append("file", e.target.files[0]);

        const res = await uploadRestaurantLogo(formData);
        
        if (res.success) {
            toast.success("Identity Updated", { description: "Logo refreshed successfully." });
            // Optional: Reload to see new logo immediately if not using realtime context
            router.refresh();
        } else {
            toast.error("Update Failed", { description: "Could not upload image." });
        }
        setIsUploading(false);
    }

    return (
        <>
            {/* MOBILE TRIGGER (Visible only on small screens) */}
            <div className="lg:hidden fixed top-4 left-4 z-50">
                <button 
                    onClick={() => setIsOpen(!isOpen)} 
                    className="p-3 bg-slate-900 text-white rounded-2xl shadow-xl active:scale-95 transition-transform"
                >
                    {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {/* BACKDROP FOR MOBILE */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
                        onClick={() => setIsOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* SIDEBAR CONTAINER */}
            <motion.aside 
                className={`fixed lg:sticky top-0 left-0 h-[100dvh] w-[280px] bg-white/80 backdrop-blur-xl border-r border-slate-100 flex flex-col justify-between p-6 z-40 shadow-2xl lg:shadow-none transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
            >
                <div className="flex flex-col h-full">
                    {/* BRAND AREA */}
                    <div className="flex flex-col items-center mb-8 mt-2 flex-shrink-0">
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center text-white font-black text-3xl shadow-2xl shadow-slate-200 relative overflow-hidden group cursor-pointer hover:scale-105 transition-transform duration-300"
                        >
                            {isUploading ? (
                                <Loader2 className="w-8 h-8 animate-spin text-white" />
                            ) : logo ? (
                                <img src={logo} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                                tenantName?.[0] || "G"
                            )}
                            
                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="w-6 h-6 text-white" />
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                        </div>
                        
                        <div className="text-center mt-4 w-full">
                            <h2 className="font-black text-lg text-slate-900 tracking-tight truncate px-2">
                                {tenantName || "GeckoPOS"}
                            </h2>
                            <div className="flex justify-center mt-1">
                                <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 rounded-md text-[10px] font-bold text-emerald-700 uppercase tracking-widest flex items-center gap-1">
                                    <Wifi className="w-3 h-3" /> {tenantCode || "---"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* MENU (Scrollable if height is small) */}
                    <nav className="space-y-1 flex-1 overflow-y-auto no-scrollbar py-2">
                        {menuItems.map((item, i) => {
                            const isActive = pathname === item.path;
                            return (
                                <Link 
                                    key={i} 
                                    href={item.path}
                                    onClick={() => setIsOpen(false)} // Close sidebar on mobile click
                                    prefetch={true} // Ensures instant loading
                                    className={`w-full flex items-center gap-4 p-4 rounded-[1.2rem] transition-all duration-300 group relative overflow-hidden ${isActive ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10 scale-[1.02]' : 'hover:bg-slate-50 text-slate-500 hover:text-slate-900'}`}
                                >
                                    <item.icon className={`w-5 h-5 relative z-10 transition-colors ${isActive ? 'text-gecko-400' : 'text-slate-400 group-hover:text-slate-900'}`} />
                                    <span className={`font-bold text-sm relative z-10`}>{item.label}</span>
                                    
                                    {/* Active/Hover Background Effects */}
                                    {isActive && <div className="absolute inset-0 bg-white/10 z-0" />}
                                </Link>
                            )
                        })}
                    </nav>

                    {/* FOOTER (Stays at bottom) */}
                    <div className="space-y-4 flex-shrink-0 pt-4 mt-auto border-t border-slate-100">
                        <div className="p-4 bg-slate-900 rounded-[1.5rem] relative overflow-hidden group select-none">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Local Time</p>
                            <p className="font-mono text-xl font-black text-white tracking-widest">{currentTime || "--:--"}</p>
                        </div>

                        <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 p-4 rounded-[1.2rem] bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-colors font-bold text-sm active:scale-95">
                            <LogOut className="w-4 h-4" />
                            <span>Disconnect</span>
                        </button>
                    </div>
                </div>
            </motion.aside>
        </>
    )
}