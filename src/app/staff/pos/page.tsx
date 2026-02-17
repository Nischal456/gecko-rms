"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, ShoppingCart, Trash2, Plus, Minus, 
  ChefHat, Loader2, ArrowLeft, ChevronRight, LogOut
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { useSearchParams, useRouter } from "next/navigation";
import { getPOSData, submitOrder } from "@/app/actions/pos";
import { logoutStaff } from "@/app/actions/staff-auth"; 

// --- 1. Main Content Component (Logic moved here) ---
function POSContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preTableId = searchParams.get("tableId");

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({ categories: [], items: [], tables: [] });
  const [selectedCat, setSelectedCat] = useState("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>(preTableId || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [view, setView] = useState<"menu" | "tables">("menu"); 

  useEffect(() => { loadPOS(); }, []);

  async function loadPOS() {
      const res = await getPOSData();
      if (res.success) {
          setData({
              categories: res.categories || [],
              items: res.items || [],
              tables: res.tables || []
          });
          
          if (res.categories && res.categories.length > 0) setSelectedCat("all");
      }
      setLoading(false);
  }

  // --- ACTIONS ---
  async function handleLogout() {
      if(!confirm("Exit POS and Logout?")) return;
      await logoutStaff(); 
      window.location.href = "/staff/login";
  }

  const addToCart = (item: any) => {
      setCart(prev => {
          const existing = prev.find(i => i.id === item.id);
          if (existing) {
              return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
          }
          return [...prev, { ...item, qty: 1 }];
      });
      toast.success(`Added ${item.name}`, { duration: 800, position: 'bottom-center' });
  };

  const updateQty = (id: string, delta: number) => {
      setCart(prev => prev.map(i => {
          if (i.id === id) return { ...i, qty: Math.max(0, i.qty + delta) };
          return i;
      }).filter(i => i.qty > 0));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  async function handleCheckout() {
      if (!selectedTable) {
          toast.error("Please select a table first");
          setView("tables");
          return;
      }
      if (cart.length === 0) return;

      setIsSubmitting(true);
      const res = await submitOrder(selectedTable, cart, cartTotal);
      
      if (res.success) {
          toast.success("Order sent to Kitchen!");
          setCart([]);
          if (preTableId) router.push("/staff/waiter"); 
      } else {
          // Fix for type safety on error message
          const errorMsg = (res as any).msg || "Unknown error";
          toast.error("Order failed: " + errorMsg);
      }
      setIsSubmitting(false);
  }

  const filteredItems = useMemo(() => {
      let items = data.items || [];
      if (selectedCat !== "all") items = items.filter((i: any) => i.category_id === selectedCat);
      if (search) items = items.filter((i: any) => i.name.toLowerCase().includes(search.toLowerCase()));
      return items;
  }, [data.items, selectedCat, search]);

  if (loading) return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
          <p className="text-emerald-900/50 font-bold text-xs uppercase tracking-widest animate-pulse">Loading Register...</p>
      </div>
  );

  return (
    <div className="h-screen bg-[#F8FAFC] flex overflow-hidden font-sans text-slate-900 selection:bg-emerald-500 selection:text-white">
      <Toaster position="top-center" richColors />

      {/* --- LEFT PANEL: MENU & NAVIGATION --- */}
      <div className="flex-1 flex flex-col h-full relative">
          
          {/* HEADER */}
          <header className="px-6 py-4 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex justify-between items-center z-10">
              <div className="flex items-center gap-4">
                  <button onClick={() => window.history.back()} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                      <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                      <h1 className="text-lg font-black text-slate-900 leading-none">Register</h1>
                      <button onClick={() => setView("tables")} className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md mt-1 hover:bg-emerald-100 transition-colors flex items-center gap-1">
                          {selectedTable ? `Table: ${data.tables.find((t:any) => t.id === selectedTable)?.name || selectedTable}` : 'Select Table'} <ChevronRight className="w-3 h-3" />
                      </button>
                  </div>
              </div>

              <div className="flex items-center gap-3">
                  <div className="relative w-40 md:w-80">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search..." 
                          className="w-full h-10 pl-10 pr-4 bg-slate-100 border-transparent focus:bg-white focus:border-emerald-500 border-2 rounded-xl text-sm font-bold outline-none transition-all"
                      />
                  </div>
                  <button onClick={handleLogout} className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all shadow-sm">
                      <LogOut className="w-5 h-5 ml-0.5" />
                  </button>
              </div>
          </header>

          {/* TABLE SELECTOR OVERLAY */}
          <AnimatePresence>
              {view === "tables" && (
                  <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute inset-0 bg-slate-50/95 backdrop-blur-md z-50 p-8 overflow-y-auto"
                  >
                      <div className="max-w-4xl mx-auto">
                          <div className="flex justify-between items-center mb-6">
                              <h2 className="text-2xl font-black text-slate-900">Select Table</h2>
                              <button onClick={() => setView("menu")} className="px-4 py-2 bg-white border rounded-xl font-bold text-sm">Cancel</button>
                          </div>
                          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                              {data.tables.map((table: any) => (
                                  <button 
                                      key={table.id}
                                      onClick={() => { setSelectedTable(table.id); setView("menu"); }}
                                      className={`h-24 rounded-2xl border-2 font-black text-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                                          selectedTable === table.id 
                                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg' 
                                          : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-600'
                                      }`}
                                  >
                                      {table.name}
                                  </button>
                              ))}
                          </div>
                      </div>
                  </motion.div>
              )}
          </AnimatePresence>

          {/* CATEGORY TABS */}
          <div className="px-6 pt-4 pb-2 overflow-x-auto flex gap-3 no-scrollbar">
              <button 
                  onClick={() => setSelectedCat("all")}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                      selectedCat === "all" ? "bg-slate-900 text-white shadow-lg" : "bg-white text-slate-500 border border-slate-100 hover:bg-slate-50"
                  }`}
              >
                  All
              </button>
              {data.categories.map((cat: any) => (
                  <button 
                      key={cat.id}
                      onClick={() => setSelectedCat(cat.id)}
                      className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                          selectedCat === cat.id ? "bg-slate-900 text-white shadow-lg" : "bg-white text-slate-500 border border-slate-100 hover:bg-slate-50"
                      }`}
                  >
                      {cat.name}
                  </button>
              ))}
          </div>

          {/* MENU GRID */}
          <div className="flex-1 overflow-y-auto p-6 pt-2">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredItems.map((item: any) => (
                      <button 
                          key={item.id}
                          onClick={() => addToCart(item)}
                          className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-emerald-100 hover:-translate-y-1 transition-all active:scale-95 flex flex-col justify-between group h-[160px] relative overflow-hidden text-left"
                      >
                          <div className="absolute -right-4 -top-4 w-16 h-16 bg-slate-50 rounded-full group-hover:bg-emerald-50 transition-colors" />
                          <div className="relative z-10">
                              <h3 className="font-black text-slate-900 leading-tight group-hover:text-emerald-700 transition-colors line-clamp-2">{item.name}</h3>
                              <p className="text-[10px] font-bold text-slate-400 mt-1 line-clamp-2">{item.description}</p>
                          </div>
                          <div className="flex justify-between items-end relative z-10 mt-2">
                              <span className="text-sm font-black text-slate-900">Rs. {item.price}</span>
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm">
                                  <Plus className="w-4 h-4" />
                              </div>
                          </div>
                      </button>
                  ))}
              </div>
          </div>
      </div>

      {/* --- RIGHT PANEL: CART --- */}
      <div className="w-[380px] bg-white border-l border-slate-100 flex flex-col h-full shadow-2xl z-20">
          {/* Cart Header */}
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-black text-slate-900">Current Order</h2>
                  <button onClick={() => setCart([])} className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                  </button>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <div className="px-2 py-1 bg-white border border-slate-200 rounded-md">
                     {selectedTable ? `Table: ${data.tables.find((t:any) => t.id === selectedTable)?.name || selectedTable}` : 'No Table Selected'}
                  </div>
              </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <AnimatePresence>
                  {cart.map((item) => (
                      <motion.div 
                          layout
                          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                          key={item.id} 
                          className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-2xl shadow-sm"
                      >
                          <div className="flex-1">
                              <h4 className="font-bold text-slate-900 text-sm leading-tight">{item.name}</h4>
                              <p className="text-[10px] font-bold text-slate-400 mt-0.5">Rs. {item.price * item.qty}</p>
                          </div>
                          <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-1">
                              <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-slate-600 shadow-sm hover:text-red-500 active:scale-90 transition-transform"><Minus className="w-3 h-3" /></button>
                              <span className="font-black text-sm w-4 text-center">{item.qty}</span>
                              <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 bg-slate-900 rounded-lg flex items-center justify-center text-white shadow-sm hover:bg-emerald-500 active:scale-90 transition-transform"><Plus className="w-3 h-3" /></button>
                          </div>
                      </motion.div>
                  ))}
              </AnimatePresence>
              {cart.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-slate-300">
                      <ShoppingCart className="w-12 h-12 mb-3 opacity-20" />
                      <p className="font-bold text-sm">Cart is empty</p>
                  </div>
              )}
          </div>

          {/* Cart Footer */}
          <div className="p-6 bg-slate-50 border-t border-slate-100">
              <div className="flex justify-between items-center mb-4">
                  <span className="text-slate-500 font-bold text-sm">Subtotal</span>
                  <span className="text-slate-900 font-black text-lg">Rs. {cartTotal.toLocaleString()}</span>
              </div>
              <button 
                  onClick={handleCheckout}
                  disabled={cart.length === 0 || isSubmitting}
                  className="w-full h-16 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2 hover:bg-emerald-600 hover:shadow-emerald-600/30 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
              >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Send to Kitchen <ChefHat className="w-5 h-5" /></>}
              </button>
          </div>
      </div>
    </div>
  );
}

// --- 2. Main Page Component (Wraps content in Suspense) ---
export default function POSPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
          <p className="text-emerald-900/50 font-bold text-xs uppercase tracking-widest animate-pulse">Loading Register...</p>
      </div>
    }>
      <POSContent />
    </Suspense>
  );
}