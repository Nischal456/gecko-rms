"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/app/staff/waiter/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, Calendar, Download, FileText, 
  CreditCard, CheckCircle2, Clock, XCircle, 
  Plus, Loader2, IndianRupee, Zap, Send, LayoutDashboard
} from "lucide-react";
import { getWaiterReports, submitLeaveRequest } from "@/app/actions/waiter-reports";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// --- UTILS ---
const formatRs = (n: number) => "Rs " + new Intl.NumberFormat('en-NP', { maximumFractionDigits: 0 }).format(n);

// --- COMPONENTS ---

function StatCard({ title, value, icon: Icon, color, delay }: any) {
    const colors: any = {
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        orange: "bg-orange-50 text-orange-600 border-orange-100" // New color for Avg Value
    };
    
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
            className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden group hover:shadow-md transition-all"
        >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${colors[color]}`}>
                <Icon className="w-7 h-7" />
            </div>
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
                <h3 className="text-2xl font-black text-slate-900 mt-0.5">{value}</h3>
            </div>
            {/* Background Blob decoration */}
            <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-10 transition-transform group-hover:scale-150 ${color === 'emerald' ? 'bg-emerald-500' : color === 'blue' ? 'bg-blue-500' : 'bg-orange-500'}`} />
        </motion.div>
    )
}

