"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/app/admin/Sidebar";
import { 
  ChefHat, Clock, CheckCircle2, Flame, Bell, 
  Loader2, Maximize2, X, AlertCircle, RefreshCcw, Check
} from "lucide-react";
import { toast } from "sonner";
import { getKitchenTickets, updateTicketStatus, updateItemStatus } from "@/app/actions/kitchen"; 
import { getBartenderTickets, updateBartenderTicketStatus, updateBartenderItemStatus } from "@/app/actions/bartender";
import { getDashboardData } from "@/app/actions/dashboard";
import { motion, AnimatePresence } from "framer-motion";
import NepaliDate from 'nepali-date-converter';

// --- TYPES ---
interface KitchenItem {
    id: string;
    unique_id?: string;
    name: string;
    quantity: number;
    notes?: string;
    status: string;
    station: string;
    category?: string;
}

interface KitchenTicket {
    id: string;
    table_name: string;
    status: 'pending' | 'preparing' | 'cooking' | 'ready';
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
function KDSHeader({ count, businessDate, activeStation, setActiveStation }: { count: number, businessDate?: string, activeStation: 'kitchen'|'bar', setActiveStation: (s: 'kitchen'|'bar') => void }) {
    const [timeInfo, setTimeInfo] = useState({ time: "", date: "" });

    useEffect(() => {
        const timer = setInterval(() => {
            const date = new Date();
            let dateStr = "Loading Date...";
            if (businessDate) {
                try {
                    const [y, m, d] = businessDate.split('-').map(Number);
                    const localDate = new Date(y, m - 1, d);
                    const np = new NepaliDate(localDate);
                    dateStr = `${nepaliMonths[np.getMonth()]} ${toNepaliDigits(np.getDate())}, ${toNepaliDigits(np.getYear())}`;
                } catch (e) {
                    console.error("KDS Header NepaliDate Error:", e);
                }
            }
            setTimeInfo({
                time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                date: dateStr
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [businessDate]);

    return (
        <header className="flex-shrink-0 bg-white/90 backdrop-blur-xl border-b border-slate-200 px-6 py-4 flex justify-between items-center z-20 shadow-sm relative">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/20">
                    <ChefHat className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                        {activeStation === 'kitchen' ? 'Kitchen Monitor' : 'Bar Monitor'}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1 text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-lg border border-indigo-200">
                            <Flame className="w-3 h-3" /> {count} Active
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{timeInfo.date}</span>
                    </div>
                </div>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 flex bg-slate-100 p-1 rounded-xl hidden md:flex">
                <button 
                    onClick={() => setActiveStation('kitchen')} 
                    className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeStation === 'kitchen' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Kitchen
                </button>
                <button 
                    onClick={() => setActiveStation('bar')} 
                    className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeStation === 'bar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Bar
                </button>
            </div>
            
            <div className="text-right hidden md:block">
                <p className="text-3xl font-black text-slate-900 tabular-nums leading-none">{timeInfo.time}</p>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Admin View</p>
            </div>
        </header>
    )
}

// --- MAIN PAGE ---
export default function AdminKitchenPage() {
  const [tenant, setTenant] = useState<any>(null);
  const [kitchenTickets, setKitchenTickets] = useState<KitchenTicket[]>([]);
  const [barTickets, setBarTickets] = useState<KitchenTicket[]>([]);
  const [activeStation, setActiveStation] = useState<'kitchen'|'bar'>('kitchen');
  const tickets = activeStation === 'kitchen' ? kitchenTickets : barTickets;
  const setTickets = activeStation === 'kitchen' ? setKitchenTickets : setBarTickets;
  const [loading, setLoading] = useState(true);
  const [businessDate, setBusinessDate] = useState<string>("");
  const [selectedTicket, setSelectedTicket] = useState<KitchenTicket | null>(null);
  const [prevCount, setPrevCount] = useState(0);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
      if (tickets.length > prevCount && prevCount !== 0) {
          toast.success("New Order Received!", { 
              icon: <Bell className="w-5 h-5 text-indigo-500" />,
              style: { borderRadius: '1rem', fontWeight: 'bold' }
          });
      }
      setPrevCount(tickets.length);
  }, [tickets.length]);

  async function loadData() {
    const [dashRes, kdsRes, barRes] = await Promise.all([getDashboardData(), getKitchenTickets(), getBartenderTickets()]);
    if(dashRes) setTenant(dashRes.tenant);
    
    if(kdsRes.success && Array.isArray(kdsRes.data)) {
        if ((kdsRes as any).businessDate) setBusinessDate((kdsRes as any).businessDate);
        
        // Strict Kitchen Filtering to match staff/kitchen
        const filteredKitchen = (kdsRes.data as any[]).map(t => {
            const kitchenItems = (t.order_items || []).filter((item: KitchenItem) => {
                const st = String(item.station || (item as any).prep_station || '').toLowerCase().trim();
                const dietary = String(item.category || (item as any).dietary || '').toLowerCase().trim();
                if (st === 'kitchen' || st === 'food' || st === 'main') return true;
                if (st === 'bar' || st === 'coffee') return false;
                if (st === '') return !['drinks', 'beverage', 'liquor', 'cocktail', 'mocktail'].includes(dietary);
                return true; 
            });
            return { ...t, order_items: kitchenItems };
        }).filter(t => t.order_items.length > 0 && t.status !== 'served');

        setKitchenTickets(filteredKitchen.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
    }
    
    if(barRes && barRes.success && Array.isArray(barRes.data)) {
        // Strict Bar Filtering to match staff/bartender
        const filteredBar = (barRes.data as any[]).map(t => {
            const barItems = (t.order_items || []).filter((item: KitchenItem) => {
                const st = String(item.station || (item as any).prep_station || '').toLowerCase().trim();
                const dietary = String(item.category || (item as any).dietary || '').toLowerCase().trim();
                if (st === 'bar' || st === 'coffee') return true;
                if (st === 'kitchen' || st === 'food' || st === 'main') return false; 
                if (st === '') return ['drinks', 'beverage', 'liquor', 'cocktail', 'mocktail'].includes(dietary);
                return false; 
            });
            return { ...t, order_items: barItems };
        }).filter(t => t.order_items.length > 0 && t.status !== 'served');

        setBarTickets(filteredBar.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
    }
    
    setLoading(false);
  }

  // --- ACTIONS ---
  const handleItemClick = async (item: KitchenItem, ticketId: string) => {
      const statusMap: any = { 'pending': 'cooking', 'cooking': 'ready', 'ready': 'served' };
      const nextStatus = statusMap[item.status] || 'pending';
      
      setTickets(prev => prev.map(t => {
          if (t.id !== ticketId) return t;
          return { ...t, order_items: t.order_items.map(i => i.id === item.id ? { ...i, status: nextStatus } : i) };
      }));

      if(selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket(prev => prev ? ({...prev, order_items: prev.order_items.map(i => i.id === item.id ? { ...i, status: nextStatus } : i)}) : null);
      }

      const targetItemId = item.unique_id || item.id;
      await (activeStation === 'kitchen' ? updateItemStatus : updateBartenderItemStatus)(targetItemId, nextStatus, ticketId);
      loadData(); 
  };

  const handleDragDrop = async (ticketId: string, newStatus: string) => {
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus as any } : t));
      await (activeStation === 'kitchen' ? updateTicketStatus : updateBartenderTicketStatus)(ticketId, newStatus);
      loadData();
  };

  const pendingTickets = tickets.filter(t => t.status === 'pending');
  const cookingTickets = tickets.filter(t => t.status === 'preparing' || t.status === 'cooking');
  const readyTickets = tickets.filter(t => t.status === 'ready');

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]"><Loader2 className="w-12 h-12 text-emerald-600 animate-spin" /></div>;

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden">
      <Sidebar tenantName={tenant?.name} tenantCode={tenant?.code} logo={tenant?.logo_url} />
      
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        
        <KDSHeader count={tickets.length} businessDate={businessDate} activeStation={activeStation} setActiveStation={setActiveStation} />

        <div className="flex-1 overflow-x-auto p-6 pb-24">
            <div className="flex gap-6 h-full min-w-[1200px]">
                <TicketColumn 
                    title="New Orders" count={pendingTickets.length} tickets={pendingTickets}
                    color="border-blue-200 bg-blue-50/50" badgeColor="bg-blue-100 text-blue-700"
                    onOpen={setSelectedTicket}
                />
                <TicketColumn 
                    title="Cooking" count={cookingTickets.length} tickets={cookingTickets}
                    color="border-orange-200 bg-orange-50/50" badgeColor="bg-orange-100 text-orange-700"
                    onOpen={setSelectedTicket}
                />
                <TicketColumn 
                    title="Ready for Pickup" count={readyTickets.length} tickets={readyTickets}
                    color="border-emerald-200 bg-emerald-50/50" badgeColor="bg-emerald-100 text-emerald-700"
                    onOpen={setSelectedTicket}
                />
            </div>
        </div>

        <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
             <button onClick={loadData} className="p-3 rounded-2xl bg-slate-900 text-white shadow-2xl hover:scale-110 transition-transform active:scale-95 border border-white/20">
                <RefreshCcw className="w-6 h-6" />
            </button>
        </motion.div>

        <AnimatePresence>
            {selectedTicket && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedTicket(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <motion.div 
                        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} 
                        className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl relative z-10 overflow-hidden border border-slate-100"
                    >
                        <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">{selectedTicket.table_name}</h2>
                                <p className="text-sm font-bold text-slate-400 mt-1">Ticket #{selectedTicket.id.slice(0,6)}</p>
                            </div>
                            <button onClick={() => setSelectedTicket(null)} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-3">
                            <p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Order Checklist</p>
                            {selectedTicket.order_items.map((item) => (
                                <div 
                                    key={item.id} 
                                    className={`p-4 rounded-2xl border flex justify-between items-center ${item.status === 'served' ? 'bg-slate-50 border-slate-100 opacity-50 grayscale' : 'bg-white border-slate-200'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-sm bg-slate-100 text-slate-700`}>{item.quantity}x</div>
                                        <div>
                                            <h4 className={`font-bold text-lg text-slate-800`}>{item.name}</h4>
                                            {item.notes && <p className="text-xs font-bold text-red-500 flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" /> {item.notes}</p>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black uppercase px-2 py-1 rounded-md bg-slate-100 text-slate-400">{item.status}</span>
                                        <div onClick={() => handleItemClick(item, selectedTicket.id)} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer hover:scale-110 active:scale-95 ${item.status === 'ready' || item.status === 'served' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 text-transparent'}`}><Check className="w-4 h-4" /></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

      </main>
    </div>
  );
}

function TicketColumn({ title, count, tickets, color, badgeColor, onOpen }: any) {
    return (
        <div 
            className={`flex-1 flex flex-col h-full rounded-[2.5rem] border-2 border-dashed ${color} overflow-hidden`}
        >
            <div className="px-6 py-4 flex justify-between items-center sticky top-0 z-10 bg-white/30 backdrop-blur-sm">
                <h3 className="font-black text-slate-400 uppercase tracking-widest text-xs">{title}</h3>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${badgeColor}`}>{count}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {tickets.map((t: KitchenTicket) => (
                    <div 
                        key={t.id} 
                        onClick={() => onOpen(t)} 
                        className="cursor-pointer hover:scale-[1.02] transition-transform"
                    >
                        <TicketCard ticket={t} />
                    </div>
                ))}
                {tickets.length === 0 && <div className="h-32 flex items-center justify-center text-slate-400 text-xs font-bold uppercase opacity-50">Empty</div>}
            </div>
        </div>
    )
}

function TicketCard({ ticket }: { ticket: KitchenTicket }) {
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

    const allDone = ticket.order_items.every(i => i.status === 'ready' || i.status === 'served');

    return (
        <motion.div 
            layout initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} 
            className={`bg-white p-5 rounded-[1.5rem] border shadow-sm group relative overflow-hidden transition-shadow hover:shadow-md ${allDone ? 'border-emerald-200 ring-2 ring-emerald-50' : 'border-slate-200'}`}
        >
            <div className="flex justify-between items-start mb-3">
                <span className="text-xl font-black text-slate-900">{ticket.table_name}</span>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black ${isLate ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
                    <Clock className="w-3 h-3" /> {elapsed}
                </div>
            </div>

            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                {ticket.order_items.map((item, i) => (
                    <div 
                        key={i} 
                        className={`flex justify-between items-center text-sm p-1.5 rounded-lg ${item.status === 'served' ? 'line-through text-slate-300' : 'text-slate-600'}`}
                    >
                        <span className="flex gap-2 items-center">
                            <span className="font-bold text-slate-400 bg-slate-100 px-1.5 rounded text-xs">{item.quantity}x</span> 
                            <span className={`font-bold ${item.status === 'ready' ? 'text-emerald-600' : 'text-slate-800'}`}>{item.name}</span>
                        </span>
                        {item.status === 'cooking' && <Flame className="w-3 h-3 text-orange-500 animate-pulse" />}
                        {item.status === 'ready' && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                    </div>
                ))}
            </div>
            
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <Maximize2 className="w-4 h-4 text-slate-400" />
            </div>
        </motion.div>
    )
}