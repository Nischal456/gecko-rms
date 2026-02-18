"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { 
  ChefHat, Clock, CheckCircle2, Flame, Bell, Utensils, 
  X, LogOut, RefreshCcw, Check, CheckCheck, 
  Volume2, VolumeX, LayoutGrid, FileBarChart, Ban, AlertTriangle, Play, GripVertical, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { getKitchenTickets, updateTicketStatus, updateItemStatus, disableMenuItem } from "@/app/actions/kitchen";
import { logoutStaff } from "@/app/actions/staff-auth";
import NepaliDate from 'nepali-date-converter';

// --- CONFIG ---
const ALERT_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const SWIPE_THRESHOLD = 100; // Pixel distance to trigger swipe

// --- TYPES ---
interface KitchenItem {
    id: string;
    name: string;
    quantity: number;
    notes?: string;
    status: string; // 'pending' | 'cooking' | 'ready' | 'served'
    station: string;
}

interface KitchenTicket {
    id: string;
    table_name: string; 
    status: 'pending' | 'preparing' | 'cooking' | 'ready' | 'served';
    created_at: string; 
    order_items: KitchenItem[]; 
}

// --- UTILS ---
const nepaliMonths = ["Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];
const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

function toNepaliDigits(num: number | string): string {
    return num.toString().split('').map(c => nepaliDigits[parseInt(c)] || c).join('');
}

// --- INITIALIZATION SCREEN ---
function SystemInitScreen({ onStart }: { onStart: () => void }) {
    return (
        <div className="fixed inset-0 z-[100] bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
            <motion.div 
                initial={{ scale: 0.8, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl border border-emerald-100 p-10 flex flex-col items-center relative overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-emerald-600" />
                <div className="w-24 h-24 bg-emerald-50 rounded-3xl flex items-center justify-center mb-6 shadow-inner ring-4 ring-white border border-emerald-100 animate-pulse">
                    <ChefHat className="w-12 h-12 text-emerald-600" />
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tighter mb-2">Kitchen<span className="text-emerald-500">OS</span></h1>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-8">Titanium Command Node</p>
                <button 
                    onClick={onStart}
                    className="group relative w-full h-16 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl shadow-slate-900/20 overflow-hidden active:scale-95 transition-all"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <span className="relative flex items-center justify-center gap-3">
                        <Play className="w-5 h-5 fill-current" /> START SHIFT
                    </span>
                </button>
            </motion.div>
        </div>
    )
}

// --- HEADER ---
function KDSHeader({ count, latestOrderTable, onStopAlert, muted, toggleMute }: any) {
    const [timeInfo, setTimeInfo] = useState({ time: "", date: "" });

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            const np = new NepaliDate(now);
            setTimeInfo({
                time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                date: `${nepaliMonths[np.getMonth()]} ${toNepaliDigits(np.getDate())}, ${toNepaliDigits(np.getYear())}`
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <header className="flex-shrink-0 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-4 md:px-6 py-3 flex justify-between items-center z-30 sticky top-0 shadow-sm transition-all">
            {/* ALERT BANNER */}
            <AnimatePresence>
                {latestOrderTable && (
                    <motion.div 
                        initial={{ y: -120 }} animate={{ y: 0 }} exit={{ y: -120 }}
                        className="absolute inset-0 bg-red-500 flex items-center justify-between px-6 z-50 text-white shadow-xl cursor-pointer"
                        onClick={onStopAlert}
                    >
                        <div className="flex items-center gap-4 animate-pulse">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <Bell className="w-5 h-5 fill-current" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold opacity-90 uppercase tracking-widest">New Order</p>
                                <h3 className="text-xl md:text-3xl font-black leading-none">{latestOrderTable}</h3>
                            </div>
                        </div>
                        <button onClick={onStopAlert} className="bg-white text-red-600 px-4 py-1.5 rounded-full font-black text-[10px] md:text-xs shadow-lg uppercase tracking-wider">
                            Dismiss
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex items-center gap-3 md:gap-5">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/20 ring-2 ring-white">
                    <ChefHat className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div className="hidden md:block">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Kitchen<span className="text-emerald-500">OS</span></h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1 text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                            <Flame className="w-3 h-3" /> {count} ACTIVE
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{timeInfo.date}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="text-right block">
                    <p className="text-xl md:text-3xl font-black text-slate-900 tabular-nums leading-none">{timeInfo.time}</p>
                </div>
                <button onClick={toggleMute} className={`p-2.5 md:p-3 rounded-full transition-all border ${muted ? 'bg-red-50 text-red-500 border-red-100' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-200 hover:text-emerald-600'}`}>
                    {muted ? <VolumeX className="w-4 h-4 md:w-5 md:h-5" /> : <Volume2 className="w-4 h-4 md:w-5 md:h-5" />}
                </button>
            </div>
        </header>
    )
}

// --- DOCK (CENTERED) ---
function KitchenDock({ onRefresh }: any) {
    const handleLogout = async () => {
        if(confirm("End Shift?")) {
            sessionStorage.removeItem("gecko_kitchen_init");
            await logoutStaff();
            window.location.href = "/staff/login";
        }
    }

    return (
        <motion.div 
            initial={{ y: 100, x: "-50%", opacity: 0 }} 
            animate={{ y: 0, x: "-50%", opacity: 1 }} 
            className="fixed bottom-6 left-1/2 z-40 flex items-center gap-2 p-1.5 bg-slate-900/95 backdrop-blur-2xl rounded-full shadow-2xl border border-white/10 ring-1 ring-black/20"
        >
            <DockButton icon={<RefreshCcw className="w-5 h-5" />} onClick={onRefresh} label="Sync" />
            <div className="w-px h-6 bg-white/20 mx-1" />
            <DockLink href="/staff/kitchen/menu" icon={<LayoutGrid className="w-5 h-5" />} label="Menu" />
            <DockLink href="/staff/kitchen/reports" icon={<FileBarChart className="w-5 h-5" />} label="Reports" />
            <div className="w-px h-6 bg-white/20 mx-1" />
            <DockButton icon={<LogOut className="w-5 h-5 text-red-400" />} onClick={handleLogout} label="Exit" />
        </motion.div>
    )
}

function DockButton({ icon, onClick, label }: any) {
    return (
        <button onClick={onClick} className="p-3 rounded-full bg-white/5 text-white hover:bg-white/20 active:scale-90 transition-all group relative">
            {icon}
            <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {label}
            </span>
        </button>
    )
}

function DockLink({ href, icon, label }: any) {
    return (
        <Link href={href} className="p-3 rounded-full bg-white/5 text-slate-300 hover:text-white hover:bg-white/20 active:scale-90 transition-all group relative">
            {icon}
            <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {label}
            </span>
        </Link>
    )
}

// --- MAIN PAGE ---
export default function KitchenPage() {
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<KitchenTicket | null>(null);
  
  // Logic Refs
  const prevTicketIds = useRef<Set<string>>(new Set());
  const [systemReady, setSystemReady] = useState(false);
  const [latestOrderTable, setLatestOrderTable] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
      const isInit = sessionStorage.getItem("gecko_kitchen_init");
      if(isInit === "true") {
          setSystemReady(true);
          const audio = new Audio(ALERT_SOUND);
          audio.volume = 1.0;
          audioRef.current = audio;
          loadData();
      }
  }, []);

  // FAST POLLING: 3 Seconds
  useEffect(() => {
    if (!systemReady) return;
    loadData();
    const interval = setInterval(loadData, 3000); // Fast fetch, no reload
    return () => clearInterval(interval);
  }, [systemReady]);

  const initializeSystem = () => {
      const audio = new Audio(ALERT_SOUND); 
      audio.volume = 1.0;
      audioRef.current = audio;
      audio.play().then(() => {
          audio.pause();
          audio.currentTime = 0;
      }).catch(err => console.log("Audio Permission Needed:", err));

      sessionStorage.setItem("gecko_kitchen_init", "true");
      setSystemReady(true);
      loadData();
  };

  const triggerAlert = (tableName: string) => {
      setLatestOrderTable(tableName);
      if (!muted && audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(e => console.error("Sound play failed", e));
      }
      setTimeout(() => setLatestOrderTable(null), 8000);
  };

  const stopAlert = () => {
      setLatestOrderTable(null);
      if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
      }
  };

  async function loadData() {
    const kdsRes = await getKitchenTickets();
    if(kdsRes.success && Array.isArray(kdsRes.data)) {
        const rawData = kdsRes.data as any[]; 
        // Logic: Exclude 'served' orders from view entirely if backend returns them
        const activeOrders = rawData.filter(t => t.status !== 'served');
        
        const sorted = activeOrders.sort((a, b) => {
            const statusOrder = { 'pending': 0, 'cooking': 1, 'ready': 2, 'served': 3 };
            const statusDiff = (statusOrder[a.status as keyof typeof statusOrder] || 0) - (statusOrder[b.status as keyof typeof statusOrder] || 0);
            if (statusDiff !== 0) return statusDiff;
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
        setTickets(sorted as KitchenTicket[]);
        
        if (systemReady) {
            const currentIds = new Set(sorted.map(t => t.id));
            const newTicket = sorted.find(t => 
                t.status === 'pending' && !prevTicketIds.current.has(t.id)
            );
            if (newTicket) triggerAlert(newTicket.table_name);
            prevTicketIds.current = currentIds;
        }
    }
    setLoading(false);
  }

  // --- ACTIONS ---
  const handleItemClick = async (item: KitchenItem, ticketId: string) => {
      // 1. KITCHEN GUARD: STOP AT READY
      if (item.status === 'served' || item.status === 'ready') {
          return; // Cannot move beyond ready
      }

      const statusCycle: Record<string, string> = { 'pending': 'cooking', 'cooking': 'ready' };
      const nextStatus = statusCycle[item.status] || 'pending';
      
      setTickets(prev => prev.map(t => t.id !== ticketId ? t : { ...t, order_items: t.order_items.map(i => i.id === item.id ? { ...i, status: nextStatus } : i) }));
      if(selectedTicket?.id === ticketId) setSelectedTicket(prev => prev ? ({...prev, order_items: prev.order_items.map(i => i.id === item.id ? { ...i, status: nextStatus } : i)}) : null);

      await updateItemStatus(item.id, nextStatus, ticketId);
      loadData(); 
  };

  const handleDisableItem = async (itemName: string) => {
      if(confirm(`Waiters will see '${itemName}' as Unavailable. Confirm?`)) {
          await disableMenuItem(itemName);
          toast.success("Item Disabled");
      }
  };

  const handleMoveTicket = async (ticketId: string, newStatus: string) => {
      // 2. KITCHEN GUARD: CANNOT SERVE
      if (newStatus === 'served') {
          toast.error("Kitchen cannot Serve. Mark Ready only.");
          return;
      }
      
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus as any } : t));
      await updateTicketStatus(ticketId, newStatus);
      loadData();
  };

  const pendingTickets = tickets.filter(t => t.status === 'pending');
  const cookingTickets = tickets.filter(t => t.status === 'cooking' || t.status === 'preparing');
  const readyTickets = tickets.filter(t => t.status === 'ready');

  if (!systemReady) return <SystemInitScreen onStart={initializeSystem} />;
  
  if (loading) return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] gap-4">
          <div className="w-20 h-20 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin shadow-xl"></div>
          <p className="text-emerald-900/40 font-bold text-xs uppercase tracking-widest animate-pulse">Syncing Kitchen...</p>
      </div>
  );

  return (
    <div className="flex h-[100dvh] bg-[#F1F5F9] font-sans text-slate-900 overflow-hidden flex-col">
      <KDSHeader count={tickets.length} latestOrderTable={latestOrderTable} onStopAlert={stopAlert} muted={muted} toggleMute={() => setMuted(!muted)} />

      {/* --- KANBAN BOARD (VERTICAL STACK MOBILE, HORIZONTAL DESKTOP) --- */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden md:overflow-y-hidden md:overflow-x-auto p-4 md:p-6 pb-32 scroll-smooth">
          {/* Changed Layout: Flex-Col on Mobile, Flex-Row on Desktop */}
          <div className="flex flex-col md:flex-row gap-8 md:gap-6 h-auto md:h-full min-w-full md:min-w-[1200px] justify-center">
              
              {/* PENDING COLUMN */}
              <div className="flex-1 min-h-[50vh] md:min-h-0 md:h-full">
                <TicketColumn 
                    title="NEW ORDERS" count={pendingTickets.length} tickets={pendingTickets} status="pending"
                    color="bg-blue-50/50 border-blue-100" badgeColor="bg-blue-600 text-white"
                    onOpen={setSelectedTicket} onSwipe={handleMoveTicket}
                />
              </div>

              {/* COOKING COLUMN */}
              <div className="flex-1 min-h-[50vh] md:min-h-0 md:h-full">
                <TicketColumn 
                    title="COOKING" count={cookingTickets.length} tickets={cookingTickets} status="cooking"
                    color="bg-orange-50/50 border-orange-100" badgeColor="bg-orange-500 text-white"
                    onOpen={setSelectedTicket} onSwipe={handleMoveTicket}
                />
              </div>

              {/* READY COLUMN */}
              <div className="flex-1 min-h-[50vh] md:min-h-0 md:h-full">
                <TicketColumn 
                    title="READY FOR SERVICE" count={readyTickets.length} tickets={readyTickets} status="ready"
                    color="bg-emerald-50/50 border-emerald-100" badgeColor="bg-emerald-600 text-white"
                    onOpen={setSelectedTicket} onSwipe={handleMoveTicket}
                />
              </div>

          </div>
      </div>

      <KitchenDock onRefresh={loadData} />

      {/* --- DETAIL MODAL --- */}
      <AnimatePresence>
          {selectedTicket && (
              <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center sm:p-4">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedTicket(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                  <motion.div 
                      initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
                      className="bg-white w-full md:w-[600px] rounded-t-[2rem] md:rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[85vh] md:max-h-[90vh] border border-white/20"
                  >
                      {/* Header */}
                      <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-start sticky top-0 z-10">
                          <div>
                              <h2 className="text-3xl font-black text-slate-900 tracking-tight">{selectedTicket.table_name}</h2>
                              <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Order #{selectedTicket.id.slice(0,6)}</p>
                          </div>
                          <button onClick={() => setSelectedTicket(null)} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-all"><X className="w-5 h-5" /></button>
                      </div>

                      {/* Items List */}
                      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 custom-scrollbar bg-white">
                          {selectedTicket.order_items.map((item) => (
                              <div 
                                  key={item.id} 
                                  className={`p-4 rounded-2xl border flex justify-between items-start transition-all ${
                                      item.status === 'served' ? 'bg-slate-50 border-slate-100 opacity-60 pointer-events-none' : // DISABLE POINTER EVENTS IF SERVED
                                      'bg-white border-slate-100 shadow-sm hover:border-emerald-200'
                                  }`}
                              >
                                  <div className="flex gap-4 flex-1 cursor-pointer" onClick={() => handleItemClick(item, selectedTicket.id)}>
                                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-700">{item.quantity}x</div>
                                      <div className="flex-1">
                                          <h4 className={`font-bold text-lg leading-tight ${item.status === 'served' ? 'line-through text-slate-400' : 'text-slate-900'}`}>{item.name}</h4>
                                          {item.notes && (
                                              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-100 animate-pulse">
                                                  <AlertTriangle className="w-4 h-4 fill-red-100" />
                                                  <span className="text-xs font-black uppercase tracking-wide">{item.notes}</span>
                                              </div>
                                          )}
                                      </div>
                                  </div>
                                  
                                  <div className="flex flex-col gap-2 items-end">
                                      <button 
                                          onClick={() => handleItemClick(item, selectedTicket.id)}
                                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 transition-colors ${
                                              item.status === 'served' ? 'bg-slate-200 text-slate-400' :
                                              item.status === 'ready' ? 'bg-emerald-100 text-emerald-700' : 
                                              item.status === 'cooking' ? 'bg-orange-100 text-orange-700' : 
                                              'bg-slate-100 text-slate-500'
                                      }`}>
                                          {item.status === 'served' ? <Check className="w-3 h-3"/> : item.status === 'ready' ? <CheckCheck className="w-3 h-3" /> : item.status === 'cooking' ? <Flame className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                          {item.status}
                                      </button>
                                      {item.status !== 'served' && item.status !== 'ready' && (
                                        <button onClick={(e) => { e.stopPropagation(); handleDisableItem(item.name); }} className="text-[9px] font-bold text-slate-300 hover:text-red-500 flex items-center gap-1"><Ban className="w-3 h-3" /> 86 Item</button>
                                      )}
                                  </div>
                              </div>
                          ))}
                      </div>

                      {/* Footer Actions */}
                      <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-200 flex gap-3 safe-area-pb">
                          {selectedTicket.status !== 'cooking' && selectedTicket.status !== 'ready' && (
                              <button onClick={() => handleMoveTicket(selectedTicket.id, 'cooking')} className="flex-1 py-3.5 rounded-xl bg-orange-500 text-white font-bold text-sm shadow-lg shadow-orange-200 active:scale-95 transition-all flex items-center justify-center gap-2">
                                  <Flame className="w-4 h-4" /> Start Cooking
                              </button>
                          )}
                          {selectedTicket.status !== 'ready' && (
                              <button onClick={() => handleMoveTicket(selectedTicket.id, 'ready')} className="flex-1 py-3.5 rounded-xl bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-2">
                                  <CheckCircle2 className="w-4 h-4" /> Mark Ready
                              </button>
                          )}
                          {/* SERVE BUTTON REMOVED FOR KITCHEN STAFF */}
                          {selectedTicket.status === 'ready' && (
                              <div className="flex-1 py-3.5 rounded-xl bg-slate-100 text-slate-400 font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed">
                                  <Check className="w-4 h-4" /> Awaiting Waiter
                              </div>
                          )}
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>

    </div>
  );
}

// --- COLUMN COMPONENT ---
function TicketColumn({ title, count, tickets, status, color, badgeColor, onOpen, onSwipe }: any) {
    return (
        <div className={`w-full flex-1 flex flex-col h-full md:rounded-[2.5rem] md:border-2 md:border-dashed ${color} overflow-hidden transition-all duration-300 relative bg-transparent md:bg-white/50 backdrop-blur-sm`}>
            {/* Desktop Header */}
            <div className="flex px-6 py-5 justify-between items-center sticky top-0 z-10 bg-white/50 backdrop-blur-md border-b border-slate-100">
                <h3 className="font-black text-slate-500 text-xs flex items-center gap-2 uppercase tracking-wider">
                    {status === 'pending' ? <Bell className="w-4 h-4" /> : status === 'cooking' ? <Flame className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    {title}
                </h3>
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${badgeColor}`}>{count}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                <AnimatePresence>
                    {tickets.map((t: KitchenTicket) => (
                        <SwipeableTicket 
                            key={t.id} 
                            ticket={t} 
                            status={status}
                            onSwipe={onSwipe} 
                            onOpen={onOpen} 
                        />
                    ))}
                </AnimatePresence>
                
                {tickets.length === 0 && (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-300 opacity-60">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                            <Utensils className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest">No Orders</span>
                    </div>
                )}
            </div>
        </div>
    )
}

// --- SWIPEABLE TICKET ---
function SwipeableTicket({ ticket, status, onSwipe, onOpen }: any) {
    const x = useMotionValue(0);
    const opacity = useTransform(x, [0, 200], [1, 0]);
    
    let nextStatus = '';
    let actionLabel = '';
    let actionColor = '';
    
    // LOGIC GUARD: NO 'SERVE' OPTION
    if (status === 'pending') { nextStatus = 'cooking'; actionLabel = 'Cook'; actionColor = 'bg-orange-500'; }
    else if (status === 'cooking') { nextStatus = 'ready'; actionLabel = 'Ready'; actionColor = 'bg-emerald-500'; }
    // NO NEXT STATUS FOR READY IN KITCHEN VIEW

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (info.offset.x > SWIPE_THRESHOLD && status !== 'ready') {
            onSwipe(ticket.id, nextStatus);
        }
    };

    return (
        <motion.div 
            style={{ x, opacity }}
            drag={status !== 'ready' ? "x" : false} // DISABLE DRAG IF READY
            dragConstraints={{ left: 0, right: 0 }} 
            dragElastic={{ left: 0, right: 0.5 }} 
            onDragEnd={handleDragEnd}
            layout
            onClick={() => onOpen(ticket)}
            className="cursor-pointer relative touch-pan-y"
        >
            {/* Background Action Indicator */}
            {status !== 'ready' && (
                <div className={`absolute inset-0 ${actionColor} rounded-[1.8rem] flex items-center justify-start px-8 text-white font-black uppercase tracking-widest z-0`}>
                    <div className="flex items-center gap-2">
                        <ChevronRight className="w-6 h-6 animate-pulse" />
                        {actionLabel}
                    </div>
                </div>
            )}

            {/* Foreground Card */}
            <div className="relative bg-white z-10 p-5 rounded-[1.8rem] shadow-sm hover:shadow-md border border-slate-100 transition-all active:scale-[0.98]">
                <TicketCardContent ticket={ticket} />
            </div>
        </motion.div>
    );
}

// --- TICKET CARD CONTENT ---
function TicketCardContent({ ticket }: { ticket: KitchenTicket }) {
    const [elapsed, setElapsed] = useState("");
    const [isLate, setIsLate] = useState(false);

    useEffect(() => {
        const update = () => {
            const diff = Math.floor((new Date().getTime() - new Date(ticket.created_at).getTime()) / 1000);
            const m = Math.floor(diff / 60);
            setElapsed(`${m}m`);
            setIsLate(m > 20);
        };
        update();
        const interval = setInterval(update, 60000);
        return () => clearInterval(interval);
    }, [ticket.created_at]);

    const readyItems = ticket.order_items.filter(i => i.status === 'ready' || i.status === 'served').length;
    const totalItems = ticket.order_items.length;
    const progress = totalItems > 0 ? Math.round((readyItems / totalItems) * 100) : 0;
    const hasNotes = ticket.order_items.some(i => i.notes);

    return (
        <div className={`w-full ${isLate ? 'ring-2 ring-red-100 rounded-[1.8rem]' : ''}`}>
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-50 rounded-xl"><GripVertical className="w-4 h-4 text-slate-300" /></div>
                    <div>
                        <span className="text-xl font-black text-slate-900 block leading-none">{ticket.table_name}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1 block">#{ticket.id.slice(0,4)}</span>
                    </div>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black ${isLate ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
                    <Clock className="w-3 h-3" /> {elapsed}
                </div>
            </div>

            {/* Item Summary */}
            <div className="space-y-1.5 mb-4 pl-2">
                {ticket.order_items.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                            <span className="font-black text-slate-600 bg-slate-50 px-1.5 rounded-md min-w-[20px] text-center">{item.quantity}</span> 
                            <span className={`font-bold truncate max-w-[120px] ${item.status === 'ready' || item.status === 'served' ? 'text-emerald-600 line-through' : 'text-slate-700'}`}>{item.name}</span>
                        </div>
                        {item.notes && <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />}
                    </div>
                ))}
                {ticket.order_items.length > 3 && <p className="text-[10px] text-slate-400 font-bold pl-1">+ {ticket.order_items.length - 3} more items...</p>}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                {hasNotes ? (
                    <div className="flex items-center gap-1 text-[9px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-md">
                        <AlertTriangle className="w-3 h-3" /> NOTE
                    </div>
                ) : <div />}
                
                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
            </div>
        </div>
    )
}