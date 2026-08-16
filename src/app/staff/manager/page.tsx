"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/app/staff/manager/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, Users, ShoppingBag, Clock, 
  ArrowUpRight, ArrowDownRight, Calendar, CreditCard, 
  Box, ShieldCheck, Activity, IndianRupee, Star, 
  Bell, Check, X, 
  Globe, CloudSun, ChefHat, Map, Utensils, Wallet, FileBarChart,
  TrendingDown, RefreshCcw, Leaf, LogOut
} from "lucide-react";
import { getManagerDashboard } from "@/app/actions/manager"; 
import { logoutStaff } from "@/app/actions/staff-auth"; 
import { useRouter } from "next/navigation";
import NepaliDate from 'nepali-date-converter'; 
import { toast } from "sonner";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

// --- 0. NEPALI UTILS ---
const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
const nepaliMonths = ["बैशाख", "जेष्ठ", "अषाढ", "श्रावण", "भाद्र", "आश्विन", "कार्तिक", "मंसिर", "पुष", "माघ", "फाल्गुन", "चैत्र"];
const nepaliDays = ["आइतबार", "सोमबार", "मंगलबार", "बुधबार", "बिहीबार", "शुक्रबार", "शनिबार"];

function toNepaliDigits(num: number | string): string {
    return num.toString().split('').map(c => nepaliDigits[parseInt(c)] || c).join('');
}

const formatRs = (amount: number) => {
    return "Rs " + new Intl.NumberFormat('en-NP', { maximumFractionDigits: 0 }).format(amount || 0);
};

// --- 1. SYSTEM LOADER ---
function SystemLoader() {
    return (
        <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }} className="fixed inset-0 bg-[#F8FAFC] z-[100] flex flex-col items-center justify-center">
            <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="absolute inset-0 border-[3px] border-slate-200 rounded-full border-t-emerald-600" />
                <motion.div animate={{ rotate: -360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="absolute inset-3 border-[3px] border-slate-200 rounded-full border-b-slate-900" />
                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-xl shadow-emerald-200">G</motion.div>
            </div>
            <p className="text-emerald-800/60 text-[10px] font-bold uppercase tracking-widest animate-pulse">Loading Live Dashboard...</p>
        </motion.div>
    )
}

