"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { revalidatePath, unstable_cache, revalidateTag } from "next/cache";

// --- HELPERS ---
function getSafeId(id: string | null | undefined): number {
  return id && !isNaN(Number(id)) ? Number(id) : 5;
}

function safeParse(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : (typeof parsed === 'string' ? JSON.parse(parsed) : []);
    } catch (e) {
      console.error("JSON Parse Error:", e);
      return [];
    }
  }
  return [];
}

async function getTenantId() {
  const cookieStore = await cookies();
  const tenantCookie = cookieStore.get("gecko_tenant_id");
  const rawId = tenantCookie?.value;
  if (rawId) return getSafeId(rawId);

  const staffCookie = cookieStore.get("gecko_staff_token");
  const staffToken = staffCookie?.value;
  if (staffToken) {
      try { return getSafeId(JSON.parse(staffToken).tenant_id); } catch (e) {}
  }
  return 5; 
}

// --- 1. GET CASHIER DATA (MICRO-POLLING UPGRADE) ---
export async function getCashierData(isPolling: boolean = false) {
  const tenantId = await getTenantId();

  const getCachedCashier = unstable_cache(
    async () => {
      const today = new Date().toISOString().split('T')[0];

      try {
        const { data: tenant } = await supabaseAdmin.from("tenants").select("*").eq("id", tenantId).single();
        const { data: tables } = await supabaseAdmin.from("restaurant_tables").select("*").eq("tenant_id", tenantId).order("label", { ascending: true });
        
        // PREMIUM FIX 1: If just polling for new orders, ONLY fetch today. Saves massive bandwidth!
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const datesToFetch = isPolling ? [today] : [yesterdayStr, today];

        const { data: logs } = await supabaseAdmin
            .from("daily_order_logs")
            .select("date, orders_data, paid_history")
            .eq("tenant_id", tenantId)
            .in("date", datesToFetch);

        // PREMIUM FIX 2: Skip downloading the heavy Menu every 5 seconds!
        let optimizedMenu = null;
        if (!isPolling) {
            const { data } = await supabaseAdmin
                .from("menu_optimized")
                .select("category_name, items")
                .eq("tenant_id", tenantId);
            optimizedMenu = data;
        }

        const flatMenu: any[] = [];
        const categories: any[] = [];

        if (optimizedMenu) {
            optimizedMenu.forEach((cat: any) => {
                categories.push({ name: cat.category_name });
                const items = Array.isArray(cat.items) ? cat.items : [];
                items.forEach((item: any) => {
                     if(item.is_available !== false) { 
                         flatMenu.push({
                             id: item.id,
                             name: item.name,
                             price: item.price,
                             image_url: item.image_url,
                             category: cat.category_name,
                             description: item.description,
                             is_veg: item.is_veg,
                             variants: item.variants || [] 
                         });
                     }
                });
            });
        }

        let totalRevenue = 0;
        let pendingBills = 0;
        const tableOrderMap = new Map();
        const cancelledItemsMap = new Map(); 
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        logs?.forEach(log => {
            const activeOrders = safeParse(log.orders_data);
            const paidHistory = safeParse(log.paid_history);

            if (log.date === today) {
                paidHistory.forEach((bill: any) => {
                    if (bill.payment_method === 'Credit') {
                        totalRevenue += Number(bill.tendered || 0);
                    } else {
                        totalRevenue += Number(bill.grandTotal || 0);
                    }
                });
            }
            
            const allOrdersForWaste = [...activeOrders, ...paidHistory];
            
            allOrdersForWaste.forEach((order: any) => {
                (order.items || []).forEach((item: any) => {
                    if (item.status === 'cancelled' || item.status === 'void') {
                        if (item.previous_status === 'cooking' || item.previous_status === 'ready') {
                            if (item.cancelled_at) {
                                const cancelDate = new Date(item.cancelled_at);
                                if (cancelDate >= oneDayAgo) {
                                    const orderId = order.id || order.original_order_id || order.invoice_no || "Unknown";
                                    const uniqueKey = `${orderId}-${item.unique_id || item.id || item.name}-${item.cancelled_at}`;
                                    
                                    cancelledItemsMap.set(uniqueKey, {
                                        ...item,
                                        orderId: orderId,
                                        tableName: order.tbl || order.table_no || "Unknown"
                                    });
                                }
                            }
                        }
                    }
                });
            });

            activeOrders.forEach((order: any) => {
                if (['cancelled', 'completed', 'paid'].includes(order.status)) return;
                
                pendingBills++;
                if (order.tbl) {
                    if (tableOrderMap.has(order.tbl)) {
                        const existing = tableOrderMap.get(order.tbl);
                        existing.items = [...existing.items, ...order.items];
                        existing.total = Number(existing.total) + Number(order.total);
                    } else {
                        tableOrderMap.set(order.tbl, { ...order });
                    }
                }
            });
        });

        for (const [tbl, existing] of tableOrderMap.entries()) {
            const validItems = existing.items.filter((i:any) => !['cancelled', 'void'].includes(i.status) && i.qty > 0);
            const hasReady = validItems.some((i:any) => i.status === 'ready');
            const hasCooking = validItems.some((i:any) => ['cooking', 'pending'].includes(i.status));
            
            if (hasReady) existing.status = 'ready'; 
            else if (hasCooking) existing.status = 'cooking';
            else existing.status = 'payment_pending';
        }

        const richTables = tables?.map(t => {
          const activeOrder = tableOrderMap.get(t.label);
          let section = t.section || "Main Hall";
          if(!t.section) {
             if(t.label.includes('R')) section = "Rooftop";
             else if(t.label.includes('G')) section = "Garden";
          }
          section = section.charAt(0).toUpperCase() + section.slice(1);

          return {
            ...t,
            section,
            status: activeOrder 
                ? (['payment_pending'].includes(activeOrder.status) ? 'payment' 
                : ['served', 'ready'].includes(activeOrder.status) ? 'served' 
                : 'occupied') 
                : 'free',
            currentOrder: activeOrder || null
          };
        }) || [];

        const profile = {
          name: tenant?.settings?.profile?.name || tenant?.name,
          code: tenant?.code,
          address: tenant?.settings?.profile?.address || tenant?.address,
          phone: tenant?.settings?.profile?.phone || tenant?.phone,
          logo_url: tenant?.logo_url,
          bank_accounts: tenant?.settings?.bank_accounts || [] 
        };

        const finalCancelledItems = Array.from(cancelledItemsMap.values()).sort((a, b) => new Date(b.cancelled_at).getTime() - new Date(a.cancelled_at).getTime());

        return {
          success: true,
          restaurant: profile,
          stats: { totalRevenue, pendingBills },
          tables: richTables,
          menu: flatMenu, 
          categories: categories, 
          activeOrders: Array.from(tableOrderMap.values()).reverse(),
          cancelledItems: finalCancelledItems,
          isPolling // <--- Tells frontend if this was a micro-poll to prevent re-rendering the menu
        };
      } catch (error) {
        return { success: false, activeOrders: [], cancelledItems: [] };
      }
    },
    [`cashier-${tenantId}-${isPolling}`],
    { tags: [`orders-${tenantId}`, `tables-${tenantId}`, `menu-${tenantId}`], revalidate: 3600 }
  );

  return getCachedCashier();
}

