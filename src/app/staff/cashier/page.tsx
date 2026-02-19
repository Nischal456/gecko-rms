"use client";

import { useState, useEffect, useRef } from "react";
import CashierSidebar from "@/app/staff/cashier/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Receipt, CheckCircle2, Wallet, Printer, QrCode, Banknote, X, RefreshCcw, 
  ZoomIn, ZoomOut, Save, Trash2, Loader2, Store, FileBarChart, Download, 
  ChefHat, UserCircle, LogOut, Search, AlertTriangle, ArrowLeft, ChevronDown, 
  ChevronUp, User, MapPin, Plus, ShoppingBag, Utensils, ArrowRight, Circle, Square, Clock, Bell,
  CreditCard, LayoutDashboard
} from "lucide-react";
import { useRouter } from "next/navigation"; 
import { getCashierData, finalizeTransaction, updateStoreSettings, createCashierOrder, cancelOrder, serveOrder } from "@/app/actions/cashier"; 
import { logoutStaff } from "@/app/actions/staff-auth"; 
import { toast } from "sonner";
import React from "react";
import NepaliDate from 'nepali-date-converter'; 

// --- IMPORTS ---
import SettingsPage from "./components/SettingsView"; 
import ReportsPage from "./components/ReportsView";
import ActiveOrdersView from "./components/ActiveOrders"; 
import { NewOrderSelection, TableSelector, CashierPOS } from "./components/NewOrderFlow";

const SOUND_NOTIFICATION = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

// --- INTERFACES ---
interface CashierData {
    restaurant: any;
    stats: { totalRevenue: number; pendingBills: number };
    tables: any[];
    activeOrders: any[];
    menu: any[]; 
    categories: any[]; 
}

// --- HELPER CONFIG ---
const formatRs = (amount: number) => "Rs " + new Intl.NumberFormat('en-NP', { maximumFractionDigits: 0 }).format(amount);

const toBS = (dateStr: string) => { 
    try { 
        const date = new Date(dateStr);
        const kathmanduTime = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Kathmandu" }));
        const bsDate = new NepaliDate(kathmanduTime);
        return bsDate.format('YYYY/MM/DD'); 
    } catch { return "---"; }
};

// --- CRITICAL FIX: ULTRA STRICT MERGE & FILTER ---
// This guarantees cancelled items, voided items, or 0 qty items NEVER show up anywhere.
function mergeOrderItems(items: any[]) {
    if (!items) return [];
    
    const validItems = items.filter(item => {
        const s = (item.status || '').toLowerCase();
        return s !== 'cancelled' && s !== 'void' && item.qty > 0;
    });
    
    return validItems.reduce((acc: any[], current: any) => {
        const existing = acc.find((item: any) => item.name === current.name && item.price === current.price && item.variant === current.variant);
        if (existing) existing.qty += current.qty; else acc.push({ ...current });
        return acc;
    }, []);
}

function SystemLoader() { 
    return (
        <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#F8FAFC] z-[100] flex flex-col items-center justify-center">
            <div className="w-20 h-20 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mb-6" />
            <p className="text-emerald-800/60 text-xs font-black uppercase tracking-[0.2em] animate-pulse">Initializing System...</p>
        </motion.div>
    ); 
}

