"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { getKathmanduDateString } from "@/lib/utils";
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

export async function getWaiterDashboardData() {
  let currentStaffName = "Team";
  try {
    const tenantId = await getTenantId();

    // 1. Fetch dynamic staff context safely OUTSIDE the cache
    try {
        const cookieStore = await cookies();
        const staffCookie = cookieStore.get("gecko_staff_token");
        if (staffCookie?.value) {
            currentStaffName = JSON.parse(staffCookie.value).name || "Team";
        }
    } catch (e) {}

    const today = await getActiveBusinessDate(tenantId);
    const yesterdayStr = await getPreviousDateString(today);

    const { data: tables, error: tableError } = await supabaseAdmin
        .from("restaurant_tables")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("label", { ascending: true });

    if (tableError) console.error("Table Fetch Error:", tableError);

    const { data: logs } = await supabaseAdmin
        .from("daily_order_logs")
        .select("date, orders_data, paid_history")
        .eq("tenant_id", tenantId)
        .in("date", [yesterdayStr, today])
        .order("date", { ascending: false });

    const uniqueActiveOrders = new Map();
    const uniquePaidOrders = new Map();
    
    logs?.sort((a: any, b: any) => a.date.localeCompare(b.date)).forEach((log: any) => {
        const active = safeParse(log.orders_data) || [];
        const paid = safeParse(log.paid_history) || [];
        
        active.forEach((o: any) => {
            const oId = o.id || o.invoice_no || Math.random().toString();
            uniqueActiveOrders.set(oId, o);
        });
        
        paid.forEach((o: any) => {
            const oId = o.id || o.invoice_no || Math.random().toString();
            uniquePaidOrders.set(oId, o);
        });
    });
    
    const activeOrders = Array.from(uniqueActiveOrders.values());
    const paidOrders = Array.from(uniquePaidOrders.values());
    
    const { data: menuData } = await supabaseAdmin
        .from("menu_optimized")
        .select("items")
        .eq("tenant_id", tenantId);

    let disabledItems: any[] = [];
    if (menuData) {
        menuData.forEach((cat: any) => {
            if (!cat) return;
            const items = Array.isArray(cat.items) ? cat.items : [];
            items.forEach((item: any) => {
                if (item && item.is_available === false) {
                    disabledItems.push({
                        id: item.id,
                        title: item.name,
                        price: item.price,
                        category: cat.category_name
                    });
                }
            });
        });
    }

    const notifications: any[] = [];
    const cancelledItemsMap = new Map(); 
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000); 

    let mySales = 0;
    let tablesServed = 0;
    let hasReady = false;
    let hasCooking = false;
    const activeTableStatus = new Map<string, string>();

    logs?.forEach(log => {
        if (!log) return;
        const logActive = safeParse(log.orders_data);
        const logPaid = safeParse(log.paid_history);
        const allOrdersForWaste = [...logActive, ...logPaid];

        allOrdersForWaste.forEach((order: any) => {
            if (!order) return;
            (order.items || []).forEach((item: any) => {
                if (item && (item.status === 'cancelled' || item.status === 'void')) {
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
    });

    activeOrders.forEach((order: any) => {
        if (!order) return;
        
        if (order.type === 'waiter_call' && order.status === 'waiter_call_active') {
            notifications.push({
                id: order.id,
                type: 'call',
                title: 'Customer Calling',
                desc: `Table ${order.table_no || order.tbl} requested assistance`,
                time: new Date(order.timestamp || order.created_at || Date.now()).toLocaleTimeString('en-US', { timeZone: 'Asia/Kathmandu', hour: '2-digit', minute: '2-digit' }),
                items: []
            });
            return;
        }

        const tableName = String(order.tbl || "").trim();
        const grandTotal = Number(order.total) || 0;
        const validItems = (order.items || []).filter((i:any) => i && i.status !== 'cancelled' && i.status !== 'void');

        if (validItems.length > 0) {
            mySales += grandTotal;
            tablesServed += 1;
            
            let hasReadyItemInOrder = false;
            
            validItems.forEach((item: any) => {
                if (item && item.status === 'ready') {
                    hasReady = true;
                    hasReadyItemInOrder = true;
                } else if (item && (item.status === 'cooking' || item.status === 'pending')) {
                    hasCooking = true;
                }
            });

            if (hasReadyItemInOrder) {
                notifications.push({
                    id: order.id,
                    type: 'kitchen',
                    title: 'Order Ready',
                    desc: `Table ${tableName}`,
                    time: new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kathmandu' }),
                    items: validItems
                });
            }

            const current = activeTableStatus.get(tableName);
            if (!current) activeTableStatus.set(tableName, 'occupied');
        }
    });

    const processedTables = tables?.map(t => {
        if (!t) return null;
        const label = String(t.label || "").trim();
        const status = activeTableStatus.get(label) || (t.status || 'available');
        return {
            ...t,
            section: t.section || "Main Hall", 
            status: status
        };
    }).filter(Boolean) || [];

    const sections = Array.from(new Set(processedTables.map((t: any) => t.section))).filter(Boolean);
    const finalSections = sections.length > 0 ? sections : ["Main Hall"];

    const finalCancelledItems = Array.from(cancelledItemsMap.values());

    return {
        success: true,
        businessDate: today,
        stats: { mySales, tablesServed },
        dockStatus: { hasReady, hasCooking },
        sections: finalSections,
        tables: processedTables,
        notifications: notifications,
        disabledItems: disabledItems,
        cancelledItems: finalCancelledItems,
        orders_list: Array.from(new Map([...activeOrders, ...paidOrders].filter(Boolean).map(o => [o.id, o])).values()),
        staff: { name: currentStaffName } 
    };

  } catch (error) {
      console.error("Waiter Dashboard Error:", error);
      return { 
          success: false, 
          stats: { mySales: 0, tablesServed: 0 }, 
          dockStatus: { hasReady: false, hasCooking: false },
          sections: ["Main Hall"], 
          tables: [], 
          notifications: [], 
          disabledItems: [],
          cancelledItems: [],
          orders_list: [],
          staff: { name: currentStaffName } 
      };
  }
}

// --- 2. CLEAN TABLE ---
export async function cleanTable(tableName: string) {
    const tenantId = await getTenantId();
    
    const { data: log } = await supabaseAdmin
        .from("daily_order_logs")
        .select("date, orders_data") 
        .eq("tenant_id", tenantId)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

    const orders = safeParse(log?.orders_data);
    if (!log || orders.length === 0) return { success: false };

    const newOrders = orders.map((order: any) => {
        if (order.tbl === tableName && ['pending', 'cooking', 'served', 'ready', 'payment_pending'].includes(order.status)) {
            return { ...order, status: 'completed', endTime: new Date().toISOString() };
        }
        return order;
    });

    const updateResult = await supabaseAdmin
        .from("daily_order_logs")
        .update({ orders_data: newOrders })
        .eq("tenant_id", tenantId)
        .eq("date", log.date);

    await supabaseAdmin
        .from("restaurant_tables")
        .update({ status: 'free' })
        .eq("label", tableName)
        .eq("tenant_id", tenantId);

    revalidateTag(`orders-${tenantId}`, undefined as any);
    revalidateTag(`tables-${tenantId}`, undefined as any);
    revalidatePath("/staff/waiter");
    return { success: !updateResult.error };
}

// --- 3. MARK ORDER SERVED (NOW WITH INVENTORY SYNC) ---
export async function markOrderServed(orderId: string | number, tableLabel?: string, itemIdentifiers?: string[]) {
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
        let itemsToDeductFromInventory: any[] = []; // Tracks items marked as served
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
                                itemsToDeductFromInventory.push(i); // Add to inventory deduction queue
                                return { ...i, status: 'served' };
                            }
                        } 
                        else if (['pending', 'cooking', 'preparing', 'ready'].includes(safeStatus)) {
                            itemsToDeductFromInventory.push(i); // Add to inventory deduction queue
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

        // --- INVENTORY SYNC (DEDUCT ONLY NEWLY SERVED ITEMS) ---
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
        revalidateTag(`inventory-${tenantId}`, undefined as any);
        revalidatePath("/staff/waiter");
        revalidatePath("/admin/inventory");
        return { success: true };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// --- 4. CANCEL ORDER ---
export async function cancelOrder(orderId: string | number, tableLabel: string, itemIdToCancel?: string, reason?: string) {
    const tenantId = await getTenantId();
    
    const activeToday = await getActiveBusinessDate(tenantId);
    const datesToCheck = [
        await getPreviousDateString(activeToday),
        activeToday,
        await getNextDateString(activeToday)
    ];

    let staffName = "Waiter";
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
                        
                        const newItems = order.items.map((i:any) => {
                            const sig = i.unique_id || i.id || `${i.name}||${i.variant || ''}`;
                            if (sig === itemIdToCancel && ['pending', 'cooking', 'ready'].includes((i.status || '').toLowerCase().trim())) {
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
            return { success: false, error: "Could not cancel item. It may have already been served." };
        }

        await supabaseAdmin.from("daily_order_logs").update({ orders_data: modifiedOrders }).eq("tenant_id", tenantId).eq("date", foundDate);
        
        if (!tableLabel.startsWith("TAKEAWAY")) {
            const remainingActive = modifiedOrders.some((o:any) => o.tbl === tableLabel && !['cancelled', 'paid', 'completed'].includes(o.status));
            if(!remainingActive) {
                await supabaseAdmin.from("restaurant_tables").update({ status: 'free' }).eq("label", tableLabel).eq("tenant_id", tenantId);
                revalidateTag(`tables-${tenantId}`, undefined as any);
            }
        }

        revalidateTag(`orders-${tenantId}`, undefined as any);
        revalidatePath("/staff/waiter");
        return { success: true };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// --- 5. FAST POLLING FOR NOTIFICATIONS (LOW EGRESS) ---
export async function getWaiterBell() {
    const tenantId = await getTenantId();
    if (tenantId === 5) return { notifications: [] };
    
    const todayStr = await getActiveBusinessDate(tenantId);
    const yesterdayStr = await getPreviousDateString(todayStr);

    try {
        const { data: logs } = await supabaseAdmin
            .from("daily_order_logs")
            .select("orders_data") 
            .eq("tenant_id", tenantId)
            .in("date", [yesterdayStr, todayStr]);

        if (!logs) return { notifications: [] };

        const notifications: any[] = [];
        logs.forEach(log => {
            const activeOrders = safeParse(log.orders_data);
            activeOrders.forEach((order: any) => {
                const tableName = String(order.tbl || "").trim();
                const validItems = (order.items || []).filter((i:any) => i.status === 'ready');

                if (validItems.length > 0) {
                    notifications.push({
                        id: order.id,
                        orderNo: order.invoice_no || order.id || '',
                        table: tableName,
                        itemsCount: validItems.length,
                        items: validItems.map((i:any) => i.name),
                        time: new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kathmandu' })
                    });
                }
            });
        });

        return { notifications };
    } catch (e) {
        return { notifications: [] };
    }
}