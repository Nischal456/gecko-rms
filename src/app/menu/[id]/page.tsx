"use client";

import { useEffect, useState, useMemo, useDeferredValue, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getPublicMenuData } from "@/app/actions/menu-optimized";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
    Search, X, ChefHat, Info, ChevronRight, Layers, Beef, Leaf, 
    GlassWater, Utensils, ShoppingBag, Sun, Moon, Sunrise, 
    Clock, Wind, Cigarette, AlertCircle, ImageIcon, CheckCircle2,
    Sparkles, Star, Flame,
    StarHalf,
    StarIcon
} from "lucide-react";
import NepaliDate from 'nepali-date-converter';

// --- HYPER-SMOOTH, 0-LAG ANIMATIONS ---
const containerVar: Variants = {
    hidden: { opacity: 0 },
    show: { 
        opacity: 1, 
        transition: { staggerChildren: 0.04, delayChildren: 0.02 } 
    }
};

const itemVar: Variants = {
    hidden: { opacity: 0, y: 20, scale: 0.94 },
    show: { 
        opacity: 1, 
        y: 0, 
        scale: 1,
        transition: { type: "spring", stiffness: 350, damping: 25, mass: 0.5 } 
    },
    exit: { opacity: 0, scale: 0.96, transition: { duration: 0.15 } }
};

// --- UTILS ---
const toBS = (dateStr: string) => { 
    try { 
        const date = new Date(dateStr);
        const bsDate = new NepaliDate(date);
        return bsDate.format('YYYY/MM/DD'); 
    } catch { return "---"; }
};

