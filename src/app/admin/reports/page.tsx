"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/app/admin/Sidebar";
import React from "react";
import { 
  BarChart3, TrendingUp, Download, Wallet, Banknote, Users, 
  FileSpreadsheet, Loader2, ArrowUpRight, Calendar, CreditCard, 
  PieChart, ArrowDownRight, Search, QrCode, Filter, ChevronDown, ChevronUp, CheckCircle2, Clock, CalendarDays
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell
} from "recharts";
import { getReportData } from "@/app/actions/reports";
import { getDashboardData } from "@/app/actions/dashboard";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import NepaliDate from 'nepali-date-converter';

// --- UTILS ---
const formatNPR = (n: number) => "Rs " + new Intl.NumberFormat('en-NP', { maximumFractionDigits: 0 }).format(n);

const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
function toNepaliDigits(num: number | string): string {
    return num.toString().split('').map(c => nepaliDigits[parseInt(c)] || c).join('');
}

// Helper to get formatted Nepali Date (YYYY/MM/DD)
function getFormattedNepaliDate() {
    try {
        const np = new NepaliDate(new Date());
        const y = np.getYear();
        const m = np.getMonth() + 1; // 0-indexed
        const d = np.getDate();
        
        const mStr = m < 10 ? `0${m}` : m;
        const dStr = d < 10 ? `0${d}` : d;

        return `${toNepaliDigits(y)}/${toNepaliDigits(mStr)}/${toNepaliDigits(dStr)}`;
    } catch (e) {
        return "Loading Date...";
    }
}