function LeaveModal({ isOpen, onClose }: any) {
    const [formData, setFormData] = useState({ type: 'Sick Leave', from: '', to: '', reason: '' });
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if(!formData.from || !formData.to || !formData.reason) return toast.error("Please fill all fields");
        setSubmitting(true);
        const res = await submitLeaveRequest(formData);
        setSubmitting(false);
        if(res.success) {
            toast.success("Request Sent!");
            onClose();
        } else {
            toast.error(res.msg);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white w-full max-w-md p-6 rounded-[2rem] shadow-2xl">
                <h2 className="text-xl font-black text-slate-900 mb-6">Request Leave</h2>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Leave Type</label>
                        <div className="flex gap-2">
                            {['Sick Leave', 'Casual', 'Urgent'].map(t => (
                                <button key={t} onClick={() => setFormData({...formData, type: t})} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${formData.type === t ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">From</label>
                            <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500" onChange={(e) => setFormData({...formData, from: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">To</label>
                            <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500" onChange={(e) => setFormData({...formData, to: e.target.value})} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Reason</label>
                        <textarea rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500 resize-none" placeholder="Why do you need leave?" onChange={(e) => setFormData({...formData, reason: e.target.value})} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-8">
                    <button onClick={onClose} className="py-3.5 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors">Cancel</button>
                    <button onClick={handleSubmit} disabled={submitting} className="py-3.5 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20">
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Submit Request</>}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

export default function ReportsPage() {
    const [activeTab, setActiveTab] = useState<'performance' | 'payroll' | 'leave'>('performance');
    const [data, setData] = useState<any>({ stats: {}, payroll: [], leaves: [] });
    const [loading, setLoading] = useState(true);
    const [isLeaveModalOpen, setLeaveModalOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        const res = await getWaiterReports();
        if(res.success) setData(res);
        setLoading(false);
    }

    const { stats, payroll, leaves } = data;

    // Calculate Avg Order Value (Avoid division by zero)
    const avgOrderValue = stats.tablesServed > 0 
        ? (stats.totalSales / stats.tablesServed) 
        : 0;

    return (
        <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900">
            <Sidebar />
            <LeaveModal isOpen={isLeaveModalOpen} onClose={() => { setLeaveModalOpen(false); loadData(); }} />
            
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                <header className="px-8 py-6 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-20">
                    <div className="flex justify-between items-center max-w-5xl mx-auto w-full">
                        <div>
                            <h1 className="text-2xl font-black text-slate-900">My Reports</h1>
                            <p className="text-sm font-bold text-slate-400 mt-1">Track performance & earnings</p>
                        </div>
                        
                        <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
                            {['performance', 'payroll', 'leave'].map((tab) => (
                                <button 
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={`px-5 py-2 rounded-lg text-xs font-bold capitalize transition-all ${activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="max-w-5xl mx-auto space-y-8">
                        
                        {/* 1. PERFORMANCE TAB */}
                        {activeTab === 'performance' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <StatCard title="Total Sales (Month)" value={formatRs(stats.totalSales || 0)} icon={IndianRupee} color="emerald" delay={0.1} />
                                    <StatCard title="Tables Served" value={stats.tablesServed || 0} icon={LayoutDashboard} color="blue" delay={0.2} />
                                    
                                    {/* REPLACED STAT: Est. Commission -> Avg. Order Value */}
                                    <StatCard 
                                        title="Avg. Order Value" 
                                        value={formatRs(avgOrderValue)} 
                                        icon={Zap} 
                                        color="orange" 
                                        delay={0.3} 
                                    />
                                </div>

                                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm h-80">
                                    <h3 className="text-sm font-bold text-slate-900 mb-6">Sales Trend (This Month)</h3>
                                    <ResponsiveContainer width="100%" height="85%">
                                        <AreaChart data={stats.chartData || []}>
                                            <defs>
                                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94A3B8'}} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94A3B8'}} />
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' }} />
                                            <Area type="monotone" dataKey="sales" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </motion.div>
                        )}

                        {/* 2. PAYROLL TAB */}
                        {activeTab === 'payroll' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                    <h3 className="font-black text-lg">Salary History</h3>
                                    <button className="text-xs font-bold text-emerald-600 flex items-center gap-1 hover:underline"><Download className="w-3 h-3" /> Download Slip</button>
                                </div>
                                
                                {payroll.length === 0 ? (
                                    <div className="p-12 text-center text-slate-400 text-sm font-bold">No payment history found</div>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {payroll.map((pay: any, i: number) => (
                                            <div key={i} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                                                        <CreditCard className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900">{pay.month}</p>
                                                        <p className="text-xs text-slate-400">{pay.date}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-black text-slate-900">{formatRs(pay.amount)}</p>
                                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wide">Paid</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* 3. LEAVE TAB */}
                        {activeTab === 'leave' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                                <div className="flex justify-between items-center bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-[2rem] text-white shadow-xl shadow-slate-900/10">
                                    <div>
                                        <h3 className="font-black text-xl">Need a break?</h3>
                                        <p className="text-slate-400 text-sm mt-1">Submit your leave request for approval.</p>
                                    </div>
                                    <button onClick={() => setLeaveModalOpen(true)} className="bg-white text-slate-900 px-5 py-3 rounded-xl text-xs font-black hover:bg-emerald-400 transition-colors flex items-center gap-2">
                                        <Plus className="w-4 h-4" /> Apply Now
                                    </button>
                                </div>

                                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                                    <div className="p-6 border-b border-slate-100 font-black text-lg">Request History</div>
                                    {leaves.length === 0 ? (
                                        <div className="p-12 text-center text-slate-400 text-sm font-bold">No requests found</div>
                                    ) : (
                                        <div className="divide-y divide-slate-100">
                                            {leaves.map((leave: any, i: number) => {
                                                const statusColor = 
                                                    leave.status === 'approved' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' :
                                                    leave.status === 'rejected' ? 'text-red-600 bg-red-50 border-red-100' :
                                                    'text-orange-600 bg-orange-50 border-orange-100';
                                                
                                                const Icon = leave.status === 'approved' ? CheckCircle2 : leave.status === 'rejected' ? XCircle : Clock;

                                                return (
                                                    <div key={i} className="p-5 flex items-center justify-between">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide flex items-center gap-1 ${statusColor}`}>
                                                                    <Icon className="w-3 h-3" /> {leave.status}
                                                                </span>
                                                                <span className="text-xs font-bold text-slate-900">{leave.type}</span>
                                                            </div>
                                                            <p className="text-xs text-slate-400 font-medium">
                                                                {leave.from} <span className="mx-1">→</span> {leave.to}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-[10px] font-bold text-slate-300">Applied on</span>
                                                            <p className="text-xs font-bold text-slate-500">{leave.date_applied}</p>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                    </div>
                </div>
            </main>
        </div>
    );
}