// --- THERMAL RECEIPT ---
const ThermalReceipt = ({ data, order, customerDetails }: any) => {
    if (!order || !data) return null;
    const mergedItems = mergeOrderItems(order.items);
    
    // CRITICAL FIX: Recalculate exactly from valid items to avoid backend total errors
    const actualTotal = mergedItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const displayBillNo = order.bill_no || order.id.slice(-6).toUpperCase();

    return (
        <div style={{ position: 'absolute', top: 0, left: 0, height: 0, overflow: 'hidden', width: 0 }}>
            <style jsx global>{`
                @media print {
                    @page { margin: 0; size: auto; }
                    body * { visibility: hidden; }
                    #printable-receipt, #printable-receipt * { visibility: visible !important; }
                    #printable-receipt {
                        position: fixed; left: 0; top: 0; width: 72mm; margin: 0 auto; padding: 5mm;
                        background: white; color: black !important; font-family: 'Courier New', monospace;
                        font-size: 11px; line-height: 1.2; font-weight: 700; z-index: 9999;
                    }
                    .r-center { text-align: center; } .r-right { text-align: right; } .r-bold { font-weight: 900; }
                    .r-divider { border-bottom: 2px dashed black; margin: 6px 0; width: 100%; display: block; }
                    .r-flex { display: flex; justify-content: space-between; align-items: center; }
                    .r-grid { display: grid; grid-template-columns: 45% 10% 20% 25%; width: 100%; align-items: start; }
                    .r-variant { display: block; font-size: 10px; font-weight: normal; margin-left: 2px; }
                }
            `}</style>

            <div id="printable-receipt">
                <div className="r-center r-bold" style={{ fontSize: '18px', textTransform: 'uppercase', marginBottom:'2px' }}>{data.name || "RESTAURANT"}</div>
                <div className="r-center" style={{ fontSize: '11px' }}>{data.address}</div>
                <div className="r-center" style={{ fontSize: '11px' }}>Tel: {data.phone}</div>
                <div className="r-divider" />
                
                <div className="r-flex">
                    <div>Dt: {toBS(new Date().toISOString())}</div>
                    <div>Tm: {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kathmandu' })}</div>
                </div>
                <div className="r-flex">
                    <div>Bill: {displayBillNo}</div>
                    <div>Tab: {order.tbl}</div>
                </div>
                
                {customerDetails?.name && (
                    <div style={{ marginTop: '4px', borderTop: '1px dotted #000', paddingTop: '2px' }}>
                        <div>To: {customerDetails.name}</div>
                        {customerDetails.address && <div>Addr: {customerDetails.address}</div>}
                    </div>
                )}

                <div className="r-divider" />
                <div className="r-grid r-bold"><span>ITEM</span><span className="r-center">QTY</span><span className="r-right">RATE</span><span className="r-right">AMT</span></div>
                <div className="r-divider" />
                
                {mergedItems.map((item: any, i: number) => {
                    const showVariant = item.variant && !item.name.toLowerCase().includes(item.variant.toLowerCase());
                    return (
                        <div key={i} style={{ marginBottom: '6px' }}>
                            <div className="r-grid">
                                <span>{item.name}</span>
                                <span className="r-center">{item.qty}</span>
                                <span className="r-right">{item.price}</span>
                                <span className="r-right">{(item.price * item.qty).toLocaleString()}</span>
                            </div>
                            {showVariant && <span className="r-variant">~ {item.variant}</span>}
                        </div>
                    );
                })}
                
                <div className="r-divider" style={{ borderBottomStyle: 'solid', borderBottomWidth: '2px' }} />
                <div className="r-flex r-bold" style={{ fontSize: '16px', margin: '8px 0' }}><span>TOTAL</span><span>Rs {actualTotal.toLocaleString()}</span></div>
                <div className="r-divider" />
                <div className="r-center" style={{ marginTop: '10px', fontSize: '11px', fontWeight: 'bold' }}>*** THANK YOU VISIT AGAIN ***</div>
            </div>
        </div>
    );
};

// --- CHECKOUT MODAL ---
function CheckoutModal({ table, onClose, onConfirm, onCancel, restaurant }: any) {
    const [method, setMethod] = useState("Cash");
    const [customer, setCustomer] = useState({ name: "", address: "" });
    const order = table?.currentOrder;
    if(!order) return null;
    
    const isPayable = ['served', 'payment_pending', 'ready'].includes(order.status);
    const isCancellable = order.status === 'pending';
    
    const displayItems = mergeOrderItems(order.items);
    
    // CRITICAL FIX: Recalculate frontend total for accurate charging
    const actualTotal = displayItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    // FETCH DYNAMIC ACCOUNTS
    const bankAccounts = restaurant?.bank_accounts || []; 
    const paymentMethods = [
        { name: "Cash", icon: Banknote, color: "emerald" },
        ...bankAccounts.map((acc: any) => ({ name: acc.name, icon: QrCode, color: "purple", qr: acc.qrUrl }))
    ];

    const activeMethod = paymentMethods.find((m:any) => m.name === method);
    
    // Print Logic
    const handlePrint = () => { 
        setTimeout(() => window.print(), 300); 
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:bg-black/60 md:backdrop-blur-md p-0 md:p-6">
            
            {/* INVISIBLE RECEIPT IS HERE */}
            <ThermalReceipt data={restaurant} order={order} customerDetails={customer} />

            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white w-full h-[95dvh] md:h-[90vh] md:max-w-5xl rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row overflow-hidden relative ring-1 ring-white/20">
                
                {/* LEFT: BILL PREVIEW (UI Only) */}
                <div className="w-full md:w-[40%] bg-slate-50/80 p-6 md:p-8 flex flex-col border-r border-slate-200 backdrop-blur-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Table {table.label}</h2>
                        <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${isPayable ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{order.status}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                        {displayItems.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between text-sm p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                <div><span className="font-bold text-slate-900">{item.qty}x</span> <span className="text-slate-700">{item.name}</span> <span className="text-[10px] text-slate-400 block mt-0.5">{item.variant}</span></div>
                                <span className="font-bold text-slate-900">{formatRs(item.price * item.qty)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 pt-6 border-t-2 border-dashed border-slate-200 flex justify-between items-end">
                        <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Total Due</span>
                        <span className="text-4xl font-black text-slate-900">{formatRs(actualTotal)}</span>
                    </div>
                </div>
                
                {/* RIGHT: PAYMENT ACTIONS */}
                <div className="flex-1 p-6 md:p-8 bg-white flex flex-col relative overflow-y-auto">
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-500"/></button>
                    
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-black flex items-center gap-2 text-slate-900"><Wallet className="w-6 h-6 text-emerald-500"/> Checkout</h3>
                        <button onClick={handlePrint} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-emerald-600 transition-colors shadow-lg shadow-slate-900/20 active:scale-95 border border-slate-900"><Printer className="w-4 h-4"/> Print Bill First</button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        {paymentMethods.map((m: any) => (
                            <button key={m.name} onClick={() => setMethod(m.name)} className={`h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${method===m.name ? `border-${m.color}-500 bg-${m.color}-50 text-${m.color}-700 shadow-md transform scale-105` : 'border-slate-100 hover:border-slate-200 text-slate-500'}`}>
                                <m.icon className="w-6 h-6" />
                                <span className="text-[10px] font-black uppercase tracking-wide px-2 truncate w-full text-center">{m.name}</span>
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-center mb-6 relative min-h-[180px] overflow-hidden">
                        {activeMethod?.qr ? (
                            <motion.img initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} src={activeMethod.qr} className="w-64 h-64 object-contain mix-blend-multiply" />
                        ) : (
                            <div className="text-center text-slate-300">
                                <Banknote className="w-16 h-16 mx-auto mb-2 opacity-20"/>
                                <p className="font-bold text-[10px] uppercase tracking-widest">Collect Cash Payment</p>
                            </div>
                        )}
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex gap-3">
                            <input value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} placeholder="Customer Name (Optional)" className="flex-1 p-3 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-100 transition-all"/>
                            <input value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} placeholder="Address / PAN (Optional)" className="flex-1 p-3 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-100 transition-all"/>
                        </div>

                        <div className="flex gap-4">
                            {isCancellable && (
                                <button onClick={() => onCancel(order.id, table.label)} className="flex-1 py-4 rounded-xl font-bold text-red-500 bg-red-50 hover:bg-red-100 transition-all flex items-center justify-center gap-2 border border-red-100">
                                    <Trash2 className="w-5 h-5"/> Cancel
                                </button>
                            )}
                            <button 
                                disabled={!isPayable}
                                onClick={() => onConfirm(table.label, order.id, method, actualTotal, customer)} 
                                className={`flex-[2] py-4 rounded-xl font-black text-white shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 ${isPayable ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/30' : 'bg-slate-300 cursor-not-allowed shadow-none'}`}
                            >
                                {isPayable ? <><CheckCircle2 className="w-5 h-5"/> Confirm Payment</> : <><Clock className="w-5 h-5"/> Wait for Service</>}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

// --- FLOATING DOCK (PERFECTLY CENTERED UNIVERSALLY) ---
function FloatingDock({ setView, currentView, onPOS, loadData, hasUpdates }: any) {
    const handleLogout = async () => { if(window.confirm("Logout?")) { await logoutStaff(); window.location.href = "/staff/login"; } };
    
    // Dead-centered wrapper ensures it ignores sidebars entirely
    return (
        <div className="md:hidden fixed bottom-[85px] left-0 w-full flex justify-center z-[100] pointer-events-none px-4">
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="pointer-events-auto flex items-center gap-3 p-2 bg-white/90 backdrop-blur-2xl border border-emerald-100 shadow-[0_12px_40px_-10px_rgba(0,200,83,0.25)] rounded-full ring-1 ring-black/5">
                <button onClick={() => setView('terminal')} className={`p-3.5 rounded-full transition-all duration-300 ${currentView==='terminal' ? 'bg-slate-900 text-white shadow-lg' : 'hover:bg-slate-100 text-slate-500'}`}><LayoutDashboard className="w-5 h-5"/></button>
                <button onClick={onPOS} className="p-3.5 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 hover:scale-110 transition-all"><Plus className="w-6 h-6"/></button>
                
                <div className="relative">
                    <button onClick={() => setView('active_orders')} className={`p-3.5 rounded-full transition-all duration-300 ${currentView==='active_orders' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-100 text-slate-500'}`}><Clock className="w-5 h-5"/></button>
                    {hasUpdates && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />}
                </div>

                <button onClick={() => setView('reports')} className={`p-3.5 rounded-full transition-all duration-300 ${currentView==='reports' ? 'bg-purple-600 text-white shadow-lg' : 'hover:bg-slate-100 text-slate-500'}`}><FileBarChart className="w-5 h-5"/></button>
                <div className="w-[1px] h-8 bg-slate-300 mx-1" />
                <button onClick={loadData} className="p-3.5 hover:bg-slate-100 text-slate-600 rounded-full transition-all active:rotate-180"><RefreshCcw className="w-5 h-5"/></button>
                <button onClick={handleLogout} className="p-3.5 hover:bg-red-50 text-red-500 rounded-full transition-all"><LogOut className="w-5 h-5"/></button>
            </motion.div>
        </div>
    )
}

// --- MAIN PAGE ---
export default function CashierDashboard() {
  const router = useRouter(); 
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("terminal"); 
  const [data, setData] = useState<CashierData | null>(null);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [hasUpdates, setHasUpdates] = useState(false);
  const notifiedOrders = useRef(new Set<string>());

  const [posOrderType, setPosOrderType] = useState<'dine_in'|'takeaway'>('dine_in');
  const [posTable, setPosTable] = useState<string>('');
  const [existingOrderToEdit, setExistingOrderToEdit] = useState<any>(null); 
  const [scale, setScale] = useState(0.8);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [filter, setFilter] = useState("All"); 
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => { if(['terminal', 'active_orders'].includes(view)) loadData(); }, 5000);
    loadData();
    if(window.innerWidth < 768) setScale(0.5);
    return () => clearInterval(t);
  }, [view]);

  async function loadData() {
      const res = await getCashierData();
      if (res.success) {
          setData(res as any);
          let newUpdate = false;
          res.activeOrders.forEach((o: any) => {
              if (o.status === 'ready' && !notifiedOrders.current.has(o.id)) {
                  setNotification(`Order Ready: Table ${o.tbl}`);
                  new Audio(SOUND_NOTIFICATION).play().catch(()=>{});
                  notifiedOrders.current.add(o.id);
                  newUpdate = true;
                  setTimeout(() => setNotification(null), 6000);
              }
              if (o.status === 'ready') newUpdate = true;
          });
          setHasUpdates(newUpdate);
      }
      setLoading(false);
  }

  const handleSettleClick = (table: any) => {
      if (!table.currentOrder) { toast.info("Table is empty"); return; }
      setSelectedTable(table);
  };

  const processPayment = async (tableId: string, orderId: string, method: string, amount: number, customer?: any) => {
      const res = await finalizeTransaction(tableId, orderId, method, amount, data?.restaurant, customer);
      if (res.success) { toast.success("Payment Successful"); setSelectedTable(null); loadData(); } else { toast.error("Error", { description: res.error }); }
  };

  const handleCancelOrder = async (orderId: string, tableId: string) => {
      const res = await cancelOrder(orderId, tableId);
      if(res.success) { 
          loadData();
          setSelectedTable(null);
      }
      return res; 
  };

  const handleServeOrder = async (orderId: string, tableId: string) => {
      const res = await serveOrder(orderId, tableId);
      if(res.success) { loadData(); }
      return res;
  };

  const handleEditOrder = (order: any) => {
      setPosTable(order.tbl);
      setPosOrderType(order.type || 'dine_in');
      setExistingOrderToEdit(order); 
      setView('pos'); 
  };

  const handleStartNewOrder = () => { setExistingOrderToEdit(null); setView('new_order_select'); };
  const handleSelectService = (type: 'dine_in' | 'takeaway') => { setPosOrderType(type); if (type === 'dine_in') setView('table_select'); else { setPosTable('TAKEAWAY'); setExistingOrderToEdit(null); setView('pos'); } };
  const handleSelectTableForOrder = (tableLabel: string) => { setPosTable(tableLabel); setExistingOrderToEdit(null); setView('pos'); };
  const submitOrder = async (table: string, items: any[], type: 'dine_in'|'takeaway') => { const res = await createCashierOrder(table, items, type); if(res.success) { toast.success("Order Placed"); loadData(); setView('terminal'); } else { toast.error("Failed"); } };

  const sections = data ? ['All', ...Array.from(new Set(data.tables?.map((t:any) => t.section || "Main Hall")))] : [];
  const filteredTables = data?.tables?.filter((t: any) => filter === 'All' || (t.section || "Main Hall") === filter);

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden relative">
      <AnimatePresence>{loading && <SystemLoader />}</AnimatePresence>
      <AnimatePresence>{selectedTable && <CheckoutModal table={selectedTable} restaurant={data?.restaurant} onClose={() => setSelectedTable(null)} onConfirm={processPayment} onCancel={handleCancelOrder} />}</AnimatePresence>

      <AnimatePresence>
        {notification && (
            <motion.div initial={{ y: -100, opacity: 0 }} animate={{ y: 20, opacity: 1 }} exit={{ y: -100, opacity: 0 }} className="absolute top-0 left-0 right-0 z-[100] flex justify-center pointer-events-none">
                <div className="bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 font-bold pointer-events-auto">
                    <Bell className="w-5 h-5 animate-bounce" /> {notification}
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {!loading && data && (
        <>
            <CashierSidebar 
                tenantName={data.restaurant?.name} 
                logo={data.restaurant?.logo_url} 
                tenantCode={data.restaurant?.code} 
                currentView={view} 
                setView={(v: string) => { setView(v); if(v==='active_orders') setHasUpdates(false); }} 
                hasUpdates={hasUpdates} 
            />
            
            <main className="flex-1 flex flex-col h-full overflow-hidden relative pt-16 md:pt-0 pb-[140px] md:pb-0">
                {view === 'settings' ? <SettingsPage data={data} onSave={updateStoreSettings} /> : 
                 view === 'reports' ? <ReportsPage data={data} /> : 
                 view === 'active_orders' ? <ActiveOrdersView data={data} onSelectOrder={(o:any) => handleSettleClick({ label: o.tbl, currentOrder: o })} onServeOrder={handleServeOrder} onCancelOrder={handleCancelOrder} onEditOrder={handleEditOrder} /> :
                 view === 'new_order_select' ? <NewOrderSelection onSelect={handleSelectService} /> :
                 view === 'table_select' ? <TableSelector tables={data.tables} onSelectTable={handleSelectTableForOrder} onBack={() => setView('new_order_select')} /> :
                 view === 'pos' ? <CashierPOS data={data} onClose={() => setView('terminal')} onSubmit={submitOrder} preSelectedTable={posTable} orderType={posOrderType} existingOrder={existingOrderToEdit} /> :
                 (
                    <>
                        <div className="px-8 py-6 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-slate-100 z-10 shrink-0">
                            <div><h1 className="text-3xl font-black text-slate-900 tracking-tight">Terminal</h1></div>
                            <div className="flex gap-6 items-center"><div className="text-right"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Bills</p><p className="text-2xl font-black text-orange-500 leading-none">{data.stats?.pendingBills || 0}</p></div><div className="w-[1px] h-8 bg-slate-200" /><div className="text-right"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Sales</p><p className="text-2xl font-black text-emerald-600 leading-none">{formatRs(data.stats?.totalRevenue || 0)}</p></div></div>
                        </div>
                        <div className="flex-1 overflow-hidden relative grid grid-cols-1 lg:grid-cols-3 p-6 gap-6">
                            <div className="lg:col-span-2 relative bg-[#F1F5F9] rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-inner flex flex-col">
                                <div className="absolute top-4 left-4 z-20 flex gap-2 overflow-x-auto max-w-[70%] no-scrollbar p-1">
                                    {sections.map((s: any) => (<button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-full text-xs font-bold shadow-sm transition-all whitespace-nowrap ${filter === s ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>{s}</button>))}
                                </div>
                                <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 pointer-events-auto"><div className="bg-white/90 backdrop-blur rounded-xl shadow-lg border border-white/50 flex flex-col overflow-hidden"><button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-3 hover:bg-slate-50 border-b border-slate-100"><ZoomIn className="w-5 h-5 text-slate-600" /></button><button onClick={() => setScale(s => Math.max(0.4, s - 0.1))} className="p-3 hover:bg-slate-50"><ZoomOut className="w-5 h-5 text-slate-600" /></button></div></div>
                                <motion.div ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing touch-none" drag dragMomentum={false} onDrag={(e, info) => setPan(p => ({ x: p.x + info.delta.x, y: p.y + info.delta.y }))}>
                                    <motion.div className="absolute top-0 left-0 w-full h-full origin-center" style={{ x: pan.x, y: pan.y, scale: scale }}>
                                        <div className="absolute inset-[-500%] bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />
                                        {filteredTables?.map((t: any) => { 
                                            const status = t.status || 'free';
                                            const isPayable = ['served', 'payment_pending', 'ready'].includes(status);
                                            const isBusy = ['occupied', 'cooking'].includes(status);
                                            return (
                                                <motion.div key={t.id} style={{ x: t.x, y: t.y, width: t.width, height: t.height, rotate: t.rotation, borderRadius: t.shape === 'round' ? '50%' : '20px' }} onClick={() => (isPayable || isBusy) && handleSettleClick(t)} className={`absolute border-2 flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-transform shadow-lg ${isPayable ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-emerald-500/20' : isBusy ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-slate-50 border-slate-200 text-slate-300 opacity-60'}`}>
                                                    <span className="font-black text-lg">{t.label}</span>
                                                    {isPayable && <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 rounded-full mt-1 animate-pulse shadow-md">PAY</span>}
                                                    {isBusy && !isPayable && <span className="text-[10px] font-bold bg-orange-200 text-orange-700 px-2 rounded-full mt-1">BUSY</span>}
                                                </motion.div>
                                            );
                                        })}
                                    </motion.div>
                                </motion.div>
                            </div>
                            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col overflow-hidden">
                                <div className="p-6 border-b border-slate-50"><h3 className="font-bold text-slate-900 flex items-center gap-2"><Receipt className="w-5 h-5 text-emerald-500" /> Pending Bills</h3></div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                    {data.activeOrders?.map((order: any, i: number) => {
                                        const isPayable = ['served', 'payment_pending'].includes(order.status);
                                        
                                        // CRITICAL FIX: Strictly calculate UI bill amounts
                                        const validItems = mergeOrderItems(order.items);
                                        const actualTotal = validItems.reduce((sum: number, item: any) => sum + (item.price * item.qty), 0);

                                        return (
                                            <button key={i} onClick={() => handleSettleClick({ label: order.tbl, currentOrder: order, status: order.status })} className={`w-full text-left p-4 rounded-2xl border transition-all group ${isPayable ? 'bg-emerald-50/50 border-emerald-200 hover:shadow-lg' : 'bg-slate-50 border-transparent opacity-70'}`}>
                                                <div className="flex justify-between items-center mb-2"><span className="font-black text-slate-900 text-lg group-hover:text-emerald-600 transition-colors">Table {order.tbl}</span><span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase ${isPayable ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{order.status}</span></div>
                                                <div className="flex justify-between items-center"><span className="text-xs text-slate-400 font-bold">{validItems.length} Items</span><span className="font-black text-emerald-600">{formatRs(actualTotal)}</span></div>
                                            </button>
                                        );
                                    })}
                                    {data.activeOrders?.length === 0 && <div className="h-full flex flex-col items-center justify-center text-slate-300"><CheckCircle2 className="w-12 h-12 mb-2 opacity-50" /><span className="text-xs font-bold uppercase">All Clear</span></div>}
                                </div>
                            </div>
                        </div>
                        <FloatingDock currentView={view} setView={setView} loadData={loadData} onPOS={handleStartNewOrder} hasUpdates={hasUpdates} />
                    </>
                )}
            </main>
        </>
      )}
    </div>
  );
}