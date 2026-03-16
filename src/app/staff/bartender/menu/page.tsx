"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Search, Image as ImageIcon, Loader2, Trash2, Edit2, 
  X, UploadCloud, Database, Save, LayoutGrid, GlassWater, Wine, Layers, ToggleLeft, ToggleRight, LogOut, FileBarChart, Bell
} from "lucide-react";
import { toast } from "sonner";
import { logoutStaff } from "@/app/actions/staff-auth";
import { getKitchenTickets } from "@/app/actions/kitchen"; 
import { 
    getKitchenMenuData, saveKitchenCategory, deleteKitchenCategory, 
    saveKitchenItem, deleteKitchenItem, quickToggleItem 
} from "@/app/actions/kitchen-menu";
import { getDashboardData } from "@/app/actions/dashboard"; 

// --- CONFIGURATION ---
const CLOUDINARY_CLOUD_NAME = "dczy4dbgc"; 
const CLOUDINARY_UPLOAD_PRESET = "gecko_preset"; 
const ALERT_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

// --- TYPES ---
interface Variant { name: string; price: number; }
interface MenuItem { 
    id: string; name: string; description: string; price: number; 
    sub_category?: string;
    image_url: string; is_available: boolean; dietary: string; station: string; 
    variants: Variant[];
}
interface Category { id: string; category_name: string; items: MenuItem[]; }

// --- IMAGE COMPRESSION ---
async function compressImage(file: File): Promise<File> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800; 
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                    if (blob) resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
                    else resolve(file);
                }, 'image/jpeg', 0.7);
            }
        }
    });
}

