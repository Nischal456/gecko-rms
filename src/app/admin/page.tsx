"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/app/admin/Sidebar";
import { 
  TrendingUp, Users, ShoppingBag, DollarSign, Clock, 
  ArrowUpRight, ArrowDownRight, Calendar, CreditCard, Sun, 
  Zap, Crown, Box, ShieldCheck, Activity, IndianRupee, Star, 
  Bell, Info, AlertTriangle, CheckCircle, Check, X, CheckCheck, 
  Globe, CloudSun, Download, ChefHat, Wallet, FileBarChart
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getDashboardData, markNotificationRead } from "@/app/actions/dashboard";
import { useRouter } from "next/navigation";
import NepaliDate from 'nepali-date-converter'; 
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

// --- 0. NEPALI UTILS ---
const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
const nepaliMonths = ["बैशाख", "जेष्ठ", "अषाढ", "श्रावण", "भाद्र", "आश्विन", "कार्तिक", "मंसिर", "पुष", "माघ", "फाल्गुन", "चैत्र"];

function toNepaliDigits(num: number | string): string {
    return num.toString().split('').map(c => nepaliDigits[parseInt(c)] || c).join('');
}

const formatRs = (amount: number) => {
    return "Rs " + new Intl.NumberFormat('en-NP', { maximumFractionDigits: 0 }).format(amount);
};

// --- 1. PREMIUM DATE CARD ---
function PremiumDateCard() {
    const [dateInfo, setDateInfo] = useState({ nepali: "", english: "" });

    useEffect(() => {
        const now = new Date();
        const nep = new NepaliDate(now);
        setDateInfo({
            nepali: `${nepaliMonths[nep.getMonth()]} ${toNepaliDigits(nep.getDate())}, ${toNepaliDigits(nep.getYear())}`,
            english: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        });
    }, []);

    if (!dateInfo.nepali) return <div className="w-48 h-14 bg-slate-100/50 rounded-[1.5rem] animate-pulse" />;

    return (
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-4 bg-white pl-2 pr-6 py-2 rounded-[1.5rem] border border-emerald-100/50 shadow-sm hover:shadow-md transition-all cursor-default group min-w-[240px]">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl flex flex-col items-center justify-center text-emerald-700 border border-emerald-200/50 shadow-inner group-hover:scale-105 transition-transform">
                <Calendar className="w-5 h-5 mb-0.5" />
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-0.5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> {dateInfo.english}
                </span>
                <h2 className="text-lg font-black text-slate-900 leading-none tracking-tight">{dateInfo.nepali}</h2>
            </div>
        </motion.div>
    )
}

// --- 2. SYSTEM LOADER ---
function SystemLoader() {
    return (
        <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }} className="fixed inset-0 bg-[#F8FAFC] z-[100] flex flex-col items-center justify-center">
            <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="absolute inset-0 border-[3px] border-slate-200 rounded-full border-t-emerald-600" />
                <motion.div animate={{ rotate: -360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="absolute inset-3 border-[3px] border-slate-200 rounded-full border-b-slate-900" />
                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-xl shadow-emerald-200">G</motion.div>
            </div>
            <p className="text-emerald-800/60 text-[10px] font-bold uppercase tracking-widest animate-pulse">Initializing Command...</p>
        </motion.div>
    )
}

