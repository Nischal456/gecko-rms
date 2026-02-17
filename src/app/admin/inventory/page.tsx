"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/app/admin/Sidebar"; 
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Search, Package, Edit, Trash2, Save, X, Loader2, RefreshCcw, 
  Wine, Cigarette, Droplets, Box, Link2, ArrowDownRight
} from "lucide-react";
import { toast } from "sonner";
import { getInventory, addInventoryItem, updateInventoryItem, deleteInventoryItem, updateStock } from "@/app/actions/inventory"; 
import { getDashboardData } from "@/app/actions/dashboard";

export default function AdminInventoryPage() {
  const [tenant, setTenant] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [dashRes, invRes] = await Promise.all([getDashboardData(), getInventory()]);
    if(dashRes) setTenant(dashRes.tenant);
    if(invRes.success && Array.isArray(invRes.data)) {
        setItems(invRes.data);
    }
    setLoading(false);
  }

  // --- ACTIONS ---
  async function handleSave(e: React.FormEvent) {
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

      let res;
      if(editingItem) {
          res = await updateInventoryItem(editingItem.id, data);
          toast.success("Item Updated");
      } else {
          res = await addInventoryItem(data);
          toast.success("Item Added");
      }

      if(res.success) {
          setIsModalOpen(false);
          loadData();
      } else {
          toast.error("Operation failed");
      }
      setIsSubmitting(false);
  }

  async function handleDelete(id: string) {
      if(confirm("Delete this inventory item?")) {
          await deleteInventoryItem(id);
          loadData();
          toast.success("Item Deleted");
      }
  }

  async function handleQuickAdjust(id: string, delta: number) {
      // Optimistic update
      setItems(prev => prev.map(i => i.id === id ? { ...i, stock: Math.max(0, i.stock + delta) } : i));
      const res = await updateStock(id, delta, "admin_quick_adjust");
      if(!res.success) {
          toast.error("Update failed");
          loadData();
      }
  }

  // --- HELPERS ---
  const getCategoryIcon = (cat: string) => {
      switch(cat) {
          case 'drinks': return <Droplets className="w-4 h-4 text-blue-500" />;
          case 'tobacco': return <Cigarette className="w-4 h-4 text-orange-500" />;
          case 'alcohol': return <Wine className="w-4 h-4 text-purple-500" />;
          default: return <Box className="w-4 h-4 text-slate-500" />;
      }
  };

  const filteredItems = items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]"><Loader2 className="w-10 h-10 text-emerald-500 animate-spin" /></div>;

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900">
      <Sidebar tenantName={tenant?.name} tenantCode={tenant?.code} logo={tenant?.logo_url} />
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
            <div><h1 className="text-3xl font-black text-slate-900">Inventory Master</h1><p className="text-sm font-bold text-slate-400 mt-1">Manage stock, prices & links</p></div>
            <div className="flex gap-3"><div className="relative group"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" /><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search stock..." className="h-12 pl-12 pr-4 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all w-64" /></div><button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="px-6 h-12 bg-slate-900 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"><Plus className="w-5 h-5" /> Add Item</button></div>
        </header>

        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-xs font-black uppercase text-slate-400">
                    <tr><th className="p-6">Product</th><th className="p-6">Category</th><th className="p-6">Stock Level</th><th className="p-6">Link</th><th className="p-6">Price</th><th className="p-6 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {filteredItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="p-6"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">{getCategoryIcon(item.category)}</div><span className="font-bold text-slate-900">{item.name}</span></div></td>
                            <td className="p-6"><span className="px-3 py-1 rounded-lg bg-slate-100 text-xs font-bold text-slate-600 uppercase tracking-wider">{item.category}</span></td>
                            <td className="p-6"><div className="flex items-center gap-3"><button onClick={() => handleQuickAdjust(item.id, -1)} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-red-100 hover:text-red-600 text-slate-500 font-bold transition-colors">-</button><div className="text-center w-16"><span className={`font-black text-lg ${item.stock < 10 ? 'text-red-500' : 'text-slate-900'}`}>{item.stock}</span><p className="text-[10px] font-bold text-slate-400 uppercase">{item.unit}</p></div><button onClick={() => handleQuickAdjust(item.id, 1)} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-emerald-100 hover:text-emerald-600 text-slate-500 font-bold transition-colors">+</button></div></td>
                            <td className="p-6">{item.linked_menu_item ? (<span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 flex items-center gap-1 w-fit"><Link2 className="w-3 h-3" /> {item.linked_menu_item}</span>) : (<span className="text-xs font-bold text-slate-400 italic">Unlinked</span>)}</td>
                            <td className="p-6 font-bold text-slate-600">Rs {item.price}</td>
                            <td className="p-6 text-right"><div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="p-2 rounded-lg bg-white border border-slate-200 hover:border-emerald-200 text-slate-400 hover:text-emerald-600 transition-colors"><Edit className="w-4 h-4" /></button><button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg bg-white border border-slate-200 hover:border-red-200 text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button></div></td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {filteredItems.length === 0 && <div className="p-12 text-center text-slate-400 font-bold">No inventory items match your search.</div>}
        </div>

        <AnimatePresence>
            {isModalOpen && (
                <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40" />
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-0 m-auto w-full max-w-lg h-fit bg-white rounded-[2rem] shadow-2xl z-50 p-8 border border-slate-100">
                        <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-black text-slate-900">{editingItem ? 'Edit Item' : 'New Retail Item'}</h2><button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button></div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div><label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Item Name</label><input name="name" defaultValue={editingItem?.name} required placeholder="e.g. Coca Cola" className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 transition-all" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Category</label><select name="category" defaultValue={editingItem?.category || 'drinks'} className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"><option value="drinks">Drinks</option><option value="tobacco">Tobacco</option><option value="alcohol">Alcohol</option><option value="packaged">Packaged</option></select></div>
                                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Unit</label><input name="unit" defaultValue={editingItem?.unit || 'pc'} placeholder="e.g. can" className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 transition-all" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Current Stock</label><input name="stock" type="number" defaultValue={editingItem?.stock} required className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 transition-all" /></div>
                                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Max Capacity</label><input name="max_stock" type="number" defaultValue={editingItem?.max_stock || 100} required className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 transition-all" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Cost Price (Rs)</label><input name="price" type="number" defaultValue={editingItem?.price} required className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 transition-all" /></div>
                                <div><label className="text-[10px] font-black uppercase text-emerald-600 ml-1 mb-1 block">Link to Menu Item</label><input name="linked_menu_item" defaultValue={editingItem?.linked_menu_item} placeholder="Exact Menu Name" className="w-full h-12 px-4 bg-emerald-50/50 border border-emerald-200 rounded-xl font-bold text-emerald-800 outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-emerald-800/30" /></div>
                            </div>
                            <div className="pt-4 flex gap-3"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 h-14 rounded-xl border border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition-colors">Cancel</button><button type="submit" disabled={isSubmitting} className="flex-1 h-14 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20">{isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Inventory"}</button></div>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
      </main>
    </div>
  );
}