"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Minus, Search, Package, Trash2, X, Loader2, 
  Wine, Droplets, Box, Lock, Sparkles,
  ChevronDown, Receipt, Link2, Clock, 
  TrendingUp, TrendingDown, Edit3,Layers
} from "lucide-react";
import { toast } from "sonner";
import { getInventory, addInventoryItem, deleteInventoryItem, addExpense, getExpenses, deleteExpense, getMenuItemsForLinking, manualStockAdjust } from "@/app/actions/inventory"; 
import { getDashboardData } from "@/app/actions/dashboard";

export default function InventoryView() {
  const [tenant, setTenant] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [posMenuItems, setPosMenuItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [activeTab, setActiveTab] = useState<'inventory' | 'expenses'>('inventory');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [deleteTarget, setDeleteTarget] = useState<{ id: string, type: 'inventory' | 'expense', title: string } | null>(null);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [financeType, setFinanceType] = useState<'expense' | 'income'>('expense');
  const [isFinCatOpen, setIsFinCatOpen] = useState(false);
  const [financeCategory, setFinanceCategory] = useState(""); 
  const finCatDropdownRef = useRef<HTMLDivElement>(null);

  const [isAdvancedUnit, setIsAdvancedUnit] = useState(false);
  const [isCatOpen, setIsCatOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("packaged");
  const [customCategory, setCustomCategory] = useState("");
  const catDropdownRef = useRef<HTMLDivElement>(null);

  const [isMenuLinkOpen, setIsMenuLinkOpen] = useState(false);
  const [selectedMenuLink, setSelectedMenuLink] = useState("");
  const [menuSearch, setMenuSearch] = useState("");
  const menuDropdownRef = useRef<HTMLDivElement>(null);

  const EXPENSE_PRESETS = ["Supplier Purchase", "Rent", "Staff Salary", "Electricity", "Marketing", "Maintenance"];
  const INCOME_PRESETS = ["Manual POS Entry", "Event Booking", "Advance Deposit", "Catering Service"];

  // Silent Polling Engine for Real-Time Updates
  useEffect(() => { 
      loadData(); 
      const syncInterval = setInterval(() => { loadData(true); }, 5000); 

      const handleClickOutside = (event: MouseEvent) => {
          if (catDropdownRef.current && !catDropdownRef.current.contains(event.target as Node)) setIsCatOpen(false);
          if (menuDropdownRef.current && !menuDropdownRef.current.contains(event.target as Node)) setIsMenuLinkOpen(false);
          if (finCatDropdownRef.current && !finCatDropdownRef.current.contains(event.target as Node)) setIsFinCatOpen(false);
      };
      document.addEventListener("mousedown", handleClickOutside);
      
      return () => { clearInterval(syncInterval); document.removeEventListener("mousedown", handleClickOutside); };
  }, []);

  useEffect(() => { setIsAdvancedUnit(selectedCategory === 'alcohol' || selectedCategory === 'drinks'); }, [selectedCategory]);
  useEffect(() => { setFinanceCategory(financeType === 'expense' ? "Supplier Purchase" : "Manual POS Entry"); setIsFinCatOpen(false); }, [financeType]);

  async function loadData(silent = false) {
    if (!silent) setLoading(true);
    const [dashRes, invRes, expRes, menuRes] = await Promise.all([getDashboardData(), getInventory(), getExpenses(), getMenuItemsForLinking()]);
    if(dashRes) setTenant(dashRes.tenant);
    if(invRes.success && 'data' in invRes && Array.isArray(invRes.data)) setItems(invRes.data);
    if(expRes.success && Array.isArray(expRes.data)) setExpenses(expRes.data);
    if(menuRes.success) setPosMenuItems(menuRes.data);
    if (!silent) setLoading(false);
  }

  const defaultCats = ["alcohol", "drinks", "tobacco", "packaged"];
  const allCategories = Array.from(new Set([...defaultCats, ...items.map(i => i.category), customCategory])).filter(Boolean);

  async function handleManualAdjust(id: string, amount: number) {
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

      const res = await manualStockAdjust(id, amount);
      if (!res.success) toast.error("Failed to adjust stock");
      loadData(true); 
  }

  async function handleSaveItem(e: React.FormEvent) {
      e.preventDefault();
      setIsSubmitting(true);
      const form = e.target as HTMLFormElement;
      
      const formUnit = (form.elements.namedItem('unit') as HTMLInputElement).value;
      const data = {
          name: (form.elements.namedItem('name') as HTMLInputElement).value,
          category: selectedCategory,
          stock: Number((form.elements.namedItem('stock') as HTMLInputElement).value), 
          unit: formUnit, 
          base_unit: isAdvancedUnit ? (form.elements.namedItem('base_unit') as HTMLInputElement).value : formUnit, 
          volume_per_unit: isAdvancedUnit ? Number((form.elements.namedItem('volume_per_unit') as HTMLInputElement).value) : 1, 
          cost_price: Number((form.elements.namedItem('cost_price') as HTMLInputElement).value),
          price: Number((form.elements.namedItem('price') as HTMLInputElement).value),
          linked_menu_item: selectedMenuLink || ""
      };

      const res = await addInventoryItem(data);
      if(res.success) {
          setIsModalOpen(false); setSelectedMenuLink(""); await loadData(false);
          toast.success("Inventory Item Added!", { description: `${data.name} is now tracked.` });
      } else toast.error(res.error || "Failed to add inventory item.");
      setIsSubmitting(false);
  }

  async function handleSaveFinancial(e: React.FormEvent) {
      e.preventDefault();
      if (!financeCategory.trim()) return toast.error("Please provide a Title/Category");
      
      setIsSubmitting(true);
      const form = e.target as HTMLFormElement;
      
      const data = {
          type: financeType, category: financeCategory.trim(), 
          amount: Number((form.elements.namedItem('amount') as HTMLInputElement).value),
          description: (form.elements.namedItem('description') as HTMLInputElement).value,
          date: (form.elements.namedItem('date') as HTMLInputElement).value,
      };

      const res = await addExpense(data);
      if(res.success) {
          setIsExpenseModalOpen(false); await loadData(false); setActiveTab('expenses');
          toast.success(`${financeType === 'income' ? 'Income' : 'Expense'} Logged!`, { description: `Successfully recorded.` });
      } else toast.error(res.error || `Failed to log record.`);
      setIsSubmitting(false);
  }

  const triggerDelete = (id: string, type: 'inventory' | 'expense', title: string) => setDeleteTarget({ id, type, title });

  async function confirmDelete() {
      if (!deleteTarget) return;
      if (deleteTarget.type === 'inventory') setItems(items.filter(item => item.id !== deleteTarget.id));
      else setExpenses(expenses.filter(exp => exp.id !== deleteTarget.id));

      const res = deleteTarget.type === 'inventory' ? await deleteInventoryItem(deleteTarget.id) : await deleteExpense(deleteTarget.id);
      if (res.success) toast.success("Deleted Successfully"); else { toast.error("Failed to delete item."); loadData(true); }
      setDeleteTarget(null);
  }

  const hasAccess = (() => {
      if (!tenant || !tenant.feature_flags) return false;
      try {
          const feats = typeof tenant.feature_flags === 'string' ? JSON.parse(tenant.feature_flags) : tenant.feature_flags;
          return feats.inventory === true || String(feats.inventory).toLowerCase() === "true";
      } catch { return false; }
  })();

  const filteredItems = items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredExpenses = expenses.filter(e => (e.description||"").toLowerCase().includes(searchQuery.toLowerCase()) || e.category.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) return <div className="h-full flex items-center justify-center bg-[#F8FAFC]"><Loader2 className="w-10 h-10 text-emerald-500 animate-spin" /></div>;

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto bg-[#F8FAFC] pb-[140px] custom-scrollbar relative">
      <AnimatePresence>
          {deleteTarget && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
                  <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl p-8 text-center border border-slate-100 overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-2 bg-red-500" />
                      <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><Trash2 className="w-10 h-10" /></div>
                      <h3 className="text-xl font-black text-slate-900 mb-2">Are you sure?</h3>
                      <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">This will permanently delete <br/><span className="font-bold text-slate-800">"{deleteTarget.title.replace(/\[INC\]|\[EXP\]/gi, '')}"</span>. This action cannot be undone.</p>
                      <div className="flex gap-3">
                          <button onClick={() => setDeleteTarget(null)} className="flex-1 py-4 rounded-2xl font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors">Cancel</button>
                          <button onClick={confirmDelete} className="flex-1 py-4 rounded-2xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 active:scale-95">Delete</button>
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>

      {!hasAccess && (
          <div className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-white/40 p-4">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 md:p-10 rounded-[2rem] shadow-2xl border border-slate-100 w-full max-w-md text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 to-orange-600" />
                  <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><Lock className="w-10 h-10" /></div>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-3 flex justify-center items-center gap-2">Premium Feature <Sparkles className="w-5 h-5 text-amber-500" /></h2>
                  <p className="text-slate-500 font-medium mb-8 leading-relaxed text-sm md:text-base">Inventory & Expense Management are available on the Business Plan.</p>
              </motion.div>
          </div>
      )}

      <div className={`${!hasAccess ? 'blur-sm pointer-events-none opacity-50' : ''} transition-all duration-500`}>
          <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
              <div>
                  <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">Vault & Ledger</h1>
                  <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-500" /> Premium Control Center</p>
              </div>
              <div className="flex flex-wrap gap-3 w-full xl:w-auto">
                  <div className="relative flex-1 md:w-80">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={`Search ${activeTab}...`} className="w-full h-12 pl-12 pr-4 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-slate-900 transition-all shadow-sm" />
                  </div>
                  <button onClick={() => { setFinanceType('expense'); setIsExpenseModalOpen(true); }} className="flex-1 xl:flex-none px-6 h-12 bg-white border-2 border-slate-100 text-slate-900 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 shadow-sm transition-all whitespace-nowrap active:scale-95">
                      <Receipt className="w-4 h-4 text-slate-400" /> <span className="hidden sm:inline">Log Cashflow</span><span className="sm:hidden">Log</span>
                  </button>
                  <button onClick={() => { setCustomCategory(""); setIsModalOpen(true); }} className="flex-1 xl:flex-none px-6 h-12 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20 active:scale-95 transition-all whitespace-nowrap">
                      <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Stock</span><span className="sm:hidden">Stock</span>
                  </button>
              </div>
          </header>

          <div className="flex gap-6 mb-8 border-b-2 border-slate-100">
              {['inventory', 'expenses'].map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab as any)} className={`pb-4 px-2 font-black text-xs uppercase tracking-widest transition-all relative ${activeTab === tab ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
                      {tab === 'inventory' ? 'Live Inventory' : 'Financial History'}
                      {activeTab === tab && <motion.div layoutId="activetabCashier" className="absolute bottom-[-2px] left-0 w-full h-1 rounded-t-full bg-slate-900" />}
                  </button>
              ))}
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
              <div className="overflow-x-auto w-full custom-scrollbar">
                  <table className="w-full text-left min-w-[800px]">
                      <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                          {activeTab === 'inventory' ? (
                              <tr><th className="p-6">Product</th><th className="p-6">Category</th><th className="p-6">Stock Level</th><th className="p-6">Adjust</th><th className="p-6 text-right">Action</th></tr>
                          ) : (
                              <tr><th className="p-6">Timestamp</th><th className="p-6">Title / Category</th><th className="p-6">Notes</th><th className="p-6">Amount</th><th className="p-6 text-right">Action</th></tr>
                          )}
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                          {activeTab === 'inventory' ? filteredItems.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50/30 transition-colors group">
                                  <td className="p-6">
                                      <div className="flex items-center gap-4">
                                          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                                              {item.category === 'alcohol' ? <Wine className="w-5 h-5 text-purple-500" /> : item.category === 'drinks' ? <Droplets className="w-5 h-5 text-blue-500" /> : <Box className="w-5 h-5 text-slate-400" />}
                                          </div>
                                          <div>
                                              <div className="font-black text-slate-900">{item.name}</div>
                                              {item.linked_menu_item && <div className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 mt-0.5"><Link2 className="w-3 h-3"/> Linked to POS</div>}
                                          </div>
                                      </div>
                                  </td>
                                  <td className="p-6"><span className="px-3 py-1 rounded-lg bg-slate-100 text-[10px] font-black uppercase text-slate-500">{item.category}</span></td>
                                  <td className="p-6">
                                      <span className={`font-black text-base md:text-lg block ${item.stock <= (item.volume_per_unit || 1) * 2 ? 'text-red-500' : 'text-slate-900'}`}>
                                          {item.display_stock || `${item.stock} ${item.base_unit}`}
                                      </span>
                                  </td>
                                  <td className="p-6">
                                      <div className="flex items-center gap-2">
                                          <button onClick={() => handleManualAdjust(item.id, -(item.volume_per_unit || 1))} className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all active:scale-90"><Minus className="w-4 h-4" /></button>
                                          <button onClick={() => handleManualAdjust(item.id, (item.volume_per_unit || 1))} className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-500 transition-all active:scale-90"><Plus className="w-4 h-4" /></button>
                                      </div>
                                  </td>
                                  <td className="p-6 text-right">
                                      <button onClick={() => triggerDelete(item.id, 'inventory', item.name)} className="p-3 rounded-xl hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all"><Trash2 className="w-5 h-5" /></button>
                                  </td>
                              </tr>
                          )) : filteredExpenses.map((exp) => {
                              const isInc = exp.category.toUpperCase().includes('[INC]') || exp.category.toLowerCase().includes('income') || exp.category.toLowerCase().includes('deposit') || exp.category.toLowerCase().includes('catering');
                              const cleanTitle = exp.category.replace(/\[INC\]|\[EXP\]/gi, '').replace(/_/g, ' ').trim();
                              const d = new Date(exp.created_at || exp.date);
                              return (
                                  <tr key={exp.id} className="hover:bg-slate-50/30 transition-colors group">
                                      <td className="p-6">
                                          <div className="font-bold text-slate-900">{d.toLocaleDateString('en-US', { timeZone: 'Asia/Kathmandu', month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                          <div className="text-[10px] font-black text-slate-400 flex items-center gap-1 mt-1"><Clock className="w-3 h-3"/> {d.toLocaleTimeString('en-US', { timeZone: 'Asia/Kathmandu', hour: '2-digit', minute: '2-digit' })}</div>
                                      </td>
                                      <td className="p-6">
                                          <div className={`text-xs font-black uppercase px-3 py-1.5 rounded-lg border w-fit flex items-center gap-1.5 ${isInc ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                                              {isInc ? <TrendingUp className="w-3 h-3"/> : <TrendingDown className="w-3 h-3"/>}
                                              {cleanTitle}
                                          </div>
                                      </td>
                                      <td className="p-6 font-medium text-slate-600 max-w-[200px] truncate">{exp.description || '--'}</td>
                                      <td className="p-6 font-black text-lg whitespace-nowrap">
                                          <span className={isInc ? 'text-emerald-600' : 'text-slate-900'}>{isInc ? '+' : '-'} Rs {Math.abs(exp.amount)}</span>
                                      </td>
                                      <td className="p-6 text-right">
                                          <button onClick={() => triggerDelete(exp.id, 'expense', cleanTitle)} className="p-3 rounded-xl hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all"><Trash2 className="w-5 h-5" /></button>
                                      </td>
                                  </tr>
                              )
                          })}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>

      {/* --- ADD FINANCIAL LOG MODAL --- */}
      <AnimatePresence>
          {isExpenseModalOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsExpenseModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
                  <motion.div initial={{ opacity: 0, scale: 0.95, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 30 }} className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl p-6 md:p-8 border border-slate-100 overflow-y-auto max-h-[90vh] custom-scrollbar">
                      
                      <div className="flex justify-between items-center mb-6">
                          <h2 className="text-2xl font-black text-slate-900">Log Cashflow</h2>
                          <button onClick={() => setIsExpenseModalOpen(false)} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
                      </div>
                      
                      <div className="flex p-1.5 bg-slate-100/80 border border-slate-200/50 rounded-[1.25rem] mb-6 relative">
                          <motion.div className={`absolute inset-y-1.5 w-[calc(50%-6px)] rounded-xl shadow-sm ${financeType === 'expense' ? 'bg-white left-1.5' : 'bg-white right-1.5'}`} layout transition={{ type: "spring", stiffness: 300, damping: 25 }} />
                          <button type="button" onClick={() => setFinanceType('expense')} className={`flex-1 py-3.5 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors relative z-10 ${financeType === 'expense' ? 'text-orange-600' : 'text-slate-400 hover:text-slate-600'}`}><TrendingDown className="w-4 h-4"/> Expense</button>
                          <button type="button" onClick={() => setFinanceType('income')} className={`flex-1 py-3.5 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors relative z-10 ${financeType === 'income' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}><TrendingUp className="w-4 h-4"/> Income</button>
                      </div>

                      <form onSubmit={handleSaveFinancial} className="space-y-5">
                          <div className="relative" ref={finCatDropdownRef}>
                              <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 flex items-center gap-1"><Edit3 className="w-3 h-3" /> {financeType === 'income' ? 'Income Title / Category' : 'Expense Title / Category'}</label>
                              <div className={`flex items-center w-full h-14 px-4 bg-slate-50 border-2 rounded-2xl transition-all focus-within:bg-white ${financeType === 'income' ? 'border-emerald-100 focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-500/10' : 'border-orange-100 focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-500/10'}`}>
                                  <input required value={financeCategory} onChange={(e) => { setFinanceCategory(e.target.value); setIsFinCatOpen(true); }} onFocus={() => setIsFinCatOpen(true)} placeholder={financeType === 'income' ? "e.g. Wedding Party Catering" : "e.g. Plumber Fixing Sink"} className={`w-full h-full bg-transparent outline-none font-bold text-base placeholder:font-medium placeholder:opacity-50 ${financeType === 'income' ? 'text-emerald-900' : 'text-orange-900'}`} autoComplete="off" />
                                  <button type="button" onClick={() => setIsFinCatOpen(!isFinCatOpen)} className="p-1"><ChevronDown className={`w-5 h-5 transition-transform ${isFinCatOpen ? 'rotate-180' : ''} ${financeType === 'income' ? 'text-emerald-400' : 'text-orange-400'}`}/></button>
                              </div>
                              <AnimatePresence>
                                  {isFinCatOpen && (
                                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute z-[120] top-[80px] left-0 w-full bg-white border-2 border-slate-100 rounded-2xl shadow-xl overflow-hidden p-2">
                                          <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                                              {(financeType === 'expense' ? EXPENSE_PRESETS : INCOME_PRESETS).filter(c => c.toLowerCase().includes(financeCategory.toLowerCase())).map(c => (<div key={c} onClick={() => { setFinanceCategory(c); setIsFinCatOpen(false); }} className={`px-4 py-3 rounded-xl cursor-pointer font-bold text-sm transition-colors ${financeCategory === c ? (financeType === 'income' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700') : 'hover:bg-slate-50 text-slate-700'}`}>{c}</div>))}
                                          </div>
                                      </motion.div>
                                  )}
                              </AnimatePresence>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div><label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Amount (Rs)</label><div className={`flex items-center w-full h-14 px-4 border-2 rounded-2xl transition-all focus-within:bg-white bg-slate-50 ${financeType === 'income' ? 'border-emerald-100 focus-within:border-emerald-400 text-emerald-700' : 'border-orange-100 focus-within:border-orange-400 text-orange-700'}`}><span className="font-black opacity-50 mr-1">Rs</span><input name="amount" type="number" required placeholder="0" className="w-full h-full bg-transparent outline-none font-black text-xl" /></div></div>
                              <div><label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Date</label><input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required className="w-full h-14 px-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all" /></div>
                          </div>

                          <div><label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Detailed Description (Optional)</label><textarea name="description" placeholder="Add invoice numbers, details, or reasons here..." className="w-full h-24 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-medium text-slate-900 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 transition-all resize-none placeholder:text-slate-400" /></div>

                          <div className="pt-2 flex gap-3">
                              <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="w-1/3 h-14 rounded-2xl font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors">Cancel</button>
                              <button type="submit" disabled={isSubmitting} className={`flex-1 h-14 rounded-2xl text-white font-black text-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${financeType === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-900 hover:bg-slate-800'}`}>{isSubmitting ? <Loader2 className="animate-spin" /> : <>Save {financeType === 'income' ? 'Income' : 'Expense'}</>}</button>
                          </div>
                      </form>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>

      {/* --- ADD STOCK MODAL --- */}
      <AnimatePresence>
          {isModalOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                  <motion.div initial={{ opacity: 0, scale: 0.95, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 30 }} className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl p-6 md:p-8 border border-slate-100 overflow-y-auto max-h-[90vh] custom-scrollbar">
                      <div className="flex justify-between items-center mb-8">
                          <h2 className="text-2xl font-black">Register New Stock</h2>
                          <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-6 h-6" /></button>
                      </div>
                      <form onSubmit={handleSaveItem} className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div><label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Item Name</label><input name="name" required placeholder="e.g. Jack Daniels" className="w-full h-14 px-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:bg-white focus:border-slate-900 transition-all" /></div>
                              <div className="relative" ref={catDropdownRef}>
                                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Category</label>
                                  <div onClick={() => setIsCatOpen(!isCatOpen)} className="w-full h-14 px-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold flex items-center justify-between cursor-pointer focus-within:bg-white focus-within:border-slate-900 transition-all"><span className="capitalize">{selectedCategory}</span><ChevronDown className="w-5 h-5 text-slate-400" /></div>
                                  <AnimatePresence>{isCatOpen && (<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute z-[120] top-[75px] left-0 w-full bg-white border-2 border-slate-100 rounded-2xl shadow-2xl p-2">{allCategories.map(cat => (<div key={cat} onClick={() => { setSelectedCategory(cat); setIsCatOpen(false); }} className="p-3 rounded-xl hover:bg-slate-50 cursor-pointer font-bold text-sm capitalize">{cat}</div>))}</motion.div>)}</AnimatePresence>
                              </div>
                          </div>

                          <div className="relative" ref={menuDropdownRef}>
                              <label className="text-[10px] font-black uppercase text-emerald-600 ml-1 mb-1 block">Automatic POS Link (Optional)</label>
                              <div onClick={() => setIsMenuLinkOpen(!isMenuLinkOpen)} className="w-full h-14 px-5 bg-emerald-50/50 border-2 border-emerald-100 rounded-2xl font-bold text-emerald-800 flex items-center justify-between cursor-pointer focus-within:ring-4 focus-within:ring-emerald-500/20 transition-all"><span className="truncate">{selectedMenuLink || "Manual (Not Linked)"}</span><ChevronDown className="w-5 h-5 text-emerald-600" /></div>
                              <AnimatePresence>{isMenuLinkOpen && (<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute z-[120] top-[75px] left-0 w-full bg-white border-2 border-slate-100 rounded-2xl shadow-2xl p-3"><input autoFocus value={menuSearch} onChange={e => setMenuSearch(e.target.value)} placeholder="Search menu items..." className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl mb-3 text-sm font-bold outline-none focus:border-emerald-400" /><div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar"><div onClick={() => { setSelectedMenuLink(""); setIsMenuLinkOpen(false); }} className="p-3 rounded-xl hover:bg-slate-50 cursor-pointer font-bold text-sm text-slate-400 italic">Unlink / Manual Tracking</div>{posMenuItems.filter(m => m.toLowerCase().includes(menuSearch.toLowerCase())).map(m => (<div key={m} onClick={() => { setSelectedMenuLink(m); setIsMenuLinkOpen(false); }} className="p-3 rounded-xl hover:bg-emerald-50 text-emerald-900 cursor-pointer font-bold text-sm">{m}</div>))}</div></motion.div>)}</AnimatePresence>
                          </div>

                          <div className="flex items-center justify-between p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                              <div><span className="font-black text-slate-900 text-sm flex items-center gap-2"><Layers className="w-4 h-4 text-slate-400"/> Track by Sub-units?</span><p className="text-[10px] font-bold text-slate-400 mt-1">Example: 1 Case = 24 Cans</p></div>
                              <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={isAdvancedUnit} onChange={() => setIsAdvancedUnit(!isAdvancedUnit)} /><div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-slate-900 transition-all peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div></label>
                          </div>
                          
                          <AnimatePresence>{isAdvancedUnit ? (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="grid grid-cols-3 gap-4 overflow-hidden pt-2">
                                  <div><label className="text-[10px] font-black text-slate-400 ml-1 mb-1 block uppercase">Buying Unit</label><input name="unit" defaultValue="Bottle" className="w-full h-14 px-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-slate-900 focus:bg-white" /></div>
                                  <div><label className="text-[10px] font-black text-slate-400 ml-1 mb-1 block uppercase">Sub Unit</label><input name="base_unit" defaultValue="ml" className="w-full h-14 px-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-slate-900 focus:bg-white" /></div>
                                  <div><label className="text-[10px] font-black text-slate-400 ml-1 mb-1 block uppercase">Sub Count</label><input name="volume_per_unit" type="number" defaultValue="750" className="w-full h-14 px-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-slate-900 focus:bg-white" /></div>
                              </motion.div>
                          ) : (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden"><label className="text-[10px] font-black text-slate-400 ml-1 mb-1 block uppercase">Stock Unit</label><input name="unit" defaultValue="pcs" className="w-full h-14 px-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-slate-900 focus:bg-white" /></motion.div>
                          )}</AnimatePresence>

                          <div className="grid grid-cols-3 gap-4">
                              <div><label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Initial Qty</label><input name="stock" type="number" required placeholder="0" className="w-full h-14 px-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-slate-900 focus:bg-white" /></div>
                              <div><label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Cost Price</label><input name="cost_price" type="number" required placeholder="0" className="w-full h-14 px-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-slate-900 focus:bg-white" /></div>
                              <div><label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Sale Price</label><input name="price" type="number" required placeholder="0" className="w-full h-14 px-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-slate-900 focus:bg-white" /></div>
                          </div>

                          <div className="pt-4 flex flex-col-reverse sm:flex-row gap-3">
                              <button type="button" onClick={() => setIsModalOpen(false)} className="w-full sm:w-1/3 h-14 rounded-2xl border border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition-colors">Cancel</button>
                              <button type="submit" disabled={isSubmitting} className="w-full sm:flex-1 h-14 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl shadow-slate-900/20 active:scale-95 flex items-center justify-center gap-2">{isSubmitting ? <Loader2 className="animate-spin mx-auto" /> : "Save to Vault"}</button>
                          </div>
                      </form>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>
    </div>
  );
}