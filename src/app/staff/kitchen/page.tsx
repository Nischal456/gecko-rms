"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChefHat, Clock, CheckCircle2, Flame, Bell, Utensils, 
  Loader2, Maximize2, X, AlertCircle, LogOut, RefreshCcw, Check, CheckCheck, 
  History, Volume2, VolumeX, Ban, Play, LayoutGrid, FileBarChart
} from "lucide-react";
import { toast } from "sonner";
import { getKitchenTickets, updateTicketStatus, updateItemStatus, disableMenuItem } from "@/app/actions/kitchen";
import { getDashboardData } from "@/app/actions/dashboard";
import { logoutStaff } from "@/app/actions/staff-auth";
import NepaliDate from 'nepali-date-converter';

// --- TYPES ---
interface KitchenItem {
    id: string;
    name: string;
    quantity: number;
    notes?: string;
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

// --- HEADER ---
function KDSHeader({ count, hasAlert, onStopAlert }: { count: number, hasAlert: boolean, onStopAlert: () => void }) {
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
        <header className="flex-shrink-0 bg-white/80 backdrop-blur-2xl border-b border-slate-200 px-6 py-4 flex justify-between items-center z-30 sticky top-0 shadow-sm transition-all duration-500">
            {/* ALERT OVERLAY */}
            <AnimatePresence>
                {hasAlert && (
                    <motion.div 
                        initial={{ y: -100 }} animate={{ y: 0 }} exit={{ y: -100 }}
                        className="absolute inset-0 bg-red-600 flex items-center justify-between px-6 z-50 text-white shadow-2xl"
                    >
                        <div className="flex items-center gap-4 animate-pulse">
                            <Bell className="w-8 h-8" />
                            <span className="text-2xl font-black uppercase tracking-widest">New Order Incoming!</span>
                        </div>
                        <button onClick={onStopAlert} className="bg-white text-red-600 px-6 py-2 rounded-full font-black text-sm hover:scale-105 active:scale-95 transition-transform">
                            ACKNOWLEDGE
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-slate-900 rounded-[1.2rem] flex items-center justify-center shadow-xl shadow-slate-900/20 ring-4 ring-white">
                    <ChefHat className="w-7 h-7 text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">Kitchen<span className="text-slate-300">OS</span></h1>
                    <div className="flex items-center gap-2 mt-1.5">
                        <span className="flex items-center gap-1.5 text-[11px] font-black bg-emerald-500 text-white px-2.5 py-0.5 rounded-full shadow-lg shadow-emerald-500/20">
                            <Flame className="w-3 h-3" /> {count} LIVE
                        </span>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{timeInfo.date}</span>
                    </div>
                </div>
            </div>
            <div className="text-right">
                <p className="text-4xl font-black text-slate-900 tabular-nums leading-none tracking-tight">{timeInfo.time}</p>
                <div className="flex items-center justify-end gap-2 mt-1">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">System Online</p>
                </div>
            </div>
        </header>
    )
}

// --- DOCK (FIXED CENTERING) ---
function KitchenDock({ onRefresh, muted, toggleMute }: any) {
    const handleLogout = async () => {
        if(confirm("End Shift?")) {
            await logoutStaff();
            window.location.href = "/staff/login";
        }
    }

    return (
        <motion.div 
            // FIX: Added x: "-50%" to Framer props. This ensures it stays centered and isn't overwritten.
            initial={{ y: 100, x: "-50%", opacity: 0 }} 
            animate={{ y: 0, x: "-50%", opacity: 1 }} 
            className="fixed bottom-8 left-1/2 z-50 flex items-center gap-3 p-2.5 bg-slate-900/90 backdrop-blur-3xl rounded-full shadow-2xl border border-white/10 ring-1 ring-black/40 hover:scale-105 transition-transform duration-300"
        >
            <DockButton icon={<RefreshCcw className="w-5 h-5" />} onClick={onRefresh} label="Refresh" />
            <div className="w-px h-6 bg-white/10 mx-1" />
            
            {/* Menu Manager Link */}
            <Link href="/staff/kitchen/menu" className="p-3.5 rounded-full bg-white/5 text-slate-300 hover:text-white hover:bg-white/20 active:scale-90 transition-all group relative">
                <LayoutGrid className="w-5 h-5" />
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Menu</span>
            </Link>

            {/* Reports Link */}
            <Link href="/staff/kitchen/reports" className="p-3.5 rounded-full bg-white/5 text-slate-300 hover:text-white hover:bg-white/20 active:scale-90 transition-all group relative">
                <FileBarChart className="w-5 h-5" />
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Reports</span>
            </Link>

            <div className="w-px h-6 bg-white/10 mx-1" />
            
            <DockButton 
                icon={muted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />} 
                onClick={toggleMute} 
                label={muted ? "Unmute" : "Mute"} 
            />
            
            <div className="w-px h-6 bg-white/10 mx-1" />
            
            <DockButton icon={<LogOut className="w-5 h-5 text-red-400" />} onClick={handleLogout} label="Exit" />
        </motion.div>
    )
}

function DockButton({ icon, onClick, label }: any) {
    return (
        <button onClick={onClick} className="p-3.5 rounded-full bg-white/5 text-white hover:bg-white/20 active:scale-90 transition-all group relative">
            {icon}
            <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {label}
            </span>
        </button>
    )
}

// --- START SHIFT OVERLAY ---
function StartOverlay({ onStart }: { onStart: () => void }) {
    return (
        <div className="fixed inset-0 z-[100] bg-slate-900 flex items-center justify-center p-4">
            <div className="text-center">
                <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/20 animate-bounce">
                    <ChefHat className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-3xl font-black text-white tracking-tight mb-2">Kitchen<span className="text-emerald-500">OS</span></h1>
                <p className="text-slate-400 mb-8">Tap to initialize system sound & graphics</p>
                <button 
                    onClick={onStart}
                    className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black text-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-3 mx-auto shadow-xl"
                >
                    <Play className="w-5 h-5 fill-current" /> START SERVICE
                </button>
            </div>
        </div>
    )
}

// --- MAIN PAGE ---
export default function KitchenPage() {
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<KitchenTicket | null>(null);
  const [prevCount, setPrevCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  
  // Sound & Alert State
  const [hasAlert, setHasAlert] = useState(false);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isFirstLoad = useRef(true); // Track first load to avoid initial beep

  // Responsive Check
  useEffect(() => {
      const checkMobile = () => setIsMobile(window.innerWidth < 1024);
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Data Polling
  useEffect(() => {
    if (!hasStarted) return;
    loadData();
    const interval = setInterval(loadData, 5000); 
    return () => clearInterval(interval);
  }, [hasStarted]);

  // Audio Initialization
  const handleStartShift = () => {
      audioRef.current = new Audio('/sounds/notification.mp3'); 
      audioRef.current.loop = true;
      audioRef.current.volume = 0.5;
      
      // Play brief silence to unlock audio context on mobile
      audioRef.current.play().then(() => {
          audioRef.current?.pause();
          audioRef.current!.currentTime = 0;
      }).catch(e => console.log("Audio permission needed", e));

      setHasStarted(true);
      loadData();
  };

  // Notification Logic (FIXED)
  useEffect(() => {
      const currentPending = tickets.filter(t => t.status === 'pending').length;
      
      if (hasStarted) {
          // If it's the very first load, just set the count, don't beep
          if (isFirstLoad.current) {
              isFirstLoad.current = false;
              setPrevCount(currentPending);
              return;
          }

          // If pending orders INCREASED, trigger alert (even 0 -> 1)
          if (currentPending > prevCount) {
              triggerAlert();
          }
      }
      setPrevCount(currentPending);
  }, [tickets, hasStarted]);

  const triggerAlert = () => {
      setHasAlert(true);
      if (!muted && audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
      }
  };

  const stopAlert = () => {
      setHasAlert(false);
      if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
      }
  };

  const toggleMute = () => {
      setMuted(!muted);
      if (!muted && audioRef.current) audioRef.current.pause();
  };

  async function loadData() {
    const kdsRes = await getKitchenTickets();
    if(kdsRes.success && Array.isArray(kdsRes.data)) {
        const rawData = kdsRes.data as any[]; 
        const sorted = rawData.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        setTickets(sorted as KitchenTicket[]);
    }
    setLoading(false);
  }

  // --- ACTIONS ---

  const handleItemClick = async (item: KitchenItem, ticketId: string) => {
      const statusCycle: Record<string, string> = { 
          'pending': 'cooking', 
          'cooking': 'ready', 
          'ready': 'served' 
      };
      const nextStatus = statusCycle[item.status] || 'pending';
      
      setTickets(prev => prev.map(t => {
          if (t.id !== ticketId) return t;
          return { ...t, order_items: t.order_items.map(i => i.id === item.id ? { ...i, status: nextStatus } : i) };
      }));

      if(selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket(prev => prev ? ({...prev, order_items: prev.order_items.map(i => i.id === item.id ? { ...i, status: nextStatus } : i)}) : null);
      }

      await updateItemStatus(item.id, nextStatus, ticketId);
      loadData(); 
  };

  const handleDisableItem = async (itemName: string) => {
      if(confirm(`Disable "${itemName}" from the menu? Waiters won't be able to order it.`)) {
          const res = await disableMenuItem(itemName);
          if(res.success) toast.success(`${itemName} disabled`);
          else toast.error("Failed to disable item");
      }
  };

  const handleMoveTicket = async (ticketId: string, newStatus: string) => {
      if (newStatus === 'served') {
          setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: 'served' } : t));
          setTimeout(() => { loadData(); }, 2000);
      } else {
          setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus as any } : t));
      }

      if(selectedTicket) setSelectedTicket(null);
      await updateTicketStatus(ticketId, newStatus);
      loadData();
  };

  const pendingTickets = tickets.filter(t => t.status === 'pending');
  const cookingTickets = tickets.filter(t => t.status === 'cooking' || t.status === 'preparing');
  const readyTickets = tickets.filter(t => t.status === 'ready');

  if (!hasStarted) return <StartOverlay onStart={handleStartShift} />;
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]"><Loader2 className="w-16 h-16 text-slate-900 animate-spin" /></div>;

  return (
    <div className="flex h-[100dvh] bg-[#F1F5F9] font-sans text-slate-900 overflow-hidden selection:bg-emerald-500 selection:text-white">
      
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        
        <KDSHeader count={tickets.length} hasAlert={hasAlert} onStopAlert={stopAlert} />

        {/* --- KANBAN BOARD --- */}
        <div className="flex-1 overflow-x-auto p-6 md:p-8 pb-32">
            <div className="flex flex-col md:flex-row gap-8 h-full min-w-full md:min-w-[1400px] justify-center">
                
                <TicketColumn 
                    title="NEW ORDERS" count={pendingTickets.length} tickets={pendingTickets} status="pending"
                    color="border-blue-200/50 bg-blue-50/30" badgeColor="bg-blue-500 text-white shadow-blue-200"
                    onOpen={setSelectedTicket} onDrop={handleMoveTicket} isMobile={isMobile}
                />

                <TicketColumn 
                    title="PREPARING" count={cookingTickets.length} tickets={cookingTickets} status="cooking"
                    color="border-orange-200/50 bg-orange-50/30" badgeColor="bg-orange-500 text-white shadow-orange-200"
                    onOpen={setSelectedTicket} onDrop={handleMoveTicket} isMobile={isMobile}
                />

                <TicketColumn 
                    title="READY TO SERVE" count={readyTickets.length} tickets={readyTickets} status="ready"
                    color="border-emerald-200/50 bg-emerald-50/30" badgeColor="bg-emerald-500 text-white shadow-emerald-200"
                    onOpen={setSelectedTicket} onDrop={handleMoveTicket} isMobile={isMobile}
                />

            </div>
        </div>

        <KitchenDock onRefresh={loadData} muted={muted} toggleMute={toggleMute} />

        {/* --- DETAIL MODAL --- */}
        <AnimatePresence>
            {selectedTicket && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center sm:p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedTicket(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
                    <motion.div 
                        initial={{ y: "100%", scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: "100%", scale: 0.95 }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="bg-white w-full md:w-[600px] rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh] border border-white/20"
                    >
                        {/* Modal Header */}
                        <div className="bg-white p-6 border-b border-slate-100 flex justify-between items-start sticky top-0 z-10">
                            <div>
                                <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{selectedTicket.table_name}</h2>
                                <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">Order #{selectedTicket.id.slice(0,6)}</p>
                            </div>
                            <button onClick={() => setSelectedTicket(null)} className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-900 hover:text-white transition-all"><X className="w-6 h-6" /></button>
                        </div>

                        {/* Items */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar bg-slate-50">
                            {selectedTicket.order_items.map((item) => (
                                <div 
                                    key={item.id} 
                                    className={`p-5 rounded-3xl border-2 flex justify-between items-center transition-all ${
                                        item.status === 'served' ? 'bg-slate-100 border-slate-200 opacity-60 grayscale' : 
                                        'bg-white border-white shadow-sm hover:border-emerald-400 hover:shadow-lg'
                                    }`}
                                >
                                    {/* Left: Item Info (Clickable for Status) */}
                                    <div className="flex items-center gap-5 flex-1 cursor-pointer" onClick={() => handleItemClick(item, selectedTicket.id)}>
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-inner ${item.status === 'served' ? 'bg-slate-200 text-slate-500' : 'bg-slate-900 text-white'}`}>
                                            {item.quantity}x
                                        </div>
                                        <div>
                                            <h4 className={`font-extrabold text-xl leading-none ${item.status === 'served' ? 'line-through text-slate-400' : 'text-slate-900'}`}>{item.name}</h4>
                                            {item.notes && <p className="text-xs font-bold text-red-500 flex items-center gap-1 mt-1.5"><AlertCircle className="w-3.5 h-3.5" /> {item.notes}</p>}
                                        </div>
                                    </div>
                                    
                                    {/* Right: Actions */}
                                    <div className="flex flex-col items-end gap-2">
                                        {/* Status Badge */}
                                        <div 
                                            onClick={() => handleItemClick(item, selectedTicket.id)}
                                            className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase flex items-center gap-2 cursor-pointer transition-colors ${
                                                item.status === 'ready' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 
                                                item.status === 'cooking' ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' : 
                                                'bg-slate-200 text-slate-500'
                                        }`}>
                                            {item.status === 'ready' ? <CheckCheck className="w-4 h-4" /> : item.status === 'cooking' ? <Flame className="w-4 h-4 animate-pulse" /> : <Clock className="w-4 h-4" />}
                                            {item.status}
                                        </div>
                                        
                                        {/* Disable Menu Item Button */}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDisableItem(item.name); }}
                                            className="text-[10px] font-bold text-slate-300 hover:text-red-500 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                                        >
                                            <Ban className="w-3 h-3" /> Disable
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Actions Footer */}
                        <div className="p-6 bg-white border-t border-slate-100 flex gap-4 safe-area-pb shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                            {selectedTicket.status !== 'cooking' && selectedTicket.status !== 'ready' && (
                                <button onClick={() => handleMoveTicket(selectedTicket.id, 'cooking')} className="flex-1 py-4 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white font-black text-base shadow-xl shadow-orange-500/30 active:scale-95 transition-all flex items-center justify-center gap-2">
                                    <Flame className="w-5 h-5" /> Start Cooking
                                </button>
                            )}
                            {selectedTicket.status !== 'ready' && (
                                <button onClick={() => handleMoveTicket(selectedTicket.id, 'ready')} className="flex-1 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-base shadow-xl shadow-emerald-500/30 active:scale-95 transition-all flex items-center justify-center gap-2">
                                    <CheckCircle2 className="w-5 h-5" /> All Ready
                                </button>
                            )}
                            {selectedTicket.status === 'ready' && (
                                <button onClick={() => handleMoveTicket(selectedTicket.id, 'served')} className="flex-1 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-base shadow-xl shadow-slate-900/30 active:scale-95 transition-all flex items-center justify-center gap-2">
                                    <Check className="w-5 h-5" /> SERVE ORDER
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

      </main>
    </div>
  );
}

// --- COLUMN COMPONENT (Protection Enabled) ---
function TicketColumn({ title, count, tickets, status, color, badgeColor, onOpen, onDrop, isMobile }: any) {
    const handleDropInternal = (e: React.DragEvent) => {
        e.preventDefault();
        const ticketId = e.dataTransfer.getData("ticketId");
        if(ticketId) onDrop(ticketId, status);
    };

    return (
        <div 
            onDragOver={(e) => !isMobile && e.preventDefault()}
            onDrop={!isMobile ? handleDropInternal : undefined}
            className={`flex-1 flex flex-col h-[600px] md:h-full rounded-[3rem] border-4 border-dashed ${color} overflow-hidden transition-all duration-300 flex-shrink-0 snap-center shadow-inner relative`}
        >
            <div className="px-8 py-6 flex justify-between items-center sticky top-0 z-10">
                <h3 className="font-black text-slate-400/80 uppercase tracking-widest text-xs flex items-center gap-2">
                    {status === 'pending' ? <Bell className="w-4 h-4" /> : status === 'cooking' ? <Flame className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    {title}
                </h3>
                <span className={`px-3 py-1.5 rounded-xl text-[11px] font-black shadow-lg ${badgeColor}`}>{count}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                <AnimatePresence>
                    {tickets.map((t: KitchenTicket) => (
                        <motion.div 
                            key={t.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5, filter: 'grayscale(100%)' }}
                            draggable={!isMobile}
                            onDragStart={(e: any) => !isMobile && e.dataTransfer.setData("ticketId", t.id)}
                            onClick={() => onOpen(t)} 
                            className="cursor-pointer"
                        >
                            {/* Passed empty onItemClick to Disable click on main card */}
                            <TicketCard ticket={t} onItemClick={() => {}} />
                        </motion.div>
                    ))}
                </AnimatePresence>
                
                {tickets.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50 pb-20">
                        <Utensils className="w-12 h-12 mb-3" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Station Clear</span>
                    </div>
                )}
            </div>
        </div>
    )
}

// --- TICKET CARD ---
function TicketCard({ ticket, onItemClick }: { ticket: KitchenTicket, onItemClick: any }) {
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
    const progress = Math.round((readyItems / totalItems) * 100);

    return (
        <div className={`bg-white p-6 rounded-[2.5rem] shadow-lg shadow-slate-200/50 group relative overflow-hidden transition-all hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98] border-2 ${isLate ? 'border-red-100 ring-2 ring-red-50' : 'border-transparent'}`}>
            
            {/* SERVED STAMP OVERLAY */}
            {ticket.status === 'served' && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-[2px]">
                    <motion.div 
                        initial={{ scale: 2, opacity: 0, rotate: -45 }} 
                        animate={{ scale: 1, opacity: 1, rotate: -15 }}
                        className="border-8 border-emerald-500 text-emerald-500 font-black text-5xl px-4 py-2 rounded-2xl opacity-50 uppercase tracking-tighter"
                    >
                        SERVED
                    </motion.div>
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-start mb-5">
                <div>
                    <span className="text-2xl font-black text-slate-900 block leading-none tracking-tight">{ticket.table_name}</span>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1.5 block">Ticket #{ticket.id.slice(0,4)}</span>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black shadow-inner ${isLate ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
                    <Clock className="w-3.5 h-3.5" /> {elapsed}
                </div>
            </div>

            {/* Items */}
            <div className="space-y-3 mb-4" onClick={(e) => e.stopPropagation()}>
                {ticket.order_items.map((item, i) => (
                    <div 
                        key={i} 
                        // onItemClick is empty here to prevent accidental clicks
                        onClick={() => onItemClick(item, ticket.id)}
                        className={`flex justify-between items-center text-sm p-3 rounded-2xl transition-all border-2 ${
                            item.status === 'ready' ? 'bg-emerald-50 border-emerald-100 text-emerald-900 shadow-sm' :
                            item.status === 'cooking' ? 'bg-orange-50 border-orange-100 text-orange-900 shadow-sm' :
                            'bg-slate-50 border-transparent hover:bg-white hover:border-slate-100'
                        }`}
                    >
                        <span className="flex gap-4 items-center">
                            <span className="font-black text-slate-600 bg-white shadow-sm border border-slate-100 w-7 h-7 flex items-center justify-center rounded-lg text-xs">{item.quantity}</span> 
                            <span className="font-bold tracking-tight">{item.name}</span>
                        </span>
                        {item.status === 'cooking' && <Flame className="w-4 h-4 text-orange-500 animate-pulse" />}
                        {item.status === 'ready' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                    </div>
                ))}
            </div>

            {/* Progress Footer */}
            <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="flex gap-2">
                    {ticket.order_items.some(i => i.notes) && (
                        <div className="text-[10px] font-bold text-white bg-red-500 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-lg shadow-red-500/30">
                            <AlertCircle className="w-3 h-3" /> NOTE
                        </div>
                    )}
                </div>
                {/* Visual Progress */}
                <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-900 transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
                </div>
            </div>
            
            <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Maximize2 className="w-5 h-5 text-slate-300" />
            </div>
        </div>
    )
}