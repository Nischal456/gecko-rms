"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { 
  ChefHat, Clock, CheckCircle2, Flame, Bell, Utensils, 
  X, LogOut, RefreshCcw, Check, CheckCheck, 
  Volume2, VolumeX, LayoutGrid, FileBarChart, Ban, AlertTriangle, Play, GripVertical, ChevronRight,
  Layers, StickyNote
} from "lucide-react";
import { toast } from "sonner";
import { getKitchenTickets, updateTicketStatus, updateItemStatus, disableMenuItem } from "@/app/actions/kitchen";
import { logoutStaff } from "@/app/actions/staff-auth";
import NepaliDate from 'nepali-date-converter';

// --- CONFIG ---
const ALERT_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const SWIPE_THRESHOLD = 80; 

// --- TYPES ---
interface KitchenItem {
    id: string;
    unique_id?: string;
    name: string;
    quantity: number;
    notes?: string;
    variant?: string;
    status: string; 
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
function KDSHeader({ count, alertingTable, onAcknowledge, muted, toggleMute }: any) {
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
            <AnimatePresence>
                {alertingTable && (
                    <motion.div 
                        initial={{ y: -120 }} animate={{ y: 0 }} exit={{ y: -120 }}
                        className="absolute inset-0 bg-red-500 flex items-center justify-between px-6 z-50 text-white shadow-xl cursor-pointer"
                        onClick={onAcknowledge}
                    >
                        <div className="flex items-center gap-4 animate-pulse">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <Bell className="w-5 h-5 fill-current" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold opacity-90 uppercase tracking-widest">New Order Pending</p>
                                <h3 className="text-xl md:text-3xl font-black leading-none">{alertingTable}</h3>
                            </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); onAcknowledge(); }} className="bg-white text-red-600 px-5 py-2.5 rounded-full font-black text-xs shadow-lg uppercase tracking-wider active:scale-95 transition-transform">
                            Acknowledge
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

// --- DOCK ---
function KitchenDock({ onRefresh }: any) {
    const handleLogout = () => {
        toast.custom((t) => (
            <div className="bg-white p-5 rounded-[1.5rem] shadow-2xl border border-slate-100 flex flex-col gap-4 w-full sm:w-[320px] pointer-events-auto">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center shrink-0 shadow-inner">
                        <LogOut className="w-5 h-5 ml-1" />
                    </div>
                    <div className="pt-0.5">
                        <h4 className="font-black text-slate-900 text-sm tracking-tight">Power Down Terminal?</h4>
                        <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
                            Are you sure you want to end your kitchen shift and sign out of KitchenOS?
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 mt-1">
                    <button 
                        onClick={() => toast.dismiss(t)} 
                        className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={async () => {
                            toast.dismiss(t);
                            toast.loading("Powering down terminal...");
                            sessionStorage.removeItem("gecko_kitchen_init");
                            await logoutStaff();
                            window.location.href = "/staff/login";
                        }} 
                        className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-red-500/25 active:scale-95"
                    >
                        Yes, Sign Out
                    </button>
                </div>
            </div>
        ), { duration: 8000 });
    };

    return (
        <div className="fixed bottom-8 left-0 right-0 mx-auto w-fit z-50 px-4 pointer-events-none">
            <motion.div 
                initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="pointer-events-auto flex items-center gap-1.5 p-2 bg-slate-900/95 backdrop-blur-2xl rounded-[2rem] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] border border-slate-700 ring-1 ring-white/10"
            >
                <DockButton icon={<RefreshCcw className="w-[18px] h-[18px]" />} onClick={onRefresh} label="Sync Feed" />
                <div className="w-px h-6 bg-slate-700 mx-1 rounded-full" />
                <DockLink href="/staff/kitchen/menu" icon={<LayoutGrid className="w-[18px] h-[18px]" />} label="Menu" />
                <DockLink href="/staff/kitchen/reports" icon={<FileBarChart className="w-[18px] h-[18px]" />} label="Reports" />
                <div className="w-px h-6 bg-slate-700 mx-1 rounded-full" />
                <DockButton icon={<LogOut className="w-[18px] h-[18px] text-red-400" />} onClick={handleLogout} label="Sign Out" />
            </motion.div>
        </div>
    )
}

function DockButton({ icon, onClick, label }: any) {
    return (
        <button onClick={onClick} className="flex items-center justify-center w-14 h-12 rounded-[1.2rem] text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 transition-all group relative">
            <div className="group-hover:scale-110 transition-transform duration-300">{icon}</div>
            <span className="absolute -top-12 bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl border border-slate-700 pointer-events-none scale-95 group-hover:scale-100">{label}</span>
        </button>
    )
}

function DockLink({ href, icon, label }: any) {
    return (
        <Link href={href} className="flex items-center justify-center w-14 h-12 rounded-[1.2rem] text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 transition-all group relative">
            <div className="group-hover:scale-110 transition-transform duration-300">{icon}</div>
            <span className="absolute -top-12 bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl border border-slate-700 pointer-events-none scale-95 group-hover:scale-100">{label}</span>
        </Link>
    )
}

// --- MAIN PAGE ---
export default function KitchenPage() {
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<KitchenTicket | null>(null);
  
  // High-Speed Optimistic Locking
  const processingItems = useRef<Set<string>>(new Set()); 
  
  // --- REACTIVE NOTIFICATION ENGINE ---
  const [systemReady, setSystemReady] = useState(false);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const acknowledgedIds = useRef<Set<string>>(new Set());
  const currentlyAlertingId = useRef<string | null>(null);
  const [alertingTable, setAlertingTable] = useState<string | null>(null);

  useEffect(() => {
      const isInit = sessionStorage.getItem("gecko_kitchen_init");
      if(isInit === "true") {
          setSystemReady(true);
          const audio = new Audio(ALERT_SOUND);
          audio.volume = 1.0;
          audio.loop = true; 
          audioRef.current = audio;
          loadData();
      }
  }, []);

  // ULTRA FAST POLLING (2.5 Seconds)
  useEffect(() => {
    if (!systemReady) return;
    loadData();
    const interval = setInterval(loadData, 2500); 
    return () => clearInterval(interval);
  }, [systemReady]);

  // SMART ALERT EVALUATOR (Triggers strictly based on state)
  useEffect(() => {
      if (!systemReady) return;

      const pending = tickets.filter(t => t.status === 'pending');
      const unacknowledged = pending.find(t => !acknowledgedIds.current.has(t.id));

      if (unacknowledged) {
          if (currentlyAlertingId.current !== unacknowledged.id) {
              currentlyAlertingId.current = unacknowledged.id;
              setAlertingTable(unacknowledged.table_name);
              
              if (!muted && audioRef.current) {
                  audioRef.current.play().catch(e => {
                      console.warn("Audio blocked by browser, requiring user interaction.");
                      setSystemReady(false); // Force them back to Start screen to unlock audio!
                      sessionStorage.removeItem("gecko_kitchen_init");
                  });
              }
          }
      } else {
          // If no unacknowledged pending tickets exist, quiet down immediately.
          if (currentlyAlertingId.current) {
              currentlyAlertingId.current = null;
              setAlertingTable(null);
              if (audioRef.current) {
                  audioRef.current.pause();
                  audioRef.current.currentTime = 0;
              }
          }
      }
  }, [tickets, systemReady, muted]);

  const initializeSystem = () => {
      const audio = new Audio(ALERT_SOUND); 
      audio.volume = 1.0;
      audio.loop = true;
      audioRef.current = audio;
      
      audio.play().then(() => {
          audio.pause();
          audio.currentTime = 0;
      }).catch(err => console.log("Audio Init Blocked"));

      sessionStorage.setItem("gecko_kitchen_init", "true");
      setSystemReady(true);
      loadData();
  };

  const handleAcknowledge = () => {
      if (currentlyAlertingId.current) {
          acknowledgedIds.current.add(currentlyAlertingId.current);
          currentlyAlertingId.current = null;
          setAlertingTable(null);
          if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
          }
      }
  };

