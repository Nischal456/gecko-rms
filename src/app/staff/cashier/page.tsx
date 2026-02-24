"use client";

import { useState, useEffect, useRef } from "react";
import CashierSidebar from "@/app/staff/cashier/Sidebar";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { 
  Receipt, CheckCircle2, Wallet, Printer, QrCode, Banknote, X, RefreshCcw, 
  ZoomIn, ZoomOut, Save, Trash2, Loader2, Store, FileBarChart, Download, 
  ChefHat, UserCircle, LogOut, Search, AlertTriangle, ArrowLeft, ChevronDown, 
  ChevronUp, User, MapPin, Plus, ShoppingBag, Utensils, ArrowRight, Circle, Square, Clock, Bell,
  CreditCard, LayoutDashboard, Check
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

// FIXED: Date +1 bug solved by avoiding double-timezone offsets
const toBS = (dateStr: string) => { 
    try { 
        const date = new Date(dateStr);
        const bsDate = new NepaliDate(date);
        return bsDate.format('YYYY/MM/DD'); 
    } catch { return "---"; }
};

// --- ULTRA STRICT MERGE & FILTER (GROUPS BY STATUS TOO) ---
function mergeOrderItems(items: any[]) {
    if (!items) return [];
    
    const validItems = items.filter(item => {
        const s = (item.status || '').toLowerCase().trim();
        return s !== 'cancelled' && s !== 'void' && item.qty > 0;
    });
    
    return validItems.reduce((acc: any[], current: any) => {
        const currentStatus = (current.status || 'pending').toLowerCase().trim();
        
        // Group items only if name, price, variant AND STATUS match
        const existing = acc.find((item: any) => {
            const itemStatus = (item.status || 'pending').toLowerCase().trim();
            return item.name === current.name && 
                   item.price === current.price && 
                   item.variant === current.variant &&
                   itemStatus === currentStatus;
        });

        if (existing) existing.qty += current.qty; 
        else acc.push({ ...current });
        
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
                    <div>Date: {toBS(new Date().toISOString())}</div>
                    <div>Time: {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kathmandu' })}</div>
                </div>
                <div className="r-flex">
                    <div>Bill No: {displayBillNo}</div>
                    <div>Table no: {order.tbl}</div>
                </div>
                
                {customerDetails?.name && (
                    <div style={{ marginTop: '4px', borderTop: '1px dotted #000', paddingTop: '2px' }}>
                        <div>To: {customerDetails.name}</div>
                        {customerDetails.address && <div>Address: {customerDetails.address}</div>}
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

// --- ITEM LEVEL STATUS RENDERER ---
const renderSmallStatus = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    if (s === 'ready') return <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md uppercase tracking-widest border border-emerald-200 shadow-sm animate-pulse">Ready</span>;
    if (s === 'served' || s === 'payment_pending') return <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md uppercase tracking-widest border border-slate-200 flex items-center gap-1"><Check className="w-2.5 h-2.5"/> Served</span>;
    if (s === 'cooking') return <span className="text-[9px] font-black bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-md uppercase tracking-widest border border-orange-200">Cooking</span>;
    return <span className="text-[9px] font-black bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-md uppercase tracking-widest border border-blue-100">Pending</span>;
};

// --- PREMIUM CHECKOUT MODAL ---
function CheckoutModal({ table, onClose, onConfirm, onCancel, restaurant }: any) {
    const [method, setMethod] = useState("Cash");
    const [customer, setCustomer] = useState({ name: "", address: "" });
    const dragControls = useDragControls();

    const order = table?.currentOrder;
    if(!order) return null;
    
    const safeStatus = (order.status || '').toLowerCase().trim();
    const isPayable = ['served', 'payment_pending', 'ready'].includes(safeStatus);
    const isCancellable = safeStatus === 'pending';
    
    const displayItems = mergeOrderItems(order.items);
    const actualTotal = displayItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    // FETCH DYNAMIC ACCOUNTS
    const bankAccounts = restaurant?.bank_accounts || []; 
    const paymentMethods = [
        { name: "Cash", icon: Banknote, color: "emerald" },
        ...bankAccounts.map((acc: any) => ({ name: acc.name, icon: QrCode, color: "purple", qr: acc.qrUrl }))
    ];

    const activeMethod = paymentMethods.find((m:any) => m.name === method);
    
    const handlePrint = () => { setTimeout(() => window.print(), 300); };

    return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-6 bg-slate-900/40 backdrop-blur-sm">
            
            {/* INVISIBLE RECEIPT IS HERE */}
            <ThermalReceipt data={restaurant} order={order} customerDetails={customer} />

            <motion.div 
                initial={{ y: "100%" }} 
                animate={{ y: 0 }} 
                exit={{ y: "100%" }} 
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                drag="y"
                dragControls={dragControls}
                dragListener={false} // Only drag by the specific handle
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.5 }}
                onDragEnd={(e, info) => { if (info.offset.y > 100) onClose(); }}
                className="bg-white w-full h-[92dvh] md:h-[90vh] md:max-w-5xl rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row overflow-hidden relative ring-1 ring-white/20"
            >
                {/* MOBILE DRAG HANDLE */}
                <div 
                    className="w-full h-8 absolute top-0 left-0 z-50 flex items-center justify-center md:hidden touch-none"
                    onPointerDown={(e) => dragControls.start(e)}
                >
                    <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
                </div>

                {/* LEFT: BILL PREVIEW */}
                <div className="w-full md:w-[45%] lg:w-[40%] bg-slate-50/80 p-6 md:p-8 pt-10 md:pt-8 flex flex-col border-r border-slate-200 backdrop-blur-sm h-[40%] md:h-full">
                    <div className="flex justify-between items-center mb-6 shrink-0">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Table {table.label}</h2>
                        <span className={`text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-sm ${isPayable ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-200 text-slate-600 border border-slate-300'}`}>{safeStatus}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                        {displayItems.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between text-sm p-3.5 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-slate-200">
                                <div className="flex gap-3 w-full pr-2">
                                    <span className="font-black text-slate-400 bg-slate-50 w-7 h-7 flex items-center justify-center rounded-lg shrink-0">{item.qty}</span> 
                                    <div className="flex flex-col justify-center w-full">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-slate-900 leading-tight">{item.name}</span>
                                            {renderSmallStatus(item.status)}
                                        </div>
                                        {item.variant && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{item.variant}</span>}
                                    </div>
                                </div>
                                <span className="font-black text-slate-900 flex items-center shrink-0">{formatRs(item.price * item.qty)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-4 border-t-2 border-dashed border-slate-300 flex justify-between items-end shrink-0">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Due</span>
                        <span className="text-4xl font-black text-emerald-600 tracking-tighter">{formatRs(actualTotal)}</span>
                    </div>
                </div>
                
                {/* RIGHT: PAYMENT ACTIONS */}
                <div className="flex-1 p-6 md:p-8 bg-white flex flex-col relative h-[60%] md:h-full overflow-y-auto custom-scrollbar pb-safe">
                    
                    {/* FIXED: BUTTONS ARE NOW PROPERLY ALIGNED */}
                    <div className="flex justify-between items-center mb-6 shrink-0">
                        <h3 className="text-2xl font-black flex items-center gap-2 text-slate-900">
                            <Wallet className="w-7 h-7 text-emerald-500"/> Checkout
                        </h3>
                        <div className="flex items-center gap-2 md:gap-3">
                            <button onClick={handlePrint} className="px-4 py-2.5 md:px-5 md:py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-lg active:scale-95 border border-slate-900">
                                <Printer className="w-4 h-4"/> Print Bill
                            </button>
                            {/* The 'X' is now relative to the flex container, no overlap! */}
                            <button onClick={onClose} className="hidden md:flex p-2.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors border border-slate-200 hover:border-red-200">
                                <X className="w-5 h-5"/>
                            </button>
                        </div>
                    </div>
                    
                    {/* PAYMENT METHODS */}
                    <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6 shrink-0">
                        {paymentMethods.map((m: any) => (
                            <button key={m.name} onClick={() => setMethod(m.name)} className={`h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${method===m.name ? `border-${m.color}-500 bg-${m.color}-50 text-${m.color}-700 shadow-md transform scale-[1.02]` : 'border-slate-100 bg-slate-50/50 hover:border-slate-300 text-slate-500'}`}>
                                <m.icon className="w-7 h-7" />
                                <span className="text-[10px] font-black uppercase tracking-widest px-2 truncate w-full text-center">{m.name}</span>
                            </button>
                        ))}
                    </div>

                    {/* DYNAMIC QR / CASH AREA */}
                    <div className="flex-1 min-h-[200px] w-full bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-center mb-6 relative overflow-hidden shrink-0 p-4">
                        <AnimatePresence mode="wait">
                            {activeMethod?.qr ? (
                                <motion.img 
                                    key="qr"
                                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                                    src={activeMethod.qr} 
                                    className="w-full h-full max-w-[280px] max-h-[280px] object-contain mix-blend-multiply drop-shadow-sm rounded-2xl" 
                                />
                            ) : (
                                <motion.div key="cash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-slate-400">
                                    <Banknote className="w-20 h-20 mx-auto mb-3 opacity-20"/>
                                    <p className="font-black text-xs uppercase tracking-widest text-slate-400">Collect Cash Payment</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    
                    {/* ACTION FOOTER */}
                    <div className="space-y-4 shrink-0">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <input value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} placeholder="Customer Name (Optional)" className="flex-1 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 transition-all outline-none"/>
                            <input value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} placeholder="Address / PAN (Optional)" className="flex-1 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 transition-all outline-none"/>
                        </div>

                        <div className="flex gap-4">
                            {isCancellable && (
                                <button onClick={() => onCancel(order.id, table.label)} className="flex-1 py-4 md:py-5 rounded-2xl font-black text-red-500 bg-red-50 hover:bg-red-100 transition-all flex items-center justify-center gap-2 border border-red-100 active:scale-95 text-sm uppercase tracking-wider">
                                    <Trash2 className="w-5 h-5"/> Cancel
                                </button>
                            )}
                            <button 
                                disabled={!isPayable}
                                onClick={() => onConfirm(table.label, order.id, method, actualTotal, customer)} 
                                className={`flex-[2] py-4 md:py-5 rounded-2xl font-black text-white shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 text-sm uppercase tracking-wider ${isPayable ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/30' : 'bg-slate-300 cursor-not-allowed shadow-none'}`}
                            >
                                {isPayable ? <><CheckCircle2 className="w-6 h-6"/> Confirm Payment</> : <><Clock className="w-6 h-6"/> Awaiting Service</>}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
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

  const handleCancelOrder = async (orderId: string, tableId: string, itemIdToCancel?: string) => {
      const res = await cancelOrder(orderId, tableId, itemIdToCancel);
      if(res.success) { 
          loadData();
          if(!itemIdToCancel) setSelectedTable(null);
      }
      return res; 
  };

  const handleServeOrder = async (orderId: string, tableId: string, itemIds?: string[]) => {
      const res = await serveOrder(orderId, tableId, itemIds);
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
    <div className="flex h-[100dvh] bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden relative">
      <AnimatePresence>{loading && <SystemLoader />}</AnimatePresence>
      <AnimatePresence>{selectedTable && <CheckoutModal table={selectedTable} restaurant={data?.restaurant} onClose={() => setSelectedTable(null)} onConfirm={processPayment} onCancel={handleCancelOrder} />}</AnimatePresence>

      <AnimatePresence>
        {notification && (
            <motion.div initial={{ y: -100, opacity: 0 }} animate={{ y: 20, opacity: 1 }} exit={{ y: -100, opacity: 0 }} className="absolute top-0 left-0 right-0 z-[100] flex justify-center pointer-events-none px-4">
                <div className="bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold pointer-events-auto border-2 border-emerald-500">
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
            
            <main className="flex-1 flex flex-col h-full overflow-hidden relative pt-[72px] md:pt-0 pb-[80px] md:pb-0">
                {view === 'settings' ? <SettingsPage data={data} onSave={updateStoreSettings} /> : 
                 view === 'reports' ? <ReportsPage data={data} /> : 
                 view === 'active_orders' ? <ActiveOrdersView data={data} onSelectOrder={(o:any) => handleSettleClick({ label: o.tbl, currentOrder: o })} onServeOrder={handleServeOrder} onCancelOrder={handleCancelOrder} onEditOrder={handleEditOrder} /> :
                 view === 'new_order_select' ? <NewOrderSelection onSelect={handleSelectService} /> :
                 view === 'table_select' ? <TableSelector tables={data.tables} onSelectTable={handleSelectTableForOrder} onBack={() => setView('new_order_select')} /> :
                 view === 'pos' ? <CashierPOS data={data} onClose={() => setView('terminal')} onSubmit={submitOrder} preSelectedTable={posTable} orderType={posOrderType} existingOrder={existingOrderToEdit} /> :
                 (
                    <>
                        {/* TERMINAL HEADER */}
                        <div className="px-5 md:px-8 py-4 md:py-6 flex flex-col md:flex-row justify-between items-start md:items-center bg-white/80 backdrop-blur-md border-b border-slate-100 z-10 shrink-0 gap-4">
                            <div>
                                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Terminal</h1>
                                <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Live Register</p>
                            </div>
                            <div className="flex gap-4 md:gap-6 items-center bg-slate-50 md:bg-transparent p-3 md:p-0 rounded-2xl w-full md:w-auto border border-slate-100 md:border-none">
                                <div className="flex-1 md:flex-none text-left md:text-right">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Active Bills</p>
                                    <p className="text-xl md:text-3xl font-black text-orange-500 leading-none">{data.stats?.pendingBills || 0}</p>
                                </div>
                                <div className="w-px h-10 bg-slate-200" />
                                <div className="flex-1 md:flex-none text-right">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total Sales</p>
                                    <p className="text-xl md:text-3xl font-black text-emerald-600 leading-none">{formatRs(data.stats?.totalRevenue || 0)}</p>
                                </div>
                            </div>
                        </div>

                        {/* TERMINAL GRID */}
                        <div className="flex-1 overflow-y-auto lg:overflow-hidden relative grid grid-cols-1 lg:grid-cols-3 p-4 md:p-6 gap-6 scroll-smooth">
                            
                            {/* LIVE FLOOR MAP */}
                            <div className="lg:col-span-2 relative bg-[#F1F5F9] rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-inner flex flex-col min-h-[450px] lg:min-h-0 order-1 shrink-0">
                                <div className="absolute top-4 left-4 z-20 flex gap-2 overflow-x-auto max-w-[70%] no-scrollbar p-1">
                                    {sections.map((s: any) => (<button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-wider shadow-sm transition-all whitespace-nowrap border ${filter === s ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-200'}`}>{s}</button>))}
                                </div>
                                <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 pointer-events-auto">
                                    <div className="bg-white/90 backdrop-blur rounded-xl shadow-lg border border-white/50 flex flex-col overflow-hidden">
                                        <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-3 hover:bg-slate-50 border-b border-slate-100 active:bg-slate-100"><ZoomIn className="w-5 h-5 text-slate-600" /></button>
                                        <button onClick={() => setScale(s => Math.max(0.4, s - 0.1))} className="p-3 hover:bg-slate-50 active:bg-slate-100"><ZoomOut className="w-5 h-5 text-slate-600" /></button>
                                    </div>
                                </div>
                                <motion.div ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing touch-none" drag dragMomentum={false} onDrag={(e, info) => setPan(p => ({ x: p.x + info.delta.x, y: p.y + info.delta.y }))}>
                                    <motion.div className="absolute top-0 left-0 w-full h-full origin-center" style={{ x: pan.x, y: pan.y, scale: scale }}>
                                        <div className="absolute inset-[-500%] bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />
                                        {filteredTables?.map((t: any) => { 
                                            const status = (t.status || '').toLowerCase().trim();
                                            const isPayable = ['served', 'payment_pending', 'ready'].includes(status);
                                            const isBusy = ['occupied', 'cooking'].includes(status);
                                            return (
                                                <motion.div key={t.id} style={{ x: t.x, y: t.y, width: t.width, height: t.height, rotate: t.rotation, borderRadius: t.shape === 'round' ? '50%' : '24px' }} onClick={() => (isPayable || isBusy) && handleSettleClick(t)} className={`absolute border-2 flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-transform shadow-lg ${isPayable ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-emerald-500/20' : isBusy ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-slate-200 text-slate-400 opacity-80'}`}>
                                                    <span className="font-black text-xl leading-none">{t.label}</span>
                                                    {isPayable && <span className="text-[9px] font-black bg-emerald-500 text-white px-2.5 py-0.5 rounded-md mt-1.5 animate-pulse shadow-sm tracking-widest">PAY</span>}
                                                    {isBusy && !isPayable && <span className="text-[9px] font-black bg-orange-200 text-orange-800 px-2.5 py-0.5 rounded-md mt-1.5 tracking-widest">BUSY</span>}
                                                </motion.div>
                                            );
                                        })}
                                    </motion.div>
                                </motion.div>
                            </div>

                            {/* PENDING BILLS LIST */}
                            <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col min-h-[400px] lg:min-h-0 order-2 shrink-0">
                                <div className="p-5 md:p-6 border-b border-slate-50 flex justify-between items-center shrink-0">
                                    <h3 className="font-black text-xl text-slate-900 flex items-center gap-2"><Receipt className="w-5 h-5 text-emerald-500" /> Pending Bills</h3>
                                    <span className="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg text-xs font-bold">{data.activeOrders?.length || 0}</span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                    {data.activeOrders?.map((order: any, i: number) => {
                                        const isPayable = ['served', 'payment_pending'].includes((order.status || '').toLowerCase().trim());
                                        const validItems = mergeOrderItems(order.items);
                                        const actualTotal = validItems.reduce((sum: number, item: any) => sum + (item.price * item.qty), 0);

                                        return (
                                            <button key={i} onClick={() => handleSettleClick({ label: order.tbl, currentOrder: order, status: order.status })} className={`w-full text-left p-5 rounded-[1.5rem] border-2 transition-all group ${isPayable ? 'bg-white border-emerald-400 shadow-lg shadow-emerald-500/10 hover:-translate-y-1' : 'bg-slate-50 border-slate-100 hover:border-slate-300'}`}>
                                                <div className="flex justify-between items-center mb-4">
                                                    <span className="font-black text-slate-900 text-xl group-hover:text-emerald-600 transition-colors">Table {order.tbl}</span>
                                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${isPayable ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{order.status}</span>
                                                </div>
                                                <div className="flex justify-between items-end border-t border-slate-100 pt-3">
                                                    <span className="text-xs text-slate-500 font-bold bg-white border border-slate-200 px-2 py-1 rounded-md shadow-sm">{validItems.length} Items</span>
                                                    <span className="font-black text-emerald-600 text-2xl leading-none">{formatRs(actualTotal)}</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                    {data.activeOrders?.length === 0 && (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-300 py-10">
                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3"><CheckCircle2 className="w-8 h-8 opacity-40" /></div>
                                            <span className="text-xs font-black uppercase tracking-widest">All Tables Cleared</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    </>
                )}
            </main>
        </>
      )}
    </div>
  );
}