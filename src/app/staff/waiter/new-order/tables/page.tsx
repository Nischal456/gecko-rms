"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Search, Users, Circle, Square, 
  MapPin, CheckCircle2, Clock, Loader2, Filter, 
  ArrowRight, LayoutDashboard, Layers
} from "lucide-react";
import Sidebar from "@/app/staff/waiter/Sidebar";
import { getPOSStats } from "@/app/actions/pos"; 
import { toast } from "sonner";

// --- COMPONENTS ---

function SectionPill({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
    return (
        <button 
            onClick={onClick}
            className={`whitespace-nowrap px-5 py-2.5 rounded-xl text-xs font-bold transition-all border shadow-sm ${active ? 'bg-slate-900 text-white border-slate-900 shadow-md transform scale-105' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
        >
            {label}
        </button>
    )
}

function StatusPill({ label, active, onClick, count, color }: any) {
    const activeStyle = color === 'orange' 
        ? 'bg-orange-100 text-orange-700 border-orange-200' 
        : color === 'emerald' 
        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
        : 'bg-slate-900 text-white border-slate-900';

    return (
        <button 
            onClick={onClick}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${active ? activeStyle : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
        >
            {label}
            {count !== undefined && <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>{count}</span>}
        </button>
    )
}

function TableCard({ table, onClick }: any) {
    const isOccupied = table.status === 'occupied';
    
    // Theme Colors
    const borderColor = isOccupied ? 'border-orange-200' : 'border-emerald-200';
    const bgColor = isOccupied ? 'bg-orange-50/50 hover:bg-orange-50' : 'bg-white hover:border-emerald-400 hover:shadow-emerald-500/10';
    const textColor = isOccupied ? 'text-orange-700' : 'text-slate-700';
    const statusText = isOccupied ? 'Occupied' : 'Vacant';
    const StatusIcon = isOccupied ? Clock : CheckCircle2;

    return (
        <motion.button
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)" }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`relative flex flex-col p-5 rounded-[1.8rem] border-2 transition-all duration-300 text-left group w-full h-full min-h-[160px] justify-between ${borderColor} ${bgColor}`}
        >
            {/* Header: Table Number & Status */}
            <div className="flex justify-between items-start w-full gap-2">
                <div className={`h-11 min-w-[3.5rem] px-2 rounded-2xl flex-shrink-0 flex items-center justify-center border shadow-sm transition-colors ${isOccupied ? 'bg-white border-orange-100' : 'bg-emerald-50 border-emerald-100'}`}>
                    <span className={`font-black text-lg whitespace-nowrap ${isOccupied ? 'text-orange-600' : 'text-emerald-600'}`}>{table.label}</span>
                </div>
                
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${isOccupied ? 'bg-white/80 border-orange-200 text-orange-600' : 'bg-emerald-100/50 border-emerald-200 text-emerald-700'}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{statusText}</span>
                </div>
            </div>

            {/* Middle: Section Name */}
            <div className="mt-4 mb-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {table.section}
                </p>
            </div>

            {/* Footer: Details & Action */}
            <div className="flex items-end justify-between w-full gap-2 border-t border-slate-200/50 pt-3">
                <div className={`flex items-center gap-1.5 font-bold text-xs ${textColor}`}>
                    {table.shape === 'round' ? <Circle className="w-3.5 h-3.5 flex-shrink-0" /> : <Square className="w-3.5 h-3.5 flex-shrink-0" />}
                    <span className="whitespace-nowrap">{table.seats || 4} Seats</span>
                </div>
                
                <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center transition-colors ${isOccupied ? 'bg-orange-200 text-orange-700' : 'bg-slate-100 text-slate-400 group-hover:bg-emerald-500 group-hover:text-white'}`}>
                    <ArrowRight className="w-4 h-4" />
                </div>
            </div>
        </motion.button>
    )
}

export default function TableSelectionPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [tables, setTables] = useState<any[]>([]);
    
    // Filters
    const [statusFilter, setStatusFilter] = useState("All"); 
    const [sectionFilter, setSectionFilter] = useState("All"); 
    const [searchQuery, setSearchQuery] = useState("");
    const [availableSections, setAvailableSections] = useState<string[]>([]);

    useEffect(() => {
        loadTables();
    }, []);

    async function loadTables() {
        try {
            const res = await getPOSStats();
            if (res.success && res.stats?.tables) {
                const fetchedTables = res.stats.tables;
                
                // 1. Data Normalization & Cleaning
                const cleanTables = fetchedTables.map((t: any) => {
                    const rawSection = t.section && t.section.trim() !== "" ? t.section : "Main Hall";
                    
                    // Fix: Capitalize Each Word (e.g. "rooftop bar" -> "Rooftop Bar")
                    const formattedSection = rawSection.toLowerCase().replace(/(^\w|\s\w)/g, (m: string) => m.toUpperCase());

                    return {
                        ...t,
                        section: formattedSection,
                    };
                });
                
                setTables(cleanTables);
                
                // 2. Extract Unique Sections for Tabs (Alphabetical Sort)
                const sections = Array.from(new Set(cleanTables.map((t: any) => t.section))).sort() as string[];
                setAvailableSections(sections);
            }
        } catch (e) {
            toast.error("Failed to load tables");
        } finally {
            setLoading(false);
        }
    }

    const handleTableSelect = (tableId: string) => {
        router.push(`/staff/waiter/pos?table=${tableId}`);
    };

    // --- FILTER LOGIC ---
    const filteredTables = tables.filter(table => {
        const matchesSearch = table.label.toLowerCase().includes(searchQuery.toLowerCase());
        
        const isOccupied = table.status === 'occupied';
        const matchesStatus = 
            statusFilter === "All" ? true :
            statusFilter === "Free" ? !isOccupied :
            isOccupied;

        const matchesSection = sectionFilter === "All" || table.section === sectionFilter;
        
        return matchesSearch && matchesStatus && matchesSection;
    });

    // Counts
    const countFree = tables.filter(t => t.status !== 'occupied').length;
    const countOccupied = tables.filter(t => t.status === 'occupied').length;

    return (
        <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900">
            <Sidebar />
            
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                
                {/* HEADER AREA */}
                <header className="px-5 md:px-10 py-5 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-20 flex flex-col gap-5 shadow-sm">
                    
                    {/* Top Row: Title & Search */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <button onClick={() => router.back()} className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors shadow-sm">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Select Table</h1>
                                <p className="text-xs md:text-sm font-bold text-slate-400">Choose a table to start order</p>
                            </div>
                        </div>
                        
                        <div className="relative w-full md:w-72 group">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                            <input 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Find table (e.g. T-1)..." 
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-100/50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-emerald-100 transition-all shadow-inner" 
                            />
                        </div>
                    </div>

                    {/* Bottom Row: Section Tabs & Status Filter */}
                    <div className="flex flex-col md:flex-row gap-4 justify-between">
                        {/* Section Tabs (Scrollable) */}
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-5 px-5 md:mx-0 md:px-0">
                            <div className="flex items-center gap-2 bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50">
                                <SectionPill label="All Zones" active={sectionFilter === 'All'} onClick={() => setSectionFilter('All')} />
                                {availableSections.map(sec => (
                                    <SectionPill key={sec} label={sec} active={sectionFilter === sec} onClick={() => setSectionFilter(sec)} />
                                ))}
                            </div>
                        </div>

                        {/* Status Filters */}
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                            <StatusPill label="All" active={statusFilter === 'All'} onClick={() => setStatusFilter('All')} count={tables.length} />
                            <StatusPill label="Vacant" active={statusFilter === 'Free'} onClick={() => setStatusFilter('Free')} count={countFree} color="emerald" />
                            <StatusPill label="Occupied" active={statusFilter === 'Occupied'} onClick={() => setStatusFilter('Occupied')} count={countOccupied} color="orange" />
                        </div>
                    </div>
                </header>

                {/* TABLE GRID (BOX LAYOUT) */}
                <div className="flex-1 overflow-y-auto p-5 md:p-10 custom-scrollbar">
                    <div className="max-w-7xl mx-auto">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                <Loader2 className="w-10 h-10 animate-spin mb-4 text-emerald-500" />
                                <p className="font-bold animate-pulse">Syncing Floor Plan...</p>
                            </div>
                        ) : filteredTables.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
                                <MapPin className="w-12 h-12 mb-2 opacity-30" />
                                <p className="font-bold">No tables found</p>
                                {sectionFilter !== "All" && <p className="text-xs mt-1">Try checking another section</p>}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                                <AnimatePresence mode="popLayout">
                                    {filteredTables.map((table) => (
                                        <TableCard key={table.id || table.label} table={table} onClick={() => handleTableSelect(table.label)} />
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </div>

            </main>
        </div>
    );
}