// --- MICRO-COMPONENT: TIME & STATUS (Zero Lag) ---
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
            className="flex flex-wrap items-center gap-1.5 mt-1 overflow-hidden"
        >
            <div className="sm:hidden flex items-center gap-1 bg-emerald-50/80 backdrop-blur-md px-1.5 py-0.5 rounded border border-emerald-100 shadow-sm mr-0.5">
                <span className="relative flex h-1 w-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1 w-1 bg-emerald-500"></span>
                </span>
                <span className="text-[7px] font-bold text-emerald-600 uppercase tracking-widest">Live</span>
            </div>

            <span className="flex items-center gap-1 text-[8px] md:text-[9px] font-bold text-emerald-700 bg-emerald-100/70 backdrop-blur-md px-1.5 py-0.5 rounded-md uppercase tracking-widest border border-emerald-200/50 shadow-sm">
                <GreetingIcon className="w-2 h-2 md:w-2.5 md:h-2.5" /> {greeting}
            </span>
            <span className="flex items-center gap-1 text-[8px] md:text-[9px] font-bold text-slate-600 bg-white/70 backdrop-blur-md px-1.5 py-0.5 rounded-md uppercase tracking-widest border border-slate-200/60 shadow-sm tabular-nums">
                <Clock className="w-2 h-2 md:w-2.5 md:h-2.5" /> {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
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
    const deferredSearch = useDeferredValue(search); 

    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [selectedVariant, setSelectedVariant] = useState<any>(null);
    const [isScrolled, setIsScrolled] = useState(false);

    // Spotlight Auto-Scroll Refs
    const carouselRef = useRef<HTMLDivElement>(null);
    const [isCarouselHovered, setIsCarouselHovered] = useState(false);
    const [progressKey, setProgressKey] = useState(0); 

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

    // --- OPTIMIZED SCROLL LISTENER ---
    useEffect(() => {
        let ticking = false;
        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const scrolled = window.scrollY > 10;
                    setIsScrolled((prev) => (prev !== scrolled ? scrolled : prev));
                    ticking = false;
                });
                ticking = true;
            }
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // --- SMOOTH AUTO-SHIFTING SPOTLIGHT ---
    useEffect(() => {
        if (!carouselRef.current || isCarouselHovered) return;
        const intervalTime = 3500;
        
        const interval = setInterval(() => {
            if (carouselRef.current) {
                const maxScroll = carouselRef.current.scrollWidth - carouselRef.current.clientWidth;
                if (carouselRef.current.scrollLeft >= maxScroll - 5) {
                    carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    carouselRef.current.scrollBy({ left: 280, behavior: 'smooth' }); 
                }
                setProgressKey(prev => prev + 1); 
            }
        }, intervalTime); 
        
        return () => clearInterval(interval);
    }, [isCarouselHovered, menu]);

    // --- NATIVE MODAL SCROLL LOCK ---
    useEffect(() => {
        if (selectedItem) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [selectedItem]);

    // --- BULLETPROOF FILTERING LOGIC (Hides Disabled Items) ---
    const filteredItems = useMemo(() => {
        let items: any[] = [];
        if (activeCategory === "All") items = menu.flatMap(cat => cat.items || []);
        else {
            const category = menu.find(cat => cat.category_name === activeCategory);
            items = category ? category.items : [];
        }
        items = items.filter(item => item.is_available !== false);

        if (deferredSearch.trim()) {
            const lowerSearch = deferredSearch.toLowerCase().trim();
            items = items.filter(item => 
                (item.name || "").toLowerCase().includes(lowerSearch) ||
                (item.description || "").toLowerCase().includes(lowerSearch)
            );
        }
        return items;
    }, [menu, activeCategory, deferredSearch]);

    // --- EXTRACT SPECIALS ---
    const specialItems = useMemo(() => {
        return menu.flatMap(cat => cat.items || []).filter(item => item.is_special && item.is_available !== false);
    }, [menu]);

    const showSpecialsCarousel = specialItems.length > 0 && activeCategory === "All" && !deferredSearch.trim();

    // --- LOADING STATE ---
    if (loading) return (
        <div className="min-h-[100dvh] bg-[#f8fafc] px-6 py-12 flex flex-col items-center justify-center">
            <motion.div 
                animate={{ rotate: 360, scale: [1, 1.1, 1] }} 
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="w-16 h-16 bg-white shadow-xl rounded-[1.5rem] flex items-center justify-center mb-6"
            >
                <Utensils className="w-8 h-8 text-emerald-500" />
            </motion.div>
            <div className="h-3 w-40 bg-slate-200 rounded-full animate-pulse mb-3" />
            <div className="h-2 w-24 bg-slate-200 rounded-full animate-pulse opacity-50" />
        </div>
    );

    return (
        <div className="min-h-[100dvh] bg-[#f4f7f6] font-sans text-slate-900 pb-32 relative selection:bg-emerald-200">
            
            {/* --- ULTRA-SLEEK GLASS HEADER --- */}
            <header className="sticky top-0 z-40 w-full transform-gpu">
                <div className={`absolute inset-0 bg-white/85 backdrop-blur-2xl border-b border-slate-200/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)] transition-opacity duration-500 ease-out pointer-events-none ${isScrolled ? "opacity-100" : "opacity-0"}`} />
                
                <div className={`relative z-10 max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12 transition-all duration-300 ease-out ${isScrolled ? "pt-2 pb-2" : "pt-5 md:pt-8 pb-2"}`}>
                    
                    <div className={`flex items-center justify-between transition-all duration-300 ${isScrolled ? "mb-2" : "mb-6"}`}>
                        <div className="flex items-center gap-2.5 md:gap-3 group cursor-default">
                            <motion.div layout className={`relative shrink-0 flex items-center justify-center transition-all duration-300 ${isScrolled ? "w-8 h-8" : "w-12 h-12 md:w-16 md:h-16"}`}>
                                {!isScrolled && <div className="absolute inset-0 bg-emerald-500 rounded-full blur-xl opacity-15 group-hover:opacity-30 transition-opacity duration-700" />}
                                {restaurantLogo ? (
                                    <img src={restaurantLogo} alt="Logo" className="w-full h-full object-contain drop-shadow-sm relative z-10" />
                                ) : (
                                    <div className="w-full h-full bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center relative z-10">
                                        <ChefHat className={`${isScrolled ? "w-4 h-4" : "w-6 h-6"} text-emerald-600`} />
                                    </div>
                                )}
                            </motion.div>

                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <motion.div layout className="flex items-center gap-2">
                                    <h1 className={`font-black text-slate-900 leading-none truncate tracking-tight transition-all duration-300 ${isScrolled ? "text-lg" : "text-xl md:text-3xl"}`}>
                                        {restaurantName}
                                    </h1>
                                    {!isScrolled && (
                                        <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 shadow-sm">
                                            <span className="relative flex h-1.5 w-1.5">
                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                            </span>
                                            <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest">Live Menu</span>
                                        </div>
                                    )}
                                </motion.div>
                                <AnimatePresence>{!isScrolled && <LiveHeaderBadge />}</AnimatePresence>
                            </div>
                        </div>
                    </div>

                    {/* Interactive Search Bar */}
                    <div className="relative w-full max-w-2xl mb-4 transform transition-all group mx-auto md:mx-0">
                        <div className="absolute inset-0 bg-emerald-500/10 rounded-xl blur-md transition-opacity duration-300 opacity-0 group-focus-within:opacity-100" />
                        <div className="relative bg-white/80 backdrop-blur-xl rounded-xl shadow-sm border border-slate-200/80 flex items-center overflow-hidden transition-all group-focus-within:bg-white group-focus-within:border-emerald-300 group-focus-within:shadow-[0_8px_25px_rgb(16,185,129,0.15)] group-focus-within:scale-[1.01]">
                            <div className="pl-3 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                                <Search className="w-4 h-4" />
                            </div>
                            <input 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search dishes, ingredients..."
                                className="w-full h-11 pl-2.5 pr-4 bg-transparent text-[13px] md:text-[14px] font-bold placeholder:text-slate-400 focus:outline-none text-slate-800"
                            />
                            <AnimatePresence>
                                {search && (
                                    <motion.button 
                                        initial={{ opacity: 0, scale: 0.5, rotate: -90 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
                                        onClick={() => setSearch("")} 
                                        className="pr-3 text-slate-400 hover:text-red-500 transition-colors active:scale-90"
                                    >
                                        <div className="bg-slate-100 group-focus-within:bg-red-50 p-1.5 rounded-full"><X className="w-3.5 h-3.5" /></div>
                                    </motion.button>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                    
                    {/* Magnetic Category Pills */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 md:mx-0 md:px-0 scroll-smooth transform-gpu">
                        <motion.button 
                            whileTap={{ scale: 0.92 }}
                            onClick={() => { setActiveCategory("All"); setSearch(""); }} 
                            className={`relative flex-shrink-0 px-4 py-2 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${activeCategory === "All" ? 'text-white shadow-lg shadow-slate-900/20' : 'text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900'}`}
                        >
                            {activeCategory === "All" && <motion.div layoutId="activePill" className="absolute inset-0 bg-slate-900 rounded-lg" transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} />}
                            <span className="relative z-10">All Items</span>
                        </motion.button>

                        {menu.map((cat) => (
                            <motion.button 
                                key={cat.id} 
                                whileTap={{ scale: 0.92 }}
                                onClick={() => { setActiveCategory(cat.category_name); setSearch(""); }} 
                                className={`relative flex-shrink-0 px-4 py-2 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${activeCategory === cat.category_name ? 'text-white shadow-lg shadow-slate-900/20' : 'text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900'}`}
                            >
                                {activeCategory === cat.category_name && <motion.div layoutId="activePill" className="absolute inset-0 bg-slate-900 rounded-lg" transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} />}
                                <span className="relative z-10">{cat.category_name}</span>
                            </motion.button>
                        ))}
                    </div>
                </div>
            </header>

            {/* --- PREMIUM COMPACT SPOTLIGHT CAROUSEL WITH PROGRESS BAR --- */}
            <AnimatePresence>
                {showSpecialsCarousel && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: "auto" }} 
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className="w-full transform-gpu overflow-hidden pt-3 pb-4 md:pb-5 bg-gradient-to-b from-transparent to-amber-50/30"
                    >
                        <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12">
                            <div className="flex justify-between items-end mb-3 px-1">
                                <div>
                                    <h2 className="font-black text-slate-900 text-lg md:text-xl tracking-tight flex items-center gap-1.5">
                                        <Flame className="w-4 h-4 text-orange-500 fill-orange-500/20 animate-pulse" /> Today's Spotlight
                                    </h2>
                                    <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 flex items-center gap-2">
                                        Chef's Selections
                                        {/* Animated Progress Bar indicating auto-scroll */}
                                        {!isCarouselHovered && specialItems.length > 1 && (
                                            <span className="w-16 h-1 bg-slate-200 rounded-full overflow-hidden inline-block">
                                                <motion.span 
                                                    key={progressKey}
                                                    initial={{ width: "0%" }}
                                                    animate={{ width: "100%" }}
                                                    transition={{ duration: 3.5, ease: "linear" }}
                                                    className="h-full bg-orange-400 block rounded-full"
                                                />
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div 
                                ref={carouselRef}
                                onMouseEnter={() => setIsCarouselHovered(true)}
                                onMouseLeave={() => setIsCarouselHovered(false)}
                                onTouchStart={() => setIsCarouselHovered(true)}
                                onTouchEnd={() => setIsCarouselHovered(false)}
                                className="flex gap-3 md:gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-4 -mx-4 px-4 md:mx-0 md:px-0"
                            >
                                {specialItems.map((item: any, idx: number) => {
                                    const hasVariants = item.variants && item.variants.length > 0;
                                    const variantStr = hasVariants ? `Rs ${Math.min(...item.variants.map((v:any)=>v.price))} +` : `Rs ${item.price || 0}`;

                                    return (
                                        <motion.div 
                                            key={`special-${item.id}`}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: idx * 0.05, type: "spring", stiffness: 400 }}
                                            whileTap={{ scale: 0.96 }}
                                            onClick={() => { setSelectedItem(item); setSelectedVariant(hasVariants ? item.variants[0] : null); }}
                                            className="relative snap-always snap-center shrink-0 w-[270px] md:w-[320px] rounded-2xl p-2.5 md:p-3.5 bg-white border border-amber-200/50 shadow-[0_4px_15px_rgba(245,158,11,0.08)] cursor-pointer overflow-hidden group hover:shadow-[0_12px_30px_rgba(245,158,11,0.2)] transform-gpu"
                                        >
                                            {/* Glowing Background pulse */}
                                            <div className="absolute -inset-10 bg-gradient-to-br from-amber-200/20 via-orange-100/10 to-transparent opacity-50 pointer-events-none z-0 rounded-full blur-2xl group-hover:opacity-100 transition-opacity duration-700" />
                                            
                                            <div className="relative z-10 flex gap-3">
                                                <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden shrink-0 shadow-inner relative bg-amber-50">
                                                    {item.image_url ? (
                                                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center text-amber-300"><Star className="w-6 h-6 opacity-40" /></div>
                                                    )}
                                                    <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-orange-500 text-white text-[7px] md:text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-bl-lg shadow-sm flex items-center gap-1">
                                                        <StarIcon className="w-2 h-2 animate-pulse" /> Special
                                                    </div>
                                                </div>
                                                
                                                <div className="flex-1 flex flex-col py-0.5 min-w-0">
                                                    <h3 className="font-black text-slate-900 text-sm md:text-base leading-tight line-clamp-2 pr-1 group-hover:text-amber-600 transition-colors">{item.name}</h3>
                                                    <p className="text-[10px] md:text-[11px] text-slate-500 line-clamp-2 mt-1 leading-snug font-medium pr-1">
                                                        {item.description || "Chef's choice for today."}
                                                    </p>
                                                    <div className="mt-auto pt-2 flex items-end justify-between border-t border-amber-100/50">
                                                        <div>
                                                            <span className="font-black text-slate-900 text-sm md:text-base tracking-tight">{variantStr}</span>
                                                        </div>
                                                        <div className="w-6 h-6 md:w-7 md:h-7 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 group-hover:bg-amber-500 group-hover:text-white group-hover:scale-110 transition-all shadow-sm">
                                                            <ChevronRight className="w-3.5 h-3.5" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- COMPACT, ELEGANT MENU GRID --- */}
            <div className="p-3 md:p-6 lg:p-8 max-w-[1400px] mx-auto min-h-[50vh]">
                <AnimatePresence mode="wait">
                    {filteredItems.length === 0 ? (
                        <motion.div 
                            key="empty-state"
                            initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className="col-span-full py-20 text-center flex flex-col items-center"
                        >
                            <motion.div 
                                animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                                className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-5 shadow-xl shadow-slate-200/50"
                            >
                                <Search className="w-8 h-8 text-slate-300" />
                            </motion.div>
                            <h3 className="font-black text-slate-900 text-xl md:text-2xl tracking-tight">Nothing found</h3>
                            <p className="text-xs md:text-sm text-slate-500 mt-2 font-medium">Try searching for something else.</p>
                            {activeCategory !== "All" && (
                                <motion.button 
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => { setActiveCategory("All"); setSearch(""); }} 
                                    className="mt-6 px-6 py-2.5 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-600 transition-colors shadow-lg shadow-slate-900/20"
                                >
                                    Clear Filters
                                </motion.button>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div 
                            key={`grid-${activeCategory}-${deferredSearch ? 'search' : 'full'}`}
                            variants={containerVar} 
                            initial="hidden" 
                            animate="show"
                            className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 lg:gap-5"
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
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => { setSelectedItem(item); setSelectedVariant(hasVariants ? item.variants[0] : null); }}
                                            className="bg-white p-3 md:p-4 rounded-2xl border border-slate-100 shadow-[0_4px_15px_rgba(0,0,0,0.02)] hover:-translate-y-1.5 transition-all duration-300 cursor-pointer group hover:border-emerald-200 hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.2)] flex flex-col h-full relative transform-gpu will-change-transform"
                                        >
                                            <div className="flex gap-2.5 md:gap-3 mb-2">
                                                <div className="w-16 h-16 md:w-20 md:h-20 shrink-0 rounded-xl overflow-hidden relative shadow-inner border border-slate-100/50 bg-slate-50">
                                                    {item.image_url ? (
                                                        <img loading="lazy" src={item.image_url} alt={item.name} className={`w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out`} />
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300"><ImageIcon className="w-6 h-6 opacity-30" /></div>
                                                    )}
                                                    
                                                    <div className="absolute top-1 left-1 bg-white/95 backdrop-blur-md p-1 rounded-md border border-slate-100 shadow-sm flex items-center justify-center z-20">
                                                        <BadgeIcon className={`w-3 h-3 md:w-3.5 md:h-3.5 ${badgeColor}`} />
                                                    </div>
                                                </div>

                                                <div className="flex-1 min-w-0 flex flex-col pt-0.5">
                                                    <h3 className="font-black text-slate-900 text-sm md:text-base leading-tight line-clamp-2 group-hover:text-emerald-600 transition-colors">{item.name}</h3>
                                                    <p className="text-[9px] md:text-[11px] text-slate-500 line-clamp-2 mt-1 leading-snug font-medium pr-1">
                                                        {item.description || "Freshly prepared for you."}
                                                    </p>
                                                </div>
                                            </div>

                                            {hasVariants ? (
                                                <div className="mt-auto pt-3 border-t border-slate-50">
                                                    <div className="flex items-center gap-1 mb-1.5">
                                                        <Layers className="w-3 h-3 text-emerald-500" />
                                                        <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">Options</span>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        {displayVariants.map((v: any, idx: number) => (
                                                            <div key={idx} className="flex justify-between items-center bg-slate-50/60 group-hover:bg-emerald-50/40 px-2.5 py-1.5 rounded-lg transition-colors border border-slate-100/50 group-hover:border-emerald-100/50">
                                                                <span className="text-[10px] md:text-xs font-bold text-slate-700 truncate mr-2">{v.name}</span>
                                                                <span className="text-[10px] md:text-xs font-black text-emerald-600 shrink-0">Rs {v.price}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {item.variants.length > 3 && (
                                                        <div className="text-center mt-1.5">
                                                            <span className="text-[9px] font-bold text-slate-400 group-hover:text-emerald-500 transition-colors">+{item.variants.length - 3} more</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="mt-auto pt-3 border-t border-slate-50 flex items-center justify-between">
                                                    <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest"> Price</span>
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

            {/* --- REFINED FLOATING ACTION BAR WITH SHIMMER EFFECT --- */}
            {!isViewOnly && (
                <div className="fixed bottom-5 left-0 right-0 px-4 md:px-5 z-30 pointer-events-none">
                    <div className="max-w-md mx-auto pointer-events-auto">
                        <motion.button 
                            initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} whileTap={{ scale: 0.95 }}
                            className="w-full bg-slate-900/95 backdrop-blur-xl text-white p-2.5 md:p-3 pr-4 rounded-full shadow-[0_20px_40px_rgb(0,0,0,0.3)] flex items-center justify-between border border-slate-700/50 group overflow-hidden relative transform-gpu"
                        >
                            {/* Continuous Glass Shimmer Animation */}
                            <motion.div 
                                animate={{ x: ['-200%', '300%'] }} 
                                transition={{ repeat: Infinity, duration: 3, ease: "linear", repeatDelay: 1 }} 
                                className="absolute inset-0 z-0 w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12" 
                            />
                            
                            <div className="flex items-center gap-3 relative z-10">
                                <div className="w-10 h-10 md:w-11 md:h-11 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-[0_0_15px_rgba(16,185,129,0.5)] group-hover:scale-110 transition-all">
                                    <ShoppingBag className="w-4 h-4 md:w-5 md:h-5" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[8px] md:text-[9px] text-emerald-400 uppercase font-black tracking-[0.2em] mb-0.5">Start Order</p>
                                    <p className="text-xs md:text-sm font-bold tracking-wide">Call waiter to order</p>
                                </div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors relative z-10">
                                <ChevronRight className="w-4 h-4 text-white" />
                            </div>
                        </motion.button>
                    </div>
                </div>
            )}

            {/* --- ULTRA-CRISP DETAIL MODAL WITH SWIPE-TO-CLOSE --- */}
            <AnimatePresence>
                {selectedItem && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-8 overflow-hidden">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                            onClick={() => setSelectedItem(null)} 
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transform-gpu" 
                        />
                        
                        <motion.div 
                            initial={{ y: "100%" }} 
                            animate={{ y: 0 }} 
                            exit={{ y: "100%" }} 
                            transition={{ type: "spring", damping: 28, stiffness: 450, mass: 0.3 }}
                            // The Swipe-to-Close Magic
                            drag="y"
                            dragConstraints={{ top: 0, bottom: 0 }}
                            dragElastic={0.2}
                            onDragEnd={(e, info) => {
                                if (info.offset.y > 150 || info.velocity.y > 500) {
                                    setSelectedItem(null);
                                }
                            }}
                            className="bg-[#f8fafc] w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] p-0 relative z-10 shadow-2xl h-[88vh] sm:h-auto sm:max-h-[85vh] flex flex-col overflow-hidden transform-gpu will-change-transform border border-white/20 touch-pan-y"
                        >
                            {/* Mobile Drag Handle */}
                            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/50 backdrop-blur-md rounded-full z-50 sm:hidden" />

                            <button onClick={() => setSelectedItem(null)} className="absolute top-5 right-5 w-8 h-8 bg-white/70 backdrop-blur-md rounded-full flex items-center justify-center text-slate-800 z-50 hover:bg-white transition-colors shadow-sm ring-1 ring-white/50 active:scale-90">
                                <X className="w-4 h-4" />
                            </button>

                            <div className="flex-1 overflow-y-auto no-scrollbar pb-safe">
                                <div className="w-full aspect-[16/11] bg-slate-200 relative shrink-0">
                                    {selectedItem.image_url ? (
                                        <img src={selectedItem.image_url} alt={selectedItem.name} className="w-full h-full object-cover pointer-events-none" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-100"><ImageIcon className="w-12 h-12 opacity-30" /></div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#f8fafc] via-[#f8fafc]/5 to-transparent opacity-100 pointer-events-none" />
                                    
                                    <div className={`absolute bottom-4 left-5 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border shadow-sm backdrop-blur-md bg-white/95 ${
                                        selectedItem.dietary === 'veg' ? 'text-green-700 border-green-200' : 
                                        selectedItem.dietary === 'drinks' ? 'text-blue-700 border-blue-200' :
                                        selectedItem.dietary === 'hookah' ? 'text-orange-700 border-orange-200' :
                                        selectedItem.dietary === 'tobacco' ? 'text-slate-700 border-slate-300' :
                                        'text-red-700 border-red-200'
                                    }`}>
                                        {selectedItem.dietary || "Non-Veg"}
                                    </div>
                                </div>

                                <div className="px-5 md:px-6 pb-6 -mt-1 relative z-10 shrink-0">
                                    <div className="mb-5">
                                        <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight mb-1.5 tracking-tight">{selectedItem.name}</h2>
                                        {selectedItem.sub_category && <span className="inline-block text-[9px] font-black bg-slate-200/80 text-slate-600 px-2 py-0.5 rounded uppercase tracking-wider mb-2.5">{selectedItem.sub_category}</span>}
                                        <p className="text-slate-500 text-[13px] md:text-sm leading-relaxed font-medium">
                                            {selectedItem.description || "A delicious signature item prepared with care and fresh ingredients."}
                                        </p>
                                    </div>

                                    {selectedItem.image_url && (
                                        <div className="mb-6 flex items-start gap-2.5 p-3 bg-slate-100/70 rounded-xl border border-slate-200/50">
                                            <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                            <p className="text-[11px] text-slate-500 font-medium leading-snug">
                                                Images are for illustrative purposes. Actual presentation may vary, but great taste is guaranteed!
                                            </p>
                                        </div>
                                    )}

                                    {selectedItem.variants && selectedItem.variants.length > 0 ? (
                                        <div className="space-y-2 mb-6">
                                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1 flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> Choose Option</h4>
                                            {selectedItem.variants.map((v: any, i: number) => {
                                                const isSelected = selectedVariant?.name === v.name;
                                                return (
                                                    <motion.div 
                                                        key={i} 
                                                        whileTap={{ scale: 0.98 }}
                                                        onClick={() => setSelectedVariant(v)}
                                                        className={`flex justify-between items-center p-3.5 md:p-4 rounded-xl transition-all cursor-pointer border-2 ${
                                                            isSelected ? 'bg-emerald-50 border-emerald-500 shadow-[0_4px_15px_rgba(16,185,129,0.15)]' : 'bg-white border-slate-100 hover:border-slate-300'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center transition-colors ${isSelected ? 'bg-emerald-500 text-white' : 'border-2 border-slate-200'}`}>
                                                                {isSelected && <CheckCircle2 className="w-2.5 h-2.5 md:w-3 md:h-3" />}
                                                            </div>
                                                            <span className={`font-bold text-sm md:text-base ${isSelected ? 'text-emerald-900' : 'text-slate-700'}`}>{v.name}</span>
                                                        </div>
                                                        <span className={`font-black text-sm md:text-base ${isSelected ? 'text-emerald-600' : 'text-slate-900'}`}>Rs {v.price}</span>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="mb-6 flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                                            <span className="font-bold text-slate-500 uppercase tracking-widest text-[10px]">Fixed Price</span>
                                            <span className="font-black text-2xl text-emerald-600 tracking-tighter">Rs {selectedItem.price || 0}</span>
                                        </div>
                                    )}

                                    {isViewOnly ? (
                                        <div className="p-3.5 bg-slate-100 rounded-xl flex items-center gap-3 border border-slate-200">
                                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm text-slate-400">
                                                <Info className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-[11px] text-slate-900 font-black uppercase tracking-wider mb-0.5">View Only Menu</p>
                                                <p className="text-[10px] text-slate-500 font-medium">Please let your waiter know your choice.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <motion.button 
                                            whileTap={{ scale: 0.96 }}
                                            className="w-full py-3.5 md:py-4 bg-slate-900 text-white font-black rounded-xl shadow-[0_10px_25px_rgba(15,23,42,0.3)] hover:bg-emerald-600 hover:shadow-[0_10px_25px_rgba(16,185,129,0.3)] transition-all flex justify-center items-center gap-2 text-sm md:text-base"
                                        >
                                            <ShoppingBag className="w-4 h-4" /> Add to Order
                                        </motion.button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                /* Ensure touch dragging works perfectly on mobile */
                .touch-pan-y { touch-action: pan-y; }
            `}</style>
        </div>
    );
}