// --- 2. PREMIUM DATE CARD ---
function PremiumDateCard({ businessDate }: { businessDate?: string }) {
    const [dateInfo, setDateInfo] = useState({ nepali: "", english: "" });

    useEffect(() => {
        let bizStr = businessDate;
        if (!bizStr) {
            const date = new Date();
            const parts = new Intl.DateTimeFormat('en-US', {
                timeZone: 'Asia/Kathmandu',
                hour: '2-digit',
                hour12: false,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).formatToParts(date);
            const year = parts.find(p => p.type === 'year')?.value;
            const month = parts.find(p => p.type === 'month')?.value;
            const day = parts.find(p => p.type === 'day')?.value;
            const hourStr = parts.find(p => p.type === 'hour')?.value || "0";
            const hour = parseInt(hourStr, 10);
            if (!isNaN(hour) && (hour < 5 || hour === 24)) {
                const yesterday = new Date(date.getTime() - 24 * 60 * 60 * 1000);
                const yParts = new Intl.DateTimeFormat('en-US', {
                    timeZone: 'Asia/Kathmandu',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }).formatToParts(yesterday);
                const yYear = yParts.find(p => p.type === 'year')?.value;
                const yMonth = yParts.find(p => p.type === 'month')?.value;
                const yDay = yParts.find(p => p.type === 'day')?.value;
                bizStr = `${yYear}-${yMonth}-${yDay}`;
            } else {
                bizStr = `${year}-${month}-${day}`;
            }
        }
        
        try {
            const [y, m, d] = bizStr.split('-').map(Number);
            const localDate = new Date(y, m - 1, d);
            const nep = new NepaliDate(localDate);
            const nepYear = toNepaliDigits(nep.getYear());
            const nepDay = toNepaliDigits(nep.getDate());
            const nepMonthStr = nepaliMonths[nep.getMonth()];
            const nepWeekDayStr = nepaliDays[nep.getDay()];

            setDateInfo({
                nepali: `${nepMonthStr} ${nepDay}, ${nepYear} ${nepWeekDayStr}`,
                english: localDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            });
        } catch (e) {
            console.error(e);
        }
    }, [businessDate]);

    if (!dateInfo.nepali) return <div className="w-56 h-16 bg-slate-100/50 rounded-[1.5rem] animate-pulse" />;

    return (
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-4 bg-white/70 backdrop-blur-xl pl-2 pr-6 py-2 rounded-[1.5rem] border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-md hover:bg-white/95 transition-all cursor-default group min-w-[280px]">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/10 to-emerald-500/20 text-emerald-600 border border-emerald-500/20 rounded-2xl flex flex-col items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
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

// --- 3. PREMIUM METRIC CARD (Fixed Rs Alignment) ---
function MetricCard({ title, value, trend, icon: Icon, color, delay }: any) {
    const hasTrend = trend !== 0;
    const isPositive = trend >= 0;
    
    const glowBgMap: Record<string, string> = {
        emerald: "bg-emerald-400/20",
        blue: "bg-blue-400/20",
        amber: "bg-amber-400/20",
        violet: "bg-violet-400/20",
        red: "bg-red-400/20",
        orange: "bg-orange-400/20"
    };
    const glowBg = glowBgMap[color] || "bg-slate-400/10";

    const iconGlowMap: Record<string, string> = {
        emerald: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/25 group-hover:bg-emerald-500 group-hover:text-white group-hover:shadow-[0_8px_20px_-6px_rgba(16,185,129,0.4)]",
        blue: "bg-blue-500/10 text-blue-600 border border-blue-500/25 group-hover:bg-blue-500 group-hover:text-white group-hover:shadow-[0_8px_20px_-6px_rgba(59,130,246,0.4)]",
        amber: "bg-amber-500/10 text-amber-600 border border-amber-500/25 group-hover:bg-amber-500 group-hover:text-white group-hover:shadow-[0_8px_20px_-6px_rgba(245,158,11,0.4)]",
        violet: "bg-violet-500/10 text-violet-600 border border-violet-500/25 group-hover:bg-violet-500 group-hover:text-white group-hover:shadow-[0_8px_20px_-6px_rgba(139,92,246,0.4)]",
        red: "bg-red-500/10 text-red-600 border border-red-500/25 group-hover:bg-red-500 group-hover:text-white group-hover:shadow-[0_8px_20px_-6px_rgba(239,68,68,0.4)]",
        orange: "bg-orange-500/10 text-orange-600 border border-orange-500/25 group-hover:bg-orange-500 group-hover:text-white group-hover:shadow-[0_8px_20px_-6px_rgba(249,115,22,0.4)]"
    };
    const iconGlow = iconGlowMap[color] || "bg-slate-500/10 text-slate-600 border border-slate-500/20";
    
    // Premium Currency Alignment Logic
    const isCurrency = typeof value === 'string' && value.startsWith('Rs');
    const valString = isCurrency ? value.replace('Rs ', '') : value;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: delay, duration: 0.4 }} 
            className="bg-white/70 backdrop-blur-xl p-5 md:p-6 rounded-[2.2rem] border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.04)] hover:bg-white/90 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group h-full transform-gpu"
        >
            <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full blur-2xl transition-transform group-hover:scale-150 ${glowBg} pointer-events-none`} />
            
            <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start mb-6">
                    <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shadow-inner transition-all duration-300 ${iconGlow}`}>
                        <Icon className="w-6 h-6 md:w-7 md:h-7" />
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
                        {isCurrency && <span className={`text-sm font-black opacity-70 ${color === 'emerald' ? 'text-emerald-600' : color === 'blue' ? 'text-blue-600' : color === 'orange' ? 'text-orange-600' : 'text-slate-600'}`}>Rs</span>}
                        <h3 className="text-3xl lg:text-4xl font-black bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 bg-clip-text text-transparent tracking-tighter leading-none">{valString}</h3>
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
                </div>
            </div>
        </motion.div>
    )
}

