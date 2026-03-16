"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, Calendar, DollarSign, CheckCircle2, Bell, Clock, 
  ChevronDown, ChevronUp, Check, AlertTriangle, Wine, GlassWater, History,Wallet2
} from "lucide-react";
import { getBartenderStats, getBartenderTickets } from "@/app/actions/bartender";
import { toast } from "sonner";
import React from "react";
import NepaliDate from 'nepali-date-converter';

const ALERT_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

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

export default function BartenderReportsPage() {
    const [data, setData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'daily'>('daily');
    const [expandedBill, setExpandedBill] = useState<string | null>(null);
    
    const [latestOrderTable, setLatestOrderTable] = useState<string | null>(null);
    const prevTicketIds = useRef<Set<string>>(new Set());
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const isFirstLoad = useRef(true);

    useEffect(() => {
        const audio = new Audio(ALERT_SOUND);
        audio.volume = 1.0;
        audio.loop = true; 
        audioRef.current = audio;

        // Load Bar Reports
        getBartenderStats().then(res => {
            if(res.success) setData(res);
        });

        pollForNewOrders();
        const pollInterval = setInterval(pollForNewOrders, 3000);
        return () => clearInterval(pollInterval);
    }, []);

    const pollForNewOrders = async () => {
        try {
            const kdsRes = await getBartenderTickets();
            if (kdsRes.success && Array.isArray(kdsRes.data)) {
                const currentIds = new Set(kdsRes.data.map(t => t.id));
                
                if (!isFirstLoad.current) {
                    const newTicket = kdsRes.data.find(t => t.status === 'pending' && !prevTicketIds.current.has(t.id));
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
        <div className="h-full w-full flex flex-col items-center justify-center bg-[#F8FAFC] gap-4">
            <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin shadow-lg" />
            <p className="font-black text-slate-400 text-xs uppercase tracking-widest animate-pulse">Calculating Bar Revenue...</p>
        </div>
    );

    const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
    const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#F8FAFC] relative overflow-hidden">
            
            {/* LIVE ALERT BANNER */}
            <AnimatePresence>
                {latestOrderTable && (
                    <motion.div 
                        initial={{ y: -120 }} animate={{ y: 0 }} exit={{ y: -120 }}
                        className="absolute top-0 left-0 right-0 bg-red-500 flex items-center justify-between px-6 py-4 z-[100] text-white shadow-2xl cursor-pointer transform-gpu"
                        onClick={stopAlert}
                    >
                        <div className="flex items-center gap-4 animate-pulse">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <Bell className="w-5 h-5 fill-current" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold opacity-90 uppercase tracking-widest">New Drink Order</p>
                                <h3 className="text-xl md:text-2xl font-black leading-none">{latestOrderTable}</h3>
                            </div>
                        </div>
                        <button className="bg-white text-red-600 px-5 py-2.5 rounded-full font-black text-xs shadow-lg uppercase tracking-wider active:scale-95 transition-transform">
                            Acknowledge
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200 px-6 py-6 md:py-8 sticky top-0 z-20 shadow-sm shrink-0">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            Bar Ledger <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2.5 py-1 rounded-full border border-emerald-200 uppercase tracking-widest shadow-sm">Live</span>
                        </h1>
                        <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Beverage Revenue & Performance</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-[100px] md:pb-8 custom-scrollbar">
                <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">
                    
                    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 md:space-y-8">
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                            <motion.div variants={itemVariants}><StatCard label="Bar Tickets" value={data?.stats?.total || 0} color="bg-blue-50 text-blue-600 border-blue-100" icon={<GlassWater className="w-5 h-5"/>} /></motion.div>
                            <motion.div variants={itemVariants}><StatCard label="Mixed" value={data?.stats?.completed || 0} color="bg-emerald-50 text-emerald-600 border-emerald-100" icon={<CheckCircle2 className="w-5 h-5"/>} /></motion.div>
                            <motion.div variants={itemVariants}><StatCard label="Pending" value={data?.stats?.pending || 0} color="bg-orange-50 text-orange-600 border-orange-100" icon={<Clock className="w-5 h-5"/>} /></motion.div>
                            <motion.div variants={itemVariants}><StatCard label="Bar Revenue" value={formatRs(data?.stats?.revenue || 0)} color="bg-slate-900 text-emerald-400 border-slate-800" icon={<Wallet2 className="w-5 h-5 text-emerald-500"/>} /></motion.div>
                        </div>

                        <motion.div variants={itemVariants} className="bg-white rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden transform-gpu">
                            <div className="px-6 md:px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                                <h2 className="font-black text-xl text-slate-900 flex items-center gap-2"><History className="w-5 h-5 text-slate-400" /> Completed Orders</h2>
                                <span className="text-[10px] font-black text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm uppercase tracking-widest">{data?.history?.length || 0} Records</span>
                            </div>
                            
                            <div className="divide-y divide-slate-100">
                                {data?.history?.map((order: any) => {
                                    const isExpanded = expandedBill === order.id;
                                    
                                    const validItems = (order.order_items || []).filter((i:any) => {
                                        const qty = Number(i.qty || i.quantity || 1);
                                        const s = (i.status || '').toLowerCase().trim();
                                        return qty > 0 && s !== 'cancelled' && s !== 'void';
                                    });

                                    const os = (order.status || '').toLowerCase().trim();
                                    let statusLabel = "Completed";
                                    let badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                                    
                                    if (os === 'ready') {
                                        statusLabel = "Ready";
                                        badgeColor = "bg-blue-50 text-blue-700 border-blue-200 animate-pulse";
                                    } 

                                    return (
                                        <div key={order.id} className="flex flex-col">
                                            {/* Row Header */}
                                            <div 
                                                onClick={() => setExpandedBill(isExpanded ? null : order.id)} 
                                                className={`px-6 md:px-8 py-5 flex justify-between items-center cursor-pointer transition-colors group ${isExpanded ? 'bg-slate-50/80' : 'hover:bg-slate-50'}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-colors ${isExpanded ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'bg-slate-100 text-slate-400 shadow-inner group-hover:bg-slate-200 group-hover:text-slate-600'}`}>
                                                        <Wine className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-black text-lg md:text-xl text-slate-900 leading-none">{order.table_name || "Unknown Table"}</p>
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">#{String(order.id).slice(0,5)}</span>
                                                        </div>
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                                                            <Clock className="w-3 h-3" /> {safeFormatTime(order.created_at)} • {toBS(order.created_at)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 md:gap-4">
                                                    <span className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${badgeColor}`}>
                                                        {statusLabel}
                                                    </span>
                                                    <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-slate-600 text-[10px] font-black uppercase tracking-wider border border-slate-200 shadow-sm">
                                                        <GlassWater className="w-3 h-3"/> {validItems.length} Drinks
                                                    </span>
                                                    <div className={`p-2 rounded-full transition-colors ${isExpanded ? 'bg-slate-200 text-slate-700' : 'bg-slate-50 group-hover:bg-slate-200 text-slate-400 border border-slate-200'}`}>
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
                                                        className="bg-slate-50/80 border-t border-b border-slate-100 px-6 md:px-8 py-5 overflow-hidden"
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
                                    <div className="p-16 flex flex-col items-center justify-center text-slate-300 bg-white">
                                        <GlassWater className="w-16 h-16 mb-4 opacity-20" />
                                        <p className="font-bold uppercase tracking-widest text-xs">No bar orders processed yet today.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </div>
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
                <p className="text-3xl md:text-4xl font-black tracking-tight truncate">{value}</p>
            </div>
        </div>
    )
}