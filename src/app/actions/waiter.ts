"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

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

// --- 1. GET WAITER DASHBOARD DATA ---
export async function getWaiterDashboardData() {
  const tenantId = await getTenantId();
  const today = new Date().toISOString().split('T')[0];

  try {
    const { data: tables, error: tableError } = await supabaseAdmin
        .from("restaurant_tables")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("label", { ascending: true });

    if (tableError) console.error("Table Fetch Error:", tableError);

    const { data: log } = await supabaseAdmin
        .from("daily_order_logs")
        .select("orders_data")
        .eq("tenant_id", tenantId)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

    const orders = safeParse(log?.orders_data);
    
    const { data: menuData } = await supabaseAdmin
        .from("menu_optimized")
        .select("items")
        .eq("tenant_id", tenantId);

    let disabledItems: any[] = [];
    if (menuData) {
        menuData.forEach((cat: any) => {
            const items = Array.isArray(cat.items) ? cat.items : [];
            items.forEach((item: any) => {
                if (item.is_available === false) {
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
    let mySales = 0;
    let tablesServed = 0;
    let hasReady = false;
    let hasCooking = false;
    const activeTableStatus = new Map<string, string>();

    orders.forEach((order: any) => {
        const isActive = ['pending', 'cooking', 'served', 'ready', 'payment_pending'].includes(order.status);
        const isPayment = order.status === 'payment_pending';

        if (order.status !== 'cancelled') {
            mySales += Number(order.total) || 0;
            tablesServed += 1;
        }

        if (order.status === 'ready') hasReady = true;
        if (order.status === 'cooking' || order.status === 'pending') hasCooking = true;

        if (isActive) {
            const tableName = order.tbl?.trim();
            let displayStatus = isPayment ? 'payment' : 'occupied';
            
            const validItems = order.items?.filter((i:any) => !['cancelled', 'void'].includes(i.status) && i.qty > 0) || [];
            const itemsReady = validItems.filter((i: any) => i.status === 'ready').length;
            
            if (itemsReady > 0) {
                displayStatus = 'ready';
                hasReady = true;
                
                if (order.status !== 'served' && order.status !== 'payment_pending') {
                    notifications.push({
                        id: order.id,
                        type: 'kitchen',
                        title: `${itemsReady} Items Ready`,
                        desc: `Table ${tableName}`,
                        time: new Date(order.timestamp || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                        table: tableName
                    });
                }
            }
            
            const current = activeTableStatus.get(tableName);
            if (displayStatus === 'ready') activeTableStatus.set(tableName, 'ready');
            else if (displayStatus === 'payment' && current !== 'ready') activeTableStatus.set(tableName, 'payment');
            else if (!current) activeTableStatus.set(tableName, 'occupied');
        }
    });

    const processedTables = tables?.map(t => {
        const status = activeTableStatus.get(t.label.trim()) || 'available';
        return {
            ...t,
            section: t.section || "Main Hall", 
            status: status
        };
    }) || [];

    const sections = Array.from(new Set(processedTables.map(t => t.section))).filter(Boolean);
    const finalSections = sections.length > 0 ? sections : ["Main Hall"];

    const cookieStore = await cookies();
    let staffName = "Team";
    try {
        const staffCookie = cookieStore.get("gecko_staff_token");
        const token = staffCookie?.value;
        if (token) staffName = JSON.parse(token).name;
    } catch(e) {}

    return {
        success: true,
        staff: { name: staffName },
        stats: { mySales, tablesServed },
        dockStatus: { hasReady, hasCooking },
        sections: finalSections,
        tables: processedTables,
        notifications: notifications,
        disabledItems: disabledItems
    };

  } catch (error) {
      return { 
          success: false, 
          staff: { name: "Error" }, 
          stats: { mySales: 0, tablesServed: 0 }, 
          dockStatus: { hasReady: false, hasCooking: false },
          sections: ["Main Hall"], 
          tables: [], 
          notifications: [], 
          disabledItems: [] 
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

    revalidatePath("/staff/waiter");
    return { success: !updateResult.error };
}

// --- 3. MARK ORDER SERVED (BULLETPROOF ITEM LEVEL) ---
export async function markOrderServed(orderId: string | number, tableLabel?: string, itemIdentifiers?: string[]) {
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
                        
                        if (itemIdentifiers && itemIdentifiers.length > 0) {
                            const fallbackSig = `${i.name}||${i.variant || ''}`;
                            const isItemMatch = (i.unique_id && itemIdentifiers.includes(i.unique_id)) || 
                                                (i.id && itemIdentifiers.includes(i.id)) || 
                                                itemIdentifiers.includes(fallbackSig);

                            if (isItemMatch && i.status === 'ready') {
                                return { ...i, status: 'served' };
                            }
                        } 
                        else if (i.status === 'ready') {
                            return { ...i, status: 'served' };
                        }

                        if (['pending', 'cooking'].includes(i.status)) itemsStillPendingOrCooking = true;
                        if (i.status === 'ready') itemsStillReady = true;

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

        revalidatePath("/staff/waiter");
        return { success: true };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// --- 4. CANCEL ORDER (SUPPORTS BOTH FULL AND ITEM-LEVEL) ---
export async function cancelOrder(orderId: string | number, tableLabel: string, itemIdToCancel?: string) {
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
        let foundDate = null;
        let modifiedOrders = null;

        for (const log of logs) {
            const currentOrders = safeParse(log.orders_data);
            let found = false;

            const updatedOrders = currentOrders.map((order: any) => {
                if (String(order.id || "").trim() === targetId) {
                    
                    // IF SPECIFIC ITEM ID IS PROVIDED
                    if (itemIdToCancel) {
                        found = true;
                        foundDate = log.date;
                        let amountToDeduct = 0;
                        
                        const newItems = order.items.map((i:any) => {
                            const sig = i.unique_id || i.id || `${i.name}||${i.variant || ''}`;
                            if (sig === itemIdToCancel && i.status === 'pending') {
                                amountToDeduct += (i.price * i.qty);
                                return { ...i, status: 'cancelled' };
                            }
                            return i;
                        });

                        // Recalculate Parent Status Based on Remaining Items
                        const stillPending = newItems.some((i:any) => i.status === 'pending');
                        const stillCooking = newItems.some((i:any) => i.status === 'cooking');
                        const stillReady = newItems.some((i:any) => i.status === 'ready');
                        const allCancelled = newItems.every((i:any) => i.status === 'cancelled' || i.status === 'void');
                        
                        let newOrderStatus = 'payment_pending';
                        if (allCancelled) newOrderStatus = 'cancelled';
                        else if (stillReady) newOrderStatus = 'ready';
                        else if (stillCooking) newOrderStatus = 'cooking';
                        else if (stillPending) newOrderStatus = 'pending';

                        return { 
                            ...order, 
                            status: newOrderStatus,
                            items: newItems,
                            total: Math.max(0, order.total - amountToDeduct)
                        };
                    } 
                    // ELSE CANCEL ENTIRE ORDER (IF FULLY PENDING)
                    else {
                        const isFullyPending = order.items.every((i:any) => i.status === 'pending' || i.status === 'cancelled');
                        if (isFullyPending) {
                            found = true;
                            foundDate = log.date;
                            const newItems = order.items.map((i:any) => ({ ...i, status: 'cancelled' }));
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
            return { success: false, error: "Could not cancel. Item might be cooking." };
        }

        await supabaseAdmin.from("daily_order_logs").update({ orders_data: modifiedOrders }).eq("tenant_id", tenantId).eq("date", foundDate);
        
        // Free table if it was the only active order
        if (!tableLabel.startsWith("TAKEAWAY")) {
            const remainingActive = modifiedOrders.some((o:any) => o.tbl === tableLabel && !['cancelled', 'paid', 'completed'].includes(o.status));
            if(!remainingActive) {
                await supabaseAdmin.from("restaurant_tables").update({ status: 'free' }).eq("label", tableLabel).eq("tenant_id", tenantId);
            }
        }

        revalidatePath("/staff/waiter");
        return { success: true };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}