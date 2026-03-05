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
      return [];
    }
  }
  return [];
}

async function getTenantId() {
  const cookieStore = await cookies();
  const rawId = cookieStore.get("gecko_tenant_id")?.value;
  return rawId && !isNaN(Number(rawId)) ? Number(rawId) : 5;
}

// ============================================================================
// 1. KDS BOARD LOGIC
// ============================================================================

export async function getKitchenTickets() {
  const tenantId = await getTenantId();
  
  // 7-Day Safety Lookback (Prevents midnight order loss)
  const today = new Date();
  const pastDate = new Date();
  pastDate.setDate(today.getDate() - 7);
  const dateStr = pastDate.toISOString().split('T')[0];

  try {
    const { data: logs } = await supabaseAdmin
      .from("daily_order_logs")
      .select("date, orders_data")
      .eq("tenant_id", tenantId)
      .gte("date", dateStr); 

    if (!logs || logs.length === 0) return { success: true, data: [] };

    let allOrders: any[] = [];
    logs.forEach((log: any) => {
        const parsedOrders = safeParse(log.orders_data);
        allOrders = [...allOrders, ...parsedOrders];
    });

    // FILTER: Only show active kitchen statuses
    const activeOrders = allOrders.filter((o: any) => 
        ['pending', 'cooking', 'ready', 'preparing'].includes((o.status || '').toLowerCase().trim())
    );

    // MAP: Standardize structure for the UI
    const mappedOrders = activeOrders.map((order: any) => ({
        id: order.id,
        table_name: order.tbl || order.table_name || "Unknown",
        status: order.status === 'preparing' ? 'cooking' : order.status, 
        created_at: order.timestamp || order.created_at || new Date().toISOString(),
        order_items: (order.items || []).map((item: any) => ({
            id: item.id || Math.random().toString(36),
            unique_id: item.unique_id || item.cartId || item.id, // Preserve digital signature
            name: item.name,
            quantity: item.qty || item.quantity || 1,
            notes: item.note || item.notes || "",
            variant: item.variant || item.variantName || "",
            status: item.status || 'pending',
            station: item.station || 'kitchen'
        }))
    }));

    return { success: true, data: mappedOrders };

  } catch (e) {
    console.error("Kitchen Sync Error:", e);
    return { success: false, data: [] };
  }
}

// --- UPDATE TICKET STATUS ---
export async function updateTicketStatus(orderId: string, status: string) {
    const tenantId = await getTenantId();
    const targetId = String(orderId).trim();
    
    const today = new Date();
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - 7);
    const dateStr = pastDate.toISOString().split('T')[0];

    const { data: logs } = await supabaseAdmin
        .from("daily_order_logs")
        .select("date, orders_data")
        .eq("tenant_id", tenantId)
        .gte("date", dateStr);

    if (!logs) return { success: false };

    let targetLog: any = null;
    let modifiedOrders = null;

    for (const log of logs) {
        const currentOrders = safeParse(log.orders_data);
        let found = false;

        const updatedOrders = currentOrders.map((order: any) => {
            if (String(order.id || '').trim() === targetId) {
                found = true;
                targetLog = log;
                
                // FIX: Do not downgrade items that are already 'served', 'void', or 'cancelled'
                const newItems = (order.items || []).map((i: any) => {
                    const currentItemStatus = (i.status || '').toLowerCase().trim();
                    if (['served', 'cancelled', 'void'].includes(currentItemStatus)) {
                        return i;
                    }
                    return { ...i, status };
                });
                
                return { ...order, status, items: newItems };
            }
            return order;
        });

        if (found) {
            modifiedOrders = updatedOrders;
            break;
        }
    }

    if (!targetLog || !modifiedOrders) return { success: false };

    await supabaseAdmin
        .from("daily_order_logs")
        .update({ orders_data: modifiedOrders })
        .eq("tenant_id", tenantId)
        .eq("date", targetLog.date);

    revalidatePath("/staff/waiter");
    revalidatePath("/staff/cashier");
    return { success: true };
}

