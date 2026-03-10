"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/app/admin/Sidebar"; 
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Search, Image as ImageIcon, Loader2, Trash2, Edit2, 
  X, UploadCloud, FileText, Tag, Database, Save, LayoutGrid,
  ChefHat, Wine, Coffee, Leaf, Beef, GlassWater, Layers, ToggleLeft, ToggleRight, Wind, Cigarette,
  ChevronDown
} from "lucide-react";
import { toast } from "sonner";
import { getDashboardData } from "@/app/actions/dashboard";
import { getMenuData, saveCategory, deleteCategory, saveMenuItem, deleteMenuItem, toggleItemAvailability } from "@/app/actions/menu-optimized";

// --- CONFIGURATION ---
const CLOUDINARY_CLOUD_NAME = "dczy4dbgc"; 
const CLOUDINARY_UPLOAD_PRESET = "gecko_preset"; 

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

// --- PREMIUM CUSTOM SELECT COMPONENT ---
function PremiumSelect({ value, onChange, options, label, icon: Icon }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find((o: any) => o.value === value) || options[0];
    const selectRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative flex-1" ref={selectRef}>
<label className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-400 ml-1 mb-1">                {Icon && <Icon className="w-3 h-3" />} {label}
            </label>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full h-12 px-4 bg-slate-50 border rounded-xl font-bold text-slate-700 flex items-center justify-between cursor-pointer transition-all ${isOpen ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-slate-300'}`}
            >
                <div className="flex items-center gap-2">
                    <span className="text-lg leading-none">{selectedOption.emoji}</span>
                    <span>{selectedOption.label}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute top-[calc(100%+8px)] left-0 w-full bg-white border border-slate-100 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] z-50 overflow-hidden"
                    >
                        {options.map((opt: any) => (
                            <div 
                                key={opt.value}
                                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                                className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors ${value === opt.value ? 'bg-emerald-50 text-emerald-700 font-black' : 'hover:bg-slate-50 text-slate-600 font-bold'}`}
                            >
                                <span className="text-lg leading-none">{opt.emoji}</span>
                                {opt.label}
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function AdminMenuPage() {
  const [tenant, setTenant] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  
  // FILTERS
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStation, setFilterStation] = useState<"all" | "kitchen" | "bar" | "coffee">("all");
  
  // MODALS
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // ITEM FORM
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState<number>(0); 
  const [formSubCat, setFormSubCat] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formImage, setFormImage] = useState("");
  const [formDietary, setFormDietary] = useState("non-veg");
  const [formStation, setFormStation] = useState("kitchen");
  const [formAvailable, setFormAvailable] = useState(true);
  const [variants, setVariants] = useState<Variant[]>([]);

  const catInputRef = useRef<HTMLInputElement>(null);

  // --- INIT ---
  useEffect(() => { 
      const saved = localStorage.getItem("gecko_active_cat");
      if (saved && !saved.includes("-")) localStorage.removeItem("gecko_active_cat");
      loadData(); 
  }, []);

  async function loadData() {
    const [dashRes, menuRes] = await Promise.all([getDashboardData(), getMenuData()]);
    if(dashRes) setTenant(dashRes.tenant);
    if(menuRes.success && menuRes.categories) {
      setCategories(menuRes.categories);
      if(menuRes.categories.length > 0) {
          const savedId = localStorage.getItem("gecko_active_cat");
          const exists = menuRes.categories.find((c: any) => c.id === savedId);
          setActiveTabId(exists ? savedId! : menuRes.categories[0].id);
      }
    }
    setLoading(false);
  }

  // --- ACTIONS ---
  async function handleAddCategory(name?: string) {
    const catName = name || catInputRef.current?.value;
    if(!catName) return;
    setIsSubmitting(true);
    const res = await saveCategory(null, catName);
    if(res.success) { await loadData(); setIsCatModalOpen(false); toast.success("Category Created"); }
    setIsSubmitting(false);
  }

  async function handleDeleteCategory(catId: string) {
      if(!confirm("Delete this category?")) return;
      await deleteCategory(catId);
      loadData();
      toast.success("Category Deleted");
  }

  async function handleSaveItem(e: React.FormEvent) {
    e.preventDefault();
    if (!activeTabId) return toast.error("Select a category first");
    setIsSubmitting(true);
    
    const validVariants = variants.filter(v => v.name.trim() !== "");
    const basePrice = validVariants.length > 0 
        ? Math.min(...validVariants.map(v => v.price)) 
        : Number(formPrice);

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

    const res = await saveMenuItem(activeTabId, payload);
    if(res.success) { await loadData(); setIsItemModalOpen(false); toast.success(editingItem ? "Updated" : "Created"); }
    else { toast.error("Error: " + res.error); }
    setIsSubmitting(false);
  }

  async function handleDeleteItem(itemId: string) {
      if(!confirm("Delete dish?")) return;
      await deleteMenuItem(activeTabId, itemId);
      loadData();
      toast.success("Deleted");
  }

  async function handleQuickToggle(item: MenuItem) {
      const newCats = categories.map(c => c.id === activeTabId ? { ...c, items: c.items.map(i => i.id === item.id ? { ...i, is_available: !i.is_available } : i) } : c);
      setCategories(newCats);
      await toggleItemAvailability(activeTabId, item.id);
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
        const compressedFile = await compressImage(file);
        const formData = new FormData();
        formData.append("file", compressedFile);
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
        const data = await res.json();
        if (data.secure_url) { setFormImage(data.secure_url); toast.success("Uploaded"); }
    } catch (error) { toast.error("Upload Failed"); }
    setIsUploading(false);
  };

  const openEdit = (item: MenuItem) => {
      setEditingItem(item);
      setFormName(item.name);
      setFormPrice(item.price || 0);
      setFormSubCat(item.sub_category || "");
      setFormDesc(item.description);
      setFormImage(item.image_url);
      setFormDietary(item.dietary || "non-veg");
      setFormStation(item.station || "kitchen");
      setFormAvailable(item.is_available);
      setVariants(item.variants && item.variants.length > 0 ? item.variants : []);
      setIsItemModalOpen(true);
  };

  const setTab = (id: string) => { setActiveTabId(id); localStorage.setItem("gecko_active_cat", id); }

  const addVariant = () => setVariants([...variants, { name: "", price: 0 }]);
  const updateVariant = (idx: number, field: keyof Variant, val: any) => {
      const newV = [...variants];
      // @ts-ignore
      newV[idx][field] = val;
      setVariants(newV);
  };
  const removeVariant = (idx: number) => setVariants(variants.filter((_, i) => i !== idx));

  const activeCategory = categories.find(c => c.id === activeTabId);
  const itemsToDisplay = activeCategory?.items
    .filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(i => filterStation === "all" || i.station === filterStation) || [];

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]"><Loader2 className="w-10 h-10 text-emerald-500 animate-spin" /></div>;

  // PREMIUM DROPDOWN OPTIONS
  const dietaryOptions = [
      { value: "non-veg", label: "Non-Veg", emoji: "🍗" },
      { value: "veg", label: "Veg", emoji: "🥬" },
      { value: "drinks", label: "Drinks", emoji: "🥤" },
      { value: "hookah", label: "Hookah", emoji: "💨" },
      { value: "tobacco", label: "Tobacco", emoji: "🚬" },
  ];

  const stationOptions = [
      { value: "kitchen", label: "Kitchen", emoji: "👨‍🍳" },
      { value: "bar", label: "Bar", emoji: "🍷" },
      { value: "coffee", label: "Coffee", emoji: "☕" },
  ];

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden">
      <Sidebar tenantName={tenant?.name} tenantCode={tenant?.code} logo={tenant?.logo_url} />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="flex-shrink-0 px-4 md:px-8 py-4 bg-white/90 backdrop-blur-md border-b border-slate-200 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 z-20">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/20"><Database className="w-5 h-5 text-emerald-400" /></div>
                <div><h1 className="text-xl font-black text-slate-900 leading-tight">Menu Master</h1><p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Storage Saver Active</p></div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto items-center">
                <div className="flex p-1 bg-slate-100 rounded-xl w-full md:w-auto">
                    <button onClick={() => setFilterStation("all")} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterStation === "all" ? "bg-white shadow text-slate-900" : "text-slate-500"}`}>All</button>
                    <button onClick={() => setFilterStation("kitchen")} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${filterStation === "kitchen" ? "bg-white shadow text-orange-600" : "text-slate-500"}`}><ChefHat className="w-3 h-3" /> Kitchen</button>
                    <button onClick={() => setFilterStation("bar")} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${filterStation === "bar" ? "bg-white shadow text-violet-600" : "text-slate-500"}`}><Wine className="w-3 h-3" /> Bar</button>
                    <button onClick={() => setFilterStation("coffee")} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${filterStation === "coffee" ? "bg-white shadow text-amber-700" : "text-slate-500"}`}><Coffee className="w-3 h-3" /> Coffee</button>
                </div>

                <div className="relative group w-full md:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="w-full h-10 pl-10 pr-4 bg-slate-100 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all outline-none" /></div>
                
                <button onClick={() => { setEditingItem(null); setFormName(""); setFormPrice(0); setFormDesc(""); setFormImage(""); setFormDietary("non-veg"); setFormStation("kitchen"); setFormAvailable(true); setVariants([]); setIsItemModalOpen(true); }} disabled={!activeTabId} className="w-full md:w-auto h-10 px-4 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap"><Plus className="w-4 h-4" /> <span className="hidden md:inline">Dish</span></button>
            </div>
        </header>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* NAV */}
            <div className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex-shrink-0 flex md:flex-col overflow-x-auto md:overflow-y-auto no-scrollbar p-2 md:p-4 gap-2 z-10">
                <button onClick={() => setIsCatModalOpen(true)} className="flex-shrink-0 w-auto md:w-full h-10 md:h-12 px-4 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 font-bold text-xs uppercase hover:border-slate-900 hover:text-slate-900 transition-all whitespace-nowrap"><Plus className="w-4 h-4 mr-2" /> New Category</button>
                
                {/* PRESET CATEGORIES */}
                <div className="flex md:flex-col gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
                    {["Veg Items", "Non-Veg Items", "Bar & Drinks", "Specials", "Hookah"].map(p => (
                        <button key={p} onClick={() => handleAddCategory(p)} className="flex-shrink-0 px-3 py-1.5 md:py-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors whitespace-nowrap">+ {p}</button>
                    ))}
                </div>
                
                <div className="w-full h-[1px] bg-slate-100 my-1 hidden md:block"></div>
                
                {categories.map(cat => (
                    <button key={cat.id} onClick={() => setTab(cat.id)} className={`flex-shrink-0 w-auto md:w-full text-left px-4 py-2 md:py-3 rounded-xl transition-all flex items-center gap-3 group ${activeTabId === cat.id ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                        <span className="font-bold text-sm truncate max-w-[120px] md:max-w-full">{cat.category_name}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ml-auto ${activeTabId === cat.id ? 'bg-white/20' : 'bg-white'}`}>{cat.items?.length || 0}</span>
                        {activeTabId === cat.id && <Trash2 onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }} className="w-3 h-3 text-red-400 hover:text-white md:hidden group-hover:block ml-2" />}
                    </button>
                ))}
            </div>

            {/* GRID */}
            <div className="flex-1 bg-[#F8FAFC] p-4 md:p-8 overflow-y-auto custom-scrollbar">
                {itemsToDisplay.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50 min-h-[300px]"><LayoutGrid className="w-16 h-16 mb-4" /><p className="font-bold">No dishes here yet.</p></div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 pb-20">
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsCatModalOpen(false)} />
                    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative z-10">
                        <h3 className="text-lg font-black text-slate-900 mb-4">New Category</h3>
                        <input ref={catInputRef} autoFocus placeholder="e.g. Starters" className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none mb-4 focus:ring-2 focus:ring-emerald-500" />
                        <div className="flex gap-2"><button onClick={() => setIsCatModalOpen(false)} className="flex-1 h-12 rounded-xl font-bold text-slate-500 hover:bg-slate-50">Cancel</button><button onClick={() => handleAddCategory()} disabled={isSubmitting} className="flex-1 h-12 bg-slate-900 text-white rounded-xl font-bold shadow-lg flex items-center justify-center">{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Create"}</button></div>
                    </motion.div>
                </div>
            )}
            
            {isItemModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsItemModalOpen(false)} />
                    <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 p-6 md:p-8 border border-slate-100 max-h-[85vh] overflow-visible custom-scrollbar flex flex-col">
                        <div className="flex justify-between items-center mb-6 shrink-0"><h2 className="text-2xl font-black">{editingItem ? "Edit Dish" : "New Dish"}</h2><button onClick={() => setIsItemModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button></div>
                        <form onSubmit={handleSaveItem} className="space-y-4 overflow-y-auto pr-2 pb-2 custom-scrollbar">
                            {/* IMAGE */}
                            <div className="group relative w-full h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden cursor-pointer hover:border-emerald-500 transition-colors">
                                {formImage ? <img src={formImage} className="w-full h-full object-cover" /> : <div className="text-slate-400 font-bold flex flex-col items-center"><UploadCloud className="w-6 h-6 mb-1" /> Photo</div>}
                                <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                {isUploading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="w-6 h-6 text-emerald-500 animate-spin" /></div>}
                            </div>
                            
                            {/* NAME & PRICE SECTION */}
                            <div className="grid grid-cols-2 gap-4 relative z-0">
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Name</label>
                                    <input value={formName} onChange={e => setFormName(e.target.value)} required placeholder="Item Name" className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all" />
                                </div>
                                
                                <div className={variants.length > 0 ? "opacity-50 pointer-events-none" : ""}>
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">
                                        {variants.length > 0 ? "Price (Derived)" : "Base Price (Rs)"}
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-black">Rs</span>
                                        <input 
                                            type="number" 
                                            value={formPrice || ""} 
                                            onChange={e => setFormPrice(Number(e.target.value))} 
                                            disabled={variants.length > 0}
                                            placeholder="0" 
                                            className="w-full h-12 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all" 
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Sub-Category</label>
                                    <input value={formSubCat} onChange={e => setFormSubCat(e.target.value)} placeholder="e.g. Spicy" className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all" />
                                </div>
                            </div>
                            
                            {/* META (PREMIUM CUSTOM DROPDOWNS) */}
                            <div className="flex gap-3 relative z-50">
                                <PremiumSelect 
                                    label="Dietary Type" 
                                    value={formDietary} 
                                    onChange={setFormDietary} 
                                    options={dietaryOptions} 
                                />
                                <PremiumSelect 
                                    label="Prep Station" 
                                    value={formStation} 
                                    onChange={setFormStation} 
                                    options={stationOptions} 
                                />
                            </div>

                            {/* VARIANTS BUILDER */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner mt-2 relative z-0">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> Variants / Pricing</label>
                                    <button type="button" onClick={addVariant} className="text-[10px] font-black bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 hover:border-emerald-200 text-emerald-600 shadow-sm transition-all active:scale-95">+ Add Variant</button>
                                </div>
                                {variants.map((v, i) => (
                                    <div key={i} className="flex gap-2 mb-2">
                                        <input value={v.name} onChange={e => updateVariant(i, "name", e.target.value)} placeholder="Type (e.g. Steam)" className="flex-1 h-11 px-3 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" />
                                        <div className="relative w-28">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">Rs</span>
                                            <input type="number" value={v.price || ""} onChange={e => updateVariant(i, "price", e.target.value)} placeholder="0" className="w-full h-11 pl-8 pr-2 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" />
                                        </div>
                                        {variants.length > 0 && <button type="button" onClick={() => removeVariant(i)} className="w-11 h-11 flex items-center justify-center text-red-400 bg-white border border-slate-200 rounded-xl hover:bg-red-50 hover:border-red-200 transition-colors shrink-0"><X className="w-4 h-4" /></button>}
                                    </div>
                                ))}
                                {variants.length === 0 && <p className="text-[10px] text-slate-400 text-center py-3 italic font-medium border-2 border-dashed border-slate-200 rounded-xl mt-2 bg-white/50">Using base price. Add variants here to override.</p>}
                            </div>

                            {/* AVAILABILITY TOGGLE */}
                            <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-sm relative z-0">
                                <span className="font-bold text-sm text-slate-700">Available to Order?</span>
                                <button type="button" onClick={() => setFormAvailable(!formAvailable)} className={`text-2xl transition-transform active:scale-90 ${formAvailable ? 'text-emerald-500' : 'text-slate-300'}`}>{formAvailable ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9" />}</button>
                            </div>

                            <div className="relative z-0">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Description</label>
                                <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Details..." className="w-full h-24 p-4 bg-slate-50 rounded-xl font-bold resize-none text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 border border-slate-200" />
                            </div>
                            
                            <div className="pt-2 flex gap-3 shrink-0 relative z-0">
                                <button type="button" onClick={() => setIsItemModalOpen(false)} className="flex-1 h-14 rounded-xl border border-slate-200 font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="flex-[2] h-14 bg-slate-900 text-white rounded-xl font-black text-lg shadow-xl shadow-slate-900/20 hover:bg-emerald-600 hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Save Dish</>}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function ItemCard({ item, onEdit, onDelete, onToggle }: any) {
    const dietaryType = item.dietary || 'non-veg';
    
    let BadgeIcon = Beef;
    let badgeColor = 'bg-red-100 text-red-700 border-red-200';
    if(dietaryType === 'veg') { BadgeIcon = Leaf; badgeColor = 'bg-green-100 text-green-700 border-green-200'; }
    else if(dietaryType === 'drinks') { BadgeIcon = GlassWater; badgeColor = 'bg-blue-100 text-blue-700 border-blue-200'; }
    else if(dietaryType === 'hookah') { BadgeIcon = Wind; badgeColor = 'bg-orange-100 text-orange-700 border-orange-200'; }
    else if(dietaryType === 'tobacco') { BadgeIcon = Cigarette; badgeColor = 'bg-slate-200 text-slate-700 border-slate-300'; }

    const prices = item.variants?.map((v:any) => v.price) || [];
    const priceDisplay = prices.length > 1 ? `Rs ${Math.min(...prices)} - ${Math.max(...prices)}` : `Rs ${item.price}`;

    return (
        <motion.div layout className={`bg-white p-3 rounded-[1.5rem] border shadow-sm hover:shadow-xl transition-all group flex flex-col h-full relative overflow-hidden ${item.is_available ? 'border-slate-100' : 'border-red-100 opacity-80'}`}>
            <div className="relative aspect-[4/3] bg-slate-50 rounded-xl overflow-hidden mb-3 border border-slate-100">
                {item.image_url ? <img src={item.image_url} className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${!item.is_available && 'grayscale'}`} /> : <div className="w-full h-full flex flex-col items-center justify-center text-slate-300"><ImageIcon className="w-8 h-8 mb-1 opacity-50" /></div>}
                
                {/* Sold Out Overlay */}
                {!item.is_available && <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white font-black text-xs uppercase tracking-[0.2em] backdrop-blur-sm z-10">Sold Out</div>}
                
                {/* Type Badge */}
                <div className={`absolute top-2 left-2 px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 border shadow-sm z-20 backdrop-blur-md ${badgeColor}`}><BadgeIcon className="w-3.5 h-3.5" /></div>
            </div>
            <div className="flex-1 px-1">
                <div className="flex justify-between items-start mb-1"><h4 className="font-black text-slate-900 leading-tight text-sm line-clamp-2">{item.name}</h4></div>
                {item.sub_category && <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-wider mb-2 inline-block">{item.sub_category}</span>}
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-emerald-600 font-black text-sm tracking-tight">{priceDisplay}</span>
                    {item.variants?.length > 1 && <span className="text-[9px] bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded font-bold text-slate-500 flex items-center gap-1"><Layers className="w-3 h-3 text-slate-400" /> {item.variants.length}</span>}
                </div>
            </div>
            <div className="flex gap-2 border-t border-slate-100 pt-3 mt-3">
                <button onClick={onToggle} className={`flex-1 h-9 rounded-xl text-[10px] font-black text-white transition-all uppercase tracking-widest shadow-sm active:scale-95 ${item.is_available ? 'bg-slate-900 hover:bg-slate-800' : 'bg-emerald-500 hover:bg-emerald-600'}`}>{item.is_available ? "Disable" : "Enable"}</button>
                <button onClick={onEdit} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-900 hover:border-slate-900 hover:text-white transition-all active:scale-95"><Edit2 className="w-4 h-4" /></button>
                <button onClick={onDelete} className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 border border-red-100 text-red-400 hover:bg-red-500 hover:border-red-500 hover:text-white transition-all active:scale-95"><Trash2 className="w-4 h-4" /></button>
            </div>
        </motion.div>
    );
}