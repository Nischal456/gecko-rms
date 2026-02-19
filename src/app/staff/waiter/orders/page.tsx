"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/app/staff/waiter/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, CheckCircle2, ChefHat, Search, RefreshCcw,
  Coffee, DollarSign, Receipt, ShoppingBag, Utensils,
  AlertCircle, Loader2, Lock, Edit3, ChevronDown, Check, Sparkles
} from "lucide-react";
import { getPOSStats } from "@/app/actions/pos"; 
import { markOrderServed } from "@/app/actions/waiter"; // CRITICAL: Need this to trigger the backend update
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// --- TYPES ---
interface OrderItem {
    id: string;
    name: string;
    qty: number;
    price: number;
    status: string; // Item-specific status
    variant?: string;
    note?: string;
}

interface Order {
    id: string;
    tbl: string;
    status: string; // Round status (pending, cooking, ready, served, etc.)
    items: OrderItem[];
    total: number;
    time: string;
    staff: string;
    timestamp: string;
}

interface GroupedTableOrder {
    tableId: string;
    orders: Order[]; // Array of rounds (Order IDs)
    totalAmount: number;
    lastActiveTime: string;
    isTakeaway: boolean;
    hasActiveOrders: boolean;
}

const formatRs = (amount: number) => {
    return "Rs " + new Intl.NumberFormat('en-NP', { maximumFractionDigits: 0 }).format(amount);
};

// --- COMPONENTS ---

function RoundStatusBadge({ status }: { status: string }) {
    const styles: any = {
        pending: "bg-orange-100 text-orange-700 border-orange-200",
        cooking: "bg-blue-100 text-blue-700 border-blue-200",
        ready: "bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-500/30 animate-pulse",
        served: "bg-slate-100 text-slate-500 border-slate-200",
        paid: "bg-purple-100 text-purple-700 border-purple-200",
        cancelled: "bg-red-100 text-red-700 border-red-200"
    };

    const icons: any = {
        pending: Clock,
        cooking: ChefHat,
        ready: Sparkles,
        served: CheckCircle2,
        paid: DollarSign,
        cancelled: AlertCircle
    };

    const Icon = icons[status] || Clock;

    return (
        <span className={`px-2 py-1 rounded-md border text-[10px] font-black uppercase tracking-wide flex items-center gap-1.5 transition-all ${styles[status] || styles.pending}`}>
            <Icon className="w-3 h-3" />
            {status}
        </span>
    );
}

function OrderRoundBlock({ order, isLast, onServe }: { order: Order, isLast: boolean, onServe: (orderId: string, tableLabel: string) => void }) {
    const router = useRouter();
    
    // Status Logic
    const isReady = order.status === 'ready';
    const isServedOrPaid = ['served', 'paid', 'completed'].includes(order.status);
    const isLocked = ['cooking', 'ready', 'served', 'paid', 'completed'].includes(order.status);

    return (
        <div className={`relative pl-5 pb-6 ${!isLast ? 'border-l-2 border-slate-100 ml-2.5' : 'ml-2.5'}`}>
            
            {/* Timeline Dot */}
            <div className={`absolute -left-[7px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm transition-colors ${isReady ? 'bg-emerald-500 animate-ping' : isLocked ? 'bg-slate-300' : 'bg-orange-500'}`} />
            <div className={`absolute -left-[7px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm transition-colors ${isReady ? 'bg-emerald-500' : isLocked ? 'bg-slate-300' : 'bg-orange-500'}`} />
            
            {/* Round Header */}
            <div className="flex flex-wrap justify-between items-center gap-3 mb-3">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black text-slate-900 uppercase tracking-widest">#{order.id.slice(-6)}</span>
                        <RoundStatusBadge status={order.status} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3"/> {order.time}</span>
                </div>
                
                {/* DYNAMIC ACTION BUTTON */}
                {isReady ? (
                    <button 
                        onClick={() => onServe(order.id, order.tbl)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/30 active:scale-95 border border-emerald-400"
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        Serve Now
                    </button>
                ) : isServedOrPaid ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-400 rounded-xl text-[10px] font-bold border border-slate-200 cursor-not-allowed uppercase tracking-wider">
                        <Check className="w-3 h-3" />
                        Delivered
                    </div>
                ) : isLocked ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-400 rounded-xl text-[10px] font-bold border border-slate-200 opacity-80 cursor-not-allowed uppercase tracking-wider">
                        <Lock className="w-3 h-3" />
                        Cooking
                    </div>
                ) : (
                    <button 
                        onClick={() => router.push(`/staff/waiter/pos?orderId=${order.id}&table=${order.tbl}`)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-orange-50 text-orange-600 rounded-xl text-xs font-black uppercase tracking-wider border border-orange-200 hover:bg-orange-100 transition-colors shadow-sm active:scale-95"
                    >
                        <Edit3 className="w-4 h-4" />
                        Edit
                    </button>
                )}
            </div>

            {/* Items List */}
            <div className={`space-y-2 p-4 rounded-2xl border transition-colors ${isReady ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-start text-sm">
                        <div className="flex gap-3">
                            <span className={`font-black w-6 text-right ${isReady ? 'text-emerald-600' : 'text-slate-400'}`}>{item.qty}x</span>
                            <div>
                                <span className={`font-bold ${isServedOrPaid ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{item.name}</span>
                                {item.variant && <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">{item.variant}</span>}
                                {item.note && <span className="block text-[10px] font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md mt-1 italic">"{item.note}"</span>}
                            </div>
                        </div>
                        <span className={`font-black ${isServedOrPaid ? 'text-slate-400' : 'text-slate-900'}`}>{formatRs(item.price * item.qty)}</span>
                    </div>
                ))}
                
                <div className={`pt-3 mt-3 border-t flex justify-between items-center ${isReady ? 'border-emerald-200/50' : 'border-slate-200'}`}>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Round Total</span>
                    <span className={`text-sm font-black ${isReady ? 'text-emerald-700' : 'text-slate-900'}`}>{formatRs(order.total)}</span>
                </div>
            </div>
        </div>
    )
}

