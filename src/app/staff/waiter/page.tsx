"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/app/staff/waiter/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, Users, ShoppingBag, Clock, 
  ArrowUpRight, ArrowDownRight, Calendar, Crown, 
  Bell, ChefHat, RefreshCcw, PlusCircle, ZoomIn, ZoomOut, 
  LayoutDashboard, CloudSun, IndianRupee, Trash2, Sparkles,
  Utensils, Coffee, ArrowRight, LogOut, Ban, AlertTriangle, CheckCircle2, RotateCcw, XCircle, Home
} from "lucide-react";
import { getWaiterDashboardData, cleanTable, markOrderServed } from "@/app/actions/waiter"; 
import { getPOSStats } from "@/app/actions/pos"; 
import { getDashboardData } from "@/app/actions/dashboard";
import { logoutStaff } from "@/app/actions/staff-auth"; 
import { useRouter } from "next/navigation";
import NepaliDate from 'nepali-date-converter'; 
import { toast } from "sonner";

// --- SOUND CONSTANTS ---
const SOUND_NOTIFICATION = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

// --- UTILS ---
const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
const nepaliMonths = ["बैशाख", "जेष्ठ", "अषाढ", "श्रावण", "भाद्र", "आश्विन", "कार्तिक", "मंसिर", "पुष", "माघ", "फाल्गुन", "चैत्र"];
const nepaliDays = ["आइतबार", "सोमबार", "मंगलबार", "बुधबार", "बिहीबार", "शुक्रबार", "शनिबार"];

function toNepaliDigits(num: number | string): string {
    return num.toString().split('').map(c => nepaliDigits[parseInt(c)] || c).join('');
}

const formatRs = (amount: number) => {
    return "Rs " + new Intl.NumberFormat('en-NP', { maximumFractionDigits: 0 }).format(amount);
};

// --- COMPONENTS ---

function SystemLoader() {
    return (
        <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }} className="fixed inset-0 bg-[#F8FAFC] z-[100] flex flex-col items-center justify-center">
            <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="absolute inset-0 border-[3px] border-slate-200 rounded-full border-t-emerald-600" />
                <motion.div animate={{ rotate: -360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="absolute inset-3 border-[3px] border-slate-200 rounded-full border-b-slate-900" />
            </div>
            <p className="text-emerald-800/60 text-[10px] font-bold uppercase tracking-widest animate-pulse">Syncing Floor...</p>
        </motion.div>
    )
}

