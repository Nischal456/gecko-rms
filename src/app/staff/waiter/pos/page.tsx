"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, ArrowLeft, Plus, Minus, Trash2, ChefHat, 
  Utensils, Coffee, Beer, IceCream, SearchX, 
  ShoppingBag, Send, AlertCircle, Loader2, X, Layers, MessageSquare,
  LayoutGrid, Users, ClipboardList, DollarSign, Package, Edit
} from "lucide-react";
import { toast } from "sonner";
import { getPOSMenu, submitOrder, getPOSStats, modifyOrder } from "@/app/actions/pos"; // Imported modifyOrder

// --- TYPES ---
interface Variant { name: string; price: string | number; }
interface MenuItem {
    id: string; name: string; price: number; category: string; description?: string; image_url?: string; is_veg?: boolean; is_available?: boolean; variants?: Variant[];
}
interface CartItem extends MenuItem {
    cartId: string; variantName?: string; qty: number; note?: string; 
}
interface Stats {
    totalTables: number; vacantCount: number; occupiedCount: number; occupancyRate: number; totalOrders: number; totalRevenue: number;
    tables: { label: string; status: string }[];
    orders_list?: any[]; // Added for Modify Logic
}

const formatRs = (n: number) => "Rs " + new Intl.NumberFormat('en-NP', { maximumFractionDigits: 0 }).format(n);

// --- COMPONENTS ---
function StatsWidget({ icon: Icon, label, value, subLabel, color, delay }: any) {
    return (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delay, duration: 0.4 }} className="flex items-center gap-3 bg-white/80 backdrop-blur-md border border-slate-100 px-4 py-2.5 rounded-2xl shadow-sm min-w-[140px]">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${color}`}><Icon className="w-5 h-5" /></div>
            <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p><div className="flex items-baseline gap-1.5"><p className="text-xl font-black text-slate-900 leading-none">{value}</p>{subLabel && <span className="text-[10px] font-bold text-slate-400">{subLabel}</span>}</div></div>
        </motion.div>
    )
}

function MenuCard({ item, onAdd }: { item: MenuItem, onAdd: (variant?: Variant) => void }) {
    const hasVariants = item.variants && item.variants.length > 0;
    let priceDisplay = formatRs(item.price);
    if (hasVariants) {
        const prices = item.variants!.map(v => Number(v.price));
        priceDisplay = `Rs ${Math.min(...prices)} - ${Math.max(...prices)}`;
    }
    return (
        <motion.button layout whileHover={{ y: -4, boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} whileTap={{ scale: 0.98 }} onClick={() => onAdd(undefined)} className="flex flex-col bg-white border border-slate-100 rounded-[1.5rem] p-4 shadow-sm transition-all group text-left h-full relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-slate-50 to-transparent rounded-bl-[3rem] -mr-8 -mt-8 transition-colors group-hover:from-emerald-50 pointer-events-none" />
            <div className="flex justify-between items-start w-full mb-3 relative z-10"><div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner border border-white/50 ${item.is_veg ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}><Utensils className="w-5 h-5" /></div><span className="font-black text-slate-900 bg-white/80 backdrop-blur-sm border border-slate-100 px-2.5 py-1 rounded-lg text-xs whitespace-nowrap shadow-sm">{priceDisplay}</span></div>
            <h3 className="font-black text-slate-900 text-lg leading-tight mb-1 line-clamp-2 group-hover:text-emerald-700 transition-colors">{item.name}</h3><p className="text-[11px] text-slate-400 font-medium line-clamp-2 mb-4 h-8 leading-relaxed">{item.description || "Freshly prepared."}</p>
            <div className="mt-auto w-full"><div className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center transition-all shadow-sm gap-2 ${hasVariants ? 'bg-slate-900 text-white group-hover:bg-slate-800' : 'bg-slate-50 text-slate-500 group-hover:bg-emerald-500 group-hover:text-white'}`}>{hasVariants ? <><Layers className="w-3 h-3" /> Select Options</> : <><Plus className="w-3 h-3" /> Add Item</>}</div></div>
        </motion.button>
    )
}

