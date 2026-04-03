"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { getCashierReports } from "@/app/actions/cashier"; 
import { Loader2, CheckCircle2, Banknote, QrCode, UserCircle, Search, Download, ChevronUp, ChevronDown, Calendar, ShieldCheck, X, ArrowRight } from "lucide-react";
import React from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import NepaliDate from 'nepali-date-converter'; 
import { NepaliDatePicker } from "nepali-datepicker-reactjs";
import "nepali-datepicker-reactjs/dist/index.css";

const formatRs = (amount: number) => "Rs " + new Intl.NumberFormat('en-NP').format(amount);

// --- 100% ACCURATE NEPALI DATE CONVERTERS ---
const toBS = (dateStr: string) => { 
    try { 
        const date = new Date(dateStr);
        const bsDate = new NepaliDate(date);
        return bsDate.format('YYYY-MM-DD'); 
    } catch { return "---"; }
};

const getBSDateFromDaysAgo = (daysAgo: number) => {
    const pastDate = new Date(Date.now() - (daysAgo > 1 ? daysAgo - 1 : 0) * 24 * 60 * 60 * 1000);
    return new NepaliDate(pastDate).format('YYYY-MM-DD');
};

// --- PREMIUM CSV EXPORT ---
export function getDisplayMethod(tx: any) {
    let parsedSplits = tx.splits;
    if (typeof parsedSplits === 'string') {
        try { parsedSplits = JSON.parse(parsedSplits); } catch(e) { parsedSplits = []; }
    }
    if (parsedSplits && Array.isArray(parsedSplits) && parsedSplits.length > 0) {
        let totalSplitTendered = 0;
        parsedSplits.forEach((s: any) => totalSplitTendered += (Number(s.amount) || 0));
        let change = totalSplitTendered - Number(tx.amount || tx.grandTotal || 0);
        if (change < 0) change = 0;
        return parsedSplits.map((s:any) => {
            let amt = Number(s.amount) || 0;
            if ((s.method === 'Cash' || s.method.toLowerCase() === 'cash') && change > 0) {
                if (change >= amt) { change -= amt; amt = 0; }
                else { amt -= change; change = 0; }
            }
            return amt > 0 ? `${s.method}(${amt})` : null;
        }).filter(Boolean).join(' + ') || 'Cash';
    }
    return tx.payment_method || tx.method || "Cash";
}

function exportToCSV(bills: any[], startDate: string, endDate: string) {
    if(!bills || bills.length === 0) return toast.error("No data available to export");
    
    let csv = "Bill Number,Date(AD),Date(BS),Time,Table,Items,Grand Total,Paid Amount,Due Amount,Method,Served By,Customer Name,Customer Address\n";
    
    bills.forEach((b: any) => {
        const displayBill = b.bill_no || b.invoice_no || "N/A";
        const cleanItems = b.items?.filter((i:any) => !['cancelled', 'void'].includes((i.status || '').toLowerCase().trim()));
        const items = cleanItems?.map((i:any) => `${i.qty}x ${i.name.replace(/,/g, '')}`).join(" | ") || "";
        
        const grandTotal = Number(b.grandTotal) || 0;
        let tendered = Number(b.tendered) || 0;
        let due = b.credit_due !== undefined ? Number(b.credit_due) : 0;

        let finalMethod = b.payment_method || 'Cash';
        if (b.payment_method !== 'Credit') { tendered = grandTotal; due = 0; }
        
        if (b.splits && Array.isArray(b.splits) && b.splits.length > 0) {
            finalMethod = getDisplayMethod(b);
        }

        csv += `${displayBill},${b.date.split('T')[0]},${toBS(b.date)},${b.time || ''},${b.table_no},"${items}",${grandTotal},${tendered},${due},"${finalMethod}",${b.served_by || 'Cashier'},"${b.customer_name||''}","${b.customer_address||''}"\n`;
    });
    
    const link = document.createElement("a"); 
    link.href = "data:text/csv;charset=utf-8," + encodeURI(csv); 
    link.download = `Gecko_Report_${startDate}_to_${endDate}.csv`; 
    link.click();
    toast.success("Report Exported Successfully");
}

