"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/app/staff/manager/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, Loader2, Star, CheckCircle2, ChevronRight, X, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { getDashboardData } from "@/app/actions/dashboard";
import { getMenuData, toggleSpecialItem } from "@/app/actions/menu-optimized";

export default function ManagerSpecialsPage() {
  const [tenant, setTenant] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [dashRes, menuRes] = await Promise.all([getDashboardData(), getMenuData()]);
    if(dashRes) setTenant(dashRes.tenant);
    if(menuRes.success && menuRes.categories) {
        setCategories(menuRes.categories);
    }
    setLoading(false);
  }

  async function handleToggleSpecial(categoryId: string, item: any) {
      // Optimistic Update
      const newValue = !item.is_special;
      const newCats = categories.map(c => 
          c.id === categoryId ? { 
              ...c, 
              items: c.items.map((i: any) => i.id === item.id ? { ...i, is_special: newValue } : i) 
          } : c
      );
      setCategories(newCats);
      
      const res = await toggleSpecialItem(categoryId, item.id, newValue);
      if(res.success) {
          toast.success(newValue ? `${item.name} is now a Special!` : `${item.name} removed from Specials.`);
      } else {
          toast.error("Failed to update status.");
          loadData(); // revert
      }
  }

  // Flatten all items for search / easy view
  const allItems = categories.flatMap(c => 
      (c.items || []).map((i: any) => ({ ...i, categoryId: c.id, categoryName: c.category_name }))
  ).filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  const specialItemsCount = allItems.filter(i => i.is_special).length;

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]"><Loader2 className="w-10 h-10 text-emerald-500 animate-spin" /></div>;

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900 selection:bg-emerald-500 selection:text-white overflow-hidden">
      <Sidebar tenantName={tenant?.name} tenantCode={tenant?.code} logo={tenant?.logo_url} />
      
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        
        {/* HEADER */}
        <header className="flex-shrink-0 px-4 md:px-8 py-4 bg-white border-b border-slate-200 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 z-20 pt-16 lg:pt-4">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                    <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 leading-tight tracking-tight">Today's Specials</h1>
                    <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1 uppercase tracking-widest mt-0.5">
                        Feature Dishes on your Digital QR
                    </p>
                </div>
            </div>
            
            <div className="w-full xl:w-72 relative">
                <input 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                    placeholder="Search dishes..." 
                    className="w-full h-12 pl-4 pr-10 bg-slate-100 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500 transition-all border border-transparent focus:bg-white" 
                />
                {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-4 h-4"/></button>}
            </div>
        </header>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 bg-[#F8FAFC]">
            
            <div className="max-w-5xl mx-auto">
                <div className="flex flex-col md:flex-row gap-6 mb-8">
                    {/* STATS CARD */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 flex-1 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-100 to-transparent rounded-bl-full opacity-50 -z-0"></div>
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="flex items-center gap-2 text-amber-600 font-black text-xs uppercase tracking-widest mb-4">
                                <Star className="w-4 h-4" /> Active Specials
                            </div>
                            <div className="flex items-end gap-3 pb-2">
                                <span className="text-5xl font-black text-slate-900 tracking-tighter">{specialItemsCount}</span>
                                <span className="text-sm font-bold text-slate-400 pb-1.5 uppercase tracking-widest">Dishes</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-3xl border border-amber-100 flex-[2] flex gap-4 items-center relative overflow-hidden">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm border border-amber-200/50">
                            <AlertCircle className="w-6 h-6 text-amber-500" />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-900 text-base mb-1">Boost Your Sales</h3>
                            <p className="text-sm font-medium text-slate-600 leading-relaxed max-w-lg">
                                Items toggled here will bypass their regular categories and appear directly at the top of your customer's Digital QR menu in a beautiful "Spotlight" slider!
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                        <div className="grid grid-cols-12 gap-4 text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">
                            <div className="col-span-6 md:col-span-5">Dish / Item</div>
                            <div className="col-span-3 hidden md:block">Category</div>
                            <div className="col-span-3 text-right md:text-left">Price</div>
                            <div className="col-span-3 md:col-span-1 text-center">Special</div>
                        </div>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {allItems.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 font-bold">No dishes found. Add some from the Menu Manager first.</div>
                        ) : (
                            allItems.map((item) => (
                                <div key={item.id} className={`grid grid-cols-12 gap-4 items-center p-3 px-5 transition-colors hover:bg-slate-50/50 ${item.is_special ? 'bg-amber-50/30' : ''}`}>
                                    
                                    <div className="col-span-6 md:col-span-5 flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200/50">
                                            {item.image_url ? <img src={item.image_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><Star className="w-4 h-4 opacity-30"/></div>}
                                        </div>
                                        <div className="min-w-0 pr-2">
                                            <p className="font-black text-slate-900 text-sm truncate">{item.name}</p>
                                            {item.is_special && <span className="inline-block mt-0.5 text-[9px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-1 w-fit"><Sparkles className="w-2.5 h-2.5"/> Featured</span>}
                                        </div>
                                    </div>

                                    <div className="col-span-3 hidden md:flex items-center">
                                        <span className="text-[10px] uppercase font-black tracking-wider bg-slate-100 text-slate-500 px-2 py-1 rounded-lg truncate max-w-full">
                                            {item.categoryName}
                                        </span>
                                    </div>

                                    <div className="col-span-3 text-right md:text-left flex items-center justify-end md:justify-start">
                                        <span className="font-bold text-sm text-slate-600">
                                            {item.variants && item.variants.length > 0 ? `Rs ${Math.min(...item.variants.map((v:any)=>v.price))} +` : `Rs ${item.price}`}
                                        </span>
                                    </div>

                                    <div className="col-span-3 md:col-span-1 flex items-center justify-center">
                                        <button 
                                            onClick={() => handleToggleSpecial(item.categoryId, item)}
                                            className={`relative w-12 h-6 md:w-14 md:h-7 rounded-full transition-colors duration-300 flex items-center focus:outline-none focus:ring-4 focus:ring-amber-500/20 overflow-hidden ${item.is_special ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-slate-200'}`}
                                        >
                                            <span className="sr-only">Toggle Special</span>
                                            <motion.span 
                                                className={`inline-block w-4 h-4 md:w-5 md:h-5 bg-white rounded-full shadow-sm transform transition-transform duration-300 ease-in-out ${item.is_special ? 'translate-x-[26px] md:translate-x-[30px]' : 'translate-x-1'}`} 
                                                layout
                                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                            />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
            {/* SPACING FOR MOBILE DOCK IF PRESENT */}
            <div className="h-24 md:h-0"></div>
        </div>

      </main>
    </div>
  );
}