function FloatingDock({ router, dockStatus }: any) {
    // --- PREMIUM SONNER LOGOUT TOAST ---
    const handleLogout = () => {
        toast.custom((t) => (
            <div className="bg-white p-5 rounded-[1.5rem] shadow-2xl border border-slate-100 flex flex-col gap-4 w-full sm:w-[320px] pointer-events-auto">
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
                        Yes, Sign Out
                    </button>
                </div>
            </div>
        ), { duration: 8000 });
    };

    return (
        <motion.div 
            initial={{ y: 100, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="md:hidden fixed bottom-[90px] left-0 right-0 mx-auto w-[92%] max-w-[400px] z-[100] bg-white/90 backdrop-blur-2xl border border-emerald-100 shadow-[0_20px_50px_-10px_rgba(0,200,83,0.15)] rounded-full p-1.5 flex justify-between items-center"
        >
            {/* 1. Home (Active) */}
            <button onClick={() => router.push('/staff/waiter')} className="flex flex-col items-center justify-center w-[22%] h-[52px] rounded-full text-emerald-600 bg-emerald-50 shadow-sm transition-all group">
                <Home className="w-[18px] h-[18px] mb-0.5 group-hover:scale-110 transition-transform" />
                <span className="text-[8px] font-bold uppercase tracking-widest">Home</span>
            </button>
            
            {/* 2. Active Orders */}
            <button onClick={() => router.push('/staff/waiter/orders')} className="relative flex flex-col items-center justify-center w-[22%] h-[52px] rounded-full text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all group">
                <Clock className="w-[18px] h-[18px] mb-0.5 group-hover:scale-110 transition-transform" />
                <span className="text-[8px] font-bold uppercase tracking-widest">Orders</span>
                
                {/* Smart Dots */}
                {dockStatus?.hasReady && (
                    <span className="absolute top-2 right-4 flex h-2.5 w-2.5 z-10">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border border-white"></span>
                    </span>
                )}
                {dockStatus?.hasCooking && !dockStatus?.hasReady && (
                    <span className="absolute top-2 right-4 flex h-2.5 w-2.5 z-10">
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500 border border-white"></span>
                    </span>
                )}
            </button>

            {/* 3. New Order (Prominent Primary Action) */}
            <button onClick={() => router.push('/staff/waiter/new-order')} className="flex flex-col items-center justify-center w-[34%] h-[52px] rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 hover:from-emerald-400 hover:to-emerald-500 transition-all group active:scale-95 border border-emerald-400/50">
                <PlusCircle className="w-[20px] h-[20px] mb-0.5 group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-black uppercase tracking-widest drop-shadow-sm">New Order</span>
            </button>

            {/* 4. Logout */}
            <button onClick={handleLogout} className="flex flex-col items-center justify-center w-[22%] h-[52px] rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all group">
                <LogOut className="w-[18px] h-[18px] mb-0.5 group-hover:scale-110 transition-transform" />
                <span className="text-[8px] font-bold uppercase tracking-widest">Exit</span>
            </button>
        </motion.div>
    )
}

function PremiumDateCard() {
    const [dateInfo, setDateInfo] = useState({ nepali: "", english: "" });
    useEffect(() => {
        const now = new Date();
        const nep = new NepaliDate(now);
        setDateInfo({
            nepali: `${nepaliMonths[nep.getMonth()]} ${toNepaliDigits(nep.getDate())}, ${toNepaliDigits(nep.getYear())} ${nepaliDays[nep.getDay()]}`,
            english: now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        });
    }, []);
    return (
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-4 bg-white pl-2 pr-6 py-2 rounded-[1.5rem] border border-emerald-100/50 shadow-sm hover:shadow-md transition-all cursor-default group min-w-[280px]">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl flex flex-col items-center justify-center text-emerald-700 border border-emerald-200/50 shadow-inner group-hover:scale-105 transition-transform"><Calendar className="w-5 h-5 mb-0.5" /></div>
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-0.5"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> {dateInfo.english}</span>
                <h2 className="text-lg font-black text-slate-900 leading-none tracking-tight">{dateInfo.nepali}</h2>
            </div>
        </motion.div>
    )
}

function MetricCard({ title, value, trend, icon: Icon, color, delay }: any) {
    const isPositive = trend >= 0;
    const themeColor = color === 'blue' ? 'text-blue-600 bg-blue-50' : color === 'orange' ? 'text-orange-600 bg-orange-50' : color === 'red' ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50';
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delay, duration: 0.4 }} className="bg-white p-5 md:p-6 rounded-[2.2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
            <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full blur-2xl transition-transform group-hover:scale-150 opacity-20 bg-${color}-100`} />
            <div className="relative z-10 flex justify-between items-start mb-6">
                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shadow-inner ${themeColor}`}><Icon className="w-6 h-6 md:w-7 md:h-7" /></div>
            </div>
            <div className="relative z-10"><h3 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tighter mb-1">{value}</h3><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p></div>
        </motion.div>
    )
}

