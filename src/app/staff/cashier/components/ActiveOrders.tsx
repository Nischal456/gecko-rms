"use client";
import { Clock, ChefHat, CheckCircle2, ArrowRight, Trash2, Utensils, Edit3, Lock, Loader2, Check, Layers, StickyNote, XCircle, AlertCircle, ShoppingBag, Receipt } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";

const formatRs = (amount: number) => "Rs " + new Intl.NumberFormat('en-NP', { maximumFractionDigits: 0 }).format(amount);

export default function ActiveOrdersView({ data, onSelectOrder, onServeOrder, onCancelOrder, onEditOrder }: any) {
    
    const [filter, setFilter] = useState<'active' | 'cancelled'>('active');
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Advanced Cancel Modal State
    const [cancelFlow, setCancelFlow] = useState<{orderId: string, tableLabel: string, itemId?: string, requiresReason: boolean} | null>(null);
    const [cancelReason, setCancelReason] = useState("");

    const active = data.activeOrders?.filter((o:any) => {
        if (['paid', 'cancelled', 'completed'].includes(o.status)) return false;
        const hasValidItems = o.items?.some((item: any) => {
            const s = (item.status || '').toLowerCase();
            return s !== 'cancelled' && s !== 'void' && item.qty > 0;
        });
        return hasValidItems;
    }) || [];

    const cancelledItems = data.cancelledItems || [];

    const handleServe = async (e: any, order: any) => {
        e.stopPropagation();
        const readyItems = order.items.filter((i: any) => i.status === 'ready');
        if (readyItems.length === 0) return toast.error("No items are ready to be served yet.");

        setProcessingId(order.id);
        try { 
            const readyItemIdentifiers = readyItems.map((i: any) => i.unique_id || i.id || `${i.name}||${i.variant || ''}`);
            const res = await onServeOrder(order.id, order.tbl, readyItemIdentifiers);
            if (res && res.success) toast.success(`Items served for Table ${order.tbl}`);
            else toast.error(res?.error || "Failed to serve order");
        } 
        catch (err) { toast.error("Connection Error"); } 
        finally { setProcessingId(null); }
    };

    const triggerCancel = (e: any, order: any, item?: any) => {
        e.stopPropagation();
        const safeStatus = item ? (item.status || '').toLowerCase().trim() : '';
        // Only force reason if it is currently cooking or ready
        const requiresReason = item ? ['cooking', 'ready'].includes(safeStatus) : false; 
        
        const sig = item ? (item.unique_id || item.id || `${item.name}||${item.variant || ''}`) : undefined;

        setCancelFlow({ 
            orderId: order.id, 
            tableLabel: order.tbl, 
            itemId: sig, 
            requiresReason 
        });
        setCancelReason("");
    };

    const confirmCancel = async () => {
        if (!cancelFlow) return;
        if (cancelFlow.requiresReason && !cancelReason.trim()) {
            return toast.error("Reason required", { description: "Please provide a reason for cancelling prepared food."});
        }

        const { orderId, tableLabel, itemId } = cancelFlow;
        const finalReason = cancelReason.trim();
        
        setCancelFlow(null);
        setProcessingId(orderId);
        
        try {
            const res = await onCancelOrder(orderId, tableLabel, itemId, finalReason);
            if (res && res.success) {
                toast.success(itemId ? "Item Cancelled Successfully" : "Order Cancelled Successfully");
            } else {
                toast.error(res?.error || "Could not cancel order");
            }
        } catch(e) { toast.error("Connection Error"); }
        finally { setProcessingId(null); }
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

    const renderItemStatus = (status: string) => {
        const safeStatus = (status || '').toLowerCase().trim();
        if (safeStatus === 'ready') return <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded uppercase tracking-widest animate-pulse border border-emerald-200 shadow-sm shrink-0">Ready</span>;
        if (safeStatus === 'served') return <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-widest flex items-center gap-1 shrink-0"><Check className="w-2.5 h-2.5"/> Served</span>;
        if (safeStatus === 'cooking') return <span className="text-[9px] font-black bg-orange-100 text-orange-700 px-2 py-0.5 rounded uppercase tracking-widest border border-orange-200 shrink-0">Cooking</span>;
        return <span className="text-[9px] font-black bg-blue-50 text-blue-500 px-2 py-0.5 rounded uppercase tracking-widest border border-blue-100 shrink-0">Pending</span>;
    };

    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto bg-[#F8FAFC] pb-[160px] md:pb-32 custom-scrollbar relative">
            
            {/* CANCEL MODAL */}
            <AnimatePresence>
                {cancelFlow && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCancelFlow(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm cursor-pointer" />
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white w-full max-w-md rounded-[2.5rem] p-6 md:p-8 shadow-2xl relative z-10 overflow-hidden transform-gpu">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center shrink-0 shadow-inner">
                                    <Trash2 className="w-6 h-6" />
                                </div>
                                <div className="pt-1">
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                                        {cancelFlow.itemId ? "Cancel Item" : "Cancel Round"}
                                    </h3>
                                    <p className="text-xs font-bold text-slate-500 mt-1">
                                        {cancelFlow.requiresReason 
                                            ? "This item is already being prepared. Cancelling it will record waste. Please provide a reason below." 
                                            : "Are you sure you want to cancel this? This action cannot be undone."}
                                    </p>
                                </div>
                            </div>

                            {cancelFlow.requiresReason && (
                                <div className="mb-6">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">Cancellation Reason *</label>
                                    <input autoFocus type="text" value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="e.g. Customer changed mind, Spilled, etc." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400 transition-all shadow-inner"/>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button onClick={() => setCancelFlow(null)} className="flex-1 py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-sm font-bold rounded-xl transition-colors border border-slate-200 shadow-sm active:scale-95">Keep It</button>
                                <button onClick={confirmCancel} disabled={cancelFlow.requiresReason && !cancelReason.trim()} className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-red-500/25 active:scale-95 flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /> Confirm Cancel</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* HEADER & TABS */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 shrink-0 gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                        <Clock className="w-7 h-7 md:w-8 md:h-8 text-emerald-600"/> Live Feed
                    </h1>
                    <p className="text-slate-500 font-medium text-xs md:text-sm mt-1 md:ml-11">Monitor kitchen status and manage orders.</p>
                </div>
                
                <div className="bg-white p-1.5 rounded-2xl flex border-2 border-slate-100 w-full md:w-auto shadow-sm overflow-x-auto no-scrollbar">
                    <button onClick={() => setFilter('active')} className={`flex-1 md:flex-none px-4 md:px-5 py-2.5 text-[10px] md:text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap ${filter === 'active' ? 'bg-emerald-50 text-emerald-700 shadow border border-emerald-100' : 'text-slate-400 hover:bg-slate-50'}`}>
                        Active <span className={`px-2 py-0.5 rounded-md ${filter === 'active' ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>{active.length}</span>
                    </button>
                    <button onClick={() => setFilter('cancelled')} className={`flex-1 md:flex-none px-4 md:px-5 py-2.5 text-[10px] md:text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap ${filter === 'cancelled' ? 'bg-red-50 text-red-600 shadow border border-red-100' : 'text-slate-400 hover:bg-slate-50'}`}>
                        Waste <span className={`px-2 py-0.5 rounded-md ${filter === 'cancelled' ? 'bg-red-200 text-red-800' : 'bg-slate-100 text-slate-500'}`}>{cancelledItems.length}</span>
                    </button>
                </div>
            </div>
            
            {/* RENDER VIEW BASED ON TAB */}
            {filter === 'active' ? (
                active.length === 0 ? (
                    <div className="h-[50vh] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-[3rem] bg-slate-50 mt-4">
                        <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100">
                            <ChefHat className="w-8 h-8 md:w-10 md:h-10 opacity-30 text-slate-500"/>
                        </div>
                        <p className="font-black text-base md:text-lg text-slate-400 uppercase tracking-widest">Kitchen Clear</p>
                        <p className="text-[10px] md:text-xs font-bold opacity-60 mt-1">No active orders right now.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        <AnimatePresence mode="popLayout">
                            {active.map((order: any) => {
                                const isServed = order.status === 'served' || order.status === 'payment_pending';
                                const isProcessing = processingId === order.id;

                                const displayItems = order.items?.filter((item: any) => {
                                    const s = (item.status || '').toLowerCase();
                                    return s !== 'cancelled' && s !== 'void' && item.qty > 0;
                                }) || [];

                                const hasReadyItems = displayItems.some((i: any) => (i.status || '').toLowerCase().trim() === 'ready');
                                const allItemsServed = displayItems.every((i: any) => ['served', 'paid', 'completed'].includes((i.status || '').toLowerCase().trim()));
                                const hasPendingItems = displayItems.some((i: any) => (i.status || '').toLowerCase().trim() === 'pending');
                                const hasCookingItems = displayItems.some((i: any) => (i.status || '').toLowerCase().trim() === 'cooking');
                                
                                // STRICT EDIT LOGIC: Only possible if there is at least one PENDING item.
                                const canEdit = hasPendingItems;
                                const isFullyPending = displayItems.every((i: any) => (i.status || '').toLowerCase().trim() === 'pending');

                                return (
                                    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key={order.id} onClick={() => onSelectOrder(order)} className={`relative bg-white p-5 md:p-6 rounded-[2rem] border shadow-sm hover:shadow-2xl transition-all cursor-pointer overflow-hidden group flex flex-col h-full min-h-[380px] ${hasReadyItems ? 'border-emerald-300 shadow-emerald-500/10' : isServed ? 'border-blue-100 opacity-95' : 'border-slate-100'}`}>
                                        
                                        {isProcessing && (
                                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-[2rem]">
                                                <div className="flex flex-col items-center gap-3">
                                                    <Loader2 className="w-8 h-8 text-emerald-600 animate-spin"/>
                                                    <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-500">Processing...</span>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {hasReadyItems && <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500 animate-pulse" />}
                                        
                                        <div className="flex justify-between items-start mb-5 shrink-0">
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Table {order.tbl}</h3>
                                                    {order.type === 'takeaway' && <span className="text-[9px] font-black bg-purple-100 text-purple-700 px-2 py-1 rounded-md border border-purple-200">TAKEAWAY</span>}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    <p className="text-[10px] font-bold text-slate-400">#{order.id.slice(-4)}</p>
                                                    <span className="text-slate-300">•</span>
                                                    <p className="text-[10px] font-bold text-slate-400">{order.time}</p>
                                                </div>
                                            </div>
                                            <span className={`px-2.5 md:px-3 py-1 md:py-1.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-wider shadow-sm border whitespace-nowrap ${hasReadyItems ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : allItemsServed ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                                {hasReadyItems ? "Action Required" : (hasCookingItems && !hasReadyItems) ? "Cooking" : order.status}
                                            </span>
                                        </div>
                                        
                                        <div className="flex-1 space-y-2 mb-6 max-h-48 overflow-y-auto custom-scrollbar pr-2 bg-slate-50/50 rounded-[1.5rem] p-3 border border-slate-100/50">
                                            {displayItems.map((item:any, i:number) => (
                                                <div key={i} className={`flex justify-between items-start text-xs md:text-sm pb-3 border-b border-dashed border-slate-200 last:border-0 last:pb-0 pt-1 ${(item.status || '').toLowerCase().trim() === 'served' ? 'opacity-50 grayscale' : ''}`}>
                                                    <div className="flex gap-2 md:gap-3 w-full pr-2 min-w-0">
                                                        <span className={`font-black w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-lg text-[10px] md:text-xs shrink-0 ${(item.status || '').toLowerCase().trim() === 'ready' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-slate-200 text-slate-600'}`}>{item.qty}</span>
                                                        <div className="flex flex-col w-full min-w-0">
                                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start w-full gap-1.5 sm:gap-2">
                                                                <span className={`font-bold leading-tight truncate pr-1 ${(item.status || '').toLowerCase().trim() === 'served' ? 'line-through text-slate-500' : 'text-slate-900'}`}>{item.name}</span>
                                                                
                                                                {/* CASHIER SPECIFIC ITEM CANCELLATION */}
                                                                <div className="flex items-center gap-1.5 shrink-0">
                                                                    {renderItemStatus(item.status)}
                                                                    {['pending', 'cooking', 'ready'].includes((item.status || '').toLowerCase().trim()) && (
                                                                        <button 
                                                                            onClick={(e) => triggerCancel(e, order, item)}
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

                                        <div className="grid grid-cols-2 gap-2 md:gap-3 mt-auto shrink-0">
                                            {hasReadyItems ? (
                                                <button onClick={(e) => handleServe(e, order)} className="col-span-2 py-3.5 md:py-4 bg-emerald-500 text-white rounded-xl font-black text-[10px] md:text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 border border-emerald-400">
                                                    <Utensils className="w-4 h-4"/> Serve Ready Items
                                                </button>
                                            ) : (
                                                <button onClick={() => onSelectOrder(order)} className="col-span-2 py-3.5 md:py-4 bg-slate-900 text-white rounded-xl font-bold text-[10px] md:text-xs flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-lg active:scale-95">
                                                    View & Pay <ArrowRight className="w-4 h-4"/>
                                                </button>
                                            )}
                                            
                                            {/* EDIT ONLY IF PENDING */}
                                            {canEdit ? (
                                                <button onClick={(e) => handleEdit(e, order)} className="py-3 bg-white text-slate-600 rounded-xl font-bold text-[10px] md:text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 border-2 border-slate-200 transition-all active:scale-95"><Edit3 className="w-3.5 h-3.5 md:w-4 md:h-4"/> Edit</button>
                                            ) : !hasReadyItems && !allItemsServed ? (
                                                <button disabled className="py-3 bg-slate-50 text-slate-400 rounded-xl font-bold text-[9px] md:text-[10px] border border-slate-100 flex items-center justify-center gap-1.5 cursor-not-allowed uppercase tracking-wider"><Lock className="w-3 h-3"/> Locked</button>
                                            ) : null}

                                            {isFullyPending && (
                                                <button onClick={(e) => triggerCancel(e, order)} className="py-3 bg-red-50 text-red-500 rounded-xl font-bold text-[10px] md:text-xs flex items-center justify-center gap-1.5 hover:bg-red-100 hover:border-red-200 border-2 border-red-100 transition-all active:scale-95"><Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4"/> Cancel</button>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )
            ) : (
                /* WAITING CANCELLED VIEW (WASTE) */
                cancelledItems.length === 0 ? (
                    <div className="h-[50vh] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-red-200/50 rounded-[3rem] bg-red-50/30 mt-4">
                        <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-red-100">
                            <Receipt className="w-8 h-8 md:w-10 md:h-10 opacity-40 text-red-500"/>
                        </div>
                        <p className="font-black text-base md:text-lg text-red-400 uppercase tracking-widest">No Waste</p>
                        <p className="text-[10px] md:text-xs font-bold text-slate-500 opacity-60 mt-1">No prepared food was cancelled in the last 24h.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 mt-4">
                        <AnimatePresence mode="popLayout">
                            {cancelledItems.map((item: any, idx: number) => {
                                const isTakeaway = item.tableName?.startsWith('TAKEAWAY');
                                const DisplayIcon = isTakeaway ? ShoppingBag : Utensils;

                                return (
                                    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key={idx} className="bg-white p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] border border-red-100 shadow-sm flex flex-col h-full hover:shadow-lg transition-all">
                                        
                                        <div className="flex items-center gap-3 md:gap-4 mb-4 pb-4 border-b border-red-50">
                                            <div className="w-10 h-10 md:w-12 md:h-12 bg-red-50 text-red-500 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 border border-red-100 shadow-inner">
                                                <DisplayIcon className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-black text-base md:text-lg text-slate-900 truncate">
                                                    {isTakeaway ? "Takeaway" : `Table ${item.tableName}`}
                                                </h4>
                                                <p className="text-[9px] md:text-[10px] font-bold text-red-500 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {item.cancelled_at ? new Date(item.cancelled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown Time'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex-1 flex flex-col">
                                            <div className="flex justify-between items-start gap-2 mb-3">
                                                <div className="flex gap-2 items-start">
                                                    <span className="font-black text-red-500 text-xs md:text-sm mt-0.5">{item.qty}x</span>
                                                    <div>
                                                        <h5 className="font-bold text-slate-900 text-xs md:text-sm leading-tight">{item.name}</h5>
                                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                                            {item.variant && <span className="text-[9px] font-bold bg-slate-50 border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded flex items-center gap-1"><Layers className="w-2.5 h-2.5"/> {item.variant}</span>}
                                                            <span className="text-[9px] font-black bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded flex items-center gap-1 uppercase tracking-wider">
                                                                Was {item.previous_status || 'Unknown'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className="font-black text-slate-400 text-xs md:text-sm shrink-0">{formatRs(item.price * item.qty)}</span>
                                            </div>

                                            <div className="mt-auto bg-red-50/50 border border-red-100 rounded-xl p-3 flex flex-col gap-1.5 shadow-inner">
                                                <div className="flex items-start gap-1.5">
                                                    <AlertCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-red-500 shrink-0 mt-0.5" />
                                                    <span className="text-[10px] md:text-xs font-bold text-red-700 leading-snug">{item.cancel_reason || 'No reason provided'}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-red-400/80 mt-1 pt-1.5 border-t border-red-200/50">
                                                    <span>By: {item.cancelled_by || 'Unknown Staff'}</span>
                                                    <span>Order #{item.orderId?.slice(-4) || 'Unknown'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )
            )}
        </div>
    )
}