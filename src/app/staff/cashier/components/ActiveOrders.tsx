"use client";
import { Clock, ChefHat, CheckCircle2, ArrowRight, Trash2, Utensils, Edit3, Lock, Loader2, Check, Layers, StickyNote, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";

export default function ActiveOrdersView({ data, onSelectOrder, onServeOrder, onCancelOrder, onEditOrder }: any) {
    
    // STRICT FILTERING
    const active = data.activeOrders?.filter((o:any) => {
        if (['paid', 'cancelled', 'completed'].includes(o.status)) return false;
        
        const hasValidItems = o.items?.some((item: any) => {
            const s = (item.status || '').toLowerCase();
            return s !== 'cancelled' && s !== 'void' && item.qty > 0;
        });
        
        return hasValidItems;
    }) || [];

    const [processingId, setProcessingId] = useState<string | null>(null);

    const handleServe = async (e: any, order: any) => {
        e.stopPropagation();
        
        const readyItems = order.items.filter((i: any) => i.status === 'ready');
        
        if (readyItems.length === 0) {
            toast.error("No items are ready to be served yet.");
            return;
        }

        setProcessingId(order.id);
        try { 
            // Build digital signatures
            const readyItemIdentifiers = readyItems.map((i: any) => i.unique_id || i.id || `${i.name}||${i.variant || ''}`);
            
            const res = await onServeOrder(order.id, order.tbl, readyItemIdentifiers);
            
            if (res && res.success) {
                toast.success(`Items served for Table ${order.tbl}`);
            } else {
                toast.error(res?.error || "Failed to serve order");
            }
        } 
        catch (err) { toast.error("Connection Error"); } 
        finally { setProcessingId(null); }
    };

    // --- PREMIUM CUSTOM TOAST FOR CANCEL ---
    const handleCancel = (e: any, order: any, itemIdToCancel?: string) => {
        e.stopPropagation();
        toast.custom((t) => (
            <div className="bg-white p-5 rounded-[1.5rem] shadow-2xl border border-slate-100 flex flex-col gap-4 w-full sm:w-[320px] pointer-events-auto">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center shrink-0">
                        <Trash2 className="w-5 h-5" />
                    </div>
                    <div className="pt-0.5">
                        <h4 className="font-black text-slate-900 text-sm tracking-tight">
                            {itemIdToCancel ? "Cancel Item?" : "Cancel Round?"}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
                            {itemIdToCancel 
                                ? "Are you sure you want to remove this specific item? This action cannot be undone." 
                                : "Are you sure you want to completely cancel this entire round? This action cannot be undone."}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 mt-1">
                    <button 
                        onClick={() => toast.dismiss(t)} 
                        className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-xl transition-colors"
                    >
                        Keep It
                    </button>
                    <button 
                        onClick={async () => {
                            toast.dismiss(t);
                            setProcessingId(order.id);
                            const res = await onCancelOrder(order.id, order.tbl, itemIdToCancel);
                            setProcessingId(null);
                            
                            if (res && res.success) {
                                toast.success(itemIdToCancel ? "Item Cancelled Successfully" : "Order Cancelled Successfully");
                            } else {
                                toast.error(res?.error || "Could not cancel order");
                            }
                        }} 
                        className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-red-500/25 active:scale-95"
                    >
                        Yes, Cancel
                    </button>
                </div>
            </div>
        ), { duration: 8000, id: `cancel-${order.id}-${itemIdToCancel || 'round'}` });
    };

    const handleEdit = (e: any, order: any) => {
        e.stopPropagation();
        if (onEditOrder) {
             const tId = toast.loading(`Opening editor for Table ${order.tbl}...`);
             setTimeout(() => {
                 toast.dismiss(tId);
                 onEditOrder(order); 
             }, 300);
        }
    };

    // ITEM LEVEL STATUS RENDERER
    const renderItemStatus = (status: string) => {
        const safeStatus = (status || '').toLowerCase().trim();
        if (safeStatus === 'ready') return <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded uppercase tracking-widest animate-pulse border border-emerald-200 shadow-sm">Ready</span>;
        if (safeStatus === 'served') return <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-widest flex items-center gap-1"><Check className="w-2.5 h-2.5"/> Served</span>;
        if (safeStatus === 'cooking') return <span className="text-[9px] font-black bg-orange-100 text-orange-700 px-2 py-0.5 rounded uppercase tracking-widest border border-orange-200">Cooking</span>;
        return <span className="text-[9px] font-black bg-blue-50 text-blue-500 px-2 py-0.5 rounded uppercase tracking-widest border border-blue-100">Pending</span>;
    };

    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto bg-[#F8FAFC] pb-[160px] md:pb-32 custom-scrollbar">
            
            <div className="flex justify-between items-end mb-8 shrink-0">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                        <Clock className="w-8 h-8 text-emerald-600"/> Live Kitchen Feed
                    </h1>
                    <p className="text-slate-500 font-medium text-xs md:text-sm mt-1 ml-11">Monitor cooking status and manage active tables.</p>
                </div>
                <div className="hidden md:block">
                    <span className="bg-white px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 shadow-sm border border-slate-200 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
                        {active.length} Active Tables
                    </span>
                </div>
            </div>
            
            {active.length === 0 ? (
                <div className="h-[50vh] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-[3rem] bg-slate-50">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100">
                        <ChefHat className="w-10 h-10 opacity-30 text-slate-500"/>
                    </div>
                    <p className="font-black text-lg text-slate-400 uppercase tracking-widest">Kitchen Clear</p>
                    <p className="text-xs font-bold opacity-60 mt-1">No active orders right now.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                        {active.map((order: any) => {
                            const isServed = order.status === 'served' || order.status === 'payment_pending';
                            const isProcessing = processingId === order.id;

                            // Filter valid items
                            const displayItems = order.items?.filter((item: any) => {
                                const s = (item.status || '').toLowerCase();
                                return s !== 'cancelled' && s !== 'void' && item.qty > 0;
                            }) || [];

                            // Check status purely based on actual items
                            const hasReadyItems = displayItems.some((i: any) => (i.status || '').toLowerCase().trim() === 'ready');
                            const allItemsServed = displayItems.every((i: any) => ['served', 'paid', 'completed'].includes((i.status || '').toLowerCase().trim()));
                            const hasCookingItems = displayItems.some((i: any) => (i.status || '').toLowerCase().trim() === 'cooking');
                            const hasPendingItems = displayItems.some((i: any) => (i.status || '').toLowerCase().trim() === 'pending');
                            
                            // Entire round can be completely cancelled if ALL items are pending
                            const isFullyPending = displayItems.every((i: any) => (i.status || '').toLowerCase().trim() === 'pending');

                            return (
                                <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key={order.id} onClick={() => onSelectOrder(order)} className={`relative bg-white p-5 md:p-6 rounded-[2rem] border shadow-sm hover:shadow-2xl transition-all cursor-pointer overflow-hidden group flex flex-col h-full min-h-[380px] ${hasReadyItems ? 'border-emerald-300 shadow-emerald-500/10' : isServed ? 'border-blue-100 opacity-95' : 'border-slate-100'}`}>
                                    
                                    {isProcessing && (
                                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-[2rem]">
                                            <div className="flex flex-col items-center gap-3">
                                                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin"/>
                                                <span className="text-xs font-black uppercase tracking-widest text-slate-500">Processing...</span>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {hasReadyItems && <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500 animate-pulse" />}
                                    
                                    <div className="flex justify-between items-start mb-5 shrink-0">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Table {order.tbl}</h3>
                                                {order.type === 'takeaway' && <span className="text-[9px] font-black bg-purple-100 text-purple-700 px-2 py-1 rounded-md border border-purple-200">TAKEAWAY</span>}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-[10px] font-bold text-slate-400">#{order.id.slice(-4)}</p>
                                                <span className="text-slate-300">•</span>
                                                <p className="text-[10px] font-bold text-slate-400">{order.time}</p>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm border ${hasReadyItems ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : allItemsServed ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                            {hasReadyItems ? "Action Required" : (hasCookingItems && !hasReadyItems) ? "Cooking" : order.status}
                                        </span>
                                    </div>
                                    
                                    <div className="flex-1 space-y-2 mb-6 max-h-48 overflow-y-auto custom-scrollbar pr-2 bg-slate-50/50 rounded-[1.5rem] p-3 border border-slate-100/50">
                                        {displayItems.map((item:any, i:number) => (
                                            <div key={i} className={`flex justify-between items-start text-sm pb-3 border-b border-dashed border-slate-200 last:border-0 last:pb-0 pt-1 ${(item.status || '').toLowerCase().trim() === 'served' ? 'opacity-50 grayscale' : ''}`}>
                                                <div className="flex gap-3 w-full pr-2">
                                                    <span className={`font-black w-7 h-7 flex items-center justify-center rounded-lg text-xs shrink-0 ${(item.status || '').toLowerCase().trim() === 'ready' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-slate-200 text-slate-600'}`}>{item.qty}</span>
                                                    <div className="flex flex-col w-full">
                                                        <div className="flex justify-between items-start w-full gap-2">
                                                            <span className={`font-bold leading-tight ${(item.status || '').toLowerCase().trim() === 'served' ? 'line-through' : 'text-slate-900'}`}>{item.name}</span>
                                                            
                                                            {/* STATUS & ITEM-LEVEL CANCEL BUTTON */}
                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                {renderItemStatus(item.status)}
                                                                {(item.status || '').toLowerCase().trim() === 'pending' && !isFullyPending && (
                                                                    <button 
                                                                        onClick={(e) => {
                                                                            const sig = item.unique_id || item.id || `${item.name}||${item.variant || ''}`;
                                                                            handleCancel(e, order, sig);
                                                                        }}
                                                                        className="p-1 bg-white text-red-500 rounded-md border border-red-100 hover:bg-red-50 hover:border-red-300 transition-all shadow-sm active:scale-95"
                                                                        title="Cancel specific item"
                                                                    >
                                                                        <XCircle className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                                            {item.variant && <span className="text-[9px] font-bold bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm"><Layers className="w-2.5 h-2.5"/> {item.variant}</span>}
                                                            {item.note && <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1 italic shadow-sm"><StickyNote className="w-2.5 h-2.5"/> {item.note}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mt-auto shrink-0">
                                        {hasReadyItems ? (
                                            <button onClick={(e) => handleServe(e, order)} className="col-span-2 py-4 bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 border border-emerald-400">
                                                <Utensils className="w-4 h-4"/> Serve Ready Items
                                            </button>
                                        ) : (
                                            <button onClick={() => onSelectOrder(order)} className="col-span-2 py-4 bg-slate-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-lg active:scale-95">
                                                View & Pay <ArrowRight className="w-4 h-4"/>
                                            </button>
                                        )}
                                        
                                        {/* EDIT IS UNLOCKED IF ANY ITEM IS PENDING */}
                                        {hasPendingItems ? (
                                            <button onClick={(e) => handleEdit(e, order)} className="py-3.5 bg-white text-slate-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 border-2 border-slate-200 transition-all active:scale-95"><Edit3 className="w-4 h-4"/> Edit</button>
                                        ) : !hasReadyItems && !allItemsServed ? (
                                            <button disabled className="py-3.5 bg-slate-50 text-slate-400 rounded-xl font-bold text-[10px] border border-slate-100 flex items-center justify-center gap-2 cursor-not-allowed uppercase tracking-wider"><Lock className="w-3 h-3"/> Locked</button>
                                        ) : null}

                                        {isFullyPending && (
                                            <button onClick={(e) => handleCancel(e, order)} className="py-3.5 bg-red-50 text-red-500 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-red-100 hover:border-red-200 border-2 border-red-100 transition-all active:scale-95"><Trash2 className="w-4 h-4"/> Cancel</button>
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