"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import CashierSidebar from "@/app/staff/cashier/Sidebar";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { 
  Receipt, CheckCircle2, Wallet, Printer, QrCode, Banknote, X, RefreshCcw, 
  ZoomIn, ZoomOut, Save, Trash2, Loader2, Store, FileBarChart, Download, 
  ChefHat, UserCircle, LogOut, Search, AlertTriangle, ArrowLeft, ChevronDown, 
  ChevronUp, User, MapPin, Plus, ShoppingBag, Utensils, ArrowRight, Circle, Square, Clock, Bell,
  CreditCard, LayoutDashboard, Check, Eye, EyeOff, CalendarClock, ShieldCheck, BookOpen, Users, Layers, StickyNote
} from "lucide-react";
import InventoryView from "./components/InventoryView";
import { useRouter } from "next/navigation"; 
import { getCashierData, finalizeTransaction, updateStoreSettings, createCashierOrder, cancelOrder, serveOrder, getCashierReports, processCreditPayment } from "@/app/actions/cashier"; 
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
    cancelledItems?: any[];
}

// --- HELPER CONFIG ---
const formatRs = (amount: number) => "Rs " + new Intl.NumberFormat('en-NP', { maximumFractionDigits: 0 }).format(amount);

const toBS = (dateStr: string) => { 
    try { 
        const date = new Date(dateStr);
        const bsDate = new NepaliDate(date);
        return bsDate.format('YYYY/MM/DD'); 
    } catch { return "---"; }
};

// --- ITEM FILTERING HELPERS ---
function mergeArray(items: any[]) {
    return items.reduce((acc: any[], current: any) => {
        const currentStatus = (current.status || 'pending').toLowerCase().trim();
        const existing = acc.find((item: any) => {
            const itemStatus = (item.status || 'pending').toLowerCase().trim();
            return item.name === current.name && item.price === current.price && item.variant === current.variant && itemStatus === currentStatus;
        });
        if (existing) existing.qty += current.qty; 
        else acc.push({ ...current });
        return acc;
    }, []);
}

// Used for Math and Thermal Receipt (EXCLUDES all waste)
function getActiveItems(items: any[]) {
    if (!items) return [];
    const validItems = items.filter(item => {
        const s = (item.status || '').toLowerCase().trim();
        return s !== 'cancelled' && s !== 'void' && item.qty > 0;
    });
    return mergeArray(validItems);
}

// Used for Display in Checkout (INCLUDES cooking/ready waste for reference)
function getDisplayItems(items: any[]) {
    if (!items) return [];
    const validItems = items.filter(item => {
        const s = (item.status || '').toLowerCase().trim();
        if (s === 'cancelled' || s === 'void') {
           const prev = (item.previous_status || '').toLowerCase().trim();
           return prev === 'cooking' || prev === 'ready';
        }
        return item.qty > 0;
    });
    return mergeArray(validItems);
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
const ThermalReceipt = ({ data, order, customerDetails, paymentDetails }: any) => {
    if (!order || !data) return null;
    
    // STRICTLY use active items so cancelled food NEVER prints on the receipt
    const mergedItems = getActiveItems(order.items);
    
    const displayBillNo = order.bill_no || order.id.slice(-6).toUpperCase();
    const { subTotal, discount, grandTotal, tendered, change } = paymentDetails || { subTotal: 0, discount: 0, grandTotal: 0, tendered: 0, change: 0 };

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
                <div className="r-divider" />
                <div className="r-flex" style={{ fontSize: '12px' }}><span>Sub Total</span><span>Rs {subTotal.toLocaleString()}</span></div>
                {discount > 0 && <div className="r-flex" style={{ fontSize: '12px' }}><span>Discount</span><span>- Rs {discount.toLocaleString()}</span></div>}
                
                <div className="r-divider" style={{ borderBottomStyle: 'solid', borderBottomWidth: '2px' }} />
                <div className="r-flex r-bold" style={{ fontSize: '16px', margin: '8px 0' }}><span>GRAND TOTAL</span><span>Rs {grandTotal.toLocaleString()}</span></div>
                
                {tendered > 0 && (
                    <>
                        <div className="r-divider" />
                        <div className="r-flex" style={{ fontSize: '11px' }}><span>Tendered</span><span>Rs {tendered.toLocaleString()}</span></div>
                        <div className="r-flex" style={{ fontSize: '11px' }}><span>Change</span><span>Rs {change.toLocaleString()}</span></div>
                    </>
                )}
                
                <div className="r-divider" />
                <div className="r-center" style={{ marginTop: '10px', fontSize: '11px', fontWeight: 'bold' }}>*** THANK YOU VISIT AGAIN ***</div>
            </div>
        </div>
    );
};

const renderSmallStatus = (status: string, previousStatus?: string) => {
    const s = (status || '').toLowerCase().trim();
    if (s === 'ready') return <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md uppercase border border-emerald-200 shadow-sm animate-pulse shrink-0">Ready</span>;
    if (s === 'served' || s === 'payment_pending') return <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md uppercase border border-slate-200 flex items-center gap-1 shrink-0"><Check className="w-2.5 h-2.5"/> Served</span>;
    if (s === 'cooking') return <span className="text-[9px] font-black bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-md uppercase border border-orange-200 shrink-0">Cooking</span>;
    if (s === 'cancelled' || s === 'void') return <span className="text-[8px] font-black bg-red-100 text-red-600 px-1.5 py-0.5 rounded-md uppercase border border-red-200 shrink-0">Waste ({previousStatus || 'Unknown'})</span>;
    return <span className="text-[9px] font-black bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-md uppercase border border-blue-100 shrink-0">Pending</span>;
};