function UnavailableHeroCard({ items, delay }: any) {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delay, duration: 0.4 }} 
            className="bg-red-50 p-5 rounded-[2.2rem] border border-red-100 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden group flex flex-col h-full min-h-[160px]"
        >
            <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center"><Ban className="w-4 h-4 text-red-600" /></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-red-700">Unavailable ({items.length})</span>
                </div>
            </div>
            
            <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar pr-1">
                {items.length === 0 ? (
                    <div className="h-full flex items-center justify-center opacity-40">
                        <span className="text-xs font-bold text-red-400 italic">All items available</span>
                    </div>
                ) : (
                    <div className="space-y-1.5">
                        {items.map((item: any, idx: number) => (
                            <div key={idx} className="bg-white/80 px-3 py-1.5 rounded-xl border border-red-100/50 flex items-center justify-between shadow-sm">
                                <span className="text-[11px] font-bold text-red-900 truncate max-w-[70%]">{item.title}</span>
                                <span className="text-[9px] bg-red-100 text-red-600 px-1.5 rounded-md font-bold">86'd</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-red-100 blur-2xl opacity-50 pointer-events-none" />
        </motion.div>
    )
}

function ViewerTable({ data, onClick }: any) {
    const isPacked = data.status === 'occupied';
    const isToClean = data.status === 'payment' || data.status === 'dirty';
    const isReady = data.status === 'ready';
    const isFree = data.status === 'available' || data.status === 'free';
    
    let containerStyle = 'bg-white border-slate-200 text-slate-700 shadow-lg';
    let seatColor = 'bg-slate-100 border-slate-300';

    if (isPacked) { containerStyle = 'bg-gradient-to-br from-red-50 to-white border-red-200 text-red-600 shadow-xl shadow-red-500/20 ring-2 ring-red-100'; seatColor = 'bg-red-200 border-red-300'; }
    else if (isToClean) { containerStyle = 'bg-gradient-to-br from-amber-50 to-white border-amber-200 text-amber-600 shadow-xl shadow-amber-500/20 ring-2 ring-amber-100 animate-pulse'; seatColor = 'bg-amber-200 border-amber-300'; }
    else if (isReady) { containerStyle = 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400 text-white shadow-2xl shadow-emerald-500/40 ring-4 ring-emerald-300/50 animate-pulse scale-105 z-20'; seatColor = 'bg-emerald-400 border-emerald-300'; }
    else { containerStyle = 'bg-white border-2 border-slate-200/60 text-slate-700 shadow-md hover:border-emerald-400 hover:shadow-emerald-500/20 hover:-translate-y-1 transition-all duration-300'; }

    const renderSeats = () => {
        const seats = [];
        const count = data.seats || 2;
        const w = data.width;
        const h = data.height;
        const chairDist = 18; 
        if (data.shape === 'round') {
            const radius = Math.max(w, h) / 2;
            for (let i = 0; i < count; i++) {
                const angle = (i * 360) / count;
                const rad = (angle - 90) * (Math.PI / 180);
                const x = (w/2) + (radius + chairDist) * Math.cos(rad);
                const y = (h/2) + (radius + chairDist) * Math.sin(rad);
                seats.push({ x, y, rot: angle });
            }
        } else {
            const perimeter = 2 * w + 2 * h;
            const segment = perimeter / count;
            for (let i = 0; i < count; i++) {
                let d = (i * segment) + (segment / 2);
                d = d % perimeter;
                let x = 0, y = 0, rot = 0;
                if (d < w) { x = d; y = -chairDist; rot = 0; } 
                else if (d < w + h) { x = w + chairDist; y = d - w; rot = 90; } 
                else if (d < 2 * w + h) { x = w - (d - (w + h)); y = h + chairDist; rot = 180; } 
                else { x = -chairDist; y = h - (d - (2 * w + h)); rot = 270; }
                const buffer = 22;
                if(rot === 0 || rot === 180) { x = Math.max(buffer, Math.min(x, w - buffer)); }
                if(rot === 90 || rot === 270) { y = Math.max(buffer, Math.min(y, h - buffer)); }
                seats.push({ x, y, rot });
            }
        }
        return seats.map((s, i) => (
            <div key={i} className="absolute w-10 h-10 flex items-center justify-center pointer-events-none transition-all duration-500" style={{ left: s.x - 20, top: s.y - 20, transform: `rotate(${s.rot}deg)` }}>
                <div className={`relative w-9 h-8 transition-colors duration-500 ${isFree ? 'opacity-40' : 'opacity-100'}`}>
                    <div className={`absolute top-0 left-0 w-full h-3 rounded-full border shadow-sm transition-colors duration-500 ${seatColor}`} /><div className={`absolute bottom-0 left-1 w-[80%] h-5 rounded-xl border shadow-sm transition-colors duration-500 ${seatColor}`} />
                </div>
            </div>
        ));
    };

    return (
        <motion.div
            layout={false} initial={{ scale: 0 }} animate={{ scale: 1, width: data.width, height: data.height, borderRadius: data.shape === 'round' ? '50%' : '24px', rotate: data.rotation || 0 }}
            style={{ x: data.x, y: data.y }} onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`absolute flex flex-col items-center justify-center border-2 select-none cursor-pointer group touch-none backdrop-blur-sm ${containerStyle}`}
        >
            <h3 className="font-black text-xl leading-none">{data.label}</h3>
            {isReady && <div className="flex items-center gap-1.5 mt-1.5 px-3 py-1 rounded-full bg-white text-emerald-600 shadow-md"><Sparkles className="w-3 h-3" /><span className="text-[10px] font-bold">READY</span></div>}
            {isPacked && <div className="flex items-center gap-1.5 mt-1.5 px-3 py-1 rounded-full bg-red-500 text-white shadow-sm border border-red-400"><Users className="w-3 h-3" /><span className="text-[10px] font-bold uppercase tracking-wide">Occupied</span></div>}
            {isToClean && <div className="flex items-center gap-1.5 mt-1.5 px-3 py-1 rounded-full bg-amber-500 text-white shadow-sm border border-amber-400"><Trash2 className="w-3 h-3" /><span className="text-[10px] font-bold">CLEAN</span></div>}
            {isFree && <div className="flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-full border border-slate-200/50 opacity-50"><Users className="w-3 h-3" /><span className="text-[10px] font-bold">{data.seats}</span></div>}
        </motion.div>
    );
}

// --- MAIN PAGE ---
export default function WaiterDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<any>(null);
  const [staff, setStaff] = useState<any>({ name: "Team" });
  
  const [stats, setStats] = useState({ mySales: 0, tablesServed: 0, occupiedCount: 0, vacantCount: 0 });
  const [tables, setTables] = useState<any[]>([]);
  const [sections, setSections] = useState<string[]>(["All"]); 
  const [currentSection, setCurrentSection] = useState("All"); 
  const [notifications, setNotifications] = useState<any[]>([]);
  const [disabledItems, setDisabledItems] = useState<any[]>([]); 
  
  const [scale, setScale] = useState(0.8);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const [time, setTime] = useState(new Date());
  const [greeting, setGreeting] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  
  const [topAlert, setTopAlert] = useState<{msg: string} | null>(null);
  const [dockStatus, setDockStatus] = useState({ hasReady: false, hasCooking: false });
  const lastOrderCount = useRef(0);
  const notifiedReadyIds = useRef(new Set<string>());

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening");
    const timer = setInterval(() => setTime(new Date()), 1000);
    const dataTimer = setInterval(loadAllData, 5000); 
    loadAllData();
    if(window.innerWidth < 768) setScale(0.5); 
    return () => { clearInterval(timer); clearInterval(dataTimer); };
  }, []);

  useEffect(() => {
    if(topAlert) {
        const timer = setTimeout(() => setTopAlert(null), 5000); 
        return () => clearTimeout(timer);
    }
  }, [topAlert]);

  async function loadAllData() {
      if (tables.length === 0) setRefreshing(true);
      try {
        const [dashRes, waiterRes, posStatsRes] = await Promise.all([
            getDashboardData(),
            getWaiterDashboardData(),
            getPOSStats()
        ]);
        if (dashRes?.tenant) setTenant(dashRes.tenant);
        if (waiterRes.success) {
            setStaff(waiterRes.staff);
            setDockStatus(waiterRes.dockStatus || { hasReady: false, hasCooking: false });
            
            setDisabledItems(waiterRes.disabledItems || []);
            setNotifications(waiterRes.notifications || []);
            
            (waiterRes.notifications || []).forEach((n: any) => {
                if (n.type === 'kitchen' && !notifiedReadyIds.current.has(n.id)) {
                    setTopAlert({ msg: `${n.title} for ${n.desc}` });
                    new Audio(SOUND_NOTIFICATION).play().catch(e => console.log("Audio play blocked", e));
                    notifiedReadyIds.current.add(n.id);
                }
            });

            if (posStatsRes.success && posStatsRes.stats) {
                const rawOrders = posStatsRes.stats.orders_list || [];
                const validOrders = rawOrders.filter((o: any) => o.status !== 'cancelled');
                const realRevenue = validOrders.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0);
                const uniqueTablesServed = new Set(validOrders.map((o: any) => o.tbl.trim())).size;

                setStats({
                    mySales: realRevenue,
                    tablesServed: uniqueTablesServed,
                    occupiedCount: posStatsRes.stats.occupiedCount,
                    vacantCount: posStatsRes.stats.vacantCount
                });
                
                lastOrderCount.current = validOrders.length;
                
                const healedTables = waiterRes.tables.map((t: any) => {
                    const freshStatus = posStatsRes.stats?.tables?.find((ft: any) => ft.label === t.label)?.status;
                    return { ...t, status: freshStatus || t.status };
                });
                setTables(healedTables);
            } else {
                 setTables(waiterRes.tables);
            }
            if(waiterRes.sections) setSections(["All", ...waiterRes.sections]);
        }
      } catch (e) { console.error(e); }
      setRefreshing(false);
      setLoading(false);
  }

  const visibleTables = currentSection === "All" ? tables : tables.filter(t => (t.section || "Main Hall") === currentSection);

  const handleTableClick = (table: any) => {
      const status = table.status || "available";
      if (status === "available" || status === "free" || status === "occupied") {
          router.push(`/staff/waiter/pos?table=${table.label}`);
      } else if (status === "dirty" || status === "payment") {
          handleCleanTable(table.label);
      } else if (status === "ready") {
          toast.success(`Serving Table ${table.label}`);
          setTables(prev => prev.map(t => t.label === table.label ? { ...t, status: "occupied" } : t));
      }
  };

  const handleCleanTable = async (tableName: string) => {
      if(!window.confirm(`Table ${tableName} Cleaned & Free?`)) return;
      setTables(prev => prev.map(t => t.label === tableName ? { ...t, status: "available" } : t));
      await cleanTable(tableName);
      toast.success(`Table ${tableName} is now Free`);
      loadAllData();
  };

  const handleServe = async (orderId: string, tableLabel: string) => {
      setNotifications(prev => prev.filter(n => n.id !== orderId));
      setTables(prev => prev.map(t => t.label === tableLabel ? { ...t, status: "occupied" } : t)); 
      
      const res = await markOrderServed(orderId, tableLabel);
      if(res.success) {
          toast.success("Order Served!");
          loadAllData();
      } else {
          toast.error("Failed to mark as served");
          loadAllData(); 
      }
  };

  const firstName = staff.name ? staff.name.split(' ')[0] : "Team";
  
  return (
    <div className="flex h-[100dvh] bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden relative">
      
      {/* ALERT BANNER */}
      <AnimatePresence>
        {topAlert && (
            <motion.div 
                initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -100, opacity: 0 }}
                className="absolute top-0 left-0 right-0 z-[100] flex justify-center pt-4 pointer-events-none"
            >
                <div className="px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 pointer-events-auto border-2 bg-emerald-600 text-white border-emerald-700">
                    <div className="p-2 bg-white/20 rounded-full">
                         <ChefHat className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h4 className="font-black text-sm uppercase tracking-widest">ORDER READY</h4>
                        <p className="font-bold text-lg leading-tight">{topAlert.msg}</p>
                    </div>
                    <button onClick={() => setTopAlert(null)} className="ml-4 p-2 hover:bg-white/20 rounded-full"><ArrowUpRight className="w-5 h-5 rotate-45" /></button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{loading && <SystemLoader />}</AnimatePresence>
      {!loading && (
        <>
            <Sidebar tenantName={tenant?.name} tenantCode={tenant?.code} logo={tenant?.logo_url} />
            
            {/* pb-[160px] guarantees the lifted mobile dock never blocks scrolling content */}
            <main className="flex-1 flex flex-col h-full relative pb-[160px] lg:pb-0 overflow-hidden">
                <header className="px-6 md:px-8 py-4 flex flex-col md:flex-row justify-between items-start md:items-center bg-white/90 backdrop-blur-xl sticky top-0 z-30 border-b border-slate-200/80 shadow-sm flex-shrink-0 gap-3">
                    <div>
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-emerald-600 font-bold text-xs mb-1 uppercase tracking-wider">
                            <CloudSun className="w-4 h-4" /> {greeting}, {firstName}
                        </motion.div>
                        <div className="flex items-center gap-4">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Waiter Hub</h1>
                            <button onClick={loadAllData} className={`p-2 rounded-xl bg-white border border-emerald-100 text-emerald-600 hover:bg-emerald-50 transition-all ${refreshing ? 'animate-spin' : ''}`}>
                                <RefreshCcw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full md:w-auto">
                        {sections.map(section => (
                            <button key={section} onClick={() => setCurrentSection(section)} className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all border ${currentSection === section ? 'bg-slate-900 text-white border-slate-900 shadow-md transform scale-105' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                                {section}
                            </button>
                        ))}
                    </div>

                    <div className="hidden md:block"><PremiumDateCard /></div>
                </header>

                <div className="px-6 md:px-8 pt-6 pb-2 grid grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0 overflow-y-auto">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[2.5rem] p-5 text-white shadow-2xl col-span-2 lg:col-span-1">
                        <div className="flex items-center justify-between mb-2">
                            <span className="flex items-center gap-2 text-emerald-100 text-xs font-bold uppercase tracking-widest"><IndianRupee className="w-4 h-4" /> My Sales</span>
                        </div>
                        <h2 className="text-3xl font-black tracking-tight">{formatRs(stats.mySales)}</h2>
                    </motion.div>
                    <MetricCard title="Vacant" value={stats.vacantCount} trend={0} icon={LayoutDashboard} color="blue" delay={0.2} />
                    <MetricCard title="Occupied" value={stats.occupiedCount} trend={0} icon={Crown} color="orange" delay={0.3} />
                    <UnavailableHeroCard items={disabledItems} delay={0.4} />
                </div>

                {/* MAIN CONTENT GRID */}
                <div className="flex-1 overflow-y-auto lg:overflow-hidden relative grid grid-cols-1 lg:grid-cols-3 p-6 md:px-8 gap-6 pb-6 scroll-smooth">
                    
                    {/* LEFT: MAP (Min height ensures it doesn't crush on mobile, but stays scrollable) */}
                    <div className="lg:col-span-2 relative bg-[#F1F5F9] rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-inner min-h-[450px] lg:h-full flex flex-col order-1 shrink-0">
                        <div className="absolute top-4 left-4 z-20 flex gap-2 pointer-events-none">
                            <span className="bg-white/90 backdrop-blur px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest text-slate-400 shadow-sm border border-slate-100">Live Floor</span>
                        </div>
                        
                        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 pointer-events-auto">
                            <div className="bg-white/90 backdrop-blur rounded-xl shadow-lg border border-white/50 flex flex-col overflow-hidden">
                                <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-3 hover:bg-slate-50 border-b border-slate-100"><ZoomIn className="w-5 h-5 text-slate-600" /></button>
                                <button onClick={() => { setScale(0.8); setPan({x:0, y:0}); }} className="p-3 hover:bg-slate-50 border-b border-slate-100"><RotateCcw className="w-5 h-5 text-slate-600" /></button>
                                <button onClick={() => setScale(s => Math.max(0.4, s - 0.1))} className="p-3 hover:bg-slate-50"><ZoomOut className="w-5 h-5 text-slate-600" /></button>
                            </div>
                        </div>

                        <motion.div ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing touch-none" drag dragMomentum={false} onDrag={(e, info) => setPan(p => ({ x: p.x + info.delta.x, y: p.y + info.delta.y }))}>
                            <motion.div className="absolute top-0 left-0 w-full h-full origin-center" style={{ x: pan.x, y: pan.y, scale: scale }}>
                                <div className="absolute inset-[-500%] pointer-events-none bg-[#F1F5F9]" style={{ backgroundImage: `radial-gradient(#cbd5e1 1px, transparent 1px)`, backgroundSize: '30px 30px' }} />
                                {visibleTables.map((t) => <ViewerTable key={t.id} data={t} onClick={() => handleTableClick(t)} />)}
                            </motion.div>
                        </motion.div>
                    </div>

                    {/* RIGHT: READY ORDERS (Expanded Height, Removed Extra Buttons) */}
                    <div className="bg-white rounded-[2.5rem] flex flex-col border border-slate-100 shadow-sm overflow-hidden min-h-[500px] lg:h-full order-2 shrink-0">
                        <div className="p-6 pb-4 flex-shrink-0 border-b border-slate-50">
                            <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                                <Bell className="w-5 h-5 text-emerald-500" /> Ready Orders 
                                <span className="bg-emerald-500 text-white text-[10px] px-2.5 py-0.5 rounded-full shadow-sm">{notifications.length}</span>
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar space-y-4">
                            {notifications.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-60">
                                    <ChefHat className="w-12 h-12 mb-3" />
                                    <span className="text-xs font-bold uppercase tracking-widest">All Orders Served</span>
                                </div>
                            ) : (
                                notifications.map((n: any, i: number) => (
                                    <motion.div 
                                        key={i}
                                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                        className="p-5 rounded-[1.5rem] bg-white border border-emerald-100 shadow-md shadow-emerald-500/5 group relative overflow-hidden flex flex-col gap-3 hover:border-emerald-300 transition-colors"
                                    >
                                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500" />
                                        <div className="flex justify-between items-start pl-2">
                                            <div>
                                                <p className="font-black text-slate-900 text-2xl tracking-tight">{n.desc}</p>
                                                <p className="text-sm text-emerald-600 mt-1 font-bold flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> {n.title}</p>
                                                <p className="text-[10px] text-slate-400 mt-1.5 font-bold">{n.time}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleServe(n.id, n.table)}
                                            className="w-full mt-2 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                                        >
                                            <CheckCircle2 className="w-4 h-4" /> Mark Served
                                        </button>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <FloatingDock router={router} dockStatus={dockStatus} />
            </main>
        </>
      )}
    </div>
  );
}