function ItemDetailModal({ item, onClose, onConfirm }: { item: MenuItem, onClose: () => void, onConfirm: (v: Variant | undefined, notes: string) => void }) {
    const [selectedVariant, setSelectedVariant] = useState<Variant | undefined>(item.variants && item.variants.length > 0 ? item.variants[0] : undefined);
    const [notes, setNotes] = useState<string[]>([]);
    const [customNote, setCustomNote] = useState("");
    const PRESETS = ["No Spicy", "Less Oil", "Extra Spicy", "Well Done", "No Sugar", "Less Salt"];
    const toggleNote = (n: string) => { setNotes(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]); };
    const handleConfirm = () => { onConfirm(selectedVariant, [...notes, customNote].filter(Boolean).join(", ")); };
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-[2rem] shadow-2xl p-6 w-full max-w-md border border-white/20 max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-6"><div><h3 className="text-2xl font-black text-slate-900 leading-none">{item.name}</h3><p className="text-xs font-bold text-slate-400 uppercase mt-1 tracking-wider">Customization</p></div><button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"><X className="w-5 h-5" /></button></div>
                {item.variants && item.variants.length > 0 && (<div className="mb-6"><label className="text-[10px] font-black text-slate-400 uppercase mb-3 block tracking-wide">Select Variation</label><div className="space-y-2">{item.variants.map((variant, i) => (<button key={i} onClick={() => setSelectedVariant(variant)} className={`w-full flex justify-between items-center p-4 rounded-xl border-2 transition-all ${selectedVariant?.name === variant.name ? 'border-slate-900 bg-slate-50 shadow-md ring-1 ring-slate-900/5' : 'border-slate-100 bg-white hover:border-slate-200'}`}><span className={`font-bold ${selectedVariant?.name === variant.name ? 'text-slate-900' : 'text-slate-500'}`}>{variant.name}</span><span className="font-black text-slate-900">{formatRs(Number(variant.price))}</span></button>))}</div></div>)}
                <div className="mb-6"><label className="text-[10px] font-black text-slate-400 uppercase mb-3 flex items-center gap-1 tracking-wide"><MessageSquare className="w-3 h-3" /> Special Instructions</label><div className="flex flex-wrap gap-2 mb-3">{PRESETS.map(preset => (<button key={preset} onClick={() => toggleNote(preset)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${notes.includes(preset) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>{preset}</button>))}</div><input value={customNote} onChange={(e) => setCustomNote(e.target.value)} placeholder="Type custom note..." className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-sm font-bold outline-none focus:border-slate-900 focus:bg-white transition-all" /></div>
                <button onClick={handleConfirm} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-lg shadow-xl shadow-slate-900/20 active:scale-95 transition-transform flex items-center justify-center gap-2 hover:bg-emerald-600">Add to Order <span className="opacity-60 font-medium text-sm">| {formatRs(Number(selectedVariant?.price || item.price))}</span></button>
            </motion.div>
        </motion.div>
    )
}