// --- MAIN PAGE ---
export default function BartenderMenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formSubCat, setFormSubCat] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formImage, setFormImage] = useState("");
  const [formDietary, setFormDietary] = useState("drinks");
  const [formStation, setFormStation] = useState("bar");
  const [formAvailable, setFormAvailable] = useState(true);
  const [variants, setVariants] = useState<Variant[]>([{ name: "", price: 0 }]);

  const catInputRef = useRef<HTMLInputElement>(null);

  // NOTIFICATION STATE 
  const [latestOrderTable, setLatestOrderTable] = useState<string | null>(null);
  const prevTicketIds = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isFirstLoad = useRef(true);

  // --- INIT & POLLING ---
  useEffect(() => { 
      loadData(); 

      const audio = new Audio(ALERT_SOUND);
      audio.volume = 1.0;
      audio.loop = true; 
      audioRef.current = audio;

      pollForNewOrders();
      const pollInterval = setInterval(pollForNewOrders, 3000);
      return () => clearInterval(pollInterval);
  }, []);

  async function loadData() {
    setLoading(true);
    
    // Fetch Tenant settings to check KOT/BOT Split Status
    const dashRes = await getDashboardData();
    const splitEnabled = dashRes?.tenant?.feature_flags?.split_kot_bot === true;

    const res = await getKitchenMenuData();
    if(res.success && res.categories) {
      
      let filteredCategories = res.categories;

      if (splitEnabled) {
          filteredCategories = res.categories.map((cat: any) => {
              const safeItems = cat.items.filter((item: any) => {
                  const category = (item.category || item.dietary || '').toLowerCase();
                  const itemName = (item.name || '').toLowerCase();
                  const station = (item.station || '').toLowerCase();

                  if (station === 'bar' || station === 'bot') return true;
                  if (category.includes('drink') || category.includes('bar') || category.includes('beverage') || category.includes('liquor')) return true;

                  const botKeywords = [
                      'hookah', 'shisha', 'cigarette', 'smoke', 'coal', 'cigar',
                      'coke', 'sprite', 'fanta', 'pepsi', 'dew', 'red bull', 'sting',
                      'mojito', 'beer', 'wine', 'vodka', 'whiskey', 'rum', 'gin', 'tequila', 
                      'cocktail', 'mocktail', 'juice', 'shake', 'smoothie', 'water',
                      'tea', 'coffee', 'latte', 'espresso', 'americano', 'cappuccino'
                  ];

                  if (botKeywords.some(keyword => itemName.includes(keyword))) return true;

                  return false; // Hide food from the bartender menu
              });

              return { ...cat, items: safeItems };
          }).filter((cat: any) => cat.items.length > 0); 
      }

      setCategories(filteredCategories);
      
      if(filteredCategories.length > 0) {
          const savedId = localStorage.getItem("gecko_bar_cat");
          const exists = filteredCategories.find((c: any) => c.id === savedId);
          setActiveTabId(exists ? savedId! : filteredCategories[0].id);
      }
    }
    setLoading(false);
  }

  // --- LIVE ORDER POLLING ---
  const pollForNewOrders = async () => {
    try {
        const kdsRes = await getKitchenTickets();
        if (kdsRes.success && Array.isArray(kdsRes.data)) {
            const currentIds = new Set(kdsRes.data.map(t => t.id));
            
            if (!isFirstLoad.current) {
                const newTicket = kdsRes.data.find(t => 
                    t.status === 'pending' && !prevTicketIds.current.has(t.id)
                );
                if (newTicket) triggerAlert(newTicket.table_name);
            }
            
            isFirstLoad.current = false;
            prevTicketIds.current = currentIds;
        }
    } catch (e) {}
  };

  const triggerAlert = (tableName: string) => {
    setLatestOrderTable(tableName);
    if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.log("Audio play blocked", e));
    }
  };

  const stopAlert = () => {
      setLatestOrderTable(null);
      if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
      }
  };

  // --- ACTIONS ---
  async function handleAddCategory(name?: string) {
    const catName = name || catInputRef.current?.value;
    if(!catName) return;
    setIsSubmitting(true);
    const res = await saveKitchenCategory(null, catName);
    if(res.success) { await loadData(); setIsCatModalOpen(false); toast.success("Category Created"); }
    setIsSubmitting(false);
  }

  async function handleDeleteCategory(catId: string) {
      if(!window.confirm("Delete this category and all its items?")) return;
      await deleteKitchenCategory(catId);
      loadData();
      toast.success("Category Deleted");
  }

  async function handleSaveItem(e: React.FormEvent) {
    e.preventDefault();
    if (!activeTabId) return toast.error("Select a category first");
    setIsSubmitting(true);
    
    const validVariants = variants.filter(v => v.name.trim() !== "");
    const basePrice = validVariants.length > 0 ? Math.min(...validVariants.map(v => v.price)) : 0;

    const payload = {
        id: editingItem?.id,
        name: formName,
        sub_category: formSubCat,
        description: formDesc,
        price: basePrice,
        image_url: formImage,
        dietary: formDietary,
        station: formStation,
        variants: validVariants,
        is_available: formAvailable
    };

    const res = await saveKitchenItem(activeTabId, payload);
    if(res.success) { await loadData(); setIsItemModalOpen(false); toast.success(editingItem ? "Updated" : "Created"); }
    else { toast.error("Error: " + res.error); }
    setIsSubmitting(false);
  }

  async function handleDeleteItem(itemId: string) {
      if(!window.confirm("Delete drink?")) return;
      await deleteKitchenItem(activeTabId, itemId); 
      loadData();
      toast.success("Deleted");
  }

  async function handleQuickToggle(item: MenuItem) {
      const newCats = categories.map(c => c.id === activeTabId ? { 
          ...c, items: c.items.map(i => i.id === item.id ? { ...i, is_available: !i.is_available } : i) 
      } : c);
      setCategories(newCats);
      await quickToggleItem(activeTabId, item.id, !item.is_available); 
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const toastId = toast.loading("Uploading image...");
    try {
        const compressedFile = await compressImage(file);
        const formData = new FormData();
        formData.append("file", compressedFile);
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
        const data = await res.json();
        if (data.secure_url) { setFormImage(data.secure_url); toast.success("Uploaded!", { id: toastId }); }
    } catch (error) { toast.error("Upload Failed", { id: toastId }); }
    setIsUploading(false);
  };

  const openEdit = (item: MenuItem) => {
      setEditingItem(item);
      setFormName(item.name);
      setFormSubCat(item.sub_category || "");
      setFormDesc(item.description);
      setFormImage(item.image_url);
      setFormDietary(item.dietary || "drinks");
      setFormStation(item.station || "bar");
      setFormAvailable(item.is_available);
      setVariants(item.variants && item.variants.length > 0 ? item.variants : [{ name: "", price: 0 }]);
      setIsItemModalOpen(true);
  };

  const setTab = (id: string) => { setActiveTabId(id); localStorage.setItem("gecko_bar_cat", id); }

  const addVariant = () => setVariants([...variants, { name: "", price: 0 }]);
  const updateVariant = (idx: number, field: keyof Variant, val: any) => {
      const newV = [...variants];
      // @ts-ignore
      newV[idx][field] = val;
      setVariants(newV);
  };
  const removeVariant = (idx: number) => setVariants(variants.filter((_, i) => i !== idx));

  const activeCategory = categories.find(c => c.id === activeTabId);
  
  // FIX: Properly typed itemsToDisplay 
  const itemsToDisplay: MenuItem[] = activeCategory?.items?.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase())) || [];

  if (loading) return (
      <div className="w-full h-full flex flex-col gap-4 items-center justify-center bg-[#F8FAFC]">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
          <span className="text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">Syncing Bar Menu...</span>
      </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#F8FAFC]">
        
        {/* LIVE ALERT BANNER */}
        <AnimatePresence>
            {latestOrderTable && (
                <motion.div 
                    initial={{ y: -120 }} animate={{ y: 0 }} exit={{ y: -120 }}
                    className="fixed top-0 left-0 right-0 bg-red-500 flex items-center justify-between px-6 py-4 z-[100] text-white shadow-2xl cursor-pointer"
                    onClick={stopAlert}
                >
                    <div className="flex items-center gap-4 animate-pulse">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <Bell className="w-5 h-5 fill-current" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold opacity-90 uppercase tracking-widest">New Order Received</p>
                            <h3 className="text-xl md:text-2xl font-black leading-none">{latestOrderTable}</h3>
                        </div>
                    </div>
                    <button className="bg-white text-red-600 px-5 py-2.5 rounded-full font-black text-xs shadow-lg uppercase tracking-wider active:scale-95 transition-transform">
                        Acknowledge
                    </button>
                </motion.div>
            )}
        </AnimatePresence>

        <header className="flex-shrink-0 px-4 md:px-8 py-4 bg-white/90 backdrop-blur-xl border-b border-slate-200 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 z-20 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center shadow-inner border border-emerald-100"><Database className="w-5 h-5 text-emerald-600" /></div>
                <div>
                    <h1 className="text-xl font-black text-slate-900 leading-tight">Bar Menu Manager</h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Mixology Edition</p>
                </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto items-center">
                <div className="relative group w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                    <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search drinks..." className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 shadow-[0_2px_10px_rgb(0,0,0,0.02)] rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 transition-all outline-none" />
                </div>
                
                <button onClick={() => { setEditingItem(null); setFormName(""); setFormDesc(""); setFormImage(""); setFormDietary("drinks"); setFormStation("bar"); setFormAvailable(true); setVariants([{name:"", price:0}]); setIsItemModalOpen(true); }} disabled={!activeTabId} className="w-full md:w-auto h-11 px-5 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap">
                    <Plus className="w-4 h-4" /> <span className="hidden md:inline">New Drink</span>
                </button>
            </div>
        </header>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden pb-[100px] md:pb-0">
            <div className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex-shrink-0 flex md:flex-col overflow-x-auto md:overflow-y-auto no-scrollbar p-3 md:p-5 gap-2 z-10 shadow-[4px_0_24px_rgb(0,0,0,0.02)]">
                <button onClick={() => setIsCatModalOpen(true)} className="flex-shrink-0 w-auto md:w-full h-11 md:h-12 px-4 border-2 border-dashed border-emerald-200 bg-emerald-50/50 rounded-xl flex items-center justify-center text-emerald-600 font-bold text-xs uppercase tracking-wider hover:bg-emerald-100 transition-all whitespace-nowrap">
                    <Plus className="w-4 h-4 mr-1.5" /> Category
                </button>
                <div className="w-full h-[1px] bg-slate-100 my-2 hidden md:block"></div>
                {categories.map(cat => (
                    <button key={cat.id} onClick={() => setTab(cat.id)} className={`flex-shrink-0 w-auto md:w-full text-left px-4 py-2.5 md:py-3.5 rounded-xl transition-all flex items-center gap-3 group border ${activeTabId === cat.id ? 'bg-slate-900 text-white shadow-lg border-slate-800' : 'bg-white text-slate-600 border-transparent hover:bg-slate-50 hover:border-slate-200'}`}>
                        <span className="font-bold text-sm truncate max-w-[120px] md:max-w-full">{cat.category_name}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ml-auto ${activeTabId === cat.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>{cat.items?.length || 0}</span>
                        {activeTabId === cat.id && <Trash2 onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }} className="w-3.5 h-3.5 text-red-400 hover:text-red-500 md:hidden group-hover:block ml-1 transition-colors" />}
                    </button>
                ))}
            </div>

            <div className="flex-1 bg-[#F8FAFC] p-4 md:p-8 overflow-y-auto custom-scrollbar">
                {itemsToDisplay.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50 min-h-[300px]">
                        <GlassWater className="w-16 h-16 mb-4" />
                        <p className="font-black text-lg">No drinks found.</p>
                        <p className="text-xs font-bold uppercase tracking-widest mt-1">Try changing your filters</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-6">
                        <AnimatePresence>
                            {itemsToDisplay.map((item) => (
                                <ItemCard key={item.id} item={item} onEdit={() => openEdit(item)} onDelete={() => handleDeleteItem(item.id)} onToggle={() => handleQuickToggle(item)} />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>

        {/* --- MODALS --- */}
        <AnimatePresence>
            {isCatModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsCatModalOpen(false)} />
                    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-sm rounded-[2rem] p-6 md:p-8 shadow-2xl relative z-10 border border-slate-100">
                        <h3 className="text-2xl font-black text-slate-900 mb-6">New Category</h3>
                        <input ref={catInputRef} autoFocus placeholder="e.g. Cocktails, Hookah" className="w-full h-14 px-5 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none mb-6 focus:ring-4 focus:ring-emerald-50 focus:border-emerald-400 transition-all text-lg" />
                        <div className="flex gap-3">
                            <button onClick={() => setIsCatModalOpen(false)} className="flex-1 h-12 rounded-xl font-bold text-slate-500 hover:bg-slate-50 border border-slate-200 transition-colors">Cancel</button>
                            <button onClick={() => handleAddCategory()} disabled={isSubmitting} className="flex-[2] h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black shadow-lg shadow-emerald-500/20 flex items-center justify-center transition-colors">
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Create"}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
            
            {isItemModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsItemModalOpen(false)} />
                    <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 p-6 md:p-8 border border-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{editingItem ? "Edit Drink" : "New Drink/Hookah"}</h2>
                            <button type="button" onClick={() => setIsItemModalOpen(false)} className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                        </div>
                        
                        <form onSubmit={handleSaveItem} className="space-y-5">
                            {/* IMAGE */}
                            <div className="group relative w-full h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[1.5rem] flex items-center justify-center overflow-hidden cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors">
                                {formImage ? <img src={formImage} className="w-full h-full object-cover" /> : <div className="text-slate-400 font-bold flex flex-col items-center group-hover:text-emerald-500 transition-colors"><UploadCloud className="w-8 h-8 mb-2" /> Upload Photo</div>}
                                <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                {isUploading && <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col gap-2 items-center justify-center"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /><span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Processing...</span></div>}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-1.5 block">Name</label>
                                    <input value={formName} onChange={e => setFormName(e.target.value)} required placeholder="e.g. Classic Mojito" className="w-full h-12 px-4 bg-white border border-slate-200 shadow-sm rounded-xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-emerald-50 focus:border-emerald-400 transition-all" />
                                </div>
                            </div>
                            
                            {/* FIX: Removed Tailwind conflict (flex and hidden) */}
                            <div className="hidden gap-4">
                                <input value={formDietary} onChange={e => setFormDietary(e.target.value)} />
                                <input value={formStation} onChange={e => setFormStation(e.target.value)} />
                            </div>

                            <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100">
                                <div className="flex justify-between items-center mb-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-slate-400" /> Variants & Pricing</label>
                                    <button type="button" onClick={addVariant} className="text-[10px] font-black uppercase tracking-wider bg-white border border-slate-200 shadow-sm px-3 py-1.5 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors">+ Add Size</button>
                                </div>
                                <div className="space-y-3">
                                    {variants.map((v, i) => (
                                        <div key={i} className="flex gap-2">
                                            <input value={v.name} onChange={e => updateVariant(i, "name", e.target.value)} placeholder="Type (e.g. Pitcher, Glass)" className="flex-1 h-11 px-4 rounded-xl border border-slate-200 text-sm font-bold outline-none focus:border-emerald-400" />
                                            <div className="relative w-28">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rs</span>
                                                <input type="number" value={v.price || ""} onChange={e => updateVariant(i, "price", e.target.value)} placeholder="0" className="w-full h-11 pl-8 pr-3 rounded-xl border border-slate-200 text-sm font-black text-slate-900 outline-none focus:border-emerald-400" />
                                            </div>
                                            {variants.length > 1 && <button type="button" onClick={() => removeVariant(i)} className="w-11 h-11 flex items-center justify-center text-red-400 bg-white border border-slate-200 rounded-xl hover:bg-red-50 hover:border-red-200 transition-colors"><X className="w-4 h-4" /></button>}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-5 bg-white border border-slate-200 shadow-sm rounded-[1.5rem]">
                                <div><span className="font-black text-sm text-slate-900 block">Available to Order?</span><span className="text-[10px] font-bold text-slate-400">Turn off if out of stock</span></div>
                                <button type="button" onClick={() => setFormAvailable(!formAvailable)} className={`text-[40px] leading-none transition-colors ${formAvailable ? 'text-emerald-500' : 'text-slate-300'}`}>
                                    {formAvailable ? <ToggleRight width="1em" height="1em" /> : <ToggleLeft width="1em" height="1em" />}
                                </button>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex gap-3">
                                <button type="button" onClick={() => setIsItemModalOpen(false)} className="flex-1 h-14 rounded-2xl border-2 border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition-colors">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="flex-[2] h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-emerald-600/30 transition-all active:scale-95 flex items-center justify-center gap-2">
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Save</>}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </div>
  );
}

// --- PREMIUM MOBILE-OPTIMIZED ITEM CARD ---
function ItemCard({ item, onEdit, onDelete, onToggle }: { item: MenuItem; onEdit: () => void; onDelete: () => void; onToggle: () => void }) {
    const prices: number[] = item.variants?.map((v: Variant) => v.price) || [];
    const priceDisplay = prices.length > 1 ? `Rs ${Math.min(...prices)} - ${Math.max(...prices)}` : `Rs ${item.price}`;

    return (
        <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} 
            className={`bg-white p-3 md:p-4 rounded-[1.5rem] md:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl transition-all group flex flex-col h-full border border-slate-100 ${item.is_available ? '' : 'bg-red-50/10 opacity-90'}`}
        >
            <div className="relative aspect-[4/3] bg-slate-100 rounded-xl md:rounded-2xl overflow-hidden mb-3 shadow-inner">
                {item.image_url ? (
                    <img src={item.image_url} className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${!item.is_available && 'grayscale opacity-60'}`} />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50"><ImageIcon className="w-8 h-8 md:w-10 md:h-10 opacity-50" /></div>
                )}
                {!item.is_available && <div className="absolute inset-0 bg-red-900/30 flex items-center justify-center text-white font-black text-[10px] md:text-xs uppercase tracking-widest backdrop-blur-sm border-2 border-red-500/50 rounded-xl md:rounded-2xl">Sold Out</div>}
                <div className={`absolute top-2 left-2 px-2 py-1 rounded-lg shadow-sm text-[9px] md:text-[10px] font-black uppercase tracking-wider flex items-center gap-1 bg-blue-100 text-blue-700`}><GlassWater className="w-3 h-3" /></div>
            </div>
            
            <div className="flex-1 flex flex-col">
                <h4 className="font-black text-slate-900 text-sm md:text-lg leading-tight line-clamp-2 pr-1 mb-1.5">{item.name}</h4>
                {item.sub_category && <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-2 py-1 rounded-md mb-2 w-fit">{item.sub_category}</span>}
                
                <div className="flex items-center gap-1.5 md:gap-2 mt-auto pt-1">
                    <span className="text-emerald-600 font-black text-xs md:text-sm">{priceDisplay}</span>
                    {item.variants?.length > 1 && <span className="text-[8px] md:text-[9px] bg-slate-100 px-1.5 md:px-2 py-1 rounded-md font-bold text-slate-500 flex items-center gap-1"><Layers className="w-2.5 h-2.5 md:w-3 md:h-3" /> {item.variants.length} Sizes</span>}
                </div>
            </div>
            
            <div className="flex gap-1.5 md:gap-2 border-t border-slate-100 pt-2.5 md:pt-3 mt-3">
                <button onClick={onToggle} className={`flex-1 h-9 md:h-10 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black text-white transition-all shadow-sm active:scale-95 uppercase tracking-wider ${item.is_available ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'}`}>
                    {item.is_available ? "Hide" : "Show"}
                </button>
                <button onClick={onEdit} className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-lg md:rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-900 hover:text-white transition-all border border-slate-200 hover:border-slate-900 active:scale-95 shrink-0"><Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
                <button onClick={onDelete} className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-lg md:rounded-xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all border border-red-100 hover:border-red-500 active:scale-95 shrink-0"><Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
            </div>
        </motion.div>
    );
}