"use client";
import { useState, useEffect } from "react";
import { getCashierReports } from "@/app/actions/cashier"; 
import { Loader2, CheckCircle2, Banknote, QrCode, UserCircle, Search, Download, ChevronUp, ChevronDown, Calendar, ArrowRight, Table as TableIcon } from "lucide-react";
import React from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import NepaliDate from 'nepali-date-converter'; // CRITICAL FIX: Using actual library instead of manual calculation

const formatRs = (amount: number) => "Rs " + new Intl.NumberFormat('en-NP').format(amount);

// --- 100% ACCURATE NEPALI DATE CONVERTER ---
const toBS = (dateStr: string) => { 
    try { 
        const date = new Date(dateStr);
        const bsDate = new NepaliDate(date);
        return bsDate.format('YYYY/MM/DD'); 
    } catch { return "---"; }
};

// Premium CSV Export
function exportToCSV(bills: any[], range: number) {
    if(!bills || bills.length === 0) return toast.error("No data available to export");
    
    let csv = "Bill Number,Date(AD),Date(BS),Time,Table,Items,Total,Method,Served By,Customer Name,Customer Address\n";
    
    bills.forEach((b: any) => {
        const displayBill = b.bill_no || b.invoice_no || "N/A";
        // Clean items for CSV cell
        const items = b.items?.map((i:any) => `${i.qty}x ${i.name.replace(/,/g, '')}`).join(" | ") || "";
        csv += `${displayBill},${b.date.split('T')[0]},${toBS(b.date)},${b.time || ''},${b.table_no},"${items}",${b.grandTotal},${b.payment_method},${b.served_by || 'Cashier'},"${b.customer_name||''}","${b.customer_address||''}"\n`;
    });
    
    const link = document.createElement("a"); 
    link.href = "data:text/csv;charset=utf-8," + encodeURI(csv); 
    const rangeText = range === 1 ? 'Today' : `${range}_Days`;
    link.download = `Gecko_Report_${rangeText}_${new Date().toISOString().split('T')[0]}.csv`; 
    link.click();
    toast.success("Report Exported Successfully");
}