// --- COMPONENTS ---

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
  const [currentNepaliDate, setCurrentNepaliDate] = useState("");

  // Initial Load
  useEffect(() => { 
      loadInitial(); 
      setCurrentNepaliDate(getFormattedNepaliDate());
      
      const timer = setInterval(() => setCurrentNepaliDate(getFormattedNepaliDate()), 60000);
      return () => clearInterval(timer);
  }, []);

  // Reload data when range changes
  useEffect(() => { loadReports(); }, [range]);

  async function loadInitial() {
    try {
        const dashData = await getDashboardData();
        if (dashData && dashData.tenant) setTenant(dashData.tenant);
    } catch (error) { console.error(error); }
  }

  async function loadReports() {
      setLoading(true);
      try {
          const res = await getReportData(range);
          if (res.success) {
              setData(res);
          } else {
              toast.error("Failed to load report data");
          }
      } catch (e) {
          toast.error("Connection error");
      } finally {
          setLoading(false);
      }
  }

  // Filter Transactions on Frontend
  const transactions = data?.transactions?.filter((t: any) => {
      const matchesSearch = t.id.toLowerCase().includes(search.toLowerCase()) || 
                            t.details.toLowerCase().includes(search.toLowerCase()) ||
                            (t.customer?.name && t.customer.name.toLowerCase().includes(search.toLowerCase()));
      const matchesType = filterType === "All" || t.type === filterType;
      return matchesSearch && matchesType;
  }) || [];

  const downloadCSV = () => {
    if (!data?.transactions?.length) return toast.error("No data available to export");
    
    const header = "ID,Date,Time,Type,Details,Method,Amount,Items,Status\n";
    const rows = data.transactions.map((t:any) => {
        const dateObj = new Date(t.date);
        const dateStr = dateObj.toLocaleDateString();
        const timeStr = dateObj.toLocaleTimeString();
        const itemStr = t.items ? t.items.map((i:any) => `${i.qty}x ${i.name}`).join(" | ") : "";
        
        const safeDetails = t.details.replace(/"/g, '""');
        const safeItems = itemStr.replace(/"/g, '""');

        return `${t.id},${dateStr},${timeStr},${t.type},"${safeDetails}",${t.method},${t.amount},"${safeItems}",${t.status}`;
    }).join("\n");

    const csvContent = "data:text/csv;charset=utf-8," + encodeURI(header + rows);
    const link = document.createElement("a"); 
    link.href = csvContent; 
    link.download = `GeckoReport_${range}_${new Date().toISOString().split('T')[0]}.csv`; 
    link.click();
    
    toast.success("Report Exported Successfully");
  };

  const getRangeLabel = (r: string) => {
      switch(r) {
          case 'today': return 'Today';
          case '7d': return 'Last 7 Days';
          case '30d': return 'Last 30 Days';
          case '90d': return 'Last 3 Months';
          case '1y': return 'Last 1 Year';
          default: return r;
      }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden">
      <div className="hidden md:block">
        <Sidebar tenantName={tenant?.name || "Admin"} tenantCode={tenant?.code || "..."} logo={tenant?.logo_url} />
      </div>

      <main className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar relative">
        {/* HEADER */}
        <div className="px-6 py-6 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm transition-all">
            <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Financial Command</h1>
                <div className="flex items-center gap-3 mt-1">
                    <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-md">
                        <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
                        <span className="tracking-wide">BS: <span className="text-slate-900 font-black">{currentNepaliDate}</span></span>
                    </p>
                    <span className="text-slate-300">|</span>
                    <p className="text-xs font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-1 rounded-md flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {getRangeLabel(range)}
                    </p>
                </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner overflow-x-auto no-scrollbar max-w-full">
                    {['today', '7d', '30d', '90d', '1y'].map((r) => (
                        <button 
                            key={r} 
                            onClick={() => setRange(r as any)} 
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${range === r ? 'bg-white text-slate-900 shadow-md ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'}`}
                        >
                            {r === 'today' ? 'Today' : r.toUpperCase()}
                        </button>
                    ))}
                </div>
                <button onClick={downloadCSV} className="h-10 px-5 bg-slate-900 text-white rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-95 group">
                    <Download className="w-4 h-4 group-hover:animate-bounce" /> <span className="hidden md:inline text-xs font-bold tracking-wide">Export CSV</span>
                </button>
            </div>
        </div>

        {loading ? (
            <div className="flex-1 flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        </div>
                    </div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Calculating Metrics...</p>
                </div>
            </div>
        ) : (
            <div className="p-4 md:p-8 space-y-6 md:space-y-8 pb-32">
                
                {/* METRIC CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title="Total Revenue" value={formatNPR(data?.stats?.totalRevenue || 0)} sub="Gross Income" icon={Banknote} type="positive" delay={0.1} />
                    <StatCard title="Net Profit" value={formatNPR(data?.stats?.netProfit || 0)} sub="After Expenses" icon={Wallet} type="positive" delay={0.2} />
                    <StatCard title="Total Expenses" value={formatNPR(data?.stats?.totalExpense || 0)} sub="Operational Cost" icon={ArrowDownRight} type="negative" delay={0.3} />
                    <StatCard title="Total Orders" value={data?.stats?.totalOrders || 0} sub={`${getRangeLabel(range)} Volume`} icon={FileSpreadsheet} type="positive" delay={0.4} />
                </div>

                {/* CHARTS SECTION */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[420px]">
                    {/* AREA CHART */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col relative overflow-hidden group hover:border-emerald-100 transition-colors">
                        <div className="flex justify-between items-center mb-6 z-10">
                            <div><h3 className="font-black text-lg text-slate-900 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-500" /> Cash Flow</h3></div>
                            <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wide">
                                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100"/> Income</span>
                                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-orange-500 ring-2 ring-orange-100"/> Expense</span>
                            </div>
                        </div>
                        <div className="flex-1 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data?.chartData || []}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/><stop offset="95%" stopColor="#10B981" stopOpacity={0}/></linearGradient>
                                        <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F97316" stopOpacity={0.1}/><stop offset="95%" stopColor="#F97316" stopOpacity={0}/></linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize:10, fontWeight:700, fill:'#94a3b8'}} minTickGap={30} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize:10, fontWeight:700, fill:'#94a3b8'}} tickFormatter={(v) => `Rs ${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`} width={60} />
                                    
                                    {/* FIX: Type Safe Formatter */}
                                    <Tooltip 
                                        contentStyle={{borderRadius:'16px', border:'none', boxShadow:'0 20px 40px -10px rgba(0,0,0,0.1)', fontFamily: 'inherit'}} 
                                        formatter={(val: any) => formatNPR(Number(val || 0))}
                                        labelStyle={{fontWeight: 900, color: '#0f172a', marginBottom: '4px'}}
                                    />
                                    <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={4} fill="url(#colorRev)" animationDuration={1500} />
                                    <Area type="monotone" dataKey="expense" stroke="#F97316" strokeWidth={4} fill="url(#colorExp)" animationDuration={1500} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* SIDE STATS */}
                    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                        {/* Payment Methods */}
                        <div>
                            <h3 className="font-black text-lg text-slate-900 mb-4 flex items-center gap-2"><PieChart className="w-5 h-5 text-purple-500" /> Payment Split</h3>
                            <div className="space-y-3">
                                {Object.entries(data?.paymentMethods || {}).map(([k, v]:any) => (
                                    <div key={k} className="flex justify-between items-center p-3.5 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${k==='Cash'?'bg-emerald-100 text-emerald-600':k.includes('QR')?'bg-purple-100 text-purple-600':'bg-blue-100 text-blue-600'}`}>
                                                {k==='Cash'?<Banknote className="w-5 h-5"/>:k.includes('QR')?<QrCode className="w-5 h-5"/>:<CreditCard className="w-5 h-5"/>}
                                            </div>
                                            <span className="font-bold text-slate-700 text-xs">{k}</span>
                                        </div>
                                        <span className="font-black text-slate-900 text-sm">{formatNPR(v)}</span>
                                    </div>
                                ))}
                                {Object.keys(data?.paymentMethods || {}).length === 0 && <div className="text-center text-xs text-slate-400 py-8 italic bg-slate-50 rounded-2xl">No payment data recorded</div>}
                            </div>
                        </div>
                        
                        {/* Staff Performance */}
                        {Object.keys(data?.staffPerformance || {}).length > 0 && (
                            <div>
                                <h3 className="font-black text-lg text-slate-900 mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-blue-500" /> Top Performers</h3>
                                <div className="space-y-2">
                                    {Object.entries(data?.staffPerformance || {}).slice(0,3).map(([k, v]:any, i) => (
                                        <div key={i} className="flex justify-between items-center text-xs p-2 rounded-lg hover:bg-slate-50">
                                            <div className="flex items-center gap-2">
                                                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[10px]">{i+1}</span>
                                                <span className="font-bold text-slate-600">{k}</span>
                                            </div>
                                            <span className="font-bold text-slate-900">{formatNPR(v)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* TRANSACTION LEDGER */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4 bg-gradient-to-b from-slate-50/50 to-white">
                        <div>
                            <h3 className="font-black text-lg text-slate-900 flex items-center gap-2"><CreditCard className="w-5 h-5 text-slate-400"/> Transaction Ledger</h3>
                            <p className="text-xs text-slate-400 font-bold mt-1">Detailed breakdown for {getRangeLabel(range)}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64 group">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors"/>
                                <input 
                                    value={search} 
                                    onChange={e=>setSearch(e.target.value)} 
                                    placeholder="Search ID, Customer, Table..." 
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                                />
                            </div>
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                {['All', 'Income', 'Expense'].map(t => (
                                    <button key={t} onClick={() => setFilterType(t)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${filterType===t ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>{t}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50/80 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Transaction ID</th>
                                    <th className="px-6 py-4">Date & Time</th>
                                    <th className="px-6 py-4">Details</th>
                                    <th className="px-6 py-4">Method</th>
                                    <th className="px-6 py-4 text-right">Amount</th>
                                    <th className="px-6 py-4 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {transactions.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No transactions found for this period</td></tr>
                                ) : (
                                    transactions.map((t:any, i:number) => (
                                        <React.Fragment key={i}>
                                            <tr className={`transition-colors cursor-pointer border-l-4 ${expandedId === t.id ? 'bg-slate-50 border-l-emerald-500' : 'hover:bg-slate-50/50 border-l-transparent'}`} onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}>
                                                <td className="px-6 py-4 font-black text-slate-700 font-mono text-[11px] tracking-wide">{t.id.slice(0,8)}...</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-slate-700">{new Date(t.date).toLocaleDateString()}</span>
                                                        <span className="text-[10px] font-bold text-slate-400">{new Date(t.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs font-bold text-slate-700">{t.details}</span>
                                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded w-fit ${t.status==='Completed' || t.status==='Paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                                                            {t.status === 'Pending' ? 'Unpaid' : t.status}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4"><span className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold w-fit border ${t.method==='Cash'?'bg-emerald-50 text-emerald-700 border-emerald-100':t.method.includes('QR')?'bg-purple-50 text-purple-700 border-purple-100':'bg-blue-50 text-blue-700 border-blue-100'}`}>{t.method}</span></td>
                                                <td className={`px-6 py-4 text-right font-black ${t.type==='Expense'?'text-orange-500': 'text-emerald-600'}`}>{t.type==='Expense'?'-':'+'} {formatNPR(t.amount)}</td>
                                                <td className="px-6 py-4 text-slate-400">{t.items?.length > 0 && (expandedId === t.id ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>)}</td>
                                            </tr>
                                            
                                            {/* EXPANDABLE DETAILS */}
                                            {expandedId === t.id && (
                                                <tr className="bg-slate-50/50 shadow-inner">
                                                    <td colSpan={6} className="px-6 py-6">
                                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex flex-col gap-4">
                                                            {/* Customer Info */}
                                                            {t.customer?.name && (
                                                                <div className="flex items-center gap-6 pb-4 border-b border-slate-200">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer</span>
                                                                        <span className="text-sm font-bold text-slate-900">{t.customer.name}</span>
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact</span>
                                                                        <span className="text-sm font-bold text-slate-700">{t.customer.phone || "N/A"}</span>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Items Grid */}
                                                            {t.items?.length > 0 ? (
                                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                                                    {t.items.map((item:any, idx:number) => (
                                                                        <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                                                            <div className="flex justify-between items-start mb-2">
                                                                                <span className="font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md text-xs">{item.qty}x</span>
                                                                                <span className="text-[10px] font-bold text-emerald-600">{formatNPR(item.price)}</span>
                                                                            </div>
                                                                            <span className="text-xs font-bold text-slate-700 leading-tight line-clamp-2">{item.name}</span>
                                                                            {item.variant && <span className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-wide">{item.variant}</span>}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="text-xs text-slate-400 italic text-center py-2">No item details available.</div>
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