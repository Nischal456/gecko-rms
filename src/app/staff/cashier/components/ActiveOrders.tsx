"use client";
import { Clock, ChefHat, CheckCircle2, ArrowRight, Trash2, Utensils, Edit3, AlertTriangle, X, PlusCircle, StickyNote, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";

export default function ActiveOrdersView({ data, onSelectOrder, onServeOrder, onCancelOrder, onEditOrder }: any) {
    // Filter active orders
    const active = data.activeOrders?.filter((o:any) => !['paid', 'cancelled', 'completed'].includes(o.status)) || [];

    // Local state for optimistic updates
    const [processingId, setProcessingId] = useState<string | null>(null);

    const handleServe = async (e: any, order: any) => {
        e.stopPropagation();
        if(confirm(`Confirm Table ${order.tbl} is Served?`)) {
            setProcessingId(order.id);
            try {
                await onServeOrder(order.id, order.tbl);
                toast.success("Order Served");
            } catch (err) {
                toast.error("Action Failed");
            } finally {
                setProcessingId(null);
            }
        }
    };

    const handleCancel = async (e: any, order: any) => {
        e.stopPropagation();
        if(confirm("Are you sure you want to CANCEL this order?")) {
            setProcessingId(order.id);
            try {
                await onCancelOrder(order.id, order.tbl);
                toast.success("Order Cancelled");
            } catch (err) {
                toast.error("Cancel Failed - Kitchen may have started");
            } finally {
                setProcessingId(null);
            }
        }
    };

    const handleEdit = (e: any, order: any) => {
        e.stopPropagation();
        if (onEditOrder) {
             toast.loading(`Syncing Table ${order.tbl} for editing...`, { duration: 1500 });
             setTimeout(() => {
                 onEditOrder(order.tbl); // Pass the table ID to open POS
             }, 300);
        }
    };

    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto bg-[#F8FAFC] pb-32 custom-scrollbar">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                        <Clock className="w-8 h-8 text-emerald-600"/> Live Kitchen Feed
                    </h1>
                    <p className="text-slate-500 font-medium text-sm mt-1 ml-11">Monitor cooking status and manage active tables.</p>
                </div>
                <div className="hidden md:block">
                    <span className="bg-white px-4 py-2 rounded-full text-xs font-bold text-slate-500 shadow-sm border border-slate-100 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
                        {active.length} Active Tables
                    </span>
                </div>
            </div>
            
            {active.length === 0 ? (
                <div className="h-96 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-[3rem]">
                    <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                        <ChefHat className="w-10 h-10 opacity-30 text-slate-500"/>
                    </div>
                    <p className="font-black text-lg text-slate-300 uppercase tracking-widest">Kitchen Clear</p>
                    <p className="text-xs font-medium text-slate-400 mt-2">No active orders at the moment</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                        {active.map((order: any) => {
                            const isReady = order.status === 'ready';
                            const isPending = order.status === 'pending';
                            const isServed = order.status === 'served';
                            const isCooking = order.status === 'cooking';
                            const isProcessing = processingId === order.id;

                            return (
                                <motion.div 
                                    layout
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                    key={order.id} 
                                    onClick={() => onSelectOrder(order)}
                                    className={`relative bg-white p-5 rounded-[2rem] border shadow-sm hover:shadow-2xl transition-all cursor-pointer overflow-hidden group flex flex-col ${
                                        isReady ? 'border-emerald-200 shadow-emerald-500/10 ring-1 ring-emerald-100' : 
                                        isServed ? 'border-blue-100 opacity-95 hover:opacity-100' :
                                        'border-slate-100'
                                    }`}
                                >
                                    {isProcessing && (
                                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
                                            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"/>
                                        </div>
                                    )}

                                    {isReady && <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500 animate-pulse" />}
                                    
                                    {/* Header */}
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-2xl font-black text-slate-900">Table {order.tbl}</h3>
                                                {order.type === 'takeaway' && <span className="text-[9px] font-black bg-purple-100 text-purple-700 px-2 py-1 rounded-md tracking-wider">TAKEAWAY</span>}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">#{order.id.slice(-4)}</p>
                                                <span className="text-[10px] font-bold text-slate-300">•</span>
                                                <p className="text-[10px] font-bold text-slate-400">{order.time}</p>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm border flex items-center gap-1.5 ${
                                            isReady ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                                            isServed ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                            isCooking ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                            'bg-slate-50 text-slate-600 border-slate-200'
                                        }`}>
                                            {isReady && <span className="relative flex h-2 w-2 mr-1"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>}
                                            {order.status}
                                        </span>
                                    </div>
                                    
                                    {/* Items List (Premium Styling) */}
                                    <div className="flex-1 space-y-2 mb-6 max-h-48 overflow-y-auto custom-scrollbar pr-1 bg-slate-50/50 rounded-xl p-2 border border-slate-100/50">
                                        {order.items?.map((item:any, i:number) => (
                                            <div key={i} className="flex justify-between text-sm items-start pb-2 border-b border-dashed border-slate-200 last:border-0 last:pb-0">
                                                <div className="flex gap-3 w-full">
                                                    {/* Qty Badge */}
                                                    <span className="font-bold text-white bg-slate-900 w-6 h-6 flex items-center justify-center rounded-lg text-[10px] shrink-0 shadow-sm mt-0.5">{item.qty}</span>
                                                    
                                                    <div className="flex flex-col w-full">
                                                        <span className="font-bold text-slate-800 leading-tight text-sm">{item.name}</span>
                                                        
                                                        {/* Variants & Notes */}
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {item.variant && (
                                                                <span className="text-[9px] font-bold bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                                    <Layers className="w-2.5 h-2.5"/> {item.variant}
                                                                </span>
                                                            )}
                                                            {item.note && (
                                                                <span className="text-[9px] font-medium text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded flex items-center gap-1 italic">
                                                                    <StickyNote className="w-2.5 h-2.5"/> {item.note}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Action Grid */}
                                    <div className="grid grid-cols-2 gap-3 mt-auto">
                                        {/* Primary Action */}
                                        {isReady ? (
                                            <button 
                                                onClick={(e) => handleServe(e, order)} 
                                                className="col-span-2 py-4 bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 group-hover:-translate-y-0.5"
                                            >
                                                <Utensils className="w-4 h-4"/> Mark Served
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => onSelectOrder(order)} 
                                                className="col-span-2 py-4 bg-slate-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10 active:scale-95"
                                            >
                                                View & Pay <ArrowRight className="w-4 h-4"/>
                                            </button>
                                        )}
                                        
                                        {/* Secondary Actions */}
                                        <button 
                                            onClick={(e) => handleEdit(e, order)} 
                                            className={`py-3 bg-white text-slate-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 border border-slate-200 transition-all active:scale-95 ${(!isPending && !isServed) ? 'col-span-2' : ''}`}
                                        >
                                            {isPending ? <><Edit3 className="w-4 h-4"/> Edit</> : <><PlusCircle className="w-4 h-4"/> Add Item</>}
                                        </button>

                                        {(isPending) && (
                                            <button 
                                                onClick={(e) => handleCancel(e, order)} 
                                                className="py-3 bg-white text-red-500 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-red-50 hover:border-red-200 border border-slate-200 transition-all active:scale-95"
                                            >
                                                <Trash2 className="w-4 h-4"/> Cancel
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}
        </div>
    )
}