// --- UPDATE ITEM STATUS (CRITICAL FIX: DIGITAL SIGNATURE MATCHING) ---
export async function updateItemStatus(itemId: string, status: string, orderId: string) {
    const tenantId = await getTenantId();
    const targetOrderId = String(orderId).trim();
    const targetItemId = String(itemId).trim();
    
    const today = new Date();
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - 7);
    const dateStr = pastDate.toISOString().split('T')[0];

    const { data: logs } = await supabaseAdmin
        .from("daily_order_logs")
        .select("date, orders_data")
        .eq("tenant_id", tenantId)
        .gte("date", dateStr);

    if (!logs) return { success: false };

    let targetLog: any = null;
    let modifiedOrders = null;

    for (const log of logs) {
        const currentOrders = safeParse(log.orders_data);
        let found = false;

        const updatedOrders = currentOrders.map((order: any) => {
            if (String(order.id || '').trim() === targetOrderId) {
                found = true;
                targetLog = log;
                
                let itemUpdated = false;

                const newItems = (order.items || []).map((i: any) => {
                    const sig = String(i.unique_id || i.cartId || i.id || `${i.name}||${i.variant || ''}`).trim();
                    
                    if (sig === targetItemId && !itemUpdated) {
                        itemUpdated = true; 
                        return { ...i, status };
                    }
                    return i;
                });

                const allServed = newItems.every((i: any) => (i.status||'').toLowerCase() === 'served');
                const allReady = newItems.every((i: any) => ['ready', 'served'].includes((i.status||'').toLowerCase()));
                const anyCooking = newItems.some((i: any) => ['cooking', 'ready'].includes((i.status||'').toLowerCase()));
                
                let newOrderStatus = order.status;
                if (allServed) newOrderStatus = 'served';
                else if (allReady) newOrderStatus = 'ready';
                else if (anyCooking && order.status === 'pending') newOrderStatus = 'cooking'; 

                return { ...order, items: newItems, status: newOrderStatus };
            }
            return order;
        });

        if (found) {
            modifiedOrders = updatedOrders;
            break;
        }
    }

    if (!targetLog || !modifiedOrders) return { success: false };

    await supabaseAdmin
        .from("daily_order_logs")
        .update({ orders_data: modifiedOrders })
        .eq("tenant_id", tenantId)
        .eq("date", targetLog.date);

    revalidatePath("/staff/waiter");
    revalidatePath("/staff/cashier");
    return { success: true };
}

// ============================================================================
// 2. MENU MANAGER (86'ing Items)
// ============================================================================

export async function getKitchenMenu() {
    const tenantId = await getTenantId();
    const { data, error } = await supabaseAdmin
        .from("menu_items")
        .select("id, name, price, category, is_available")
        .eq("tenant_id", tenantId)
        .order("category", { ascending: true });
    
    return { success: !error, data: data || [] };
}

export async function toggleMenuItem(itemId: number, isAvailable: boolean) {
    const tenantId = await getTenantId();
    
    const { error } = await supabaseAdmin
        .from("menu_items")
        .update({ is_available: isAvailable })
        .eq("id", itemId)
        .eq("tenant_id", tenantId);
    
    if (error) return { success: false };

    revalidatePath("/staff/kitchen/menu");
    revalidatePath("/staff/menu"); 
    return { success: true };
}

export async function disableMenuItem(itemName: string) {
    const tenantId = await getTenantId();
    
    const { error } = await supabaseAdmin
        .from("menu_items")
        .update({ is_available: false })
        .eq("tenant_id", tenantId)
        .eq("name", itemName);

    if (error) return { success: false, error: error.message };

    revalidatePath("/staff/menu");
    return { success: true };
}

export async function getKitchenStats() {
    const tenantId = await getTenantId();
    
    // MIDNIGHT CROSSOVER FIX (3-Day Window)
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    
    const datesToCheck = [
        yesterday.toISOString().split('T')[0],
        today.toISOString().split('T')[0],
        tomorrow.toISOString().split('T')[0]
    ];

    const { data: logs } = await supabaseAdmin
        .from("daily_order_logs")
        .select("orders_data")
        .eq("tenant_id", tenantId)
        .in("date", datesToCheck);

    if (!logs || logs.length === 0) return { success: true, stats: { total: 0, completed: 0, pending: 0, revenue: 0 }, history: [] };

    let allOrders: any[] = [];
    logs.forEach(log => {
        const parsed = safeParse(log.orders_data);
        allOrders = [...allOrders, ...parsed];
    });

    // Deduplicate by ID
    const uniqueOrdersMap = new Map();
    allOrders.forEach(o => {
        if (o.id) uniqueOrdersMap.set(o.id, o);
    });
    const finalOrders = Array.from(uniqueOrdersMap.values());
    
    // FIXED: The Kitchen Report now includes orders that are "Ready" (Waiters haven't picked them up yet)
    // as well as orders currently being paid for at the cashier.
    const completed = finalOrders.filter((o: any) => {
        const s = (o.status || '').toLowerCase().trim();
        return ['ready', 'served', 'payment_pending', 'paid', 'completed'].includes(s);
    });
    
    const pending = finalOrders.filter((o: any) => {
        const s = (o.status || '').toLowerCase().trim();
        return ['pending', 'cooking', 'preparing'].includes(s);
    });
    
    const revenue = completed.reduce((acc: number, curr: any) => acc + (Number(curr.total) || 0), 0);

    // Get the latest 100 finished/ready orders for the log
    const history = completed
        .sort((a,b) => new Date(b.timestamp || b.created_at || 0).getTime() - new Date(a.timestamp || a.created_at || 0).getTime())
        .slice(0, 100)
        .map((order: any) => ({
            id: order.id,
            table_name: order.tbl || order.table_name || "Unknown",
            created_at: order.timestamp || order.created_at || new Date().toISOString(),
            status: order.status,
            order_items: order.items || []
        }));

    return {
        success: true,
        stats: {
            total: finalOrders.length,
            completed: completed.length,
            pending: pending.length,
            revenue: revenue
        },
        history: history
    };
}

// --- LEGACY ---
export async function getKitchenData() {
    return getKitchenTickets();
}