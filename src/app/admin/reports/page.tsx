"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/app/admin/Sidebar";
import React from "react";
import { 
  BarChart3, TrendingUp, Download, Wallet, Banknote, Users, 
  FileSpreadsheet, Loader2, ArrowUpRight, Calendar, CreditCard, 
  PieChart, ArrowDownRight, Search, QrCode, Filter, ChevronDown, ChevronUp, CheckCircle2, Clock
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell
} from "recharts";
import { getReportData } from "@/app/actions/reports";
import { getDashboardData } from "@/app/actions/dashboard";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const formatNPR = (n: number) => "Rs " + new Intl.NumberFormat('en-NP', { maximumFractionDigits: 0 }).format(n);

function StatCard({ title, value, sub, icon: Icon, type, delay }: any) {
    const isPos = type === 'positive';
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }}
            className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all group relative overflow-hidden"
        >
            <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity ${isPos ? 'text-emerald-500' : 'text-orange-500'}`}>
                <Icon className="w-24 h-24" />
            </div>
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${isPos ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                    <Icon className="w-6 h-6" />
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${isPos ? 'bg-emerald-100/50 text-emerald-700 border-emerald-100' : 'bg-orange-100/50 text-orange-700 border-orange-100'}`}>
                    {sub}
                </span>
            </div>
            <div className="relative z-10">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
                <h3 className="text-2xl md:text-3xl font-black text-slate-900 mt-1 tracking-tight">{value}</h3>
            </div>
        </motion.div>
    )
}