// --- PREMIUM CHECKOUT MODAL ---
function CheckoutModal({ table, onClose, onConfirm, onCancel, restaurant }: any) {
    const [method, setMethod] = useState("Cash");
    const [customer, setCustomer] = useState({ name: "", address: "" });
    const [expandedQr, setExpandedQr] = useState(false); 
    const [creditCustomers, setCreditCustomers] = useState<string[]>([]);
    
    // --- FINANCIAL ENGINE ---
    const [discountInput, setDiscountInput] = useState<string>("");
    const [tenderedInput, setTenderedInput] = useState<string>("");
    const [isProcessing, setIsProcessing] = useState(false); // FRONTEND DOUBLE-CLICK LOCK
    
    const dragControls = useDragControls();

    const order = table?.currentOrder;
    
    // FETCH CREDIT LEDGER FOR AUTOCOMPLETE
    useEffect(() => {
        if (method === 'Credit') {
            getCashierReports(60).then(res => {
                if (res.success && res.summary?.creditAccounts) {
                    setCreditCustomers(Object.values(res.summary.creditAccounts).map((c:any) => c.displayName));
                }
            });
        }
    }, [method]);

    if(!order) return null;
    
    const safeStatus = (order.status || '').toLowerCase().trim();
    const isCancellable = safeStatus === 'pending';
    
    const activeItems = getActiveItems(order.items);
    const displayItems = getDisplayItems(order.items);
    
    // STRICT PAYMENT LOCK: Scans every single active item. 
    // If even ONE item is pending, cooking, or ready, checkout is blocked.
    const hasUnservedItems = activeItems.some(i => {
        const s = (i.status || '').toLowerCase().trim();
        return ['pending', 'cooking', 'ready', 'preparing'].includes(s);
    });
    
    const isPayable = !hasUnservedItems && activeItems.length > 0;
    
    // CALCULATIONS 
    const subTotal = activeItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const discountAmt = discountInput === "" ? 0 : Number(discountInput);
    const grandTotal = Math.max(0, subTotal - discountAmt);
    const tenderedAmt = tenderedInput === "" ? 0 : Number(tenderedInput);
    
    let changeDue = 0;
    let creditDue = 0;
    
    if (method === "Credit") {
        creditDue = Math.max(0, grandTotal - tenderedAmt);
    } else {
        changeDue = tenderedAmt > grandTotal ? tenderedAmt - grandTotal : 0;
    }
    
    const paymentDetails = { subTotal, discount: discountAmt, grandTotal, tendered: tenderedAmt, change: changeDue, creditDue };

    const bankAccounts = restaurant?.bank_accounts || []; 
    const paymentMethods = [
        { name: "Cash", icon: Banknote, color: "emerald", keyStr: "sys_cash" },
        { name: "Credit", icon: User, color: "blue", keyStr: "sys_credit" },
        ...bankAccounts.map((acc: any, i: number) => ({ name: acc.name, icon: QrCode, color: "purple", qr: acc.qrUrl, keyStr: `db_qr_${i}` }))
    ];

    const activeMethod = paymentMethods.find((m:any) => m.name === method);
    const handlePrint = () => { setTimeout(() => window.print(), 300); };

    const handleConfirmCheckout = async () => {
        if (isProcessing || !isPayable) return; // Immediate lock
        
        if (method === "Credit" && (!customer.name || customer.name.trim() === "")) {
            toast.error("Customer Name is required for Credit orders!", { description: "Please enter the customer name below." });
            return;
        }

        setIsProcessing(true); // Disable the button instantly
        try {
            await onConfirm(table.label, order.id, method, paymentDetails, customer);
        } catch(e) {
            setIsProcessing(false); // Only unlock if it errors out
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-6 bg-slate-900/40 backdrop-blur-sm">
            
            <ThermalReceipt data={restaurant} order={order} customerDetails={customer} paymentDetails={paymentDetails} />

            {/* EXPANDED QR MODAL */}
            <AnimatePresence>
                {expandedQr && activeMethod?.qr && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                            onClick={() => setExpandedQr(false)}
                            className="absolute inset-0 bg-slate-950/90 backdrop-blur-2xl cursor-pointer" 
                        />
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0, y: 50 }} 
                            animate={{ scale: 1, opacity: 1, y: 0 }} 
                            exit={{ scale: 0.8, opacity: 0, y: 50 }}
                            transition={{ type: "spring", damping: 30, stiffness: 400 }}
                            className="bg-white rounded-[3rem] p-6 md:p-10 relative z-10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] flex flex-col items-center max-w-lg w-full border border-white/20 transform-gpu"
                        >
                            <button onClick={() => setExpandedQr(false)} className="absolute top-6 right-6 w-12 h-12 bg-slate-100 hover:bg-red-50 hover:text-red-500 rounded-full flex items-center justify-center text-slate-500 transition-all shadow-sm active:scale-90 z-50">
                                <X className="w-6 h-6" />
                            </button>
                            
                            <div className="flex flex-col items-center mb-6 w-full">
                                <div className="flex items-center gap-4 bg-emerald-50 px-5 py-3 rounded-2xl border border-emerald-100 mb-6 shadow-sm">
                                    <QrCode className="w-6 h-6 text-emerald-500" />
                                    <div>
                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Pay via {activeMethod.name}</p>
                                        <p className="text-xs font-bold text-slate-600">Table {table.label}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full aspect-square max-w-[400px] bg-slate-50 border border-slate-200 rounded-[2.5rem] p-2 shadow-inner flex items-center justify-center relative overflow-hidden group">
                                <motion.img 
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    src={activeMethod.qr} 
                                    className="w-full h-full object-contain relative z-10 drop-shadow-md rounded-[2rem]" 
                                />
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.05)_0%,transparent_70%)] animate-pulse" />
                            </div>

                            <div className="mt-8 w-full bg-slate-900 p-5 rounded-[2rem] shadow-xl flex flex-col items-center gap-1 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 blur-3xl rounded-full" />
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/20 blur-3xl rounded-full" />
                                <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-0.5 relative z-10">Payable Amount</p>
                                <h4 className="text-4xl font-black text-white tracking-tighter relative z-10">{formatRs(grandTotal)}</h4>
                                <div className="flex items-center gap-1.5 text-emerald-400/80 mt-1 relative z-10">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span className="text-[9px] font-bold uppercase tracking-widest">Verified Merchant</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <motion.div 
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
                drag="y" dragControls={dragControls} dragListener={false} 
                dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.5 }}
                onDragEnd={(e, info) => { if (info.offset.y > 100) onClose(); }}
                className="bg-white w-full h-[92dvh] md:h-[90vh] md:max-w-5xl rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row overflow-hidden relative ring-1 ring-white/20 transform-gpu will-change-transform"
            >
                <div className="w-full h-8 absolute top-0 left-0 z-50 flex items-center justify-center md:hidden touch-none" onPointerDown={(e) => dragControls.start(e)}><div className="w-12 h-1.5 bg-slate-300 rounded-full" /></div>

                {/* LEFT: BILL PREVIEW (Fully Scrollable) */}
                <div className="w-full md:w-[45%] lg:w-[40%] bg-slate-50/80 flex flex-col border-r border-slate-200 backdrop-blur-sm h-[45%] md:h-full shrink-0">
                    <div className="p-5 md:p-6 pt-10 md:pt-6 pb-4 shrink-0 flex justify-between items-center border-b border-slate-200/60">
                        <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none">Table {table.label}</h2>
                        <span className={`text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-sm ${isPayable ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-200 text-slate-600 border border-slate-300'}`}>{isPayable ? 'Payable' : 'Pending'}</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
                        {displayItems.map((item: any, i: number) => {
                            const isCancelled = ['cancelled', 'void'].includes((item.status || '').toLowerCase().trim());
                            return (
                                <div key={i} className={`flex justify-between items-start text-sm p-3 rounded-2xl border shadow-sm transition-all ${isCancelled ? 'bg-red-50/40 border-red-100 opacity-80' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                                    <div className="flex gap-3 w-full pr-2">
                                        <span className={`font-black w-7 h-7 flex items-center justify-center rounded-lg shrink-0 ${isCancelled ? 'bg-red-100 text-red-500' : 'bg-slate-50 text-slate-400'}`}>{item.qty}</span> 
                                        <div className="flex flex-col justify-center w-full mt-0.5 min-w-0">
                                            {/* ANTI-OVERLAP FIX: Break-words & Flex Layout */}
                                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1.5 sm:gap-2 mb-1 w-full min-w-0">
                                                <span className={`font-bold leading-tight break-words flex-1 pr-1 ${isCancelled ? 'line-through text-slate-400' : 'text-slate-900'}`}>{item.name}</span>
                                                {renderSmallStatus(item.status, item.previous_status)}
                                            </div>
                                            {item.variant && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.variant}</span>}
                                        </div>
                                    </div>
                                    <span className={`font-black flex items-start shrink-0 mt-0.5 ${isCancelled ? 'line-through text-red-300' : 'text-slate-900'}`}>{formatRs(item.price * item.qty)}</span>
                                </div>
                            );
                        })}
                    </div>
                    
                    {/* FINANCIALS PANEL (Pinned to bottom of left column) */}
                    <div className="p-4 md:p-6 bg-white border-t border-slate-200 shrink-0">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Subtotal</span>
                            <span className="text-sm font-black text-slate-700">{formatRs(subTotal)}</span>
                        </div>
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Discount (Rs)</span>
                            <input 
                                type="number" 
                                value={discountInput} 
                                onChange={e => setDiscountInput(e.target.value)} 
                                placeholder="0" 
                                className="w-24 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-black text-right outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-red-500" 
                            />
                        </div>
                        <div className="flex justify-between items-end bg-slate-900 p-4 rounded-2xl shadow-lg">
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Total Due</span>
                            <span className="text-3xl font-black text-white tracking-tighter">{formatRs(grandTotal)}</span>
                        </div>
                    </div>
                </div>
                
                {/* RIGHT: PAYMENT ACTIONS (Scrollable Body, Pinned Footer) */}
                <div className="flex-1 bg-white flex flex-col h-[55%] md:h-full relative shrink-0">
                    
                    {/* Right Panel Header */}
                    <div className="flex justify-between items-center p-4 md:p-6 border-b border-slate-100 shrink-0">
                        <h3 className="text-xl md:text-2xl font-black flex items-center gap-2 text-slate-900"><Wallet className="w-6 h-6 md:w-7 md:h-7 text-emerald-500"/> Checkout</h3>
                        <div className="flex items-center gap-2 md:gap-3">
                            <button onClick={handlePrint} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-lg active:scale-95 border border-slate-900"><Printer className="w-4 h-4"/> Print Bill</button>
                            <button onClick={onClose} className="hidden md:flex p-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors border border-slate-200 hover:border-red-200"><X className="w-5 h-5"/></button>
                        </div>
                    </div>
                    
                    {/* Scrollable Form Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-5">
                        
                        <div className="grid grid-cols-4 gap-2 md:gap-3 shrink-0">
                            {paymentMethods.map((m: any) => (
                                <button key={m.keyStr} onClick={() => setMethod(m.name)} className={`h-20 md:h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all ${method===m.name ? `border-${m.color}-500 bg-${m.color}-50 text-${m.color}-700 shadow-md transform scale-[1.02]` : 'border-slate-100 bg-slate-50/50 hover:border-slate-300 text-slate-500'}`}>
                                    <m.icon className="w-5 h-5 md:w-6 md:h-6" />
                                    <span className="text-[9px] font-black uppercase tracking-widest px-1 truncate w-full text-center">{m.name}</span>
                                </button>
                            ))}
                        </div>

                        <div className="w-full bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-center relative overflow-hidden shrink-0 p-6 min-h-[160px]">
                            <AnimatePresence mode="wait">
                                {activeMethod?.qr ? (
                                    <motion.div key="qr" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} onClick={() => setExpandedQr(true)} className="w-full h-full flex flex-col items-center justify-center cursor-pointer group py-2">
                                        <img src={activeMethod.qr} className="w-full h-full max-w-[150px] md:max-w-[200px] max-h-[150px] md:max-h-[200px] object-contain mix-blend-multiply drop-shadow-sm rounded-2xl group-hover:scale-105 transition-transform duration-500" />
                                        <div className="absolute bottom-3 flex items-center gap-1.5 px-4 py-2 bg-white/95 backdrop-blur-md border border-slate-200 rounded-full shadow-lg group-hover:border-emerald-300 group-hover:text-emerald-600 transition-all text-slate-500 scale-90 md:scale-100">
                                            <ZoomIn className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Tap to Enlarge</span>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div key="cash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-slate-400 w-full">
                                        {method === "Credit" ? (
                                            <div className="flex flex-col items-center">
                                                <BookOpen className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 text-blue-500/30"/>
                                                <div className="w-full max-w-xs bg-white border border-slate-200 p-3 md:p-4 rounded-2xl shadow-sm text-left focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Advance Received (Rs)</label>
                                                    <input 
                                                        type="number" 
                                                        value={tenderedInput} 
                                                        onChange={e=>setTenderedInput(e.target.value)} 
                                                        placeholder="0" 
                                                        className="w-full bg-transparent font-black text-xl md:text-2xl text-slate-900 outline-none" 
                                                    />
                                                </div>
                                                <p className="text-[10px] text-slate-500 font-bold max-w-xs text-center mt-3">Customer Name is strictly required below to record this Khata balance.</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center w-full">
                                                <Banknote className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 text-emerald-500/20"/>
                                                <div className="w-full max-w-xs bg-white border border-slate-200 p-3 md:p-4 rounded-2xl shadow-sm text-left focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Cash Received (Rs)</label>
                                                    <input 
                                                        type="number" 
                                                        value={tenderedInput} 
                                                        onChange={e=>setTenderedInput(e.target.value)} 
                                                        placeholder="0" 
                                                        className="w-full bg-transparent font-black text-xl md:text-2xl text-slate-900 outline-none" 
                                                    />
                                                </div>
                                                {Number(tenderedInput) > 0 && (
                                                    <div className="w-full max-w-xs mt-3 bg-amber-50 border border-amber-200 p-3 md:p-4 rounded-2xl flex justify-between items-center shadow-inner">
                                                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Return Change</span>
                                                        <span className="text-xl md:text-2xl font-black text-amber-600">Rs {changeDue}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-3 shrink-0 pb-4">
                            {/* NATIVE AUTOCOMPLETE DATALIST FOR CREDIT CUSTOMERS */}
                            <input 
                                list="credit-customers-list"
                                value={customer.name} 
                                onChange={e => setCustomer({...customer, name: e.target.value})} 
                                placeholder={method === 'Credit' ? "* Select or Type Customer Name" : "Customer Name (Optional)"} 
                                className={`flex-1 p-3.5 bg-slate-50 border rounded-xl text-sm font-bold focus:bg-white outline-none transition-all ${method === 'Credit' ? 'border-blue-300 focus:ring-2 focus:ring-blue-100 bg-blue-50/30' : 'border-slate-200 focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400'}`}
                            />
                            <datalist id="credit-customers-list">
                                {creditCustomers.map((name, i) => <option key={i} value={name} />)}
                            </datalist>

                            <input 
                                value={customer.address} 
                                onChange={e => setCustomer({...customer, address: e.target.value})} 
                                placeholder="Phone / Address (Optional)" 
                                className="flex-1 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 transition-all outline-none"
                            />
                        </div>
                    </div>

                    {/* PINNED FOOTER ACTION BUTTONS */}
                    <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-200 shrink-0 pb-safe">
                        <div className="flex gap-3 md:gap-4">
                            {isCancellable && <button onClick={() => onCancel(order.id, table.label)} className="flex-1 py-4 md:py-5 rounded-2xl font-black text-red-500 bg-white hover:bg-red-50 transition-all flex items-center justify-center gap-2 border border-red-200 active:scale-95 text-xs md:text-sm uppercase tracking-wider shadow-sm"><Trash2 className="w-5 h-5"/> Cancel</button>}
                            
                            {/* STRICT PAYMENT LOCK + DOUBLE CLICK PREVENTION */}
                            <button 
                                disabled={!isPayable || isProcessing} 
                                onClick={handleConfirmCheckout} 
                                className={`flex-[2] py-4 md:py-5 rounded-2xl font-black text-white shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 text-xs md:text-sm uppercase tracking-wider ${isPayable && !isProcessing ? (method === 'Credit' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/30' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/30') : 'bg-slate-300 cursor-not-allowed shadow-none'}`}>
                                {isProcessing ? <><Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin"/> Processing...</> : 
                                 isPayable ? <><CheckCircle2 className="w-5 h-5 md:w-6 md:h-6"/> Confirm Payment</> : 
                                 <><Clock className="w-5 h-5 md:w-6 md:h-6"/> Awaiting Service</>}
                            </button>
                        </div>
                    </div>

                </div>
            </motion.div>
        </div>
    );
}

// --- CREDIT BOOK MODAL COMPONENT (WITH SEARCH & PAYMENT) ---
function CreditBookModal({ onClose }: { onClose: () => void }) {
    const [data, setData] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    
    // Payment States
    const [payAmount, setPayAmount] = useState<string>("");
    const [isPaying, setIsPaying] = useState(false);

    const loadCredits = async () => {
        setLoading(true);
        const res = await getCashierReports(60);
        if(res.success && res.summary?.creditAccounts) {
            // Filter out accounts that have a 0 balance to keep ledger clean
            const activeAccounts: any = {};
            for (const [key, val] of Object.entries(res.summary.creditAccounts)) {
                if ((val as any).total > 0) activeAccounts[key] = val;
            }
            setData(activeAccounts);
        } else {
            setData({});
        }
        setLoading(false);
    };

    useEffect(() => { loadCredits(); }, []);

    const allCustomers = Object.keys(data);
    const filteredCustomers = allCustomers.filter(c => {
        const displayName = data[c].displayName || c;
        return displayName.toLowerCase().includes(searchQuery.toLowerCase());
    });
    
    const activeData = selectedCustomer ? data[selectedCustomer] : null;

    const handlePayCredit = async () => {
        if (!selectedCustomer || !activeData) return;
        const amt = Number(payAmount);
        
        if (!amt || amt <= 0) return toast.error("Please enter a valid amount");
        if (amt > activeData.total) return toast.error("Amount exceeds total due balance");

        setIsPaying(true);
        const res = await processCreditPayment(selectedCustomer, amt);
        if (res.success) {
            toast.success(`Successfully cleared Rs ${amt} for ${activeData.displayName}`);
            setPayAmount("");
            
            // If they paid it completely off, clear the selection
            if (activeData.total - amt <= 0) setSelectedCustomer(null);
            
            await loadCredits(); // Refresh ledger
        } else {
            toast.error("Payment Failed", { description: res.error || "An error occurred." });
        }
        setIsPaying(false);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-[#f8fafc] w-full max-w-5xl h-[85vh] rounded-[2.5rem] shadow-2xl relative z-10 flex flex-col md:flex-row overflow-hidden border border-slate-200 transform-gpu">
                <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 bg-white/50 backdrop-blur rounded-full flex items-center justify-center text-slate-600 hover:bg-white z-50 shadow-sm transition-all active:scale-95"><X className="w-5 h-5" /></button>
                
                {/* Left Side: Customer List */}
                <div className="w-full md:w-1/3 bg-white border-r border-slate-200 flex flex-col h-[40%] md:h-full shrink-0">
                    <div className="p-6 border-b border-slate-100 shrink-0">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-inner"><BookOpen className="w-5 h-5" /></div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Credit Book</h2>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Khata Ledger (60 Days)</p>
                            </div>
                        </div>
                        {/* SEARCH BAR */}
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                <Search className="w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            </div>
                            <input 
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search customers..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-4 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                        {loading ? <div className="flex justify-center p-10"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div> : 
                         filteredCustomers.length === 0 ? <p className="text-center text-slate-400 text-xs font-bold mt-10">No records found.</p> :
                         filteredCustomers.map((c) => (
                            <button key={c} onClick={() => setSelectedCustomer(c)} className={`w-full text-left p-4 rounded-2xl transition-all ${selectedCustomer === c ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-100'}`}>
                                <p className="font-bold text-sm truncate">{data[c].displayName}</p>
                                <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${selectedCustomer === c ? 'text-blue-200' : 'text-red-500'}`}>Due: {formatRs(data[c].total)}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right Side: Invoice Details & Payment */}
                <div className="flex-1 p-5 md:p-8 overflow-y-auto custom-scrollbar bg-[#f8fafc] flex flex-col h-[60%] md:h-full relative">
                    {!selectedCustomer || !activeData ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-300 opacity-60">
                            <Users className="w-16 h-16 mb-4" />
                            <p className="font-black text-sm uppercase tracking-widest">Select a customer</p>
                        </div>
                    ) : (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} key={selectedCustomer} className="flex flex-col h-full">
                            <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm mb-6 shrink-0 relative overflow-hidden">
                                <h3 className="text-2xl md:text-3xl font-black text-slate-900 mb-1">{activeData.displayName}</h3>
                                {activeData.phone && <p className="text-xs font-bold text-slate-500 mb-4">{activeData.phone}</p>}
                                
                                <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex justify-between items-center mb-4">
                                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Total Outstanding</span>
                                    <span className="text-2xl font-black text-red-600">{formatRs(activeData.total)}</span>
                                </div>

                                {/* KHATA PAYMENT ENGINE */}
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Record Khata Payment</p>
                                    <div className="flex flex-col md:flex-row gap-3">
                                        <input 
                                            type="number" 
                                            value={payAmount} 
                                            onChange={(e) => setPayAmount(e.target.value)} 
                                            placeholder="Amount (Rs)" 
                                            className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                                        />
                                        <button 
                                            onClick={handlePayCredit}
                                            disabled={isPaying || !payAmount}
                                            className="bg-blue-600 hover:bg-blue-500 text-white font-black text-sm px-6 py-3 rounded-xl shadow-md shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {isPaying ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Clear Dues</>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">Credit Invoices</h4>
                            <div className="space-y-3 pb-safe">
                                {activeData.bills.map((b: any, i: number) => {
                                    // Only show bills that actually have a due amount
                                    if(b.due_amount <= 0) return null;
                                    return (
                                        <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                                            <div className="flex justify-between items-start border-b border-slate-50 pb-3">
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Inv: {b.invoice_no}</p>
                                                    <p className="text-xs font-bold text-slate-600">{toBS(b.date)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-sm font-black text-slate-900 block mb-0.5">Total: {formatRs(b.grandTotal)}</span>
                                                    {b.discount > 0 && <span className="text-[9px] font-black text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 inline-block mb-0.5 mt-0.5 shadow-sm">Discount: -{formatRs(b.discount)}</span>}
                                                    {b.tendered > 0 && <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Paid: {formatRs(b.tendered)}</span>}
                                                    <span className="text-xs font-black text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100 inline-block mt-1 shadow-sm">Due: {formatRs(b.due_amount)}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                {b.items.map((it:any, idx:number) => {
                                                    const isCancelled = ['cancelled', 'void'].includes((it.status || '').toLowerCase().trim());
                                                    return (
                                                        <div key={idx} className={`flex justify-between text-[11px] font-medium ${isCancelled ? 'text-red-400 line-through' : 'text-slate-500'}`}>
                                                            <span className="flex items-start gap-1.5 min-w-0 pr-2">
                                                                <span className={`font-black text-white ${isCancelled ? 'bg-red-400' : 'bg-slate-800'} w-4 h-4 flex items-center justify-center rounded-[4px] text-[9px] shrink-0 mt-0.5`}>{it.qty}</span>
                                                                <div className="flex flex-col min-w-0">
                                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                                        <span className="break-words leading-tight">{it.name}</span>
                                                                        {isCancelled && <span className="text-[8px] bg-red-100 text-red-600 px-1 rounded-sm no-underline border border-red-200 font-black tracking-widest uppercase shadow-sm shrink-0">Waste</span>}
                                                                    </div>
                                                                    {it.variant && <span className="text-[9px] text-slate-400 font-black uppercase mt-0.5 tracking-widest">{it.variant}</span>}
                                                                </div>
                                                            </span>
                                                            <span className="shrink-0 mt-0.5">Rs {it.price * it.qty}</span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

// --- MAIN DASHBOARD CONTENT ---
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

  const [currentTime, setCurrentTime] = useState(new Date());
  const [showTotalSales, setShowTotalSales] = useState(true);
  const [showCreditBook, setShowCreditBook] = useState(false); 

  useEffect(() => {
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(timer);
  }, []);

 useEffect(() => {
    // 1. Initial Heavy Load (Downloads everything once)
    loadData(false); 
    
    // 2. Ultra-Lightweight Micro-Polling (Saves Bandwidth)
    const t = setInterval(() => { 
        if(['terminal', 'active_orders'].includes(view)) {
            loadData(true); 
        }
    }, 5000);
    
    if(window.innerWidth < 768) setScale(0.5);
    return () => clearInterval(t);
  }, [view]);

  async function loadData(isPolling = false) {
      if (!isPolling) setLoading(true); // Only show spinner on first load
      
      const res = await getCashierData(isPolling);
      
      if (res.success) {
          setData(prev => {
              // If polling, keep the old menu/restaurant data, just update the live orders/tables!
              if (isPolling && prev) {
                  return {
                      ...prev,
                      stats: res.stats as any,
                      tables: res.tables,
                      activeOrders: res.activeOrders,
                      cancelledItems: res.cancelledItems
                  };
              }
              return res as any; // Full initial load
          });

          // Notification Engine
          let newUpdate = false;
          res.activeOrders?.forEach((o: any) => {
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
      
      if (!isPolling) setLoading(false);
  }

  const handleSettleClick = (table: any) => { if (!table.currentOrder) return; setSelectedTable(table); };

  const processPayment = async (tableId: string, orderId: string, method: string, paymentDetails: any, customer?: any) => {
      const res = await finalizeTransaction(tableId, orderId, method, paymentDetails, data?.restaurant, customer);
      if (res.success) { toast.success("Payment Processed"); setSelectedTable(null); loadData(); } else { toast.error("Error", { description: res.error }); }
  };

  const handleCancelOrder = async (orderId: string, tableId: string, itemIdToCancel?: string) => {
      const res = await cancelOrder(orderId, tableId, itemIdToCancel);
      if(res.success) { loadData(); if(!itemIdToCancel) setSelectedTable(null); }
      return res; 
  };

  const handleServeOrder = async (orderId: string, tableId: string, itemIds?: string[]) => {
      const res = await serveOrder(orderId, tableId, itemIds);
      if(res.success) loadData();
      return res;
  };

  const handleEditOrder = (order: any) => { setPosTable(order.tbl); setPosOrderType(order.type || 'dine_in'); setExistingOrderToEdit(order); setView('pos'); };
  const handleStartNewOrder = () => { setExistingOrderToEdit(null); setView('new_order_select'); };
  const handleSelectService = (type: 'dine_in' | 'takeaway') => { setPosOrderType(type); if (type === 'dine_in') setView('table_select'); else { setPosTable('TAKEAWAY'); setExistingOrderToEdit(null); setView('pos'); } };
  const handleSelectTableForOrder = (tableLabel: string) => { setPosTable(tableLabel); setExistingOrderToEdit(null); setView('pos'); };
  const submitOrder = async (table: string, items: any[], type: 'dine_in'|'takeaway') => { const res = await createCashierOrder(table, items, type); if(res.success) { toast.success("Order Placed"); loadData(); setView('terminal'); } else { toast.error("Failed"); } };

  const sections = data ? ['All', ...Array.from(new Set(data.tables?.map((t:any) => t.section || "Main Hall")))] : [];
  const filteredTables = data?.tables?.filter((t: any) => filter === 'All' || (t.section || "Main Hall") === filter);
  const getGreeting = () => { const hr = currentTime.getHours(); if (hr < 12) return "Good Morning"; if (hr < 17) return "Good Afternoon"; return "Good Evening"; };

  return (
    <div className="flex h-[100dvh] bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden relative">
      <AnimatePresence>{loading && <SystemLoader />}</AnimatePresence>
      <AnimatePresence>{selectedTable && <CheckoutModal table={selectedTable} restaurant={data?.restaurant} onClose={() => setSelectedTable(null)} onConfirm={processPayment} onCancel={handleCancelOrder} />}</AnimatePresence>
      <AnimatePresence>{showCreditBook && <CreditBookModal onClose={() => setShowCreditBook(false)} />}</AnimatePresence>
      
      <AnimatePresence>
        {notification && (<motion.div initial={{ y: -100, opacity: 0 }} animate={{ y: 20, opacity: 1 }} exit={{ y: -100, opacity: 0 }} className="absolute top-0 left-0 right-0 z-[300] flex justify-center pointer-events-none px-4"><div className="bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold pointer-events-auto border-2 border-emerald-500"><Bell className="w-5 h-5 animate-bounce" /> {notification}</div></motion.div>)}
      </AnimatePresence>

      {!loading && data && (
        <>
            <CashierSidebar tenantName={data.restaurant?.name} logo={data.restaurant?.logo_url} tenantCode={data.restaurant?.code} currentView={view} setView={(v: string) => { setView(v); if(v==='active_orders') setHasUpdates(false); }} hasUpdates={hasUpdates} />
            <main className="flex-1 flex flex-col h-full overflow-hidden relative pt-[72px] md:pt-0 pb-[80px] md:pb-0">
                {view === 'settings' ? <SettingsPage data={data} onSave={updateStoreSettings} /> : 
                 view === 'reports' ? <ReportsPage data={data} /> : 
                 view === 'inventory' ? <InventoryView /> :
                 view === 'active_orders' ? <ActiveOrdersView data={data} onSelectOrder={(o:any) => handleSettleClick({ label: o.tbl, currentOrder: o })} onServeOrder={handleServeOrder} onCancelOrder={handleCancelOrder} onEditOrder={handleEditOrder} /> :
                 view === 'new_order_select' ? <NewOrderSelection onSelect={handleSelectService} /> :
                 view === 'table_select' ? <TableSelector tables={data.tables} onSelectTable={handleSelectTableForOrder} onBack={() => setView('new_order_select')} /> :
                 view === 'pos' ? <CashierPOS data={data} onClose={() => setView('terminal')} onSubmit={submitOrder} preSelectedTable={posTable} orderType={posOrderType} existingOrder={existingOrderToEdit} /> :
                 (
                    <>
                        <div className="px-5 md:px-8 py-4 md:py-6 flex flex-col md:flex-row justify-between items-start md:items-center bg-white/80 backdrop-blur-md border-b border-slate-100 z-10 shrink-0 gap-4">
                            <div>
                                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{getGreeting()}, <span className="text-emerald-500">{data.restaurant?.name}</span></h1>
                                <div className="flex items-center gap-3 mt-1.5">
                                    <span className="text-[10px] md:text-xs font-bold text-white bg-slate-900 px-2 py-0.5 rounded-md uppercase tracking-widest flex items-center gap-1 shadow-sm"><CalendarClock className="w-3 h-3" /> {toBS(currentTime.toISOString())}</span>
                                    <span className="text-[10px] md:text-xs font-black text-slate-500 tracking-wider">{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                </div>
                            </div>
                            <div className="flex gap-3 md:gap-4 items-center w-full md:w-auto border-t md:border-none border-slate-100 pt-3 md:pt-0">
                                
                                {/* PREMIUM CREDIT BOOK BUTTON */}
                                <button onClick={() => setShowCreditBook(true)} className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2.5 rounded-xl border border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm group">
                                    <BookOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">Credit Ledger</span>
                                </button>
                                
                                <div className="flex items-center gap-4 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                                    <div className="text-right flex flex-col items-end">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Active</p>
                                        <p className="text-lg md:text-xl font-black text-orange-500 leading-none">{data.stats?.pendingBills || 0}</p>
                                    </div>
                                    <div className="w-px h-8 bg-slate-200" />
                                    <div className="text-right flex flex-col items-end">
                                        <div className="flex items-center justify-end gap-1.5 mb-1">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sales</p>
                                            <button onClick={() => setShowTotalSales(!showTotalSales)} className="text-slate-400 hover:text-emerald-600 transition-colors focus:outline-none"><Eye className="w-3 h-3" /></button>
                                        </div>
                                        <div className="flex items-baseline gap-1 h-6">
                                            <span className="text-sm font-black text-emerald-600 leading-none">{showTotalSales ? 'Rs' : ''}</span>
                                            <p className="text-lg md:text-xl font-black text-emerald-600 leading-none transition-all">
                                                {showTotalSales ? new Intl.NumberFormat('en-NP', { maximumFractionDigits: 0 }).format(data.stats?.totalRevenue || 0) : '*****'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto lg:overflow-hidden relative grid grid-cols-1 lg:grid-cols-3 p-4 md:p-6 gap-6 scroll-smooth">
                            <div className="lg:col-span-2 relative bg-[#F1F5F9] rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-inner flex flex-col min-h-[450px] lg:min-h-0 order-1 shrink-0">
                                <div className="absolute top-4 left-4 z-20 flex gap-2 overflow-x-auto max-w-[70%] no-scrollbar p-1">{sections.map((s: any) => (<button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-wider shadow-sm transition-all whitespace-nowrap border ${filter === s ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-200'}`}>{s}</button>))}</div>
                                <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 pointer-events-auto"><div className="bg-white/90 backdrop-blur rounded-xl shadow-lg border border-white/50 flex flex-col overflow-hidden"><button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-3 hover:bg-slate-50 border-b border-slate-100"><ZoomIn className="w-5 h-5 text-slate-600" /></button><button onClick={() => setScale(s => Math.max(0.4, s - 0.1))} className="p-3 hover:bg-slate-50"><ZoomOut className="w-5 h-5 text-slate-600" /></button></div></div>
                                <motion.div ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing touch-none" drag dragMomentum={false} onDrag={(e, info) => setPan(p => ({ x: p.x + info.delta.x, y: p.y + info.delta.y }))}><motion.div className="absolute top-0 left-0 w-full h-full origin-center" style={{ x: pan.x, y: pan.y, scale: scale }}><div className="absolute inset-[-500%] bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />{filteredTables?.map((t: any) => { const s = (t.status || '').toLowerCase().trim(); const isPayable = ['served', 'payment_pending', 'ready'].includes(s); const isBusy = ['occupied', 'cooking'].includes(s); return (<motion.div key={t.id} style={{ x: t.x, y: t.y, width: t.width, height: t.height, rotate: t.rotation, borderRadius: t.shape === 'round' ? '50%' : '24px' }} onClick={() => isPayable && handleSettleClick(t)} className={`absolute border-2 flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-transform shadow-lg ${isPayable ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-emerald-500/20' : isBusy ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-slate-200 text-slate-400 opacity-80'}`}><span className="font-black text-xl leading-none">{t.label}</span>{isPayable && <span className="text-[9px] font-black bg-emerald-500 text-white px-2.5 py-0.5 rounded-md mt-1.5 animate-pulse tracking-widest">PAY</span>}{isBusy && !isPayable && <span className="text-[9px] font-black bg-orange-200 text-orange-800 px-2.5 py-0.5 rounded-md mt-1.5 tracking-widest">BUSY</span>}</motion.div>);})}</motion.div></motion.div>
                            </div>
                            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm flex flex-col min-h-[400px] lg:min-h-0 order-2 shrink-0">
                                <div className="p-6 border-b border-slate-50 flex justify-between items-center shrink-0"><h3 className="font-black text-xl text-slate-900 flex items-center gap-2"><Wallet className="w-5 h-5 text-emerald-500" /> Pending Bills</h3><span className="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg text-xs font-bold">{data.activeOrders?.length || 0}</span></div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                    {data.activeOrders?.map((o: any, i: number) => { 
                                        const isPayable = ['served', 'payment_pending'].includes((o.status || '').toLowerCase().trim()); 
                                        const items = getActiveItems(o.items); 
                                        const total = items.reduce((sum: number, item: any) => sum + (item.price * item.qty), 0); 
                                        return (
                                            <button key={i} onClick={() => handleSettleClick({ label: o.tbl, currentOrder: o, status: o.status })} className={`w-full text-left p-5 rounded-[1.5rem] border-2 transition-all group ${isPayable ? 'bg-white border-emerald-400 shadow-lg shadow-emerald-500/10 hover:-translate-y-1' : 'bg-slate-50 border-slate-100 hover:border-slate-300'}`}>
                                                <div className="flex justify-between items-center mb-4">
                                                    <span className="font-black text-slate-900 text-xl group-hover:text-emerald-600 transition-colors">Table {o.tbl}</span>
                                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${isPayable ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{o.status}</span>
                                                </div>
                                                <div className="flex justify-between items-end border-t border-slate-100 pt-3">
                                                    <span className="text-xs text-slate-500 font-bold bg-white border border-slate-200 px-2 py-1 rounded-md shadow-sm">{items.length} Items</span>
                                                    <span className="font-black text-emerald-600 text-2xl leading-none">{formatRs(total)}</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                    {data.activeOrders?.length === 0 && (<div className="h-full flex flex-col items-center justify-center text-slate-300 py-10"><div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3"><CheckCircle2 className="w-8 h-8 opacity-40" /></div><span className="text-xs font-black uppercase tracking-widest">All Tables Cleared</span></div>)}
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