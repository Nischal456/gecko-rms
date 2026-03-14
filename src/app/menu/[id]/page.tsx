"use client";

import { useEffect, useState, useMemo, useDeferredValue } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getPublicMenuData } from "@/app/actions/menu-optimized";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
    Search, X, ChefHat, Info, ChevronRight, Layers, Beef, Leaf, 
    GlassWater, Utensils, ShoppingBag, Sun, Moon, Sunrise, 
    Clock, Wind, Cigarette, AlertCircle, ImageIcon, CheckCircle2 
} from "lucide-react";
import NepaliDate from 'nepali-date-converter';

// --- ULTRA-FAST, HARDWARE-ACCELERATED ANIMATIONS ---
const containerVar: Variants = {
    hidden: { opacity: 0 },
    show: { 
        opacity: 1, 
        transition: { staggerChildren: 0.02, delayChildren: 0.01 } 
    }
};

const itemVar: Variants = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    show: { 
        opacity: 1, 
        y: 0, 
        scale: 1,
        // Extremely snappy spring (low mass = fast acceleration)
        transition: { type: "spring", stiffness: 350, damping: 25, mass: 0.4 } 
    },
    exit: { opacity: 0, scale: 0.96, transition: { duration: 0.1 } }
};

// --- UTILS ---
const toBS = (dateStr: string) => { 
    try { 
        const date = new Date(dateStr);
        const bsDate = new NepaliDate(date);
        return bsDate.format('YYYY/MM/DD'); 
    } catch { return "---"; }
};

