"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/app/staff/manager/Sidebar"; 
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, Square, Circle, LayoutGrid, Loader2, MonitorSmartphone, 
  Layers, Compass, ZoomIn, ZoomOut, Search, Filter, 
  CheckCircle2, Clock, AlertCircle, X, ChevronRight, Receipt, MapPin,
  ChefHat, CheckCheck, Utensils
} from "lucide-react";
import { toast } from "sonner";
import { getTables } from "@/app/actions/floor"; 
import { getPOSStats } from "@/app/actions/pos"; 
import { getDashboardData } from "@/app/actions/dashboard"; 

// --- TYPES ---
interface TableData {
    id: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    seats: number;
    shape: 'square' | 'round' | 'rectangle';
    status: 'available' | 'occupied' | 'reserved' | 'payment'; 
    section: string;
}

// --- HELPERS ---
const formatRs = (amount: number) => {
    return "Rs " + new Intl.NumberFormat('en-NP', { maximumFractionDigits: 0 }).format(amount);
};

export default function ManagerFloorPage() {
  const [tenant, setTenant] = useState<any>(null);
  const [tables, setTables] = useState<TableData[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]); // Store ALL orders raw
  const [sections, setSections] = useState<string[]>(["Main Hall"]);
  const [currentSection, setCurrentSection] = useState("Main Hall");
  const [loading, setLoading] = useState(true);
  
  // --- INTERACTION STATE ---
  const [selectedTable, setSelectedTable] = useState<TableData | null>(null);
  const [viewFilter, setViewFilter] = useState<'all' | 'occupied' | 'free'>('all');

  // --- VIEWPORT STATE ---
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // --- INIT ---
  useEffect(() => {
    loadRealData();
    const interval = setInterval(loadRealData, 5000); // Poll every 5s

    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
        window.removeEventListener('resize', checkMobile);
        clearInterval(interval);
    };
  }, []);

  async function loadRealData() {
      try {
        const [dashRes, posRes] = await Promise.all([ 
            getDashboardData(), 
            getPOSStats() 
        ]);

        if(dashRes) setTenant(dashRes.tenant);
        
        if(posRes.success && posRes.stats?.tables) {
            const rawTables = posRes.stats.tables;
            const ordersList = posRes.stats.orders_list || [];
            
            // Store raw orders
            setAllOrders(ordersList);

            // Merge Data
            const liveTables = rawTables.map((t: any) => {
                const hasActiveOrder = ordersList.some((o: any) => 
                    o.tbl === t.label && !['cancelled', 'paid', 'completed'].includes(o.status)
                );

                let visualStatus = t.status === 'free' ? 'available' : t.status;
                if (hasActiveOrder && visualStatus === 'available') visualStatus = 'occupied'; 

                return {
                    ...t,
                    status: visualStatus,
                    section: t.section || "Main Hall",
                    width: t.width || 100,
                    height: t.height || 100,
                    seats: t.seats || 4,
                };
            });

            setTables(liveTables);

            // Extract Sections
            const loadedSections = Array.from(new Set(liveTables.map((t: any) => t.section))).sort() as string[];
            if (loadedSections.length > 0 && sections.length <= 1) {
                setSections(loadedSections);
                setCurrentSection(loadedSections[0]);
            }
        }
      } catch (e) {
          toast.error("Sync Error");
      } finally {
          setLoading(false);
      }
  }

  // Center Viewport on Load
  useEffect(() => {
      if(canvasRef.current && !loading) {
          if (window.innerWidth < 768) setScale(0.6);
          setPan({ x: 0, y: 0 });
      }
  }, [loading]);

  const visibleTables = tables.filter(t => {
      const sectionMatch = (t.section || "Main Hall").toLowerCase() === currentSection.toLowerCase();
      if (!sectionMatch) return false;
      
      if (viewFilter === 'occupied') return t.status === 'occupied' || t.status === 'payment';
      if (viewFilter === 'free') return t.status === 'available';
      return true;
  });

  const activeCount = tables.filter(t => t.status !== 'available').length;

  // --- HELPER: Get Table Details for Modal ---
  const getSelectedTableDetails = () => {
      if (!selectedTable) return null;
      
      const tableOrders = allOrders.filter(o => 
          o.tbl === selectedTable.label && !['cancelled', 'paid', 'completed'].includes(o.status)
      );

      let allItems: any[] = [];
      let totalAmount = 0;
      let startTime: string | null = null; 

      tableOrders.forEach(order => {
          totalAmount += (order.total || 0);
          if (!startTime || new Date(order.timestamp) < new Date(startTime)) startTime = order.timestamp;
          
          if (Array.isArray(order.items)) {
              order.items.forEach((item: any) => {
                  allItems.push({
                      ...item,
                      orderStatus: order.status
                  });
              });
          }
      });

      // Format Start Time (e.g. "12:30 PM")
      let formattedTime = "N/A";
      if (startTime) {
          formattedTime = new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }

      return { items: allItems, total: totalAmount, orderTime: formattedTime, orderCount: tableOrders.length };
  };

  const details = getSelectedTableDetails();

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]"><Loader2 className="w-12 h-12 text-emerald-600 animate-spin" /></div>;

  return (
    <div className="flex h-[100dvh] bg-[#F8FAFC] font-sans text-slate-900 selection:bg-emerald-500 selection:text-white overflow-hidden">
      
      <Sidebar tenantName={tenant?.name} tenantCode={tenant?.code} logo={tenant?.logo_url} />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* --- HEADER --- */}
        <header className="flex-shrink-0 h-auto min-h-[4.5rem] px-4 md:px-6 py-2 flex flex-col md:flex-row items-center justify-between z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-sm gap-3">
            <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0 pl-12 lg:pl-0"> 
                <div className="hidden md:flex items-center gap-3 pr-4 border-r border-slate-100">
                    <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/20"><Layers className="w-5 h-5 text-white" /></div>
                    <div>
                        <h1 className="text-lg font-black text-slate-900 leading-none">Floor Monitor</h1>
                        <p className="text-[10px] font-bold text-emerald-600 mt-0.5 uppercase tracking-wide">{activeCount} Active Tables</p>
                    </div>
                </div>
                
                {/* FLOOR TABS */}
                <div className="flex items-center gap-2 flex-nowrap">
                    {sections.map(section => (
                        <button 
                            key={section} 
                            onClick={() => { setCurrentSection(section); setSelectedTable(null); }} 
                            className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all border ${currentSection === section ? 'bg-emerald-600 text-white border-emerald-600 shadow-md transform scale-105' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                        >
                            {section}
                        </button>
                    ))}
                </div>
            </div>

            {/* FILTER CONTROLS */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <div className="bg-slate-100 p-1 rounded-xl flex items-center">
                    <button onClick={() => setViewFilter('all')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${viewFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>All</button>
                    <button onClick={() => setViewFilter('occupied')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${viewFilter === 'occupied' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Busy</button>
                    <button onClick={() => setViewFilter('free')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${viewFilter === 'free' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Free</button>
                </div>
            </div>
        </header>

        {/* --- INFINITE CANVAS --- */}
        <div className="flex-1 relative bg-[#F8FAFC] overflow-hidden">
            
            {/* CONTROLS */}
            <div className="absolute top-6 right-6 z-20 pointer-events-none select-none flex flex-col gap-4">
                <div className="relative w-16 h-16 flex items-center justify-center bg-white/80 backdrop-blur-md rounded-full border border-white/60 shadow-xl group hover:scale-110 transition-transform">
                    <Compass className="w-16 h-16 text-slate-200 absolute opacity-40" strokeWidth={1} />
                    <span className="absolute top-1 text-[8px] font-black text-slate-900">N</span>
                    <div className="w-1 h-8 bg-gradient-to-b from-red-500 to-slate-300 rounded-full shadow-sm z-10" />
                </div>
                <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 flex flex-col overflow-hidden pointer-events-auto">
                    <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-3 hover:bg-slate-50 border-b border-slate-100"><ZoomIn className="w-5 h-5" /></button>
                    <button onClick={() => setScale(s => Math.max(0.4, s - 0.1))} className="p-3 hover:bg-slate-50"><ZoomOut className="w-5 h-5" /></button>
                </div>
            </div>

            {/* LEGEND */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-white/60 flex items-center gap-4 text-[10px] font-bold text-slate-500">
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-white border-2 border-slate-300" /> Vacant</div>
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-100 border-2 border-red-500" /> Occupied</div>
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-100 border-2 border-amber-500" /> Payment</div>
                </div>
            </div>

            {/* DRAGGABLE SURFACE */}
            <motion.div 
                ref={canvasRef}
                className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
                drag dragMomentum={false}
                onDrag={(e, info) => setPan(p => ({ x: p.x + info.delta.x, y: p.y + info.delta.y }))}
            >
                <motion.div 
                    className="absolute top-0 left-0 w-full h-full origin-center"
                    style={{ x: pan.x, y: pan.y, scale: scale }}
                >
                    <div className="absolute inset-[-500%] pointer-events-none flex items-center justify-center bg-[#F8FAFC]">
                        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: `radial-gradient(#cbd5e1 1.5px, transparent 1.5px)`, backgroundSize: '40px 40px' }} />
                        <h1 className="text-[15vw] font-black text-slate-200/60 uppercase rotate-[-10deg] whitespace-nowrap tracking-tight select-none z-0 blur-[1px]">
                            {currentSection}
                        </h1>
                    </div>
                    
                    <div className="relative w-full h-full z-10">
                        <AnimatePresence>
                            {visibleTables.map((t) => (
                                <ViewerTable 
                                    key={t.id} 
                                    data={t} 
                                    onClick={() => setSelectedTable(t)}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </motion.div>
        </div>

        {/* --- TABLE DETAIL MODAL --- */}
        <AnimatePresence>
            {selectedTable && details && (
                <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedTable(null)} className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40" />
                    <motion.div 
                        initial={{ opacity: 0, y: 100, scale: 0.95 }} 
                        animate={{ opacity: 1, y: 0, scale: 1 }} 
                        exit={{ opacity: 0, y: 100, scale: 0.95 }}
                        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-96 bg-white rounded-[2rem] shadow-2xl border border-white/20 z-50 overflow-hidden ring-1 ring-black/5 flex flex-col max-h-[80vh]"
                    >
                        {/* Status Bar */}
                        <div className={`h-2 w-full ${selectedTable.status === 'occupied' ? 'bg-red-500' : selectedTable.status === 'available' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        
                        <div className="p-6 flex flex-col h-full overflow-hidden">
                            
                            {/* Header */}
                            <div className="flex justify-between items-start mb-6 flex-shrink-0">
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">{selectedTable.label}</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedTable.section}</p>
                                        <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedTable.seats} Seats</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedTable(null)} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
                            </div>

                            {/* Content based on Status */}
                            {selectedTable.status === 'available' ? (
                                <div className="text-center py-10 flex-1 flex flex-col items-center justify-center">
                                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-inner"><CheckCircle2 className="w-10 h-10 text-emerald-500" /></div>
                                    <p className="text-lg font-bold text-slate-700">Table is Ready</p>
                                    <p className="text-xs text-slate-400 mt-1">Available for seating</p>
                                </div>
                            ) : (
                                <div className="flex flex-col h-full overflow-hidden">
                                    
                                    {/* Stats Row */}
                                    <div className="grid grid-cols-2 gap-3 mb-6 flex-shrink-0">
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-center">
                                            <div className="flex items-center gap-2 mb-1 text-slate-400">
                                                <Clock className="w-3 h-3" /> <span className="text-[10px] font-bold uppercase">Order Time</span>
                                            </div>
                                            <p className="text-xl font-black text-slate-800">{details.orderTime}</p>
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-center">
                                            <div className="flex items-center gap-2 mb-1 text-slate-400">
                                                <Receipt className="w-3 h-3" /> <span className="text-[10px] font-bold uppercase">Total</span>
                                            </div>
                                            <p className="text-xl font-black text-slate-800">{formatRs(details.total)}</p>
                                        </div>
                                    </div>

                                    {/* Order List (Scrollable) */}
                                    <div className="flex-1 overflow-y-auto custom-scrollbar border-t border-slate-100 pt-4 space-y-3 -mr-2 pr-2">
                                        {details.items.length === 0 ? (
                                            <p className="text-center text-slate-400 text-xs py-4">No items ordered yet.</p>
                                        ) : (
                                            details.items.map((item: any, i: number) => {
                                                const isServed = item.status === 'served';
                                                const isCooking = item.status === 'cooking' || item.status === 'pending';
                                                
                                                return (
                                                    <div key={i} className="flex justify-between items-center group">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold border ${isServed ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                                                                {item.qty}x
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-800 leading-tight">{item.name}</p>
                                                                {item.variant && <p className="text-[10px] text-slate-400">{item.variant}</p>}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            {isServed ? (
                                                                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 flex items-center gap-1"><CheckCheck className="w-2.5 h-2.5" /> Served</span>
                                                            ) : isCooking ? (
                                                                <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 flex items-center gap-1"><ChefHat className="w-2.5 h-2.5" /> Prep</span>
                                                            ) : (
                                                                <span className="text-[9px] font-bold text-slate-400">{item.status}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>

                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>

      </main>
    </div>
  );
}

// --- VIEWER TABLE COMPONENT ---
function ViewerTable({ data, onClick }: any) {
    const isOccupied = data.status === 'occupied';
    const isPayment = data.status === 'payment';
    
    // Explicit Status Label
    const statusLabel = isOccupied ? "OCCUPIED" : isPayment ? "PAYMENT" : "VACANT";

    const containerStyle = isOccupied 
        ? 'bg-gradient-to-br from-red-50 to-white border-red-200 text-red-600 shadow-xl shadow-red-500/20 ring-1 ring-red-100'
        : isPayment
        ? 'bg-gradient-to-br from-amber-50 to-white border-amber-200 text-amber-600 shadow-xl shadow-amber-500/20 ring-1 ring-amber-100'
        : 'bg-gradient-to-br from-white to-emerald-50/30 border-slate-200 text-slate-700 shadow-lg shadow-slate-200/50 hover:border-emerald-400 hover:shadow-emerald-500/10';

    const renderSeats = () => {
        const seats = [];
        const count = data.seats || 2;
        const w = data.width;
        const h = data.height;
        const chairDist = 18; 

        if (data.shape === 'round') {
            const radius = Math.max(w, h) / 2;
            for (let i = 0; i < count; i++) {
                const angle = (i * 360) / count;
                const rad = (angle - 90) * (Math.PI / 180);
                const x = (w/2) + (radius + chairDist) * Math.cos(rad);
                const y = (h/2) + (radius + chairDist) * Math.sin(rad);
                seats.push({ x, y, rot: angle });
            }
        } else {
            const perimeter = 2 * w + 2 * h;
            const segment = perimeter / count;
            for (let i = 0; i < count; i++) {
                let d = (i * segment) + (segment / 2);
                d = d % perimeter;
                let x = 0, y = 0, rot = 0;
                if (d < w) { x = d; y = -chairDist; rot = 0; } 
                else if (d < w + h) { x = w + chairDist; y = d - w; rot = 90; } 
                else if (d < 2 * w + h) { x = w - (d - (w + h)); y = h + chairDist; rot = 180; } 
                else { x = -chairDist; y = h - (d - (2 * w + h)); rot = 270; }
                const buffer = 22;
                if(rot === 0 || rot === 180) { x = Math.max(buffer, Math.min(x, w - buffer)); }
                if(rot === 90 || rot === 270) { y = Math.max(buffer, Math.min(y, h - buffer)); }
                seats.push({ x, y, rot });
            }
        }

        return seats.map((s, i) => (
            <div key={i} className="absolute w-10 h-10 flex items-center justify-center pointer-events-none transition-all duration-500" style={{ left: s.x - 20, top: s.y - 20, transform: `rotate(${s.rot}deg)` }}>
                <div className={`relative w-9 h-8 transition-colors duration-500 ${isOccupied ? 'opacity-100' : 'opacity-40'}`}>
                    <div className={`absolute top-0 left-0 w-full h-3 rounded-full border shadow-sm transition-colors duration-500 ${isOccupied ? 'bg-red-400 border-red-500' : isPayment ? 'bg-amber-400 border-amber-500' : 'bg-white border-slate-300'}`} />
                    <div className={`absolute bottom-0 left-1 w-[80%] h-5 rounded-xl border shadow-sm transition-colors duration-500 ${isOccupied ? 'bg-red-200 border-red-300' : isPayment ? 'bg-amber-200 border-amber-300' : 'bg-slate-100 border-slate-300'}`} />
                </div>
            </div>
        ));
    };

    return (
        <motion.div
            layout={false} 
            initial={{ scale: 0 }}
            animate={{ 
                scale: 1,
                width: data.width, height: data.height, borderRadius: data.shape === 'round' ? '50%' : '24px', rotate: data.rotation || 0,
                transition: { type: "spring", stiffness: 200, damping: 20 } 
            }}
            style={{ x: data.x, y: data.y }} 
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`absolute flex flex-col items-center justify-center border-2 select-none cursor-pointer group touch-none backdrop-blur-sm ${containerStyle}`}
        >
            <div>{renderSeats()}</div>
            <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-br from-white/60 to-transparent pointer-events-none" />
            <div className="z-10 flex flex-col items-center justify-center w-full h-full p-2" style={{ transform: `rotate(-${data.rotation}deg)` }}>
                <h3 className="font-black text-xl md:text-2xl leading-none text-center tracking-tight drop-shadow-sm transition-colors">{data.label}</h3>
                
                {/* Visual Status Text */}
                {(isOccupied || isPayment) ? (
                    <div className={`flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-md backdrop-blur-md border ${isOccupied ? 'bg-red-500/90 text-white border-red-400' : 'bg-amber-500/90 text-white border-amber-400'}`}>
                        <span className="text-[9px] font-black uppercase tracking-wider">{statusLabel}</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-full border border-slate-200/50 opacity-50">
                        <Users className="w-3 h-3" />
                        <span className="text-[10px] font-bold">{data.seats}</span>
                    </div>
                )}
            </div>
        </motion.div>
    );
}