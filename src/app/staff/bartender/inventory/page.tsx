"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Minus, Search, Package, Loader2, 
  Wine, Cigarette, Droplets, Box, Lock, Sparkles, Link2
} from "lucide-react";
import { toast } from "sonner";
import { getInventory, manualStockAdjust } from "@/app/actions/inventory"; 
import { getDashboardData } from "@/app/actions/dashboard";

export default function BarInventoryPage() {
  const [tenant, setTenant] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // THE MAGIC FIX: Silent Polling Engine for Real-Time Updates
  useEffect(() => { 
      loadData(); // Initial visible load
      
      // Silently fetch fresh data every 5 seconds to keep POS & Inventory synced perfectly!
      const syncInterval = setInterval(() => {
          loadData(true); 
      }, 5000); 
      
      return () => clearInterval(syncInterval);
  }, []);

  async function loadData(silent = false) {
    if (!silent) setLoading(true);
    const [dashRes, invRes] = await Promise.all([getDashboardData(), getInventory()]);
    if(dashRes) setTenant(dashRes.tenant);
    
    // Bar Filter: Only show relevant bar inventory categories (Alcohol, Tobacco, Hookah, Coal, Drinks)
    if(invRes.success && Array.isArray(invRes.data)) {
        const botCategories = ['alcohol', 'drinks', 'tobacco', 'hookah', 'coal', 'bar_supplies', 'beverage', 'liquor'];
        const barItems = invRes.data.filter(i => {
            const cat = (i.category || '').toLowerCase();
            return botCategories.some(bc => cat.includes(bc));
        });
        setItems(barItems);
    }
    if (!silent) setLoading(false);
  }

  // ULTRA-FAST OPTIMISTIC UI UPDATE
  async function handleManualAdjust(id: string, amount: number) {
      // 1. Instantly update the UI so there is 0 lag for the bartender
      setItems(prev => prev.map(item => {
          if (item.id === id) {
              const newStock = Math.max(0, item.stock + amount);
              const newDisplay = item.volume_per_unit > 1 
                ? `${(newStock / item.volume_per_unit).toFixed(2)} ${item.unit}s (${newStock}${item.base_unit})`
                : `${newStock} ${item.base_unit}`;
              return { ...item, stock: newStock, display_stock: newDisplay };
          }
          return item;
      }));

      // 2. Silently sync with the database in the background
      const res = await manualStockAdjust(id, amount);
      if (!res.success) {
          toast.error("Failed to sync stock adjustment");
          loadData(true); // Revert UI if db fails
      }
  }

  const hasAccess = (() => {
      if (!tenant || !tenant.feature_flags) return false;
      try {
          const feats = typeof tenant.feature_flags === 'string' ? JSON.parse(tenant.feature_flags) : tenant.feature_flags;
          return feats.inventory === true || String(feats.inventory).toLowerCase() === "true";
      } catch { return false; }
  })();

  const filteredItems = items.filter(i => 
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (i.category || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] gap-4">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 animate-pulse">Syncing Vault...</p>
      </div>
  );

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto relative w-full custom-scrollbar bg-[#F8FAFC] h-full pb-[100px] md:pb-8">
      
      {!hasAccess && (
          <div className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-white/40 p-4">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 md:p-10 rounded-[2rem] shadow-2xl border border-slate-100 w-full max-w-md text-center relative overflow-hidden transform-gpu">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 to-orange-600" />
                  <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><Lock className="w-10 h-10" /></div>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-3 flex justify-center items-center gap-2">Premium Feature <Sparkles className="w-5 h-5 text-amber-500" /></h2>
                  <p className="text-slate-500 font-medium mb-8 leading-relaxed text-sm md:text-base">Inventory & Peg Tracking is available on the Business Plan.</p>
              </motion.div>
          </div>
      )}

      <div className={`${!hasAccess ? 'blur-sm pointer-events-none opacity-50' : ''} transition-all duration-500 max-w-5xl mx-auto`}>
          
          {/* HEADER */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
              <div>
                  <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">Bar Inventory</h1>
                  <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest flex items-center gap-2"><Package className="w-4 h-4 text-emerald-500" /> Quick Stock Adjustments</p>
              </div>
              <div className="w-full md:w-80 relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                  <input 
                      value={searchQuery} 
                      onChange={(e) => setSearchQuery(e.target.value)} 
                      placeholder="Search drinks, tobacco..." 
                      className="w-full h-12 pl-12 pr-4 bg-white border border-slate-200 shadow-sm rounded-2xl text-sm font-bold focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all outline-none" 
                  />
              </div>
          </header>

          {/* INVENTORY TABLE */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden transform-gpu">
              <div className="overflow-x-auto w-full custom-scrollbar">
                  <table className="w-full text-left min-w-[600px]">
                      <thead className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                          <tr>
                              <th className="p-5 md:p-6">Product</th>
                              <th className="p-5 md:p-6">Category</th>
                              <th className="p-5 md:p-6">Stock Level</th>
                              <th className="p-5 md:p-6 text-right">Quick Adjust</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                          {filteredItems.map((item) => {
                              const isTobacco = ['tobacco', 'hookah', 'coal'].includes((item.category || '').toLowerCase());
                              const isAlcohol = ['alcohol', 'liquor'].includes((item.category || '').toLowerCase());

                              return (
                                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                      <td className="p-4 md:p-6">
                                          <div className="flex items-center gap-3 md:gap-4">
                                              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-sm shrink-0">
                                                  {isAlcohol ? <Wine className="w-5 h-5 text-purple-500" /> : isTobacco ? <Cigarette className="w-5 h-5 text-orange-500" /> : <Droplets className="w-5 h-5 text-blue-500" />}
                                              </div>
                                              <div>
                                                  <div className="font-black text-sm md:text-base text-slate-900 leading-tight">{item.name}</div>
                                                  {item.linked_menu_item && <div className="text-[9px] md:text-[10px] font-bold text-emerald-500 flex items-center gap-1 mt-0.5"><Link2 className="w-3 h-3"/> Auto-Tracked</div>}
                                              </div>
                                          </div>
                                      </td>
                                      <td className="p-4 md:p-6">
                                          <span className="px-2.5 md:px-3 py-1 rounded-lg bg-slate-100 text-[9px] md:text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                              {item.category}
                                          </span>
                                      </td>
                                      <td className="p-4 md:p-6">
                                          <span className={`font-black text-sm md:text-lg block ${item.stock <= (item.volume_per_unit || 1) * 2 ? 'text-red-500 animate-pulse' : 'text-slate-900'}`}>
                                              {item.display_stock || `${item.stock} ${item.base_unit}`}
                                          </span>
                                      </td>
                                      <td className="p-4 md:p-6">
                                          <div className="flex items-center justify-end gap-2 md:gap-3">
                                              <button onClick={() => handleManualAdjust(item.id, -(item.volume_per_unit || 1))} className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all active:scale-90 shadow-sm">
                                                  <Minus className="w-4 h-4 md:w-5 md:h-5" />
                                              </button>
                                              <button onClick={() => handleManualAdjust(item.id, (item.volume_per_unit || 1))} className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-500 hover:border-emerald-200 transition-all active:scale-90 shadow-sm">
                                                  <Plus className="w-4 h-4 md:w-5 md:h-5" />
                                              </button>
                                          </div>
                                      </td>
                                  </tr>
                              )
                          })}
                      </tbody>
                  </table>
                  {filteredItems.length === 0 && (
                      <div className="p-16 flex flex-col items-center justify-center text-slate-300">
                          <Package className="w-12 h-12 mb-3 opacity-20" />
                          <p className="font-bold uppercase tracking-widest text-xs">No matching stock found.</p>
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
}