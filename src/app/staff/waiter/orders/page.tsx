"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/app/staff/waiter/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, CheckCircle2, ChefHat, Search, RefreshCcw,
  Coffee, DollarSign, Receipt, ShoppingBag, Utensils,
  AlertCircle, Loader2, Lock, Edit3, ChevronDown, Check, Sparkles, Layers, StickyNote, Trash2, XCircle, ArrowUpRight
} from "lucide-react";
import { getPOSStats } from "@/app/actions/pos"; 
import { markOrderServed, cancelOrder } from "@/app/actions/waiter"; 
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// --- SOUND CONSTANTS ---
const SOUND_NOTIFICATION = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

// --- TYPES ---
interface OrderItem {
    id: string;
    unique_id?: string;
    name: string;
    qty: number;
    price: number;
    status: string; 
    variant?: string;
    note?: string;
}

interface Order {
    id: string;
    tbl: string;
    status: string; 
    items: OrderItem[];
    total: number;
    time: string;
    staff: string;
    timestamp: string;
}

interface GroupedTableOrder {
    tableId: string;
    orders: Order[]; 
    totalAmount: number;
    lastActiveTime: string;
    isTakeaway: boolean;
    hasActiveOrders: boolean;
}

const formatRs = (amount: number) => {
    return "Rs " + new Intl.NumberFormat('en-NP', { maximumFractionDigits: 0 }).format(amount);
};

// --- COMPONENTS ---

const renderItemStatus = (status: string) => {
    if (status === 'ready') return <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded uppercase tracking-widest animate-pulse border border-emerald-200 shadow-sm">Ready</span>;
    if (status === 'served') return <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-widest flex items-center gap-1"><Check className="w-2.5 h-2.5"/> Served</span>;
    if (status === 'cooking') return <span className="text-[9px] font-black bg-orange-100 text-orange-700 px-2 py-0.5 rounded uppercase tracking-widest border border-orange-200">Cooking</span>;
    return <span className="text-[9px] font-black bg-blue-50 text-blue-500 px-2 py-0.5 rounded uppercase tracking-widest border border-blue-100">Pending</span>;
};

function RoundStatusBadge({ status }: { status: string }) {
    const styles: any = {
        pending: "bg-blue-100 text-blue-700 border-blue-200",
        cooking: "bg-orange-100 text-orange-700 border-orange-200",
        ready: "bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-500/30 animate-pulse",
        payment_pending: "bg-slate-100 text-slate-600 border-slate-200",
        served: "bg-slate-100 text-slate-500 border-slate-200",
        paid: "bg-purple-100 text-purple-700 border-purple-200",
        completed: "bg-purple-100 text-purple-700 border-purple-200",
        cancelled: "bg-red-100 text-red-700 border-red-200"
    };

    const icons: any = {
        pending: Clock,
        cooking: ChefHat,
        ready: Sparkles,
        payment_pending: CheckCircle2,
        served: CheckCircle2,
        paid: DollarSign,
        completed: DollarSign,
        cancelled: AlertCircle
    };

    const displayStatus = status === 'payment_pending' ? 'Served' : status;
    const Icon = icons[status] || Clock;

    return (
        <span className={`px-2 py-1 rounded-md border text-[10px] font-black uppercase tracking-wide flex items-center gap-1.5 transition-all ${styles[status] || styles.pending}`}>
            <Icon className="w-3 h-3" />
            {displayStatus}
        </span>
    );
}

