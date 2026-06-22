"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { revalidatePath, unstable_cache, revalidateTag } from "next/cache";
import { getKathmanduDateString, getBusinessDate } from "@/lib/utils";
import { getActiveBusinessDate, getPreviousDateString, getNextDateString } from "@/app/actions/business-date";

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

  let currentStaffRole = "cashier"; 
  let currentStaffName = "Team";
  try {
      const cookieStore = await cookies();
      const staffCookie = cookieStore.get("gecko_staff_token");
      if (staffCookie?.value) {
          const tokenData = JSON.parse(staffCookie.value);
          currentStaffRole = tokenData.role || "cashier";
          currentStaffName = tokenData.name || "Team";
      }
  } catch (e) {}

  const today = await getActiveBusinessDate(tenantId);

  try {
    let tenant = null;
    if (!isPolling) {
      const { data } = await supabaseAdmin.from("tenants").select("*").eq("id", tenantId).single();
      tenant = data;
    }
    const { data: tables } = await supabaseAdmin.from("restaurant_tables").select("*").eq("tenant_id", tenantId).order("label", { ascending: true });
    
    const yesterdayStr = await getPreviousDateString(today);
    // ALWAYS fetch both yesterday and today's logs so that active/unpaid orders from yesterday do not disappear during polling.
    const datesToFetch = [yesterdayStr, today];

    const { data: logs } = await supabaseAdmin
        .from("daily_order_logs")
        .select("date, orders_data, paid_history")
        .eq("tenant_id", tenantId)
        .in("date", datesToFetch);

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
                if (bill.splits && Array.isArray(bill.splits) && bill.splits.length > 0) {
                    let collected = 0;
                    bill.splits.forEach((s: any) => {
                        if (s.method !== 'Credit') {
                            collected += Number(s.amount || 0);
                        }
                    });
                    totalRevenue += collected;
                } else if (bill.payment_method === 'Credit') {
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
            if (order.id === "DAY_CLOSE_META") return;
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
        const hasCooking = validItems.some((i:any) => ['cooking', 'preparing'].includes(i.status));
        const hasPending = validItems.some((i:any) => i.status === 'pending');
        const allServed = validItems.length > 0 && validItems.every((i:any) => i.status === 'served');
        
        if (allServed) existing.status = 'payment_pending';
        else if (hasReady) existing.status = 'ready'; 
        else if (hasCooking) existing.status = 'cooking';
        else if (hasPending) existing.status = 'pending';
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

    const profile = tenant ? {
      name: tenant?.settings?.profile?.name || tenant?.name,
      code: tenant?.code,
      address: tenant?.settings?.profile?.address || tenant?.address,
      phone: tenant?.settings?.profile?.phone || tenant?.phone,
      logo_url: tenant?.logo_url,
      bank_accounts: tenant?.settings?.bank_accounts || [] 
    } : null;

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
      isPolling,
      staff: { name: currentStaffName, role: currentStaffRole },
      businessDate: today
    };
  } catch (error) {
    return { 
      success: false, 
      activeOrders: [], 
      cancelledItems: [], 
      staff: { name: currentStaffName, role: currentStaffRole } 
    };
  }
}

