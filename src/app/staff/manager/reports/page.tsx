"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/app/staff/manager/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, Wallet, ArrowUpRight, ArrowDownRight,
  BarChart3, Loader2, Award, CreditCard, UserCircle,
  TrendingDown, ShoppingBag, AlertCircle, Download, IndianRupee, Banknote, QrCode, Search, ChevronUp, ChevronDown, Calendar, Table as TableIcon
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

  // --- CSV EXPORT (Updated for new transactions array) ---
  const handleExportCSV = () => {
      const incomeTx = data?.transactions?.filter((t:any) => t.type === 'Income') || [];
      if (!incomeTx || incomeTx.length === 0) {
          return toast.error("No data available to export");
      }

      const headers = ["Bill Number", "Date (AD)", "Date (BS)", "Table", "Items", "Total (Rs)", "Method", "Customer Name", "Customer Address"];
      
      const rows = incomeTx.map((b: any) => {
          const itemsStr = b.items?.map((i:any) => `${i.qty||1}x ${i.name?.replace(/,/g, '')}`).join(" | ") || "";
          return [
              b.id,
              b.date?.split('T')[0],
              toNepaliDate(b.date),
              b.details,
              `"${itemsStr}"`,
              b.amount,
              b.method,
              `"${b.customer?.name || ''}"`,
              `"${b.customer?.address || ''}"`
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

  // Safe Data Accessors based on the NEW backend structure
  const chartData = data?.chartData || [];
  const topItems = data?.topItems || [];
  const transactions = data?.transactions || [];
  const stats = data?.stats || {};
  const paymentMethods = data?.paymentMethods || {};
  const staffPerformance = data?.staffPerformance || {};

  // Segregate Transactions
  const incomeTransactions = transactions.filter((t: any) => t.type === 'Income');
  const expenseTransactions = transactions.filter((t: any) => t.type === 'Expense');

  // Filter for search
  const filteredBills = incomeTransactions.filter((b: any) => 
      b.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.details?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Animations
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
                    disabled={incomeTransactions.length === 0}
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
                                        Object.entries(paymentMethods).map(([method, amount]: any, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-500">
                                                        {method.toLowerCase().includes('cash') ? <Banknote className="w-4 h-4"/> : <QrCode className="w-4 h-4"/>}
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
                                        Object.entries(staffPerformance).map(([staff, amount]: any, i) => (
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
                                                    <p className="font-black text-slate-900 text-sm leading-tight">{pay.details || "General Expense"}</p>
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

                    {/* 4. BILL HISTORY (TRANSACTIONS) */}
                    <motion.div variants={itemVars} className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
                        
                        {/* Table Controls */}
                        <div className="p-5 md:p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
                            <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-200 w-full md:w-96 shadow-sm focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
                                <Search className="w-5 h-5 text-slate-400 shrink-0" />
                                <input placeholder="Search bill no or table..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-transparent outline-none font-bold text-sm w-full text-slate-700 placeholder:text-slate-400" />
                            </div>
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
                                        const isExpanded = expandedBill === b.id;
                                        return (
                                            <React.Fragment key={i}>
                                                <tr onClick={() => setExpandedBill(isExpanded ? null : b.id)} className={`transition-colors cursor-pointer group ${isExpanded ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}`}>
                                                    <td className="px-8 py-5 font-black text-slate-900">{b.id}</td>
                                                    <td className="px-8 py-5 font-medium text-slate-500">{toNepaliDate(b.date)}</td>
                                                    <td className="px-8 py-5"><span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-black tracking-wide border border-slate-200">{b.details}</span></td>
                                                    <td className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">{b.method}</td>
                                                    <td className="px-8 py-5 text-right font-black text-emerald-600">{formatRs(b.amount)}</td>
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
                                                                                <span className="font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md text-[10px]">{item.qty || 1}x</span>
                                                                                <span className="text-xs font-bold text-emerald-600">{formatRs(item.price || 0)}</span>
                                                                            </div>
                                                                            <span className="text-sm font-bold text-slate-700 leading-tight">{item.name}</span>
                                                                            {item.variant && <span className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wider">{item.variant}</span>}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                {(b.customer?.name || b.customer?.address) && (
                                                                    <div className="pt-4 border-t border-slate-200 flex gap-8 text-xs font-medium text-slate-500 bg-white p-4 rounded-2xl">
                                                                        {b.customer.name && <span><strong className="text-slate-900 font-black uppercase tracking-widest text-[10px] block mb-1">Customer</strong> {b.customer.name}</span>}
                                                                        {b.customer.address && <span><strong className="text-slate-900 font-black uppercase tracking-widest text-[10px] block mb-1">Address/PAN</strong> {b.customer.address}</span>}
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

                        {/* MOBILE VIEW: Stacked Cards */}
                        <div className="md:hidden divide-y divide-slate-100">
                            {filteredBills.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 font-bold">No bills found.</div>
                            ) : filteredBills.map((b:any, i:number) => {
                                const isExpanded = expandedBill === b.id;
                                return (
                                    <div key={i} className="flex flex-col">
                                        <div onClick={() => setExpandedBill(isExpanded ? null : b.id)} className={`p-5 flex flex-col gap-3 transition-colors ${isExpanded ? 'bg-emerald-50/50' : 'active:bg-slate-50'}`}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="font-black text-slate-900 text-lg">{b.id}</span>
                                                    <div className="flex items-center gap-2 mt-1 text-xs font-bold text-slate-400">
                                                        <Calendar className="w-3.5 h-3.5" /> {toNepaliDate(b.date)}
                                                    </div>
                                                </div>
                                                <span className="font-black text-emerald-600 text-lg">{formatRs(b.amount)}</span>
                                            </div>
                                            <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                                                <div className="flex gap-2">
                                                    <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[10px] font-black border border-slate-200 flex items-center gap-1"><TableIcon className="w-3 h-3"/> {b.details}</span>
                                                    <span className="bg-slate-50 text-slate-500 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border border-slate-100">{b.method}</span>
                                                </div>
                                                {isExpanded ? <ChevronUp className="w-5 h-5 text-emerald-500"/> : <ChevronDown className="w-5 h-5 text-slate-300"/>}
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-slate-50 border-b-2 border-emerald-100 px-4 py-4 overflow-hidden">
                                                    <div className="space-y-3 mb-4">
                                                        {b.items?.map((item:any, idx:number) => (
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
                                                    {(b.customer?.name || b.customer?.address) && (
                                                        <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs flex flex-col gap-2">
                                                            {b.customer.name && <span className="flex justify-between"><strong className="text-slate-400 uppercase tracking-widest text-[9px]">Customer</strong> <span className="font-bold text-slate-700">{b.customer.name}</span></span>}
                                                            {b.customer.address && <span className="flex justify-between"><strong className="text-slate-400 uppercase tracking-widest text-[9px]">Details</strong> <span className="font-bold text-slate-700">{b.customer.address}</span></span>}
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
                disabled={incomeTransactions.length === 0}
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