// --- 4. ACTION CARD ---
function ActionCard({ title, desc, icon: Icon, onClick, delay }: any) {
    return (
        <motion.button 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay }}
            onClick={onClick}
            className="flex flex-col items-center justify-center text-center bg-white/60 backdrop-blur-xl p-6 rounded-[2rem] border border-white/50 shadow-sm hover:shadow-[0_15px_30px_rgba(0,0,0,0.03)] hover:bg-white/95 hover:border-emerald-200/60 hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden h-40 w-full"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-emerald-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200/50 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:from-emerald-500 group-hover:to-teal-500 group-hover:text-white group-hover:shadow-[0_8px_20px_-6px_rgba(16,185,129,0.3)] transition-all relative z-10 shadow-inner">
                <Icon className="w-7 h-7 text-slate-600 group-hover:text-white transition-colors" />
            </div>
            <h3 className="font-black text-slate-900 text-sm relative z-10 group-hover:text-emerald-700 transition-colors">{title}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1 relative z-10">{desc}</p>
        </motion.button>
    )
}

// --- 5. MAIN PAGE COMPONENT ---
export default function ManagerPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [greeting, setGreeting] = useState("");
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();

    async function loadData() {
        setRefreshing(true);
        try {
            const dashboardData: any = await getManagerDashboard(); 
            if(!dashboardData) { router.push("/staff/login"); return; }
            
            setData(dashboardData);
        } catch (e) {
            console.error("Dashboard Load Error", e);
            toast.error("Failed to load dashboard data");
        }
        setRefreshing(false);
        setLoading(false);
    }

    const handleLogout = () => {
        toast.custom((t) => (
            <div className="bg-white p-5 rounded-[1.5rem] shadow-2xl border border-slate-100 flex flex-col gap-4 w-full sm:w-[320px] pointer-events-auto">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center shrink-0">
                        <LogOut className="w-5 h-5 ml-1" />
                    </div>
                    <div className="pt-0.5">
                        <h4 className="font-black text-slate-900 text-sm tracking-tight">End Shift?</h4>
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

    useEffect(() => {
        const hour = new Date().getHours();
        setGreeting(hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening");
        loadData();
    }, []);

    // --- SAFE ACCESSORS ---
    const recentActivity = data?.recentActivity || [];
    const stats = data?.stats || { 
        revenue: 0, 
        expenses: 0, 
        profit: 0, 
        margin: 0,
        orders: 0, 
        totalOrders: 0, 
        staffOnline: 0, 
        lowStock: 0, 
        pendingKitchen: 0, 
        occupancy: 0
    };
    const chartData = data?.chartData || [];

    return (
        <div className="flex min-h-screen bg-[#F8FAFC] font-sans selection:bg-emerald-500 selection:text-white relative overflow-hidden">
            <AnimatePresence>{loading && <SystemLoader />}</AnimatePresence>
            {!loading && data && (
                <>
                    {/* Ambient Premium Glows */}
                    <div className="absolute top-[-10%] right-[10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-emerald-400/10 to-teal-300/5 blur-[120px] pointer-events-none z-0" />
                    <div className="absolute bottom-[20%] left-[20%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-blue-400/5 to-indigo-300/10 blur-[150px] pointer-events-none z-0" />
                    <Sidebar tenantName={data.tenant?.name} tenantCode={data.tenant?.code} logo={data.tenant?.logo_url} />
                    
                    {/* PB-[140px] ensures scrolling perfectly clears BOTH bottom nav bars */}
                    <main className="flex-1 p-4 lg:p-8 overflow-y-auto pb-[140px] md:pb-8 relative custom-scrollbar">
                        
                        {/* HEADER */}
                        <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 mb-10">
                            <div>
                                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-emerald-600 font-bold text-xs mb-1 uppercase tracking-wider">
                                    <CloudSun className="w-4 h-4" /> {greeting}, Manager
                                </motion.div>
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex items-center gap-4">
                                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter whitespace-nowrap overflow-hidden text-ellipsis max-w-[70vw]">
                                        Operations Hub
                                    </h1>
                                    <button onClick={loadData} className={`hidden md:block p-2 rounded-xl bg-white border border-emerald-100 text-emerald-600 hover:bg-emerald-50 transition-all ${refreshing ? 'animate-spin' : ''}`}>
                                        <RefreshCcw className="w-4 h-4" />
                                    </button>
                                </motion.div>
                            </div>
                            <div className="flex items-center gap-4 shrink-0 w-full xl:w-auto">
                                <PremiumDateCard businessDate={data?.businessDate} />
                            </div>
                        </header>

                        {/* FINANCIAL OVERVIEW */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 relative z-10">
                            
                            {/* Revenue */}
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-gradient-to-br from-slate-950 via-emerald-950 to-emerald-900 border border-emerald-500/20 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-emerald-900/30 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none group-hover:scale-150 transition-transform duration-700" />
                                <div className="relative z-10 flex flex-col h-full justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="flex items-center gap-2 text-emerald-350 text-xs font-bold uppercase tracking-widest"><span className="text-[1.1rem] font-bold text-emerald-400 leading-none">रु</span> Revenue</span>
                                            <span className="px-2 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 text-emerald-450">
                                                <TrendingUp className="w-3 h-3 text-emerald-400" /> Today
                                            </span>
                                        </div>
                                        <div className="flex items-baseline gap-1.5 mt-1">
                                            <span className="text-xl font-black text-emerald-400/80">Rs</span>
                                            <h2 className="text-4xl lg:text-5xl font-black tracking-tight bg-gradient-to-r from-white to-emerald-100 bg-clip-text text-transparent">{new Intl.NumberFormat('en-NP', { maximumFractionDigits: 0 }).format(stats.revenue)}</h2>
                                        </div>
                                    </div>
                                    <div className="h-12 w-full mt-4 opacity-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData}>
                                                <defs>
                                                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.4}/>
                                                        <stop offset="100%" stopColor="#10B981" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <Area type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2.5} fill="url(#chartGradient)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Expenses */}
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
                                <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full blur-2xl transition-transform group-hover:scale-150 opacity-20 bg-orange-400 pointer-events-none" />
                                <div className="flex justify-between items-start h-full relative z-10">
                                    <div className="flex flex-col justify-between h-full">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2 text-slate-405 text-xs font-bold uppercase tracking-widest"><TrendingDown className="w-4 h-4 text-orange-500" /> Expenses</div>
                                            <div className="flex items-baseline gap-1.5 mt-1">
                                                <span className="text-sm font-black text-orange-500">Rs</span>
                                                <h2 className="text-3xl font-black bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 bg-clip-text text-transparent tracking-tight">{new Intl.NumberFormat('en-NP', { maximumFractionDigits: 0 }).format(stats.expenses)}</h2>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                                            <span className="w-2 h-2 rounded-full bg-orange-400" /> Real-time Cost
                                        </div>
                                    </div>
                                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-600 border border-orange-500/25 flex items-center justify-center shadow-inner group-hover:bg-orange-500 group-hover:text-white transition-all"><Wallet className="w-6 h-6" /></div>
                                </div>
                            </motion.div>

                            {/* Net Profit */}
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
                                <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full blur-2xl transition-transform group-hover:scale-150 opacity-20 bg-emerald-450 pointer-events-none" />
                                <div className="flex justify-between items-start h-full relative z-10">
                                    <div className="flex flex-col justify-between h-full">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2 text-emerald-600 text-xs font-bold uppercase tracking-widest"><Leaf className="w-4 h-4" /> Net Profit</div>
                                            <div className="flex items-baseline gap-1.5 mt-1">
                                                <span className="text-sm font-black text-emerald-600">Rs</span>
                                                <h2 className="text-3xl font-black bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 bg-clip-text text-transparent tracking-tight">{new Intl.NumberFormat('en-NP', { maximumFractionDigits: 0 }).format(stats.profit)}</h2>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> {stats.margin}% Margin
                                        </div>
                                    </div>
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/25 flex items-center justify-center shadow-inner group-hover:bg-emerald-500 group-hover:text-white transition-all"><FileBarChart className="w-6 h-6" /></div>
                                </div>
                            </motion.div>
                        </div>

                        {/* METRICS & ACTIONS */}
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 mb-10">
                            <MetricCard title="Active Orders" value={stats.orders} trend={0} icon={ShoppingBag} color="blue" delay={0.5} />
                            <MetricCard title="Total Today" value={stats.totalOrders} trend={0} icon={Map} color="emerald" delay={0.55} />
                            <MetricCard title="Staff Active" value={stats.staffOnline} trend={0} icon={Users} color="orange" delay={0.6} />
                        </div>

                        <div className="mb-10">
                            <h3 className="text-lg font-black text-slate-900 mb-5 px-2">Quick Actions</h3>
                            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                                <ActionCard title="Floor Layout" desc="Edit Tables" icon={Map} onClick={() => router.push('/staff/manager/floor')} delay={0.7} />
                                <ActionCard title="Staff Mgmt" desc="Manage Staff" icon={Users} onClick={() => router.push('/staff/manager/staff')} delay={0.75} />
                                <ActionCard title="Inventory" desc="Supplies" icon={Box} onClick={() => router.push('/staff/manager/inventory')} delay={0.8} />
                                <ActionCard title="Menu Items" desc="Update Prices" icon={Utensils} onClick={() => router.push('/staff/manager/menu')} delay={0.85} />
                                <ActionCard title="Specials" desc="Manage Offers" icon={Star} onClick={() => router.push('/staff/manager/specials')} delay={0.9} />
                                <ActionCard title="Reports" desc="Analytics" icon={FileBarChart} onClick={() => router.push('/staff/manager/reports')} delay={0.95} />
                            </div>
                        </div>

                        {/* Recent Activity Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="lg:col-span-2 bg-white/70 backdrop-blur-xl border border-white/80 p-6 md:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.015)] rounded-[2.5rem]">
                                <div className="flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-gradient-to-br from-emerald-500/10 to-emerald-500/20 text-emerald-600 border border-emerald-500/25 rounded-xl shadow-inner"><Activity className="w-5 h-5 text-emerald-600 animate-pulse" /></div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900">Recent Activity</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Feed from Floor</p>
                                        </div>
                                    </div>
                                    <button onClick={() => router.push('/staff/manager/floor')} className="text-xs font-bold bg-white border border-slate-200 hover:border-emerald-200 hover:text-emerald-700 px-4 py-2 rounded-xl transition-colors text-slate-500 shadow-sm hidden sm:block">View Floor</button>
                                </div>
                                <div className="space-y-3">
                                    {recentActivity.length === 0 ? (
                                        <div className="h-40 flex flex-col items-center justify-center text-slate-400 border border-slate-200/50 rounded-3xl bg-gradient-to-br from-slate-50/50 to-slate-100/30 shadow-inner group hover:scale-[1.01] transition-transform duration-300">
                                            <Bell className="w-10 h-10 mb-2 opacity-20" />
                                            <p className="font-bold text-sm">No transactions yet today</p>
                                        </div>
                                    ) : (
                                        recentActivity.map((order: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between p-4 hover:bg-emerald-50/40 rounded-2xl transition-all cursor-pointer group border border-transparent hover:border-emerald-100/50">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-slate-100/80 flex items-center justify-center text-slate-600 font-black text-xs shadow-sm group-hover:bg-white group-hover:text-emerald-700 group-hover:shadow-md transition-colors">
                                                        {order.status === 'paid' ? <Check className="w-5 h-5 text-emerald-600"/> : <Clock className="w-5 h-5 text-orange-500"/>}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-900 text-sm">{order.table_name?.startsWith('T-') ? `Table ${order.table_name}` : order.table_name || 'Order'}</h4>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {order.status}</p>
                                                    </div>
                                                </div>
                                                <span className="font-black text-slate-900 text-sm group-hover:text-emerald-700">{formatRs(order.total_amount)}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </motion.div>

                            {/* Kitchen Status */}
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 }} className="bg-slate-955 bg-slate-950 border border-slate-900/80 shadow-2xl shadow-slate-950/40 rounded-[2.5rem] p-6 md:p-8 text-white relative overflow-hidden flex flex-col justify-between min-h-[350px] group">
                                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-600/10 rounded-full blur-[80px] pointer-events-none group-hover:scale-110 transition-transform duration-700" />
                                <div>
                                    <div className="flex items-center gap-3 mb-6 relative z-10">
                                        <div className="w-10 h-10 bg-slate-900 border border-slate-805 border-slate-800/85 rounded-xl flex items-center justify-center text-emerald-400"><ChefHat className="w-5 h-5 text-emerald-400" /></div>
                                        <h3 className="text-xl font-black">Kitchen Status</h3>
                                    </div>
                                    <div className="space-y-4 relative z-10">
                                        <div className="flex justify-between items-center p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800/80 backdrop-blur-sm">
                                            <span className="text-sm font-bold text-slate-300">Pending Orders</span>
                                            <span className="text-xl font-black text-white">{stats.pendingKitchen || 0}</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800/80 backdrop-blur-sm">
                                            <span className="text-sm font-bold text-slate-300">Occupancy</span>
                                            <span className="text-xl font-black text-white">{stats.occupancy || 0} Tbls</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-8 pt-6 border-t border-white/10 relative z-10">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Staff Online</p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-10 h-10 rounded-full border border-slate-800 bg-emerald-650 bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold shadow-lg">{stats.staffOnline}</div>
                                        <span className="text-xs font-bold text-slate-400">Active Members</span>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </main>

                    {/* REDESIGNED PREMIUM MOBILE DOCK */}
                    <motion.div 
                        initial={{ y: 100, opacity: 0 }} 
                        animate={{ y: 0, opacity: 1 }} 
                        transition={{ delay: 1.2, type: "spring", stiffness: 200, damping: 20 }}
                        className="md:hidden fixed bottom-[85px] left-0 right-0 mx-auto w-[90%] max-w-[320px] z-[100] bg-white/90 backdrop-blur-xl border border-white/50 shadow-[0_12px_40px_-10px_rgba(0,200,83,0.2)] rounded-full p-1.5 flex justify-between items-center"
                    >
                        <button 
                            onClick={() => router.push('/staff/manager/reports')} 
                            className="flex flex-col items-center justify-center w-[30%] h-12 rounded-full text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all group"
                        >
                            <FileBarChart className="w-[18px] h-[18px] mb-0.5 group-hover:scale-110 transition-transform" />
                            <span className="text-[8px] font-bold uppercase tracking-widest">Reports</span>
                        </button>
                        
                        <button 
                            onClick={loadData} 
                            className="flex flex-col items-center justify-center w-[40%] h-12 rounded-full text-emerald-600 bg-emerald-50 border border-emerald-100 shadow-sm hover:shadow-md transition-all relative group"
                        >
                            <RefreshCcw className={`w-[18px] h-[18px] mb-0.5 group-hover:scale-110 transition-transform ${refreshing ? 'animate-spin' : ''}`} />
                            <span className="text-[8px] font-bold uppercase tracking-widest">Reload</span>
                            {refreshing && <span className="absolute top-1 right-1/4 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />}
                        </button>

                        <button 
                            onClick={handleLogout} 
                            className="flex flex-col items-center justify-center w-[30%] h-12 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all group"
                        >
                            <LogOut className="w-[18px] h-[18px] mb-0.5 group-hover:scale-110 transition-transform" />
                            <span className="text-[8px] font-bold uppercase tracking-widest">Logout</span>
                        </button>
                    </motion.div>
                </>
            )}
        </div>
    )
}