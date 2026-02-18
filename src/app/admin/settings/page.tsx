"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/app/admin/Sidebar";
import { 
  QrCode, Copy, Download, ExternalLink, 
  Loader2, Utensils, Link as LinkIcon,
  Maximize2, X, ChefHat, Search, Sparkles, 
  Layers, Beef, Leaf, GlassWater, Plus, ShoppingBag, ChevronRight
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { getDashboardData } from "@/app/actions/dashboard";
import { getMenuData } from "@/app/actions/menu-optimized";

// --- TYPES ---
interface Variant { name: string; price: number | string; }
interface MenuItem { 
    id: string; name: string; description: string; price: number | string; 
    image_url: string; is_available: boolean; variants: Variant[]; 
    dietary?: string; sub_category?: string;
}
interface Category { id: string; category_name: string; items: MenuItem[]; }

export default function SettingsPage() {
  const [tenant, setTenant] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuUrl, setMenuUrl] = useState<string>(""); 
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const qrRef = useRef<SVGSVGElement>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const [dashData, menuRes] = await Promise.all([
            getDashboardData(),
            getMenuData()
        ]);
        
        if (isMounted) {
            let t = dashData?.tenant as any;
            let tenantId = t?.id;

            // Fallback Logic: If Dashboard ID fails, use Menu ID
            if (!tenantId && (menuRes as any).tenant_id) {
                tenantId = (menuRes as any).tenant_id;
                t = { ...t, id: tenantId, name: t?.name || "My Restaurant" };
            }

            if (tenantId) {
                setTenant(t);
                
                if (menuRes.success && menuRes.categories) {
                    const safeCats = menuRes.categories.map((c: any) => ({
                        ...c, 
                        items: Array.isArray(c.items) ? c.items : [] 
                    }));
                    setCategories(safeCats);
                }

                const origin = typeof window !== 'undefined' ? window.location.origin : '';
                setMenuUrl(`${origin}/menu/${tenantId}?mode=view`);
            } else {
                toast.error("Could not verify identity. Please relogin.");
            }
        }
      } catch (error) {
        console.error("Init Error:", error);
        toast.error("Failed to load settings.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    init();
    return () => { isMounted = false; };
  }, []);

  // --- PREMIUM POSTER GENERATOR ---
  const handleDownload = () => {
    const svg = qrRef.current;
    if (!svg) return toast.error("Wait for QR to generate");
    
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
        canvas.width = 1200; canvas.height = 1700;
        if (ctx) {
    // ===== Canvas Base =====
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 1200, 1700);

    // ===== Decorative Arc =====
    ctx.fillStyle = "#ecfdf5";
    ctx.beginPath();
    ctx.ellipse(600, -80, 950, 650, 0, 0, Math.PI * 2);
    ctx.fill();

    // ===== Header =====
    ctx.textAlign = "center";
    ctx.font = "bold 82px sans-serif";
    ctx.fillStyle = "#064e3b";
    ctx.fillText(tenant?.name || "Digital Menu", 600, 260);

    ctx.font = "600 34px sans-serif";
    ctx.fillStyle = "#10b981";
    ctx.fillText("SCAN TO VIEW MENU", 600, 335);

    // ===== QR Card =====
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.12)";
    ctx.shadowBlur = 60;
    ctx.shadowOffsetY = 30;
    ctx.fillStyle = "#ffffff";
    ctx.roundRect(180, 420, 840, 840, 70);
    ctx.fill();
    ctx.restore();

    // Inner Border
    ctx.strokeStyle = "#d1fae5";
    ctx.lineWidth = 4;
    ctx.roundRect(200, 440, 800, 800, 60);
    ctx.stroke();

    // QR Image
    ctx.drawImage(img, 250, 490, 700, 700);

    // ===== Helper Text =====
    ctx.font = "italic 500 28px sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.fillText("You are browsing the digital menu.", 600, 1340);
    ctx.fillText("Please ask your waiter to place an order.", 600, 1385);

    // ===== Divider =====
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(200, 1460);
    ctx.lineTo(1000, 1460);
    ctx.stroke();

    // ===== Footer Branding (NO OVERLAP FIX) =====
    ctx.save();
    ctx.shadowColor = "rgba(16,185,129,0.35)";
    ctx.shadowBlur = 25;

    const footerY = 1525;

    // "Powered by"
    ctx.font = "600 30px sans-serif";
    ctx.fillStyle = "#0f172a";
    ctx.textAlign = "right";
    ctx.fillText("Powered by", 540, footerY);

    // GeckoRMS center group
    ctx.textAlign = "left";
    ctx.font = "bold 36px sans-serif";

    const geckoText = "Gecko";
    const rmsText = "RMS";

    const geckoWidth = ctx.measureText(geckoText).width;

    const startX = 560;

    // Gecko
    ctx.fillStyle = "#10b981";
    ctx.fillText(geckoText, startX, footerY);

    // RMS (perfectly placed after Gecko)
    ctx.fillStyle = "#22c55e";
    ctx.fillText(rmsText, startX + geckoWidth + 6, footerY);

    ctx.restore();

    // ===== Tagline =====
    ctx.font = "500 20px sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "center";
    ctx.fillText("Smart Restaurant Management System", 600, 1580);

    // ===== Download =====
    const pngUrl = canvas.toDataURL("image/png");
    const dl = document.createElement("a");
    dl.href = pngUrl;
    dl.download = `${(tenant?.name || "menu").replace(/\s+/g, "_")}_Premium_Poster.png`;
    document.body.appendChild(dl);
    dl.click();
    document.body.removeChild(dl);

    toast.success("Premium Poster Downloaded");
}
        URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const copyToClipboard = () => {
    if (!menuUrl) return;
    navigator.clipboard.writeText(menuUrl);
    toast.success("Link copied!");
  };

  if (loading) return (
    <div className="flex h-screen bg-[#F8FAFC]">
       <div className="hidden md:block"><Sidebar tenantName="" tenantCode="" /></div> 
       <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center"><Utensils className="w-6 h-6 text-emerald-500" /></div>
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading Digital Menu Settings...</p>
       </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden selection:bg-emerald-500 selection:text-white">
      <div className="hidden md:block">
        <Sidebar tenantName={tenant?.name} tenantCode={tenant?.code} logo={tenant?.logo_url} />
      </div>

      <main className="flex-1 flex flex-col h-full overflow-y-auto relative custom-scrollbar bg-gradient-to-b from-white to-slate-50/50">
        
        {/* Page Header */}
        <header className="px-8 py-6 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-30 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="p-2.5 bg-slate-900 rounded-xl shadow-lg shadow-slate-900/20">
                    <QrCode className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Touchpoint Studio</h1>
                    <p className="text-xs font-semibold text-slate-400 mt-1">Manage digital access points</p>
                </div>
            </div>
        </header>

        <div className="p-6 md:p-10 max-w-[1600px] mx-auto w-full grid grid-cols-1 xl:grid-cols-12 gap-10 pb-40">
            
            {/* --- LEFT: QR GENERATOR (5 Cols) --- */}
            <div className="xl:col-span-5 space-y-6">
                
                {/* QR Card */}
                <motion.div 
                    initial={{ opacity: 0, y: 30 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)] overflow-hidden relative group"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-emerald-50/30" />
                    
                    <div className="p-10 flex flex-col items-center text-center relative z-10">
                        {/* Logo */}
                        <div className="mb-8 w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center shadow-xl shadow-slate-200/50 border border-slate-50 overflow-hidden">
                            {tenant?.logo_url ? (
                                <img src={tenant.logo_url} className="w-full h-full object-cover" />
                            ) : (
                                <ChefHat className="w-10 h-10 text-slate-800" />
                            )}
                        </div>
                        
                        {/* QR Code */}
                        <div className="relative group-hover:scale-[1.02] transition-transform duration-500">
                            <div className="p-5 bg-white rounded-[2rem] shadow-xl border border-slate-100 relative z-10">
                                {menuUrl ? (
                                    <QRCodeSVG value={menuUrl} size={220} level="Q" includeMargin={true} ref={qrRef} className="rounded-xl" fgColor="#1e293b" />
                                ) : (
                                    <div className="w-[220px] h-[220px] flex items-center justify-center bg-slate-50 rounded-xl"><Loader2 className="w-10 h-10 text-slate-300 animate-spin" /></div>
                                )}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-14 h-14 bg-white rounded-2xl shadow-lg flex items-center justify-center border-2 border-slate-50">
                                        <Utensils className="w-6 h-6 text-emerald-600" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8">
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{tenant?.name}</h2>
                            <div className="mt-2 flex items-center justify-center gap-2">
                                <span className="relative flex h-2.5 w-2.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                </span>
                                <p className="text-sm font-bold text-emerald-600 uppercase tracking-widest">Active Menu</p>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="bg-slate-50/80 p-5 border-t border-slate-100 grid grid-cols-2 gap-4 backdrop-blur-md">
                        <button onClick={copyToClipboard} className="col-span-1 h-14 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-50 flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all">
                            <Copy className="w-4 h-4 text-slate-400" /> Copy Link
                        </button>
                        <button onClick={handleDownload} className="col-span-1 h-14 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-emerald-600 flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20 active:scale-95 transition-all group">
                            <Download className="w-4 h-4 group-hover:animate-bounce" /> Save Poster
                        </button>
                    </div>
                </motion.div>
                
                {/* Link Info */}
                <div className="bg-white rounded-[2rem] border border-slate-100 p-6 flex items-center gap-5 shadow-sm">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0"><LinkIcon className="w-6 h-6" /></div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Menu URL</p>
                        <p className="text-xs font-medium text-slate-600 truncate font-mono bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">{menuUrl || "Loading..."}</p>
                    </div>
                    <a href={menuUrl} target="_blank" className="w-10 h-10 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all"><ExternalLink className="w-5 h-5" /></a>
                </div>
            </div>

            {/* --- RIGHT: LIVE PREVIEW (7 Cols) --- */}
            <div className="xl:col-span-7 flex flex-col items-center xl:items-start relative pl-0 xl:pl-10">
                <div className="flex items-center justify-between w-full mb-8">
                    <div>
                        <h3 className="text-xl font-black text-slate-900">Live Preview</h3>
                        <p className="text-sm text-slate-500 font-medium">Synced with your menu</p>
                    </div>
                    <button onClick={() => setIsPreviewOpen(true)} className="px-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 hover:border-emerald-500 hover:text-emerald-600 transition-all flex items-center gap-2 shadow-sm">
                        <Maximize2 className="w-4 h-4" /> Expand
                    </button>
                </div>

                {/* 3D Phone Mockup */}
                <div className="relative w-[360px] h-[720px] bg-[#0f172a] rounded-[4rem] p-4 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.25)] border-[8px] border-[#1e293b] ring-1 ring-white/10 mx-auto xl:mx-0 transform hover:scale-[1.01] transition-transform duration-500">
                    {/* Gloss & Buttons */}
                    <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-white/5 to-transparent rounded-r-[3.5rem] pointer-events-none z-20" />
                    <div className="absolute top-32 -right-[10px] w-[6px] h-24 bg-[#334155] rounded-r-md" />
                    <div className="absolute top-28 -left-[10px] w-[6px] h-12 bg-[#334155] rounded-l-md" />
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-8 bg-black rounded-b-3xl z-30 flex items-center justify-center"><div className="w-20 h-5 bg-[#1e293b]/50 rounded-full" /></div>
                    
                    {/* SCREEN CONTENT */}
                    <div className="w-full h-full bg-[#F8FAFC] rounded-[3.2rem] overflow-hidden relative custom-scrollbar overflow-y-auto no-scrollbar">
                        
                        {/* App Header (Matches Public Menu) */}
                        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-100 px-5 py-4 pt-12 flex items-center justify-between shadow-sm">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm overflow-hidden">
                                    {tenant?.logo_url ? <img src={tenant.logo_url} className="w-full h-full object-cover" /> : <ChefHat className="w-6 h-6 text-emerald-600" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="block font-black text-sm text-slate-900 truncate w-32">{tenant?.name}</span>
                                    <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 uppercase tracking-wide">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Menu
                                    </span>
                                </div>
                             </div>
                             <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400"><Search className="w-5 h-5" /></div>
                        </div>

                        <div className="p-5 space-y-5 pb-28">
                            {/* Search Bar Visual */}
                            <div className="relative bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center p-3 opacity-80">
                                <Search className="w-4 h-4 text-slate-400 mr-2" />
                                <div className="h-2 w-24 bg-slate-100 rounded-full" />
                            </div>

                            {/* Categories & Items */}
                            {categories.length === 0 ? (
                                <div className="text-center py-12 opacity-50 flex flex-col items-center">
                                    <Utensils className="w-12 h-12 mb-4 text-slate-300" />
                                    <p className="text-sm font-bold text-slate-400">Loading your menu...</p>
                                </div>
                            ) : (
                                categories.map((cat) => (
                                    cat.items.length > 0 && (
                                        <div key={cat.id} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                                            <div className="flex items-center justify-between mb-3 px-1">
                                                <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">{cat.category_name}</h4>
                                                <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{cat.items.length}</span>
                                            </div>
                                            
                                            <div className="space-y-3">
                                                {cat.items.slice(0, 3).map((item) => {
                                                    const hasVariants = item.variants && item.variants.length > 0;
                                                    const isVeg = item.dietary === 'veg';
                                                    let BadgeIcon = Beef;
                                                    let badgeStyle = 'bg-red-50 text-red-600 border-red-100';
                                                    if(isVeg) { BadgeIcon = Leaf; badgeStyle = 'bg-green-50 text-green-600 border-green-100'; }
                                                    else if(item.dietary === 'drinks') { BadgeIcon = GlassWater; badgeStyle = 'bg-blue-50 text-blue-600 border-blue-100'; }

                                                    return (
                                                        <div key={item.id} className="bg-white p-3 rounded-[1.2rem] border border-slate-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
                                                            {/* Top Row: Image & Text */}
                                                            <div className="flex gap-3">
                                                                <div className="w-20 h-20 bg-slate-50 rounded-xl overflow-hidden flex-shrink-0 relative border border-slate-50">
                                                                    {item.image_url ? <img src={item.image_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><Utensils className="w-6 h-6" /></div>}
                                                                    <div className={`absolute top-1.5 left-1.5 p-1 rounded-md text-[8px] font-black border ${badgeStyle} bg-white/90 backdrop-blur`}><BadgeIcon className="w-2 h-2" /></div>
                                                                </div>
                                                                <div className="flex-1 min-w-0 flex flex-col">
                                                                    <div className="flex justify-between items-start">
                                                                        <p className="font-black text-xs text-slate-900 truncate pr-2">{item.name}</p>
                                                                    </div>
                                                                    <p className="text-[9px] text-slate-500 truncate mt-0.5">{item.description || "Freshly prepared"}</p>
                                                                    
                                                                    {!hasVariants && (
                                                                        <div className="mt-auto flex justify-between items-center">
                                                                            <span className="text-xs font-black text-slate-900">Rs {item.price}</span>
                                                                            <div className="w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center text-white"><Plus className="w-3 h-3" /></div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Inline Variants (Visual Only) */}
                                                            {hasVariants && (
                                                                <div className="mt-3 pt-2 border-t border-slate-100 space-y-1.5">
                                                                    <div className="flex items-center gap-1 mb-1 opacity-50"><Layers className="w-2.5 h-2.5" /><span className="text-[9px] font-bold uppercase">Options</span></div>
                                                                    {item.variants.slice(0, 2).map((v, i) => (
                                                                        <div key={i} className="flex justify-between items-center px-2 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                                                                            <span className="text-[10px] font-bold text-slate-700 truncate">{v.name}</span>
                                                                            <span className="text-[10px] font-black text-emerald-600">Rs {v.price}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )
                                ))
                            )}
                        </div>

                        {/* Floating FAB */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20 w-full px-6 pointer-events-none">
                            
                        </div>
                    </div>
                </div>
            </div>

        </div>

        {/* --- FULL SCREEN PREVIEW MODAL --- */}
        <AnimatePresence>
            {isPreviewOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPreviewOpen(false)} className="absolute inset-0 bg-slate-900/90 backdrop-blur-md" />
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative z-10 w-full max-w-[420px] h-[90vh] bg-white rounded-[3rem] overflow-hidden shadow-2xl border-8 border-slate-900 ring-4 ring-white/10">
                        <iframe src={menuUrl} className="w-full h-full bg-white" />
                        <button onClick={() => setIsPreviewOpen(false)} className="absolute top-6 right-6 w-10 h-10 bg-slate-900/80 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors shadow-lg z-50 border border-white/10">
                            <X className="w-5 h-5" />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
      </main>
    </div>
  );
}