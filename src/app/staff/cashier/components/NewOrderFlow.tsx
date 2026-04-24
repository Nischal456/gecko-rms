"use client";

import { useState, useEffect, useMemo } from "react";
import {
    Search, ChevronRight, Minus, Plus, ShoppingBag, Utensils, X, ChefHat,
    StickyNote, Layers, Filter, ChevronDown, ChevronUp, Coffee, Beer, IceCream,
    MapPin, CheckCircle2, Clock, Circle, Square, ArrowLeft, ArrowRight,
    Trash2, Send, MessageSquare, Lock, Store, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// --- HELPERS ---
const formatRs = (amount: number) => "Rs " + new Intl.NumberFormat('en-NP', { maximumFractionDigits: 0 }).format(amount);

// --- 1. ITEM DETAIL MODAL (PREMIUM GLASS) ---
function ItemDetailModal({ item, onClose, onConfirm }: any) {
    const variants = useMemo(() => {
        if (!item.variants) return [];
        if (Array.isArray(item.variants)) return item.variants;
        if (typeof item.variants === 'string') { try { return JSON.parse(item.variants); } catch { return []; } }
        return [];
    }, [item]);

    const [selectedVariant, setSelectedVariant] = useState<any>(variants.length > 0 ? variants[0] : null);
    const [customNote, setCustomNote] = useState("");

    const handleConfirm = () => { onConfirm(selectedVariant, customNote); };
    const currentPrice = selectedVariant ? Number(selectedVariant.price) : item.price;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] flex items-end md:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" onClick={onClose}>
            <motion.div initial={{ scale: 0.95, y: 100 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 100 }} className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-white/20 relative" onClick={e => e.stopPropagation()}>
                <div className="relative h-48 bg-slate-100 flex items-center justify-center shrink-0">
                    {item.image_url ? <img src={item.image_url} className="w-full h-full object-cover" /> : <Utensils className="w-16 h-16 text-slate-300" />}
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-xl rounded-full text-slate-500 hover:text-slate-900 transition-colors shadow-sm"><X className="w-5 h-5" /></button>
                    <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
                </div>

                <div className="px-8 flex-1 overflow-y-auto custom-scrollbar -mt-12 relative z-10">
                    <div className="mb-8">
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-lg mb-2 inline-block">{item.category}</span>
                        <h3 className="text-3xl font-black text-slate-900 leading-tight mb-2">{item.name}</h3>
                        <p className="text-emerald-600 font-black text-2xl">{formatRs(currentPrice)}</p>
                    </div>

                    {variants.length > 0 && (
                        <div className="mb-8">
                            <label className="text-xs font-black text-slate-400 uppercase mb-4 block tracking-widest">Select Variant</label>
                            <div className="grid grid-cols-1 gap-3">
                                {variants.map((v: any, i: number) => (
                                    <button key={i} onClick={() => setSelectedVariant(v)} className={`flex justify-between items-center p-4 rounded-2xl border-2 transition-all ${selectedVariant?.name === v.name ? 'border-emerald-500 bg-emerald-50/50 shadow-md scale-[1.02]' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                                        <span className={`font-bold text-sm ${selectedVariant?.name === v.name ? 'text-emerald-900' : 'text-slate-600'}`}>{v.name}</span>
                                        <span className="font-black text-slate-900 text-sm">{formatRs(Number(v.price))}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mb-8">
                        <label className="text-xs font-black text-slate-400 uppercase mb-4 flex items-center gap-2 tracking-widest"><MessageSquare className="w-3 h-3" /> Kitchen Note</label>
                        <textarea value={customNote} onChange={(e) => setCustomNote(e.target.value)} placeholder="Allergies, spice level, etc..." className="w-full h-28 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-slate-900 focus:bg-white transition-all resize-none placeholder:font-normal placeholder:text-slate-400" />
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-white shrink-0 z-20">
                    <button onClick={handleConfirm} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center gap-3 hover:bg-emerald-600">
                        <span>Add Item</span>
                        <div className="w-1 h-1 bg-white/30 rounded-full" />
                        <span>{formatRs(currentPrice)}</span>
                    </button>
                </div>
            </motion.div>
        </motion.div>
    )
}

// --- 2. TABLE SELECTOR (GRID) ---
export function TableSelector({ tables, onSelectTable, onBack }: any) {
    const [section, setSection] = useState("All");
    const [status, setStatus] = useState("All");
    const [search, setSearch] = useState("");

    const sections = Array.from(new Set(tables.map((t: any) => t.section || "Main Hall"))).sort();
    const countFree = tables.filter((t: any) => t.status !== 'occupied' && t.status !== 'served').length;
    const countOccupied = tables.filter((t: any) => t.status === 'occupied' || t.status === 'served').length;

    const filtered = tables.filter((t: any) => {
        const matchesSearch = t.label.toLowerCase().includes(search.toLowerCase());
        const matchesSection = section === "All" || (t.section || "Main Hall") === section;
        const isOccupied = t.status === 'occupied' || t.status === 'served';
        const matchesStatus = status === "All" ? true : status === "Free" ? !isOccupied : isOccupied;
        return matchesSearch && matchesSection && matchesStatus;
    });

    return (
        <div className="flex flex-col h-full bg-[#F8FAFC]">
            <div className="px-6 py-5 bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-20 flex flex-col gap-5 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 shadow-sm"><ArrowLeft className="w-5 h-5" /></button>
                        <div><h1 className="text-2xl font-black text-slate-900 tracking-tight">Select Table</h1><p className="text-xs font-bold text-slate-400">Where are the guests sitting?</p></div>
                    </div>
                    <div className="relative w-full md:w-72 group">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Find table..." className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-100 transition-all" />
                    </div>
                </div>
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center w-full">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar w-full md:w-auto pb-1">
                        <button onClick={() => setSection("All")} className={`px-5 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${section === 'All' ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>All Zones</button>
                        {sections.map((s: any) => <button key={s} onClick={() => setSection(s)} className={`px-5 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${section === s ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>{s}</button>)}
                    </div>
                    <div className="flex gap-2 shrink-0 overflow-x-auto no-scrollbar w-full md:w-auto pb-1">
                        <button onClick={() => setStatus('All')} className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 ${status === 'All' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}>All <span className="opacity-50">{tables.length}</span></button>
                        <button onClick={() => setStatus('Free')} className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 ${status === 'Free' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-white text-slate-500 border-slate-200'}`}><span className="w-2 h-2 rounded-full bg-emerald-500" /> Vacant <span className="opacity-50">{countFree}</span></button>
                        <button onClick={() => setStatus('Occupied')} className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 ${status === 'Occupied' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-white text-slate-500 border-slate-200'}`}><span className="w-2 h-2 rounded-full bg-orange-500" /> Occupied <span className="opacity-50">{countOccupied}</span></button>
                    </div>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {filtered.length === 0 ? <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50"><MapPin className="w-12 h-12 mb-2 opacity-30" /><p className="font-bold">No tables found</p></div> :
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                        <AnimatePresence mode="popLayout">{filtered.map((t: any) => {
                            const isOccupied = t.status === 'occupied' || t.status === 'served';
                            const statusText = isOccupied ? 'Occupied' : 'Vacant';
                            const StatusIcon = isOccupied ? Clock : CheckCircle2;
                            return (
                                <motion.button key={t.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)" }} whileTap={{ scale: 0.98 }} onClick={() => onSelectTable(t.label)} className={`relative flex flex-col p-5 rounded-[1.8rem] border-2 transition-all duration-300 text-left group min-h-[160px] justify-between ${isOccupied ? 'border-orange-200 bg-orange-50/50' : 'border-emerald-200 bg-white hover:border-emerald-400'}`}>
                                    <div className="flex justify-between items-start w-full gap-2"><div className={`h-11 min-w-[3.5rem] px-2 rounded-2xl flex-shrink-0 flex items-center justify-center border shadow-sm ${isOccupied ? 'bg-white border-orange-100 text-orange-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}><span className="font-black text-lg whitespace-nowrap">{t.label}</span></div><div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${isOccupied ? 'bg-white/80 border-orange-200 text-orange-600' : 'bg-emerald-100/50 border-emerald-200 text-emerald-700'}`}><StatusIcon className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{statusText}</span></div></div>
                                    <div className="mt-4 mb-2"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><MapPin className="w-3 h-3" /> {t.section || "Main Hall"}</p></div>
                                    <div className="flex items-end justify-between w-full gap-2 border-t border-slate-200/50 pt-3"><div className={`flex items-center gap-1.5 font-bold text-xs ${isOccupied ? 'text-orange-700' : 'text-slate-700'}`}>{t.shape === 'round' ? <Circle className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />} <span>{t.seats || 4} Seats</span></div><div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center transition-colors ${isOccupied ? 'bg-orange-200 text-orange-700' : 'bg-slate-100 text-slate-400 group-hover:bg-emerald-500 group-hover:text-white'}`}><ArrowRight className="w-4 h-4" /></div></div>
                                </motion.button>
                            )
                        })}</AnimatePresence>
                    </div>}
            </div>
        </div>
    )
}

// --- 3. NEW ORDER SELECTION ---
export function NewOrderSelection({ onSelect }: { onSelect: (type: 'dine_in' | 'takeaway') => void }) {
    return (
        <div className="h-full flex items-center justify-center p-6 bg-[#F8FAFC]">
            <div className="max-w-4xl w-full">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10"><h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">New Order</h1><p className="text-slate-500 text-lg font-medium">Choose service type to begin</p></motion.div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    <motion.button whileHover={{ scale: 1.02, y: -5 }} whileTap={{ scale: 0.98 }} onClick={() => onSelect('dine_in')} className="group relative bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl hover:shadow-2xl hover:shadow-emerald-500/20 border-2 border-slate-100 hover:border-emerald-500 transition-all duration-300 text-left overflow-hidden"><div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Store className="w-64 h-64 text-emerald-900" /></div><div className="relative z-10"><div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mb-8 group-hover:bg-emerald-500 transition-colors duration-300"><Utensils className="w-10 h-10 text-emerald-600 group-hover:text-white transition-colors" /></div><h2 className="text-3xl font-black text-slate-900 mb-2">Dine-In</h2><p className="text-slate-500 font-medium mb-8">Table service.</p><div className="flex items-center gap-2 text-emerald-600 font-bold text-sm uppercase tracking-wider group-hover:gap-4 transition-all">Select Table <ArrowRight className="w-5 h-5" /></div></div></motion.button>
                    <motion.button whileHover={{ scale: 1.02, y: -5 }} whileTap={{ scale: 0.98 }} onClick={() => onSelect('takeaway')} className="group relative bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl hover:shadow-2xl hover:shadow-orange-500/20 border-2 border-slate-100 hover:border-orange-500 transition-all duration-300 text-left overflow-hidden"><div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><ShoppingBag className="w-64 h-64 text-orange-900" /></div><div className="relative z-10"><div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center mb-8 group-hover:bg-orange-500 transition-colors duration-300"><ChefHat className="w-10 h-10 text-orange-600 group-hover:text-white transition-colors" /></div><h2 className="text-3xl font-black text-slate-900 mb-2">Takeaway</h2><p className="text-slate-500 font-medium mb-8">Counter order.</p><div className="flex items-center gap-2 text-orange-600 font-bold text-sm uppercase tracking-wider group-hover:gap-4 transition-all">Open POS <ArrowRight className="w-5 h-5" /></div></div></motion.button>
                </div>
            </div>
        </div>
    )
}

// --- 4. CASHIER POS ---
function CategoryPill({ label, isActive, onClick }: any) {
    let Icon = Utensils;
    if (label.includes("Drink") || label.includes("Bar")) Icon = Beer;
    if (label.includes("Coffee") || label.includes("Tea")) Icon = Coffee;
    if (label.includes("Dessert") || label.includes("Sweet")) Icon = IceCream;
    return (
        <button onClick={onClick} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-sm ${isActive ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 scale-105' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}><Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} /> {label}</button>
    )
}

export function CashierPOS({ data, onClose, onSubmit, preSelectedTable, orderType, existingOrder }: any) {
    const [cart, setCart] = useState<any[]>([]);
    const [category, setCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [modalItem, setModalItem] = useState<any | null>(null);
    const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initial Load for Editing (Locked Items)
    useEffect(() => {
        if (existingOrder && existingOrder.items) {
            const loadedItems = existingOrder.items.map((item: any) => ({
                ...item,
                isExisting: true // Locked flag
            }));
            setCart(loadedItems);
        }
    }, [existingOrder]);

    const menuItems = data.menu || [];
    const categories = data.categories || [];
    const filteredItems = menuItems.filter((m: any) => {
        const matchesCat = category === "All" || m.category === category;
        const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCat && matchesSearch;
    });

    const cartTotal = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
    const newItemsCount = cart.filter(i => !i.isExisting).length; // Only count NEW items

    const handleItemClick = (item: any) => {
        let v = item.variants;
        if (typeof v === 'string') { try { v = JSON.parse(v) } catch (e) { v = [] } }
        setModalItem({ ...item, variants: v });
    };

    const handleAddToCart = (variant: any | null, note: string) => {
        const item = modalItem;
        if (!item) return;
        setCart(prev => {
            const variantName = variant ? variant.name : "";
            const cartId = variant ? `${item.id}-${variant.name}-${note}` : `${item.id}-${note}`;
            const price = variant ? Number(variant.price) : item.price;
            const name = variant ? `${item.name} (${variant.name})` : item.name;

            // Only merge if not existing locked item
            const existing = prev.find((i: any) => i.cartId === cartId && !i.isExisting);
            if (existing) return prev.map((i: any) => i.cartId === cartId ? { ...i, qty: i.qty + 1 } : i);
            return [...prev, { ...item, cartId, name, price, qty: 1, variantName, note }];
        });
        setModalItem(null);
        toast.success(`Added ${item.name}`);
    };

    const updateQty = (cartId: string, delta: number) => {
        setCart(prev => prev.map((i: any) => {
            if (i.cartId === cartId && !i.isExisting) return { ...i, qty: Math.max(0, i.qty + delta) };
            return i;
        }).filter((i: any) => i.qty > 0));
    };

    const removeFromCart = (id: string) => setCart(cart.filter(c => c.cartId !== id));

    const handleSubmit = async () => {
        if (newItemsCount === 0) return toast.error("Add new items first");
        if (isSubmitting) return;

        if (!navigator.onLine) {
            toast.error("Network Unstable! Please check your internet connection and try again.");
            return;
        }

        setIsSubmitting(true);
        try {
            // Strict format for pos.ts
            const itemsToSubmit = cart.filter(i => !i.isExisting).map(i => ({
                id: i.id,
                name: i.name,
                price: i.price,
                qty: i.qty,
                variantName: i.variantName,
                notes: i.note,
                status: 'pending'
            }));

            await onSubmit(orderType === 'takeaway' ? 'TK' : preSelectedTable, itemsToSubmit, orderType);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Table Status for Header
    const isTableOccupied = data.tables.find((t: any) => t.label === preSelectedTable)?.status === 'occupied';

    return (
        <div className="fixed inset-0 z-[100] bg-[#F8FAFC] flex flex-col lg:flex-row font-sans text-slate-900">
            <AnimatePresence>{modalItem && (<ItemDetailModal item={modalItem} onClose={() => setModalItem(null)} onConfirm={handleAddToCart} />)}</AnimatePresence>

            {/* LEFT: Menu Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                <div className="px-4 md:px-6 py-4 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 z-20 sticky top-0">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3 md:gap-4">
                            <button onClick={onClose} className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors shadow-sm"><ArrowLeft className="w-5 h-5" /></button>
                            <div><h1 className="text-xl font-black text-slate-900 leading-none">Menu</h1><p className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-1">Ordering for: <span className={`px-2 py-0.5 rounded-md border ${orderType === 'takeaway' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>{orderType === 'takeaway' ? "Takeaway" : `Table ${preSelectedTable}`}</span></p></div>
                        </div>
                        {!isTableOccupied && orderType !== 'takeaway' && <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold border border-emerald-100"><CheckCircle2 className="w-3 h-3" /> Table Available</div>}
                        {existingOrder && <div className="px-3 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg text-xs font-bold animate-pulse">Editing Mode</div>}
                    </div>
                    <div className="flex flex-col md:flex-row gap-4 items-center"><div className="relative w-full md:w-64 group"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" /><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search dishes..." className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-emerald-100 transition-all shadow-inner" /></div><div className="flex-1 w-full overflow-x-auto no-scrollbar flex items-center gap-2 pb-1"><CategoryPill label="All" isActive={category === 'All'} onClick={() => setCategory("All")} />{categories.map((c: any) => (<CategoryPill key={c.name} label={c.name} isActive={category === c.name} onClick={() => setCategory(c.name)} />))}</div></div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-32 lg:pb-10 pt-4 custom-scrollbar">
                    {filteredItems.length === 0 ? <div className="h-64 flex flex-col items-center justify-center text-slate-400 opacity-60"><Search className="w-16 h-16 mb-4 text-slate-300" /><p className="font-bold text-lg">No dishes found</p></div> :
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
                            <AnimatePresence mode="popLayout">
                                {filteredItems.map((item: any) => {
                                    let priceDisplay = formatRs(item.price);
                                    let v = item.variants;
                                    if (typeof v === 'string') try { v = JSON.parse(v) } catch { }
                                    const hasVariants = v && Array.isArray(v) && v.length > 0;
                                    if (hasVariants) { const prices = v.map((x: any) => Number(x.price)); priceDisplay = `Rs ${Math.min(...prices)}`; }

                                    return (
                                        <motion.button key={item.id} layout whileHover={{ y: -4, boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} whileTap={{ scale: 0.98 }} onClick={() => handleItemClick(item)} className="flex flex-col bg-white border border-slate-100 rounded-[1.5rem] p-4 shadow-sm transition-all group text-left h-full relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-slate-50 to-transparent rounded-bl-[3rem] -mr-8 -mt-8 transition-colors group-hover:from-emerald-50 pointer-events-none" />
                                            <div className="flex justify-between items-start w-full mb-3 relative z-10"><div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner border border-white/50 bg-slate-50 text-slate-400"><Utensils className="w-5 h-5" /></div><span className="font-black text-slate-900 bg-white/80 backdrop-blur-sm border border-slate-100 px-2.5 py-1 rounded-lg text-xs whitespace-nowrap shadow-sm">{priceDisplay}</span></div>
                                            <h3 className="font-black text-slate-900 text-lg leading-tight mb-1 line-clamp-2 group-hover:text-emerald-700 transition-colors">{item.name}</h3>
                                            <p className="text-[11px] text-slate-400 font-medium line-clamp-2 mb-4 h-8 leading-relaxed">{item.description || "Freshly prepared."}</p>
                                            <div className="mt-auto w-full"><div className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center transition-all shadow-sm gap-2 ${hasVariants ? 'bg-slate-900 text-white group-hover:bg-slate-800' : 'bg-slate-50 text-slate-500 group-hover:bg-emerald-500 group-hover:text-white'}`}>{hasVariants ? <><Layers className="w-3 h-3" /> Select Options</> : <><Plus className="w-3 h-3" /> Add Item</>}</div></div>
                                        </motion.button>
                                    )
                                })}
                            </AnimatePresence>
                        </div>}
                </div>
            </div>

            {/* RIGHT: Cart (Sticky on Mobile) */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 z-40 shadow-[0_-5px_20px_rgba(0,0,0,0.1)]">
                <button onClick={() => setIsMobileCartOpen(!isMobileCartOpen)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex justify-between items-center px-6 shadow-lg active:scale-95 transition-all">
                    <span className="flex items-center gap-2"><ShoppingBag className="w-5 h-5" /> {cart.length} Items</span>
                    <span className="flex items-center gap-2">{formatRs(cartTotal)} {isMobileCartOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}</span>
                </button>
            </div>

            {/* Cart Panel */}
            <motion.div initial={false} animate={{ y: isMobileCartOpen || window.innerWidth >= 1024 ? 0 : '100%' }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="fixed lg:static inset-x-0 bottom-0 z-50 lg:z-auto bg-white lg:w-[400px] w-full shadow-2xl lg:shadow-none flex flex-col h-[85vh] lg:h-full border-t lg:border-t-0 lg:border-l border-slate-100 rounded-t-[2.5rem] lg:rounded-none">
                <div className="p-6 pb-4 flex justify-between items-center border-b border-slate-100 bg-white/50 backdrop-blur-sm rounded-t-[2.5rem]"><div><h2 className="text-lg font-black flex items-center gap-2 text-slate-900"><ShoppingBag className="w-5 h-5 text-emerald-600" /> Current Order</h2><p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-1">{orderType === 'takeaway' ? 'Takeaway' : 'Table ' + preSelectedTable}</p></div><button onClick={() => setIsMobileCartOpen(false)} className="lg:hidden p-2 bg-slate-100 rounded-full"><ChevronDown className="w-5 h-5" /></button></div>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 custom-scrollbar bg-[#FAFAFA]">
                    {cart.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4"><div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center border-2 border-dashed border-slate-200"><ShoppingBag className="w-8 h-8 opacity-20" /></div><p className="font-bold text-sm">Cart is empty</p></div> :
                        <AnimatePresence>{cart.map((item) => (
                            <motion.div layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} key={item.cartId} className={`flex flex-col bg-white p-3 rounded-2xl border ${item.isExisting ? 'border-slate-100 opacity-60 bg-slate-50' : 'border-emerald-100 shadow-sm'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-[10px] font-black border ${item.isExisting ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>{item.isExisting ? <Lock className="w-4 h-4" /> : item.name.substring(0, 2).toUpperCase()}</div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-slate-900 text-sm truncate">{item.name}</h4>
                                        <p className="text-xs text-emerald-600 font-black">{formatRs(item.price)}</p>
                                    </div>
                                    {item.isExisting ? (
                                        <span className="text-[10px] font-bold bg-slate-200 text-slate-500 px-2 py-1 rounded-lg">x{item.qty} SENT</span>
                                    ) : (
                                        <div className="flex items-center bg-slate-100 rounded-xl p-1 shadow-inner">
                                            <button onClick={() => updateQty(item.cartId, -1)} className="w-7 h-7 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-600 hover:text-red-500 active:scale-90 transition-all"><Minus className="w-3 h-3" /></button>
                                            <span className="w-8 text-center font-bold text-sm text-slate-700">{item.qty}</span>
                                            <button onClick={() => updateQty(item.cartId, 1)} className="w-7 h-7 flex items-center justify-center bg-slate-900 text-white rounded-lg shadow-sm hover:bg-slate-800 active:scale-90 transition-all"><Plus className="w-3 h-3" /></button>
                                        </div>
                                    )}
                                </div>
                                {(item.note || item.variantName) && <div className="mt-2 flex flex-wrap gap-2 pl-[3.5rem]">{item.variantName && <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">{item.variantName}</span>}{item.note && <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md flex items-center gap-1 border border-orange-100"><MessageSquare className="w-2.5 h-2.5" /> {item.note}</span>}</div>}
                                {!item.isExisting && <button onClick={() => removeFromCart(item.cartId)} className="absolute top-2 right-2 text-red-300 hover:text-red-500 p-1"><Trash2 className="w-3 h-3" /></button>}
                            </motion.div>
                        ))}</AnimatePresence>}
                </div>

                <div className="p-6 bg-white border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20 pb-8 lg:pb-6">
                    <div className="space-y-3 mb-6"><div className="flex justify-between text-xs font-bold text-slate-400"><span>Subtotal</span><span>{formatRs(cartTotal)}</span></div><div className="flex justify-between text-xl font-black text-slate-900 mt-2 pt-3 border-t border-dashed border-slate-200"><span>Total</span><span>{formatRs(cartTotal)}</span></div></div>
                    <div className="grid grid-cols-4 gap-3">
                        <button className="col-span-1 py-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all active:scale-95" onClick={() => setCart(cart.filter(i => i.isExisting))}><Trash2 className="w-5 h-5" /></button>
                        <button onClick={handleSubmit} disabled={newItemsCount === 0 || isSubmitting} className="col-span-3 py-4 bg-slate-900 hover:bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {isSubmitting ? "Processing..." : (newItemsCount > 0 ? `Send ${newItemsCount} To Kitchen` : "Order New Items")}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}