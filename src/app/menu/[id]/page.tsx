"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getPublicMenuData } from "@/app/actions/menu-optimized";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Search, X, ChefHat, Info, ChevronRight, Layers, Sparkles, Beef, Leaf, GlassWater, Utensils, ShoppingBag, Plus } from "lucide-react";

// --- ANIMATION VARIANTS ---
const containerVar: Variants = {
    hidden: { opacity: 0 },
    show: { 
        opacity: 1, 
        transition: { staggerChildren: 0.05 } 
    }
};

const itemVar: Variants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: { 
        opacity: 1, 
        y: 0, 
        scale: 1,
        transition: { type: "spring", stiffness: 100, damping: 15 } 
    },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
};

export default function PublicMenuPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const isViewOnly = searchParams.get("mode") === "view";
    
    // --- STATE ---
    const [menu, setMenu] = useState<any[]>([]);
    const [restaurantName, setRestaurantName] = useState("");
    const [restaurantLogo, setRestaurantLogo] = useState(""); 
    const [loading, setLoading] = useState(true);
    
    const [activeCategory, setActiveCategory] = useState("All");
    const [search, setSearch] = useState("");
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [isScrolled, setIsScrolled] = useState(false);

    // --- DATA FETCHING ---
    useEffect(() => {
        if (params.id) {
            getPublicMenuData(params.id as string).then((res) => {
                const data = res as any;
                if (data.success) {
                    // Normalize items array
                    const safeCategories = (data.categories || []).map((cat: any) => ({
                        ...cat,
                        items: Array.isArray(cat.items) ? cat.items : []
                    }));
                    setMenu(safeCategories);
                    setRestaurantName(data.tenant_name || "Digital Menu");
                    setRestaurantLogo(data.tenant_logo || "");
                }
                setLoading(false);
            }).catch((err) => {
                console.error("Error:", err);
                setLoading(false);
            });
        }
    }, [params.id]);

    // --- SCROLL LISTENER ---
    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 10);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // --- ROBUST FILTERING LOGIC (BUG FIX) ---
    const filteredItems = useMemo(() => {
        // 1. Flatten all items first if "All", or find specific category items
        let items: any[] = [];
        
        if (activeCategory === "All") {
            items = menu.flatMap(cat => cat.items || []);
        } else {
            const category = menu.find(cat => cat.category_name === activeCategory);
            items = category ? category.items : [];
        }

        // 2. Apply Search Filter
        if (search.trim()) {
            const lowerSearch = search.toLowerCase().trim();
            items = items.filter(item => 
                (item.name || "").toLowerCase().includes(lowerSearch) ||
                (item.description || "").toLowerCase().includes(lowerSearch)
            );
        }

        return items;
    }, [menu, activeCategory, search]);

    // --- LOADING STATE ---
    if (loading) return (
        <div className="min-h-screen bg-slate-50 px-4 py-8 space-y-6">
            <div className="flex gap-4 items-center animate-pulse">
                <div className="w-16 h-16 bg-slate-200 rounded-2xl" />
                <div className="space-y-2 flex-1">
                    <div className="h-6 w-1/2 bg-slate-200 rounded-lg" />
                    <div className="h-4 w-1/4 bg-slate-200 rounded-lg" />
                </div>
            </div>
            <div className="h-12 w-full bg-slate-200 rounded-2xl animate-pulse" />
            <div className="flex gap-3 overflow-hidden">
                {[1,2,3,4].map(i => <div key={i} className="h-10 w-28 bg-slate-200 rounded-xl animate-pulse flex-shrink-0" />)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="h-48 bg-white rounded-[2rem] animate-pulse shadow-sm border border-slate-100" />
                ))}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 pb-40 relative">
            
            {/* --- HERO HEADER --- */}
            <div className={`sticky top-0 z-30 transition-all duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] ${isScrolled ? "bg-white/90 backdrop-blur-xl border-b border-slate-200/50 shadow-sm pt-2 pb-2" : "bg-transparent pt-6 pb-2"}`}>
                <div className="max-w-5xl mx-auto px-5">
                    
                    {/* Brand Row */}
                    <div className={`flex items-center justify-between transition-all duration-500 ${isScrolled ? "mb-2" : "mb-6"}`}>
                        <div className="flex items-center gap-4">
                            <motion.div 
                                layout
                                className={`bg-white rounded-2xl flex items-center justify-center shadow-lg border border-slate-100 overflow-hidden relative ${isScrolled ? "w-10 h-10 rounded-xl" : "w-16 h-16 rounded-2xl"}`}
                            >
                                {restaurantLogo ? (
                                    <img src={restaurantLogo} alt="Logo" className="w-full h-full object-cover" />
                                ) : (
                                    <ChefHat className={`${isScrolled ? "w-5 h-5" : "w-8 h-8"} text-emerald-600`} />
                                )}
                            </motion.div>
                            <div className="flex-1 min-w-0">
                                <motion.h1 layout className={`font-black text-slate-900 leading-tight truncate ${isScrolled ? "text-lg" : "text-2xl"}`}>
                                    {restaurantName}
                                </motion.h1>
                                {!isScrolled && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5 mt-1">
                                        <span className="relative flex h-2 w-2">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                        </span>
                                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Live Menu</p>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative group max-w-lg mx-auto md:mx-0 mb-4 transform transition-all hover:scale-[1.01]">
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-200 to-teal-200 rounded-2xl blur-lg opacity-20 group-focus-within:opacity-50 transition-opacity duration-500" />
                        <div className="relative bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center overflow-hidden transition-all group-focus-within:border-emerald-500/50 group-focus-within:shadow-emerald-100">
                            <div className="pl-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                                <Search className="w-4.5 h-4.5" />
                            </div>
                            <input 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search for dishes..."
                                className="w-full h-12 pl-3 pr-4 bg-transparent text-sm font-bold placeholder:text-slate-400 focus:outline-none text-slate-700"
                            />
                            {search && (
                                <button onClick={() => setSearch("")} className="pr-4 text-slate-400 hover:text-slate-600 transition-colors">
                                    <X className="w-4 h-4 bg-slate-200 rounded-full p-0.5" />
                                </button>
                            )}
                        </div>
                    </div>
                    
                    {/* Animated Category Pills */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-5 px-5 sm:mx-0 sm:px-0 scroll-smooth">
                        {/* "All" Button */}
                        <button 
                            onClick={() => setActiveCategory("All")} 
                            className={`relative flex-shrink-0 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all ${activeCategory === "All" ? 'text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                            {activeCategory === "All" && (
                                <motion.div layoutId="activePill" className="absolute inset-0 bg-slate-900 rounded-xl shadow-lg shadow-slate-900/20" transition={{ type: "spring", stiffness: 300, damping: 30 }} />
                            )}
                            <span className="relative z-10">All Items</span>
                        </button>

                        {/* Category Buttons */}
                        {menu.map((cat) => (
                            <button 
                                key={cat.id} 
                                onClick={() => setActiveCategory(cat.category_name)} 
                                className={`relative flex-shrink-0 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all ${activeCategory === cat.category_name ? 'text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                            >
                                {activeCategory === cat.category_name && (
                                    <motion.div layoutId="activePill" className="absolute inset-0 bg-slate-900 rounded-xl shadow-lg shadow-slate-900/20" transition={{ type: "spring", stiffness: 300, damping: 30 }} />
                                )}
                                <span className="relative z-10">{cat.category_name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- MENU GRID --- */}
            <div className="p-5 max-w-5xl mx-auto min-h-[50vh]">
                <AnimatePresence mode="wait">
                    {filteredItems.length === 0 ? (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            exit={{ opacity: 0 }}
                            className="col-span-full py-24 text-center flex flex-col items-center opacity-60"
                        >
                            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                <Sparkles className="w-10 h-10 text-slate-300" />
                            </div>
                            <h3 className="font-black text-slate-900 text-xl">No dishes found</h3>
                            <p className="text-sm text-slate-500 max-w-xs mt-2 font-medium">Try checking your spelling or selecting "All Items".</p>
                            {activeCategory !== "All" && (
                                <button onClick={() => setActiveCategory("All")} className="mt-6 px-6 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors">
                                    View All Menu
                                </button>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div 
                            key={activeCategory + search} // Forces re-render on category change for animation
                            variants={containerVar} 
                            initial="hidden" 
                            animate="show"
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                        >
                            {filteredItems.map((item: any) => {
                                const isVeg = item.dietary === 'veg';
                                const isDrinks = item.dietary === 'drinks';
                                let BadgeIcon = Beef;
                                let badgeStyle = 'bg-red-50 text-red-600 border-red-100';
                                if(isVeg) { BadgeIcon = Leaf; badgeStyle = 'bg-green-50 text-green-600 border-green-100'; }
                                else if(isDrinks) { BadgeIcon = GlassWater; badgeStyle = 'bg-blue-50 text-blue-600 border-blue-100'; }

                                const hasVariants = item.variants && item.variants.length > 0;
                                const displayVariants = hasVariants ? item.variants.slice(0, 3) : []; 

                                return (
                                    <motion.div 
                                        key={item.id} 
                                        variants={itemVar}
                                        layout="position"
                                        onClick={() => setSelectedItem(item)}
                                        className="bg-white p-4 rounded-[1.8rem] border border-slate-100 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] active:scale-[0.98] transition-all cursor-pointer group hover:border-emerald-200/60 hover:shadow-[0_15px_35px_-10px_rgba(16,185,129,0.15)] flex flex-col h-full relative overflow-hidden"
                                    >
                                        <div className="flex gap-4">
                                            <div className="w-28 h-28 bg-slate-50 rounded-2xl overflow-hidden flex-shrink-0 relative border border-slate-50 shadow-inner group-hover:shadow-md transition-all">
                                                {item.image_url ? (
                                                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-300"><Utensils className="w-8 h-8" /></div>
                                                )}
                                                <div className={`absolute top-2 left-2 px-2 py-1 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 shadow-sm border ${badgeStyle} backdrop-blur-md bg-opacity-90`}>
                                                    <BadgeIcon className="w-2.5 h-2.5" />
                                                </div>
                                            </div>

                                            <div className="flex-1 min-w-0 flex flex-col">
                                                <div className="flex justify-between items-start">
                                                    <h3 className="font-black text-slate-900 text-base leading-tight truncate pr-2 group-hover:text-emerald-700 transition-colors">{item.name}</h3>
                                                </div>
                                                
                                                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mt-1 font-medium">{item.description || item.sub_category || "Freshly prepared for you."}</p>
                                                
                                                {!hasVariants && (
                                                    <div className="mt-auto pt-2 flex items-center justify-between">
                                                        <span className="text-lg font-black text-slate-900">Rs {item.price || 0}</span>
                                                        <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center text-white shadow-lg shadow-slate-900/20 group-hover:bg-emerald-600 transition-colors">
                                                            <Plus className="w-4 h-4" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* INLINE VARIANTS TABLE */}
                                        {hasVariants && (
                                            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Layers className="w-3 h-3 text-emerald-500" />
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Options</p>
                                                </div>
                                                {displayVariants.map((v: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between items-center px-3 py-2 bg-slate-50 rounded-xl border border-slate-100/50 group-hover:border-emerald-100/50 transition-colors">
                                                        <span className="text-xs font-bold text-slate-700 truncate mr-2">{v.name}</span>
                                                        <span className="text-xs font-black text-emerald-600 whitespace-nowrap">Rs {v.price}</span>
                                                    </div>
                                                ))}
                                                {item.variants.length > 3 && (
                                                    <div className="text-center pt-1">
                                                        <span className="text-[10px] font-bold text-slate-400 group-hover:text-emerald-500 transition-colors">+{item.variants.length - 3} more</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* --- FLOATING "SMART" ACTION BAR (Wow Factor) --- */}
            {!isViewOnly && (
                <div className="fixed bottom-6 left-0 right-0 px-6 z-30 pointer-events-none">
                    <div className="max-w-md mx-auto pointer-events-auto">
                        <motion.button 
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            whileTap={{ scale: 0.95 }}
                            className="w-full bg-slate-900/90 backdrop-blur-xl text-white p-4 rounded-3xl shadow-2xl flex items-center justify-between border border-white/10 group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                                    <ShoppingBag className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Start Order</p>
                                    <p className="text-sm font-bold">Tap items to add</p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
                        </motion.button>
                    </div>
                </div>
            )}

            {/* --- DETAIL MODAL --- */}
            <AnimatePresence>
                {selectedItem && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            onClick={() => setSelectedItem(null)} 
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
                        />
                        <motion.div 
                            initial={{ y: "100%" }} 
                            animate={{ y: 0 }} 
                            exit={{ y: "100%" }} 
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-0 relative z-10 shadow-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden"
                        >
                            <button onClick={() => setSelectedItem(null)} className="absolute top-4 right-4 w-10 h-10 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white z-20 hover:bg-black/40 transition-colors shadow-lg">
                                <X className="w-5 h-5" />
                            </button>

                            <div className="w-full h-80 bg-slate-100 relative">
                                {selectedItem.image_url ? (
                                    <img src={selectedItem.image_url} alt={selectedItem.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300"><Utensils className="w-24 h-24" /></div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-100" />
                            </div>

                            <div className="px-8 pb-10 -mt-20 relative">
                                <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white p-8 mb-6 text-center">
                                    <div className="mb-3 flex justify-center">
                                        <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                                            selectedItem.dietary === 'veg' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
                                        }`}>
                                            {selectedItem.dietary || "Non-Veg"}
                                        </div>
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-900 leading-tight mb-3">{selectedItem.name}</h2>
                                    <p className="text-slate-500 text-sm leading-relaxed font-medium">
                                        {selectedItem.description || "A delicious signature dish prepared with care."}
                                    </p>
                                    {!selectedItem.variants?.length && (
                                        <div className="mt-6 inline-block bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-xl shadow-lg shadow-slate-900/20">
                                            Rs {selectedItem.price || 0}
                                        </div>
                                    )}
                                </div>

                                {selectedItem.variants && selectedItem.variants.length > 0 && (
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest pl-4 mb-2">Select Size / Option</h4>
                                        {selectedItem.variants.map((v: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center p-5 border border-slate-100 rounded-3xl bg-white shadow-sm hover:border-emerald-400 hover:shadow-emerald-100 transition-all cursor-pointer group active:scale-[0.98]">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-5 h-5 rounded-full border-2 border-slate-300 group-hover:border-emerald-500 transition-colors" />
                                                    <span className="font-bold text-slate-900 text-base">{v.name}</span>
                                                </div>
                                                <span className="font-black text-emerald-600 text-lg">Rs {v.price}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-8">
                                    {isViewOnly ? (
                                        <div className="p-5 bg-slate-50 rounded-3xl flex items-center gap-4 border border-slate-200">
                                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm text-slate-400">
                                                <Info className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-900 font-black uppercase tracking-wider mb-0.5">View Only Mode</p>
                                                <p className="text-xs text-slate-500 font-medium">Please call a waiter to place your order.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <button className="w-full py-5 bg-slate-900 text-white font-bold rounded-3xl shadow-2xl shadow-slate-900/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex justify-center items-center gap-3 text-lg">
                                            Add to Order
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}