// --- HOOK FOR CLICK OUTSIDE (Closes Popover) ---
function useOnClickOutside(ref: any, handler: () => void) {
    useEffect(() => {
        const listener = (event: any) => {
            if (!ref.current || ref.current.contains(event.target)) return;
            // Don't close if clicking inside the nepali datepicker portal
            if (event.target.closest('.ndp-datepicker')) return;
            handler();
        };
        document.addEventListener("mousedown", listener);
        document.addEventListener("touchstart", listener);
        return () => {
            document.removeEventListener("mousedown", listener);
            document.removeEventListener("touchstart", listener);
        };
    }, [ref, handler]);
}

export default function ReportsView({ data }: any) {
    const npToday = getBSDateFromDaysAgo(1);
    
    // Filters State
    const [startDate, setStartDate] = useState<string>(npToday);
    const [endDate, setEndDate] = useState<string>(npToday);
    const [searchTerm, setSearchTerm] = useState("");
    
    // Popover State
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [activeRangeButton, setActiveRangeButton] = useState<number | "custom">(1);
    const datePickerRef = useRef<HTMLDivElement>(null);
    useOnClickOutside(datePickerRef, () => setShowDatePicker(false));
    
    // Data State
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [expandedBill, setExpandedBill] = useState<string | null>(null);

    useEffect(() => { load(); }, []);

    async function load() { 
        setLoading(true); 
        const res = await getCashierReports(365); // Fetch 1 year for instant zero-lag filtering
        if(res.success) setReport(res); 
        setLoading(false); 
    }

    const handleQuickRange = (days: number) => {
        setActiveRangeButton(days);
        setStartDate(getBSDateFromDaysAgo(days));
        setEndDate(npToday);
        setShowDatePicker(false);
    };

    const handleCustomDateChange = (isStart: boolean, date: string) => {
        setActiveRangeButton("custom");
        if (isStart) setStartDate(date);
        else setEndDate(date);
    };

    // ZERO-LAG SEARCH & DATE RANGE ENGINE
    const filteredBills = useMemo(() => {
        return report?.bills?.filter((b: any) => {
            // 1. Super Search (Includes Payment Method now!)
            const displayBill = String(b.bill_no || b.invoice_no || "").toLowerCase();
            const cName = String(b.customer_name || "").toLowerCase();
            const tNo = String(b.table_no || "").toLowerCase();
            const method = String(b.payment_method || "").toLowerCase();
            const search = searchTerm.toLowerCase();
            
            const matchesSearch = displayBill.includes(search) || tNo.includes(search) || cName.includes(search) || method.includes(search);
            
            // 2. Strict Nepali Date Filter
            const billBS = toBS(b.date);
            const isAfterStart = startDate ? billBS >= startDate : true;
            const isBeforeEnd = endDate ? billBS <= endDate : true;

            return matchesSearch && isAfterStart && isBeforeEnd;
        }) || [];
    }, [report, searchTerm, startDate, endDate]);

    // DYNAMIC SALES ENGINE
    const derivedStats = useMemo(() => {
        const pSplit: any = {};
        const sSplit: any = {};
        let total = 0; let count = 0;
        
        filteredBills.forEach((b: any) => {
            const method = b.payment_method || "Cash";
            const staff = b.served_by || "Cashier";
            const grandTotal = Number(b.grandTotal) || 0; 
            const actualRevenue = method === 'Credit' ? (Number(b.tendered) || 0) : grandTotal;
            
            total += actualRevenue; count++;

            // PRECISE SPLIT PARSING
            let safeSplits = b.splits;
            if (typeof safeSplits === 'string') {
                try { safeSplits = JSON.parse(safeSplits); } catch(e) { safeSplits = []; }
            }
            
            if (safeSplits && Array.isArray(safeSplits) && safeSplits.length > 0) {
                let totalSplitTendered = 0;
                safeSplits.forEach((s: any) => {
                    const splitAmt = Number(s.amount) || 0;
                    const splitMethod = s.method || 'Cash';
                    pSplit[splitMethod] = (pSplit[splitMethod] || 0) + splitAmt;
                    totalSplitTendered += splitAmt;
                });
                const changeToReturn = totalSplitTendered - actualRevenue;
                if (changeToReturn > 0) pSplit['Cash'] = (pSplit['Cash'] || 0) - changeToReturn;
            } else if (method === 'Credit') {
                pSplit['Credit'] = (pSplit['Credit'] || 0) + (Number(b.due_amount) || 0);
                if (Number(b.tendered) > 0) pSplit['Cash'] = (pSplit['Cash'] || 0) + Number(b.tendered);
            } else {
                pSplit[method] = (pSplit[method] || 0) + actualRevenue;
            }

            sSplit[staff] = (sSplit[staff] || 0) + actualRevenue;
        });
        
        return { paymentSplit: pSplit, staffSplit: sSplit, total, count };
    }, [filteredBills]);

    const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
    const itemVariants: any = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } } };

    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto bg-[#F8FAFC] pb-[140px] custom-scrollbar transform-gpu relative">
            
            {/* OVERRIDE NEPALI DATEPICKER CSS FOR ZERO CLIPPING & PREMIUM LOOK */}
            <style jsx global>{`
                .ndp-datepicker {
                    z-index: 999999 !important; /* Ultimate fix for clipping */
                    position: absolute !important;
                    border-radius: 16px !important;
                    border: 1px solid #e2e8f0 !important;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
                    font-family: inherit !important;
                }
                .custom-np-input input {
                    background: transparent !important;
                    border: none !important;
                    outline: none !important;
                    font-weight: 800 !important;
                    color: #0f172a !important;
                    width: 100% !important;
                    cursor: pointer !important;
                    padding: 0 !important;
                    font-size: 14px !important;
                    text-align: left;
                    box-shadow: none !important;
                }
                .custom-np-input input:focus { box-shadow: none !important; }
            `}</style>

            {/* HEADER */}
            <div className="flex flex-col mb-8">
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">Business Reports</h1>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Ledger & Analytics</p>
            </div>

            {loading ? (
                <div className="h-[60vh] flex flex-col items-center justify-center">
                    <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mb-4" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Compiling Ledger...</p>
                </div>
            ) : report ? (
                <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 md:space-y-8">
                    
                    {/* TOP STAT CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                        <motion.div variants={itemVariants} className="bg-gradient-to-br from-emerald-600 to-teal-800 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] text-white shadow-2xl shadow-emerald-600/20 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
                            <div className="relative z-10">
                                <p className="text-emerald-100 text-[10px] md:text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2"><Banknote className="w-4 h-4"/> Total Received</p>
                                <h2 className="text-4xl md:text-5xl font-black tracking-tighter truncate">{formatRs(derivedStats.total)}</h2>
                                <p className="mt-4 text-emerald-100 text-xs font-bold flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-white" /> {derivedStats.count} Successful Bills</p>
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants} className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-lg shadow-slate-200/40 border border-slate-100 flex flex-col">
                            <p className="text-slate-400 text-[10px] md:text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2"><QrCode className="w-4 h-4 text-indigo-500"/> Payment Split</p>
                            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
                                {Object.entries(derivedStats.paymentSplit).sort((a:any, b:any) => b[1] - a[1]).map(([k,v]:any) => (
                                    <div key={k} className="flex justify-between items-center p-2.5 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100">
                                        <span className="font-bold text-slate-700 capitalize text-sm">{k}</span>
                                        <span className="font-black text-slate-900">{formatRs(v)}</span>
                                    </div>
                                ))}
                                {Object.keys(derivedStats.paymentSplit).length === 0 && <span className="text-xs text-slate-400 font-bold block mt-2">No payments found.</span>}
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants} className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-lg shadow-slate-200/40 border border-slate-100 flex flex-col">
                            <p className="text-slate-400 text-[10px] md:text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2"><UserCircle className="w-4 h-4 text-orange-500"/> Top Staff</p>
                            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
                                {Object.entries(derivedStats.staffSplit).sort((a:any, b:any) => b[1] - a[1]).map(([k,v]:any) => (
                                    <div key={k} className="flex justify-between items-center p-2.5 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100">
                                        <span className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-slate-100 text-[10px] flex items-center justify-center text-slate-500 font-black uppercase">{k.charAt(0)}</div>
                                            {k}
                                        </span>
                                        <span className="font-black text-slate-900 text-sm">{formatRs(v)}</span>
                                    </div>
                                ))}
                                {Object.keys(derivedStats.staffSplit).length === 0 && <span className="text-xs text-slate-400 font-bold block mt-2">No staff activity found.</span>}
                            </div>
                        </motion.div>
                    </div>

                    {/* BILL HISTORY SECTION */}
                    <motion.div variants={itemVariants} className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 overflow-visible transform-gpu">
                        
                        {/* PREMIUM UNIFIED CONTROLS BAR */}
                        <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col xl:flex-row justify-between items-center gap-4 bg-slate-50/50 rounded-t-[2rem] md:rounded-t-[2.5rem]">
                            
                            {/* SEARCH */}
                            <div className="flex items-center gap-3 bg-white px-4 py-3.5 rounded-2xl border border-slate-200 w-full xl:max-w-md shadow-sm focus-within:ring-2 focus-within:ring-emerald-100 transition-all shrink-0">
                                <Search className="w-5 h-5 text-slate-400 shrink-0" />
                                <input placeholder="Search method, bill, table..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-transparent outline-none font-bold text-sm w-full text-slate-700 placeholder:text-slate-400" />
                                {searchTerm && <button onClick={() => setSearchTerm("")}><X className="w-4 h-4 text-slate-400 hover:text-slate-600" /></button>}
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 w-full xl:w-auto">
                                
                                {/* UNIFIED DATE RANGE POPOVER BUTTON */}
                                <div className="relative w-full sm:w-auto" ref={datePickerRef}>
                                    <button 
                                        onClick={() => setShowDatePicker(!showDatePicker)}
                                        className={`w-full sm:w-auto px-5 py-3.5 bg-white border rounded-2xl flex items-center justify-between gap-3 shadow-sm transition-all active:scale-95 ${showDatePicker ? 'border-emerald-400 ring-2 ring-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-emerald-500" />
                                            <span className="text-sm font-black text-slate-700">{startDate} <span className="text-slate-300 mx-1 font-normal">→</span> {endDate}</span>
                                        </div>
                                        {showDatePicker ? <ChevronUp className="w-4 h-4 text-slate-400"/> : <ChevronDown className="w-4 h-4 text-slate-400"/>}
                                    </button>

                                    {/* ABSOLUTE POPOVER MENU (Z-INDEX FIX) */}
                                    <AnimatePresence>
                                        {showDatePicker && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 10, scale: 0.98 }} 
                                                animate={{ opacity: 1, y: 0, scale: 1 }} 
                                                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                                                className="absolute top-full mt-3 right-0 w-[320px] sm:w-[400px] bg-white rounded-[2rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] border border-slate-100 p-5 z-[99999] flex flex-col gap-5 overflow-visible origin-top-right"
                                            >
                                                {/* Quick Selects */}
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Quick Filters</p>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {[1, 7, 30].map(d => (
                                                            <button 
                                                                key={d} 
                                                                onClick={() => handleQuickRange(d)} 
                                                                className={`py-2.5 rounded-xl text-xs font-black transition-all ${activeRangeButton === d ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100'}`}
                                                            >
                                                                {d === 1 ? 'Today' : `${d} Days`}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="h-px w-full bg-slate-100" />

                                                {/* Custom Selects */}
                                                <div className="flex flex-col sm:flex-row gap-4 items-center">
                                                    <div className="w-full flex-1">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Start Date</label>
                                                        <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 custom-np-input focus-within:border-emerald-400 focus-within:bg-white transition-all">
                                                            <NepaliDatePicker value={startDate} onChange={(v: string) => handleCustomDateChange(true, v)} options={{ calenderLocale: 'ne', valueLocale: 'en' }} />
                                                        </div>
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-slate-300 hidden sm:block mt-5" />
                                                    <div className="w-full flex-1">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">End Date</label>
                                                        <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 custom-np-input focus-within:border-rose-400 focus-within:bg-white transition-all">
                                                            <NepaliDatePicker value={endDate} onChange={(v: string) => handleCustomDateChange(false, v)} options={{ calenderLocale: 'ne', valueLocale: 'en' }} />
                                                        </div>
                                                    </div>
                                                </div>

                                                <button onClick={() => setShowDatePicker(false)} className="w-full py-3 mt-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl text-xs font-black uppercase tracking-widest transition-colors">
                                                    Apply Filter
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* EXPORT BUTTON */}
                                <button onClick={() => exportToCSV(filteredBills, startDate, endDate)} className="w-full sm:w-auto px-6 py-3.5 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/30 transition-all active:scale-95 shrink-0">
                                    <Download className="w-4 h-4" /> Export
                                </button>
                            </div>
                        </div>

                        {/* DESKTOP VIEW: Traditional Table */}
                        <div className="hidden md:block overflow-x-auto pb-6">
                            <table className="w-full text-left">
                                <thead className="bg-white text-slate-400 uppercase text-[10px] font-black tracking-widest border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-5 whitespace-nowrap">Bill No.</th>
                                        <th className="px-6 py-5 whitespace-nowrap">Date / Info</th>
                                        <th className="px-6 py-5 whitespace-nowrap">Method</th>
                                        <th className="px-6 py-5 text-right whitespace-nowrap">Total / Status</th>
                                        <th className="px-6 py-5"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {filteredBills.length === 0 ? (
                                        <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold">No records found between {startDate} and {endDate}.</td></tr>
                                    ) : filteredBills.map((b:any, i:number) => {
                                        const displayBill = b.bill_no || b.invoice_no || "---";
                                        const isExpanded = expandedBill === displayBill;
                                        const isCredit = b.payment_method === 'Credit';
                                        
                                        const grandTotal = Number(b.grandTotal) || 0;
                                        const tendered = Number(b.tendered) || 0;
                                        const due = b.credit_due !== undefined ? Number(b.credit_due) : Math.max(0, grandTotal - tendered);
                                        const isCleared = due <= 0;

                                        return (
                                            <React.Fragment key={i}>
                                                <tr onClick={() => setExpandedBill(isExpanded ? null : displayBill)} className={`transition-colors cursor-pointer group ${isExpanded ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}`}>
                                                    <td className="px-6 py-5 font-black text-slate-900">{displayBill}</td>
                                                    <td className="px-6 py-5">
                                                        <span className="font-medium text-slate-500 block mb-1">{toBS(b.date)}</span>
                                                        {b.customer_name && <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider">{b.customer_name}</span>}
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider border ${isCredit ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                            {getDisplayMethod(b)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5 text-right">
                                                        <span className="font-black text-slate-900 text-base block">{formatRs(grandTotal)}</span>
                                                        {b.discount > 0 && <span className="text-[8px] bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded uppercase font-black tracking-widest mt-1 shadow-sm block w-max ml-auto">- {formatRs(b.discount)} Discount</span>}
                                                        {isCredit && (
                                                            <div className="mt-1 flex flex-col items-end gap-1">
                                                                {isCleared ? (
                                                                    <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md font-black uppercase tracking-widest border border-emerald-200 flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> Cleared</span>
                                                                ) : (
                                                                    <>
                                                                        {tendered > 0 && <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Paid: {formatRs(tendered)}</span>}
                                                                        <span className="text-[9px] bg-red-50 text-red-600 px-2 py-0.5 rounded-md border border-red-100 font-black uppercase tracking-widest shadow-sm">Due: {formatRs(due)}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-5 text-right">
                                                        <div className={`p-2 rounded-full inline-flex transition-colors ${isExpanded ? 'bg-emerald-100 text-emerald-600' : 'group-hover:bg-slate-200 text-slate-400'}`}>
                                                            {isExpanded ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                                                        </div>
                                                    </td>
                                                </tr>
                                                
                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.tr initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-slate-50/80 border-b-2 border-emerald-100">
                                                            <td colSpan={5} className="px-6 py-6">
                                                                <div className="grid grid-cols-4 gap-4 mb-4">
                                                                    {b.items?.map((item:any, idx:number) => {
                                                                        const isCancelled = ['cancelled', 'void'].includes((item.status || '').toLowerCase().trim());
                                                                        if (isCancelled && item.previous_status === 'pending') return null;
                                                                        return (
                                                                            <div key={idx} className={`bg-white p-4 rounded-2xl border ${isCancelled ? 'border-red-200 bg-red-50/30' : 'border-slate-200'} shadow-sm flex flex-col hover:border-emerald-200 transition-colors`}>
                                                                                <div className="flex justify-between items-start mb-2">
                                                                                    <div className="flex gap-2 items-center">
                                                                                        <span className={`font-black text-white ${isCancelled ? 'bg-red-400' : 'bg-slate-800'} px-2 py-0.5 rounded-md text-[10px]`}>{item.qty || 1}x</span>
                                                                                        {isCancelled && <span className="text-[9px] font-black bg-red-100 text-red-600 px-1.5 py-0.5 rounded uppercase tracking-wider border border-red-200 shadow-sm">Waste ({item.previous_status || 'Unknown'})</span>}
                                                                                    </div>
                                                                                    <span className={`text-xs font-black ${isCancelled ? 'text-red-400 line-through' : 'text-emerald-600'}`}>{formatRs(item.price || 0)}</span>
                                                                                </div>
                                                                                <span className={`text-sm font-bold leading-tight line-clamp-2 ${isCancelled ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{item.name}</span>
                                                                                {item.variant && <span className="text-[9px] text-slate-400 font-black mt-1.5 uppercase tracking-widest">{item.variant}</span>}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                                <div className="pt-4 border-t border-slate-200 flex flex-wrap gap-4">
                                                                    <div className="bg-white p-4 rounded-2xl border border-slate-200 text-xs flex gap-6 shadow-sm">
                                                                        <div className="flex flex-col gap-1">
                                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Table</span>
                                                                            <span className="font-bold text-slate-700">{b.table_no}</span>
                                                                        </div>
                                                                        <div className="w-px bg-slate-100" />
                                                                        <div className="flex flex-col gap-1">
                                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Served By</span>
                                                                            <span className="font-bold text-slate-700">{b.served_by || 'Cashier'}</span>
                                                                        </div>
                                                                        {(b.customer_name || b.customer_address) && (
                                                                            <>
                                                                                <div className="w-px bg-slate-100" />
                                                                                <div className="flex flex-col gap-1">
                                                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Customer</span>
                                                                                    <span className="font-bold text-slate-700">{b.customer_name} {b.customer_address ? `(${b.customer_address})` : ''}</span>
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center gap-6 shadow-lg ml-auto">
                                                                        <div className="flex flex-col text-right">
                                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Grand Total</span>
                                                                            <span className="font-bold text-sm">{formatRs(grandTotal)}</span>
                                                                        </div>
                                                                        {b.discount > 0 && (
                                                                            <>
                                                                                <div className="w-px h-full bg-slate-700" />
                                                                                <div className="flex flex-col text-right">
                                                                                    <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Discount</span>
                                                                                    <span className="font-bold text-sm text-amber-400">-{formatRs(b.discount)}</span>
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                        {b.tendered > 0 && (
                                                                            <>
                                                                                <div className="w-px h-full bg-slate-700" />
                                                                                <div className="flex flex-col text-right">
                                                                                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Amount Paid</span>
                                                                                    <span className="font-black text-lg text-emerald-400">{formatRs(b.tendered)}</span>
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </motion.tr>
                                                    )}
                                                </AnimatePresence>
                                            </React.Fragment>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* MOBILE VIEW: Stacked Cards (100% Responsive) */}
                        <div className="md:hidden divide-y divide-slate-100">
                            {filteredBills.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 font-bold">No records found between {startDate} and {endDate}.</div>
                            ) : filteredBills.map((b:any, i:number) => {
                                const displayBill = b.bill_no || b.invoice_no || "---";
                                const isExpanded = expandedBill === displayBill;
                                const isCredit = b.payment_method === 'Credit';
                                
                                const grandTotal = Number(b.grandTotal) || 0;
                                const tendered = Number(b.tendered) || 0;
                                const due = b.credit_due !== undefined ? Number(b.credit_due) : Math.max(0, grandTotal - tendered);
                                const isCleared = due <= 0;

                                return (
                                    <div key={i} className="flex flex-col">
                                        <div onClick={() => setExpandedBill(isExpanded ? null : displayBill)} className={`p-4 flex flex-col gap-3 transition-colors ${isExpanded ? 'bg-emerald-50/50' : 'active:bg-slate-50'}`}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="font-black text-slate-900 text-base">{displayBill}</span>
                                                    <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                        <Calendar className="w-3 h-3" /> {toBS(b.date)}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-black text-slate-900 text-base block">{formatRs(grandTotal)}</span>
                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest mt-1 inline-block border ${isCredit ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                                        {b.payment_method}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            {isCredit && (
                                                <div className="flex justify-end gap-2 border-t border-slate-100 pt-2">
                                                    {isCleared ? (
                                                        <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-black uppercase tracking-widest border border-emerald-200 flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> Cleared</span>
                                                    ) : (
                                                        <>
                                                            {tendered > 0 && <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest py-1">Paid: {formatRs(tendered)}</span>}
                                                            <span className="text-[9px] bg-red-50 text-red-600 px-2 py-1 rounded border border-red-100 font-black uppercase tracking-widest">Due: {formatRs(due)}</span>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                            
                                            <div className="flex justify-center -mt-2">
                                                {isExpanded ? <ChevronUp className="w-4 h-4 text-emerald-500"/> : <ChevronDown className="w-4 h-4 text-slate-300"/>}
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-slate-50 border-b-2 border-emerald-100 px-4 py-4 overflow-hidden">
                                                    <div className="space-y-2 mb-4">
                                                        {b.items?.map((item:any, idx:number) => {
                                                            const isCancelled = ['cancelled', 'void'].includes((item.status || '').toLowerCase().trim());
                                                            return (
                                                                <div key={idx} className={`bg-white p-3 rounded-xl border ${isCancelled ? 'border-red-200 bg-red-50/30' : 'border-slate-200'} shadow-sm flex justify-between items-center`}>
                                                                    <div className="flex gap-2.5 items-center">
                                                                        <span className={`font-black text-white ${isCancelled ? 'bg-red-400' : 'bg-slate-800'} w-5 h-5 flex items-center justify-center rounded text-[10px]`}>{item.qty || 1}</span>
                                                                        <div className="flex flex-col">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <span className={`text-[13px] font-bold leading-tight ${isCancelled ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{item.name}</span>
                                                                                {isCancelled && <span className="text-[8px] font-black bg-red-100 text-red-600 px-1 rounded uppercase tracking-widest border border-red-200">Waste</span>}
                                                                            </div>
                                                                            {item.variant && <span className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-widest">{item.variant}</span>}
                                                                        </div>
                                                                    </div>
                                                                    <span className={`text-xs font-black ${isCancelled ? 'text-red-300 line-through' : 'text-slate-900'}`}>{formatRs((item.price || 0) * (item.qty || 1))}</span>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                    
                                                    <div className="bg-white p-4 rounded-xl border border-slate-200 text-[10px] flex flex-col gap-2 shadow-sm">
                                                        <span className="flex justify-between"><strong className="text-slate-400 uppercase tracking-widest">Table</strong> <span className="font-bold text-slate-700">{b.table_no}</span></span>
                                                        {b.customer_name && <span className="flex justify-between"><strong className="text-slate-400 uppercase tracking-widest">Customer</strong> <span className="font-bold text-slate-700">{b.customer_name}</span></span>}
                                                        
                                                        <div className="border-t border-slate-100 mt-2 pt-2 flex flex-col gap-2">
                                                            <span className="flex justify-between"><strong className="text-slate-400 uppercase tracking-widest text-[10px]">Grand Total</strong> <span className="font-bold text-slate-900 text-sm">{formatRs(grandTotal)}</span></span>
                                                            {b.discount > 0 && <span className="flex justify-between"><strong className="text-amber-500 uppercase tracking-widest text-[10px]">Discount</strong> <span className="font-black text-amber-500 text-sm">-{formatRs(b.discount)}</span></span>}
                                                            {b.tendered > 0 && <span className="flex justify-between"><strong className="text-emerald-500 uppercase tracking-widest text-[10px]">Amount Paid</strong> <span className="font-black text-emerald-600 text-sm">{formatRs(b.tendered)}</span></span>}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )
                            })}
                        </div>

                    </motion.div>
                </motion.div>
            ) : null}
        </div>
    );
}