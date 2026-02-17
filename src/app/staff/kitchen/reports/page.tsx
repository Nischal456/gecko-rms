"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  ChefHat, History, FileText, Calendar, DollarSign, 
  LogOut, LayoutGrid, CheckCircle2, XCircle
} from "lucide-react";
import { getKitchenStats } from "@/app/actions/kitchen";
import { logoutStaff } from "@/app/actions/staff-auth";

// --- DOCK (Shared) ---
function KitchenDock() {
    const handleLogout = async () => {
        if(confirm("End Shift?")) {
            await logoutStaff();
            window.location.href = "/staff/login";
        }
    }
    return (
        <motion.div 
            initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} 
            className="fixed bottom-8 left-[50%] translate-x-[-50%] z-50 flex items-center gap-3 p-2.5 bg-slate-900/90 backdrop-blur-3xl rounded-full shadow-2xl border border-white/10 ring-1 ring-black/40"
        >
            <Link href="/staff/kitchen" className="p-3.5 rounded-full bg-white/5 text-white hover:bg-white/20"><ChefHat className="w-5 h-5" /></Link>
            <div className="w-px h-6 bg-white/10 mx-1" />
            <Link href="/staff/kitchen/menu" className="p-3.5 rounded-full bg-white/5 text-slate-400 hover:text-white"><LayoutGrid className="w-5 h-5" /></Link>
            <div className="w-px h-6 bg-white/10 mx-1" />
            <Link href="/staff/kitchen/reports" className="p-3.5 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"><History className="w-5 h-5" /></Link>
            <div className="w-px h-6 bg-white/10 mx-1" />
            <button onClick={handleLogout} className="p-3.5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white"><LogOut className="w-5 h-5" /></button>
        </motion.div>
    )
}

export default function KitchenReportsPage() {
    const [data, setData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'daily' | 'leaves' | 'payroll'>('daily');

    useEffect(() => {
        getKitchenStats().then(res => {
            if(res.success) setData(res);
        });
    }, []);

    if(!data) return <div className="min-h-screen bg-[#F1F5F9] p-10 text-center font-black text-slate-300 text-2xl">Generating Report...</div>;

    return (
        <div className="min-h-screen bg-[#F1F5F9] font-sans text-slate-900 pb-32">
            <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 px-6 py-6 sticky top-0 z-20">
                <h1 className="text-3xl font-black text-slate-900">Kitchen Reports</h1>
                <div className="flex gap-2 mt-4">
                    <TabButton label="Daily Production" icon={<FileText className="w-4 h-4" />} active={activeTab === 'daily'} onClick={() => setActiveTab('daily')} />
                    <TabButton label="Staff Leaves" icon={<Calendar className="w-4 h-4" />} active={activeTab === 'leaves'} onClick={() => setActiveTab('leaves')} />
                    <TabButton label="Payroll History" icon={<DollarSign className="w-4 h-4" />} active={activeTab === 'payroll'} onClick={() => setActiveTab('payroll')} />
                </div>
            </header>

            <div className="p-6 max-w-5xl mx-auto space-y-6">
                
                {/* DAILY SALES VIEW */}
                {activeTab === 'daily' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatCard label="Total Orders" value={data.stats.total} color="bg-blue-500" />
                            <StatCard label="Completed" value={data.stats.completed} color="bg-emerald-500" />
                            <StatCard label="Pending" value={data.stats.pending} color="bg-orange-500" />
                            <StatCard label="Est. Revenue" value={`Rs. ${data.stats.revenue}`} color="bg-slate-900" />
                        </div>
                        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50"><h2 className="font-black text-lg">Today's Log</h2></div>
                            <div className="divide-y divide-slate-100">
                                {data.history.map((order: any) => (
                                    <div key={order.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                                        <div><p className="font-bold text-lg">{order.table_name}</p><p className="text-xs text-slate-400 font-mono">{new Date(order.created_at).toLocaleTimeString()}</p></div>
                                        <div className="text-right"><span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold"><CheckCircle2 className="w-3 h-3" /> Served</span></div>
                                    </div>
                                ))}
                                {data.history.length === 0 && <div className="p-8 text-center text-slate-400 italic">No orders yet.</div>}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* LEAVES VIEW */}
                {activeTab === 'leaves' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50"><h2 className="font-black text-lg">Recent Leave Requests</h2></div>
                            <div className="divide-y divide-slate-100">
                                {data.leaves && data.leaves.length > 0 ? data.leaves.map((leave: any) => (
                                    <div key={leave.id} className="p-5 flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-lg">{leave.staff_name || "Staff Member"}</p>
                                            <p className="text-xs font-bold text-slate-400 uppercase">{leave.type} • {leave.days} Days</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase ${leave.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{leave.status}</span>
                                    </div>
                                )) : <div className="p-10 text-center text-slate-400 font-bold">No leave records found.</div>}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* PAYROLL VIEW */}
                {activeTab === 'payroll' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50"><h2 className="font-black text-lg">Payroll History</h2></div>
                            <div className="divide-y divide-slate-100">
                                {data.payroll && data.payroll.length > 0 ? data.payroll.map((pay: any) => (
                                    <div key={pay.id} className="p-5 flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-lg">{pay.staff_name || "Chef"}</p>
                                            <p className="text-xs text-slate-400 font-mono">Paid on: {new Date(pay.payment_date).toLocaleDateString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-lg text-emerald-600">Rs. {pay.amount}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Base Salary</p>
                                        </div>
                                    </div>
                                )) : <div className="p-10 text-center text-slate-400 font-bold">No payroll records found.</div>}
                            </div>
                        </div>
                    </motion.div>
                )}

            </div>
            <KitchenDock />
        </div>
    )
}

function StatCard({ label, value, color }: any) {
    return (
        <div className={`${color} text-white p-6 rounded-2xl shadow-lg`}>
            <p className="text-xs font-bold uppercase opacity-70 mb-1">{label}</p>
            <p className="text-3xl font-black">{value}</p>
        </div>
    )
}

function TabButton({ label, icon, active, onClick }: any) {
    return (
        <button 
            onClick={onClick}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition-all ${active ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
        >
            {icon} {label}
        </button>
    )
}