export default function ReportsPage() {
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'today' | '7d' | '30d' | '90d' | '1y'>('30d');
  
  const [data, setData] = useState<any>({
      stats: { totalRevenue: 0, netProfit: 0, totalExpense: 0, totalOrders: 0 },
      chartData: [],
      paymentMethods: {},
      staffPerformance: {},
      transactions: []
  });
  
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All"); 
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { loadInitial(); }, []);
  useEffect(() => { loadReports(); }, [range]);

  async function loadInitial() {
    try {
        const dashData = await getDashboardData();
        if (dashData && dashData.tenant) setTenant(dashData.tenant);
    } catch (error) { console.error(error); }
  }

  async function loadReports() {
      setLoading(true);
      const res = await getReportData(range);
      if (res.success) setData(res);
      else toast.error("Failed to load data");
      setLoading(false);
  }

  const transactions = data?.transactions?.filter((t: any) => {
      const matchesSearch = t.id.toLowerCase().includes(search.toLowerCase()) || t.details.toLowerCase().includes(search.toLowerCase());
      const matchesType = filterType === "All" || t.type === filterType;
      return matchesSearch && matchesType;
  }) || [];

  const downloadCSV = () => {
    if (!data?.transactions?.length) return toast.error("No data");
    const header = "ID,Date,Type,Details,Method,Amount,Items,Status\n";
    const rows = data.transactions.map((t:any) => {
        const itemStr = t.items ? t.items.map((i:any) => `${i.qty}x ${i.name}`).join(" | ") : "";
        return `${t.id},${t.date},${t.type},"${t.details}",${t.method},${t.amount},"${itemStr}",${t.status}`;
    }).join("\n");
    const link = document.createElement("a"); link.href = "data:text/csv;charset=utf-8," + encodeURI(header + rows); link.download = `Report_${range}.csv`; link.click();
    toast.success("Exported Successfully");
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden">
      <div className="hidden md:block">
        <Sidebar tenantName={tenant?.name || "Admin"} tenantCode={tenant?.code || "..."} logo={tenant?.logo_url} />
      </div>

      <main className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar relative">
        <div className="px-6 py-6 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
            <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Financial Command</h1>
                <p className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-2">
                    <Calendar className="w-3 h-3" /> Period: <span className="text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded-md">{range.replace('d', ' Days').replace('y', ' Year')}</span>
                </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner overflow-x-auto no-scrollbar max-w-full">
                    {['today', '7d', '30d', '90d', '1y'].map((r) => (
                        <button key={r} onClick={() => setRange(r as any)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${range === r ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
                            {r}
                        </button>
                    ))}
                </div>
                <button onClick={downloadCSV} className="h-10 px-4 bg-slate-900 text-white rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-600 transition-colors shadow-lg active:scale-95">
                    <Download className="w-4 h-4" /> <span className="hidden md:inline text-xs font-bold">Export</span>
                </button>
            </div>
        </div>

        {loading ? (
            <div className="flex-1 flex items-center justify-center"><div className="flex flex-col items-center gap-4"><Loader2 className="w-12 h-12 text-emerald-500 animate-spin" /><p className="text-xs font-bold text-slate-400 uppercase animate-pulse">Analyzing...</p></div></div>
        ) : (
            <div className="p-4 md:p-8 space-y-6 md:space-y-8 pb-32">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title="Total Revenue" value={formatNPR(data?.stats?.totalRevenue || 0)} sub="Completed Sales" icon={Banknote} type="positive" delay={0.1} />
                    <StatCard title="Net Profit" value={formatNPR(data?.stats?.netProfit || 0)} sub="Real Earnings" icon={Wallet} type="positive" delay={0.2} />
                    <StatCard title="Total Expenses" value={formatNPR(data?.stats?.totalExpense || 0)} sub="Cost of Ops" icon={ArrowDownRight} type="negative" delay={0.3} />
                    <StatCard title="Total Orders" value={data?.stats?.totalOrders || 0} sub="Volume (Inc. Pending)" icon={FileSpreadsheet} type="positive" delay={0.4} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[420px]">
                    <div className="lg:col-span-2 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col relative overflow-hidden">
                        <div className="flex justify-between items-center mb-6 z-10">
                            <div><h3 className="font-black text-lg text-slate-900 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-500" /> Cash Flow</h3></div>
                            <div className="flex gap-3 text-[10px] font-bold"><span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"/> Income</span><span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500"/> Expense</span></div>
                        </div>
                        <div className="flex-1 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data?.chartData || []}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/><stop offset="95%" stopColor="#10B981" stopOpacity={0}/></linearGradient>
                                        <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F97316" stopOpacity={0.1}/><stop offset="95%" stopColor="#F97316" stopOpacity={0}/></linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize:10, fontWeight:600, fill:'#94a3b8'}} minTickGap={30} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize:10, fontWeight:600, fill:'#94a3b8'}} tickFormatter={(v) => `Rs ${v/1000}k`} />
                                    <Tooltip contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 10px 30px rgba(0,0,0,0.1)'}} />
                                    <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={3} fill="url(#colorRev)" />
                                    <Area type="monotone" dataKey="expense" stroke="#F97316" strokeWidth={3} fill="url(#colorExp)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                        <div>
                            <h3 className="font-black text-lg text-slate-900 mb-4 flex items-center gap-2"><PieChart className="w-5 h-5 text-purple-500" /> Payment Split</h3>
                            <div className="space-y-3">
                                {Object.entries(data?.paymentMethods || {}).map(([k, v]:any, i) => (
                                    <div key={k} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${k==='Cash'?'bg-emerald-100 text-emerald-600':k.includes('QR')?'bg-purple-100 text-purple-600':'bg-blue-100 text-blue-600'}`}>
                                                {k==='Cash'?<Banknote className="w-4 h-4"/>:k.includes('QR')?<QrCode className="w-4 h-4"/>:<CreditCard className="w-4 h-4"/>}
                                            </div>
                                            <span className="font-bold text-slate-600 text-xs">{k}</span>
                                        </div>
                                        <span className="font-black text-slate-900 text-sm">{formatNPR(v)}</span>
                                    </div>
                                ))}
                                {Object.keys(data?.paymentMethods || {}).length === 0 && <div className="text-center text-xs text-slate-400 py-4">No payment data yet</div>}
                            </div>
                        </div>
                        {Object.keys(data?.staffPerformance || {}).length > 0 && (
                            <div>
                                <h3 className="font-black text-lg text-slate-900 mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-blue-500" /> Top Staff</h3>
                                <div className="space-y-2">
                                    {Object.entries(data?.staffPerformance || {}).slice(0,3).map(([k, v]:any, i) => (
                                        <div key={i} className="flex justify-between items-center text-xs">
                                            <span className="font-bold text-slate-500">{k}</span>
                                            <span className="font-bold text-slate-900">{formatNPR(v)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4 bg-gradient-to-b from-slate-50/50 to-white">
                        <div>
                            <h3 className="font-black text-lg text-slate-900 flex items-center gap-2"><CreditCard className="w-5 h-5 text-slate-400"/> Transaction Ledger</h3>
                            <p className="text-xs text-slate-400 font-bold mt-1">Detailed breakdown of income & expenses</p>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search ID, Table..." className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-emerald-500 transition-all"/>
                            </div>
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                {['All', 'Income', 'Expense'].map(t => (
                                    <button key={t} onClick={() => setFilterType(t)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${filterType===t ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}>{t}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50/80 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Transaction ID</th>
                                    <th className="px-6 py-4">Time</th>
                                    <th className="px-6 py-4">Details</th>
                                    <th className="px-6 py-4">Method</th>
                                    <th className="px-6 py-4 text-right">Amount</th>
                                    <th className="px-6 py-4 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {transactions.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-16 text-center text-slate-400 text-xs font-bold">No transactions found</td></tr>
                                ) : (
                                    transactions.map((t:any, i:number) => (
                                        <React.Fragment key={i}>
                                            <tr className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}>
                                                <td className="px-6 py-4 font-black text-slate-700 font-mono text-xs">{t.id}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-slate-700">{new Date(t.date).toLocaleDateString()}</span>
                                                        <span className="text-[10px] font-bold text-slate-400">{new Date(t.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-slate-600 px-2 py-1 bg-slate-100 rounded-md w-fit">{t.details}</span>
                                                        <span className={`text-[10px] font-bold mt-1 ${t.status==='Completed' || t.status==='Paid' ? 'text-emerald-500' : 'text-orange-500'}`}>
                                                            {t.status === 'Pending' ? <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> Unpaid</span> : t.status}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4"><span className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold w-fit border ${t.method==='Cash'?'bg-emerald-50 text-emerald-700 border-emerald-100':t.method.includes('QR')?'bg-purple-50 text-purple-700 border-purple-100':'bg-blue-50 text-blue-700 border-blue-100'}`}>{t.method}</span></td>
                                                <td className={`px-6 py-4 text-right font-black ${t.type==='Expense'?'text-orange-500': 'text-emerald-600'}`}>{t.type==='Expense'?'-':'+'} {formatNPR(t.amount)}</td>
                                                <td className="px-6 py-4 text-slate-400">{t.items?.length > 0 && (expandedId === t.id ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>)}</td>
                                            </tr>
                                            {/* EXPANDABLE DETAILS ROW (Fixed: Direct child of fragment/tbody) */}
                                            {expandedId === t.id && (
                                                <tr className="bg-slate-50/80 shadow-inner">
                                                    <td colSpan={6} className="px-6 py-6">
                                                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
                                                            {t.customer?.name && <div className="flex gap-4 text-xs text-slate-500 pb-4 border-b border-slate-200"><span><strong>Customer:</strong> {t.customer.name}</span><span><strong>Address:</strong> {t.customer.address || "N/A"}</span></div>}
                                                            {t.items?.length > 0 ? (
                                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                                    {t.items.map((item:any, idx:number) => (
                                                                        <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                                                                            <div className="flex justify-between items-start mb-1">
                                                                                <span className="font-black text-slate-900">{item.qty}x</span>
                                                                                <span className="text-[10px] text-slate-400">{formatNPR(item.price)}</span>
                                                                            </div>
                                                                            <span className="text-xs font-bold text-slate-700 leading-tight">{item.name}</span>
                                                                            {item.variant && <span className="text-[10px] text-slate-400 italic mt-1">{item.variant}</span>}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="text-xs text-slate-400 italic text-center">No item details available or this is an expense record.</div>
                                                            )}
                                                        </motion.div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        )}
      </main>
    </div>
  );
}