function OrderRoundBlock({ order, isLast, onServe, onCancel, onEdit }: { order: Order, isLast: boolean, onServe: (orderId: string, tableLabel: string, rawItems: any[]) => void, onCancel: (orderId: string, tableLabel: string, itemId?: string) => void, onEdit: (orderId: string, tableLabel: string) => void }) {
    const validItems = order.items?.filter(item => {
        const s = (item.status || '').toLowerCase();
        return s !== 'cancelled' && s !== 'void' && item.qty > 0;
    }) || [];

    if (validItems.length === 0) return null; 

    const readyItems = validItems.filter(i => i.status === 'ready');
    const hasReadyItems = readyItems.length > 0;
    const hasPendingItems = validItems.some(i => i.status === 'pending');
    const hasCookingItems = validItems.some(i => i.status === 'cooking');
    const allItemsServed = validItems.every(i => ['served', 'paid', 'completed'].includes(i.status));

    const isFullyPending = validItems.every(i => i.status === 'pending');

    return (
        <div className={`relative pl-4 md:pl-5 pb-6 ${!isLast ? 'border-l-2 border-slate-100 ml-2.5' : 'ml-2.5'}`}>
            
            <div className={`absolute -left-[7px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm transition-colors ${hasReadyItems ? 'bg-emerald-500 animate-ping' : allItemsServed ? 'bg-slate-300' : 'bg-orange-500'}`} />
            <div className={`absolute -left-[7px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm transition-colors ${hasReadyItems ? 'bg-emerald-500' : allItemsServed ? 'bg-slate-300' : 'bg-orange-500'}`} />
            
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-4">
                <div>
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-black text-slate-900 uppercase tracking-widest">#{order.id.slice(-6)}</span>
                        <RoundStatusBadge status={hasReadyItems ? 'ready' : order.status} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3"/> {order.time}</span>
                </div>
                
                <div className="shrink-0 flex flex-wrap items-center gap-2 w-full xl:w-auto">
                    {hasReadyItems ? (
                        <button 
                            onClick={() => onServe(order.id, order.tbl, order.items)}
                            className="flex-1 xl:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/30 active:scale-95 border border-emerald-400"
                        >
                            <Utensils className="w-4 h-4" />
                            Serve {readyItems.length} Ready
                        </button>
                    ) : allItemsServed ? (
                        <div className="flex-1 xl:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 text-slate-400 rounded-xl text-[10px] font-bold border border-slate-200 cursor-not-allowed uppercase tracking-wider">
                            <Check className="w-3 h-3" />
                            Fully Served
                        </div>
                    ) : (
                        <>
                            {hasPendingItems && (
                                <button 
                                    onClick={() => onEdit(order.id, order.tbl)}
                                    className="flex-1 xl:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white text-slate-600 rounded-xl text-[11px] font-black uppercase tracking-wider border-2 border-slate-200 hover:border-emerald-200 hover:text-emerald-600 transition-colors shadow-sm active:scale-95"
                                >
                                    <Edit3 className="w-4 h-4" />
                                    Edit
                                </button>
                            )}
                            {isFullyPending && (
                                <button 
                                    onClick={() => onCancel(order.id, order.tbl)}
                                    className="flex-1 xl:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-[11px] font-black uppercase tracking-wider border border-red-100 hover:bg-red-100 hover:border-red-200 transition-colors shadow-sm active:scale-95"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Cancel
                                </button>
                            )}
                            {(!hasPendingItems && hasCookingItems) && (
                                <div className="flex-1 xl:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-50 text-slate-400 rounded-xl text-[10px] font-bold border border-slate-100 cursor-not-allowed uppercase tracking-wider">
                                    <Lock className="w-3 h-3" />
                                    Cooking Locked
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className={`space-y-3 p-3 md:p-4 rounded-[1.5rem] border transition-colors ${hasReadyItems ? 'bg-emerald-50/50 border-emerald-200 shadow-sm' : 'bg-slate-50 border-slate-100'}`}>
                {validItems.map((item, i) => (
                    <div key={i} className={`flex justify-between items-start text-sm pb-3 border-b border-dashed border-slate-200 last:border-0 last:pb-0 ${item.status === 'served' ? 'opacity-50 grayscale' : ''}`}>
                        <div className="flex gap-2.5 md:gap-3 w-full pr-2">
                            <span className={`font-black w-5 md:w-6 text-right mt-0.5 ${item.status === 'ready' ? 'text-emerald-600' : 'text-slate-500'}`}>{item.qty}x</span>
                            <div className="flex flex-col w-full">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start w-full gap-1.5 sm:gap-2">
                                    <span className={`font-bold leading-tight ${item.status === 'served' ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{item.name}</span>
                                    
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {renderItemStatus(item.status)}
                                        {item.status === 'pending' && !isFullyPending && (
                                            <button 
                                                onClick={() => {
                                                    const sig = item.unique_id || item.id || `${item.name}||${item.variant || ''}`;
                                                    onCancel(order.id, order.tbl, sig);
                                                }}
                                                className="p-1 bg-white text-red-500 rounded-md border border-red-100 hover:bg-red-50 hover:border-red-300 transition-all shadow-sm active:scale-95"
                                                title="Cancel specific item"
                                            >
                                                <XCircle className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                    {item.variant && <span className="text-[9px] font-bold bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm"><Layers className="w-2.5 h-2.5"/> {item.variant}</span>}
                                    {item.note && <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1 italic shadow-sm"><StickyNote className="w-2.5 h-2.5"/> {item.note}</span>}
                                </div>
                            </div>
                        </div>
                        <span className={`font-black shrink-0 mt-0.5 ${item.status === 'served' ? 'text-slate-400' : 'text-slate-900'}`}>{formatRs(item.price * item.qty)}</span>
                    </div>
                ))}
                
                <div className={`pt-3 mt-3 flex justify-between items-center ${hasReadyItems ? 'border-emerald-200/50' : 'border-slate-200'}`}>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Round Total</span>
                    <span className={`text-sm font-black ${hasReadyItems ? 'text-emerald-700' : 'text-slate-900'}`}>{formatRs(order.total)}</span>
                </div>
            </div>
        </div>
    )
}

function TableCard({ group, onServe, onCancel, onEdit }: { group: GroupedTableOrder, onServe: (orderId: string, tableLabel: string, rawItems: any[]) => void, onCancel: (orderId: string, tableLabel: string, itemId?: string) => void, onEdit: (orderId: string, tableLabel: string) => void }) {
    const { tableId, orders, totalAmount, isTakeaway } = group;
    const DisplayIcon = isTakeaway ? ShoppingBag : Utensils;
    
    const hasReadyItems = orders.some(o => o.items.some((i:any) => i.status === 'ready'));

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`bg-white rounded-[2rem] border-2 shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col h-full group ${hasReadyItems ? 'border-emerald-400 shadow-emerald-500/10' : 'border-slate-100'}`}
        >
            <div className={`p-5 md:p-6 flex justify-between items-start z-10 relative border-b ${hasReadyItems ? 'bg-emerald-50/30 border-emerald-100' : 'bg-white border-slate-100'}`}>
                <div className="flex items-start gap-3 md:gap-4">
                    <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center border-2 shadow-sm shrink-0 ${hasReadyItems ? 'bg-emerald-500 border-emerald-400 text-white animate-pulse' : isTakeaway ? 'bg-purple-50 border-purple-100 text-purple-600' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                        <DisplayIcon className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div className="pt-1">
                        <h3 className="font-black text-xl md:text-2xl text-slate-900 tracking-tight leading-none">
                            {isTakeaway ? "Takeaway" : `Table ${tableId}`}
                        </h3>
                        <p className={`text-[10px] md:text-xs font-bold mt-1.5 uppercase tracking-wider ${hasReadyItems ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {orders.length} Rounds
                        </p>
                    </div>
                </div>
                <div className="text-right pt-1 shrink-0">
                    <span className="block text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Grand Total</span>
                    <span className="text-lg md:text-xl font-black text-slate-900">{formatRs(totalAmount)}</span>
                </div>
            </div>

            <div className="p-4 md:p-6 flex-1 bg-white">
                {orders.map((order, index) => (
                    <OrderRoundBlock 
                        key={order.id} 
                        order={order} 
                        isLast={index === orders.length - 1} 
                        onServe={onServe}
                        onCancel={onCancel}
                        onEdit={onEdit}
                    />
                ))}
            </div>

            {!isTakeaway && (
                <div className="p-4 bg-slate-50 border-t border-slate-100">
                    <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Live tracking active
                    </div>
                </div>
            )}
        </motion.div>
    );
}

// --- MAIN PAGE ---
export default function OrdersPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [groupedTables, setGroupedTables] = useState<GroupedTableOrder[]>([]);
    const [filter, setFilter] = useState<'active' | 'completed'>('active');
    const [search, setSearch] = useState("");
    
    // Notification State
    const [topAlert, setTopAlert] = useState<{msg: string} | null>(null);
    const notifiedReadyIds = useRef(new Set<string>());

    useEffect(() => {
        loadOrders();
        const interval = setInterval(loadOrders, 4000); 
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if(topAlert) {
            const timer = setTimeout(() => setTopAlert(null), 5000); 
            return () => clearTimeout(timer);
        }
    }, [topAlert]);

    async function loadOrders() {
        try {
            const res = await getPOSStats();
            if (res.success && res.stats?.orders_list) {
                const rawOrders: Order[] = res.stats.orders_list;
                const groups: Record<string, GroupedTableOrder> = {};

                rawOrders.forEach(order => {
                    const validItems = order.items?.filter((i:any) => !['cancelled', 'void'].includes(i.status) && i.qty > 0) || [];
                    const itemsReady = validItems.filter((i: any) => i.status === 'ready').length;
                    
                    if (itemsReady > 0 && order.status !== 'served' && order.status !== 'payment_pending') {
                        if (!notifiedReadyIds.current.has(order.id)) {
                            setTopAlert({ msg: `${itemsReady} Items Ready for Table ${order.tbl}` });
                            new Audio(SOUND_NOTIFICATION).play().catch(e => console.log("Audio play blocked", e));
                            notifiedReadyIds.current.add(order.id);
                        }
                    }

                    const tId = order.tbl;
                    if (!groups[tId]) {
                        groups[tId] = {
                            tableId: tId,
                            orders: [],
                            totalAmount: 0,
                            lastActiveTime: order.time,
                            isTakeaway: tId.startsWith("TAKEAWAY"),
                            hasActiveOrders: false
                        };
                    }
                    groups[tId].orders.push(order);
                    
                    const roundRealTotal = validItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
                    groups[tId].totalAmount += roundRealTotal;
                    
                    if (!['paid', 'completed', 'cancelled'].includes(order.status)) {
                        groups[tId].hasActiveOrders = true;
                    }
                });

                Object.values(groups).forEach(g => {
                    g.orders.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                });

                const finalGroups = Object.values(groups).sort((a, b) => {
                    const aHasReady = a.orders.some(o => o.items.some((i:any) => i.status === 'ready'));
                    const bHasReady = b.orders.some(o => o.items.some((i:any) => i.status === 'ready'));
                    if (aHasReady && !bHasReady) return -1;
                    if (!aHasReady && bHasReady) return 1;
                    return 0; 
                });

                setGroupedTables(finalGroups);
            }
        } catch (e) {
            toast.error("Sync Error");
        } finally {
            setLoading(false);
        }
    }

    const handleServeOrder = async (orderId: string, tableLabel: string, rawItems: any[]) => {
        const readyItems = rawItems.filter((i: any) => i.status === 'ready');
        if (readyItems.length === 0) return toast.info("No items are ready to serve yet.");

        const readyItemIdentifiers = readyItems.map((i: any) => i.unique_id || i.id || `${i.name}||${i.variant || ''}`);

        setGroupedTables(prev => prev.map(group => {
            if (group.tableId === tableLabel) {
                return {
                    ...group,
                    orders: group.orders.map(o => {
                        if (o.id === orderId) {
                            const newItems = o.items.map(i => {
                                const sig = i.unique_id || i.id || `${i.name}||${i.variant || ''}`;
                                if (readyItemIdentifiers.includes(sig) && i.status === 'ready') {
                                    return { ...i, status: 'served' };
                                }
                                return i;
                            });
                            
                            const stillCooking = newItems.some(i => ['pending', 'cooking'].includes(i.status));
                            const stillReady = newItems.some(i => i.status === 'ready');
                            const newStatus = stillReady ? 'ready' : stillCooking ? 'cooking' : 'payment_pending';

                            return { ...o, status: newStatus, items: newItems };
                        }
                        return o;
                    })
                };
            }
            return group;
        }));

        const res = await markOrderServed(orderId, tableLabel, readyItemIdentifiers);
        if (res.success) {
            toast.success(`Served ${readyItems.length} item(s) to Table ${tableLabel}!`);
            loadOrders(); 
        } else {
            toast.error("Failed to update status. Reverting...");
            loadOrders(); 
        }
    };

    // --- PREMIUM CUSTOM TOAST FOR CANCEL ---
    const handleCancelOrder = (orderId: string, tableLabel: string, itemIdToCancel?: string) => {
        toast.custom((t) => (
            <div className="bg-white p-5 rounded-[1.5rem] shadow-2xl border border-slate-100 flex flex-col gap-4 w-full sm:w-[320px] pointer-events-auto">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center shrink-0">
                        <Trash2 className="w-5 h-5" />
                    </div>
                    <div className="pt-0.5">
                        <h4 className="font-black text-slate-900 text-sm tracking-tight">
                            {itemIdToCancel ? "Cancel Item?" : "Cancel Round?"}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
                            {itemIdToCancel 
                                ? "Are you sure you want to remove this specific item? This action cannot be undone." 
                                : "Are you sure you want to completely cancel this entire round? This action cannot be undone."}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 mt-1">
                    <button 
                        onClick={() => toast.dismiss(t)} 
                        className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-xl transition-colors"
                    >
                        Keep It
                    </button>
                    <button 
                        onClick={async () => {
                            toast.dismiss(t);
                            toast.loading(itemIdToCancel ? "Cancelling item..." : "Cancelling round...");
                            const res = await cancelOrder(orderId, tableLabel, itemIdToCancel);
                            toast.dismiss();
                            if (res.success) {
                                toast.success(itemIdToCancel ? "Item Cancelled Successfully" : "Round Cancelled Successfully");
                                loadOrders();
                            } else {
                                toast.error(res.error || "Could not cancel");
                                loadOrders();
                            }
                        }} 
                        className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-red-500/25 active:scale-95"
                    >
                        Yes, Cancel
                    </button>
                </div>
            </div>
        ), { duration: 8000, id: `cancel-${orderId}-${itemIdToCancel || 'round'}` });
    };

    // --- PREMIUM EDIT ROUTING ---
    const handleEditOrder = (orderId: string, tableLabel: string) => {
        toast.loading(`Opening editor for Table ${tableLabel}...`, { duration: 1500 });
        router.push(`/staff/waiter/pos?orderId=${orderId}&table=${tableLabel}`);
    };

    const filteredGroups = groupedTables.filter(group => {
        const matchesSearch = group.tableId.toLowerCase().includes(search.toLowerCase());
        if (filter === 'active') return matchesSearch && group.hasActiveOrders;
        return matchesSearch && !group.hasActiveOrders;
    });

    const activeCount = groupedTables.filter(g => g.hasActiveOrders).length;

    return (
        <div className="flex h-[100dvh] bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden relative">
            
            {/* LIVE ALERT BANNER */}
            <AnimatePresence>
                {topAlert && (
                    <motion.div 
                        initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -100, opacity: 0 }}
                        className="absolute top-0 left-0 right-0 z-[100] flex justify-center pt-4 pointer-events-none px-4"
                    >
                        <div className="px-6 py-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-4 pointer-events-auto border border-emerald-400 bg-emerald-600 text-white w-full max-w-sm">
                            <div className="p-3 bg-white/20 rounded-full shrink-0">
                                <ChefHat className="w-7 h-7 text-white animate-bounce" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-black text-[10px] uppercase tracking-widest text-emerald-100">Kitchen Update</h4>
                                <p className="font-black text-xl leading-tight tracking-tight mt-0.5">{topAlert.msg}</p>
                            </div>
                            <button onClick={() => setTopAlert(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><XCircle className="w-6 h-6" /></button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Sidebar />
            
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Fixed Header */}
                <header className="px-5 md:px-10 py-5 md:py-6 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-20 shadow-sm shrink-0">
                    <div className="max-w-7xl mx-auto w-full">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                            <div>
                                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                    Round Tracker <span className="bg-emerald-500 text-white text-[9px] px-2 py-0.5 rounded-full border border-emerald-600 shadow-md shadow-emerald-500/20 uppercase tracking-widest animate-pulse">Live</span>
                                </h1>
                                <p className="text-[10px] md:text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Monitor Kitchen Status & Serve</p>
                            </div>

                            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                                <div className="relative w-full md:w-64 group">
                                    <Search className="w-4 h-4 md:w-5 md:h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                    <input 
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search Table..." 
                                        className="w-full pl-11 pr-4 py-3 md:py-3.5 bg-white border-2 border-slate-100 rounded-xl md:rounded-2xl text-sm font-bold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all shadow-sm" 
                                    />
                                </div>
                                
                                <div className="bg-slate-100 p-1.5 rounded-xl md:rounded-2xl flex border border-slate-200 w-full md:w-auto shrink-0">
                                    <button 
                                        onClick={() => setFilter('active')}
                                        className={`flex-1 md:flex-none px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black uppercase tracking-wider transition-all flex justify-center items-center gap-2 ${filter === 'active' ? 'bg-white text-slate-900 shadow-md transform scale-105' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Active <span className={`px-2 py-0.5 rounded-md ${filter === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{activeCount}</span>
                                    </button>
                                    <button 
                                        onClick={() => setFilter('completed')}
                                        className={`flex-1 md:flex-none px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black uppercase tracking-wider transition-all flex justify-center items-center gap-2 ${filter === 'completed' ? 'bg-white text-slate-900 shadow-md transform scale-105' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        History
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Natural Full Page Scroll Container */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-10 pb-[160px] md:pb-32 bg-[#F8FAFC]">
                    <div className="max-w-7xl mx-auto">
                        {loading && groupedTables.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400">
                                <Loader2 className="w-12 h-12 animate-spin mb-4 text-emerald-500" />
                                <p className="font-black uppercase tracking-widest text-xs animate-pulse">Syncing Rounds...</p>
                            </div>
                        ) : filteredGroups.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-[2.5rem] md:rounded-[3rem] bg-slate-50 mt-4">
                                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 border border-slate-100">
                                    <Coffee className="w-8 h-8 opacity-40 text-slate-500" />
                                </div>
                                <p className="font-black text-lg text-slate-500 tracking-tight">No tables found</p>
                                <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest mt-1 opacity-60">Try changing your filter</p>
                            </div>
                        ) : (
                            <div className="columns-1 lg:columns-2 xl:columns-3 gap-6 md:gap-8 space-y-6 md:space-y-8 mt-2">
                                <AnimatePresence mode="popLayout">
                                    {filteredGroups.map((group) => (
                                        <div key={group.tableId} className="break-inside-avoid">
                                            <TableCard 
                                                group={group} 
                                                onServe={handleServeOrder} 
                                                onCancel={handleCancelOrder}
                                                onEdit={handleEditOrder}
                                            />
                                        </div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}