// --- 3. NOTIFICATION CENTER ---
function NotificationCenter({ notifications }: { notifications: any[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [localNotifs, setLocalNotifs] = useState(notifications || []);
    const unreadCount = localNotifs.filter((n: any) => !n.is_read).length;
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleRead = async (id: string) => {
        setLocalNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        await markNotificationRead(id);
    };

    const handleMarkAllRead = () => {
        setLocalNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
        localNotifs.forEach(n => { if (!n.is_read) markNotificationRead(n.id) });
    };

    return (
        <div className="relative z-50" ref={containerRef}>
            <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)} 
                className={`relative w-14 h-14 flex items-center justify-center bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-lg transition-all ${isOpen ? 'ring-2 ring-emerald-100 bg-slate-50' : ''}`}
            >
                <Bell className={`w-6 h-6 ${unreadCount > 0 ? 'text-slate-900 fill-slate-900' : 'text-slate-400'}`} />
                {unreadCount > 0 && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-3.5 right-3.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white shadow-sm" />
                )}
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95, filter: "blur(10px)" }} 
                        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }} 
                        exit={{ opacity: 0, y: 10, scale: 0.95, filter: "blur(10px)" }}
                        style={{ transformOrigin: "top right" }}
                        className="absolute top-16 right-0 w-[380px] bg-white/95 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-white/20 z-50 overflow-hidden ring-1 ring-black/5"
                    >
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white/50">
                            <div className="flex items-center gap-2">
                                <h3 className="font-black text-slate-900 text-xs uppercase tracking-wide">Notifications</h3>
                                <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
                            </div>
                            {unreadCount > 0 && (
                                <button onClick={handleMarkAllRead} className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full transition-colors flex items-center gap-1 active:scale-95">
                                    <CheckCheck className="w-3 h-3" /> Clear
                                </button>
                            )}
                        </div>
                        <div className="max-h-[350px] overflow-y-auto custom-scrollbar p-2">
                            {localNotifs.length === 0 ? (
                                <div className="p-8 flex flex-col items-center justify-center text-center">
                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3"><Bell className="w-6 h-6 text-slate-200" /></div>
                                    <p className="text-slate-400 text-xs font-bold">No new alerts</p>
                                </div>
                            ) : (
                                localNotifs.map((n: any) => (
                                    <motion.div 
                                        layout key={n.id} onClick={() => handleRead(n.id)}
                                        className={`p-3 mb-1 rounded-2xl cursor-pointer transition-all border border-transparent ${n.is_read ? 'opacity-60 hover:bg-slate-50' : 'bg-white shadow-sm border-slate-100 hover:border-emerald-100'}`}
                                    >
                                        <div className="flex gap-3 items-start">
                                            <div className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs ${n.type === 'alert' ? 'bg-red-50 text-red-600' : n.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                                {n.type === 'alert' ? <AlertTriangle className="w-4 h-4" /> : n.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-xs font-bold text-slate-900 truncate">{n.title}</h4>
                                                <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                                                <p className="text-[9px] text-slate-300 font-bold mt-1.5 flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{new Date(n.created_at).toLocaleDateString()}</p>
                                            </div>
                                            {!n.is_read && <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 shadow-sm shadow-emerald-200" />}
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// --- 4. PLAN BADGE ---
function PlanBadge({ plan }: { plan: string }) {
    const p = plan?.toLowerCase() || "starter";
    let containerClass = "bg-white border-slate-100";
    let iconClass = "bg-slate-100 text-slate-500";
    let Icon = Box;
    let label = "Starter";

    if (p === 'business') {
        containerClass = "bg-slate-900 border-slate-800 text-white shadow-xl shadow-slate-900/20";
        iconClass = "bg-white/10 text-emerald-400";
        Icon = Crown;
        label = "Elite";
    } else if (p === 'standard') {
        containerClass = "bg-emerald-50 border-emerald-100 text-emerald-900";
        iconClass = "bg-white text-emerald-600";
        Icon = Zap;
        label = "Standard";
    }

    return (
        <motion.div 
            initial={{ scale: 0.9 }} 
            animate={{ scale: 1 }} 
            className={`hidden md:flex items-center gap-3 pl-2 pr-5 py-2 rounded-[1.5rem] border ${containerClass} min-w-[160px] h-14 shrink-0 transition-all hover:-translate-y-0.5`}
        >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconClass}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="flex flex-col justify-center">
                <p className={`text-[9px] font-bold uppercase tracking-widest opacity-60 mb-0.5 leading-none`}>Plan</p>
                <div className="flex items-center gap-1.5">
                    <p className="text-sm font-black tracking-tight leading-none">{label}</p>
                    {p === 'business' && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 animate-pulse" />}
                </div>
            </div>
        </motion.div>
    )
}

// --- 5. PREMIUM METRIC CARD ---
function MetricCard({ title, value, trend, icon: Icon, color, delay }: any) {
    const hasTrend = trend !== 0;
    const isPositive = trend > 0;
    
    const themeMap: Record<string, string> = {
        emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
        blue: "text-blue-600 bg-blue-50 border-blue-100",
        amber: "text-amber-600 bg-amber-50 border-amber-100",
        violet: "text-violet-600 bg-violet-50 border-violet-100",
        red: "text-red-600 bg-red-50 border-red-100"
    };

    const theme = themeMap[color] || "text-slate-600 bg-slate-50 border-slate-100";
    
    // Premium Currency Alignment Logic
    const isCurrency = typeof value === 'string' && value.startsWith('Rs');
    const valString = isCurrency ? value.replace('Rs ', '') : value;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: delay, duration: 0.4 }} 
            className="bg-white p-6 rounded-[2.2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden group h-full transform-gpu"
        >
            <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full blur-3xl opacity-20 bg-${color}-400 transition-transform group-hover:scale-150 pointer-events-none`} />
            
            <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start mb-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${theme}`}>
                        <Icon className="w-7 h-7" />
                    </div>
                    {hasTrend ? (
                        <div className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-full backdrop-blur-sm border ${isPositive ? 'bg-emerald-50/80 text-emerald-700 border-emerald-100' : 'bg-red-50/80 text-red-700 border-red-100'}`}>
                            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {Math.abs(trend)}%
                        </div>
                    ) : (
                        <div className="px-2.5 py-1 bg-slate-50 text-slate-400 rounded-full text-[10px] font-bold border border-slate-100">-</div>
                    )}
                </div>
                <div>
                    <div className="flex items-baseline gap-1.5 mb-1">
                        {isCurrency && <span className={`text-sm font-black opacity-70 ${theme.split(' ')[0]}`}>Rs</span>}
                        <h3 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tighter leading-none">{valString}</h3>
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
                </div>
            </div>
        </motion.div>
    )
}

export default function AdminDashboard() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [greeting, setGreeting] = useState("");
    const router = useRouter();

    useEffect(() => {
        const hour = new Date().getHours();
        setGreeting(hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening");
        async function init() {
            const dashboardData = await getDashboardData();
            if(!dashboardData) { router.push("/login"); return; }
            setTimeout(() => { setData(dashboardData); setLoading(false); }, 800);
        }
        init();
    }, []);

    // CSV EXPORT LOGIC
    const handleExportCSV = () => {
        if (!data || !data.recentOrders) return;
        const headers = ["Order ID", "Date (BS)", "Date (AD)", "Total (Rs)", "Status"];
        const rows = data.recentOrders.map((o: any) => {
            let bsDate = "";
            try { bsDate = new NepaliDate(new Date(o.created_at)).format("YYYY-MM-DD"); } catch (e) { bsDate = "-"; }
            return [o.id, bsDate, new Date(o.created_at).toLocaleDateString(), o.total_amount, o.status];
        });
        const csvContent = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Gecko_Export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex min-h-screen bg-[#F8FAFC] font-sans selection:bg-emerald-500 selection:text-white">
            <AnimatePresence>{loading && <SystemLoader />}</AnimatePresence>
            {!loading && data && (
                <>
                    <Sidebar tenantName={data.tenant?.name} tenantCode={data.tenant?.code || "---"} logo={data.tenant?.logo_url} />
                    <main className="flex-1 p-4 lg:p-8 overflow-y-auto pb-24 md:pb-8 custom-scrollbar">
                        
                        {/* --- HEADER SECTION --- */}
                        <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 mb-10">
                            <div className="w-full xl:w-auto overflow-hidden">
                                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-emerald-600 font-bold text-xs mb-1 uppercase tracking-wider">
                                    <CloudSun className="w-4 h-4" /> {greeting}, Executive
                                </motion.div>
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex items-center gap-4">
                                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter whitespace-nowrap overflow-hidden text-ellipsis max-w-[85vw] xl:max-w-[600px]">
                                        {data.tenant?.name || "Dashboard"}
                                    </h1>
                                    <span className="flex-shrink-0 px-3 py-1 bg-slate-900 text-white rounded-lg font-bold text-[10px] uppercase tracking-wide whitespace-nowrap shadow-lg shadow-slate-900/20">
                                        ID: {data.tenant?.code || "---"}
                                    </span>
                                </motion.div>
                            </div>
                            
                            <div className="w-full xl:w-auto flex flex-row items-center justify-between gap-4">
                                <PremiumDateCard />
                                <div className="flex items-center gap-3 shrink-0">
                                    <PlanBadge plan={data.stats.currentPlan} />
                                    <NotificationCenter notifications={data.stats.notifications} />
                                </div>
                            </div>
                        </header>

                        {/* --- METRICS GRID --- */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                            <MetricCard title="Real Revenue" value={formatRs(data.stats.revenue.value)} trend={data.stats.revenue.trend} icon={IndianRupee} color="emerald" delay={0.2} />
                            <MetricCard title="Total Orders" value={data.stats.orders.value} trend={data.stats.orders.trend} icon={ShoppingBag} color="blue" delay={0.3} />
                            <MetricCard title="Kitchen Active" value={`${data.stats.active} Orders`} trend={0} icon={ChefHat} color="amber" delay={0.4} />
                            <MetricCard title="Avg Ticket" value={formatRs(data.stats.avgTicket.value)} trend={data.stats.avgTicket.trend} icon={CreditCard} color="violet" delay={0.5} />
                        </div>

                        {/* --- FEED & MOVERS --- */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            
                            {/* Live Feed Column */}
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
                                <div className="flex justify-between items-center mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-600 shadow-inner">
                                            <Activity className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900 leading-none">Live Monitor</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Real-time transactions</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleExportCSV} 
                                        disabled={data.recentOrders.length === 0}
                                        className="h-10 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xl shadow-slate-900/10 active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Download className="w-4 h-4" /> Export CSV
                                    </button>
                                </div>
                                
                                {data.recentOrders.length === 0 ? (
                                    <div className="h-64 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/30">
                                        <ShoppingBag className="w-12 h-12 mb-3 opacity-20" />
                                        <p className="font-bold text-sm">Floor is quiet today.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {data.recentOrders.map((order: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between p-4 hover:bg-emerald-50/40 rounded-2xl transition-all cursor-default group border border-transparent hover:border-emerald-100/50">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 font-black text-xs shadow-sm group-hover:bg-white group-hover:text-emerald-600 group-hover:shadow-md transition-all">
                                                        #{order.id.toString().slice(0,4)}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-900 text-sm group-hover:text-emerald-900 transition-colors">
                                                            {order.items?.length || 0} Items Ordered
                                                        </h4>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-0.5 flex items-center gap-1.5">
                                                            <Clock className="w-3 h-3" /> {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
                                                            <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                                            <span className={order.status === 'paid' ? 'text-emerald-500' : 'text-amber-500'}>{order.status}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="font-black text-slate-900 text-sm group-hover:text-emerald-700 bg-slate-50 px-3 py-1.5 rounded-xl group-hover:bg-white group-hover:shadow-sm transition-all">
                                                    {formatRs(order.total_amount)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>

                            {/* Top Items Column (Dark Mode Card) */}
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden flex flex-col justify-between min-h-[400px] shadow-2xl shadow-slate-900/20">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/20 rounded-full blur-[80px] pointer-events-none" />
                                <div>
                                    <div className="flex items-center justify-between mb-8 relative z-10">
                                        <h3 className="text-xl font-black tracking-tight">Top Movers</h3>
                                        <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md"><Crown className="w-5 h-5 text-yellow-400 fill-yellow-400" /></div>
                                    </div>
                                    <div className="space-y-5 relative z-10">
                                        {data.stats.topItems.length === 0 ? (
                                            <p className="text-slate-500 text-sm font-bold text-center py-10">No sales data yet.</p>
                                        ) : (
                                            data.stats.topItems.map((item: any, i: number) => (
                                                <div key={i} className="flex items-center justify-between group">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-black text-xs text-emerald-400 border border-white/5 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                                            0{i+1}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm text-slate-100 group-hover:text-white transition-colors">{item.name}</p>
                                                            <div className="h-1 w-12 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                                                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${100 - (i * 20)}%` }} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-black text-sm text-white">{item.count}</p>
                                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Sold</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                                
                                <div className="mt-8 pt-6 border-t border-white/10 relative z-10">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">System Status</p>
                                            <div className="flex items-center gap-2">
                                                <span className="relative flex h-2.5 w-2.5">
                                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                                </span>
                                                <span className="font-bold text-xs text-emerald-400">All Systems Online</span>
                                            </div>
                                        </div>
                                        <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                                            <Globe className="w-5 h-5 text-slate-400" />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </main>
                </>
            )}
        </div>
    )
}