export default function ReportsView({ data }: any) {
    // 1 Day = strictly today's shift
    const [range, setRange] = useState(1);
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedBill, setExpandedBill] = useState<string | null>(null);

    useEffect(() => { 
        load(range); 
    }, [range]);

    async function load(d: number) { 
        setLoading(true); 
        // 0 days technically fetches exactly today's date in our backend logic when subtracting
        const fetchDays = d === 1 ? 0 : d; 
        const res = await getCashierReports(fetchDays); 
        if(res.success) setReport(res); 
        setLoading(false); 
    }

    const filteredBills = report?.bills?.filter((b: any) => {
        const displayBill = b.bill_no || b.invoice_no || "";
        return displayBill.toLowerCase().includes(searchTerm.toLowerCase()) ||
               b.table_no?.toLowerCase().includes(searchTerm.toLowerCase())
    }) || [];

    // Animation Variants
    const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
    const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto bg-[#F8FAFC] pb-[140px] custom-scrollbar">
            
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        Business Reports
                    </h1>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Export & Analytics</p>
                </div>
                
                {/* DATE RANGE SELECTOR (Scrollable on mobile) */}
                <div className="flex gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 overflow-x-auto w-full md:w-auto no-scrollbar">
                    {[1, 7, 30, 90].map(d => (
                        <button 
                            key={d} 
                            onClick={() => setRange(d)} 
                            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${range === d ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 transform scale-105' : 'text-slate-500 hover:bg-emerald-50 hover:text-emerald-700'}`}
                        >
                            {d === 1 ? 'Today' : `${d} Days`}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="h-[60vh] flex flex-col items-center justify-center">
                    <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mb-4" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Compiling Ledger...</p>
                </div>
            ) : report ? (
                <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 md:space-y-8">
                    
                    {/* TOP STAT CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                        <motion.div variants={itemVariants} className="bg-gradient-to-br from-emerald-600 to-teal-800 p-6 md:p-8 rounded-[2.5rem] text-white shadow-2xl shadow-emerald-600/20 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                            <div className="relative z-10">
                                <p className="text-emerald-100 text-[10px] md:text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2"><Banknote className="w-4 h-4"/> Total Revenue</p>
                                <h2 className="text-4xl md:text-5xl font-black tracking-tighter">{formatRs(report.summary.total)}</h2>
                                <p className="mt-4 text-emerald-100 text-xs font-bold flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-white" /> {report.summary.count} Successful Bills</p>
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants} className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100">
                            <p className="text-slate-400 text-[10px] md:text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2"><QrCode className="w-4 h-4 text-indigo-500"/> Payment Split</p>
                            <div className="space-y-3">
                                {Object.entries(report.summary.byMethod || {}).map(([k,v]:any) => (
                                    <div key={k} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded-lg transition-colors">
                                        <span className="font-bold text-slate-700 capitalize text-sm">{k}</span>
                                        <span className="font-black text-slate-900">{formatRs(v)}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants} className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100">
                            <p className="text-slate-400 text-[10px] md:text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2"><UserCircle className="w-4 h-4 text-orange-500"/> Top Staff</p>
                            <div className="space-y-3 max-h-32 overflow-y-auto custom-scrollbar">
                                {Object.entries(report.summary.byStaff || {}).map(([k,v]:any) => (
                                    <div key={k} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded-lg transition-colors">
                                        <span className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 text-[10px] flex items-center justify-center text-slate-500">{k.charAt(0)}</div>
                                            {k}
                                        </span>
                                        <span className="font-black text-slate-900 text-sm">{formatRs(v)}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* BILL HISTORY SECTION */}
                    <motion.div variants={itemVariants} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                        
                        {/* Table Controls */}
                        <div className="p-5 md:p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
                            <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-200 w-full md:w-96 shadow-sm focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
                                <Search className="w-5 h-5 text-slate-400 shrink-0" />
                                <input placeholder="Search bill no or table..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-transparent outline-none font-bold text-sm w-full text-slate-700 placeholder:text-slate-400" />
                            </div>
                            <button onClick={() => exportToCSV(report.bills, range)} className="w-full md:w-auto px-6 py-3.5 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2 hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/30 transition-all active:scale-95">
                                <Download className="w-4 h-4" /> Export Ledger
                            </button>
                        </div>

                        {/* DESKTOP VIEW: Traditional Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white text-slate-400 uppercase text-[10px] font-black tracking-widest border-b border-slate-100">
                                    <tr>
                                        <th className="px-8 py-5">Bill No.</th>
                                        <th className="px-8 py-5">Date</th>
                                        <th className="px-8 py-5">Table</th>
                                        <th className="px-8 py-5">Method</th>
                                        <th className="px-8 py-5 text-right">Amount</th>
                                        <th className="px-8 py-5"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {filteredBills.length === 0 ? (
                                        <tr><td colSpan={6} className="px-8 py-12 text-center text-slate-400 font-bold">No bills found for this period.</td></tr>
                                    ) : filteredBills.map((b:any, i:number) => {
                                        const displayBill = b.bill_no || b.invoice_no || "---";
                                        const isExpanded = expandedBill === displayBill;
                                        return (
                                            <React.Fragment key={i}>
                                                <tr onClick={() => setExpandedBill(isExpanded ? null : displayBill)} className={`transition-colors cursor-pointer group ${isExpanded ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}`}>
                                                    <td className="px-8 py-5 font-black text-slate-900">{displayBill}</td>
                                                    <td className="px-8 py-5 font-medium text-slate-500">{toBS(b.date)}</td>
                                                    <td className="px-8 py-5"><span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-black tracking-wide border border-slate-200">{b.table_no}</span></td>
                                                    <td className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">{b.payment_method}</td>
                                                    <td className="px-8 py-5 text-right font-black text-emerald-600">{formatRs(b.grandTotal)}</td>
                                                    <td className="px-8 py-5 text-right">
                                                        <div className={`p-2 rounded-full inline-flex transition-colors ${isExpanded ? 'bg-emerald-100 text-emerald-600' : 'group-hover:bg-slate-200 text-slate-400'}`}>
                                                            {isExpanded ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                                                        </div>
                                                    </td>
                                                </tr>
                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.tr initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-slate-50/80 border-b-2 border-emerald-100">
                                                            <td colSpan={6} className="px-8 py-6">
                                                                <div className="grid grid-cols-4 gap-4 mb-4">
                                                                    {b.items?.map((item:any, idx:number) => (
                                                                        <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col hover:border-emerald-200 transition-colors">
                                                                            <div className="flex justify-between items-start mb-2">
                                                                                <span className="font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md text-[10px]">{item.qty}x</span>
                                                                                <span className="text-xs font-bold text-emerald-600">{formatRs(item.price)}</span>
                                                                            </div>
                                                                            <span className="text-sm font-bold text-slate-700 leading-tight">{item.name}</span>
                                                                            {item.variant && <span className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wider">{item.variant}</span>}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                {(b.customer_name || b.customer_address) && (
                                                                    <div className="pt-4 border-t border-slate-200 flex gap-8 text-xs font-medium text-slate-500 bg-white p-4 rounded-2xl">
                                                                        {b.customer_name && <span><strong className="text-slate-900 font-black uppercase tracking-widest text-[10px] block mb-1">Customer</strong> {b.customer_name}</span>}
                                                                        {b.customer_address && <span><strong className="text-slate-900 font-black uppercase tracking-widest text-[10px] block mb-1">Address/PAN</strong> {b.customer_address}</span>}
                                                                    </div>
                                                                )}
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
                                <div className="p-8 text-center text-slate-400 font-bold">No bills found.</div>
                            ) : filteredBills.map((b:any, i:number) => {
                                const displayBill = b.bill_no || b.invoice_no || "---";
                                const isExpanded = expandedBill === displayBill;
                                return (
                                    <div key={i} className="flex flex-col">
                                        {/* Mobile Card Header */}
                                        <div onClick={() => setExpandedBill(isExpanded ? null : displayBill)} className={`p-5 flex flex-col gap-3 transition-colors ${isExpanded ? 'bg-emerald-50/50' : 'active:bg-slate-50'}`}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="font-black text-slate-900 text-lg">{displayBill}</span>
                                                    <div className="flex items-center gap-2 mt-1 text-xs font-bold text-slate-400">
                                                        <Calendar className="w-3.5 h-3.5" /> {toBS(b.date)}
                                                    </div>
                                                </div>
                                                <span className="font-black text-emerald-600 text-lg">{formatRs(b.grandTotal)}</span>
                                            </div>
                                            <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                                                <div className="flex gap-2">
                                                    <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[10px] font-black border border-slate-200 flex items-center gap-1"><TableIcon className="w-3 h-3"/> {b.table_no}</span>
                                                    <span className="bg-slate-50 text-slate-500 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border border-slate-100">{b.payment_method}</span>
                                                </div>
                                                {isExpanded ? <ChevronUp className="w-5 h-5 text-emerald-500"/> : <ChevronDown className="w-5 h-5 text-slate-300"/>}
                                            </div>
                                        </div>

                                        {/* Mobile Card Expanded Details */}
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-slate-50 border-b-2 border-emerald-100 px-4 py-4 overflow-hidden">
                                                    <div className="space-y-3 mb-4">
                                                        {b.items?.map((item:any, idx:number) => (
                                                            <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                                                                <div className="flex gap-3 items-center">
                                                                    <span className="font-black text-white bg-slate-900 w-6 h-6 flex items-center justify-center rounded-lg text-[10px]">{item.qty}</span>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-sm font-bold text-slate-800 leading-tight">{item.name}</span>
                                                                        {item.variant && <span className="text-[9px] text-slate-400 font-medium uppercase mt-0.5">{item.variant}</span>}
                                                                    </div>
                                                                </div>
                                                                <span className="text-xs font-black text-slate-900">{formatRs(item.price * item.qty)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {(b.customer_name || b.customer_address) && (
                                                        <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs flex flex-col gap-2">
                                                            {b.customer_name && <span className="flex justify-between"><strong className="text-slate-400 uppercase tracking-widest text-[9px]">Customer</strong> <span className="font-bold text-slate-700">{b.customer_name}</span></span>}
                                                            {b.customer_address && <span className="flex justify-between"><strong className="text-slate-400 uppercase tracking-widest text-[9px]">Details</strong> <span className="font-bold text-slate-700">{b.customer_address}</span></span>}
                                                        </div>
                                                    )}
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