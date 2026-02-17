"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/app/admin/Sidebar"; 
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Search, Image as ImageIcon, Loader2, Trash2, Edit2, 
  X, UploadCloud, FileText, Tag, Database, Save, LayoutGrid,
  ChefHat, Wine, Coffee, Leaf, Beef, GlassWater, Layers, ToggleLeft, ToggleRight
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
  const [formSubCat, setFormSubCat] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formImage, setFormImage] = useState("");
  const [formDietary, setFormDietary] = useState("non-veg");
  const [formStation, setFormStation] = useState("kitchen");
  const [formAvailable, setFormAvailable] = useState(true);
  const [variants, setVariants] = useState<Variant[]>([{ name: "", price: 0 }]);

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
      // Optimistic
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
      setFormSubCat(item.sub_category || "");
      setFormDesc(item.description);
      setFormImage(item.image_url);
      setFormDietary(item.dietary || "non-veg");
      setFormStation(item.station || "kitchen");
      setFormAvailable(item.is_available);
      setVariants(item.variants && item.variants.length > 0 ? item.variants : [{ name: "", price: 0 }]);
      setIsItemModalOpen(true);
  };

  const setTab = (id: string) => { setActiveTabId(id); localStorage.setItem("gecko_active_cat", id); }

  // VARIANT HANDLERS
  const addVariant = () => setVariants([...variants, { name: "", price: 0 }]);
  const updateVariant = (idx: number, field: keyof Variant, val: any) => {
      const newV = [...variants];
      // @ts-ignore
      newV[idx][field] = val;
      setVariants(newV);
  };
  const removeVariant = (idx: number) => setVariants(variants.filter((_, i) => i !== idx));

  // --- FILTERING ---
  const activeCategory = categories.find(c => c.id === activeTabId);
  const itemsToDisplay = activeCategory?.items
    .filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(i => filterStation === "all" || i.station === filterStation) || [];

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]"><Loader2 className="w-10 h-10 text-emerald-500 animate-spin" /></div>;

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
                {/* STATION TOGGLES */}
                <div className="flex p-1 bg-slate-100 rounded-xl w-full md:w-auto">
                    <button onClick={() => setFilterStation("all")} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterStation === "all" ? "bg-white shadow text-slate-900" : "text-slate-500"}`}>All</button>
                    <button onClick={() => setFilterStation("kitchen")} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${filterStation === "kitchen" ? "bg-white shadow text-orange-600" : "text-slate-500"}`}><ChefHat className="w-3 h-3" /> Kitchen</button>
                    <button onClick={() => setFilterStation("bar")} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${filterStation === "bar" ? "bg-white shadow text-violet-600" : "text-slate-500"}`}><Wine className="w-3 h-3" /> Bar</button>
                    <button onClick={() => setFilterStation("coffee")} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${filterStation === "coffee" ? "bg-white shadow text-amber-700" : "text-slate-500"}`}><Coffee className="w-3 h-3" /> Coffee</button>
                </div>

                <div className="relative group w-full md:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="w-full h-10 pl-10 pr-4 bg-slate-100 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all outline-none" /></div>
                
                <button onClick={() => { setEditingItem(null); setFormName(""); setFormDesc(""); setFormImage(""); setFormDietary("non-veg"); setFormStation("kitchen"); setFormAvailable(true); setVariants([{name:"", price:0}]); setIsItemModalOpen(true); }} disabled={!activeTabId} className="w-full md:w-auto h-10 px-4 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap"><Plus className="w-4 h-4" /> <span className="hidden md:inline">Dish</span></button>
            </div>
        </header>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* NAV */}
            <div className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex-shrink-0 flex md:flex-col overflow-x-auto md:overflow-y-auto no-scrollbar p-2 md:p-4 gap-2 z-10">
                <button onClick={() => setIsCatModalOpen(true)} className="flex-shrink-0 w-auto md:w-full h-10 md:h-12 px-4 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 font-bold text-xs uppercase hover:border-slate-900 hover:text-slate-900 transition-all whitespace-nowrap"><Plus className="w-4 h-4 mr-2" /> New Category</button>
                
                {/* PRESET CATEGORIES */}
                <div className="flex md:flex-col gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
                    {["Veg Items", "Non-Veg Items", "Bar & Drinks", "Specials"].map(p => (
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
                    <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 p-6 md:p-8 border border-slate-100 max-h-[85vh] overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black">{editingItem ? "Edit Dish" : "New Dish"}</h2><button onClick={() => setIsItemModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button></div>
                        <form onSubmit={handleSaveItem} className="space-y-4">
                            {/* IMAGE */}
                            <div className="group relative w-full h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden cursor-pointer hover:border-emerald-500 transition-colors">
                                {formImage ? <img src={formImage} className="w-full h-full object-cover" /> : <div className="text-slate-400 font-bold flex flex-col items-center"><UploadCloud className="w-6 h-6 mb-1" /> Photo</div>}
                                <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                {isUploading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="w-6 h-6 text-emerald-500 animate-spin" /></div>}
                            </div>
                            
                            {/* NAME */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2"><label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Name</label><input value={formName} onChange={e => setFormName(e.target.value)} required placeholder="Item Name" className="w-full h-12 px-4 bg-slate-50 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 transition-all" /></div>
                                <div className="col-span-2"><label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Sub-Category (Optional)</label><input value={formSubCat} onChange={e => setFormSubCat(e.target.value)} placeholder="e.g. Spicy, Gravy" className="w-full h-12 px-4 bg-slate-50 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 transition-all" /></div>
                            </div>
                            
                            {/* META */}
                            <div className="flex gap-3">
                                <div className="flex-1"><label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Type</label><select value={formDietary} onChange={e => setFormDietary(e.target.value)} className="w-full h-12 px-4 bg-slate-50 rounded-xl font-bold"><option value="non-veg">Non-Veg</option><option value="veg">Veg</option><option value="drinks">Drinks</option></select></div>
                                <div className="flex-1"><label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Station</label><select value={formStation} onChange={e => setFormStation(e.target.value)} className="w-full h-12 px-4 bg-slate-50 rounded-xl font-bold"><option value="kitchen">Kitchen</option><option value="bar">Bar</option><option value="coffee">Coffee</option></select></div>
                            </div>

                            {/* VARIANTS BUILDER */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div className="flex justify-between items-center mb-2"><label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1"><Layers className="w-3 h-3" /> Variants / Pricing</label><button type="button" onClick={addVariant} className="text-[10px] font-bold bg-white border px-2 py-1 rounded hover:bg-emerald-50 text-emerald-600">+ Add</button></div>
                                {variants.map((v, i) => (
                                    <div key={i} className="flex gap-2 mb-2">
                                        <input value={v.name} onChange={e => updateVariant(i, "name", e.target.value)} placeholder="Type (e.g. Steam)" className="flex-1 h-10 px-3 rounded-lg border text-sm font-bold" />
                                        <div className="relative w-24"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">Rs</span><input type="number" value={v.price || ""} onChange={e => updateVariant(i, "price", e.target.value)} placeholder="0" className="w-full h-10 pl-6 pr-2 rounded-lg border text-sm font-bold" /></div>
                                        {variants.length > 1 && <button type="button" onClick={() => removeVariant(i)} className="p-2 text-red-400 bg-white border rounded-lg hover:bg-red-50"><X className="w-4 h-4" /></button>}
                                    </div>
                                ))}
                            </div>

                            {/* AVAILABILITY TOGGLE */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <span className="font-bold text-sm text-slate-700">Available to Order?</span>
                                <button type="button" onClick={() => setFormAvailable(!formAvailable)} className={`text-2xl ${formAvailable ? 'text-emerald-500' : 'text-slate-300'}`}>{formAvailable ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}</button>
                            </div>

                            <div><label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Description</label><textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Details..." className="w-full h-20 p-4 bg-slate-50 rounded-xl font-bold resize-none text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                            
                            <div className="pt-2 flex gap-3"><button type="button" onClick={() => setIsItemModalOpen(false)} className="flex-1 h-14 rounded-xl border border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition-colors">Cancel</button><button type="submit" disabled={isSubmitting} className="flex-1 h-14 bg-slate-900 text-white rounded-xl font-bold text-lg shadow-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">{isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Dish"}</button></div>
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
    const isVeg = item.dietary === 'veg';
    const isDrinks = item.dietary === 'drinks';
    
    let BadgeIcon = Beef;
    let badgeColor = 'bg-red-100 text-red-700';
    if(isVeg) { BadgeIcon = Leaf; badgeColor = 'bg-green-100 text-green-700'; }
    else if(isDrinks) { BadgeIcon = GlassWater; badgeColor = 'bg-blue-100 text-blue-700'; }

    const prices = item.variants?.map((v:any) => v.price) || [];
    const priceDisplay = prices.length > 1 ? `Rs ${Math.min(...prices)} - ${Math.max(...prices)}` : `Rs ${item.price}`;

    return (
        <motion.div layout className={`bg-white p-3 rounded-[1.5rem] border shadow-sm hover:shadow-xl transition-all group flex flex-col h-full ${item.is_available ? 'border-slate-100' : 'border-red-100 opacity-80'}`}>
            <div className="relative aspect-[4/3] bg-slate-100 rounded-xl overflow-hidden mb-3">
                {item.image_url ? <img src={item.image_url} className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${!item.is_available && 'grayscale'}`} /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon className="w-8 h-8" /></div>}
                {!item.is_available && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-xs uppercase tracking-widest backdrop-blur-sm">Sold Out</div>}
                <div className={`absolute top-2 left-2 px-2 py-1 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 ${badgeColor}`}><BadgeIcon className="w-3 h-3" /></div>
            </div>
            <div className="flex-1">
                <div className="flex justify-between items-start mb-1"><h4 className="font-black text-slate-900 leading-tight text-sm line-clamp-1">{item.name}</h4></div>
                {item.sub_category && <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md mb-1 inline-block">{item.sub_category}</span>}
                <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-black text-xs">{priceDisplay}</span>
                    {item.variants?.length > 1 && <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-500 flex items-center gap-1"><Layers className="w-3 h-3" /> {item.variants.length}</span>}
                </div>
            </div>
            <div className="flex gap-2 border-t border-slate-50 pt-2 mt-auto">
                <button onClick={onToggle} className={`flex-1 h-8 rounded-lg text-[10px] font-bold text-white transition-colors uppercase tracking-wider ${item.is_available ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>{item.is_available ? "Disable" : "Enable"}</button>
                <button onClick={onEdit} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-900 hover:text-white transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={onDelete} className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
        </motion.div>
    );
}