  async function loadData() {
    const kdsRes = await getKitchenTickets();
    if(kdsRes.success && Array.isArray(kdsRes.data)) {
        const rawData = kdsRes.data as any[]; 
        const activeOrders = rawData.filter(t => t.status !== 'served');
        
        const sorted = activeOrders.sort((a, b) => {
            const statusOrder = { 'pending': 0, 'preparing': 1, 'cooking': 1, 'ready': 2, 'served': 3 };
            const statusDiff = (statusOrder[a.status as keyof typeof statusOrder] || 0) - (statusOrder[b.status as keyof typeof statusOrder] || 0);
            if (statusDiff !== 0) return statusDiff;
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
        
        setTickets(sorted as KitchenTicket[]);

        if (selectedTicket) {
            const freshTicket = sorted.find(t => t.id === selectedTicket.id);
            if (freshTicket) setSelectedTicket(freshTicket as KitchenTicket);
        }
    }
    setLoading(false);
  }

  // --- ACTIONS ---
  const handleItemClick = async (item: KitchenItem, ticketId: string) => {
      const safeStatus = (item.status || '').toLowerCase().trim();
      if (safeStatus === 'served' || safeStatus === 'ready') return; 

      const uniqueLockId = item.unique_id || item.id;
      if (processingItems.current.has(uniqueLockId)) return; // Double-click protection
      
      processingItems.current.add(uniqueLockId);

      const statusCycle: Record<string, string> = { 'pending': 'cooking', 'cooking': 'ready' };
      const nextStatus = statusCycle[safeStatus] || 'pending';
      
      // INSTANT OPTIMISTIC UPDATE
      const newTickets = tickets.map(t => {
          if (t.id !== ticketId) return t;
          const newItems = t.order_items.map(i => (i.unique_id || i.id) === uniqueLockId ? { ...i, status: nextStatus } : i);
          
          // Auto-upgrade ticket status if an item starts cooking
          const isCookingNow = newItems.some(i => i.status === 'cooking' || i.status === 'ready');
          const newTicketStatus = (t.status === 'pending' && isCookingNow) ? 'cooking' : t.status;
          
          return { ...t, status: newTicketStatus as any, order_items: newItems };
      });
      setTickets(newTickets);
      
      // Update Modal
      if(selectedTicket?.id === ticketId) {
          const matchedTicket = newTickets.find(t => t.id === ticketId);
          if (matchedTicket) setSelectedTicket(matchedTicket);
      }

      await updateItemStatus(uniqueLockId, nextStatus, ticketId);
      
      processingItems.current.delete(uniqueLockId);
      loadData(); 
  };

  const handleDisableItem = async (itemName: string) => {
      if(confirm(`Waiters will see '${itemName}' as Unavailable. Confirm?`)) {
          await disableMenuItem(itemName);
          toast.success("Item Disabled");
      }
  };

  const handleMoveTicket = async (ticketId: string, newStatus: string) => {
      if (newStatus === 'served') {
          toast.error("Kitchen cannot Serve. Mark Ready only.");
          return;
      }
      
      // INSTANT OPTIMISTIC UPDATE (Will clear alarm immediately)
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
      <KDSHeader count={tickets.length} alertingTable={alertingTable} onAcknowledge={handleAcknowledge} muted={muted} toggleMute={() => setMuted(!muted)} />

      {/* --- KANBAN BOARD --- */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden md:overflow-y-hidden md:overflow-x-auto p-4 md:p-6 pb-32 scroll-smooth">
          <div className="flex flex-col md:flex-row gap-8 md:gap-6 h-auto md:h-full min-w-full md:min-w-[1200px] justify-center">
              
              <div className="flex-1 min-h-[50vh] md:min-h-0 md:h-full">
                <TicketColumn 
                    title="NEW ORDERS" count={pendingTickets.length} tickets={pendingTickets} status="pending"
                    color="bg-blue-50/50 border-blue-100" badgeColor="bg-blue-600 text-white"
                    onOpen={(t:any) => { handleAcknowledge(); setSelectedTicket(t); }} onSwipe={handleMoveTicket}
                />
              </div>

              <div className="flex-1 min-h-[50vh] md:min-h-0 md:h-full">
                <TicketColumn 
                    title="COOKING" count={cookingTickets.length} tickets={cookingTickets} status="cooking"
                    color="bg-orange-50/50 border-orange-100" badgeColor="bg-orange-500 text-white"
                    onOpen={setSelectedTicket} onSwipe={handleMoveTicket}
                />
              </div>

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

      {/* --- PREMIUM DETAIL MODAL --- */}
      <AnimatePresence>
          {selectedTicket && (
              <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center sm:p-4">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedTicket(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                  <motion.div 
                      initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
                      className="bg-white w-full md:w-[600px] rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col h-[85vh] md:h-auto md:max-h-[90vh] border border-white/20"
                  >
                      <div className="bg-slate-50 p-6 md:p-8 border-b border-slate-200 flex justify-between items-start sticky top-0 z-10 shrink-0">
                          <div>
                              <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none mb-1">{selectedTicket.table_name}</h2>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Order #{selectedTicket.id.slice(0,6)}</p>
                          </div>
                          <button onClick={() => setSelectedTicket(null)} className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-all active:scale-90 shadow-sm"><X className="w-6 h-6" /></button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 md:space-y-4 custom-scrollbar bg-white">
                          {selectedTicket.order_items.map((item) => {
                              const safeStatus = (item.status || '').toLowerCase().trim();
                              const isCompleted = safeStatus === 'served' || safeStatus === 'ready';

                              return (
                                  <div 
                                      key={item.unique_id || item.id} 
                                      className={`p-5 rounded-2xl border flex justify-between items-center transition-all shadow-sm ${
                                          isCompleted ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200 hover:border-emerald-300'
                                      }`}
                                  >
                                      <div 
                                          className={`flex gap-4 flex-1 ${isCompleted ? 'cursor-default' : 'cursor-pointer active:scale-95 transition-transform'}`} 
                                          onClick={() => handleItemClick(item, selectedTicket.id)}
                                      >
                                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shrink-0 ${isCompleted ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white shadow-md'}`}>
                                              {item.quantity}x
                                          </div>
                                          <div className="flex flex-col justify-center min-w-0 pr-2">
                                              <h4 className={`font-black text-lg md:text-xl leading-tight truncate ${isCompleted ? 'line-through text-slate-400' : 'text-slate-900'}`}>{item.name}</h4>
                                              
                                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                  {item.variant && <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 uppercase tracking-wider">{item.variant}</span>}
                                                  {item.notes && (
                                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-100">
                                                          <AlertTriangle className="w-3 h-3" />
                                                          <span className="text-[10px] font-black uppercase tracking-wide">{item.notes}</span>
                                                      </span>
                                                  )}
                                              </div>
                                          </div>
                                      </div>
                                      
                                      <div className="flex flex-col gap-2 items-end shrink-0">
                                          <button 
                                              disabled={isCompleted}
                                              onClick={() => handleItemClick(item, selectedTicket.id)}
                                              className={`px-4 py-3 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-colors ${
                                                  safeStatus === 'served' ? 'bg-slate-200 text-slate-400' :
                                                  safeStatus === 'ready' ? 'bg-emerald-100 text-emerald-700' : 
                                                  safeStatus === 'cooking' ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-100 shadow-sm' : 
                                                  'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                          }`}>
                                              {safeStatus === 'served' ? <Check className="w-4 h-4"/> : safeStatus === 'ready' ? <CheckCheck className="w-4 h-4" /> : safeStatus === 'cooking' ? <Flame className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                              {safeStatus}
                                          </button>
                                      </div>
                                  </div>
                              )
                          })}
                      </div>

                      <div className="p-5 md:p-6 bg-slate-50 border-t border-slate-200 flex gap-4 shrink-0 pb-safe">
                          {selectedTicket.status !== 'cooking' && selectedTicket.status !== 'ready' && (
                              <button onClick={() => handleMoveTicket(selectedTicket.id, 'cooking')} className="flex-1 py-4 md:py-5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm md:text-base shadow-xl shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest">
                                  <Flame className="w-5 h-5" /> Start Cooking
                              </button>
                          )}
                          {selectedTicket.status !== 'ready' && (
                              <button onClick={() => handleMoveTicket(selectedTicket.id, 'ready')} className="flex-1 py-4 md:py-5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm md:text-base shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest">
                                  <CheckCircle2 className="w-5 h-5" /> All Ready
                              </button>
                          )}
                          {selectedTicket.status === 'ready' && (
                              <div className="flex-1 py-4 md:py-5 rounded-2xl bg-slate-200 text-slate-500 font-black text-sm md:text-base flex items-center justify-center gap-2 cursor-not-allowed uppercase tracking-widest">
                                  <Check className="w-5 h-5" /> Awaiting Waiter
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
    const opacity = useTransform(x, [0, 150], [1, 0]);
    
    let nextStatus = '';
    let actionLabel = '';
    let actionColor = '';
    
    if (status === 'pending') { nextStatus = 'cooking'; actionLabel = 'Cook'; actionColor = 'bg-orange-500'; }
    else if (status === 'cooking') { nextStatus = 'ready'; actionLabel = 'Ready'; actionColor = 'bg-emerald-500'; }

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (info.offset.x > SWIPE_THRESHOLD && status !== 'ready') {
            onSwipe(ticket.id, nextStatus);
        }
    };

    return (
        <motion.div 
            style={{ x, opacity }}
            drag={status !== 'ready' ? "x" : false} 
            dragConstraints={{ left: 0, right: 0 }} 
            dragElastic={{ left: 0, right: 0.5 }} 
            onDragEnd={handleDragEnd}
            layout
            onClick={() => onOpen(ticket)}
            className="cursor-pointer relative touch-pan-y"
        >
            {status !== 'ready' && (
                <div className={`absolute inset-0 ${actionColor} rounded-[1.8rem] flex items-center justify-start px-8 text-white font-black uppercase tracking-widest z-0`}>
                    <div className="flex items-center gap-2">
                        <ChevronRight className="w-6 h-6 animate-pulse" />
                        {actionLabel}
                    </div>
                </div>
            )}

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

    const readyItems = ticket.order_items.filter(i => {
        const s = (i.status || '').toLowerCase().trim();
        return s === 'ready' || s === 'served';
    }).length;
    
    const validItems = ticket.order_items.filter(i => {
        const s = (i.status || '').toLowerCase().trim();
        return s !== 'cancelled' && s !== 'void' && i.quantity > 0;
    });

    const totalItems = validItems.length;
    const progress = totalItems > 0 ? Math.round((readyItems / totalItems) * 100) : 0;
    const hasNotes = validItems.some(i => i.notes);

    return (
        <div className={`w-full ${isLate ? 'ring-2 ring-red-100 rounded-[1.8rem]' : ''}`}>
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-50 rounded-xl"><GripVertical className="w-4 h-4 text-slate-300" /></div>
                    <div>
                        <span className="text-xl md:text-2xl font-black text-slate-900 block leading-none">{ticket.table_name}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1 block">#{ticket.id.slice(0,4)}</span>
                    </div>
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-black ${isLate ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
                    <Clock className="w-3.5 h-3.5" /> {elapsed}
                </div>
            </div>

            <div className="space-y-2 mb-5 pl-2">
                {validItems.slice(0, 3).map((item, i) => {
                    const s = (item.status || '').toLowerCase().trim();
                    const isDone = s === 'ready' || s === 'served';
                    return (
                        <div key={i} className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2.5">
                                <span className="font-black text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md min-w-[24px] text-center">{item.quantity}</span> 
                                <span className={`font-bold truncate max-w-[140px] md:max-w-[180px] ${isDone ? 'text-emerald-600 line-through' : 'text-slate-800'}`}>{item.name}</span>
                            </div>
                            {item.notes && <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-sm" />}
                        </div>
                    )
                })}
                {validItems.length > 3 && <p className="text-[10px] text-slate-400 font-black pl-1 uppercase tracking-widest pt-1">+ {validItems.length - 3} MORE</p>}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                {hasNotes ? (
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-red-500 bg-red-50 px-2.5 py-1 rounded-md tracking-wider">
                        <AlertTriangle className="w-3 h-3" /> NOTE
                    </div>
                ) : <div />}
                
                <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
            </div>
        </div>
    )
}