// --- 2. CREATE ORDER ---
export async function createCashierOrder(tableId: string, items: any[], type: 'dine_in' | 'takeaway') {
    const tenantId = await getTenantId();
    const today = await getActiveBusinessDate(tenantId);
    
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
            time_added: new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kathmandu', hour: '2-digit', minute: '2-digit' }),
            
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
            time: new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kathmandu', hour: '2-digit', minute: '2-digit' }),
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
    
    const activeToday = await getActiveBusinessDate(tenantId);
    const datesToCheck = [
        await getPreviousDateString(activeToday),
        activeToday,
        await getNextDateString(activeToday)
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
        const itemsToRestore: any[] = [];

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

                            if (sig === targetSig && ['pending', 'cooking', 'ready', 'served'].includes(safeStatus) && !itemCancelled) {
                                itemCancelled = true;
                                amountToDeduct += (Number(i.price) * Number(i.qty));
                                if (safeStatus === 'served') {
                                    itemsToRestore.push(i);
                                }
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
                        const isFullyCancellable = order.items.every((i:any) => ['pending', 'cancelled', 'void', 'served', 'ready', 'cooking'].includes((i.status || '').toLowerCase().trim()));
                        if (isFullyCancellable) {
                            found = true;
                            foundDate = log.date;
                            const newItems = order.items.map((i:any) => {
                                const safeStatus = (i.status || '').toLowerCase().trim();
                                if (safeStatus === 'served') {
                                    itemsToRestore.push(i);
                                }
                                return { 
                                    ...i, 
                                    previous_status: i.status || 'pending',
                                    status: 'cancelled',
                                    cancel_reason: 'Round Cancelled',
                                    cancelled_by: staffName,
                                    cancelled_at: new Date().toISOString() 
                                };
                            });
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
            return { success: false, error: "Could not cancel. Order might have completed status." };
        }

        if (itemsToRestore.length > 0) {
            await restoreInventoryStock(tenantId, itemsToRestore);
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
        revalidateTag(`inventory-${tenantId}`, undefined as any);
        revalidatePath("/staff/cashier");
        return { success: true };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// --- 4. SERVE ORDER ---
export async function serveOrder(orderId: string | number, tableLabel?: string, itemIdentifiers?: string[]) {
    const tenantId = await getTenantId();
    
    const activeToday = await getActiveBusinessDate(tenantId);
    const datesToCheck = [
        await getPreviousDateString(activeToday),
        activeToday,
        await getNextDateString(activeToday)
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
        let itemsToDeductFromInventory: any[] = []; // Tracks items newly marked as served

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

                            if (isItemMatch && ['pending', 'cooking', 'preparing', 'ready'].includes(safeStatus)) {
                                itemsToDeductFromInventory.push(i);
                                return { ...i, status: 'served' };
                            }
                        } 
                        else if (['pending', 'cooking', 'preparing', 'ready'].includes(safeStatus)) {
                            itemsToDeductFromInventory.push(i);
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

        // --- INVENTORY SYNC FOR STAFF/CASHIER SERVED DISHES ---
        if (itemsToDeductFromInventory.length > 0) {
            try {
                const { data: inventoryItems } = await supabaseAdmin
                    .from("inventory")
                    .select("id, name, stock, quantity, linked_menu_item, base_unit, volume_per_unit")
                    .eq("tenant_id", tenantId);

                if (inventoryItems && inventoryItems.length > 0) {
                    const superClean = (str: string) => String(str).toLowerCase().replace(/[^a-z0-9]/g, '');

                    for (const servedItem of itemsToDeductFromInventory) {
                        const rawName = servedItem.name || servedItem.n || "";
                        const rawQty = Number(servedItem.qty || servedItem.q || 1);
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
            } catch (invError) {
                console.error("Inventory Sync Error:", invError);
            }
        }
        // --- END INVENTORY SYNC ---

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
        revalidateTag(`inventory-${tenantId}`, undefined as any);
        revalidatePath("/staff/cashier");
        return { success: true };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// --- 4.5 VERIFY MANAGER PIN (DISCOUNT OVERRIDE) ---
export async function verifyManagerPIN(pin: string) {
    const tenantId = await getTenantId();
    try {
        const { data: staff } = await supabaseAdmin
            .from("staff")
            .select("role, full_name")
            .eq("tenant_id", tenantId)
            .eq("pin_code", pin)
            .in("role", ["manager", "admin", "super_admin"])
            .eq("status", "active")
            .maybeSingle();
            
        if (!staff) {
            return { success: false, error: "Incorrect or unauthorized PIN." };
        }
        
        return { success: true, role: staff.role, name: staff.full_name };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// --- 5. FINALIZE (Checkout) WITH DOUBLE ENTRY LOCK ---
export async function finalizeTransaction(tableId: string, orderId: string, paymentMethod: string, paymentDetails: any, tenantInfo: any, customerDetails?: any) {
    const tenantId = await getTenantId();
    const activeToday = await getActiveBusinessDate(tenantId);
    const datesToCheck = [
        await getPreviousDateString(activeToday),
        activeToday,
        await getNextDateString(activeToday)
    ];

    const { data: logs } = await supabaseAdmin
        .from("daily_order_logs")
        .select("date, orders_data, paid_history")
        .eq("tenant_id", tenantId)
        .in("date", datesToCheck);

    if (!logs || logs.length === 0) return { success: false, error: "Log not found" };

    let foundLog = null;
    let foundOrder = null;

    for (const log of logs) {
        const currentOrders = safeParse(log.orders_data);
        const hasOrder = currentOrders.some((order: any) => 
             !['cancelled', 'completed', 'paid'].includes(order.status) && 
             (String(order.tbl).trim() === String(tableId).trim() || String(order.id).trim() === String(orderId).trim())
        );
        if (hasOrder) {
            foundLog = log;
            break;
        }
    }

    if (!foundLog) return { success: false, error: "Order not found or already checked out." };
    const today = foundLog.date;
    const log = foundLog;

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
    let orderBusinessDate = today;

    currentOrders.forEach((order: any) => {
        // MATCH BY TABLE OR BY ORDER ID to catch ALL parts of the order separated by kitchen sends
        const isTarget = !['cancelled', 'completed', 'paid'].includes(order.status) && 
             (String(order.tbl).trim() === String(tableId).trim() || String(order.id).trim() === String(orderId).trim());

        if (isTarget) {
            found = true;
            if (order.businessDate) {
                orderBusinessDate = order.businessDate;
            }
            if (order.staff) servedBySet.add(order.staff);
            
            // Collect all items from every split order on this table
            (order.items || []).forEach((item: any) => {
                consolidatedItems.push(item);
                const iStatus = (item.status || '').toLowerCase().trim();
                // CRITICAL FIX: Skip 'served' items because they were already deducted from inventory when marked 'served'!
                if (!['cancelled', 'void', 'served'].includes(iStatus)) {
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
        businessDate: orderBusinessDate,
        table_no: tableId,
        restaurant_name: tenantInfo?.name,
        items: consolidatedItems,
        subTotal: paymentDetails.subTotal || 0,
        discount: paymentDetails.discount || 0,
        discount_type: paymentDetails.discountType || "",
        discount_value: paymentDetails.discountValue || 0,
        discount_reason: paymentDetails.discountReason || "",
        discount_authorized_by: paymentDetails.discountAuthorizedBy || "",
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
        customer_address: customerDetails?.address || "",
        createdAt: new Date().toISOString(),
        serverTimestamp: Date.now()
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
    revalidateTag(`inventory-${tenantId}`, undefined as any);
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
    const activeToday = await getActiveBusinessDate(tenantId);
    const startStr = getKathmanduDateString(new Date(new Date(activeToday).getTime() - days * 24 * 60 * 60 * 1000));

    try {
        const { data: logs } = await supabaseAdmin.from("daily_order_logs").select("*").eq("tenant_id", tenantId).gte("date", startStr).order("date", { ascending: true });
        if (!logs) return { success: true, bills: [], summary: {}, chartData: [] };

        const allBills: any[] = [];
        const summary: any = { 
            total: 0, 
            count: 0, 
            byMethod: {}, 
            byStaff: {}, 
            creditAccounts: {},
            creditReceived: 0,
            creditReceivedByMethod: {},
            totalPendingOrders: 0,
            totalExpiredOrders: 0,
            unclearedPaymentAmount: 0,
            pendingOrdersDetails: []
        };
        const dailyTotalsMap: { [dateStr: string]: number } = {};

        logs.forEach((log: any) => {
            if (!dailyTotalsMap[log.date]) dailyTotalsMap[log.date] = 0;
            
            const activeOrders = safeParse(log.orders_data);
            activeOrders.forEach((o: any) => {
                if (o.id === "DAY_CLOSE_META") return;
                const s = (o.status || '').toLowerCase().trim();
                if (!['cancelled', 'paid', 'completed', 'expired'].includes(s)) {
                    summary.totalPendingOrders++;
                    summary.unclearedPaymentAmount += Number(o.total || 0);
                    summary.pendingOrdersDetails.push({
                        id: o.id,
                        tbl: o.tbl,
                        total: o.total,
                        staff: o.staff || "Unknown",
                        status: o.status,
                        time: o.time
                    });
                } else if (s === 'expired') {
                    summary.totalExpiredOrders++;
                }
            });
            
            const history = safeParse(log.paid_history);
            history.forEach((bill: any) => {
                if(bill && bill.grandTotal !== undefined) {
                    allBills.push({
                        ...bill,
                        businessDate: log.date
                    });
                    const amt = Number(bill.grandTotal);
                    const tendered = Number(bill.tendered) || 0;
                    const method = bill.payment_method || "Cash";
                    
                    // --- MULTI-PAYMENT ENGINE SUPPORT ---
                    let upfrontRevenue = 0;
                    
                    let safeSplits = bill.splits;
                    if (typeof safeSplits === 'string') {
                        try { safeSplits = JSON.parse(safeSplits); } catch(e) { safeSplits = []; }
                    }
                    
                    if (safeSplits && Array.isArray(safeSplits) && safeSplits.length > 0) {
                        const creditAmt = bill.credit_due !== undefined ? Number(bill.credit_due) : 0;
                        const paidAmt = Math.max(0, amt - creditAmt);
                        
                        const nonCreditSplits = safeSplits.filter((s: any) => s.method !== 'Credit');
                        const totalNonCreditSplits = nonCreditSplits.reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0);
                        
                        if (creditAmt > 0) {
                            summary.byMethod['Credit'] = (summary.byMethod['Credit'] || 0) + creditAmt;
                        }
                        
                        if (nonCreditSplits.length > 0) {
                            nonCreditSplits.forEach((s: any) => {
                                const sAmt = Number(s.amount) || 0;
                                const share = totalNonCreditSplits > 0 ? (sAmt / totalNonCreditSplits) : 0;
                                const allocated = paidAmt * share;
                                summary.byMethod[s.method] = (summary.byMethod[s.method] || 0) + allocated;
                            });
                        } else if (paidAmt > 0) {
                            summary.byMethod['Cash'] = (summary.byMethod['Cash'] || 0) + paidAmt;
                        }
                        
                        // upfrontRevenue is only the non-credit upfront portion
                        let upfrontSplitsAmt = 0;
                        safeSplits.forEach((s: any) => {
                            if (s.method !== 'Credit') {
                                upfrontSplitsAmt += (Number(s.amount) || 0);
                            }
                        });
                        if (bill.credit_payments && Array.isArray(bill.credit_payments)) {
                            const totalPaidLater = bill.credit_payments.reduce((sum: number, p: any) => sum + p.amount, 0);
                            upfrontRevenue = Math.max(0, upfrontSplitsAmt - totalPaidLater);
                        } else {
                            upfrontRevenue = upfrontSplitsAmt;
                        }
                    } else if (method === 'Credit') {
                        const creditAmt = bill.credit_due !== undefined ? Number(bill.credit_due) : 0;
                        const paidAmt = Math.max(0, amt - creditAmt);
                        
                        if (creditAmt > 0) {
                            summary.byMethod['Credit'] = (summary.byMethod['Credit'] || 0) + creditAmt;
                        }
                        if (paidAmt > 0) {
                            summary.byMethod['Cash'] = (summary.byMethod['Cash'] || 0) + paidAmt;
                        }
                        
                        let upfrontTendered = tendered;
                        if (bill.credit_payments && Array.isArray(bill.credit_payments)) {
                            const totalPaidLater = bill.credit_payments.reduce((sum: number, p: any) => sum + p.amount, 0);
                            upfrontTendered = Math.max(0, tendered - totalPaidLater);
                        }
                        upfrontRevenue = upfrontTendered;
                    } else {
                        if(summary.byMethod[method]) summary.byMethod[method] += upfrontRevenue; 
                        else summary.byMethod[method] = upfrontRevenue;
                    }

                    dailyTotalsMap[log.date] += upfrontRevenue;
                    summary.total += upfrontRevenue;
                    summary.count++;
                    
                    const staff = bill.served_by || "Cashier";
                    if(summary.byStaff[staff]) summary.byStaff[staff] += upfrontRevenue; else summary.byStaff[staff] = upfrontRevenue;

                    // --- AUDIT CREDIT PAYMENTS (KHATA COLLECTION TODAY) ---
                    if (bill.credit_payments && Array.isArray(bill.credit_payments)) {
                        bill.credit_payments.forEach((p: any) => {
                            const pAmt = Number(p.amount) || 0;
                            const pMethod = p.method || "Cash";
                            const pDateStr = p.business_date || getBusinessDate(p.date);

                            // Track in the summary
                            summary.creditReceived += pAmt;
                            summary.creditReceivedByMethod[pMethod] = (summary.creditReceivedByMethod[pMethod] || 0) + pAmt;
                            
                            summary.total += pAmt;
                            
                            // ONLY add to summary.byMethod and summary.byStaff if the bill date is outside the fetched range
                            const billBS = bill.date.split('T')[0];
                            if (billBS < startStr) {
                                if (summary.byMethod[pMethod]) summary.byMethod[pMethod] += pAmt;
                                else summary.byMethod[pMethod] = pAmt;

                                if (summary.byStaff[staff]) summary.byStaff[staff] += pAmt;
                                else summary.byStaff[staff] = pAmt;
                            }

                            // Add to payment date's daily total
                            if (!dailyTotalsMap[pDateStr]) dailyTotalsMap[pDateStr] = 0;
                            dailyTotalsMap[pDateStr] += pAmt;
                        });
                    }

                    // method is already defined at the top of the loop
                    const amountOwedOnThisBill = bill.credit_due !== undefined ? Number(bill.credit_due) : (method === 'Credit' ? Math.max(0, amt - tendered) : 0);

                    if (method === 'Credit' || amountOwedOnThisBill > 0) {
                        const rawName = (bill.customer_name || "Unknown Customer").trim();
                        const cName = rawName.toUpperCase(); 
                        
                        if (!summary.creditAccounts[cName]) {
                            summary.creditAccounts[cName] = { displayName: rawName, total: 0, bills: [], phone: bill.customer_address || "" };
                        }
                        
                        summary.creditAccounts[cName].total += amountOwedOnThisBill;
                        summary.creditAccounts[cName].bills.push({ ...bill, due_amount: amountOwedOnThisBill });
                    }
                }
            });
        });

        // Convert the dailyTotalsMap into chartData
        const chartData = Object.entries(dailyTotalsMap)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, value]) => ({ label: date, value }));

        return { success: true, bills: allBills.reverse(), summary, chartData, businessDate: activeToday };
    } catch (e) { return { success: false }; }
}

export async function processCreditPayment(customerName: string, amountToPay: number, paymentMethod: string = "Cash") {
    const tenantId = await getTenantId();
    const activeToday = await getActiveBusinessDate(tenantId);
    let remainingPayment = Number(amountToPay);
    
    const startStr = getKathmanduDateString(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000));

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
                const grandTotal = Number(bill.grandTotal) || 0;
                const previouslyTendered = Number(bill.tendered) || 0;
                const currentDue = bill.credit_due !== undefined ? Number(bill.credit_due) : (method === 'Credit' ? Math.max(0, grandTotal - previouslyTendered) : 0);
                const cName = (bill.customer_name || "").trim().toUpperCase();
                
                if ((method === 'Credit' || currentDue > 0) && cName === targetName) {
                    if (currentDue > 0) {
                        const deductAmt = Math.min(currentDue, remainingPayment);
                        remainingPayment -= deductAmt;
                        logModified = true;
                        totalUpdated += deductAmt;

                        // Parse existing splits or create them
                        let splits = bill.splits;
                        if (typeof splits === 'string') {
                            try { splits = JSON.parse(splits); } catch(e) { splits = []; }
                        }
                        if (!splits || !Array.isArray(splits)) {
                            splits = [];
                        }

                        if (splits.length === 0) {
                            if (previouslyTendered > 0) {
                                splits.push({ method: 'Cash', amount: previouslyTendered });
                            }
                            splits.push({ method: 'Credit', amount: currentDue });
                        }

                        // Deduct from the 'Credit' split
                        let creditSplit = splits.find((s: any) => s.method === 'Credit');
                        if (!creditSplit) {
                            creditSplit = { method: 'Credit', amount: currentDue };
                            splits.push(creditSplit);
                        }
                        creditSplit.amount = Math.max(0, Number(creditSplit.amount) - deductAmt);

                        // Keep splits clean by filtering out 0 Credit
                        if (creditSplit.amount <= 0) {
                            splits = splits.filter((s: any) => s.method !== 'Credit');
                        }

                        // Add or merge paymentMethod split
                        let paySplit = splits.find((s: any) => s.method === paymentMethod);
                        if (paySplit) {
                            paySplit.amount = Number(paySplit.amount) + deductAmt;
                        } else {
                            splits.push({ method: paymentMethod, amount: deductAmt });
                        }

                        // Log audit list of credit payments
                        let creditPayments = bill.credit_payments;
                        if (typeof creditPayments === 'string') {
                            try { creditPayments = JSON.parse(creditPayments); } catch(e) { creditPayments = []; }
                        }
                        if (!creditPayments || !Array.isArray(creditPayments)) {
                            creditPayments = [];
                        }
                        creditPayments.push({
                            date: new Date().toISOString(),
                            business_date: activeToday,
                            amount: deductAmt,
                            method: paymentMethod
                        });

                        return { 
                            ...bill, 
                            tendered: previouslyTendered + deductAmt, 
                            credit_due: currentDue - deductAmt,
                            splits: splits,
                            credit_payments: creditPayments
                        };
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

export async function processCreditBillPayment(invoiceNo: string, amountToPay: number, paymentMethod: string = "Cash") {
    const tenantId = await getTenantId();
    const activeToday = await getActiveBusinessDate(tenantId);
    const targetAmt = Number(amountToPay);
    
    const startStr = getKathmanduDateString(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000));

    try {
        const { data: logs, error: fetchErr } = await supabaseAdmin.from("daily_order_logs")
            .select("date, paid_history").eq("tenant_id", tenantId).gte("date", startStr).order("date", { ascending: true });

        if (fetchErr || !logs) return { success: false, error: fetchErr?.message || "No records found" };

        let logModified = false;
        let targetLogDate = "";
        let targetNewHistory: any[] = [];
        
        for (const log of logs) {
            const history = safeParse(log.paid_history);
            let billFound = false;

            const newHistory = history.map((bill: any) => {
                const invNo = bill.invoice_no || bill.bill_no || "";
                if (invNo === invoiceNo) {
                    billFound = true;
                    const method = bill.payment_method || "";
                    const grandTotal = Number(bill.grandTotal) || 0;
                    const previouslyTendered = Number(bill.tendered) || 0;
                    const currentDue = bill.credit_due !== undefined ? Number(bill.credit_due) : (method === 'Credit' ? Math.max(0, grandTotal - previouslyTendered) : 0);
                    
                    const deductAmt = Math.min(currentDue, targetAmt);

                    // Parse existing splits or create them
                    let splits = bill.splits;
                    if (typeof splits === 'string') {
                        try { splits = JSON.parse(splits); } catch(e) { splits = []; }
                    }
                    if (!splits || !Array.isArray(splits)) {
                        splits = [];
                    }

                    if (splits.length === 0) {
                        if (previouslyTendered > 0) {
                            splits.push({ method: 'Cash', amount: previouslyTendered });
                        }
                        splits.push({ method: 'Credit', amount: currentDue });
                    }

                    // Deduct from the 'Credit' split
                    let creditSplit = splits.find((s: any) => s.method === 'Credit');
                    if (!creditSplit) {
                        creditSplit = { method: 'Credit', amount: currentDue };
                        splits.push(creditSplit);
                    }
                    creditSplit.amount = Math.max(0, Number(creditSplit.amount) - deductAmt);

                    if (creditSplit.amount <= 0) {
                        splits = splits.filter((s: any) => s.method !== 'Credit');
                    }

                    // Add or merge paymentMethod split
                    let paySplit = splits.find((s: any) => s.method === paymentMethod);
                    if (paySplit) {
                        paySplit.amount = Number(paySplit.amount) + deductAmt;
                    } else {
                        splits.push({ method: paymentMethod, amount: deductAmt });
                    }

                    // Log audit list of credit payments
                    let creditPayments = bill.credit_payments;
                    if (typeof creditPayments === 'string') {
                        try { creditPayments = JSON.parse(creditPayments); } catch(e) { creditPayments = []; }
                    }
                    if (!creditPayments || !Array.isArray(creditPayments)) {
                        creditPayments = [];
                    }
                    creditPayments.push({
                        date: new Date().toISOString(),
                        business_date: activeToday,
                        amount: deductAmt,
                        method: paymentMethod
                    });

                    return { 
                        ...bill, 
                        tendered: previouslyTendered + deductAmt, 
                        credit_due: currentDue - deductAmt,
                        splits: splits,
                        credit_payments: creditPayments
                    };
                }
                return bill;
            });

            if (billFound) {
                logModified = true;
                targetLogDate = log.date;
                targetNewHistory = newHistory;
                break;
            }
        }

        if (logModified) {
            const { error: updateErr } = await supabaseAdmin.from("daily_order_logs")
                .update({ paid_history: targetNewHistory })
                .eq("tenant_id", tenantId)
                .eq("date", targetLogDate); 
                
            if (updateErr) throw new Error(updateErr.message);
        } else {
            return { success: false, error: "Invoice not found or already fully cleared." };
        }

        revalidateTag(`orders-${tenantId}`, undefined as any);
        revalidatePath("/staff/cashier");
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// --- HELPER: RESTORE INVENTORY ON ORDER CANCELLATION/EXPIRATION ---
async function restoreInventoryStock(tenantId: number, items: any[]) {
    try {
        const { data: inventoryItems } = await supabaseAdmin
            .from("inventory")
            .select("id, name, stock, quantity, linked_menu_item, base_unit, volume_per_unit")
            .eq("tenant_id", tenantId);

        if (inventoryItems && inventoryItems.length > 0) {
            const superClean = (str: string) => String(str).toLowerCase().replace(/[^a-z0-9]/g, '');

            for (const item of items) {
                // Restore only if the item was served (which deducted stock)
                if (item.status === 'served') {
                    const rawName = item.name || item.n || "";
                    const rawQty = Number(item.qty || item.q || 1);
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
                        const restorationAmount = rawQty * Number(stockItem.volume_per_unit || 1);
                        const currentStock = stockItem.stock !== undefined ? stockItem.stock : (stockItem.quantity || 0);
                        const newStock = Number(currentStock) + restorationAmount;
                        
                        await supabaseAdmin.from("inventory")
                            .update({ stock: newStock, quantity: newStock })
                            .eq("id", stockItem.id);
                    }
                }
            }
        }
    } catch (error) {
        console.error("Restore Inventory Stock Error:", error);
    }
}

// --- 8. CLOSE BUSINESS DAY ACTION (BLOCK_CLOSING WITH OVERRIDE) ---
export async function closeBusinessDayAction(forceCloseWithOverride: boolean = false, managerName: string | null = null) {
    const tenantId = await getTenantId();
    const dateStr = await getActiveBusinessDate(tenantId);
    try {
        const { data: log } = await supabaseAdmin
            .from("daily_order_logs")
            .select("orders_data, date")
            .eq("tenant_id", tenantId)
            .eq("date", dateStr)
            .maybeSingle();

        if (!log) {
            return { success: false, error: "No order log found for this day." };
        }

        const orders = safeParse(log.orders_data);
        const pendingOrders = orders.filter((o: any) => {
            if (o.id === "DAY_CLOSE_META") return false;
            const s = (o.status || '').toLowerCase().trim();
            return !['cancelled', 'paid', 'completed', 'expired'].includes(s);
        });

        if (pendingOrders.length > 0 && !forceCloseWithOverride) {
            return { 
                success: false, 
                error: `BLOCK CLOSING: There are ${pendingOrders.length} uncleared pending orders. Manager override required.` 
            };
        }

        let finalOrders = [...orders];

        if (pendingOrders.length > 0 && forceCloseWithOverride) {
            // Revert inventory for any items in these pending orders that were served
            const itemsToRestore: any[] = [];
            pendingOrders.forEach((o: any) => {
                if (o.items && Array.isArray(o.items)) {
                    o.items.forEach((item: any) => {
                        if (item.status === 'served') {
                            itemsToRestore.push(item);
                        }
                    });
                }
            });

            if (itemsToRestore.length > 0) {
                await restoreInventoryStock(tenantId, itemsToRestore);
            }

            // Mark orders as expired
            finalOrders = orders.map((o: any) => {
                if (o.id === "DAY_CLOSE_META") return o;
                const s = (o.status || '').toLowerCase().trim();
                if (!['cancelled', 'paid', 'completed', 'expired'].includes(s)) {
                    return {
                        ...o,
                        status: 'expired',
                        expired_at: new Date().toISOString(),
                        expired_by: managerName || "Manager Override"
                    };
                }
                return o;
            });

            // Free the tables in the DB
            const tableLabelsToFree = pendingOrders.map((o: any) => o.tbl);
            if (tableLabelsToFree.length > 0) {
                await supabaseAdmin
                    .from("restaurant_tables")
                    .update({ status: 'free' })
                    .eq("tenant_id", tenantId)
                    .in("label", tableLabelsToFree);
            }
        }

        // Mark the day as closed inside the daily logs
        const closeMeta = {
            id: "DAY_CLOSE_META",
            tbl: "SYSTEM",
            status: "closed",
            time: new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kathmandu', hour: '2-digit', minute: '2-digit' }),
            staff: managerName || "Cashier",
            timestamp: new Date().toISOString(),
            closed_by: managerName || "Cashier",
            is_closed: true
        };

        const cleanOrders = finalOrders.filter((o: any) => o.id !== "DAY_CLOSE_META");
        cleanOrders.push(closeMeta);

        const { error: updateErr } = await supabaseAdmin
            .from("daily_order_logs")
            .update({ orders_data: cleanOrders })
            .eq("tenant_id", tenantId)
            .eq("date", dateStr);

        if (updateErr) throw new Error(updateErr.message);

        revalidateTag(`orders-${tenantId}`, undefined as any);
        revalidateTag(`tables-${tenantId}`, undefined as any);
        revalidateTag(`inventory-${tenantId}`, undefined as any);
        revalidatePath("/staff/cashier");
        
        return { success: true };
    } catch (e: any) {
        console.error("Close Business Day Action Error:", e);
        return { success: false, error: e.message };
    }
}