// --- ISOLATED MICRO-COMPONENT (Fixes the 1-second lag stutter completely) ---
const LiveHeaderBadge = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const hour = time.getHours();
    let greeting = "Good Evening"; let GreetingIcon = Moon;
    if (hour < 12) { greeting = "Good Morning"; GreetingIcon = Sunrise; }
    else if (hour < 17) { greeting = "Good Afternoon"; GreetingIcon = Sun; }

    return (
        <motion.div 
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap items-center gap-1.5 mt-1.5 overflow-hidden"
        >
            {/* Mobile-only Live Badge */}
            <div className="sm:hidden flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100 shadow-sm mr-1">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest">Live</span>
            </div>

            <span className="flex items-center gap-1 text-[9px] md:text-[10px] font-bold text-emerald-700 bg-emerald-100/80 backdrop-blur-md px-2 py-0.5 rounded-md uppercase tracking-widest border border-emerald-200/50 shadow-sm">
                <GreetingIcon className="w-2.5 h-2.5 md:w-3 md:h-3" /> {greeting}
            </span>
            <span className="flex items-center gap-1 text-[9px] md:text-[10px] font-bold text-slate-600 bg-white/80 backdrop-blur-md px-2 py-0.5 rounded-md uppercase tracking-widest border border-slate-200/60 shadow-sm tabular-nums">
                <Clock className="w-2.5 h-2.5 md:w-3 md:h-3" /> {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
        </motion.div>
    );
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
    
    // FIX: Deferred value prevents keyboard typing lag on slow devices!
    const deferredSearch = useDeferredValue(search); 

    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [selectedVariant, setSelectedVariant] = useState<any>(null);
    const [isScrolled, setIsScrolled] = useState(false);

    // --- DATA FETCHING ---
    useEffect(() => {
        if (params.id) {
            getPublicMenuData(params.id as string).then((res) => {
                const data = res as any;
                if (data.success) {
                    const safeCategories = (data.categories || []).map((cat: any) => ({
                        ...cat, items: Array.isArray(cat.items) ? cat.items : []
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

    // --- OPTIMIZED SCROLL LISTENER (Fixes Scroll Lag & Flicker) ---
    useEffect(() => {
        let ticking = false;
        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const scrolled = window.scrollY > 20;
                    setIsScrolled((prev) => {
                        if (prev !== scrolled) return scrolled;
                        return prev;
                    });
                    ticking = false;
                });
                ticking = true;
            }
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // --- NATIVE MODAL SCROLL LOCK ---
    useEffect(() => {
        if (selectedItem) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [selectedItem]);

    // --- ROBUST FILTERING LOGIC (Using deferredSearch for 0 lag) ---
    const filteredItems = useMemo(() => {
        let items: any[] = [];
        if (activeCategory === "All") items = menu.flatMap(cat => cat.items || []);
        else {
            const category = menu.find(cat => cat.category_name === activeCategory);
            items = category ? category.items : [];
        }

        if (deferredSearch.trim()) {
            const lowerSearch = deferredSearch.toLowerCase().trim();
            items = items.filter(item => 
                (item.name || "").toLowerCase().includes(lowerSearch) ||
                (item.description || "").toLowerCase().includes(lowerSearch)
            );
        }
        return items;
    }, [menu, activeCategory, deferredSearch]);

    // --- LOADING STATE ---
    if (loading) return (
        <div className="min-h-[100dvh] bg-[#f8fafc] px-6 py-12 flex flex-col items-center justify-center">
            <div className="w-24 h-24 bg-transparent rounded-[2rem] flex items-center justify-center mb-6 relative overflow-hidden">
                <Utensils className="w-10 h-10 text-emerald-500 animate-bounce" />
            </div>
            <div className="h-6 w-48 bg-slate-200 rounded-full animate-pulse mb-3" />
            <div className="h-4 w-32 bg-slate-200 rounded-full animate-pulse opacity-50" />
        </div>
    );

    return (
        <div className="min-h-[100dvh] bg-[#f4f7f6] font-sans text-slate-900 pb-40 relative selection:bg-emerald-200">
            
            {/* --- FLICKER-FREE PREMIUM HERO HEADER --- */}
            <header className="sticky top-0 z-40 w-full transform-gpu">
                {/* GPU-Accelerated Background Overlay (Fades in smoothly) */}
                <div className={`absolute inset-0 bg-white/85 backdrop-blur-2xl border-b border-slate-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-opacity duration-300 ease-out pointer-events-none ${isScrolled ? "opacity-100" : "opacity-0"}`} />
                
                {/* Header Content */}
                <div className={`relative z-10 max-w-[1400px] mx-auto px-4 md:px-8 transition-all duration-300 ease-out ${isScrolled ? "pt-3 pb-2.5" : "pt-6 md:pt-10 pb-2"}`}>
                    
                    {/* Brand Row */}
                    <div className={`flex items-center justify-between transition-all duration-300 ${isScrolled ? "mb-3" : "mb-8"}`}>
                        <div className="flex items-center gap-3 md:gap-4 group cursor-default">
                            {/* Transparent Floating Logo */}
                            <motion.div 
                                layout
                                className={`relative shrink-0 flex items-center justify-center transition-all duration-300 ${isScrolled ? "w-10 h-10" : "w-14 h-14 md:w-[72px] md:h-[72px]"}`}
                            >
                                {!isScrolled && <div className="absolute inset-0 bg-emerald-500 rounded-full blur-2xl opacity-15 group-hover:opacity-30 transition-opacity duration-700" />}
                                {restaurantLogo ? (
                                    <img src={restaurantLogo} alt="Logo" className="w-full h-full object-contain drop-shadow-md relative z-10" />
                                ) : (
                                    <div className="w-full h-full bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center relative z-10">
                                        <ChefHat className={`${isScrolled ? "w-5 h-5" : "w-7 h-7"} text-emerald-600`} />
                                    </div>
                                )}
                            </motion.div>

                            {/* Name & Live Time */}
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <motion.div layout className="flex items-center gap-2">
                                    <h1 className={`font-black text-slate-900 leading-none truncate tracking-tight transition-all duration-300 ${isScrolled ? "text-xl" : "text-2xl md:text-3xl"}`}>
                                        {restaurantName}
                                    </h1>
                                    {!isScrolled && (
                                        <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 shadow-sm">
                                            <span className="relative flex h-1.5 w-1.5">
                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                            </span>
                                            <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Live Menu</span>
                                        </div>
                                    )}
                                </motion.div>
                                
                                <AnimatePresence>
                                    {!isScrolled && <LiveHeaderBadge />}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>

                    {/* Search Bar (Glassmorphic) */}
                    <div className="relative w-full max-w-2xl mb-4 transform transition-all group">
                        <div className="absolute inset-0 bg-emerald-500/5 rounded-xl blur-md transition-opacity duration-300 opacity-0 group-focus-within:opacity-100" />
                        <div className="relative bg-white/70 backdrop-blur-xl rounded-xl shadow-sm border border-slate-200/80 flex items-center overflow-hidden transition-all group-focus-within:bg-white group-focus-within:border-emerald-300 group-focus-within:shadow-[0_8px_30px_rgb(16,185,129,0.12)]">
                            <div className="pl-3.5 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                                <Search className="w-4.5 h-4.5" />
                            </div>
                            <input 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Craving something specific?"
                                className="w-full h-11 md:h-12 pl-2.5 pr-4 bg-transparent text-sm md:text-base font-bold placeholder:text-slate-400 focus:outline-none text-slate-800"
                            />
                            {search && (
                                <button onClick={() => setSearch("")} className="pr-3 text-slate-400 hover:text-slate-600 transition-colors active:scale-90">
                                    <div className="bg-slate-100 p-1 rounded-full"><X className="w-3.5 h-3.5" /></div>
                                </button>
                            )}
                        </div>
                    </div>
                    
                    {/* Animated Category Pills */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 md:mx-0 md:px-0 scroll-smooth transform-gpu">
                        <button 
                            onClick={() => setActiveCategory("All")} 
                            className={`relative flex-shrink-0 px-4 py-2 rounded-lg text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 ${activeCategory === "All" ? 'text-white shadow-md shadow-slate-900/20' : 'text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900'}`}
                        >
                            {activeCategory === "All" && <motion.div layoutId="activePill" className="absolute inset-0 bg-slate-900 rounded-lg" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
                            <span className="relative z-10">All Items</span>
                        </button>

                        {menu.map((cat) => (
                            <button 
                                key={cat.id} 
                                onClick={() => setActiveCategory(cat.category_name)} 
                                className={`relative flex-shrink-0 px-4 py-2 rounded-lg text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 ${activeCategory === cat.category_name ? 'text-white shadow-md shadow-slate-900/20' : 'text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900'}`}
                            >
                                {activeCategory === cat.category_name && <motion.div layoutId="activePill" className="absolute inset-0 bg-slate-900 rounded-lg" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
                                <span className="relative z-10">{cat.category_name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* --- MENU GRID (2 Columns Mobile, 3 Tablet, 4 Desktop) --- */}
            <div className="p-3 md:p-8 max-w-[1400px] mx-auto min-h-[50vh]">
                <AnimatePresence mode="wait">
                    {filteredItems.length === 0 ? (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }} 
                            animate={{ opacity: 1, scale: 1 }} 
                            exit={{ opacity: 0 }}
                            className="col-span-full py-20 text-center flex flex-col items-center"
                        >
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-5 shadow-lg shadow-slate-200/50">
                                <Search className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="font-black text-slate-900 text-xl md:text-2xl tracking-tight">Nothing found</h3>
                            <p className="text-xs md:text-sm text-slate-500 mt-2 font-medium">We couldn't find any dishes matching your search.</p>
                            {activeCategory !== "All" && (
                                <button onClick={() => setActiveCategory("All")} className="mt-6 px-6 py-2.5 bg-slate-900 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-md shadow-slate-900/20 active:scale-95">
                                    View Full Menu
                                </button>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div 
                            key={activeCategory} // FIX: Removed search from key so the grid doesn't self-destruct!
                            variants={containerVar} 
                            initial="hidden" 
                            animate="show"
                            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5 lg:gap-6"
                        >
                            <AnimatePresence>
                                {filteredItems.map((item: any) => {
                                    const dietaryType = item.dietary || 'non-veg';
                                    let BadgeIcon = Beef; let badgeColor = 'text-red-600';
                                    if(dietaryType === 'veg') { BadgeIcon = Leaf; badgeColor = 'text-green-600'; }
                                    else if(dietaryType === 'drinks') { BadgeIcon = GlassWater; badgeColor = 'text-blue-600'; }
                                    else if(dietaryType === 'hookah') { BadgeIcon = Wind; badgeColor = 'text-orange-600'; }
                                    else if(dietaryType === 'tobacco') { BadgeIcon = Cigarette; badgeColor = 'text-slate-600'; }

                                    const hasVariants = item.variants && item.variants.length > 0;
                                    const displayVariants = hasVariants ? item.variants.slice(0, 3) : [];

                                    return (
                                        <motion.div 
                                            key={item.id} 
                                            variants={itemVar}
                                            layout="position"
                                            onClick={() => { setSelectedItem(item); setSelectedVariant(hasVariants ? item.variants[0] : null); }}
                                            className="bg-white p-3 md:p-4 rounded-[1.5rem] border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] active:scale-[0.97] hover:-translate-y-1 transition-all duration-300 cursor-pointer group hover:border-emerald-200 hover:shadow-[0_20px_40px_-10px_rgba(16,185,129,0.15)] flex flex-col h-full relative transform-gpu will-change-transform"
                                        >
                                            {/* Sold Out Overlay */}
                                            {!item.is_available && (
                                                <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-30 flex items-center justify-center rounded-[1.5rem]">
                                                    <span className="bg-slate-900 text-white px-3 py-1.5 rounded-lg font-black text-[10px] md:text-xs uppercase tracking-[0.2em] shadow-lg">Sold Out</span>
                                                </div>
                                            )}

                                            {/* Top Section: Image + Title */}
                                            <div className="flex gap-3 mb-1">
                                                {/* Image Thumbnail */}
                                                <div className="w-20 h-20 md:w-24 md:h-24 shrink-0 rounded-[1rem] overflow-hidden relative shadow-inner border border-slate-100/50 bg-slate-50">
                                                    {item.image_url ? (
                                                        <img loading="lazy" src={item.image_url} alt={item.name} className={`w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out ${!item.is_available && 'grayscale'}`} />
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300"><ImageIcon className="w-6 h-6 opacity-30" /></div>
                                                    )}
                                                    
                                                    {/* Premium Floating Badge */}
                                                    <div className="absolute top-1.5 left-1.5 bg-white/95 backdrop-blur-md px-1.5 py-1 rounded-md border border-slate-100 shadow-sm flex items-center justify-center z-20">
                                                        <BadgeIcon className={`w-3 h-3 md:w-3.5 md:h-3.5 ${badgeColor}`} />
                                                    </div>
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0 flex flex-col pt-0.5">
                                                    <h3 className="font-black text-slate-900 text-sm md:text-base leading-tight line-clamp-2 group-hover:text-emerald-600 transition-colors">{item.name}</h3>
                                                    <p className="text-[10px] md:text-xs text-slate-500 line-clamp-2 mt-1 leading-snug font-medium pr-1">
                                                        {item.description || "Freshly prepared for you."}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Bottom Section: Options / Price */}
                                            {hasVariants ? (
                                                <div className="mt-auto pt-3 border-t border-slate-100/60">
                                                    <div className="flex items-center gap-1.5 mb-2">
                                                        <Layers className="w-3.5 h-3.5 text-emerald-500" />
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Options</span>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        {displayVariants.map((v: any, idx: number) => (
                                                            <div key={idx} className="flex justify-between items-center bg-slate-50/80 group-hover:bg-emerald-50/50 px-3 py-2 rounded-xl transition-colors border border-slate-100/50 group-hover:border-emerald-100/50">
                                                                <span className="text-[11px] md:text-xs font-bold text-slate-700 truncate mr-2">{v.name}</span>
                                                                <span className="text-[11px] md:text-xs font-black text-emerald-600 shrink-0">Rs {v.price}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {item.variants.length > 3 && (
                                                        <div className="text-center mt-2">
                                                            <span className="text-[9px] md:text-[10px] font-bold text-slate-400 group-hover:text-emerald-500 transition-colors">+{item.variants.length - 3} more</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="mt-auto pt-3 border-t border-slate-100/60 flex items-center justify-between">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fixed Price</span>
                                                    <span className="text-sm md:text-base font-black text-emerald-600 tracking-tight">Rs {item.price || 0}</span>
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* --- FLOATING "SMART" ACTION BAR --- */}
            {!isViewOnly && (
                <div className="fixed bottom-5 left-0 right-0 px-4 md:px-5 z-30 pointer-events-none">
                    <div className="max-w-md mx-auto pointer-events-auto">
                        <motion.button 
                            initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} whileTap={{ scale: 0.96 }}
                            className="w-full bg-slate-900/95 backdrop-blur-2xl text-white p-2.5 md:p-3 pr-4 md:pr-5 rounded-[1.5rem] shadow-[0_20px_40px_rgb(0,0,0,0.25)] flex items-center justify-between border border-slate-700/50 group overflow-hidden relative transform-gpu"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex items-center gap-3 relative z-10">
                                <div className="w-10 h-10 md:w-11 md:h-11 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/40 group-hover:scale-105 transition-all">
                                    <ShoppingBag className="w-4 h-4 md:w-5 md:h-5" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[9px] md:text-[10px] text-emerald-400 uppercase font-black tracking-[0.2em] mb-0.5">Start Order</p>
                                    <p className="text-xs md:text-sm font-bold tracking-wide">Call waiter to order</p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors relative z-10 group-hover:translate-x-1" />
                        </motion.button>
                    </div>
                </div>
            )}

            {/* --- ULTRA PREMIUM DETAIL MODAL (iOS App Store Style) --- */}
            <AnimatePresence>
                {selectedItem && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
                        {/* Blur Backdrop */}
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                            onClick={() => setSelectedItem(null)} 
                            className="absolute inset-0 bg-slate-900/50 backdrop-blur-md transform-gpu" 
                        />
                        
                        <motion.div 
                            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 260, mass: 0.8 }}
                            className="bg-[#f8fafc] w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-0 relative z-10 shadow-2xl h-[90vh] sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden transform-gpu will-change-transform"
                        >
                            {/* Floating Close Button */}
                            <button onClick={() => setSelectedItem(null)} className="absolute top-4 right-4 w-9 h-9 bg-white/50 backdrop-blur-xl rounded-full flex items-center justify-center text-slate-800 z-50 hover:bg-white/80 transition-colors shadow-md ring-1 ring-white/50 active:scale-90">
                                <X className="w-4 h-4" />
                            </button>

                            {/* Scrollable Content Area (HIDDEN SCROLLBAR) */}
                            <div className="flex-1 overflow-y-auto no-scrollbar pb-safe">
                                
                                {/* Massive Parallax Image Header */}
                                <div className="w-full aspect-[4/3] bg-slate-200 relative shrink-0">
                                    {selectedItem.image_url ? (
                                        <img src={selectedItem.image_url} alt={selectedItem.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-100"><ImageIcon className="w-16 h-16 opacity-30" /></div>
                                    )}
                                    {/* Premium Gradient Fade into content */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#f8fafc] via-[#f8fafc]/10 to-transparent opacity-100" />
                                    
                                    {/* Dietary Badge inside image */}
                                    <div className={`absolute bottom-5 left-5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-md backdrop-blur-md bg-white/95 ${
                                        selectedItem.dietary === 'veg' ? 'text-green-700 border-green-200' : 
                                        selectedItem.dietary === 'drinks' ? 'text-blue-700 border-blue-200' :
                                        selectedItem.dietary === 'hookah' ? 'text-orange-700 border-orange-200' :
                                        selectedItem.dietary === 'tobacco' ? 'text-slate-700 border-slate-300' :
                                        'text-red-700 border-red-200'
                                    }`}>
                                        {selectedItem.dietary || "Non-Veg"}
                                    </div>
                                </div>

                                <div className="px-5 md:px-6 pb-8 -mt-2 relative z-10 shrink-0">
                                    
                                    {/* Title & Description */}
                                    <div className="mb-5">
                                        <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight mb-1.5 tracking-tight">{selectedItem.name}</h2>
                                        {selectedItem.sub_category && <span className="inline-block text-[9px] font-black bg-slate-200/80 text-slate-600 px-2 py-0.5 rounded-md uppercase tracking-wider mb-2.5">{selectedItem.sub_category}</span>}
                                        <p className="text-slate-500 text-[13px] leading-relaxed font-medium">
                                            {selectedItem.description || "A delicious signature item prepared with care and fresh ingredients."}
                                        </p>
                                    </div>

                                    {/* Premium Disclaimer (Presentation) */}
                                    {selectedItem.image_url && (
                                        <div className="mb-6 flex items-start gap-2.5 p-3 bg-slate-100/80 rounded-xl border border-slate-200/60">
                                            <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                            <p className="text-[10px] text-slate-500 font-medium leading-snug">
                                                Images are for illustrative purposes. Your dish's actual presentation may vary slightly, but the great taste is guaranteed!
                                            </p>
                                        </div>
                                    )}

                                    {/* Variant Selector */}
                                    {selectedItem.variants && selectedItem.variants.length > 0 ? (
                                        <div className="space-y-2.5 mb-6">
                                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1.5 flex items-center gap-1.5"><Layers className="w-3 h-3" /> Choose Option</h4>
                                            {selectedItem.variants.map((v: any, i: number) => {
                                                const isSelected = selectedVariant?.name === v.name;
                                                return (
                                                    <div 
                                                        key={i} 
                                                        onClick={() => setSelectedVariant(v)}
                                                        className={`flex justify-between items-center p-3.5 rounded-xl transition-all cursor-pointer border-2 active:scale-[0.98] ${
                                                            isSelected ? 'bg-emerald-50 border-emerald-500 shadow-sm shadow-emerald-500/10' : 'bg-white border-slate-100 hover:border-slate-300'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${isSelected ? 'bg-emerald-500 text-white' : 'border-2 border-slate-200'}`}>
                                                                {isSelected && <CheckCircle2 className="w-2.5 h-2.5" />}
                                                            </div>
                                                            <span className={`font-bold text-sm ${isSelected ? 'text-emerald-900' : 'text-slate-700'}`}>{v.name}</span>
                                                        </div>
                                                        <span className={`font-black text-sm md:text-base ${isSelected ? 'text-emerald-600' : 'text-slate-900'}`}>Rs {v.price}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="mb-6 flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                                            <span className="font-bold text-slate-500 uppercase tracking-widest text-[9px] md:text-[10px]">Fixed Price</span>
                                            <span className="font-black text-2xl text-emerald-600 tracking-tighter">Rs {selectedItem.price || 0}</span>
                                        </div>
                                    )}

                                    {/* Action Area */}
                                    {isViewOnly ? (
                                        <div className="p-3.5 bg-slate-100 rounded-2xl flex items-center gap-3 border border-slate-200">
                                            <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm text-slate-400">
                                                <Info className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-900 font-black uppercase tracking-wider mb-0.5">View Only Menu</p>
                                                <p className="text-[9px] md:text-[10px] text-slate-500 font-medium">Please let your waiter know your choice.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <button className="w-full py-4 bg-slate-900 text-white font-black rounded-[1.2rem] shadow-xl shadow-slate-900/20 hover:bg-emerald-600 transition-all flex justify-center items-center gap-2 text-sm md:text-base active:scale-[0.98]">
                                            <ShoppingBag className="w-4 h-4" /> Add to Order
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Global CSS to completely hide scrollbars but maintain scroll functionality */}
            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}