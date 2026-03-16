"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChefHat, History, FileText, Calendar, DollarSign, 
  LogOut, LayoutGrid, CheckCircle2, Bell, Clock, ChevronDown, ChevronUp, Check, AlertTriangle, Utensils
} from "lucide-react";
import { getKitchenStats, getKitchenTickets } from "@/app/actions/kitchen";
import { logoutStaff } from "@/app/actions/staff-auth";
import { toast } from "sonner";
import React from "react";
import NepaliDate from 'nepali-date-converter';

// --- CONFIG ---
const ALERT_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

// --- UTILS ---
const formatRs = (amount: number) => "Rs " + new Intl.NumberFormat('en-NP').format(amount || 0);

const toBS = (dateStr: string) => { 
    try { 
        if (!dateStr) return "---";
        const date = new Date(dateStr);
        const bsDate = new NepaliDate(date);
        return bsDate.format('YYYY/MM/DD'); 
    } catch { return "---"; }
};

const safeFormatTime = (dateStr: string) => {
    try {
        if (!dateStr) return "--:--";
        return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return "--:--"; }
};

// --- PREMIUM DOCK ---
function KitchenDock() {
    const handleLogout = () => {
        toast.custom((t) => (
            <div className="bg-white p-5 rounded-[1.5rem] shadow-2xl border border-slate-100 flex flex-col gap-4 w-full sm:w-[320px] pointer-events-auto">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center shrink-0 shadow-inner">
                        <LogOut className="w-5 h-5 ml-1" />
                    </div>
                    <div className="pt-0.5">
                        <h4 className="font-black text-slate-900 text-sm tracking-tight">Power Down Terminal?</h4>
                        <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
                            Are you sure you want to end your kitchen shift and sign out of KitchenOS?
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
                            toast.loading("Powering down terminal...");
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

    return (
        <div className="fixed bottom-8 left-0 right-0 mx-auto w-fit z-50 px-4 pointer-events-none">
            <motion.div 
                initial={{ y: 100, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="pointer-events-auto flex items-center gap-1.5 p-2 bg-slate-900/95 backdrop-blur-2xl rounded-[2rem] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] border border-slate-700 ring-1 ring-white/10"
            >
                <DockLink href="/staff/kitchen" icon={<ChefHat className="w-[18px] h-[18px]" />} label="Kitchen" />
                <div className="w-px h-6 bg-slate-700 mx-1 rounded-full" />
                <DockLink href="/staff/kitchen/menu" icon={<LayoutGrid className="w-[18px] h-[18px]" />} label="Menu" />
                {/* Active Tab */}
                <button className="flex items-center justify-center w-14 h-12 rounded-[1.2rem] bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 transition-all group relative">
                    <History className="w-[18px] h-[18px]" />
                </button>
                <div className="w-px h-6 bg-slate-700 mx-1 rounded-full" />
                <button onClick={handleLogout} className="flex items-center justify-center w-14 h-12 rounded-[1.2rem] text-red-400 hover:text-white hover:bg-red-500/20 active:scale-95 transition-all group relative">
                    <LogOut className="w-[18px] h-[18px]" />
                    <span className="absolute -top-12 bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl border border-slate-700 pointer-events-none">
                        Sign Out
                    </span>
                </button>
            </motion.div>
        </div>
    )
}

function DockLink({ href, icon, label }: any) {
    return (
        <Link href={href} className="flex items-center justify-center w-14 h-12 rounded-[1.2rem] text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 transition-all group relative">
            <div className="group-hover:scale-110 transition-transform duration-300">{icon}</div>
            <span className="absolute -top-12 bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl border border-slate-700 pointer-events-none scale-95 group-hover:scale-100">
                {label}
            </span>
        </Link>
    )
}

// --- MAIN PAGE ---
export default function KitchenReportsPage() {
    const [data, setData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'daily' | 'leaves' | 'payroll'>('daily');
    const [expandedBill, setExpandedBill] = useState<string | null>(null);
    
    // Notification State (Persistent loop)
    const [latestOrderTable, setLatestOrderTable] = useState<string | null>(null);
    const prevTicketIds = useRef<Set<string>>(new Set());
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const isFirstLoad = useRef(true);

    useEffect(() => {
        // Init Audio
        const audio = new Audio(ALERT_SOUND);
        audio.volume = 1.0;
        audio.loop = true; 
        audioRef.current = audio;

        // Load Reports
        getKitchenStats().then(res => {
            if(res.success) setData(res);
        });

        // Start Live Order Polling
        pollForNewOrders();
        const pollInterval = setInterval(pollForNewOrders, 3000);
        return () => clearInterval(pollInterval);
    }, []);

    const pollForNewOrders = async () => {
        try {
            const kdsRes = await getKitchenTickets();
            if (kdsRes.success && Array.isArray(kdsRes.data)) {
                const currentIds = new Set(kdsRes.data.map(t => t.id));
                
                if (!isFirstLoad.current) {
                    const newTicket = kdsRes.data.find(t => 
                        t.status === 'pending' && !prevTicketIds.current.has(t.id)
                    );
                    if (newTicket) triggerAlert(newTicket.table_name);
                }
                
                isFirstLoad.current = false;
                prevTicketIds.current = currentIds;
            }
        } catch (e) {
            console.error("Polling error", e);
        }
    };

    const triggerAlert = (tableName: string) => {
        setLatestOrderTable(tableName);
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(e => console.log("Audio play blocked", e));
        }
    };

    const stopAlert = () => {
        setLatestOrderTable(null);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };

    if(!data) return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin shadow-lg" />
            <p className="font-black text-slate-400 text-xs uppercase tracking-widest animate-pulse">Generating Report...</p>
        </div>
    );

    const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
    const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 pb-[120px] relative overflow-x-hidden custom-scrollbar">
            
            {/* LIVE ALERT BANNER */}
            <AnimatePresence>
                {latestOrderTable && (
                    <motion.div 
                        initial={{ y: -120 }} animate={{ y: 0 }} exit={{ y: -120 }}
                        className="fixed top-0 left-0 right-0 bg-red-500 flex items-center justify-between px-6 py-4 z-[100] text-white shadow-2xl cursor-pointer"
                        onClick={stopAlert}
                    >
                        <div className="flex items-center gap-4 animate-pulse">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <Bell className="w-5 h-5 fill-current" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold opacity-90 uppercase tracking-widest">New Order Received</p>
                                <h3 className="text-xl md:text-2xl font-black leading-none">{latestOrderTable}</h3>
                            </div>
                        </div>
                        <button className="bg-white text-red-600 px-5 py-2.5 rounded-full font-black text-xs shadow-lg uppercase tracking-wider active:scale-95 transition-transform">
                            Acknowledge
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* HEADER */}
            <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 px-6 py-8 sticky top-0 z-20 shadow-sm">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            Kitchen Reports <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2.5 py-1 rounded-full border border-emerald-200 uppercase tracking-widest">Live</span>
                        </h1>
                        <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Performance & Logistics</p>
                    </div>
                    
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 w-full md:w-auto">
                        <TabButton label="Daily Log" icon={<FileText className="w-4 h-4" />} active={activeTab === 'daily'} onClick={() => setActiveTab('daily')} />
                        <TabButton label="Leave Status" icon={<Calendar className="w-4 h-4" />} active={activeTab === 'leaves'} onClick={() => setActiveTab('leaves')} />
                        <TabButton label="Payroll" icon={<DollarSign className="w-4 h-4" />} active={activeTab === 'payroll'} onClick={() => setActiveTab('payroll')} />
                    </div>
                </div>
            </header>

            <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 md:space-y-8 mt-4">
                
                {/* DAILY SALES VIEW */}
                {activeTab === 'daily' && (
                    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 md:space-y-8">
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                            <motion.div variants={itemVariants}><StatCard label="Total Orders" value={data?.stats?.total || 0} color="bg-blue-50 text-blue-600 border-blue-100" icon={<ChefHat className="w-5 h-5"/>} /></motion.div>
                            <motion.div variants={itemVariants}><StatCard label="Completed" value={data?.stats?.completed || 0} color="bg-emerald-50 text-emerald-600 border-emerald-100" icon={<CheckCircle2 className="w-5 h-5"/>} /></motion.div>
                            <motion.div variants={itemVariants}><StatCard label="Pending" value={data?.stats?.pending || 0} color="bg-orange-50 text-orange-600 border-orange-100" icon={<Clock className="w-5 h-5"/>} /></motion.div>
                            <motion.div variants={itemVariants}><StatCard label="Est. Revenue" value={formatRs(data?.stats?.revenue || 0)} color="bg-slate-900 text-white border-slate-800" icon={<DollarSign className="w-5 h-5 text-emerald-400"/>} /></motion.div>
                        </div>

                        <motion.div variants={itemVariants} className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
                            <div className="px-6 md:px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                                <h2 className="font-black text-xl text-slate-900">Recent Kitchen Log</h2>
                                <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">{data?.history?.length || 0} Records</span>
                            </div>
                            
                            <div className="divide-y divide-slate-100">
                                {data?.history?.map((order: any) => {
                                    const isExpanded = expandedBill === order.id;
                                    
                                    // Robust parsing for valid items and quantities
                                    const validItems = (order.order_items || []).filter((i:any) => {
                                        const qty = Number(i.qty || i.quantity || 1);
                                        const s = (i.status || '').toLowerCase().trim();
                                        return qty > 0 && s !== 'cancelled' && s !== 'void';
                                    });

                                    // Dynamic Badge Status based on backend real status
                                    const os = (order.status || '').toLowerCase().trim();
                                    let statusLabel = "Completed";
                                    let badgeColor = "bg-purple-50 text-purple-700 border-purple-200";
                                    
                                    if (os === 'ready') {
                                        statusLabel = "Ready";
                                        badgeColor = "bg-blue-50 text-blue-700 border-blue-200 animate-pulse";
                                    } else if (os === 'served') {
                                        statusLabel = "Served";
                                        badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                                    }

                                    return (
                                        <div key={order.id} className="flex flex-col">
                                            {/* Row Header */}
                                            <div 
                                                onClick={() => setExpandedBill(isExpanded ? null : order.id)} 
                                                className={`px-6 md:px-8 py-5 flex justify-between items-center cursor-pointer transition-colors group ${isExpanded ? 'bg-slate-50/80' : 'hover:bg-slate-50'}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-colors ${isExpanded ? 'bg-slate-200 text-slate-700 shadow-inner' : 'bg-slate-100 text-slate-500 shadow-inner group-hover:bg-slate-200 group-hover:text-slate-700'}`}>
                                                        <Check className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-black text-lg text-slate-900 leading-none">{order.table_name || "Unknown Table"}</p>
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">#{String(order.id).slice(0,5)}</span>
                                                        </div>
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                                                            <Clock className="w-3 h-3" /> {safeFormatTime(order.created_at)} • {toBS(order.created_at)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${badgeColor}`}>
                                                        {statusLabel}
                                                    </span>
                                                    <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 text-slate-600 text-[10px] font-black uppercase tracking-wider border border-slate-200">
                                                        <Utensils className="w-3 h-3"/> {validItems.length} Items
                                                    </span>
                                                    <div className={`p-2 rounded-full transition-colors ${isExpanded ? 'bg-slate-200 text-slate-700' : 'group-hover:bg-slate-200 text-slate-400'}`}>
                                                        {isExpanded ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expanded Details */}
                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div 
                                                        initial={{ opacity: 0, height: 0 }} 
                                                        animate={{ opacity: 1, height: 'auto' }} 
                                                        exit={{ opacity: 0, height: 0 }} 
                                                        className="bg-slate-50 border-t border-b border-slate-100 px-6 md:px-8 py-5 overflow-hidden"
                                                    >
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                                                            {validItems.map((item:any, idx:number) => {
                                                                const qty = item.qty || item.quantity || 1;
                                                                const s = (item.status || '').toLowerCase().trim();
                                                                const isItemDone = ['ready', 'served', 'completed', 'paid'].includes(s);
                                                                const note = item.note || item.notes;
                                                                const variant = item.variant || item.variantName;

                                                                return (
                                                                    <div key={idx} className={`p-4 rounded-2xl border shadow-sm flex items-start gap-3 transition-colors ${isItemDone ? 'bg-white border-slate-200' : 'bg-orange-50/50 border-orange-200'}`}>
                                                                        <span className={`font-black px-2 py-1 rounded-lg text-xs border shrink-0 ${isItemDone ? 'bg-slate-50 text-slate-600 border-slate-100' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>{qty}x</span>
                                                                        <div className="flex flex-col">
                                                                            <span className={`text-sm font-bold leading-tight ${isItemDone ? 'text-slate-800' : 'text-slate-900'}`}>{item.name}</span>
                                                                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                                                {variant && <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">{variant}</span>}
                                                                                {note && <span className="text-[9px] text-orange-600 font-bold uppercase tracking-wider bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100 flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5"/> {note}</span>}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )
                                })}
                                {data?.history?.length === 0 && (
                                    <div className="p-16 flex flex-col items-center justify-center text-slate-300">
                                        <History className="w-16 h-16 mb-4 opacity-20" />
                                        <p className="font-bold uppercase tracking-widest text-xs">No food orders processed yet today.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* LEAVES VIEW */}
                {activeTab === 'leaves' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
                            <div className="px-8 py-6 border-b border-slate-50">
                                <h2 className="font-black text-xl text-slate-900">Recent Leave Requests</h2>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {data?.leaves && data.leaves.length > 0 ? data.leaves.map((leave: any) => (
                                    <div key={leave.id} className="px-8 py-6 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                        <div>
                                            <p className="font-black text-lg text-slate-900">{leave.staff_name || "Staff Member"}</p>
                                            <p className="text-xs font-bold text-slate-400 uppercase mt-1 tracking-wider">{leave.type} • {leave.days} Days</p>
                                        </div>
                                        <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border ${leave.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                                            {leave.status}
                                        </span>
                                    </div>
                                )) : (
                                    <div className="p-16 flex flex-col items-center justify-center text-slate-300">
                                        <Calendar className="w-16 h-16 mb-4 opacity-20" />
                                        <p className="font-bold uppercase tracking-widest text-xs">No leave records found.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* PAYROLL VIEW */}
                {activeTab === 'payroll' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
                            <div className="px-8 py-6 border-b border-slate-50">
                                <h2 className="font-black text-xl text-slate-900">Payroll History</h2>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {data?.payroll && data.payroll.length > 0 ? data.payroll.map((pay: any) => (
                                    <div key={pay.id} className="px-8 py-6 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                        <div>
                                            <p className="font-black text-lg text-slate-900">{pay.staff_name || "Kitchen Staff"}</p>
                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">Paid on: {toBS(pay.payment_date)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-xl text-emerald-600">{formatRs(pay.amount)}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Base Salary</p>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-16 flex flex-col items-center justify-center text-slate-300">
                                        <DollarSign className="w-16 h-16 mb-4 opacity-20" />
                                        <p className="font-bold uppercase tracking-widest text-xs">No payroll records found.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
            
            <KitchenDock />
        </div>
    )
}

function StatCard({ label, value, color, icon }: any) {
    return (
        <div className={`${color} p-6 md:p-8 rounded-[2rem] border shadow-sm flex flex-col justify-between relative overflow-hidden transition-transform hover:-translate-y-1`}>
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/20 rounded-full blur-2xl pointer-events-none" />
            <div className="mb-4">{icon}</div>
            <div>
                <p className="text-[10px] md:text-xs font-black uppercase tracking-widest opacity-80 mb-1">{label}</p>
                <p className="text-3xl md:text-4xl font-black tracking-tight">{value}</p>
            </div>
        </div>
    )
}

function TabButton({ label, icon, active, onClick }: any) {
    return (
        <button 
            onClick={onClick}
            className={`whitespace-nowrap px-5 py-3 rounded-2xl flex items-center gap-2 text-xs font-black transition-all shadow-sm ${active ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 transform scale-105' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}
        >
            {icon} {label}
        </button>
    )
}