function CategoryPill({ label, isActive, onClick }: any) {
    let Icon = Utensils;
    if (label.includes("Drink") || label.includes("Bar")) Icon = Beer;
    if (label.includes("Coffee") || label.includes("Tea")) Icon = Coffee;
    if (label.includes("Dessert") || label.includes("Sweet")) Icon = IceCream;
    return (
        <button onClick={onClick} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-sm ${isActive ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 scale-105' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}><Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} /> {label}</button>
    )
}

export default function POSPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tableId = searchParams.get("table");
    const orderId = searchParams.get("orderId"); // New: Detect Modify Mode
    const orderType = searchParams.get("type");
    const isTakeaway = orderType === "takeaway";

    const [menu, setMenu] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [activeCategory, setActiveCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalItem, setModalItem] = useState<MenuItem | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                const [menuRes, statsRes] = await Promise.all([getPOSMenu(), getPOSStats()]);
                
                // 1. Load Menu
                if (menuRes && menuRes.items.length > 0) {
                    setMenu(menuRes.items);
                    let cats: string[] = [];
                    if (menuRes.categories && menuRes.categories.length > 0) cats = menuRes.categories.map((c: any) => c.name);
                    else cats = Array.from(new Set(menuRes.items.map((i: any) => i.category))).filter(Boolean) as string[];
                    setCategories(cats);
                }
                
                // 2. Load Stats & Check for Order Edit
                if (statsRes.success && statsRes.stats) {
                    setStats(statsRes.stats);
                    
                    // --- MODIFY ORDER LOGIC ---
                    if (orderId && statsRes.stats.orders_list) {
                        const existingOrder = statsRes.stats.orders_list.find((o: any) => o.id === orderId);
                        if (existingOrder) {
                            if (['cooking', 'ready', 'served', 'paid', 'completed'].includes(existingOrder.status)) {
                                toast.error("Cannot modify! Order is already processing.");
                                router.push('/staff/waiter/orders'); 
                                return;
                            }
                            
                            // Map existing items to Cart structure
                            const prefilledCart = existingOrder.items.map((orderItem: any) => {
                                // Try to find original item for extra details (category, etc)
                                const originalMenuItem = menuRes.items.find((m: any) => m.name === orderItem.name);
                                return {
                                    id: orderItem.id, 
                                    name: orderItem.name,
                                    price: orderItem.price,
                                    qty: orderItem.qty,
                                    cartId: `${orderItem.id}-${Date.now()}-${Math.random()}`, 
                                    category: originalMenuItem?.category || "Unknown",
                                    description: originalMenuItem?.description || "",
                                    variantName: orderItem.variant,
                                    note: orderItem.note
                                };
                            });
                            
                            setCart(prefilledCart);
                            setIsEditMode(true);
                            toast.info(`Editing Order #${orderId}`);
                        }
                    }
                }
            } catch (e) { toast.error("Connection Error"); } finally { setLoading(false); }
        }
        load();
    }, [orderId]); // Re-run if orderId changes

    const addToCart = (item: MenuItem, variant: Variant | undefined, note: string) => {
        setCart(prev => {
            const variantName = variant ? variant.name : "";
            const cartId = variant ? `${item.id}-${variant.name}-${note}` : `${item.id}-${note}`;
            const price = variant ? Number(variant.price) : item.price;
            const name = variant ? `${item.name} (${variant.name})` : item.name;
            const existing = prev.find(i => i.cartId === cartId);
            if(existing) return prev.map(i => i.cartId === cartId ? { ...i, qty: i.qty + 1 } : i);
            return [...prev, { ...item, cartId, name, price, qty: 1, variantName, note }];
        });
        setModalItem(null);
        toast.success(`Added ${item.name}`, { position: 'bottom-center' });
    };

    const updateQty = (cartId: string, delta: number) => {
        setCart(prev => prev.map(i => {
            if (i.cartId === cartId) return { ...i, qty: Math.max(0, i.qty + delta) };
            return i;
        }).filter(i => i.qty > 0));
    };

    const handleCheckout = async () => {
        if(cart.length === 0) return toast.error("Cart is empty");
        if(!tableId && !isTakeaway) return toast.error("No Table Selected"); 
        
        setIsSubmitting(true);
        try {
            const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
            
            let result;
            if (isEditMode && orderId) {
                // CALL MODIFY
                result = await modifyOrder(orderId, cart, cartTotal);
            } else {
                // CALL CREATE
                const targetTable = isTakeaway ? `TAKEAWAY-${Date.now().toString().slice(-4)}` : tableId!;
                result = await submitOrder(targetTable, cart, cartTotal);
            }

            if (result.success) {
                toast.success(isEditMode ? "Order Updated!" : (isTakeaway ? "Takeaway Placed!" : `Table ${tableId} Occupied!`));
                router.push("/staff/waiter/orders"); 
            } else {
                toast.error((result as any).msg || "Action Failed");
            }
        } catch (e) { toast.error("System Error"); } finally { setIsSubmitting(false); }
    };

    const filteredMenu = menu.filter(item => {
        const matchesCat = activeCategory === "All" || item.category === activeCategory;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCat && matchesSearch;
    });

    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

    // --- STATUS CHECKER ---
    let tableStatus = "available";
    if (!isTakeaway && stats?.tables && tableId) {
        const found = stats.tables.find((t: any) => t.label === tableId);
        if (found && found.status === 'occupied') tableStatus = 'occupied';
    }

    if (loading) return <div className="flex h-screen items-center justify-center bg-[#F8FAFC]"><Loader2 className="w-10 h-10 text-emerald-600 animate-spin" /></div>;
    if (!tableId && !isTakeaway) return <div className="flex h-screen items-center justify-center flex-col gap-4 text-slate-400"><AlertCircle className="w-10 h-10 text-red-500" /> <span className="font-bold">No Table Selected. Please go back.</span></div>;

    return (
        <div className="flex flex-col lg:flex-row h-screen bg-[#F8FAFC] overflow-hidden font-sans text-slate-900">
            <AnimatePresence>{modalItem && (<ItemDetailModal item={modalItem} onClose={() => setModalItem(null)} onConfirm={(v, n) => addToCart(modalItem, v, n)} />)}</AnimatePresence>
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                <header className="px-6 py-4 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 z-20 sticky top-0"><div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-4"><div className="flex items-center gap-4"><button onClick={() => router.back()} className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors shadow-sm"><ArrowLeft className="w-5 h-5" /></button><div><h1 className="text-xl font-black text-slate-900 leading-none">Menu</h1><p className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-1">{isEditMode ? <span className="text-orange-600 bg-orange-100 px-2 py-0.5 rounded border border-orange-200">Editing #{orderId}</span> : <>Ordering for <span className={`px-2 py-0.5 rounded-md border ${isTakeaway ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>{isTakeaway ? "Takeaway" : `Table ${tableId}`}</span></>}</p></div></div>{stats && (<div className="flex gap-3 overflow-x-auto no-scrollbar pb-1"><StatsWidget icon={LayoutGrid} label="Vacant" value={stats.vacantCount} subLabel={`/ ${stats.totalTables}`} color="bg-emerald-100 text-emerald-600" delay={0.1} /><StatsWidget icon={Users} label="Occupied" value={stats.occupiedCount} subLabel={`${stats.occupancyRate}%`} color="bg-orange-100 text-orange-600" delay={0.2} /><StatsWidget icon={ClipboardList} label="Orders" value={stats.totalOrders} subLabel="Today" color="bg-blue-100 text-blue-600" delay={0.3} /><StatsWidget icon={DollarSign} label="Revenue" value={formatRs(stats.totalRevenue)} color="bg-purple-100 text-purple-600" delay={0.4} /></div>)}</div><div className="flex flex-col md:flex-row gap-4 items-center"><div className="relative w-full md:w-64 group"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" /><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search dishes..." className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-emerald-100 transition-all shadow-inner" /></div><div className="flex-1 w-full overflow-x-auto no-scrollbar flex items-center gap-3"><CategoryPill label="All" isActive={activeCategory === 'All'} onClick={() => setActiveCategory('All')} icon={ChefHat} />{categories.map(cat => (<CategoryPill key={cat} label={cat} isActive={activeCategory === cat} onClick={() => setActiveCategory(cat)} />))}</div></div></header>
                <div className="flex-1 overflow-y-auto px-6 pb-24 pt-4 custom-scrollbar">{filteredMenu.length === 0 ? <div className="h-64 flex flex-col items-center justify-center text-slate-400 opacity-60"><SearchX className="w-16 h-16 mb-4 text-slate-300" /><p className="font-bold text-lg">No dishes found</p></div> : <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-10"><AnimatePresence mode="popLayout">{filteredMenu.map(item => (<MenuCard key={item.id} item={item} onAdd={() => setModalItem(item)} />))}</AnimatePresence></div>}</div>
            </div>
            <div className="lg:w-[400px] w-full bg-white z-30 shadow-2xl flex flex-col h-[45vh] lg:h-full border-t lg:border-t-0 lg:border-l border-slate-100 absolute bottom-0 lg:static rounded-t-[2.5rem] lg:rounded-none"><div className="p-6 pb-4 flex justify-between items-center border-b border-slate-100 bg-white/50 backdrop-blur-sm rounded-t-[2.5rem]"><div><h2 className="text-lg font-black flex items-center gap-2 text-slate-900"><ShoppingBag className="w-5 h-5 text-emerald-600" /> Current Order</h2>
            {isTakeaway ? (
                <div className="flex items-center gap-2 mt-1"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span></span><p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Takeaway • <span className="text-orange-500">New</span></p></div>
            ) : (
                <div className="flex items-center gap-2 mt-1">{tableStatus === 'occupied' ? (<><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span></span><p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Table {tableId} • <span className="text-orange-500">Occupied</span></p></>) : (<><span className="relative flex h-2 w-2"><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span><p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Table {tableId} • <span className="text-emerald-500">Available</span></p></>)}</div>
            )}
            </div><span className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg shadow-slate-900/20">{cart.length} Items</span></div><div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 custom-scrollbar bg-[#FAFAFA]">{cart.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4"><div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center border-2 border-dashed border-slate-200"><Coffee className="w-8 h-8 opacity-20" /></div><p className="font-bold text-sm">Add items to start order</p></div> : <AnimatePresence>{cart.map((item) => (<motion.div layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} key={item.cartId} className="flex flex-col bg-white p-3 rounded-2xl border border-slate-100 shadow-sm"><div className="flex items-center gap-4"><div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-100">{item.name.substring(0,2).toUpperCase()}</div><div className="flex-1 min-w-0"><h4 className="font-bold text-slate-900 text-sm truncate">{item.name}</h4><p className="text-xs text-emerald-600 font-black">{formatRs(item.price)}</p></div><div className="flex items-center bg-slate-100 rounded-xl p-1 shadow-inner"><button onClick={() => updateQty(item.cartId, -1)} className="w-7 h-7 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-600 hover:text-red-500 active:scale-90 transition-all"><Minus className="w-3 h-3" /></button><span className="w-8 text-center font-bold text-sm text-slate-700">{item.qty}</span><button onClick={() => updateQty(item.cartId, 1)} className="w-7 h-7 flex items-center justify-center bg-slate-900 text-white rounded-lg shadow-sm hover:bg-slate-800 active:scale-90 transition-all"><Plus className="w-3 h-3" /></button></div></div>{(item.note || item.variantName) && <div className="mt-2 flex flex-wrap gap-2 pl-[3.5rem]">{item.variantName && <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">{item.variantName}</span>}{item.note && <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md flex items-center gap-1 border border-orange-100"><MessageSquare className="w-2.5 h-2.5" /> {item.note}</span>}</div>}</motion.div>))}</AnimatePresence>}</div><div className="p-6 bg-white border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20"><div className="space-y-3 mb-6"><div className="flex justify-between text-xs font-bold text-slate-400"><span>Subtotal</span><span>{formatRs(cartTotal)}</span></div><div className="flex justify-between text-xl font-black text-slate-900 mt-2 pt-3 border-t border-dashed border-slate-200"><span>Total</span><span>{formatRs(cartTotal)}</span></div></div><div className="grid grid-cols-4 gap-3"><button className="col-span-1 py-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all active:scale-95" onClick={() => setCart([])}><Trash2 className="w-5 h-5" /></button><button onClick={handleCheckout} disabled={isSubmitting || cart.length === 0} className={`col-span-3 py-4 text-white rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${isEditMode ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20' : 'bg-slate-900 hover:bg-emerald-600 shadow-slate-900/20'}`}>{isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : isEditMode ? <><Edit className="w-4 h-4" /> Update Order</> : <><Send className="w-4 h-4" /> Place Order</>}</button></div></div></div></div>
    );
}