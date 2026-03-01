"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/app/staff/manager/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, Wallet, ArrowUpRight, ArrowDownRight,
  BarChart3, Loader2, Award, CreditCard, UserCircle,
  TrendingDown, ShoppingBag, AlertCircle, Download, IndianRupee, Banknote, QrCode, Search, ChevronUp, ChevronDown, Calendar, Table as TableIcon, Layers
} from "lucide-react";
import { getReportData, type ReportRange } from "@/app/actions/reports";
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

export default function ReportsPage() {
  const [tenant, setTenant] = useState<any>(null);
  const [range, setRange] = useState<ReportRange>("today");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedBill, setExpandedBill] = useState<string | null>(null);

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
          stats: { totalRevenue: 0, totalExpense: 0, netProfit: 0, margin: 0, orderCount: 0, revenueTrend: 0 },
          chartData: [],
          paymentMethods: {},
          staffPerformance: {},
          topItems: [],
          transactions: []
      };
  }

  const handleExportCSV = () => {
      const txs = data?.transactions || [];
      if (!txs || txs.length === 0) {
          return toast.error("No data available to export");
      }

      const headers = ["Reference ID", "Date (AD)", "Date (BS)", "Type", "Details/Category", "Payment Method", "Items/Notes", "Total (Rs)", "Customer"];
      
      const rows = txs.map((b: any) => {
          const itemsStr = b.items && b.items.length > 0 
              ? b.items.map((i:any) => `${i.qty||1}x ${i.name?.replace(/,/g, '')}`).join(" | ") 
              : b.note || "";
              
          const customerStr = b.customer?.name ? `${b.customer.name} (${b.customer.address||''})` : "";
              
          return [
              b.id,
              b.date?.split('T')[0],
              toNepaliDate(b.date),
              b.type,
              b.details,
              b.method,
              `"${itemsStr}"`,
              b.amount,
              `"${customerStr}"`
          ];
      });

      const csvContent = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      
      const rangeText = range === 'today' ? 'Today' : range;
      link.setAttribute("download", `Gecko_Ledger_${rangeText}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Ledger Exported Successfully");
  };

  const chartData = data?.chartData || [];
  const topItems = data?.topItems || [];
  const transactions = data?.transactions || [];
  const stats = data?.stats || {};
  const paymentMethods = data?.paymentMethods || {};
  const staffPerformance = data?.staffPerformance || {};

  // CRITICAL FIX: Ensure the expenseTransactions variable exists for the Recent Expenses widget
  const expenseTransactions = transactions.filter((t: any) => t.type?.toLowerCase().includes('expense'));

  // Filter for search (Searches IDs, details, categories, methods)
  const filteredTransactions = transactions.filter((t: any) => 
      t.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.method?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const containerVars = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVars = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden relative">
      <Sidebar tenantName={tenant?.name} tenantCode={tenant?.code} logo={tenant?.logo_url} />
      
      <main className="flex-1 flex flex-col h-full overflow-y-auto pb-[140px] md:pb-8 relative custom-scrollbar">
        
        {/* HEADER */}
        <header className="px-4 md:px-8 py-6 bg-white/90 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-30 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-sm">
            <div>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    Financial Command
                </h1>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Profit & Loss Analytics</p>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="bg-slate-100 p-1.5 rounded-2xl flex overflow-x-auto no-scrollbar w-full md:w-auto">
                    {[ {k:"today",l:"Today"}, {k:"7d",l:"7 Days"}, {k:"30d",l:"1 Month"}, {k:"90d",l:"3 Months"}, {k:"1y",l:"1 Year"} ].map((opt) => (
                        <button 
                            key={opt.k} 
                            onClick={() => setRange(opt.k as ReportRange)}
                            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${range === opt.k ? 'bg-white shadow-md text-emerald-600 scale-105' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
                        >
                            {opt.l}
                        </button>
                    ))}
                </div>
                
                <button 
                    onClick={handleExportCSV}
                    disabled={transactions.length === 0}
                    className="hidden md:flex h-11 px-6 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-wide items-center gap-2 hover:bg-emerald-600 shadow-lg hover:shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Download className="w-4 h-4" /> Export Ledger
                </button>
            </div>
        </header>

        {/* CONTENT */}
        <div className="p-4 md:p-8">
            {loading ? (
                <div className="h-[60vh] flex flex-col items-center justify-center text-emerald-500">
                    <Loader2 className="w-14 h-14 animate-spin mb-4" />
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">Compiling Ledger...</span>
                </div>
            ) : (
                <motion.div variants={containerVars} initial="hidden" animate="show" className="space-y-6 md:space-y-8">
                    
                    {/* 1. KEY METRICS */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        <StatCard title="Net Revenue" value={formatRs(stats.totalRevenue)} icon={IndianRupee} color="emerald" trend={`${stats.revenueTrend > 0 ? '+' : ''}${stats.revenueTrend || 0}% vs Prev`} />
                        <StatCard title="Total Expenses" value={formatRs(stats.totalExpense)} icon={CreditCard} color="red" trend={`${Math.round(((stats.totalExpense || 0) / (stats.totalRevenue || 1)) * 100)}% Ratio`} />
                        <StatCard title="Net Profit" value={formatRs(stats.netProfit)} icon={Wallet} color="blue" trend={`${stats.margin || 0}% Margin`} />
                        <StatCard title="Total Orders" value={stats.orderCount} icon={ShoppingBag} color="orange" trend="Volume" />
                    </div>

                    {/* 2. CHARTS & SPLITS ROW */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* REVENUE VS EXPENSES */}
                        <motion.div variants={itemVars} className="lg:col-span-2 bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-black text-slate-900 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-500" /> Performance History</h3>
                            </div>
                            <div className="h-72 w-full">
                                {chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                            <XAxis dataKey="bsDate" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94A3B8', fontWeight: 'bold'}} dy={10} minTickGap={20} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94A3B8', fontWeight: 'bold'}} />
                                            <Tooltip 
                                                contentStyle={{ borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)' }}
                                                cursor={{ fill: '#F8FAFC' }}
                                                labelStyle={{ fontWeight: '900', color: '#0F172A', marginBottom: '8px' }}
                                            />
                                            <Bar dataKey="revenue" name="Revenue" fill="#10B981" radius={[6, 6, 0, 0]} barSize={24} />
                                            <Bar dataKey="expense" name="Expense" fill="#EF4444" radius={[6, 6, 0, 0]} barSize={24} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100">
                                        <AlertCircle className="w-10 h-10 mb-3 opacity-30" />
                                        <span className="text-xs font-bold uppercase tracking-widest">No Transaction Data</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* PAYMENT METHODS & STAFF BREAKDOWN */}
                        <motion.div variants={itemVars} className="flex flex-col gap-6">
                            
                            {/* Payment Methods */}
                            <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex-1">
                                <h3 className="font-black text-slate-900 mb-5 flex items-center gap-2"><QrCode className="w-5 h-5 text-indigo-500" /> Payment Split</h3>
                                <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                                    {Object.keys(paymentMethods).length > 0 ? (
                                        Object.entries(paymentMethods).sort((a:any, b:any) => b[1] - a[1]).map(([method, amount]: any, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-500">
                                                        {method.toLowerCase().includes('cash') || method.toLowerCase().includes('manual') ? <Banknote className="w-4 h-4"/> : <QrCode className="w-4 h-4"/>}
                                                    </div>
                                                    <span className="font-bold text-slate-700 capitalize text-sm">{method}</span>
                                                </div>
                                                <span className="font-black text-slate-900">{formatRs(amount)}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center text-slate-400 py-6 text-xs font-bold uppercase">No Payments</div>
                                    )}
                                </div>
                            </div>

                            {/* Staff Performance */}
                            <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex-1">
                                <h3 className="font-black text-slate-900 mb-5 flex items-center gap-2"><UserCircle className="w-5 h-5 text-orange-500" /> Staff Sales</h3>
                                <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                                    {Object.keys(staffPerformance).length > 0 ? (
                                        Object.entries(staffPerformance).sort((a:any, b:any) => b[1] - a[1]).map(([staff, amount]: any, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-2xl transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[10px] font-black uppercase">
                                                        {staff.charAt(0)}
                                                    </div>
                                                    <span className="font-bold text-slate-700 text-sm">{staff}</span>
                                                </div>
                                                <span className="font-black text-slate-900">{formatRs(amount)}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center text-slate-400 py-6 text-xs font-bold uppercase">No Staff Data</div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* 3. DETAILS ROW */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                        
                        {/* TOP ITEMS */}
                        <motion.div variants={itemVars} className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40">
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
                                        <span className="text-xs font-bold uppercase tracking-widest">No sales data found.</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* RECENT EXPENSES */}
                        <motion.div variants={itemVars} className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-black text-slate-900 flex items-center gap-2"><TrendingDown className="w-5 h-5 text-red-500" /> Recent Expenses</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 max-h-[350px] pr-2">
                                {expenseTransactions.length > 0 ? (
                                    expenseTransactions.map((pay: any, i: number) => (
                                        <div key={i} className="flex justify-between items-center p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400">
                                                    <CreditCard className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 text-sm leading-tight capitalize">{pay.details || "General Expense"}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{toNepaliDate(pay.date)}</p>
                                                </div>
                                            </div>
                                            <span className="font-black text-red-500 text-lg">-{formatRs(pay.amount)}</span>
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
                    <motion.div variants={itemVars} className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
                        
                        {/* Table Controls */}
                        <div className="p-5 md:p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2"><Layers className="w-5 h-5 text-blue-500"/> Master Ledger</h3>
                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Combined Bills & Manual Logs</p>
                            </div>
                            <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-200 w-full md:w-96 shadow-sm focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
                                <Search className="w-5 h-5 text-slate-400 shrink-0" />
                                <input placeholder="Search records..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-transparent outline-none font-bold text-sm w-full text-slate-700 placeholder:text-slate-400" />
                            </div>
                        </div>

                        {/* DESKTOP VIEW */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white text-slate-400 uppercase text-[10px] font-black tracking-widest border-b border-slate-100">
                                    <tr>
                                        <th className="px-8 py-5">Reference</th>
                                        <th className="px-8 py-5">Type</th>
                                        <th className="px-8 py-5">Date</th>
                                        <th className="px-8 py-5">Details / Source</th>
                                        <th className="px-8 py-5">Method</th>
                                        <th className="px-8 py-5 text-right">Amount</th>
                                        <th className="px-8 py-5"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {filteredTransactions.length === 0 ? (
                                        <tr><td colSpan={7} className="px-8 py-12 text-center text-slate-400 font-bold">No records found.</td></tr>
                                    ) : filteredTransactions.map((tx:any, i:number) => {
                                        const isExpanded = expandedBill === tx.id;
                                        const isIncome = tx.type.includes('Income') || tx.type.includes('POS');
                                        
                                        return (
                                            <React.Fragment key={i}>
                                                <tr onClick={() => setExpandedBill(isExpanded ? null : tx.id)} className={`transition-colors cursor-pointer group ${isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50'}`}>
                                                    <td className="px-8 py-5 font-black text-slate-500">{tx.id}</td>
                                                    <td className="px-8 py-5">
                                                        <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase border whitespace-nowrap ${isIncome ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                                            {tx.type}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-5 font-bold text-slate-600 whitespace-nowrap">{toNepaliDate(tx.date)}</td>
                                                    <td className="px-8 py-5 font-bold text-slate-900 capitalize">{tx.details}</td>
                                                    <td className="px-8 py-5">
                                                        <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase bg-slate-100 text-slate-500 border border-slate-200 whitespace-nowrap`}>
                                                            {tx.method}
                                                        </span>
                                                    </td>
                                                    <td className={`px-8 py-5 text-right font-black whitespace-nowrap ${isIncome ? 'text-emerald-600' : 'text-red-500'}`}>
                                                        {isIncome ? '+' : '-'} {formatRs(tx.amount)}
                                                    </td>
                                                    <td className="px-8 py-5 text-right">
                                                        {(tx.items?.length > 0 || tx.note) && (
                                                            <div className={`p-2 rounded-full inline-flex transition-colors ${isExpanded ? 'bg-slate-200 text-slate-600' : 'group-hover:bg-slate-200 text-slate-400'}`}>
                                                                {isExpanded ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                                <AnimatePresence>
                                                    {isExpanded && (tx.items?.length > 0 || tx.note) && (
                                                        <motion.tr initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-slate-50/80 border-b-2 border-slate-200">
                                                            <td colSpan={7} className="px-8 py-6">
                                                                
                                                                {/* IF POS BILL */}
                                                                {tx.items?.length > 0 && (
                                                                    <div className="grid grid-cols-4 gap-4 mb-4">
                                                                        {tx.items.map((item:any, idx:number) => (
                                                                            <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col hover:border-emerald-200 transition-colors">
                                                                                <div className="flex justify-between items-start mb-2">
                                                                                    <span className="font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md text-[10px]">{item.qty || 1}x</span>
                                                                                    <span className="text-xs font-bold text-emerald-600">{formatRs(item.price || 0)}</span>
                                                                                </div>
                                                                                <span className="text-sm font-bold text-slate-700 leading-tight">{item.name}</span>
                                                                                {item.variant && <span className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wider">{item.variant}</span>}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                
                                                                {/* CUSTOMER OR NOTES INFO */}
                                                                {(tx.customer?.name || tx.customer?.address || tx.note) && (
                                                                    <div className="pt-4 border-t border-slate-200 flex gap-8 text-xs font-medium text-slate-500 bg-white p-4 rounded-2xl shadow-sm">
                                                                        {tx.customer?.name && <span><strong className="text-slate-900 font-black uppercase tracking-widest text-[10px] block mb-1">Customer</strong> {tx.customer.name}</span>}
                                                                        {tx.customer?.address && <span><strong className="text-slate-900 font-black uppercase tracking-widest text-[10px] block mb-1">Address/PAN</strong> {tx.customer.address}</span>}
                                                                        {tx.note && <span><strong className="text-slate-900 font-black uppercase tracking-widest text-[10px] block mb-1">Description / Notes</strong> {tx.note}</span>}
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

                        {/* MOBILE VIEW */}
                        <div className="md:hidden divide-y divide-slate-100">
                            {filteredTransactions.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 font-bold">No records found.</div>
                            ) : filteredTransactions.map((tx:any, i:number) => {
                                const isExpanded = expandedBill === tx.id;
                                const isIncome = tx.type.includes('Income') || tx.type.includes('POS');

                                return (
                                    <div key={i} className="flex flex-col">
                                        <div onClick={() => setExpandedBill(isExpanded ? null : tx.id)} className={`p-5 flex flex-col gap-3 transition-colors ${isExpanded ? 'bg-slate-50' : 'active:bg-slate-50'}`}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="font-black text-slate-900 text-lg capitalize">{tx.details}</span>
                                                    <div className="flex items-center gap-2 mt-1 text-xs font-bold text-slate-400">
                                                        <Calendar className="w-3.5 h-3.5" /> {toNepaliDate(tx.date)}
                                                    </div>
                                                </div>
                                                <span className={`font-black text-lg ${isIncome ? 'text-emerald-600' : 'text-red-500'}`}>{isIncome ? '+' : '-'} {formatRs(tx.amount)}</span>
                                            </div>
                                            <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                                                <div className="flex gap-2">
                                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${isIncome ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>{tx.type}</span>
                                                    <span className="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border border-slate-200">{tx.method}</span>
                                                </div>
                                                {(tx.items?.length > 0 || tx.note) && (
                                                    isExpanded ? <ChevronUp className="w-5 h-5 text-slate-500"/> : <ChevronDown className="w-5 h-5 text-slate-300"/>
                                                )}
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {isExpanded && (tx.items?.length > 0 || tx.note) && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-slate-50 border-b-2 border-slate-200 px-4 py-4 overflow-hidden">
                                                    
                                                    <div className="mb-3">
                                                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">ID: {tx.id.split('-')[1] || tx.id}</span>
                                                    </div>

                                                    {tx.items?.length > 0 && (
                                                        <div className="space-y-3 mb-4">
                                                            {tx.items.map((item:any, idx:number) => (
                                                                <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                                                                    <div className="flex gap-3 items-center">
                                                                        <span className="font-black text-white bg-slate-900 w-6 h-6 flex items-center justify-center rounded-lg text-[10px]">{item.qty || 1}</span>
                                                                        <div className="flex flex-col">
                                                                            <span className="text-sm font-bold text-slate-800 leading-tight">{item.name}</span>
                                                                            {item.variant && <span className="text-[9px] text-slate-400 font-medium uppercase mt-0.5">{item.variant}</span>}
                                                                        </div>
                                                                    </div>
                                                                    <span className="text-xs font-black text-slate-900">{formatRs((item.price || 0) * (item.qty || 1))}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {(tx.customer?.name || tx.customer?.address || tx.note) && (
                                                        <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs flex flex-col gap-2 shadow-sm">
                                                            {tx.note && <span className="flex flex-col"><strong className="text-slate-400 uppercase tracking-widest text-[9px] mb-1">Description / Notes</strong> <span className="font-bold text-slate-700 leading-relaxed">{tx.note}</span></span>}
                                                            {tx.customer?.name && <span className="flex justify-between mt-2 pt-2 border-t border-slate-100"><strong className="text-slate-400 uppercase tracking-widest text-[9px]">Customer</strong> <span className="font-bold text-slate-700">{tx.customer.name}</span></span>}
                                                            {tx.customer?.address && <span className="flex justify-between"><strong className="text-slate-400 uppercase tracking-widest text-[9px]">Details</strong> <span className="font-bold text-slate-700">{tx.customer.address}</span></span>}
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
            )}
        </div>

        {/* MOBILE EXPORT BUTTON */}
        <div className="md:hidden fixed bottom-[90px] right-4 z-40">
            <button 
                onClick={handleExportCSV}
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
function StatCard({ title, value, icon: Icon, color, trend }: any) {
    const styles: any = {
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        red: "bg-red-50 text-red-600 border-red-100",
        orange: "bg-orange-50 text-orange-600 border-orange-100"
    };
    return (
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="bg-white p-5 md:p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/30 hover:-translate-y-1 transition-transform duration-300">
            <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-[1.2rem] flex items-center justify-center border shadow-inner ${styles[color]}`}>
                    <Icon className="w-6 h-6" />
                </div>
                <span className={`text-[10px] font-black px-2.5 py-1.5 rounded-xl flex items-center gap-1 shadow-sm ${styles[color]}`}>
                    {color === 'red' ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />} {trend}
                </span>
            </div>
            <h4 className="text-slate-400 text-[10px] md:text-xs font-black uppercase tracking-widest mb-1.5">{title}</h4>
            <p className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter truncate">{value}</p>
        </motion.div>
    )
}