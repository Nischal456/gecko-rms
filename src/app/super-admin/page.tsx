"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Plus, MoreHorizontal, Loader2, Zap, Server, Users, DollarSign, Globe, Wifi, 
  CheckCircle2, LayoutTemplate, Box, Rocket, Check, X, 
  ExternalLink, Trash2, Send, ShieldAlert, RefreshCw, MessageSquare, Lock, LogOut, Key,
  Search, ArrowRight, Edit3, Save, Crown, CalendarDays, Radio, Target, 
  Bell, Info, AlertTriangle, CheckCircle, CheckCheck, Clock, User, Calendar
} from "lucide-react";
import { toast } from "sonner";
import { 
    getAllTenants, createTenant, toggleSubscription, updateFeatureFlags, 
    deleteTenant, updateTenantPrice, updateTenantPlan, sendNotification, 
    getSystemAlerts, markSystemRead, updateTenantValidity, logTenantPayment
} from "@/app/actions/super-admin";
import { impersonateTenant } from "@/app/actions/auth";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";

// ==========================================
// 1. PREMIUM NETWORK MESH VISUALIZER
// ==========================================
function NetworkMesh({ tenants }: { tenants: any[] }) {
    if (tenants.length === 0) return null;
    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            <svg width="100%" height="100%" className="absolute inset-0 opacity-40">
                <defs>
                    <radialGradient id="hubGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                        <stop offset="0%" style={{stopColor:"#22c55e", stopOpacity:0.8}} />
                        <stop offset="100%" style={{stopColor:"#fff", stopOpacity:0}} />
                    </radialGradient>
                    <filter id="glow"><feGaussianBlur stdDeviation="2" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                </defs>
                <circle cx="85%" cy="20%" r="60" fill="url(#hubGradient)" className="animate-pulse" />
                <circle cx="85%" cy="20%" r="150" stroke="#22c55e" strokeWidth="1" fill="none" opacity="0.2" className="animate-[spin_20s_linear_infinite]" />
                <circle cx="85%" cy="20%" r="250" stroke="#22c55e" strokeWidth="1" strokeDasharray="8 8" fill="none" opacity="0.1" className="animate-[spin_60s_linear_infinite_reverse]" />
                {tenants.map((t, i) => {
                    const xPercent = 10 + (i % 4) * 20 + (Math.random() * 5);
                    const yPercent = 40 + Math.floor(i / 4) * 15 + (Math.random() * 10);
                    return (
                        <g key={t.id}>
                            <line x1="85%" y1="20%" x2={`${xPercent}%`} y2={`${yPercent}%`} stroke="#22c55e" strokeWidth="1" strokeOpacity="0.15" />
                            {t.subscription_status === 'active' && (
                                <circle r="3" fill="#4ade80" filter="url(#glow)">
                                    <animateMotion dur={`${2 + (i % 5)}s`} repeatCount="indefinite" path={`M${typeof window !== 'undefined' ? window.innerWidth * 0.85 : 0},${typeof window !== 'undefined' ? window.innerHeight * 0.2 : 0} L${typeof window !== 'undefined' ? window.innerWidth * (xPercent/100) : 0},${typeof window !== 'undefined' ? window.innerHeight * (yPercent/100) : 0}`} keyPoints="0;1" keyTimes="0;1" />
                                </circle>
                            )}
                            <circle cx={`${xPercent}%`} cy={`${yPercent}%`} r="4" fill={t.subscription_status === 'active' ? '#10b981' : '#ef4444'} />
                            <text x={`${xPercent}%`} y={`${yPercent}%`} dy="20" textAnchor="middle" fill="#22c55e" fontSize="10" fontWeight="bold" className="uppercase font-mono tracking-widest opacity-60">{t.code}</text>
                        </g>
                    )
                })}
            </svg>
        </div>
    )
}

