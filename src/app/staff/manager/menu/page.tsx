"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/app/staff/manager/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Utensils, Loader2, Image as ImageIcon, ToggleLeft, ToggleRight, Archive, 
  Layers, Plus, X, UploadCloud, Save, Edit2, Trash2, ChefHat, Wine, Coffee, Leaf, Beef, GlassWater, Database
, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { getDashboardData } from "@/app/actions/dashboard";
import { getMenuData, toggleItemAvailability, saveMenuItem, deleteMenuItem } from "@/app/actions/menu-optimized";

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

const dietaryOptions = [
    { value: "non-veg", label: "Non-Veg", emoji: "🍗" },
    { value: "veg", label: "Veg", emoji: "🥬" },
    { value: "drinks", label: "Drinks", emoji: "🥤" },
    { value: "hookah", label: "Hookah", emoji: "💨" },
    { value: "tobacco", label: "Tobacco", emoji: "🚬" },
];

const stationOptions = [
    { value: "kitchen", label: "Kitchen", emoji: "👨‍🍳" },
    { value: "bar", label: "Bar", emoji: "🍷" }
];

// --- IMAGE COMPRESSION ENGINE ---
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
            <label className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-400 ml-1 mb-1">                
                {Icon && <Icon className="w-3 h-3" />} {label}
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