// --- 2. CREATE ORDER ---
export async function createCashierOrder(tableId: string, items: any[], type: 'dine_in' | 'takeaway') {
    const tenantId = await getTenantId();
    const today = new Date().toISOString().split('T')[0];
    
    // --- CRITICAL FIX: SECURE METADATA FALLBACK ---
    // If the Cashier frontend fails to pass station/category payload,
    // we look it up live from the database to guarantee the Chef/Bartender OS routes it.
    const { data: menuData } = await supabaseAdmin.from("menu_optimized").select("items").eq("tenant_id", tenantId);
    const liveMenu = new Map();
    if (menuData) {
        menuData.forEach((cat: any) => {
            if (Array.isArray(cat.items)) {
                cat.items.forEach((m: any) => {
                    liveMenu.set(m.name, { ...m, category_name: cat.category_name });
                });
            }
        });
    }

    const compactItems = items.map((i: any) => {
        const dbItem = liveMenu.get(i.name) || {};
        return {
            id: i.id || dbItem.id || "", 
            unique_id: `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
            name: i.name, 
            price: i.price, 
            qty: i.qty || i.quantity || 1, 
            variant: i.variantName || i.variant || "", 
            note: i.note || i.notes || "", 
            status: "pending",
            time_added: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            
            // Secure routing fallback to database definition if client omits it!
            station: dbItem.station || i.station || i.prep_station || "kitchen",
            category: dbItem.category_name || dbItem.category || i.category || "",
            dietary: dbItem.dietary || i.dietary || ""
        };
    });
    
    const newTotal = compactItems.reduce((sum: number, item: any) => sum + (item.price * item.qty), 0);

    const { data: currentLog } = await supabaseAdmin.from("daily_order_logs").select("orders_data").eq("tenant_id", tenantId).eq("date", today).maybeSingle();
    const existingOrders = safeParse(currentLog?.orders_data);
    let orderUpdated = false;
    
    const updatedOrders = existingOrders.map((order: any) => {
        if (order.tbl === tableId && order.status === 'pending' && type === 'dine_in') {
            orderUpdated = true;
            return {
                ...order,
                items: [...order.items, ...compactItems],
                total: Number(order.total) + newTotal,
                timestamp: new Date().toISOString()
            };
        }
        return order;
    });

    let finalOrders = updatedOrders;

    if (!orderUpdated) {
        const orderId = Date.now().toString(36).toUpperCase();
        const finalTableId = type === 'takeaway' ? `TAKEAWAY-${orderId.slice(-4)}` : tableId;

        const newOrder = {
            id: orderId, tbl: finalTableId, items: compactItems, total: newTotal, status: 'pending',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            staff: "Cashier", type, timestamp: new Date().toISOString()
        };
        finalOrders = [...existingOrders, newOrder];
        
        if (type === 'dine_in') {
            await supabaseAdmin.from("restaurant_tables").update({ status: 'occupied' }).eq("label", finalTableId).eq("tenant_id", tenantId);
        }
    }

    const { error } = await supabaseAdmin.from("daily_order_logs").upsert({ 
        tenant_id: tenantId, date: today, orders_data: finalOrders 
    }, { onConflict: 'tenant_id, date' });

    if (error) return { success: false, error: error.message };

    revalidateTag(`orders-${tenantId}`, undefined as any);
    revalidateTag(`tables-${tenantId}`, undefined as any);
    revalidatePath("/staff/cashier");
    return { success: true };
}

// --- 3. CANCEL ORDER ---
export async function cancelOrder(orderId: string | number, tableLabel: string, itemIdToCancel?: string, reason?: string) {
    const tenantId = await getTenantId();
    
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    
    const datesToCheck = [
        yesterday.toISOString().split('T')[0],
        today.toISOString().split('T')[0],
        tomorrow.toISOString().split('T')[0]
    ];

    let staffName = "Cashier";
    const cookieStore = await cookies();
    try {
        const token = cookieStore.get("gecko_staff_token")?.value;
        if (token) staffName = JSON.parse(token).name;
    } catch(e) {}

    try {
        const { data: logs } = await supabaseAdmin
            .from("daily_order_logs")
            .select("date, orders_data") 
            .eq("tenant_id", tenantId)
            .in("date", datesToCheck);

        if (!logs || logs.length === 0) return { success: false, error: "No logs found" };

        const targetId = String(orderId).trim();
        let foundDate = null;
        let modifiedOrders = null;

        for (const log of logs) {
            const currentOrders = safeParse(log.orders_data);
            let found = false;

            const updatedOrders = currentOrders.map((order: any) => {
                if (String(order.id || "").trim() === targetId) {
                    
                    if (itemIdToCancel) {
                        found = true;
                        foundDate = log.date;
                        let amountToDeduct = 0;
                        let itemCancelled = false; 
                        
                        const newItems = order.items.map((i:any) => {
                            const sig = String(i.unique_id || i.id || `${i.name}||${i.variant || ''}`).trim();
                            const targetSig = String(itemIdToCancel).trim();
                            const safeStatus = (i.status || '').toLowerCase().trim();

                            if (sig === targetSig && ['pending', 'cooking', 'ready'].includes(safeStatus) && !itemCancelled) {
                                itemCancelled = true;
                                amountToDeduct += (Number(i.price) * Number(i.qty));
                                return { 
                                    ...i, 
                                    previous_status: i.status || 'pending',
                                    status: 'cancelled',
                                    cancel_reason: reason || 'No reason provided',
                                    cancelled_by: staffName,
                                    cancelled_at: new Date().toISOString()
                                };
                            }
                            return i;
                        });

                        if (!itemCancelled) {
                            found = false; 
                            return order;
                        }

                        const stillPending = newItems.some((i:any) => (i.status || '').toLowerCase().trim() === 'pending');
                        const stillCooking = newItems.some((i:any) => (i.status || '').toLowerCase().trim() === 'cooking');
                        const stillReady = newItems.some((i:any) => (i.status || '').toLowerCase().trim() === 'ready');
                        const allCancelled = newItems.every((i:any) => ['cancelled', 'void'].includes((i.status || '').toLowerCase().trim()));
                        
                        let newOrderStatus = 'payment_pending';
                        if (allCancelled) newOrderStatus = 'cancelled';
                        else if (stillReady) newOrderStatus = 'ready';
                        else if (stillCooking) newOrderStatus = 'cooking';
                        else if (stillPending) newOrderStatus = 'pending';

                        return { 
                            ...order, 
                            status: newOrderStatus,
                            items: newItems,
                            total: Math.max(0, Number(order.total) - amountToDeduct)
                        };
                    } 
                    else {
                        const isFullyPending = order.items.every((i:any) => ['pending', 'cancelled', 'void'].includes((i.status || '').toLowerCase().trim()));
                        if (isFullyPending) {
                            found = true;
                            foundDate = log.date;
                            const newItems = order.items.map((i:any) => ({ 
                                ...i, 
                                previous_status: i.status || 'pending',
                                status: 'cancelled',
                                cancel_reason: 'Round Cancelled',
                                cancelled_by: staffName,
                                cancelled_at: new Date().toISOString() 
                            }));
                            return { ...order, status: 'cancelled', items: newItems, total: 0 };
                        }
                    }
                }
                return order;
            });

            if (found) {
                modifiedOrders = updatedOrders;
                break; 
            }
        }

        if (!foundDate || !modifiedOrders) {
            return { success: false, error: "Could not cancel. Item might be already served." };
        }

        await supabaseAdmin.from("daily_order_logs").update({ orders_data: modifiedOrders }).eq("tenant_id", tenantId).eq("date", foundDate);
        
        if (!tableLabel.startsWith("TAKEAWAY")) {
            const remainingActive = modifiedOrders.some((o:any) => o.tbl === tableLabel && !['cancelled', 'paid', 'completed'].includes(o.status));
            if(!remainingActive) {
                await supabaseAdmin.from("restaurant_tables").update({ status: 'free' }).eq("label", tableLabel).eq("tenant_id", tenantId);
            }
        }

        revalidateTag(`orders-${tenantId}`, undefined as any);
        revalidateTag(`tables-${tenantId}`, undefined as any);
        revalidatePath("/staff/cashier");
        return { success: true };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// --- 4. SERVE ORDER ---
export async function serveOrder(orderId: string | number, tableLabel?: string, itemIdentifiers?: string[]) {
    const tenantId = await getTenantId();
    
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    
    const datesToCheck = [
        yesterday.toISOString().split('T')[0],
        today.toISOString().split('T')[0],
        tomorrow.toISOString().split('T')[0]
    ];

    try {
        const { data: logs } = await supabaseAdmin
            .from("daily_order_logs")
            .select("date, orders_data") 
            .eq("tenant_id", tenantId)
            .in("date", datesToCheck);

        if (!logs || logs.length === 0) return { success: false, error: "No logs found" };

        const targetId = String(orderId).trim();
        const targetTable = tableLabel ? String(tableLabel).trim() : "";
        
        let foundDate = null;
        let modifiedOrders = null;

        const stringIdentifiers = (itemIdentifiers || []).map(id => String(id).trim());

        for (const log of logs) {
            const currentOrders = safeParse(log.orders_data);
            let found = false;

            const updatedOrders = currentOrders.map((order: any) => {
                const currentOrderId = String(order.id || "").trim();
                const currentTable = String(order.tbl || "").trim();

                const isMatch = currentOrderId === targetId || (targetTable && currentTable === targetTable && (order.status === 'ready' || order.status === 'cooking'));

                if (isMatch) {
                    found = true;
                    foundDate = log.date; 
                    
                    let itemsStillPendingOrCooking = false;
                    let itemsStillReady = false;

                    const updatedItems = (order.items || []).map((i: any) => {
                        const safeStatus = (i.status || '').toLowerCase().trim();

                        if (stringIdentifiers.length > 0) {
                            const sig = String(i.unique_id || i.id || `${i.name}||${i.variant || ''}`).trim();
                            const isItemMatch = stringIdentifiers.includes(sig);

                            if (isItemMatch && safeStatus === 'ready') {
                                return { ...i, status: 'served' };
                            }
                        } 
                        else if (safeStatus === 'ready') {
                            return { ...i, status: 'served' };
                        }

                        if (['pending', 'cooking'].includes(safeStatus)) itemsStillPendingOrCooking = true;
                        if (safeStatus === 'ready') itemsStillReady = true;

                        return i;
                    });

                    let newOrderStatus = 'payment_pending'; 
                    if (itemsStillReady) newOrderStatus = 'ready';
                    else if (itemsStillPendingOrCooking) newOrderStatus = 'cooking';

                    return { ...order, status: newOrderStatus, items: updatedItems };
                }
                return order;
            });

            if (found) {
                modifiedOrders = updatedOrders;
                break; 
            }
        }

        if (!foundDate || !modifiedOrders) {
            return { success: false, error: "Order not found" };
        }

        const { error } = await supabaseAdmin
            .from("daily_order_logs")
            .update({ orders_data: modifiedOrders })
            .eq("tenant_id", tenantId)
            .eq("date", foundDate); 

        if (error) {
            return { success: false, error: error.message };
        }

        revalidateTag(`orders-${tenantId}`, undefined as any);
        revalidateTag(`tables-${tenantId}`, undefined as any);
        revalidatePath("/staff/cashier");
        return { success: true };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// --- 5. FINALIZE (Checkout) WITH DOUBLE ENTRY LOCK ---
export async function finalizeTransaction(tableId: string, orderId: string, paymentMethod: string, paymentDetails: any, tenantInfo: any, customerDetails?: any) {
    const tenantId = await getTenantId();
    const today = new Date().toISOString().split('T')[0];
    
    const { data: log } = await supabaseAdmin.from("daily_order_logs").select("orders_data, paid_history").eq("tenant_id", tenantId).eq("date", today).maybeSingle();
    if (!log) return { success: false, error: "Log not found" };

    const currentOrders = safeParse(log.orders_data);
    const currentHistory = safeParse(log.paid_history);

    // --- ABSOLUTE DOUBLE-ENTRY LOCK ---
    // If the orderId is already inside paid_history, kill the request instantly.
    const isAlreadyPaid = currentHistory.some((h: any) => String(h.original_order_id).trim() === String(orderId).trim());
    if (isAlreadyPaid) {
        return { success: false, error: "Order already checked out! Prevented double-entry." };
    }

    const remainingOrders: any[] = [];
    const consolidatedItems: any[] = [];
    let found = false;
    let itemsToDeductFromInventory: any[] = [];
    let servedBySet = new Set<string>();

    currentOrders.forEach((order: any) => {
        // MATCH BY TABLE OR BY ORDER ID to catch ALL parts of the order separated by kitchen sends
        const isTarget = !['cancelled', 'completed', 'paid'].includes(order.status) && 
             (String(order.tbl).trim() === String(tableId).trim() || String(order.id).trim() === String(orderId).trim());

        if (isTarget) {
            found = true;
            if (order.staff) servedBySet.add(order.staff);
            
            // Collect all items from every split order on this table
            (order.items || []).forEach((item: any) => {
                consolidatedItems.push(item);
                if (!['cancelled', 'void'].includes((item.status || '').toLowerCase().trim())) {
                    itemsToDeductFromInventory.push(item);
                }
            });
        } else {
            remainingOrders.push(order);
        }
    });

    if(!found) return { success: false, error: "Order not found or already checked out." };

    const displayBillNo = String(orderId).slice(-6).toUpperCase();
    const servedByValue = Array.from(servedBySet).join(', ') || "Cashier";

    const newHistoryItems = [{
        invoice_no: displayBillNo,
        bill_no: displayBillNo, 
        date: new Date().toISOString(),
        table_no: tableId,
        restaurant_name: tenantInfo?.name,
        items: consolidatedItems,
        subTotal: paymentDetails.subTotal || 0,
        discount: paymentDetails.discount || 0,
        grandTotal: paymentDetails.grandTotal || 0, 
        tendered: paymentDetails.tendered || 0,
        change: paymentDetails.change || 0,
        credit_due: paymentDetails.creditDue || 0, 
        payment_method: paymentMethod, // retained for backward compatibility
        splits: paymentDetails.splits || [], // multi-payment breakdown (Cash: 400, FonePay: 200)
        served_by: servedByValue,
        paid_at: new Date().toISOString(),
        original_order_id: orderId,
        customer_name: customerDetails?.name || "",
        customer_address: customerDetails?.address || ""
    }];

    // --- EXACT INVENTORY SYNC (RUNS AT CHECKOUT) ---
    try {
        if (itemsToDeductFromInventory.length > 0) {
            const { data: inventoryItems } = await supabaseAdmin
                .from("inventory")
                .select("id, name, stock, quantity, linked_menu_item, base_unit, volume_per_unit")
                .eq("tenant_id", tenantId);

            if (inventoryItems && inventoryItems.length > 0) {
                const superClean = (str: string) => String(str).toLowerCase().replace(/[^a-z0-9]/g, '');

                for (const cartItem of itemsToDeductFromInventory) {
                    const rawName = cartItem.name || cartItem.n || "";
                    const rawQty = Number(cartItem.qty || cartItem.q || 1);
                    const cartClean = superClean(rawName);
                    
                    const stockItem = inventoryItems.find(i => {
                        const invClean = superClean(i.name);
                        const linkedClean = i.linked_menu_item ? superClean(i.linked_menu_item) : "";
                        return invClean === cartClean || 
                               (linkedClean !== "" && linkedClean === cartClean) ||
                               (linkedClean !== "" && cartClean.includes(linkedClean)) ||
                               (invClean !== "" && cartClean.includes(invClean));
                    });
                    
                    if (stockItem) {
                        const deductionAmount = rawQty * Number(stockItem.volume_per_unit || 1);
                        const currentStock = stockItem.stock !== undefined ? stockItem.stock : (stockItem.quantity || 0);
                        const newStock = Math.max(0, Number(currentStock) - deductionAmount);
                        
                        await supabaseAdmin.from("inventory")
                            .update({ stock: newStock, quantity: newStock })
                            .eq("id", stockItem.id);
                    }
                }
            }
        }
    } catch (invError) {
        console.error("Inventory Sync Error:", invError);
    }
    // --- END INVENTORY SYNC ---

    await supabaseAdmin.from("daily_order_logs").update({ 
        orders_data: remainingOrders, 
        paid_history: [...currentHistory, ...newHistoryItems] 
    }).eq("tenant_id", tenantId).eq("date", today);

    if (!tableId.startsWith("TAKEAWAY")) {
        await supabaseAdmin.from("restaurant_tables").update({ status: 'free' }).eq("label", tableId).eq("tenant_id", tenantId);
    }
    
    revalidateTag(`orders-${tenantId}`, undefined as any);
    revalidateTag(`tables-${tenantId}`, undefined as any);
    revalidatePath("/staff/cashier");
    revalidatePath("/admin/inventory");
    return { success: true };
}

// --- 6. SETTINGS ---
export async function updateStoreSettings(profile: any, accounts: any[]) {
    const tenantId = await getTenantId();
    const { data: tenant } = await supabaseAdmin.from("tenants").select("settings").eq("id", tenantId).single();
    await supabaseAdmin.from("tenants").update({ settings: { ...(tenant?.settings || {}), profile, bank_accounts: accounts } }).eq("id", tenantId);
    revalidateTag(`orders-${tenantId}`, undefined as any);
    revalidatePath("/staff/cashier");
    return { success: true };
}

// --- 7. REPORTS & CREDIT ACCOUNTS ---
export async function getCashierReports(days: number) {
    const tenantId = await getTenantId();
    const startDate = new Date(); startDate.setDate(startDate.getDate() - days);
    const startStr = startDate.toISOString().split('T')[0];

    try {
        const { data: logs } = await supabaseAdmin.from("daily_order_logs").select("*").eq("tenant_id", tenantId).gte("date", startStr).order("date", { ascending: true });
        if (!logs) return { success: true, bills: [], summary: {}, chartData: [] };

        const allBills: any[] = [];
        const summary: any = { total: 0, count: 0, byMethod: {}, byStaff: {}, creditAccounts: {} };
        const chartData: any[] = [];

        logs.forEach((log: any) => {
            const history = safeParse(log.paid_history);
            let dailyTotal = 0;
            history.forEach((bill: any) => {
                if(bill && bill.grandTotal !== undefined) {
                    allBills.push(bill);
                    const amt = Number(bill.grandTotal);
                    const tendered = Number(bill.tendered) || 0;
                    
                    // --- MULTI-PAYMENT ENGINE SUPPORT ---
                    let actualRevenue = 0;
                    
                    if (bill.splits && Array.isArray(bill.splits) && bill.splits.length > 0) {
                        // If it's a split payment, we sum the exact fractions
                        bill.splits.forEach((split: any) => {
                            const splitAmt = Number(split.amount) || 0;
                            const splitMethod = split.method || "Cash";
                            
                            // For credit within a split, the amount received is technically 0 upfront, but 'amount' represents the split fraction.
                            // However, actual revenue collected today for the 'Credit' part is 0. 
                            const collectedSplit = splitMethod === 'Credit' ? 0 : splitAmt;
                            
                            actualRevenue += collectedSplit;
                            
                            if (summary.byMethod[splitMethod]) summary.byMethod[splitMethod] += collectedSplit; 
                            else summary.byMethod[splitMethod] = collectedSplit;
                        });
                        
                        // Also track advance received for Credit explicitly if provided in splits
                        const creditSplit = bill.splits.find((s:any) => s.method === 'Credit');
                        if (creditSplit) {
                           // If there's an advance on the credit account specifically, we'll factor the tendered.
                           // Actually, split validation ensures exact sum matches.
                        }

                    } else {
                        // Legacy single-payment handling
                        const method = bill.payment_method || "Cash";
                        actualRevenue = method === 'Credit' ? tendered : amt;
                        
                        if(summary.byMethod[method]) summary.byMethod[method] += actualRevenue; 
                        else summary.byMethod[method] = actualRevenue;
                    }

                    dailyTotal += actualRevenue;
                    summary.total += actualRevenue;
                    summary.count++;
                    
                    const staff = bill.served_by || "Cashier";
                    if(summary.byStaff[staff]) summary.byStaff[staff] += actualRevenue; else summary.byStaff[staff] = actualRevenue;

                    const method = bill.payment_method || "Cash"; // Needed below for credit tracking

                    if (method === 'Credit') {
                        const rawName = (bill.customer_name || "Unknown Customer").trim();
                        const cName = rawName.toUpperCase(); 
                        
                        const amountOwedOnThisBill = bill.credit_due !== undefined ? Number(bill.credit_due) : Math.max(0, amt - tendered);
                        
                        if (!summary.creditAccounts[cName]) {
                            summary.creditAccounts[cName] = { displayName: rawName, total: 0, bills: [], phone: bill.customer_address || "" };
                        }
                        
                        summary.creditAccounts[cName].total += amountOwedOnThisBill;
                        summary.creditAccounts[cName].bills.push({ ...bill, due_amount: amountOwedOnThisBill });
                    }
                }
            });
            chartData.push({ label: log.date, value: dailyTotal });
        });
        return { success: true, bills: allBills.reverse(), summary, chartData };
    } catch (e) { return { success: false }; }
}

// --- 8. PROCESS CREDIT / KHATA PAYMENTS ---
export async function processCreditPayment(customerName: string, amountToPay: number) {
    const tenantId = await getTenantId();
    let remainingPayment = Number(amountToPay);
    
    const startDate = new Date(); startDate.setDate(startDate.getDate() - 60);
    const startStr = startDate.toISOString().split('T')[0];

    try {
        const { data: logs, error: fetchErr } = await supabaseAdmin.from("daily_order_logs")
            .select("date, paid_history").eq("tenant_id", tenantId).gte("date", startStr).order("date", { ascending: true });

        if (fetchErr || !logs) return { success: false, error: fetchErr?.message || "No records found" };

        let totalUpdated = 0;
        const targetName = customerName.trim().toUpperCase();
        
        for (const log of logs) {
            if (remainingPayment <= 0) break;

            const history = safeParse(log.paid_history);
            let logModified = false;

            const newHistory = history.map((bill: any) => {
                if (remainingPayment <= 0) return bill;
                
                const method = bill.payment_method || "";
                const cName = (bill.customer_name || "").trim().toUpperCase();
                
                if (method === 'Credit' && cName === targetName) {
                    const grandTotal = Number(bill.grandTotal) || 0;
                    const previouslyTendered = Number(bill.tendered) || 0;
                    const currentDue = bill.credit_due !== undefined ? Number(bill.credit_due) : Math.max(0, grandTotal - previouslyTendered);
                    
                    if (currentDue > 0) {
                        const deductAmt = Math.min(currentDue, remainingPayment);
                        remainingPayment -= deductAmt;
                        logModified = true;
                        totalUpdated += deductAmt;

                        return { ...bill, tendered: previouslyTendered + deductAmt, credit_due: currentDue - deductAmt };
                    }
                }
                return bill;
            });

            if (logModified) {
                const { error: updateErr } = await supabaseAdmin.from("daily_order_logs")
                    .update({ paid_history: newHistory })
                    .eq("tenant_id", tenantId)
                    .eq("date", log.date); 
                    
                if (updateErr) throw new Error(updateErr.message);
            }
        }

        if (totalUpdated === 0) {
            return { success: false, error: "No outstanding balance found to clear for this customer." };
        }

        revalidateTag(`orders-${tenantId}`, undefined as any);
        revalidatePath("/staff/cashier");
        return { success: true, amountCleared: totalUpdated };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}