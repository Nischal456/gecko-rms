"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/app/staff/manager/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Plus, Minus, Package, Wine, Cigarette, Droplets, Link2, Zap,
  Loader2, X, Save, ArrowDownRight
} from "lucide-react";
import { toast } from "sonner";
import { getDashboardData } from "@/app/actions/dashboard";
// IMPORTANT: We use inventory actions, but they are designed to work in tandem with pos.ts
import { getInventory, updateStock, addInventoryItem } from "@/app/actions/inventory";

// --- TYPES ---
interface InventoryItem {
    id: string;
    name: string;
    category: 'drinks' | 'tobacco' | 'alcohol' | 'packaged';
    stock: number;
    max_stock: number;
    unit: string;
    linked_menu_item?: string; 
    price: number;
}

export default function ManagerInventoryPage() {
  const [tenant, setTenant] = useState<any>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  
  // MODAL STATE
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    // 1. Load Dashboard & Inventory
    const [dashRes, invRes] = await Promise.all([getDashboardData(), getInventory()]);
    
    if(dashRes) setTenant(dashRes.tenant);
    
    // 2. Hydrate Inventory Table
    if(invRes.success && Array.isArray(invRes.data)) {
        setItems(invRes.data as unknown as InventoryItem[]);
    }
    setLoading(false);
  }

  // --- ACTIONS ---
  
  // 1. Quick Stock Adjustment
  async function handleStockChange(id: string, amount: number) {
      // Optimistic UI Update (Instant Feedback)
      const oldItems = [...items];
      setItems(prev => prev.map(item => 
          item.id === id ? { ...item, stock: Math.max(0, item.stock + amount) } : item
      ));

      // Server Sync
      const res = await updateStock(id, amount, "manual_manager");
      if (!res.success) {
          toast.error("Update failed");
          setItems(oldItems); // Revert on failure
      }
  }

  // 2. Add New Item
  async function handleCreateItem(e: React.FormEvent) {
      e.preventDefault();
      setIsSubmitting(true);
      const form = e.target as HTMLFormElement;
      
      const data = {
          name: (form.elements.namedItem('name') as HTMLInputElement).value,
          category: (form.elements.namedItem('category') as HTMLInputElement).value,
          stock: Number((form.elements.namedItem('stock') as HTMLInputElement).value),
          max_stock: Number((form.elements.namedItem('max_stock') as HTMLInputElement).value),
          price: Number((form.elements.namedItem('price') as HTMLInputElement).value),
          unit: (form.elements.namedItem('unit') as HTMLInputElement).value,
          linked_menu_item: (form.elements.namedItem('linked_menu_item') as HTMLInputElement).value
      };

      const res = await addInventoryItem(data);
      
      if (res.success) {
          toast.success("Item Added Successfully");
          setIsModalOpen(false);
          loadData(); // Refresh list to show new item
      } else {
          toast.error(res.error || "Failed to add item");
      }
      setIsSubmitting(false);
  }

  // --- HELPERS ---
  const getCategoryIcon = (cat: string) => {
      switch(cat) {
          case 'drinks': return <Droplets className="w-4 h-4 text-blue-500" />;
          case 'tobacco': return <Cigarette className="w-4 h-4 text-orange-500" />;
          case 'alcohol': return <Wine className="w-4 h-4 text-purple-500" />;
          default: return <Package className="w-4 h-4 text-slate-500" />;
      }
  };

  const getStockStatus = (current: number, max: number) => {
      const pct = max > 0 ? (current / max) * 100 : 0;
      if (pct <= 15) return { text: 'Critical', bg: 'bg-red-50 text-red-600 border-red-100' };
      if (pct <= 40) return { text: 'Low', bg: 'bg-amber-50 text-amber-600 border-amber-100' };
      return { text: 'Good', bg: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
  };

  const filteredItems = items.filter(i => {
      const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = activeCategory === 'all' || i.category === activeCategory;
      return matchSearch && matchCat;
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]"><Loader2 className="w-10 h-10 text-emerald-500 animate-spin" /></div>;

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900 selection:bg-emerald-500 selection:text-white overflow-hidden">
      <Sidebar tenantName={tenant?.name} tenantCode={tenant?.code} logo={tenant?.logo_url} />
      
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* HEADER */}
        <header className="flex-shrink-0 px-8 py-6 bg-white border-b border-slate-100 flex justify-between items-center gap-4">
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Stock Vault</h1>
                <p className="text-sm font-bold text-slate-400 mt-1 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500 fill-amber-500" /> Live Inventory
                </p>
            </div>
            
            <div className="flex gap-3 items-center">
                <div className="flex-1 w-64 relative group hidden md:block">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
                </div>
                
                <button onClick={() => setIsModalOpen(true)} className="h-12 px-6 bg-slate-900 text-white rounded-2xl font-bold shadow-xl shadow-slate-900/10 hover:scale-105 transition-all flex items-center gap-2 active:scale-95">
                    <Plus className="w-5 h-5" /> Add Stock
                </button>
            </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
            {/* INVENTORY GRID */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="flex gap-2 mb-8 overflow-x-auto no-scrollbar">
                    {['all', 'drinks', 'alcohol', 'tobacco', 'packaged'].map(cat => (
                        <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${activeCategory === cat ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}>{cat}</button>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
                    <AnimatePresence mode="popLayout">
                        {filteredItems.map((item) => {
                            const status = getStockStatus(item.stock, item.max_stock);
                            return (
                                <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} key={item.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                                    {/* Liquid Effect */}
                                    {(item.category === 'drinks' || item.category === 'alcohol') && (
                                        <div className="absolute bottom-0 left-0 right-0 bg-blue-50/50 transition-all duration-1000 ease-out z-0" style={{ height: `${Math.min(100, (item.stock / item.max_stock) * 100)}%` }} />
                                    )}
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm">{getCategoryIcon(item.category)}</div>
                                                <div><h3 className="font-black text-slate-900 text-lg leading-tight">{item.name}</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.category}</p></div>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${status.bg}`}>{status.text}</span>
                                        </div>
                                        <div className="flex items-end gap-2 mb-4"><span className="text-4xl font-black text-slate-900 tracking-tighter">{item.stock}</span><span className="text-xs font-bold text-slate-400 mb-1.5">/ {item.max_stock} {item.unit}s</span></div>
                                        
                                        {/* Link Indicator */}
                                        {item.linked_menu_item && (<div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50/80 w-fit px-2 py-1 rounded-lg mb-4 backdrop-blur-sm border border-emerald-100"><Link2 className="w-3 h-3" /> Linked: "{item.linked_menu_item}"</div>)}
                                        
                                        <div className="flex gap-2 border-t border-slate-100/50 pt-4 mt-2">
                                            <button onClick={() => handleStockChange(item.id, -1)} className="flex-1 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"><Minus className="w-4 h-4" /></button>
                                            <button onClick={() => handleStockChange(item.id, 1)} className="flex-1 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20 active:scale-95"><Plus className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            </div>
        </div>

        {/* --- ADD ITEM MODAL --- */}
        <AnimatePresence>
            {isModalOpen && (
                <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" />
                    <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed inset-0 m-auto w-full max-w-lg h-fit bg-white rounded-[2.5rem] shadow-2xl z-50 p-8 border border-slate-100">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-slate-900">Add New Stock</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        
                        <form onSubmit={handleCreateItem} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Item Name</label>
                                <input name="name" required placeholder="e.g. Coca Cola Zero" className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 transition-all" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Category</label>
                                    <select name="category" className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500">
                                        <option value="drinks">Drinks</option>
                                        <option value="tobacco">Tobacco</option>
                                        <option value="alcohol">Alcohol</option>
                                        <option value="packaged">Packaged Food</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Unit</label>
                                    <input name="unit" placeholder="e.g. can" defaultValue="pc" className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 transition-all" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Current Stock</label>
                                    <input name="stock" type="number" required placeholder="0" className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 transition-all" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Max Capacity</label>
                                    <input name="max_stock" type="number" required placeholder="100" className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 transition-all" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Cost Price (Rs)</label>
                                    <input name="price" type="number" required placeholder="0" className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 transition-all" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-emerald-600 ml-1 mb-1 block">Link to Menu Item</label>
                                    <input name="linked_menu_item" placeholder="Menu Item Name" className="w-full h-12 px-4 bg-emerald-50/50 border border-emerald-200 rounded-xl font-bold text-emerald-800 outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-emerald-800/30" />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 h-14 rounded-xl border border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition-colors">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 h-14 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2">
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Inventory"}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>

      </main>
    </div>
  );
}