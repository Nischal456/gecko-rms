"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/app/staff/manager/Sidebar";
import { motion } from "framer-motion";
import { 
  TrendingUp, DollarSign, Wallet, ArrowUpRight, ArrowDownRight,
  BarChart3, Loader2, Award, PieChart as PieIcon, CreditCard, 
  TrendingDown, ShoppingBag, AlertCircle, Download,IndianRupee
} from "lucide-react";
import { getReportData, type ReportRange } from "@/app/actions/reports";
import { getDashboardData } from "@/app/actions/dashboard"; 
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from "recharts";
import NepaliDate from 'nepali-date-converter'; // Ensure you have this: npm i nepali-date-converter

// --- CONFIG ---
const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];
const NEPALI_MONTHS = ["Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];

// --- UTILS ---
const formatRs = (val: number) => "Rs " + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(val || 0);

// Converts "2024-05-20" -> "Jestha 7"
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
  const [range, setRange] = useState<ReportRange>("7d");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAllData(); }, [range]);

  async function loadAllData() {
      setLoading(true);
      try {
          const [dashRes, reportRes] = await Promise.all([
              getDashboardData(), 
              getReportData(range)
          ]);

          if (dashRes?.tenant) setTenant(dashRes.tenant);

          if (reportRes.success && reportRes.stats) {
              // Enhance chart data with Nepali Dates for display
              const nepaliChartData = (reportRes.chartData || []).map((d: any) => ({
                  ...d,
                  bsDate: toNepaliDate(d.date), // Add formatted BS date
                  rawDate: d.date // Keep AD date for reference
              }));
              
              setData({ ...reportRes, chartData: nepaliChartData });
          } else {
              setData(getEmptyState());
          }
      } catch (e) {
          console.error(e);
          setData(getEmptyState());
      } finally {
          setLoading(false);
      }
  }

  function getEmptyState() {
      return {
          stats: { totalRevenue: 0, totalExpense: 0, netProfit: 0, margin: 0, orderCount: 0, revenueTrend: 0 },
          chartData: [],
          pieData: [],
          topItems: [],
          payments: []
      };
  }

  // --- CSV EXPORT FUNCTION ---
  const handleExportCSV = () => {
      if (!data || !data.chartData || data.chartData.length === 0) return;

      // 1. Define Headers
      const headers = ["Date (BS)", "Date (AD)", "Revenue (Rs)", "Expenses (Rs)", "Net Profit (Rs)"];
      
      // 2. Build Rows
      const rows = data.chartData.map((row: any) => [
          row.bsDate,
          row.rawDate,
          row.revenue,
          row.expense,
          row.profit
      ]);

      // 3. Construct CSV Content
      const csvContent = [
          headers.join(","), 
          ...rows.map((r: any) => r.join(","))
      ].join("\n");

      // 4. Trigger Download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Gecko_Report_${range}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  // Safe Data Accessors
  const pieData = data?.pieData || [];
  const chartData = data?.chartData || [];
  const topItems = data?.topItems || [];
  const payments = data?.payments || [];
  const stats = data?.stats || {};

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden">
      <Sidebar tenantName={tenant?.name} tenantCode={tenant?.code} logo={tenant?.logo_url} />
      
      <main className="flex-1 flex flex-col h-full overflow-y-auto relative">
        
        {/* HEADER */}
        <header className="px-6 md:px-8 py-6 bg-white/90 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Financial Command</h1>
                <p className="text-xs font-bold text-slate-400 flex items-center gap-1 mt-1">
                    <BarChart3 className="w-3 h-3 text-emerald-500" /> Profit & Loss Analytics (BS)
                </p>
            </div>
            
            <div className="flex items-center gap-3">
                <div className="bg-slate-100 p-1 rounded-xl flex overflow-x-auto no-scrollbar">
                    {[
                        {k:"today",l:"Today"},
                        {k:"7d",l:"7 Days"},
                        {k:"30d",l:"1 Month"},
                        {k:"90d",l:"3 Months"},
                        {k:"1y",l:"1 Year"} // New Option
                    ].map((opt) => (
                        <button 
                            key={opt.k} 
                            onClick={() => setRange(opt.k as ReportRange)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${range === opt.k ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {opt.l}
                        </button>
                    ))}
                </div>
                
                {/* EXPORT BUTTON */}
                <button 
                    onClick={handleExportCSV}
                    disabled={chartData.length === 0}
                    className="h-9 px-4 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Download className="w-4 h-4" /> CSV
                </button>
            </div>
        </header>

        {/* CONTENT */}
        <div className="p-4 md:p-8 space-y-6 pb-20">
            {loading ? (
                <div className="h-96 flex flex-col items-center justify-center text-emerald-500">
                    <Loader2 className="w-12 h-12 animate-spin mb-3" />
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">Compiling Ledger...</span>
                </div>
            ) : (
                <>
                    {/* 1. KEY METRICS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard 
                            title="Net Revenue" 
                            value={formatRs(stats.totalRevenue)} 
                            icon={IndianRupee} 
                            color="emerald" 
                            trend={`${stats.revenueTrend > 0 ? '+' : ''}${stats.revenueTrend}% vs Prev`} // REAL TREND
                        />
                        <StatCard 
                            title="Total Expenses" 
                            value={formatRs(stats.totalExpense)} 
                            icon={CreditCard} 
                            color="red" 
                            trend={`${Math.round((stats.totalExpense / (stats.totalRevenue || 1)) * 100)}% Ratio`} 
                        />
                        <StatCard title="Net Profit" value={formatRs(stats.netProfit)} icon={Wallet} color="blue" trend={`${stats.margin}% Margin`} />
                        <StatCard title="Total Orders" value={stats.orderCount} icon={ShoppingBag} color="orange" trend="Volume" />
                    </div>

                    {/* 2. CHARTS ROW */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* REVENUE VS EXPENSES (BAR) */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-black text-slate-900 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-500" /> Performance History (BS)</h3>
                            </div>
                            <div className="h-72 w-full">
                                {chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                            {/* Showing Nepali Date on Axis */}
                                            <XAxis dataKey="bsDate" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94A3B8'}} dy={10} minTickGap={20} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94A3B8'}} />
                                            <Tooltip 
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' }}
                                                cursor={{ fill: '#F8FAFC' }}
                                                labelStyle={{ fontWeight: 'bold', color: '#0F172A', marginBottom: '5px' }}
                                            />
                                            <Bar dataKey="revenue" name="Revenue" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20} />
                                            <Bar dataKey="expense" name="Expense" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                        <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                                        <span className="text-xs font-bold">No Transaction Data</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* EXPENSE BREAKDOWN (PIE) */}
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col">
                            <h3 className="font-black text-slate-900 mb-2 flex items-center gap-2"><PieIcon className="w-5 h-5 text-blue-500" /> Cost Distribution</h3>
                            <div className="h-60 w-full flex-1 relative">
                                {pieData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie 
                                                data={pieData} 
                                                cx="50%" cy="50%" 
                                                innerRadius={60} outerRadius={80} 
                                                paddingAngle={5} 
                                                dataKey="value"
                                            >
                                                {pieData.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                        <div className="w-20 h-20 rounded-full border-4 border-slate-100 mb-3 flex items-center justify-center">
                                            <span className="font-bold text-lg">0</span>
                                        </div>
                                        <span className="text-xs font-bold">No Expenses Recorded</span>
                                    </div>
                                )}
                                {pieData.length > 0 && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                                        <span className="text-xs font-black text-slate-400">EXP</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 3. DETAILS ROW */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        {/* TOP ITEMS */}
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                            <h3 className="font-black text-slate-900 mb-6 flex items-center gap-2"><Award className="w-5 h-5 text-amber-500" /> Best Sellers</h3>
                            <div className="space-y-4">
                                {topItems.length > 0 ? (
                                    topItems.map((item: any, i: number) => (
                                        <div key={i} className="flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center font-black text-xs text-slate-400">#{i+1}</div>
                                            <div className="flex-1">
                                                <div className="flex justify-between mb-1">
                                                    <span className="font-bold text-slate-900 text-sm">{item.name}</span>
                                                    <span className="font-bold text-slate-500 text-xs">{item.qty} sold</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                                    <motion.div initial={{ width: 0 }} animate={{ width: `${(item.sales / (topItems[0]?.sales || 1)) * 100}%` }} className="h-full bg-slate-900 rounded-full" />
                                                </div>
                                            </div>
                                            <span className="text-xs font-bold text-emerald-600 min-w-[60px] text-right">{formatRs(item.sales)}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-slate-400 text-xs py-8 font-bold">No sales data found for this period.</p>
                                )}
                            </div>
                        </div>

                        {/* RECENT EXPENSES TABLE */}
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-black text-slate-900 flex items-center gap-2"><TrendingDown className="w-5 h-5 text-red-500" /> Recent Expenses</h3>
                                <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded-lg">Real-Time DB</span>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 max-h-[300px]">
                                {payments.length > 0 ? (
                                    payments.map((pay: any, i: number) => (
                                        <div key={i} className="flex justify-between items-center p-3 rounded-2xl bg-slate-50 border border-slate-100/50 hover:bg-slate-100 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100 text-slate-400">
                                                    {pay.category === 'Inventory' ? <BoxIcon /> : pay.category === 'Payroll' ? <UserIcon /> : <DocIcon />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 text-xs">{pay.note || pay.category}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase">{toNepaliDate(pay.date || pay.payment_date)}</p>
                                                </div>
                                            </div>
                                            <span className="font-black text-red-500 text-sm">-{formatRs(pay.amount)}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                                        <CreditCard className="w-8 h-8 mb-2 opacity-30" />
                                        <p className="text-xs font-bold">No expenses recorded</p>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </>
            )}
        </div>
      </main>
    </div>
  );
}

// --- MINI ICONS ---
const BoxIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>;
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
const DocIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;

function StatCard({ title, value, icon: Icon, color, trend }: any) {
    const styles: any = {
        emerald: "bg-emerald-50 text-emerald-600",
        blue: "bg-blue-50 text-blue-600",
        red: "bg-red-50 text-red-600",
        orange: "bg-orange-50 text-orange-600"
    };
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-5 rounded-[1.8rem] border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${styles[color]}`}><Icon className="w-6 h-6" /></div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 ${styles[color]}`}>
                    {color === 'red' ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />} {trend}
                </span>
            </div>
            <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{title}</h4>
            <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
        </motion.div>
    )
}