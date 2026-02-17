"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

async function getTenantId() {
  const cookieStore = await cookies();
  const rawId = cookieStore.get("gecko_tenant_id")?.value;
  return rawId && !isNaN(Number(rawId)) ? Number(rawId) : 5;
}

// ============================================================================
// 1. KDS BOARD LOGIC (The Brain)
// ============================================================================

// --- FETCH ACTIVE TICKETS ---
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
        if (Array.isArray(log.orders_data)) {
            allOrders = [...allOrders, ...log.orders_data];
        }
    });

    // FILTER: Only show active kitchen statuses
    // We intentionally keep 'ready' visible until manually served/cleared
    const activeOrders = allOrders.filter((o: any) => 
        ['pending', 'cooking', 'ready', 'preparing'].includes(o.status)
    );

    // MAP: Standardize structure for the UI
    const mappedOrders = activeOrders.map((order: any) => ({
        id: order.id,
        table_name: order.tbl || order.table_name || "Unknown",
        status: order.status === 'preparing' ? 'cooking' : order.status, 
        created_at: order.timestamp || order.created_at || new Date().toISOString(),
        order_items: (order.items || []).map((item: any) => ({
            id: item.id || Math.random().toString(36),
            name: item.name,
            quantity: item.qty || item.quantity || 1,
            notes: item.note || item.notes || "",
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
    
    // Lookback search
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
    let orderIndex = -1;

    // Find correct log entry
    for (const log of logs) {
        if (log.orders_data) {
            const idx = log.orders_data.findIndex((o: any) => o.id === orderId);
            if (idx !== -1) {
                targetLog = log;
                orderIndex = idx;
                break;
            }
        }
    }

    if (!targetLog || orderIndex === -1) return { success: false };

    // Update Status
    targetLog.orders_data[orderIndex].status = status;
    
    // Auto-Sync Items (If moving ticket, move all items)
    if(targetLog.orders_data[orderIndex].items) {
        targetLog.orders_data[orderIndex].items = targetLog.orders_data[orderIndex].items.map((i: any) => ({ ...i, status }));
    }

    // SAVE: Use Composite Key (Tenant + Date) to guarantee update
    await supabaseAdmin
        .from("daily_order_logs")
        .update({ orders_data: targetLog.orders_data })
        .eq("tenant_id", tenantId)
        .eq("date", targetLog.date);

    revalidatePath("/admin/kitchen");
    revalidatePath("/staff/kitchen");
    return { success: true };
}

// --- UPDATE ITEM STATUS ---
export async function updateItemStatus(itemId: string, status: string, orderId: string) {
    const tenantId = await getTenantId();
    
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
    let orderIndex = -1;

    for (const log of logs) {
        if (log.orders_data) {
            const idx = log.orders_data.findIndex((o: any) => o.id === orderId);
            if (idx !== -1) {
                targetLog = log;
                orderIndex = idx;
                break;
            }
        }
    }

    if (!targetLog || orderIndex === -1) return { success: false };

    let orders = targetLog.orders_data;
    const items = orders[orderIndex].items || [];
    // Fallback to name match if ID doesn't exist on older items
    const itemIndex = items.findIndex((i: any) => (i.id === itemId || i.name === itemId)); 

    if (itemIndex !== -1) {
        items[itemIndex].status = status;
        
        // Smart Status Logic: Check if WHOLE ticket needs moving
        const allServed = items.every((i: any) => i.status === 'served');
        const allReady = items.every((i: any) => i.status === 'ready' || i.status === 'served');
        const anyCooking = items.some((i: any) => i.status === 'cooking' || i.status === 'ready');
        
        if (allServed) orders[orderIndex].status = 'served';
        else if (allReady) orders[orderIndex].status = 'ready';
        else if (anyCooking && orders[orderIndex].status === 'pending') orders[orderIndex].status = 'cooking'; 
    }

    await supabaseAdmin
        .from("daily_order_logs")
        .update({ orders_data: orders })
        .eq("tenant_id", tenantId)
        .eq("date", targetLog.date);

    revalidatePath("/admin/kitchen");
    revalidatePath("/staff/kitchen");
    return { success: true };
}

// ============================================================================
// 2. MENU MANAGER (86'ing Items)
// ============================================================================

// --- GET MENU ---
export async function getKitchenMenu() {
    const tenantId = await getTenantId();
    const { data, error } = await supabaseAdmin
        .from("menu_items")
        .select("id, name, price, category, is_available")
        .eq("tenant_id", tenantId)
        .order("category", { ascending: true });
    
    return { success: !error, data: data || [] };
}

// --- TOGGLE AVAILABILITY (Main Switch) ---
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

// --- DISABLE BY NAME (Quick 86 from Ticket) ---
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

// ============================================================================
// 3. REPORTS & STATS
// ============================================================================

export async function getKitchenStats() {
    const tenantId = await getTenantId();
    const today = new Date().toISOString().split('T')[0];

    const { data: log } = await supabaseAdmin
        .from("daily_order_logs")
        .select("orders_data")
        .eq("tenant_id", tenantId)
        .eq("date", today)
        .maybeSingle();

    if (!log || !log.orders_data) return { success: true, stats: { total: 0, completed: 0, pending: 0, revenue: 0 }, history: [] };

    const orders = log.orders_data;
    
    // Calculate Stats
    const completed = orders.filter((o: any) => o.status === 'served' || o.status === 'completed');
    const pending = orders.filter((o: any) => o.status === 'pending' || o.status === 'cooking');
    const revenue = completed.reduce((acc: number, curr: any) => acc + (Number(curr.total) || 0), 0);

    // History Log (Latest 50)
    const history = completed.reverse().slice(0, 50).map((order: any) => ({
        id: order.id,
        table_name: order.tbl || order.table_name || "Unknown",
        created_at: order.timestamp || order.created_at,
        status: 'served',
        order_items: order.items || []
    }));

    return {
        success: true,
        stats: {
            total: orders.length,
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