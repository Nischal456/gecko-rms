"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/app/admin/Sidebar"; 
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Save, Trash2, Move, Users, Square, Circle, LayoutGrid, 
  Loader2, MonitorSmartphone, Layers, Minus, RotateCw, Maximize2, Type, 
  ZoomIn, ZoomOut, Compass, Receipt, Clock, CheckCircle2, X, ChevronRight,
  ChefHat, CheckCheck
} from "lucide-react";
import { toast } from "sonner";
import { getTables, saveTableLayout, deleteTable } from "@/app/actions/floor";
import { getDashboardData } from "@/app/actions/dashboard"; 
import { getPOSStats } from "@/app/actions/pos"; 
import { v4 as uuidv4 } from 'uuid';

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

// --- HELPER ---
const formatRs = (amount: number) => "Rs " + new Intl.NumberFormat('en-NP', { maximumFractionDigits: 0 }).format(amount);

export default function FloorPlanPage() {
  const [tenant, setTenant] = useState<any>(null);
  const [tables, setTables] = useState<TableData[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]); 
  
  // --- STATE ---
  const [sections, setSections] = useState<string[]>(["Main Hall"]);
  const [currentSection, setCurrentSection] = useState("Main Hall");
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");

  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [viewTable, setViewTable] = useState<TableData | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  // --- VIEWPORT STATE ---
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // --- CRITICAL FIX: REF TO TRACK EDIT MODE IN INTERVAL ---
  const editModeRef = useRef(isEditMode);

  useEffect(() => {
      editModeRef.current = isEditMode;
  }, [isEditMode]);

  // --- INIT ---
  useEffect(() => {
    loadRealData();
    const interval = setInterval(loadRealData, 5000); // Live Poll every 5s

    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
        window.removeEventListener('resize', checkMobile);
        clearInterval(interval);
    }
  }, []);

  async function loadRealData() {
      // FIX: IF EDITING, DO NOT OVERWRITE LOCAL STATE WITH DB DATA
      if (editModeRef.current) return;

      try {
        const [dashRes, posRes] = await Promise.all([ 
            getDashboardData(), 
            getPOSStats() 
        ]);

        if(dashRes) setTenant(dashRes.tenant);
        
        if(posRes.success && posRes.stats?.tables) {
            const rawTables = posRes.stats.tables;
            const ordersList = posRes.stats.orders_list || [];
            
            setAllOrders(ordersList);

            // Merge & Sync Status
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
            
            // Only update sections if we found new ones from DB, preserving current Selection if valid
            if (loadedSections.length > 0) {
                // Ensure Main Hall is always there if list empty
                if(loadedSections.length === 0 && sections.length === 0) setSections(["Main Hall"]);
                else setSections(prev => {
                    // Merge unique sections
                    const unique = Array.from(new Set([...prev, ...loadedSections]));
                    return unique.length > 0 ? unique : ["Main Hall"];
                });
            }
        }
      } catch (e) {
          console.error("Sync Error", e);
      } finally {
          setLoading(false);
      }
  }

  // --- ORDER DETAILS HELPER ---
  const getSelectedTableDetails = () => {
      if (!viewTable) return null;
      
      const tableOrders = allOrders.filter(o => 
          o.tbl === viewTable.label && !['cancelled', 'paid', 'completed'].includes(o.status)
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

      let formattedTime = "N/A";
      if (startTime) {
          formattedTime = new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }

      return { items: allItems, total: totalAmount, orderTime: formattedTime };
  };

  const orderDetails = getSelectedTableDetails();

  // --- ACTIONS ---
  const handleAddSection = () => {
      if(!newSectionName.trim()) return;
      if(sections.includes(newSectionName)) {
          toast.error("Floor exists");
          return;
      }
      const updatedSections = [...sections, newSectionName];
      setSections(updatedSections);
      setCurrentSection(newSectionName);
      setIsAddingSection(false);
      setNewSectionName("");
      toast.success(`Created ${newSectionName}`);
  };

  const addTable = (shape: 'square' | 'round' | 'rectangle') => {
    const currentFloorTables = tables.filter(t => t.section === currentSection);
    const newId = uuidv4(); 
    const container = canvasRef.current;
    let centerX = 0;
    let centerY = 0;

    if (container) {
        if (isMobile) {
            centerX = (container.clientWidth / 2 - pan.x) / scale;
            centerY = (container.clientHeight / 2 - pan.y) / scale;
        } else {
            centerX = container.clientWidth / 2 - 60;
            centerY = container.clientHeight / 2 - 60;
        }
    }

    const newTable: TableData = {
      id: newId,
      label: `${currentSection.substring(0,1).toUpperCase()}-${currentFloorTables.length + 1}`,
      x: centerX + (Math.random() * 40 - 20),
      y: centerY + (Math.random() * 40 - 20),
      width: shape === 'rectangle' ? 160 : 120, 
      height: shape === 'rectangle' ? 100 : 120,
      rotation: 0,
      seats: shape === 'rectangle' ? 6 : 4,
      shape,
      status: 'available',
      section: currentSection
    };
    
    setTables([...tables, newTable]);
    setSelectedTableId(newId);
    toast.success("Table Added");
  };

  const updateTable = (id: string, updates: Partial<TableData>) => {
    setTables(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleDelete = async (id: string) => {
    setTables(prev => prev.filter(t => t.id !== id));
    setDeletedIds(prev => [...prev, id]);
    setSelectedTableId(null);
  };

  const handleSave = async () => {
    setSaving(true);
    // 1. Delete removed tables
    if(deletedIds.length > 0) {
        await Promise.all(deletedIds.map(id => deleteTable(id)));
        setDeletedIds([]); 
    }
    // 2. Save current tables
    const res = await saveTableLayout(tables);
    if(res.success) {
      toast.success("Layout Saved");
      setIsEditMode(false);
      setSelectedTableId(null);
      // Force reload to confirm DB state matches local
      setTimeout(loadRealData, 500); 
    } else {
      toast.error("Save Failed");
    }
    setSaving(false);
  };

  const visibleTables = tables.filter(t => (t.section || "Main Hall").toLowerCase() === currentSection.toLowerCase());

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]"><Loader2 className="w-12 h-12 text-emerald-500 animate-spin" /></div>;

  return (
    <div className="flex h-[100dvh] bg-[#F8FAFC] font-sans text-slate-900 selection:bg-emerald-500 selection:text-white overflow-hidden">
      
      <Sidebar tenantName={tenant?.name} tenantCode={tenant?.code} logo={tenant?.logo_url} />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* --- HEADER --- */}
        <header className="flex-shrink-0 h-auto min-h-[4rem] px-4 md:px-6 py-2 flex flex-col md:flex-row items-center justify-between z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-sm gap-2">
            
            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0 pl-12 lg:pl-0"> 
                <div className="hidden md:flex items-center gap-3 pr-4 border-r border-slate-100">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/20"><Layers className="w-5 h-5 text-white" /></div>
                    <div><h1 className="text-lg font-black text-slate-900 leading-tight">FloorPlan</h1></div>
                </div>
                
                {/* TABS */}
                <div className="flex items-center gap-1.5 flex-nowrap">
                    {sections.map(section => (
                        <button key={section} onClick={() => { setCurrentSection(section); setSelectedTableId(null); setViewTable(null); }} className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-all border ${currentSection === section ? 'bg-slate-900 text-white border-slate-900 shadow-md transform scale-105' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>{section}</button>
                    ))}
                    {isEditMode && (
                        <>
                            <button onClick={() => isAddingSection ? handleAddSection() : setIsAddingSection(true)} className="min-w-[36px] w-9 h-9 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors border border-emerald-200"><Plus className="w-5 h-5" /></button>
                            {isAddingSection && <input autoFocus value={newSectionName} onChange={e => setNewSectionName(e.target.value)} onBlur={handleAddSection} onKeyDown={e => e.key === 'Enter' && handleAddSection()} className="w-28 px-3 py-1.5 text-sm border-2 border-emerald-500 rounded-xl shadow-lg animate-in fade-in zoom-in" placeholder="Name..." />}
                        </>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <AnimatePresence mode="wait">
                    {isEditMode ? (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50">
                            <div className="flex gap-1 pr-2 border-r border-slate-100">
                                <button onClick={() => addTable('square')} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-900 transition-colors"><Square className="w-5 h-5" /></button>
                                <button onClick={() => addTable('round')} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-900 transition-colors"><Circle className="w-5 h-5" /></button>
                                <button onClick={() => addTable('rectangle')} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-900 transition-colors"><MonitorSmartphone className="w-5 h-5 rotate-90" /></button>
                            </div>
                            <button onClick={() => { setIsEditMode(false); setSelectedTableId(null); loadRealData(); }} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/30 flex items-center gap-2 transition-all active:scale-95">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save</button>
                        </motion.div>
                    ) : (
                        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setIsEditMode(true)} className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-sm shadow-xl shadow-slate-900/20 flex items-center gap-2 transition-transform active:scale-95"><Move className="w-4 h-4" /> Edit Layout</motion.button>
                    )}
                </AnimatePresence>
            </div>
        </header>

        {/* --- INFINITE CANVAS --- */}
        <div className="flex-1 relative bg-[#F8FAFC] overflow-hidden">
            
            {/* 1. COMPASS & LEGEND */}
            <div className="absolute top-6 right-6 z-20 pointer-events-none select-none flex flex-col items-end gap-4">
                <div className="relative w-16 h-16 flex items-center justify-center bg-white/60 backdrop-blur-md rounded-full border border-white/80 shadow-lg group hover:scale-110 transition-transform pointer-events-auto">
                    <Compass className="w-16 h-16 text-slate-200 absolute opacity-50" strokeWidth={1} />
                    <span className="absolute top-1 text-[8px] font-black text-slate-900">N</span>
                    <div className="w-1 h-8 bg-gradient-to-b from-red-500 to-slate-300 rounded-full shadow-sm z-10" />
                </div>
            </div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-white/60 flex items-center gap-4 text-[10px] font-bold text-slate-500">
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-white border-2 border-slate-300" /> Vacant</div>
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-100 border-2 border-red-500" /> Occupied</div>
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-100 border-2 border-amber-500" /> Payment</div>
                </div>
            </div>

            {/* 2. ZOOM CONTROLS (Mobile) */}
            {isMobile && (
                <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-3 pointer-events-auto">
                    <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 flex flex-col overflow-hidden">
                        <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-4 hover:bg-slate-50 text-slate-700 active:bg-emerald-50 active:text-emerald-600 transition-colors"><ZoomIn className="w-6 h-6" /></button>
                        <div className="h-px bg-slate-100 mx-2" />
                        <button onClick={() => setScale(s => Math.max(0.3, s - 0.1))} className="p-4 hover:bg-slate-50 text-slate-700 active:bg-emerald-50 active:text-emerald-600 transition-colors"><ZoomOut className="w-6 h-6" /></button>
                    </div>
                </div>
            )}

            {/* 3. DRAGGABLE SURFACE */}
            <motion.div 
                ref={canvasRef}
                className={`w-full h-full touch-none ${isMobile && !isEditMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
                drag={isMobile && !isEditMode}
                dragMomentum={false}
                onDrag={(e, info) => {
                    if (isMobile && !isEditMode) {
                        setPan(p => ({ x: p.x + info.delta.x, y: p.y + info.delta.y }));
                    }
                }}
            >
                <motion.div 
                    className="absolute top-0 left-0 w-full h-full origin-center"
                    style={{ 
                        x: isMobile ? pan.x : 0, 
                        y: isMobile ? pan.y : 0, 
                        scale: isMobile ? scale : 1 
                    }}
                >
                    <div className="absolute inset-[-500%] pointer-events-none flex items-center justify-center bg-[#F8FAFC]">
                        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: `radial-gradient(#94a3b8 1.5px, transparent 1.5px)`, backgroundSize: '40px 40px' }} />
                        <h1 className="text-[15vw] font-black text-slate-200/50 uppercase rotate-[-10deg] whitespace-nowrap tracking-tight select-none z-0">
                            {currentSection}
                        </h1>
                    </div>
                    
                    <div className="relative w-full h-full z-10">
                        <AnimatePresence>
                            {visibleTables.map((t) => (
                                <DraggableTable 
                                    key={t.id} 
                                    data={t} 
                                    isEditMode={isEditMode} 
                                    isSelected={selectedTableId === t.id}
                                    onSelect={() => setSelectedTableId(t.id)}
                                    onUpdate={(updates: any) => updateTable(t.id, updates)}
                                    onDelete={handleDelete}
                                    onViewOrder={() => setViewTable(t)} // View Order Action
                                    scale={isMobile ? scale : 1} 
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </motion.div>

            {/* --- ORDER DETAILS MODAL --- */}
            <AnimatePresence>
                {viewTable && orderDetails && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewTable(null)} className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40" />
                        <motion.div 
                            initial={{ opacity: 0, y: 100, scale: 0.95 }} 
                            animate={{ opacity: 1, y: 0, scale: 1 }} 
                            exit={{ opacity: 0, y: 100, scale: 0.95 }}
                            className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-96 bg-white rounded-[2rem] shadow-2xl border border-white/20 z-50 overflow-hidden ring-1 ring-black/5 flex flex-col max-h-[80vh]"
                        >
                            <div className={`h-2 w-full ${viewTable.status === 'occupied' ? 'bg-red-500' : viewTable.status === 'available' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            <div className="p-6 flex flex-col h-full overflow-hidden">
                                <div className="flex justify-between items-start mb-6 flex-shrink-0">
                                    <div>
                                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">{viewTable.label}</h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{viewTable.section}</p>
                                            <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{viewTable.seats} Seats</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setViewTable(null)} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
                                </div>

                                {viewTable.status === 'available' ? (
                                    <div className="text-center py-10 flex-1 flex flex-col items-center justify-center">
                                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-inner"><CheckCircle2 className="w-10 h-10 text-emerald-500" /></div>
                                        <p className="text-lg font-bold text-slate-700">Table is Ready</p>
                                        <p className="text-xs text-slate-400 mt-1">Available for seating</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col h-full overflow-hidden">
                                        <div className="grid grid-cols-2 gap-3 mb-6 flex-shrink-0">
                                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-center">
                                                <div className="flex items-center gap-2 mb-1 text-slate-400"><Clock className="w-3 h-3" /> <span className="text-[10px] font-bold uppercase">Ordered At</span></div>
                                                <p className="text-xl font-black text-slate-800">{orderDetails.orderTime}</p>
                                            </div>
                                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-center">
                                                <div className="flex items-center gap-2 mb-1 text-slate-400"><Receipt className="w-3 h-3" /> <span className="text-[10px] font-bold uppercase">Total</span></div>
                                                <p className="text-xl font-black text-slate-800">{formatRs(orderDetails.total)}</p>
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-y-auto custom-scrollbar border-t border-slate-100 pt-4 space-y-3 -mr-2 pr-2">
                                            {orderDetails.items.length === 0 ? <p className="text-center text-slate-400 text-xs py-4">No items ordered yet.</p> : orderDetails.items.map((item: any, i: number) => (
                                                <div key={i} className="flex justify-between items-center group">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold border bg-slate-100 text-slate-500 border-slate-200">{item.qty}x</div>
                                                        <div><p className="text-sm font-bold text-slate-800 leading-tight">{item.name}</p></div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${item.orderStatus === 'served' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-orange-600 bg-orange-50 border-orange-100'}`}>
                                                            {item.orderStatus === 'served' ? <CheckCheck className="w-2.5 h-2.5" /> : <ChefHat className="w-2.5 h-2.5" />} {item.orderStatus}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// --- PREMIUM TABLE COMPONENT ---
function DraggableTable({ data, isEditMode, isSelected, onSelect, onUpdate, onDelete, onViewOrder, scale }: any) {
    const isOccupied = data.status === 'occupied';
    const isPayment = data.status === 'payment';
    
    // Status Styles
    const statusStyle = 
        isEditMode ? (isSelected ? 'bg-white ring-4 ring-emerald-100 border-emerald-500 z-50 shadow-2xl scale-105' : 'bg-white border-slate-300 text-slate-400') : 
        isOccupied ? 'bg-gradient-to-br from-red-50 to-white border-red-200 text-red-600 shadow-xl shadow-red-100/50' :
        isPayment ? 'bg-gradient-to-br from-amber-50 to-white border-amber-200 text-amber-600 shadow-xl shadow-amber-100/50' :
        'bg-gradient-to-br from-white to-slate-50 border-2 border-slate-300 text-slate-800 shadow-xl shadow-slate-200/60 hover:border-emerald-400 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300'; 

    const renderSeats = () => {
        const seats = [];
        const count = data.seats || 2;
        const w = data.width;
        const h = data.height;
        const chairDist = 20; 

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
            <div key={i} className="absolute w-10 h-10 flex items-center justify-center pointer-events-none transition-all duration-300" style={{ left: s.x - 20, top: s.y - 20, transform: `rotate(${s.rot}deg)` }}>
                <div className={`relative w-9 h-8 transition-colors ${isOccupied ? 'opacity-90' : 'opacity-100'}`}>
                    <div className={`absolute top-0 left-0 w-full h-3 rounded-full border border-slate-300/60 shadow-sm ${isOccupied ? 'bg-red-400' : 'bg-white'}`} />
                    <div className={`absolute bottom-0 left-1 w-[80%] h-5 rounded-xl border border-slate-300/60 shadow-sm ${isOccupied ? 'bg-red-200' : 'bg-slate-100'}`} />
                </div>
            </div>
        ));
    };

    return (
        <motion.div
            layout={false} 
            initial={false}
            animate={{ 
                width: data.width, height: data.height, borderRadius: data.shape === 'round' ? '50%' : '24px', rotate: data.rotation || 0,
                transition: { type: "spring", stiffness: 400, damping: 25 } 
            }}
            style={{ x: data.x, y: data.y }} 
            drag={isEditMode} 
            dragMomentum={false} 
            dragElastic={0}
            onDragEnd={(e, info) => {
                const newX = data.x + (info.offset.x / scale);
                const newY = data.y + (info.offset.y / scale);
                onUpdate({ x: Math.round(newX/10)*10, y: Math.round(newY/10)*10 });
            }}
            onClick={(e) => { 
                e.stopPropagation(); 
                if(isEditMode) onSelect(); 
                else onViewOrder(); // Open Order Details
            }}
            className={`absolute flex flex-col items-center justify-center select-none group touch-none ${statusStyle} ${!isEditMode && 'cursor-pointer'}`}
        >
            <div>{renderSeats()}</div>
            <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-br from-white/60 to-transparent pointer-events-none" />
            <div className="z-10 flex flex-col items-center justify-center w-full h-full p-2" style={{ transform: `rotate(-${data.rotation}deg)` }}>
                <h3 className="font-black text-xl md:text-2xl leading-none text-slate-900 text-center tracking-tight drop-shadow-sm">{data.label}</h3>
                
                {/* Visual Status Text */}
                {(isOccupied || isPayment) ? (
                    <div className={`flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-md backdrop-blur-md border ${isOccupied ? 'bg-red-500/90 text-white border-red-400' : 'bg-amber-500/90 text-white border-amber-400'}`}>
                        <span className="text-[9px] font-black uppercase tracking-wider">{isOccupied ? "OCCUPIED" : "PAYMENT"}</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 mt-1.5 bg-white/60 px-3 py-1 rounded-full backdrop-blur-md shadow-sm border border-white/50">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-xs font-bold text-slate-600">{data.seats}</span>
                    </div>
                )}
            </div>

            {isEditMode && isSelected && (
                <>
                    <div 
                        className="absolute -top-20 left-1/2 -translate-x-1/2 bg-slate-900 text-white p-2 rounded-2xl flex items-center gap-2 shadow-2xl z-[100] w-max pointer-events-auto touch-none border border-white/20"
                        style={{ transform: `rotate(-${data.rotation}deg) scale(${Math.max(1, 1/scale)})` }} 
                        onPointerDown={(e) => e.stopPropagation()} 
                    >
                        <div className="flex items-center bg-white/10 rounded-xl px-2.5 mr-1">
                            <Type className="w-4 h-4 text-slate-400 mr-2" />
                            <input className="w-16 bg-transparent text-sm font-bold text-white outline-none py-2 text-center placeholder-white/30" value={data.label} onChange={(e) => onUpdate({ label: e.target.value })} placeholder="T-1" />
                        </div>
                        <button onClick={() => onUpdate({ seats: Math.max(1, data.seats - 1) })} className="p-2 hover:bg-white/20 rounded-xl transition-colors"><Minus className="w-4 h-4" /></button>
                        <span className="text-sm font-black w-6 text-center">{data.seats}</span>
                        <button onClick={() => onUpdate({ seats: Math.min(20, data.seats + 1) })} className="p-2 hover:bg-white/20 rounded-xl transition-colors"><Plus className="w-4 h-4" /></button>
                        <div className="w-px h-5 bg-white/20 mx-2"></div>
                        <button onClick={() => onUpdate({ rotation: (data.rotation + 45) % 360 })} className="p-2 hover:bg-white/20 rounded-xl transition-colors"><RotateCw className="w-4 h-4" /></button>
                        <button onClick={() => onDelete(data.id)} className="p-2 bg-red-500 rounded-xl hover:bg-red-600 ml-2 transition-colors shadow-lg shadow-red-500/20"><Trash2 className="w-4 h-4" /></button>
                    </div>

                    <motion.div 
                        drag dragMomentum={false} dragElastic={0}
                        onDrag={(e, info) => {
                            e.stopPropagation();
                            const newW = Math.max(80, data.width + (info.delta.x / scale));
                            const newH = Math.max(80, data.height + (info.delta.y / scale));
                            onUpdate({ width: newW, height: newH });
                        }}
                        style={{ touchAction: 'none' }}
                        className="absolute -bottom-6 -right-6 w-14 h-14 bg-white border-[5px] border-emerald-500 rounded-full flex items-center justify-center cursor-nwse-resize shadow-2xl z-50 hover:scale-110 active:scale-95 transition-transform"
                    >
                        <Maximize2 className="w-6 h-6 text-emerald-600" />
                    </motion.div>
                </>
            )}
        </motion.div>
    );
}