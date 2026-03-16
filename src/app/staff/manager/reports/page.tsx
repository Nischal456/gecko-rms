"use client";

import { useState, useEffect, useMemo } from "react";
import Sidebar from "@/app/staff/manager/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, Wallet, ArrowUpRight, ArrowDownRight,
  BarChart3, Loader2, Award, CreditCard, UserCircle,
  TrendingDown, ShoppingBag, AlertCircle, Download, IndianRupee, Banknote, QrCode, Search, ChevronUp, ChevronDown, Calendar, Table as TableIcon, Layers, ShieldCheck, X, BookOpen, Users,CheckCircle2
} from "lucide-react";
import { getReportData, type ReportRange } from "@/app/actions/reports";
import { getCashierReports, processCreditPayment } from "@/app/actions/cashier"; 
import { getDashboardData } from "@/app/actions/dashboard"; 
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import NepaliDate from 'nepali-date-converter'; 
import { toast } from "sonner";
import React from "react";

// --- CONFIG ---
const NEPALI_MONTHS = ["Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];

// --- UTILS ---
const formatRs = (val: number) => "Rs " + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(val || 0);

const toNepaliDate = (dateStr: string) => {
    try {
        const jsDate = new Date(dateStr);
        const npDate = new NepaliDate(jsDate);
        return `${NEPALI_MONTHS[npDate.getMonth()]} ${npDate.getDate()}`;
    } catch (e) {
        return dateStr;
    }
};

// 100% ACCURATE NEPALI DATE CONVERTER FOR CSV
const toBSFull = (dateStr: string) => { 
    try { 
        const date = new Date(dateStr);
        const bsDate = new NepaliDate(date);
        return bsDate.format('YYYY/MM/DD'); 
    } catch { return "---"; }
};

// Premium CSV Export (STRICTLY Filters out Cancelled/Void Items)
function exportToCSV(transactions: any[], range: string) {
    if(!transactions || transactions.length === 0) return toast.error("No data available to export");
    
    let csv = "ID,Date(AD),Date(BS),Time,Type,Details/Table,Items,Grand Total,Paid Amount,Due Amount,Method,Status,Customer Name,Customer Phone\n";
    
    transactions.forEach((t: any) => {
        const dateObj = new Date(t.date);
        
        // Filter out any internally cancelled items before exporting to ensure perfectly clean data
        const cleanItems = t.items?.filter((i:any) => !['cancelled', 'void'].includes((i.status || '').toLowerCase().trim())) || [];
        const itemsStr = cleanItems.map((i:any) => `${i.qty}x ${i.name.replace(/,/g, '')}`).join(" | ") || "";
        
        const grandTotal = Number(t.amount) || 0;
        const tendered = Number(t.tendered) || 0;
        const due = Number(t.due) || 0;

        const safeDetails = (t.details || '').replace(/"/g, '""');
        const cName = (t.customer?.name || '').replace(/"/g, '""');
        const cPhone = (t.customer?.address || '').replace(/"/g, '""');

        csv += `${t.id},${dateObj.toISOString().split('T')[0]},${toBSFull(t.date)},${dateObj.toLocaleTimeString()},${t.type},"${safeDetails}","${itemsStr}",${grandTotal},${tendered},${due},${t.method},${t.status},"${cName}","${cPhone}"\n`;
    });
    
    const link = document.createElement("a"); 
    link.href = "data:text/csv;charset=utf-8," + encodeURI(csv); 
    link.download = `Gecko_Manager_Ledger_${range}_${new Date().toISOString().split('T')[0]}.csv`; 
    link.click();
    toast.success("Ledger Exported Successfully");
}

// --- CREDIT BOOK MODAL COMPONENT (WITH SEARCH & PAYMENT) ---
function CreditBookModal({ onClose }: { onClose: () => void }) {
    const [data, setData] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    
    // Payment States
    const [payAmount, setPayAmount] = useState<string>("");
    const [isPaying, setIsPaying] = useState(false);

    const loadCredits = async () => {
        setLoading(true);
        const res = await getCashierReports(60);
        if(res.success && res.summary?.creditAccounts) {
            const activeAccounts: any = {};
            for (const [key, val] of Object.entries(res.summary.creditAccounts)) {
                if ((val as any).total > 0) activeAccounts[key] = val;
            }
            setData(activeAccounts);
        } else {
            setData({});
        }
        setLoading(false);
    };

    useEffect(() => { loadCredits(); }, []);

    const allCustomers = Object.keys(data);
    const filteredCustomers = allCustomers.filter(c => {
        const displayName = data[c].displayName || c;
        return displayName.toLowerCase().includes(searchQuery.toLowerCase());
    });
    
    const activeData = selectedCustomer ? data[selectedCustomer] : null;

    const handlePayCredit = async () => {
        if (!selectedCustomer || !activeData) return;
        const amt = Number(payAmount);
        
        if (!amt || amt <= 0) return toast.error("Please enter a valid amount");
        if (amt > activeData.total) return toast.error("Amount exceeds total due balance");

        setIsPaying(true);
        const res = await processCreditPayment(selectedCustomer, amt);
        if (res.success) {
            toast.success(`Successfully cleared Rs ${amt} for ${activeData.displayName}`);
            setPayAmount("");
            if (activeData.total - amt <= 0) setSelectedCustomer(null);
            await loadCredits(); 
        } else {
            toast.error("Payment Failed", { description: res.error || "An error occurred." });
        }
        setIsPaying(false);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-[#f8fafc] w-full max-w-5xl h-[85vh] rounded-[2.5rem] shadow-2xl relative z-10 flex flex-col md:flex-row overflow-hidden border border-slate-200 transform-gpu">
                <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 bg-white/50 backdrop-blur rounded-full flex items-center justify-center text-slate-600 hover:bg-white z-50 shadow-sm transition-all active:scale-95"><X className="w-5 h-5" /></button>
                
                <div className="w-full md:w-1/3 bg-white border-r border-slate-200 flex flex-col h-[40%] md:h-full shrink-0">
                    <div className="p-6 border-b border-slate-100 shrink-0">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-inner"><BookOpen className="w-5 h-5" /></div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Credit Book</h2>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Khata Ledger (60 Days)</p>
                            </div>
                        </div>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                <Search className="w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            </div>
                            <input 
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search customers..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-4 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                        {loading ? <div className="flex justify-center p-10"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div> : 
                         filteredCustomers.length === 0 ? <p className="text-center text-slate-400 text-xs font-bold mt-10">No records found.</p> :
                         filteredCustomers.map((c) => (
                            <button key={c} onClick={() => setSelectedCustomer(c)} className={`w-full text-left p-4 rounded-2xl transition-all ${selectedCustomer === c ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-100'}`}>
                                <p className="font-bold text-sm truncate">{data[c].displayName}</p>
                                <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${selectedCustomer === c ? 'text-blue-200' : 'text-red-500'}`}>Due: {formatRs(data[c].total)}</p>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 p-5 md:p-8 overflow-y-auto custom-scrollbar bg-[#f8fafc] flex flex-col h-[60%] md:h-full relative">
                    {!selectedCustomer || !activeData ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-300 opacity-60">
                            <Users className="w-16 h-16 mb-4" />
                            <p className="font-black text-sm uppercase tracking-widest">Select a customer</p>
                        </div>
                    ) : (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} key={selectedCustomer} className="flex flex-col h-full">
                            <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm mb-6 shrink-0 relative overflow-hidden">
                                <h3 className="text-2xl md:text-3xl font-black text-slate-900 mb-1">{activeData.displayName}</h3>
                                {activeData.phone && <p className="text-xs font-bold text-slate-500 mb-4">{activeData.phone}</p>}
                                
                                <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex justify-between items-center mb-4">
                                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Total Outstanding</span>
                                    <span className="text-2xl font-black text-red-600">{formatRs(activeData.total)}</span>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Record Khata Payment</p>
                                    <div className="flex flex-col md:flex-row gap-3">
                                        <input 
                                            type="number" 
                                            value={payAmount} 
                                            onChange={(e) => setPayAmount(e.target.value)} 
                                            placeholder="Amount (Rs)" 
                                            className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                                        />
                                        <button 
                                            onClick={handlePayCredit}
                                            disabled={isPaying || !payAmount}
                                            className="bg-blue-600 hover:bg-blue-500 text-white font-black text-sm px-6 py-3 rounded-xl shadow-md shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {isPaying ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Clear Dues</>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">Credit Invoices</h4>
                            <div className="space-y-3 pb-safe">
                                {activeData.bills.map((b: any, i: number) => {
                                    if(b.due_amount <= 0) return null;
                                    return (
                                        <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                                            <div className="flex justify-between items-start border-b border-slate-50 pb-3">
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Inv: {b.invoice_no}</p>
                                                    <p className="text-xs font-bold text-slate-600">{toBSFull(b.date)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-sm font-black text-slate-900 block mb-0.5">Total: {formatRs(b.grandTotal)}</span>
                                                    {b.discount > 0 && <span className="text-[9px] font-black text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 inline-block mb-0.5 mt-0.5 shadow-sm">Discount: -{formatRs(b.discount)}</span>}
                                                    {b.tendered > 0 && <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Paid: {formatRs(b.tendered)}</span>}
                                                    <span className="text-xs font-black text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100 inline-block mt-1 shadow-sm">Due: {formatRs(b.due_amount)}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                {b.items.map((it:any, idx:number) => {
                                                    const isCancelled = ['cancelled', 'void'].includes((it.status || '').toLowerCase().trim());
                                                    return (
                                                        <div key={idx} className={`flex justify-between text-[11px] font-medium ${isCancelled ? 'text-red-400 line-through' : 'text-slate-500'}`}>
                                                            <span className="flex items-center gap-1.5">
                                                                {it.qty}x {it.name} {it.variant ? `(${it.variant})` : ''}
                                                                {isCancelled && <span className="text-[8px] bg-red-100 text-red-600 px-1 rounded-sm no-underline border border-red-200 font-black tracking-widest uppercase shadow-sm">Waste</span>}
                                                            </span>
                                                            <span>Rs {it.price * it.qty}</span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

export default function ReportsPage() {
  const [tenant, setTenant] = useState<any>(null);
  const [range, setRange] = useState<ReportRange>("today");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedBill, setExpandedBill] = useState<string | null>(null);
  const [showCreditBook, setShowCreditBook] = useState(false);

  useEffect(() => { loadAllData(); }, [range]);

  async function loadAllData() {
      setLoading(true);
      try {
          const [dashRes, reportRes] = await Promise.all([
              getDashboardData(), 
              getReportData(range)
          ]);

          if (dashRes?.tenant) setTenant(dashRes.tenant);

          const safeReportRes = reportRes as any;

          if (safeReportRes.success && safeReportRes.stats) {
              const nepaliChartData = (safeReportRes.chartData || []).map((d: any) => ({
                  ...d,
                  bsDate: toNepaliDate(d.date),
                  rawDate: d.date 
              }));
              
              setData({ ...safeReportRes, chartData: nepaliChartData });
          } else {
              setData(getEmptyState());
          }
      } catch (e) {
          console.error(e);
          toast.error("Failed to load reports");
          setData(getEmptyState());
      } finally {
          setLoading(false);
      }
  }

  function getEmptyState() {
      return {
          stats: { totalRevenue: 0, totalCreditDue: 0, totalExpense: 0, netProfit: 0, margin: 0, orderCount: 0, revenueTrend: 0 },
          chartData: [],
          paymentMethods: {},
          staffPerformance: {},
          topItems: [],
          transactions: []
      };
  }

  const chartData = data?.chartData || [];
  const topItems = data?.topItems || [];
  const transactions = data?.transactions || [];
  const stats = data?.stats || getEmptyState().stats;
  const paymentMethods = data?.paymentMethods || {};
  const staffPerformance = data?.staffPerformance || {};

  const expenseTransactions = transactions.filter((t: any) => t.type?.toLowerCase().includes('expense'));

  // ZERO-LAG SEARCH ENGINE
  const filteredTransactions = useMemo(() => {
      return transactions.filter((t: any) => {
          const matchesSearch = t.id?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                t.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                t.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                t.method?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (t.customer?.name && t.customer.name.toLowerCase().includes(searchTerm.toLowerCase()));
          return matchesSearch;
      });
  }, [transactions, searchTerm]);

  // TYPE-SAFE Hardware Accelerated Animations
  const containerVars = { 
      hidden: { opacity: 0 }, 
      show: { opacity: 1, transition: { staggerChildren: 0.05 } } 
  };
  const itemVars: any = { 
      hidden: { opacity: 0, y: 15 }, 
      show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } } 
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden relative">
      <AnimatePresence>{showCreditBook && <CreditBookModal onClose={() => {setShowCreditBook(false); loadAllData();}} />}</AnimatePresence>

      <Sidebar tenantName={tenant?.name} tenantCode={tenant?.code} logo={tenant?.logo_url} />
      
      <main className="flex-1 flex flex-col h-full overflow-y-auto pb-[140px] md:pb-8 relative custom-scrollbar transform-gpu">
        
        {/* HEADER */}
        <header className="px-4 md:px-8 py-5 md:py-6 bg-white/85 backdrop-blur-2xl border-b border-slate-200/60 sticky top-0 z-30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm transform-gpu">
            <div>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    Financial Command
                </h1>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Profit & Loss Analytics</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="bg-slate-100 p-1 rounded-xl flex overflow-x-auto no-scrollbar w-full md:w-auto shadow-inner">
                    {[ {k:"today",l:"Today"}, {k:"7d",l:"7 Days"}, {k:"30d",l:"1 Month"}, {k:"90d",l:"3 Months"}, {k:"1y",l:"1 Year"} ].map((opt) => (
                        <button 
                            key={opt.k} 
                            onClick={() => setRange(opt.k as ReportRange)}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap active:scale-95 ${range === opt.k ? 'bg-white shadow-md text-emerald-600 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'}`}
                        >
                            {opt.l}
                        </button>
                    ))}
                </div>
                
                {/* CREDIT BOOK BUTTON */}
                <button onClick={() => setShowCreditBook(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-50 text-blue-600 px-4 py-2.5 rounded-xl border border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm group">
                    <BookOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">Credit Ledger</span>
                </button>

                <button 
                    onClick={() => exportToCSV(transactions, range)}
                    disabled={transactions.length === 0}
                    className="hidden md:flex h-10 px-5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest items-center justify-center gap-2 hover:bg-emerald-600 shadow-lg hover:shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Download className="w-4 h-4" /> Export Ledger
                </button>
            </div>
        </header>

        {/* CONTENT */}
        <div className="p-4 md:p-8">
            {loading ? (
                <div className="h-[60vh] flex flex-col items-center justify-center text-emerald-500">
                    <Loader2 className="w-12 h-12 animate-spin mb-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 animate-pulse">Compiling Ledger...</span>
                </div>
            ) : (
                <motion.div variants={containerVars} initial="hidden" animate="show" className="space-y-6 md:space-y-8">
                    
                    {/* 1. KEY METRICS */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
                        <StatCard title="Actual Received" value={formatRs(stats.totalRevenue)} icon={Banknote} color="emerald" trend={`${stats.revenueTrend > 0 ? '+' : ''}${stats.revenueTrend || 0}%`} isHighlight={true} />
                        <StatCard title="Khata/Credit Due" value={formatRs(stats.totalCreditDue)} icon={BookOpen} color="blue" trend="Floating Out" />
                        <StatCard title="Net Profit" value={formatRs(stats.netProfit)} icon={Wallet} color="emerald" trend={`${stats.margin || 0}% Margin`} />
                        <StatCard title="Total Expenses" value={formatRs(stats.totalExpense)} icon={ArrowDownRight} color="red" trend={`${Math.round(((stats.totalExpense || 0) / (stats.totalRevenue || 1)) * 100)}% Ratio`} />
                        <StatCard title="Total Volume" value={stats.orderCount} icon={ShoppingBag} color="orange" trend="Transactions" />
                    </div>

                    {/* 2. CHARTS & SPLITS ROW */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6 h-auto lg:h-[400px]">
                        
                        {/* REVENUE VS EXPENSES */}
                        <motion.div variants={itemVars} className="lg:col-span-2 bg-white p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col hover:border-emerald-100 transition-colors group">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-black text-lg text-slate-900 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-500" /> Performance History</h3>
                                <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wide">
                                    <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100"/> Income</span>
                                    <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-100"/> Expense</span>
                                </div>
                            </div>
                            <div className="flex-1 w-full min-h-[250px]">
                                {chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                            <XAxis dataKey="bsDate" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94A3B8', fontWeight: 'bold'}} dy={10} minTickGap={20} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94A3B8', fontWeight: 'bold'}} tickFormatter={(v) => `Rs ${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`} />
                                            <Tooltip 
                                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)', fontFamily: 'inherit' }}
                                                cursor={{ fill: '#F8FAFC' }}
                                                formatter={(val: any) => formatRs(Number(val || 0))}
                                                labelStyle={{ fontWeight: '900', color: '#0F172A', marginBottom: '8px' }}
                                            />
                                            <Bar dataKey="revenue" name="Revenue" fill="#10B981" radius={[6, 6, 0, 0]} barSize={24} />
                                            <Bar dataKey="expense" name="Expense" fill="#EF4444" radius={[6, 6, 0, 0]} barSize={24} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100">
                                        <AlertCircle className="w-10 h-10 mb-3 opacity-30" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">No Transaction Data</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* PAYMENT METHODS & STAFF BREAKDOWN */}
                        <motion.div variants={itemVars} className="flex flex-col gap-5 md:gap-6 overflow-y-auto custom-scrollbar">
                            
                            {/* Payment Methods */}
                            <div className="bg-white p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm flex-1 hover:shadow-lg transition-all duration-300">
                                <h3 className="font-black text-base text-slate-900 mb-4 flex items-center gap-2"><QrCode className="w-4 h-4 text-indigo-500" /> Payment Split</h3>
                                <div className="space-y-2.5">
                                    {Object.keys(paymentMethods).length > 0 ? (
                                        Object.entries(paymentMethods).sort((a:any, b:any) => b[1] - a[1]).map(([method, amount]: any, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-slate-50/80 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${method==='Cash'?'bg-emerald-100 text-emerald-600':method.includes('QR')?'bg-purple-100 text-purple-600':method==='Credit'?'bg-blue-100 text-blue-600':'bg-slate-200 text-slate-600'}`}>
                                                        {method==='Cash'?<Banknote className="w-4 h-4"/>:method.includes('QR')?<QrCode className="w-4 h-4"/>:method==='Credit'?<BookOpen className="w-4 h-4"/>:<CreditCard className="w-4 h-4"/>}
                                                    </div>
                                                    <span className="font-bold text-slate-700 capitalize text-xs">{method}</span>
                                                </div>
                                                <span className="font-black text-slate-900 text-xs md:text-sm">{formatRs(amount)}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 py-6 italic bg-slate-50 rounded-xl">No payments</div>
                                    )}
                                </div>
                            </div>

                            {/* Staff Performance */}
                            {Object.keys(staffPerformance).length > 0 && (
                                <div className="bg-white p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm flex-1 hover:shadow-lg transition-all duration-300">
                                    <h3 className="font-black text-base text-slate-900 mb-4 flex items-center gap-2"><UserCircle className="w-4 h-4 text-orange-500" /> Top Performers</h3>
                                    <div className="space-y-2">
                                        {Object.entries(staffPerformance).sort((a:any, b:any) => b[1] - a[1]).slice(0,3).map(([staff, amount]: any, i) => (
                                            <div key={i} className="flex items-center justify-between text-xs p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center text-[10px] font-black uppercase">
                                                        {staff.charAt(0)}
                                                    </div>
                                                    <span className="font-bold text-slate-700">{staff}</span>
                                                </div>
                                                <span className="font-black text-slate-900">{formatRs(amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>

                    {/* 3. DETAILS ROW */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
                        
                        {/* TOP ITEMS */}
                        <motion.div variants={itemVars} className="bg-white p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm">
                            <h3 className="font-black text-slate-900 mb-6 flex items-center gap-2"><Award className="w-5 h-5 text-amber-500" /> Best Sellers</h3>
                            <div className="space-y-5">
                                {topItems.length > 0 ? (
                                    topItems.map((item: any, i: number) => (
                                        <div key={i} className="flex items-center gap-4 group">
                                            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center font-black text-sm text-slate-400 group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors">#{i+1}</div>
                                            <div className="flex-1">
                                                <div className="flex justify-between mb-2">
                                                    <span className="font-bold text-slate-900 text-sm">{item.name}</span>
                                                    <span className="font-black text-slate-500 text-xs bg-slate-100 px-2 py-0.5 rounded-md">{item.qty} sold</span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                                                    <motion.div initial={{ width: 0 }} animate={{ width: `${(item.sales / (topItems[0]?.sales || 1)) * 100}%` }} className="h-full bg-emerald-500 rounded-full" />
                                                </div>
                                            </div>
                                            <span className="text-sm font-black text-slate-900 min-w-[70px] text-right">{formatRs(item.sales)}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-slate-400 py-10 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100">
                                        <span className="text-[10px] font-bold uppercase tracking-widest">No sales data found.</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* RECENT EXPENSES */}
                        <motion.div variants={itemVars} className="bg-white p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-black text-slate-900 flex items-center gap-2"><TrendingDown className="w-5 h-5 text-red-500" /> Recent Expenses</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 max-h-[350px] pr-2">
                                {expenseTransactions.length > 0 ? (
                                    expenseTransactions.map((pay: any, i: number) => (
                                        <div key={i} className="flex justify-between items-center p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400">
                                                    <CreditCard className="w-4 h-4 md:w-5 md:h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 text-xs md:text-sm leading-tight capitalize">{pay.details || "General Expense"}</p>
                                                    <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{toNepaliDate(pay.date)}</p>
                                                </div>
                                            </div>
                                            <span className="font-black text-red-500 text-base md:text-lg">-{formatRs(pay.amount)}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-40 text-slate-400 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100">
                                        <CreditCard className="w-10 h-10 mb-3 opacity-30" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">No expenses recorded</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                    </div>

                    {/* 4. MASTER LEDGER (TRANSACTIONS) */}
                    <motion.div variants={itemVars} className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden transform-gpu">
                        
                        {/* Table Controls */}
                        <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-gradient-to-b from-slate-50/50 to-white">
                            <div>
                                <h3 className="font-black text-lg text-slate-900 flex items-center gap-2"><Layers className="w-5 h-5 text-blue-500"/> Master Ledger</h3>
                                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Combined Bills & Manual Logs</p>
                            </div>
                            <div className="relative w-full md:w-80 group">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors"/>
                                <input 
                                    value={searchTerm} 
                                    onChange={e=>setSearchTerm(e.target.value)} 
                                    placeholder="Search records..." 
                                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                                />
                                {searchTerm && <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" /></button>}
                            </div>
                        </div>

                        {/* DESKTOP VIEW */}
                        <div className="hidden md:block overflow-x-auto pb-6">
                            <table className="w-full text-left">
                                <thead className="bg-white text-slate-400 uppercase text-[10px] font-black tracking-widest border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-5 whitespace-nowrap">Reference</th>
                                        <th className="px-6 py-5 whitespace-nowrap">Date / Info</th>
                                        <th className="px-6 py-5 whitespace-nowrap">Method</th>
                                        <th className="px-6 py-5 text-right whitespace-nowrap">Financials</th>
                                        <th className="px-6 py-5"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {filteredTransactions.length === 0 ? (
                                        <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold">No records found.</td></tr>
                                    ) : filteredTransactions.map((tx:any, i:number) => {
                                        const isExpanded = expandedBill === tx.id;
                                        const isIncome = tx.type.includes('Income') || tx.type.includes('POS');
                                        const isExpense = tx.type === 'Manual Expense';
                                        const isCleared = tx.method === 'Credit' && tx.due <= 0;
                                        
                                        return (
                                            <React.Fragment key={i}>
                                                <tr onClick={() => setExpandedBill(isExpanded ? null : tx.id)} className={`transition-colors cursor-pointer border-l-4 ${isExpanded ? 'bg-slate-50 border-l-emerald-500' : 'hover:bg-slate-50/50 border-l-transparent'}`}>
                                                    <td className="px-6 py-5 font-black text-slate-700 font-mono text-[11px] tracking-wide">{tx.id.slice(0,8)}...</td>
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="font-bold text-slate-900">{tx.details}</span>
                                                            <span className="text-[10px] font-bold text-slate-500">{toNepaliDate(tx.date)} • {new Date(tx.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col items-start gap-1">
                                                            <span className={`px-2 py-1.5 rounded-lg text-[9px] font-black tracking-widest uppercase border whitespace-nowrap ${isIncome ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                                                {tx.type}
                                                            </span>
                                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 border border-slate-200`}>
                                                                {tx.method}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className={`px-6 py-5 text-right flex flex-col items-end justify-center min-h-[60px]`}>
                                                        <span className={`font-black text-base whitespace-nowrap ${isExpense ? 'text-red-500' : 'text-emerald-600'}`}>
                                                            {isExpense ? '-' : '+'} {formatRs(tx.amount)}
                                                        </span>
                                                        {tx.method === 'Credit' && !isCleared && (
                                                            <div className="flex flex-col items-end mt-0.5">
                                                                {tx.tendered > 0 && <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Paid: {formatRs(tx.tendered)}</span>}
                                                                <span className="text-[9px] bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100 font-black uppercase tracking-widest shadow-sm">Due: {formatRs(tx.due)}</span>
                                                            </div>
                                                        )}
                                                        {isCleared && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-black uppercase tracking-widest flex items-center gap-1 mt-1"><ShieldCheck className="w-3 h-3"/> Cleared</span>}
                                                    </td>
                                                    <td className="px-6 py-5 text-right">
                                                        {(tx.items?.length > 0 || tx.note || tx.customer?.name) && (
                                                            <div className={`p-2 rounded-full inline-flex transition-colors ${isExpanded ? 'bg-slate-200 text-slate-600' : 'group-hover:bg-slate-200 text-slate-400'}`}>
                                                                {isExpanded ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                                <AnimatePresence>
                                                    {isExpanded && (tx.items?.length > 0 || tx.note || tx.customer?.name) && (
                                                        <motion.tr initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-slate-50/80 border-b-2 border-slate-200">
                                                            <td colSpan={5} className="px-6 py-6">
                                                                
                                                                {/* IF POS BILL */}
                                                                {tx.items?.length > 0 && (
                                                                    <div className="grid grid-cols-4 gap-4 mb-4">
                                                                        {tx.items.map((item:any, idx:number) => {
                                                                            const isCancelled = ['cancelled', 'void'].includes((item.status || '').toLowerCase().trim());
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
                                                                )}
                                                                
                                                                <div className="pt-4 border-t border-slate-200 flex flex-wrap gap-4">
                                                                    <div className="bg-white p-4 rounded-2xl border border-slate-200 text-xs flex gap-6 shadow-sm">
                                                                        {tx.details && (
                                                                            <div className="flex flex-col gap-1">
                                                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Table / Ref</span>
                                                                                <span className="font-bold text-slate-700">{tx.details}</span>
                                                                            </div>
                                                                        )}
                                                                        {tx.note && (
                                                                            <>
                                                                                <div className="w-px bg-slate-100" />
                                                                                <div className="flex flex-col gap-1">
                                                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Notes</span>
                                                                                    <span className="font-bold text-slate-700">{tx.note}</span>
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                        {tx.customer?.name && (
                                                                            <>
                                                                                <div className="w-px bg-slate-100" />
                                                                                <div className="flex flex-col gap-1">
                                                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Customer</span>
                                                                                    <span className="font-bold text-slate-700">{tx.customer.name} {tx.customer.address ? `(${tx.customer.address})` : ''}</span>
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center gap-6 shadow-lg ml-auto">
                                                                        <div className="flex flex-col text-right">
                                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Grand Total</span>
                                                                            <span className="font-bold text-sm">{formatRs(tx.amount)}</span>
                                                                        </div>
                                                                        {tx.discount > 0 && (
                                                                            <>
                                                                                <div className="w-px h-full bg-slate-700" />
                                                                                <div className="flex flex-col text-right">
                                                                                    <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Discount</span>
                                                                                    <span className="font-bold text-sm text-amber-400">-{formatRs(tx.discount)}</span>
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                        {tx.tendered > 0 && (
                                                                            <>
                                                                                <div className="w-px h-full bg-slate-700" />
                                                                                <div className="flex flex-col text-right">
                                                                                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Amount Paid</span>
                                                                                    <span className="font-black text-lg text-emerald-400">{formatRs(tx.tendered)}</span>
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

                        {/* MOBILE VIEW */}
                        <div className="md:hidden divide-y divide-slate-100">
                            {filteredTransactions.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 font-bold">No records found.</div>
                            ) : filteredTransactions.map((tx:any, i:number) => {
                                const isExpanded = expandedBill === tx.id;
                                const isIncome = tx.type.includes('Income') || tx.type.includes('POS');
                                const isCleared = tx.method === 'Credit' && tx.due <= 0;

                                return (
                                    <div key={i} className="flex flex-col">
                                        <div onClick={() => setExpandedBill(isExpanded ? null : tx.id)} className={`p-4 flex flex-col gap-3 transition-colors ${isExpanded ? 'bg-slate-50' : 'active:bg-slate-50'}`}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="font-black text-slate-900 text-base capitalize">{tx.details}</span>
                                                    <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                        <Calendar className="w-3 h-3" /> {toNepaliDate(tx.date)}
                                                    </div>
                                                </div>
                                                <div className="text-right flex flex-col items-end">
                                                    <span className={`font-black text-base ${isIncome ? 'text-emerald-600' : 'text-red-500'}`}>{isIncome ? '+' : '-'} {formatRs(tx.amount)}</span>
                                                    {tx.method === 'Credit' && (
                                                        <div className="mt-1 flex flex-col items-end">
                                                            {isCleared ? (
                                                                <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-black uppercase tracking-widest border border-emerald-200 flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> Cleared</span>
                                                            ) : (
                                                                <>
                                                                    {tx.tendered > 0 && <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Paid: {formatRs(tx.tendered)}</span>}
                                                                    <span className="text-[9px] bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100 font-black uppercase tracking-widest shadow-sm">Due: {formatRs(tx.due)}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center border-t border-slate-100 pt-2">
                                                <div className="flex gap-2">
                                                    <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${isIncome ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>{tx.type}</span>
                                                    <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded text-[9px] font-bold uppercase border border-slate-200">{tx.method}</span>
                                                </div>
                                                {(tx.items?.length > 0 || tx.note || tx.customer?.name) && (
                                                    isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500"/> : <ChevronDown className="w-4 h-4 text-slate-300"/>
                                                )}
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {isExpanded && (tx.items?.length > 0 || tx.note || tx.customer?.name) && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-slate-50 border-b-2 border-slate-200 px-4 py-4 overflow-hidden">
                                                    
                                                    <div className="mb-3">
                                                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">ID: {tx.id.split('-')[1] || tx.id}</span>
                                                    </div>

                                                    {tx.items?.length > 0 && (
                                                        <div className="space-y-2 mb-4">
                                                            {tx.items.map((item:any, idx:number) => {
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
                                                    )}

                                                    <div className="bg-white p-4 rounded-xl border border-slate-200 text-[10px] flex flex-col gap-2 shadow-sm">
                                                        {tx.note && <span className="flex flex-col"><strong className="text-slate-400 uppercase tracking-widest text-[9px] mb-1">Description / Notes</strong> <span className="font-bold text-slate-700 leading-relaxed">{tx.note}</span></span>}
                                                        {tx.customer?.name && <span className="flex justify-between mt-2 pt-2 border-t border-slate-100"><strong className="text-slate-400 uppercase tracking-widest text-[9px]">Customer</strong> <span className="font-bold text-slate-700">{tx.customer.name}</span></span>}
                                                        {tx.customer?.address && <span className="flex justify-between"><strong className="text-slate-400 uppercase tracking-widest text-[9px]">Details</strong> <span className="font-bold text-slate-700">{tx.customer.address}</span></span>}
                                                        
                                                        <div className="border-t border-slate-100 mt-2 pt-2 flex flex-col gap-2">
                                                            <span className="flex justify-between"><strong className="text-slate-400 uppercase tracking-widest text-[10px]">Grand Total</strong> <span className="font-bold text-slate-900 text-sm">{formatRs(tx.amount)}</span></span>
                                                            {tx.discount > 0 && <span className="flex justify-between"><strong className="text-amber-500 uppercase tracking-widest text-[10px]">Discount</strong> <span className="font-black text-amber-500 text-sm">-{formatRs(tx.discount)}</span></span>}
                                                            {tx.tendered > 0 && <span className="flex justify-between"><strong className="text-emerald-500 uppercase tracking-widest text-[10px]">Amount Paid</strong> <span className="font-black text-emerald-600 text-sm">{formatRs(tx.tendered)}</span></span>}
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
            )}
        </div>

        {/* MOBILE EXPORT BUTTON */}
        <div className="md:hidden fixed bottom-[90px] right-4 z-40">
            <button 
                onClick={() => exportToCSV(transactions, range)}
                disabled={transactions.length === 0}
                className="w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.3)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
            >
                <Download className="w-6 h-6" />
            </button>
        </div>

      </main>
    </div>
  );
}

// PREMIUM STAT CARD
function StatCard({ title, value, icon: Icon, color, trend, isHighlight = false }: any) {
    const styles: any = {
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        red: "bg-red-50 text-red-600 border-red-100",
        orange: "bg-orange-50 text-orange-600 border-orange-100"
    };

    const isCurrency = typeof value === 'string' && value.startsWith('Rs');
    const valString = isCurrency ? value.replace('Rs ', '') : value;

    return (
        <motion.div 
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} 
            className={`p-5 md:p-6 rounded-[2rem] border shadow-xl hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden ${isHighlight ? 'bg-slate-900 border-slate-800 shadow-slate-900/20' : 'bg-white border-slate-100 shadow-slate-200/30'}`}
        >
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={`w-11 h-11 md:w-14 md:h-14 rounded-[1.2rem] flex items-center justify-center border shadow-inner ${isHighlight ? 'bg-white/10 text-white border-white/10' : styles[color]}`}>
                    <Icon className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <span className={`text-[9px] font-black px-2 py-1.5 rounded-lg flex items-center gap-1 uppercase tracking-widest ${isHighlight ? 'bg-white/10 text-slate-300' : styles[color]}`}>
                    {color === 'red' ? <ArrowDownRight className="w-3 h-3" /> : (color === 'emerald' && title !== 'Net Profit' ? <ArrowUpRight className="w-3 h-3" /> : '')} {trend}
                </span>
            </div>
            <div className="relative z-10">
                <h4 className={`text-[10px] md:text-xs font-black uppercase tracking-widest mb-1.5 ${isHighlight ? 'text-slate-400' : 'text-slate-400'}`}>{title}</h4>
                <div className="flex items-baseline gap-1.5">
                    {isCurrency && <span className={`text-sm font-black opacity-70 ${isHighlight ? 'text-white' : styles[color].split(' ')[1]}`}>Rs</span>}
                    <p className={`text-3xl md:text-4xl font-black tracking-tighter truncate leading-none ${isHighlight ? 'text-white' : 'text-slate-900'}`}>{valString}</p>
                </div>
            </div>
        </motion.div>
    )
}