function TableCard({ group, onServe }: { group: GroupedTableOrder, onServe: (orderId: string, tableLabel: string) => void }) {
    const { tableId, orders, totalAmount, isTakeaway } = group;
    const DisplayIcon = isTakeaway ? ShoppingBag : Utensils;
    
    // Check if table has ANY ready orders to highlight the whole card
    const hasReadyOrders = orders.some(o => o.status === 'ready');

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`bg-white rounded-[2rem] border-2 shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col h-full group ${hasReadyOrders ? 'border-emerald-400 shadow-emerald-500/10' : 'border-slate-100'}`}
        >
            {/* Table Header */}
            <div className={`p-6 pb-5 flex justify-between items-start z-10 relative border-b ${hasReadyOrders ? 'bg-emerald-50/30 border-emerald-100' : 'bg-white border-slate-100'}`}>
                <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 shadow-sm ${hasReadyOrders ? 'bg-emerald-500 border-emerald-400 text-white animate-pulse' : isTakeaway ? 'bg-orange-50 border-orange-100 text-orange-600' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                        <DisplayIcon className="w-6 h-6" />
                    </div>
                    <div className="pt-1">
                        <h3 className="font-black text-2xl text-slate-900 tracking-tight leading-none">
                            {isTakeaway ? "Takeaway" : `Table ${tableId}`}
                        </h3>
                        <p className={`text-xs font-bold mt-1.5 uppercase tracking-wider ${hasReadyOrders ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {orders.length} Rounds
                        </p>
                    </div>
                </div>
                <div className="text-right pt-1">
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Grand Total</span>
                    <span className="text-xl font-black text-slate-900">{formatRs(totalAmount)}</span>
                </div>
            </div>

            {/* Scrollable Rounds List */}
            <div className="p-6 flex-1 overflow-y-auto max-h-[350px] custom-scrollbar bg-white">
                {orders.map((order, index) => (
                    <OrderRoundBlock 
                        key={order.id} 
                        order={order} 
                        isLast={index === orders.length - 1} 
                        onServe={onServe}
                    />
                ))}
            </div>

            {/* Footer */}
            {!isTakeaway && (
                <div className="p-4 bg-slate-50 border-t border-slate-100">
                    <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        All rounds tracked
                    </div>
                </div>
            )}
        </motion.div>
    );
}

// --- MAIN PAGE ---
export default function OrdersPage() {
    const [loading, setLoading] = useState(true);
    const [groupedTables, setGroupedTables] = useState<GroupedTableOrder[]>([]);
    const [filter, setFilter] = useState<'active' | 'completed'>('active');
    const [search, setSearch] = useState("");

    useEffect(() => {
        loadOrders();
        const interval = setInterval(loadOrders, 5000); // Fast poll for kitchen updates
        return () => clearInterval(interval);
    }, []);

    async function loadOrders() {
        try {
            const res = await getPOSStats();
            if (res.success && res.stats?.orders_list) {
                const rawOrders: Order[] = res.stats.orders_list;
                
                // Group by Table ID
                const groups: Record<string, GroupedTableOrder> = {};

                rawOrders.forEach(order => {
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
                    groups[tId].totalAmount += order.total;
                    
                    // Check if table has ANY active round
                    if (!['paid', 'completed', 'cancelled'].includes(order.status)) {
                        groups[tId].hasActiveOrders = true;
                    }
                });

                // Sort orders within table by time (Newest Top)
                Object.values(groups).forEach(g => {
                    g.orders.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                });

                setGroupedTables(Object.values(groups));
            }
        } catch (e) {
            toast.error("Sync Error");
        } finally {
            setLoading(false);
        }
    }

    // --- OPTIMISTIC SERVE HANDLER ---
    const handleServeOrder = async (orderId: string, tableLabel: string) => {
        // 1. Optimistic UI Update (Instantly mark as served on frontend)
        setGroupedTables(prev => prev.map(group => {
            if (group.tableId === tableLabel) {
                return {
                    ...group,
                    orders: group.orders.map(o => o.id === orderId ? { ...o, status: 'served' } : o)
                };
            }
            return group;
        }));

        // 2. Call Backend
        const res = await markOrderServed(orderId, tableLabel);
        if (res.success) {
            toast.success("Food Marked as Served!", { icon: "🍽️" });
            loadOrders(); // Sync silently to ensure DB consistency
        } else {
            toast.error("Failed to update status. Reverting...");
            loadOrders(); // Revert on failure
        }
    };

    // Filter Groups
    const filteredGroups = groupedTables.filter(group => {
        const matchesSearch = group.tableId.toLowerCase().includes(search.toLowerCase());
        
        // Active Filter: Show table if it has at least one active order
        if (filter === 'active') return matchesSearch && group.hasActiveOrders;
        
        // Completed Filter: Show table only if ALL orders are completed
        return matchesSearch && !group.hasActiveOrders;
    });

    const activeCount = groupedTables.filter(g => g.hasActiveOrders).length;

    return (
        <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900">
            <Sidebar />
            
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Header */}
                <header className="px-6 md:px-10 py-6 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-20 shadow-sm">
                    <div className="max-w-7xl mx-auto w-full">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                    Round Tracker <span className="bg-emerald-500 text-white text-[10px] px-2.5 py-1 rounded-full border border-emerald-600 shadow-md shadow-emerald-500/20 uppercase tracking-widest animate-pulse">Live</span>
                                </h1>
                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Monitor Kitchen Status & Serve</p>
                            </div>

                            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                                <div className="relative w-full md:w-64 group">
                                    <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                    <input 
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search Table..." 
                                        className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all shadow-sm" 
                                    />
                                </div>
                                
                                <div className="bg-slate-100 p-1.5 rounded-2xl flex border border-slate-200 w-full md:w-auto">
                                    <button 
                                        onClick={() => setFilter('active')}
                                        className={`flex-1 md:flex-none px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex justify-center items-center gap-2 ${filter === 'active' ? 'bg-white text-slate-900 shadow-md transform scale-105' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Active <span className={`px-2 py-0.5 rounded-lg ${filter === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{activeCount}</span>
                                    </button>
                                    <button 
                                        onClick={() => setFilter('completed')}
                                        className={`flex-1 md:flex-none px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex justify-center items-center gap-2 ${filter === 'completed' ? 'bg-white text-slate-900 shadow-md transform scale-105' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        History
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content Grid (With Extra Padding for Mobile) */}
                <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar pb-[120px] md:pb-32">
                    <div className="max-w-7xl mx-auto">
                        {loading && groupedTables.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400">
                                <Loader2 className="w-12 h-12 animate-spin mb-4 text-emerald-500" />
                                <p className="font-black uppercase tracking-widest text-xs animate-pulse">Syncing Rounds...</p>
                            </div>
                        ) : filteredGroups.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400 border-2 border-dashed border-slate-200 rounded-[3rem] bg-slate-50 mt-4">
                                <Coffee className="w-16 h-16 mb-4 opacity-30" />
                                <p className="font-black text-lg text-slate-500 tracking-tight">No tables found</p>
                                <p className="text-xs font-bold uppercase tracking-widest mt-1 opacity-60">Try changing your filter</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8 mt-4">
                                <AnimatePresence mode="popLayout">
                                    {filteredGroups.map((group) => (
                                        <TableCard 
                                            key={group.tableId} 
                                            group={group} 
                                            onServe={handleServeOrder} 
                                        />
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