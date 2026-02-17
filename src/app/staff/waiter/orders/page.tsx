"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/app/staff/waiter/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, CheckCircle2, ChefHat, Search, RefreshCcw,
  Coffee, DollarSign, Receipt, ShoppingBag, Utensils,
  AlertCircle, Loader2, Lock, Edit3, ChevronDown, Check
} from "lucide-react";
import { getPOSStats } from "@/app/actions/pos"; 
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
    status: string; // Round status (pending, cooking, etc.)
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
        ready: "bg-emerald-100 text-emerald-700 border-emerald-200 animate-pulse",
        served: "bg-slate-100 text-slate-600 border-slate-200",
        paid: "bg-purple-100 text-purple-700 border-purple-200",
        cancelled: "bg-red-100 text-red-700 border-red-200"
    };

    const icons: any = {
        pending: Clock,
        cooking: ChefHat,
        ready: Utensils,
        served: CheckCircle2,
        paid: DollarSign,
        cancelled: AlertCircle
    };

    const Icon = icons[status] || Clock;

    return (
        <span className={`px-2 py-0.5 rounded-md border text-[10px] font-black uppercase tracking-wide flex items-center gap-1.5 ${styles[status] || styles.pending}`}>
            <Icon className="w-3 h-3" />
            {status}
        </span>
    );
}

function OrderRoundBlock({ order, isLast }: { order: Order, isLast: boolean }) {
    const router = useRouter();
    
    // Logic: Lock if not pending
    const isLocked = ['cooking', 'ready', 'served', 'paid', 'completed'].includes(order.status);

    return (
        <div className={`relative pl-4 pb-6 ${!isLast ? 'border-l-2 border-slate-100 ml-2' : 'ml-2'}`}>
            {/* Timeline Dot */}
            <div className={`absolute -left-[5px] top-0 w-3 h-3 rounded-full border-2 border-white shadow-sm ${isLocked ? 'bg-slate-300' : 'bg-orange-500 animate-pulse'}`} />
            
            {/* Round Header */}
            <div className="flex justify-between items-center mb-3">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900">Order #{order.id}</span>
                        <RoundStatusBadge status={order.status} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">{order.time}</span>
                </div>
                
                {/* ACTION BUTTON: Edit or Locked */}
                {isLocked ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-400 rounded-lg text-[10px] font-bold border border-slate-200 opacity-80 cursor-not-allowed">
                        <Lock className="w-3 h-3" />
                        Kitchen Locked
                    </div>
                ) : (
                    <button 
                        onClick={() => router.push(`/staff/waiter/pos?orderId=${order.id}&table=${order.tbl}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-[10px] font-bold border border-orange-200 hover:bg-orange-100 transition-colors shadow-sm active:scale-95"
                    >
                        <Edit3 className="w-3 h-3" />
                        Modify
                    </button>
                )}
            </div>

            {/* Items */}
            <div className="space-y-2 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-start text-xs">
                        <div className="flex gap-2">
                            <span className="font-bold text-slate-500">{item.qty}x</span>
                            <div>
                                <span className="font-bold text-slate-800">{item.name}</span>
                                {item.variant && <span className="block text-[9px] text-slate-400">{item.variant}</span>}
                                {item.note && <span className="block text-[9px] text-orange-500 italic">"{item.note}"</span>}
                            </div>
                        </div>
                        <span className="font-medium text-slate-400">{formatRs(item.price * item.qty)}</span>
                    </div>
                ))}
                
                <div className="pt-2 mt-2 border-t border-slate-200/50 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Round Total</span>
                    <span className="text-xs font-black text-slate-900">{formatRs(order.total)}</span>
                </div>
            </div>
        </div>
    )
}

function TableCard({ group }: { group: GroupedTableOrder }) {
    const { tableId, orders, totalAmount, isTakeaway } = group;
    const DisplayIcon = isTakeaway ? ShoppingBag : Utensils;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col h-full group"
        >
            {/* Table Header */}
            <div className="p-5 pb-4 bg-white border-b border-slate-100 flex justify-between items-start z-10 relative">
                <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm ${isTakeaway ? 'bg-orange-50 border-orange-100 text-orange-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                        <DisplayIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-black text-lg text-slate-900 leading-tight">
                            {isTakeaway ? "Takeaway" : `Table ${tableId}`}
                        </h3>
                        <p className="text-[11px] font-bold text-slate-400 mt-0.5">{orders.length} Active Rounds</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Grand Total</span>
                    <span className="text-lg font-black text-slate-900">{formatRs(totalAmount)}</span>
                </div>
            </div>

            {/* Scrollable Rounds List */}
            <div className="p-5 flex-1 overflow-y-auto max-h-[300px] custom-scrollbar">
                {orders.map((order, index) => (
                    <OrderRoundBlock 
                        key={order.id} 
                        order={order} 
                        isLast={index === orders.length - 1} 
                    />
                ))}
            </div>

            {/* Footer */}
            {!isTakeaway && (
                <div className="p-3 bg-slate-50 border-t border-slate-100">
                    <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400">
                        <CheckCircle2 className="w-3 h-3" />
                        All items tracked
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
                <header className="px-6 md:px-10 py-6 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-20">
                    <div className="max-w-7xl mx-auto w-full">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                    Order Command <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full border border-emerald-200">Live</span>
                                </h1>
                                <p className="text-sm font-bold text-slate-400 mt-1">Manage rounds and kitchen status</p>
                            </div>

                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="relative w-full md:w-64 group">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                    <input 
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search Table..." 
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-emerald-100 transition-all shadow-inner" 
                                    />
                                </div>
                                
                                <div className="bg-slate-100 p-1 rounded-xl flex border border-slate-200">
                                    <button 
                                        onClick={() => setFilter('active')}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${filter === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Active Tables <span className={`px-1.5 py-0.5 rounded ${filter === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{activeCount}</span>
                                    </button>
                                    <button 
                                        onClick={() => setFilter('completed')}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${filter === 'completed' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        History
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content Grid */}
                <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar pb-32">
                    <div className="max-w-7xl mx-auto">
                        {loading && groupedTables.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                <Loader2 className="w-10 h-10 animate-spin mb-4 text-emerald-500" />
                                <p className="font-bold animate-pulse">Syncing Kitchen...</p>
                            </div>
                        ) : filteredGroups.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
                                <Coffee className="w-12 h-12 mb-2 opacity-30" />
                                <p className="font-bold">No active tables found</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <AnimatePresence mode="popLayout">
                                    {filteredGroups.map((group) => (
                                        <TableCard key={group.tableId} group={group} />
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