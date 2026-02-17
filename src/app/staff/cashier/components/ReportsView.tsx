"use client";
import { useState, useEffect } from "react";
import { getCashierReports } from "@/app/actions/cashier"; 
import { Loader2, CheckCircle2, Banknote, QrCode, UserCircle, Search, Download, ChevronUp, ChevronDown } from "lucide-react";
import React from "react";
import { toast } from "sonner";

const formatRs = (amount: number) => "Rs " + new Intl.NumberFormat('en-NP').format(amount);
const toBS = (dateStr: string) => { try { const d=new Date(dateStr); d.setDate(d.getDate()+17); d.setMonth(d.getMonth()+8); d.setFullYear(d.getFullYear()+56); return `${d.getFullYear()}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')}`; } catch { return "---"; }};

function exportToCSV(bills: any[]) {
    if(!bills || bills.length === 0) return toast.error("No data available");
    let csv = "Bill Number,Date(AD),Date(BS),Time,Table,Items,Total,Method,Customer Name,Customer Address\n";
    bills.forEach((b: any) => {
        const items = b.items?.map((i:any) => `${i.qty}x ${i.name}`).join(" | ") || "";
        csv += `${b.invoice_no},${b.date},${toBS(b.date)},${b.time},${b.table_no},"${items}",${b.grandTotal},${b.payment_method},"${b.customer_name||''}","${b.customer_address||''}"\n`;
    });
    const link = document.createElement("a"); link.href = "data:text/csv;charset=utf-8," + encodeURI(csv); link.download = `Report_${new Date().toISOString().split('T')[0]}.csv`; link.click();
}

export default function ReportsView({ data }: any) {
    const [range, setRange] = useState(7);
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedBill, setExpandedBill] = useState<string | null>(null);

    useEffect(() => { load(range); }, [range]);
    async function load(d: number) { setLoading(true); const res = await getCashierReports(d); if(res.success) setReport(res); setLoading(false); }

    const filteredBills = report?.bills?.filter((b: any) => 
        b.invoice_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.table_no?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    return (
        <div className="p-8 h-full overflow-y-auto bg-[#F8FAFC] pb-32">
            <div className="flex justify-between items-center mb-10">
                <div><h1 className="text-4xl font-black text-slate-900 tracking-tight">Business Reports</h1></div>
                <div className="flex gap-2 bg-white p-1 rounded-2xl shadow-sm border border-slate-100">{[1,7,30,90,365].map(d => (<button key={d} onClick={() => setRange(d)} className={`px-4 py-2 rounded-xl text-xs font-bold ${range === d ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>{d} Days</button>))}</div>
            </div>
            {loading ? <div className="h-96 flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-slate-300" /></div> : report ? (
                <div className="animate-in fade-in slide-in-from-bottom-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden"><div className="relative z-10"><p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Total Revenue</p><h2 className="text-5xl font-black">{formatRs(report.summary.total)}</h2><p className="mt-4 text-emerald-400 text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {report.summary.count} Successful Orders</p></div></div>
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100"><p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">Payment Split</p><div className="space-y-4">{Object.entries(report.summary.byMethod || {}).map(([k,v]:any) => (<div key={k} className="flex justify-between items-center"><span className="font-bold text-slate-700 capitalize">{k}</span><span className="font-black text-slate-900">{formatRs(v)}</span></div>))}</div></div>
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100"><p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">Top Staff</p><div className="space-y-4 max-h-48 overflow-y-auto custom-scrollbar">{Object.entries(report.summary.byStaff || {}).map(([k,v]:any) => (<div key={k} className="flex justify-between items-center"><span className="font-bold text-slate-700">{k}</span><span className="font-black text-slate-900 text-xs">{formatRs(v)}</span></div>))}</div></div>
                    </div>
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden"><div className="p-8 border-b border-slate-50 flex justify-between items-center"><div className="flex items-center gap-4 bg-slate-50 px-4 py-3 rounded-2xl border border-slate-200 w-96"><Search className="w-5 h-5 text-slate-400" /><input placeholder="Search bill number or table..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-transparent outline-none font-bold text-sm w-full" /></div><button onClick={() => exportToCSV(report.bills)} className="px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-lg"><Download className="w-4 h-4" /> Export CSV</button></div>
                        <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-slate-50 text-slate-400 uppercase text-xs font-bold tracking-wider"><tr><th className="px-8 py-5">Bill Number</th><th className="px-8 py-5">Date</th><th className="px-8 py-5">Table</th><th className="px-8 py-5">Method</th><th className="px-8 py-5 text-right">Amount</th><th className="px-8 py-5"></th></tr></thead><tbody className="divide-y divide-slate-50 text-sm font-medium text-slate-600">
                            {filteredBills.map((b:any, i:number) => (
                                <React.Fragment key={i}>
                                    <tr className="hover:bg-slate-50/80 transition-colors group"><td className="px-8 py-5 font-bold text-slate-900">{b.invoice_no}</td><td className="px-8 py-5">{toBS(b.date)}</td><td className="px-8 py-5"><span className="bg-slate-100 px-3 py-1 rounded-lg text-xs font-bold">{b.table_no}</span></td><td className="px-8 py-5 uppercase">{b.payment_method}</td><td className="px-8 py-5 text-right font-black text-slate-900">{formatRs(b.grandTotal)}</td><td className="px-8 py-5 text-right"><button onClick={() => setExpandedBill(expandedBill === b.invoice_no ? null : b.invoice_no)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">{expandedBill === b.invoice_no ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}</button></td></tr>
                                    {expandedBill === b.invoice_no && <tr className="bg-slate-50/50"><td colSpan={6} className="px-8 py-6"><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{b.items?.map((item:any, idx:number) => (<div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col"><div className="flex justify-between items-start mb-1"><span className="font-black text-slate-900">{item.qty}x</span><span className="text-[10px] text-slate-400">{formatRs(item.price)}</span></div><span className="text-xs font-bold text-slate-700 leading-tight">{item.name}</span>{item.variant && <span className="text-[10px] text-slate-400 italic mt-1">{item.variant}</span>}</div>))}</div>{(b.customer_name || b.customer_address) && <div className="mt-4 pt-4 border-t border-slate-200 flex gap-6 text-xs text-slate-500">{b.customer_name && <span><strong className="text-slate-900">Customer:</strong> {b.customer_name}</span>}{b.customer_address && <span><strong className="text-slate-900">Address:</strong> {b.customer_address}</span>}</div>}</td></tr>}
                                </React.Fragment>
                            ))}
                        </tbody></table></div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}