// ==========================================
// 2. INTELLIGENT NOTIFICATION CENTER
// ==========================================
function NotificationCenter() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function fetchNotifs() {
            const res = await getSystemAlerts();
            if (res.success && res.data) setNotifications(res.data);
        }
        fetchNotifs();
        const interval = setInterval(fetchNotifs, 10000); 
        return () => clearInterval(interval);
    }, []);

    const unreadCount = notifications.filter((n: any) => !n.is_read).length;

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        await markSystemRead(id);
    };

    const handleMarkAllRead = async () => {
        const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        for (const id of unreadIds) { await markSystemRead(id); }
    };

    return (
        <div className="relative z-50" ref={containerRef}>
            <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)} 
                className={`relative w-12 h-12 md:w-14 md:h-14 flex items-center justify-center bg-white border border-slate-100 rounded-[1.2rem] shadow-sm hover:shadow-md transition-all ${isOpen ? 'ring-4 ring-slate-100 bg-slate-50' : ''}`}
            >
                <Bell className={`w-5 h-5 md:w-6 md:h-6 ${unreadCount > 0 ? 'text-slate-900 fill-slate-900' : 'text-slate-400'}`} />
                {unreadCount > 0 && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1 -right-1 min-w-[20px] h-5 md:h-6 bg-red-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm px-1">
                        <span className="text-[9px] md:text-[10px] font-black text-white leading-none">{unreadCount > 9 ? '9+' : unreadCount}</span>
                    </motion.div>
                )}
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/10 backdrop-blur-[2px] z-40 md:hidden" onClick={() => setIsOpen(false)} />
                        <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95, filter: "blur(10px)" }} 
                            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }} 
                            exit={{ opacity: 0, y: 10, scale: 0.95, filter: "blur(10px)" }}
                            style={{ transformOrigin: "top right" }}
                            className="fixed top-[130px] left-4 right-4 md:absolute md:top-16 md:left-auto md:right-0 md:w-[420px] bg-white/95 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-white/20 z-50 overflow-hidden ring-1 ring-black/5"
                        >
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white/50">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-black text-slate-900 text-sm tracking-wide">System Monitor</h3>
                                    <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-slate-900/20">{unreadCount} Alerts</span>
                                </div>
                                {unreadCount > 0 && (
                                    <button onClick={handleMarkAllRead} className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 active:scale-95">
                                        <CheckCheck className="w-3 h-3" /> Mark all read
                                    </button>
                                )}
                            </div>
                            
                            <div className="max-h-[380px] overflow-y-auto custom-scrollbar">
                                {notifications.length === 0 ? (
                                    <div className="p-10 flex flex-col items-center justify-center text-center">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4"><Bell className="w-8 h-8 text-slate-200" /></div>
                                        <p className="text-slate-900 text-sm font-bold">System Nominal</p>
                                        <p className="text-slate-400 text-xs mt-1">No alerts generated in the last 24h.</p>
                                    </div>
                                ) : (
                                    notifications.map((n: any) => (
                                        <motion.div layout key={n.id} onClick={() => handleRead(n.id)} className={`group relative p-4 mx-3 my-2 rounded-2xl cursor-pointer transition-all border border-transparent ${n.is_read ? 'bg-transparent opacity-50 hover:bg-slate-50' : 'bg-gradient-to-r from-white to-slate-50 shadow-sm border-slate-100 hover:shadow-md hover:border-emerald-100'}`}>
                                            <div className="flex gap-4 items-start">
                                                <div className={`mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${n.type === 'alert' ? 'bg-red-100 text-red-600' : n.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                                    {n.type === 'alert' ? <AlertTriangle className="w-5 h-5" /> : n.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <h4 className={`text-sm font-bold ${n.type === 'alert' ? 'text-red-600' : 'text-slate-900'}`}>{n.title}</h4>
                                                        {!n.is_read && <span className="w-2 h-2 bg-emerald-500 rounded-full shadow-sm animate-pulse"></span>}
                                                    </div>
                                                    {n.tenants && (
                                                        <div className="inline-flex items-center gap-1.5 mt-1.5 mb-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                                                            <User className="w-3 h-3 text-slate-500" />
                                                            <span className="text-[10px] font-bold text-slate-800">{n.tenants.name}</span>
                                                            <span className="text-[9px] font-mono text-slate-400">({n.tenants.code})</span>
                                                        </div>
                                                    )}
                                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium line-clamp-2">{n.message}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold mt-2.5 uppercase tracking-wider flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(n.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}

// ==========================================
// 3. TENANT CARD (FIXED BILLING CALCULATION)
// ==========================================
function TenantCard({ t, i, onEditPrice, onEditPlan, onEditValidity, onManage }: any) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // EXACT EXPIRATION ENGINE
    let expireDate;
    let cycleText = "Monthly Cycle";
    let totalDays = 30;

    if (t.feature_flags?.valid_until) {
        expireDate = new Date(t.feature_flags.valid_until);
        cycleText = "Custom Period";
    } else {
        expireDate = new Date(t.created_at || new Date());
        if (t.plan === 'trial') {
            expireDate.setDate(expireDate.getDate() + 10);
            cycleText = "10-Day Free Trial";
            totalDays = 10;
        } else {
            expireDate.setDate(expireDate.getDate() + 30);
        }
    }
    expireDate.setHours(0, 0, 0, 0);

    const diffTime = expireDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const isExpired = daysLeft <= 0;
    const isUrgent = daysLeft <= 5 && !isExpired;
    const progress = Math.max(0, Math.min(100, (Math.max(0, daysLeft) / totalDays) * 100));

    return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className="relative bg-white/90 backdrop-blur-sm border border-slate-100 rounded-[1.5rem] p-4 shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group z-10 flex flex-col h-full">
            <div className={`absolute top-4 right-4 w-2 h-2 rounded-full ${t.subscription_status === 'active' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500'}`} />
            
            <div onClick={(e) => { e.stopPropagation(); }} className="flex items-center gap-3 mb-4 cursor-default">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-slate-200 group-hover:bg-gecko-500 transition-colors duration-300">{t.name[0]}</div>
                <div><h3 className="font-bold text-sm text-slate-900 leading-tight group-hover:text-gecko-600 transition-colors">{t.name}</h3><p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1"><Wifi className="w-2.5 h-2.5" /> {t.code}</p></div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
                <div onClick={(e) => { e.stopPropagation(); onEditPlan(t); }} className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 hover:border-gecko-200 hover:bg-white transition-all cursor-pointer group/plan"><p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Plan</p><div className="flex items-center justify-between"><div className="flex items-center gap-1">{t.plan === 'business' ? <Rocket className="w-3 h-3 text-purple-500" /> : <Zap className="w-3 h-3 text-amber-500" />}<p className="font-bold text-slate-700 capitalize text-xs">{t.plan}</p></div><Edit3 className="w-3 h-3 text-slate-300 group-hover/plan:text-gecko-500 opacity-0 group-hover/plan:opacity-100 transition-all" /></div></div>
                <div onClick={(e) => { e.stopPropagation(); onEditPrice(t); }} className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 hover:border-gecko-200 hover:bg-white transition-all cursor-pointer group/price"><p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Monthly</p><div className="flex items-center justify-between"><p className="font-bold text-emerald-600 text-xs">Rs {t.custom_price ? t.custom_price.toLocaleString() : (t.plan === 'starter' ? '5,000' : t.plan === 'business' ? '25,000' : '12,000')}</p><Edit3 className="w-3 h-3 text-slate-300 group-hover/price:text-gecko-500 opacity-0 group-hover/price:opacity-100 transition-all" /></div></div>
            </div>

            {/* PRECISE VISUAL BILLING PROGRESS BAR (CLICKABLE) */}
            <div onClick={(e) => { e.stopPropagation(); onEditValidity(t); }} className="mt-auto mb-4 p-2 -mx-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group/validity">
                <div className="flex justify-between items-end mb-1.5">
                    <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
                        <CalendarDays className="w-2.5 h-2.5" />
                        <span>{cycleText}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold ${isExpired ? 'text-red-600 animate-pulse' : isUrgent ? 'text-orange-500' : 'text-emerald-600'}`}>
                            {isExpired ? `Expired (${Math.abs(daysLeft)}d ago)` : `${daysLeft} Days Left`}
                        </span>
                        <Edit3 className="w-3 h-3 text-slate-300 group-hover/validity:text-gecko-500 opacity-0 group-hover/validity:opacity-100 transition-all" />
                    </div>
                </div>
                <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                        className={`h-full rounded-full transition-all duration-1000 ${isExpired ? 'bg-red-500 w-full opacity-50' : isUrgent ? 'bg-orange-500' : 'bg-emerald-500'}`} 
                        style={{ width: isExpired ? '100%' : `${progress}%` }} 
                    />
                </div>
            </div>

            <div className="pt-3 border-t border-slate-50 flex justify-between items-center"><span className={`text-[9px] font-bold uppercase ${t.subscription_status === 'active' ? 'text-slate-400' : 'text-red-500'}`}>{t.subscription_status === 'active' ? 'Auto-Pay Active' : 'Payment Failed'}</span><div onClick={(e) => e.stopPropagation()}>{onManage(t)}</div></div>
        </motion.div>
    );
}

// --- UTILITY COMPONENTS ---
function Sparkline({ color }: { color: string }) { return <div className="h-8 w-24 flex items-end gap-1">{[40, 60, 45, 70, 55, 80, 65, 90].map((h, i) => (<motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ duration: 0.5, delay: i * 0.1 }} className={`w-2 rounded-t-sm bg-${color}-500 opacity-20`} />))}</div> }
function PremiumToggle({ label, active, onClick }: any) { return <div onClick={onClick} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl cursor-pointer group hover:border-slate-200 transition-all duration-300"><span className="font-bold text-sm text-slate-700 group-hover:text-slate-900 transition-colors">{label}</span><div className={`relative w-12 h-7 rounded-full transition-colors duration-300 ease-in-out ${active ? 'bg-gecko-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-slate-200'}`}><motion.div className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md" animate={{ x: active ? 20 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} /></div></div> }
function MetricCard({ label, value, sub, icon: Icon, color }: any) { return <div className="relative overflow-hidden bg-white/90 backdrop-blur-sm p-5 rounded-[1.5rem] border border-slate-100 shadow-sm group hover:shadow-xl transition-all duration-500 z-10"><div className={`absolute top-0 right-0 w-32 h-32 bg-${color}-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:scale-150 transition-transform duration-700`} /><div className="flex justify-between items-start relative z-10"><div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p><h3 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h3></div><div className={`w-10 h-10 rounded-xl bg-${color}-50 flex items-center justify-center text-${color}-600`}><Icon className="w-5 h-5" /></div></div><div className="mt-3 flex items-center justify-between relative z-10"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-md bg-${color}-100 text-${color}-700`}>{sub}</span><Sparkline color={color} /></div></div> }
function SystemActivityTicker({ items }: { items: string[] }) { const [index, setIndex] = useState(0); useEffect(() => { if (items.length <= 1) return; const interval = setInterval(() => { setIndex((prev) => (prev + 1) % items.length); }, 4000); return () => clearInterval(interval); }, [items]); return <div className="h-10 bg-slate-900 rounded-xl flex items-center px-4 overflow-hidden border border-slate-800 shadow-lg relative group cursor-default z-10"><div className="flex items-center gap-2 mr-4 shrink-0 z-20 bg-slate-900 pr-2"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]" /><span className="text-[10px] font-bold text-green-500 uppercase tracking-wider group-hover:text-green-400 transition-colors">GeckoNet Live</span></div><div className="flex-1 relative h-full flex items-center overflow-hidden"><AnimatePresence mode="wait"> {items.length > 0 ? (<motion.span key={index} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} transition={{ duration: 0.3 }} className="text-xs font-mono text-slate-400 truncate w-full absolute">{items[index]}</motion.span>) : ( <span className="text-xs font-mono text-slate-500">System Standing By...</span> )}</AnimatePresence></div></div> }
function PlanOption({ id, name, price, icon: Icon, selected, onClick }: any) { return <div onClick={() => onClick(id)} className={`cursor-pointer relative p-4 rounded-2xl border-2 transition-all duration-300 ${selected === id ? 'border-gecko-500 bg-gecko-50' : 'border-slate-100 bg-slate-50 hover:border-slate-300'}`}><div className="flex justify-between items-start mb-2"><Icon className={`w-5 h-5 ${selected === id ? 'text-gecko-600' : 'text-slate-400'}`} />{selected === id && <div className="w-4 h-4 bg-gecko-500 rounded-full flex items-center justify-center"><CheckCircle2 className="w-3 h-3 text-white" /></div>}</div><h4 className={`font-bold text-sm ${selected === id ? 'text-slate-900' : 'text-slate-500'}`}>{name}</h4><p className="text-xs text-slate-400">{price}</p></div> }

function CommandPalette({ isOpen, onClose, tenants }: { isOpen: boolean, onClose: () => void, tenants: any[] }) {
  const [query, setQuery] = useState("");
  if (!isOpen) return null;
  const filtered = tenants.filter(t => t.name.toLowerCase().includes(query.toLowerCase()) || t.code.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/20 backdrop-blur-sm flex items-start justify-center pt-[15vh]">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
        <div className="flex items-center px-6 py-4 border-b border-slate-100"><Search className="w-6 h-6 text-slate-400 mr-4" /><input autoFocus placeholder="Search restaurants, commands..." className="flex-1 text-xl font-bold text-slate-900 placeholder:text-slate-300 outline-none bg-transparent" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if(e.key === 'Escape') onClose(); }} /><span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-500">ESC</span></div>
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-2">
           <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">System</div>
           <button onClick={() => window.location.reload()} className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 flex items-center gap-3 group transition-colors"><RefreshCw className="w-4 h-4 text-slate-500" /><span className="font-bold text-slate-700">System Refresh</span></button>
           {filtered.length > 0 && (<>
               <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2">Restaurants</div>
               {filtered.map(t => (<button key={t.id} onClick={() => window.location.href = `/super-admin/restaurant/${t.id}`} className="w-full text-left px-4 py-3 rounded-xl hover:bg-gecko-50 flex items-center justify-between group transition-colors"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold text-xs">{t.name[0]}</div><div><div className="font-bold text-slate-900">{t.name}</div><div className="text-xs text-slate-500">{t.code}</div></div></div><ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-gecko-500" /></button>))}
           </>)}
        </div>
      </motion.div>
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  )
}

// ==========================================
// 5. MAIN PAGE COMPONENT
// ==========================================
export default function SuperAdminDashboard() {
  const router = useRouter();
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  
  const [isPriceEditOpen, setIsPriceEditOpen] = useState(false);
  const [isPlanEditOpen, setIsPlanEditOpen] = useState(false);
  const [isValidityEditOpen, setIsValidityEditOpen] = useState(false);

  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [newPrice, setNewPrice] = useState(0);
  const [newPlan, setNewPlan] = useState("");
  const [newValidityDate, setNewValidityDate] = useState("");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Fonepay");
  const [showHistory, setShowHistory] = useState(false);

  const [formData, setFormData] = useState({ name: "", code: "", email: "", password: "", plan: "standard" });
  const [stats, setStats] = useState({ mrr: 0, activeStaff: 0 });
  const [feed, setFeed] = useState<string[]>([]);

  // BROADCAST STATE
  const [broadcastTarget, setBroadcastTarget] = useState("all");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastType, setBroadcastType] = useState<"info"|"alert"|"success"|"warning">("info");

  useEffect(() => {
    const isSuperAdmin = localStorage.getItem("gecko_super_admin");
    if (!isSuperAdmin) {
      toast.error("SECURITY ALERT", { description: "Unauthorized access detected." });
      router.push("/login");
    } else {
      loadData();
    }
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setIsCommandOpen((open) => !open); } };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if(tenants.length === 0) { setStats({ mrr: 0, activeStaff: 0 }); setFeed([]); return; }
    let revenue = 0;
    tenants.forEach(t => { if (t.subscription_status === 'active') { if (t.custom_price) { revenue += t.custom_price; } else { if(t.plan === 'starter') revenue += 5000; else if(t.plan === 'business') revenue += 25000; else revenue += 12000; } } });
    const staff = tenants.reduce((acc, t) => acc + (t.staff_count || 0), 0);
    setStats({ mrr: revenue, activeStaff: staff });
    const newFeed = tenants.map(t => t.subscription_status === 'active' ? `${t.code}: Heartbeat Sync OK` : `${t.code}: Connection Suspended`);
    if(tenants.length > 0) newFeed.unshift("GeckoHQ: Master Node Connected");
    setFeed(newFeed);
  }, [tenants]);

  async function loadData() {
    const res = await getAllTenants();
    if(res.success) setTenants(res.data || []);
    setLoading(false);
  }

  async function handleImpersonate(id: number) {
      toast.loading("Establishing Secure Connection...");
      const res = await impersonateTenant(id);
      if(res.success) { toast.dismiss(); toast.success("Connection Established"); if(res.url) router.push(res.url); } else { toast.dismiss(); toast.error("Connection Refused"); }
  }

  async function handleCreate() {
    if(!formData.name || !formData.code || !formData.password) return toast.error("Missing Info");
    toast.loading("Deploying Restaurant...");
    const res = await createTenant(formData);
    toast.dismiss();
    if(res.success) { toast.success("Restaurant Deployed Successfully!"); setIsCreateOpen(false); loadData(); } else { toast.error(res.error); }
  }

  async function handleDelete(id: number) {
    if(!confirm("Are you sure? This action cannot be undone.")) return;
    toast.loading("Deleting Restaurant...");
    await deleteTenant(id);
    toast.dismiss();
    toast.success("Restaurant Deleted");
    loadData();
  }

  async function handleFeatureToggle(tenant: any, featureKey: string) {
    const currentFlags = tenant.feature_flags || { accounts: true, inventory: true, kds: true };
    const newFlags = { ...currentFlags, [featureKey]: !currentFlags[featureKey] };
    setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, feature_flags: newFlags } : t));
    toast.promise(updateFeatureFlags(tenant.id, newFlags), { loading: 'Syncing module...', success: 'Module Updated', error: 'Sync Failed' });
  }

  function openPriceEdit(tenant: any) { setSelectedTenant(tenant); let currentPrice = 0; if (tenant.custom_price) currentPrice = tenant.custom_price; else if (tenant.plan === 'starter') currentPrice = 5000; else if (tenant.plan === 'business') currentPrice = 25000; else currentPrice = 12000; setNewPrice(currentPrice); setIsPriceEditOpen(true); }
  function openPlanEdit(tenant: any) { setSelectedTenant(tenant); setNewPlan(tenant.plan); setIsPlanEditOpen(true); }
  
  function openValidityEdit(tenant: any) { 
      setSelectedTenant(tenant); 
      let currentEnd = tenant.feature_flags?.valid_until;
      if (!currentEnd) {
          const baseDate = new Date(tenant.created_at || Date.now());
          baseDate.setDate(baseDate.getDate() + (tenant.plan === 'trial' ? 10 : 30));
          currentEnd = baseDate.toISOString();
      }
      setNewValidityDate(currentEnd.split('T')[0]); // Extract YYYY-MM-DD
      
      let price = 12000;
      if (tenant.custom_price) price = tenant.custom_price;
      else if (tenant.plan === 'starter') price = 5000;
      else if (tenant.plan === 'business') price = 25000;
      
      setPaymentAmount(price);
      setPaymentMethod("Fonepay");
      
      setIsValidityEditOpen(true); 
  }

  function handleAddDays(days: number) {
      const date = new Date(newValidityDate || Date.now());
      date.setDate(date.getDate() + days);
      setNewValidityDate(date.toISOString().split('T')[0]);
  }

  async function saveNewPrice() { if(!selectedTenant) return; toast.loading("Updating Billing Contract..."); await updateTenantPrice(selectedTenant.id, Number(newPrice)); const updatedTenants = tenants.map(t => t.id === selectedTenant.id ? { ...t, custom_price: Number(newPrice) } : t); setTenants(updatedTenants); toast.dismiss(); toast.success("Price Updated Successfully"); setIsPriceEditOpen(false); }
  async function saveNewPlan() { if(!selectedTenant) return; toast.loading("Migrating Plan..."); await updateTenantPlan(selectedTenant.id, newPlan); const updatedTenants = tenants.map(t => t.id === selectedTenant.id ? { ...t, plan: newPlan } : t); setTenants(updatedTenants); toast.dismiss(); toast.success("Plan Upgraded Successfully"); setIsPlanEditOpen(false); }
  
  async function handleSaveLogPayment() { 
      if(!selectedTenant || !newValidityDate) return; 
      toast.loading("Recording Payment & Extending Cycle..."); 
      const isoDate = new Date(newValidityDate).toISOString();
      
      const res = await logTenantPayment(selectedTenant.id, paymentAmount, paymentMethod, isoDate);
      
      if (res.success) {
          const record = { date: new Date().toISOString(), amount: paymentAmount, method: paymentMethod, new_validity: isoDate };
          const updatedTenants = tenants.map(t => t.id === selectedTenant.id ? { 
              ...t, 
              feature_flags: { 
                  ...(t.feature_flags || {}), 
                  valid_until: isoDate,
                  payment_history: [...(t.feature_flags?.payment_history || []), record]
              } 
          } : t); 
          setTenants(updatedTenants); 
          toast.dismiss(); 
          toast.success("Payment Logged & Cycle Extended!"); 
          setIsValidityEditOpen(false); 
      } else {
          toast.dismiss(); toast.error("Failed to update cycle");
      }
  }

  function handleLogout() { localStorage.removeItem("gecko_super_admin"); toast.info("Session Terminated"); router.push("/login"); }

  async function handleSendBroadcast() {
      if(!broadcastMessage) return toast.error("Message empty");
      toast.loading("Dispatching Broadcast...");
      const res = await sendNotification(broadcastTarget, broadcastMessage, broadcastType);
      toast.dismiss();
      if(res.success) { toast.success("Broadcast Dispatched Successfully"); setBroadcastMessage(""); setIsBroadcastOpen(false); } else { toast.error("Dispatch Failed: " + res.error); }
  }

  const renderSheet = (t: any) => (
    <Sheet open={selectedTenant?.id === t.id ? undefined : false} onOpenChange={(open) => { if(!open) setShowHistory(false); }}>
        <SheetTrigger asChild><button onClick={() => setSelectedTenant(t)} className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-900 transition-colors">Control <ArrowRight className="w-3 h-3" /></button></SheetTrigger>
        <SheetContent className="rounded-l-[2.5rem] border-0 sm:max-w-md bg-white p-0 overflow-hidden shadow-2xl z-50">
            <div className="p-8 pb-4"><SheetTitle className="text-3xl font-black text-slate-900">{t.name}</SheetTitle><SheetDescription>Control panel for {t.code}.</SheetDescription></div>
            <div className="p-8 pt-0 space-y-8 h-full overflow-y-auto pb-24 relative">
                
                <AnimatePresence>
                {showHistory && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute inset-0 bg-white z-20 p-8 flex flex-col">
                        <div className="flex items-center gap-3 mb-6">
                            <button onClick={() => setShowHistory(false)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors"><ArrowRight className="w-4 h-4 text-slate-500 rotate-180" /></button>
                            <h3 className="font-black text-xl text-slate-900">Payment History</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3">
                            {t.feature_flags?.payment_history?.length > 0 ? (
                                [...t.feature_flags.payment_history].reverse().map((p: any, i: number) => (
                                    <div key={i} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-sm text-slate-900">Rs {Number(p.amount).toLocaleString()}</p>
                                            <p className="text-[10px] font-bold text-slate-400 mt-1">{new Date(p.date).toLocaleDateString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-bold px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-600">{p.method}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-10 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-100 rounded-3xl">
                                    <DollarSign className="w-8 h-8 text-slate-300 mb-2" />
                                    <p className="text-sm font-bold text-slate-400">No Payments Recorded Yet</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
                </AnimatePresence>

                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 mb-4"><div className="flex justify-between items-center mb-2"><span className="text-xs font-bold text-blue-700 uppercase">Current Billing</span><span className="text-xs font-bold text-blue-500">Monthly</span></div><div className="flex justify-between items-end"><span className="text-2xl font-black text-slate-900">Rs {t.custom_price ? t.custom_price.toLocaleString() : (t.plan === 'starter' ? '5,000' : t.plan === 'business' ? '25,000' : '12,000')}</span><button onClick={() => setShowHistory(true)} className="text-[10px] font-bold bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-100 hover:text-blue-600 transition-colors">View Ledger</button></div></div>
                <div className="space-y-3"><h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Access Control</h4><div className={`p-5 rounded-3xl border-2 transition-colors ${t.subscription_status === 'active' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}><div className="flex justify-between items-center mb-4"><span className={`font-bold text-lg ${t.subscription_status === 'active' ? 'text-emerald-700' : 'text-red-700'}`}>{t.subscription_status === 'active' ? 'Subscription Active' : 'Access Suspended'}</span><div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.subscription_status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`}>{t.subscription_status === 'active' ? <Check className="w-5 h-5 text-white" /> : <X className="w-5 h-5 text-white" />}</div></div><button onClick={async () => { await toggleSubscription(t.id, t.subscription_status); loadData(); }} className="w-full py-4 bg-white border border-white/50 rounded-2xl font-bold text-sm shadow-sm hover:scale-[1.02] transition-transform text-slate-900">{t.subscription_status === 'active' ? 'Suspend Restaurant' : 'Reactivate Restaurant'}</button></div></div>
                
                <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Module Configuration</h4>
                    <div className="space-y-3">
                        <PremiumToggle label="Inventory Management" active={t.feature_flags?.inventory} onClick={() => handleFeatureToggle(t, 'inventory')} />
                        <PremiumToggle label="Kitchen Display (KDS)" active={t.feature_flags?.kitchen_display} onClick={() => handleFeatureToggle(t, 'kitchen_display')} />
                        <PremiumToggle label="Accounting & Billing" active={t.feature_flags?.accounts} onClick={() => handleFeatureToggle(t, 'accounts')} />
                        <PremiumToggle label="KOT & BOT Split" active={t.feature_flags?.split_kot_bot} onClick={() => handleFeatureToggle(t, 'split_kot_bot')} />
                    </div>
                </div>

                <div className="pt-8 border-t border-slate-100 space-y-4"><button onClick={() => handleImpersonate(t.id)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-slate-900/20 hover:scale-[1.02] transition-transform"><ExternalLink className="w-5 h-5" /> Open Admin Dashboard</button><button onClick={() => handleDelete(t.id)} className="w-full py-2 text-red-500 hover:text-red-600 font-bold flex items-center justify-center gap-2 transition-colors text-sm"><Trash2 className="w-4 h-4" /> Delete Restaurant</button></div>
            </div>
        </SheetContent>
    </Sheet>
  )

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 md:p-10 relative overflow-hidden font-sans">
      <NetworkMesh tenants={tenants} />
      <CommandPalette isOpen={isCommandOpen} onClose={() => setIsCommandOpen(false)} tenants={tenants} />

      {/* --- DIALOGS --- */}
      <Dialog open={isPriceEditOpen} onOpenChange={setIsPriceEditOpen}><DialogContent><DialogHeader><DialogTitle>Edit Monthly Subscription</DialogTitle><DialogDescription>Override the default plan pricing for this restaurant.</DialogDescription></DialogHeader><div className="space-y-4 py-4"><label className="text-sm font-bold text-slate-500 uppercase">Monthly Fee (NPR)</label><div className="relative"><span className="absolute left-4 top-3.5 text-slate-400 font-bold">Rs</span><input type="number" value={newPrice} onChange={e => setNewPrice(Number(e.target.value))} className="w-full h-12 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-lg" /></div><button onClick={saveNewPrice} className="w-full h-12 bg-gecko-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"><Save className="w-4 h-4" /> Save New Price</button></div></DialogContent></Dialog>
      <Dialog open={isPlanEditOpen} onOpenChange={setIsPlanEditOpen}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Upgrade Subscription</DialogTitle><DialogDescription>Select a new tier for this restaurant.</DialogDescription></DialogHeader><div className="space-y-4 py-4"><div className="grid grid-cols-1 gap-3"><PlanOption id="starter" name="Starter" price="Rs 5K/mo" icon={Box} selected={newPlan} onClick={setNewPlan} /><PlanOption id="standard" name="Standard" price="Rs 12K/mo" icon={LayoutTemplate} selected={newPlan} onClick={setNewPlan} /><PlanOption id="business" name="Business" price="Rs 25K/mo" icon={Rocket} selected={newPlan} onClick={setNewPlan} /></div><button onClick={saveNewPlan} className="w-full h-12 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 mt-4"><Crown className="w-4 h-4" /> Confirm Upgrade</button></div></DialogContent></Dialog>
      
      <Dialog open={isValidityEditOpen} onOpenChange={setIsValidityEditOpen}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>Log Payment & Extend Cycle</DialogTitle>
                <DialogDescription>Record a received payment and boost expiration.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Amount (NPR)</label>
                        <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(Number(e.target.value))} className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-lg text-emerald-600 outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Method</label>
                         <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500">
                             <option value="Fonepay">Fonepay</option>
                             <option value="Cash">Cash</option>
                             <option value="Bank Transfer">Bank Transfer</option>
                         </select>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-2">
                    <button onClick={() => handleAddDays(10)} className="py-2.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl font-bold text-[10px] hover:bg-emerald-100 transition-colors">+ 10 Days</button>
                    <button onClick={() => handleAddDays(30)} className="py-2.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl font-bold text-[10px] hover:bg-blue-100 transition-colors">+ 1 Month Paid</button>
                    <button onClick={() => handleAddDays(365)} className="py-2.5 bg-purple-50 text-purple-600 border border-purple-200 rounded-xl font-bold text-[10px] hover:bg-purple-100 transition-colors">+ 1 Year Paid</button>
                </div>
                <div className="space-y-2 mt-4">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">New Expiration Date</label>
                    <div className="relative">
                        <Calendar className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                        <input type="date" value={newValidityDate} onChange={e => setNewValidityDate(e.target.value)} className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-lg text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                </div>
                <button onClick={handleSaveLogPayment} className="w-full h-12 bg-slate-900 hover:bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2 mt-4 transition-all active:scale-95"><Save className="w-4 h-4" /> Save Payment & Extend</button>
            </div>
        </DialogContent>
      </Dialog>

      <div className="max-w-[1400px] mx-auto space-y-8 relative z-10 pb-24">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col xl:flex-row justify-between xl:items-end gap-6">
          <div className="space-y-4">
             <div className="flex items-center gap-3"><h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900">Gecko<span className="text-gecko-500">HQ</span></h1><span className="px-3 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider border border-slate-700 shadow-lg shadow-slate-200">Master Node</span></div>
             <div className="w-full md:w-[450px]"><SystemActivityTicker items={feed} /></div>
          </div>

          <div className="flex gap-4 items-center">
             {/* ADDED NOTIFICATION CENTER */}
             <NotificationCenter />
             <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="h-14 px-8 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold flex items-center gap-3 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] transition-all z-20"><Plus className="w-5 h-5" /> <span>Add Restaurant</span></motion.button></DialogTrigger>
                <DialogContent className="bg-white/95 backdrop-blur-xl border-0 shadow-2xl rounded-3xl p-0 overflow-hidden sm:max-w-lg z-50"><div className="p-8"><DialogHeader className="mb-6"><DialogTitle className="text-3xl font-black text-slate-900">Add Restaurant</DialogTitle></DialogHeader><div className="space-y-6"><div className="grid grid-cols-5 gap-4"><div className="col-span-3 space-y-2"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Name</label><input placeholder="e.g. Roadhouse Cafe" className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl font-bold focus:ring-2 focus:ring-gecko-500" onChange={e => setFormData({...formData, name: e.target.value})} /></div><div className="col-span-2 space-y-2"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Code</label><input placeholder="KTM-01" className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl font-bold uppercase text-center focus:ring-2 focus:ring-gecko-500" onChange={e => setFormData({...formData, code: e.target.value})} /></div></div><div className="space-y-2"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Subscription Plan</label><div className="grid grid-cols-3 gap-3"><PlanOption id="starter" name="Starter" price="Rs 5K" icon={Box} selected={formData.plan} onClick={(id: string) => setFormData({...formData, plan: id})} /><PlanOption id="standard" name="Standard" price="Rs 12K" icon={LayoutTemplate} selected={formData.plan} onClick={(id: string) => setFormData({...formData, plan: id})} /><PlanOption id="business" name="Business" price="Rs 25K" icon={Rocket} selected={formData.plan} onClick={(id: string) => setFormData({...formData, plan: id})} /></div></div><div className="space-y-2"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Admin Email</label><input placeholder="owner@restaurant.com" className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl font-bold focus:ring-2 focus:ring-gecko-500" onChange={e => setFormData({...formData, email: e.target.value})} /></div><div className="space-y-2"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Initial Password</label><div className="relative"><input type="password" placeholder="••••••••" className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl font-bold focus:ring-2 focus:ring-gecko-500 pl-11" onChange={e => setFormData({...formData, password: e.target.value})} /><Key className="w-4 h-4 text-slate-400 absolute left-4 top-4" /></div></div><button onClick={handleCreate} className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-xl shadow-slate-900/20 mt-2">Deploy</button></div></div></DialogContent>
             </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"><MetricCard label="Projected Revenue (MRR)" value={`Rs ${stats.mrr.toLocaleString()}`} sub="Monthly Recurring" icon={DollarSign} color="emerald" /><MetricCard label="Active Staff" value={stats.activeStaff} sub="Users Online" icon={Users} color="blue" /><MetricCard label="System Load" value={`1%`} sub="Stable" icon={Server} color="amber" /><MetricCard label="Restaurants Active" value={`${tenants.length}`} sub="100% Uptime" icon={Globe} color="violet" /></div>

        <div className="flex items-center gap-3 pt-6"><div className="h-8 w-1 bg-gecko-500 rounded-full" /><h2 className="text-2xl font-black text-slate-900">Active Deployments</h2></div>
        {loading ? <div className="h-64 flex items-center justify-center"><Loader2 className="w-10 h-10 text-gecko-500 animate-spin" /></div> : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">{tenants.map((t, i) => (<TenantCard key={t.id} t={t} i={i} onEditPrice={openPriceEdit} onEditPlan={openPlanEdit} onEditValidity={openValidityEdit} onManage={renderSheet} />))}</div>}
      </div>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-xl border border-white/40 p-2 rounded-2xl shadow-2xl flex items-center gap-2 z-40 hover:scale-105 transition-transform duration-300">
        <button onClick={() => window.location.reload()} className="p-3 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors relative group"><RefreshCw className="w-5 h-5" /><span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">Refresh</span></button>
        <div className="w-px h-6 bg-slate-200" />
        <Dialog open={isBroadcastOpen} onOpenChange={setIsBroadcastOpen}>
            <DialogTrigger asChild><button className="p-3 rounded-xl hover:bg-blue-50 text-slate-500 hover:text-blue-600 transition-colors relative group"><MessageSquare className="w-5 h-5" /><span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">Broadcast</span></button></DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>Emergency Broadcast</DialogTitle><DialogDescription>Send a system-wide or targeted notification to dashboards.</DialogDescription></DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Target Audience</label>
                        <select className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500" value={broadcastTarget} onChange={e => setBroadcastTarget(e.target.value)}>
                            <option value="all">All Restaurants (Network Wide)</option>
                            {tenants.map(t => <option key={t.id} value={t.id}>{t.name} ({t.code})</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Type</label>
                        <div className="grid grid-cols-4 gap-2">
                            {['info', 'success', 'warning', 'alert'].map((type: any) => (
                                <button key={type} onClick={() => setBroadcastType(type)} className={`py-2 rounded-lg text-xs font-bold capitalize transition-all ${broadcastType === type ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>{type}</button>
                            ))}
                        </div>
                    </div>
                    <textarea value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} placeholder="Type message..." className="w-full h-32 p-4 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 font-medium outline-none resize-none"></textarea>
                    <button onClick={handleSendBroadcast} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"><Send className="w-4 h-4" /> Send Notification</button>
                </div>
            </DialogContent>
        </Dialog>
        <button onClick={() => toast.success("Security Scan Passed")} className="p-3 rounded-xl hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 transition-colors relative group"><ShieldAlert className="w-5 h-5" /><span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">Security</span></button>
        <button onClick={() => toast.error("Lockdown sequence unavailable in Demo")} className="p-3 rounded-xl hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors relative group"><Lock className="w-5 h-5" /><span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">Lockdown</span></button>
        <div className="w-px h-6 bg-slate-200" />
        <button onClick={handleLogout} className="p-3 rounded-xl hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors relative group"><LogOut className="w-5 h-5" /><span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">Logout</span></button>
      </div>
    </div>
  );
}