export default function ManagerMenuPage() {
  const [tenant, setTenant] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStation, setFilterStation] = useState<"all" | "kitchen" | "bar">("all");

  // MODAL & FORM STATE
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState<number | string>(0);
  const [formSubCat, setFormSubCat] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formImage, setFormImage] = useState("");
  const [formDietary, setFormDietary] = useState("non-veg");
  const [formStation, setFormStation] = useState("kitchen");
    const [formAvailable, setFormAvailable] = useState(true);
  const [variants, setVariants] = useState<Variant[]>([]);

  // DELETE MODAL STATE
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [dashRes, menuRes] = await Promise.all([getDashboardData(), getMenuData()]);
    if(dashRes) setTenant(dashRes.tenant);
    if(menuRes.success && menuRes.categories) {
        setCategories(menuRes.categories);
        if(menuRes.categories.length > 0 && !activeTabId) setActiveTabId(menuRes.categories[0].id);
    }
    setLoading(false);
  }

  // --- ACTIONS ---
  async function handleToggle(item: any) {
      // Optimistic Update
      const newCats = categories.map(c => c.id === activeTabId ? { ...c, items: c.items.map((i: any) => i.id === item.id ? { ...i, is_available: !i.is_available } : i) } : c);
      setCategories(newCats);
      await toggleItemAvailability(activeTabId, item.id);
      toast.success(item.is_available ? "Disabled" : "Enabled");
  }

  function handleDeleteClick(itemId: string) {
      setItemToDelete(itemId);
      setIsDeleteModalOpen(true);
  }

  async function confirmDelete() {
      if(!itemToDelete) return;
      setIsDeleting(true);
      const res = await deleteMenuItem(activeTabId, itemToDelete);
      if (res.success) {
          await loadData();
          toast.success("Dish Removed");
          setIsDeleteModalOpen(false);
          setItemToDelete(null);
      } else {
          toast.error("Failed to remove dish: " + (res.error || "Unknown error"));
      }
      setIsDeleting(false);
  }

  async function handleSaveItem(e: React.FormEvent) {
      e.preventDefault();
      if (!activeTabId) return toast.error("Select a category first");
      setIsSubmitting(true);
      
      const validVariants = variants.filter(v => v.name.trim() !== "");
      const basePrice = validVariants.length > 0 ? Math.min(...validVariants.map(v => v.price)) : (Number(formPrice) || 0);

      if (validVariants.length === 0 && basePrice <= 0) {
          setIsSubmitting(false);
          return toast.error("Please enter a valid price for the dish.");
      }
      if (validVariants.length > 0 && validVariants.some(v => (Number(v.price) || 0) <= 0)) {
          setIsSubmitting(false);
          return toast.error("Please enter a valid price for all variants.");
      }

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
      if(res.success) { 
          await loadData(); 
          setIsItemModalOpen(false); 
          toast.success(editingItem ? "Updated" : "Created"); 
      } else { 
          toast.error("Error: " + res.error); 
      }
      setIsSubmitting(false);
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

  const openNew = () => {
      setEditingItem(null);
      setFormName("");
      setFormSubCat("");
      setFormDesc("");
      setFormImage("");
      setFormDietary("non-veg");
      setFormStation("kitchen");
      setFormPrice("");
      setFormAvailable(true);
      setVariants([]);
      setIsItemModalOpen(true);
  };

  // VARIANT HANDLERS
  const addVariant = () => setVariants([...variants, { name: "", price: 0 }]);
  const updateVariant = (idx: number, field: keyof Variant, val: any) => {
      const newV = [...variants];
      // @ts-ignore
      newV[idx][field] = val;
      setVariants(newV);
  };
  const removeVariant = (idx: number) => setVariants(variants.filter((_, i) => i !== idx));

  // FILTERING
  const activeCategory = categories.find(c => c.id === activeTabId);
  const items = activeCategory?.items
    .filter((i: any) => i.name.toLowerCase().includes(search.toLowerCase()))
    .filter((i: any) => filterStation === "all" || i.station === filterStation) || [];

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]"><Loader2 className="w-10 h-10 text-emerald-500 animate-spin" /></div>;

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900 selection:bg-emerald-500 selection:text-white overflow-hidden">
      <Sidebar tenantName={tenant?.name} tenantCode={tenant?.code} logo={tenant?.logo_url} />
      
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        
        {/* HEADER */}
        <header className="flex-shrink-0 px-4 md:px-8 py-3 bg-white border-b border-slate-200 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 z-20 pt-14 lg:pt-3">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/20"><Utensils className="w-5 h-5 text-white" /></div>
                <div><h1 className="text-xl font-black text-slate-900 leading-tight">Menu Manager</h1><p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 uppercase tracking-wide"><Archive className="w-3 h-3" /> Storage Saver Active</p></div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-2 items-center w-full xl:w-auto">
                <div className="flex p-1 bg-slate-100 rounded-xl w-full md:w-auto">
                    <button onClick={() => setFilterStation("all")} className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStation === "all" ? "bg-white shadow text-slate-900" : "text-slate-500"}`}>All</button>
                    <button onClick={() => setFilterStation("kitchen")} className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStation === "kitchen" ? "bg-white shadow text-slate-900" : "text-slate-500"}`}>Kitchen</button>
                    <button onClick={() => setFilterStation("bar")} className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStation === "bar" ? "bg-white shadow text-slate-900" : "text-slate-500"}`}>Bar</button>
                </div>
                <div className="relative group flex-1 w-full md:w-56"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="w-full h-10 pl-10 pr-4 bg-slate-100 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                <button onClick={openNew} disabled={!activeTabId} className="w-full md:w-auto h-10 px-4 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"><Plus className="w-4 h-4" /> Add Dish</button>
            </div>
        </header>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* TABS SIDEBAR (Horizontal on Mobile, Vertical on Desktop) */}
            <div className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex-shrink-0 flex md:flex-col overflow-x-auto md:overflow-y-auto no-scrollbar p-2 md:p-4 gap-2 z-10">
                {categories.length === 0 && <p className="text-center text-xs text-slate-400 font-bold py-4">No categories.</p>}
                {categories.map(cat => (
                    <button key={cat.id} onClick={() => setActiveTabId(cat.id)} className={`flex-shrink-0 w-auto md:w-full text-left px-4 py-2 md:py-3 rounded-xl transition-all flex items-center justify-between gap-3 ${activeTabId === cat.id ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                        <span className="font-bold text-sm whitespace-nowrap">{cat.category_name}</span>
                        <span className={`text-[10px] py-0.5 px-1.5 rounded ${activeTabId === cat.id ? 'bg-white/20' : 'bg-white text-slate-400'}`}>{cat.items?.length || 0}</span>
                    </button>
                ))}
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 p-3 md:p-8 overflow-y-auto bg-[#F8FAFC]">
                {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50"><Utensils className="w-16 h-16 mb-4" /><p className="font-bold">No dishes found in this category.</p></div>
                ) : (
                    // --- RESPONSIVE GRID: 2 Columns on Mobile, 3 on Tablet, 4 on Desktop ---
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6 pb-20">
                        <AnimatePresence mode="popLayout">
                            {items.map((item: any) => {
                                const prices = item.variants?.map((v:any) => v.price) || [];
                                const priceDisplay = prices.length > 0 ? (Math.min(...prices) === Math.max(...prices) ? `Rs ${Math.min(...prices)}` : `Rs ${Math.min(...prices)} - ${Math.max(...prices)}`) : `Rs ${item.price}`;
                                
                                const isVeg = item.dietary === 'veg';
                                const isDrinks = item.dietary === 'drinks';
                                let BadgeIcon = Beef;
                                let badgeColor = 'bg-red-100 text-red-700';
                                if(isVeg) { BadgeIcon = Leaf; badgeColor = 'bg-green-100 text-green-700'; }
                                else if(isDrinks) { BadgeIcon = GlassWater; badgeColor = 'bg-blue-100 text-blue-700'; }

                                return (
                                    <motion.div 
                                        layout 
                                        key={item.id} 
                                        initial={{ opacity: 0, scale: 0.9 }} 
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className={`bg-white p-2.5 md:p-4 rounded-[1.2rem] md:rounded-2xl border shadow-sm transition-all group flex flex-col h-full ${item.is_available ? 'border-emerald-200' : 'border-red-200 opacity-75 grayscale'}`}
                                    >
                                        <div className="relative aspect-[4/3] bg-slate-50 rounded-xl overflow-hidden mb-2 md:mb-3">
                                            {item.image_url ? <img src={item.image_url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon className="w-6 h-6 md:w-8 md:h-8" /></div>}
                                            <div className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 md:px-2 md:py-1 rounded-md md:rounded-lg text-[9px] md:text-[10px] font-bold uppercase flex items-center gap-1 ${badgeColor}`}><BadgeIcon className="w-2.5 h-2.5 md:w-3 md:h-3" /></div>
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-0.5">
                                                <h4 className="font-black text-slate-900 truncate pr-1 text-xs md:text-sm leading-tight">{item.name}</h4>
                                                <div onClick={() => handleToggle(item)} className="cursor-pointer">{item.is_available ? <ToggleRight className="w-5 h-5 md:w-6 md:h-6 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 md:w-6 md:h-6 text-red-400" />}</div>
                                            </div>
                                            {item.sub_category && <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md mb-1 inline-block truncate max-w-full">{item.sub_category}</span>}
                                            <div className="flex flex-wrap items-center gap-1 mt-1">
                                                <span className="text-emerald-600 font-black text-[10px] md:text-xs">{priceDisplay}</span>
                                                {item.variants?.length > 1 && <span className="text-[8px] md:text-[9px] bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-500 flex items-center gap-1"><Layers className="w-2.5 h-2.5" /> {item.variants.length}</span>}
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-1.5 md:gap-2 border-t border-slate-50 pt-2 mt-2">
                                            <button onClick={() => openEdit(item)} className="flex-1 h-7 md:h-8 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-900 hover:text-white font-bold text-[9px] md:text-[10px] uppercase transition-colors">Edit</button>
                                            <button onClick={() => handleDeleteClick(item.id)} className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>

        {/* --- ADD ITEM MODAL --- */}
        <AnimatePresence>
            {isItemModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
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
                                    <input value={formName} onChange={e => setFormName(e.target.value.replace(/[^a-zA-Z0-9\s]/g, ''))} required placeholder="Item Name" className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all" />
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
                                            onChange={e => setFormPrice(Math.max(0, Number(e.target.value)))} 
                                            disabled={variants.length > 0}
                                            placeholder="0" 
                                            className="w-full h-12 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all" 
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Sub-Category</label>
                                    <input value={formSubCat} onChange={e => setFormSubCat(e.target.value.replace(/[^a-zA-Z0-9\s]/g, ''))} placeholder="e.g. Spicy" className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all" />
                                </div>
                            </div>
                            
                            {/* META (PREMIUM CUSTOM DROPDOWNS) */}
                            <div className="flex gap-3 relative z-[200]">
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
                                        <input value={v.name} onChange={e => updateVariant(i, "name", e.target.value.replace(/[^a-zA-Z0-9\s]/g, ''))} placeholder="Type (e.g. Steam)" className="flex-1 h-11 px-3 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" />
                                        <div className="relative w-28">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">Rs</span>
                                            <input type="number" value={v.price || ""} onChange={e => updateVariant(i, "price", Math.max(0, Number(e.target.value)))} placeholder="0" className="w-full h-11 pl-8 pr-2 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" />
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

        {/* --- DELETE CONFIRMATION MODAL --- */}
        <AnimatePresence>
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsDeleteModalOpen(false)} />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }} 
                        animate={{ opacity: 1, scale: 1, y: 0 }} 
                        exit={{ opacity: 0, scale: 0.9, y: 20 }} 
                        className="bg-white w-full max-w-sm rounded-3xl shadow-2xl relative z-10 p-6 flex flex-col items-center text-center overflow-hidden"
                    >
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                            <Trash2 className="w-8 h-8 text-red-500" />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 mb-2">Remove Dish?</h2>
                        <p className="text-sm font-medium text-slate-500 mb-8 px-4">
                            Are you sure you want to delete this dish from the menu? This action cannot be undone.
                        </p>
                        
                        <div className="flex gap-3 w-full">
                            <button 
                                onClick={() => setIsDeleteModalOpen(false)} 
                                disabled={isDeleting}
                                className="flex-1 h-12 rounded-xl border-2 border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmDelete} 
                                disabled={isDeleting}
                                className="flex-1 h-12 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold shadow-lg shadow-red-500/30 transition-all flex items-center justify-center gap-2"
                            >
                                {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Delete"}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

      </main>
    </div>
  );
}