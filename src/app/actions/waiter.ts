"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

// --- HELPERS ---
function getSafeId(id: string | null | undefined): number {
  return id && !isNaN(Number(id)) ? Number(id) : 5;
}

// Universal Parser: Handles Array or Stringified JSON
function safeParse(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      // Handle double-stringification
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
  const tenantCookie = await cookieStore.get("gecko_tenant_id");
  const rawId = tenantCookie?.value;
  if (rawId) return getSafeId(rawId);

  const staffCookie = await cookieStore.get("gecko_staff_token");
  const staffToken = staffCookie?.value;
  if (staffToken) {
      try { return getSafeId(JSON.parse(staffToken).tenant_id); } catch (e) {}
  }
  return 5; 
}

// --- 1. GET WAITER DASHBOARD DATA ---
export async function getWaiterDashboardData() {
  const tenantId = await getTenantId();
  // Fetch based on server date, but allow flexibility
  const today = new Date().toISOString().split('T')[0];

  try {
    // A. FETCH TABLES
    const { data: tables, error: tableError } = await supabaseAdmin
        .from("restaurant_tables")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("label", { ascending: true });

    if (tableError) console.error("Table Fetch Error:", tableError);

    // B. FETCH LIVE LOGS
    // We grab the most recent log to be safe
    const { data: log } = await supabaseAdmin
        .from("daily_order_logs")
        .select("orders_data")
        .eq("tenant_id", tenantId)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

    const orders = safeParse(log?.orders_data);
    
    // C. FETCH DISABLED MENU ITEMS
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

    // D. PROCESS ORDERS
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
            
            const itemsReady = order.items?.filter((i: any) => i.status === 'ready').length || 0;
            
            if (itemsReady > 0 && order.status !== 'served') {
                displayStatus = 'ready';
                hasReady = true;
                
                notifications.push({
                    id: order.id,
                    type: 'kitchen',
                    title: `${itemsReady} Items Ready`,
                    desc: `Table ${tableName}`,
                    time: new Date(order.timestamp || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                    table: tableName
                });
            }
            
            const current = activeTableStatus.get(tableName);
            if (displayStatus === 'ready') activeTableStatus.set(tableName, 'ready');
            else if (displayStatus === 'payment' && current !== 'ready') activeTableStatus.set(tableName, 'payment');
            else if (!current) activeTableStatus.set(tableName, 'occupied');
        }
    });

    // E. MERGE DATA
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
        const staffCookie = await cookieStore.get("gecko_staff_token");
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
      console.error("Waiter Dashboard Error:", error);
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
    
    // Fetch latest log to determine which row to update
    const { data: log } = await supabaseAdmin
        .from("daily_order_logs")
        .select("date, orders_data") // Need DATE, not ID
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

    // FIX: Update using Composite Key (date + tenant_id)
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

// --- 3. MARK ORDER SERVED (COMPOSITE KEY FIX) ---
export async function markOrderServed(orderId: string | number, tableLabel?: string) {
    const tenantId = await getTenantId();
    
    // Search Window: Yesterday, Today, Tomorrow
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    
    const datesToCheck = [
        yesterday.toISOString().split('T')[0],
        today.toISOString().split('T')[0],
        tomorrow.toISOString().split('T')[0]
    ];

    try {
        // Fetch logs (Select DATE, not ID)
        const { data: logs } = await supabaseAdmin
            .from("daily_order_logs")
            .select("date, orders_data") // Vital: Get the DATE for the composite key
            .eq("tenant_id", tenantId)
            .in("date", datesToCheck);

        if (!logs || logs.length === 0) return { success: false, error: "No logs found" };

        const targetId = String(orderId).trim();
        const targetTable = tableLabel ? String(tableLabel).trim() : "";
        
        let foundDate = null;
        let modifiedOrders = null;

        console.log(`[WAITER] Searching for Order ID: ${targetId}`);

        for (const log of logs) {
            const currentOrders = safeParse(log.orders_data);
            let found = false;

            const updatedOrders = currentOrders.map((order: any) => {
                const currentOrderId = String(order.id || "").trim();
                const currentTable = String(order.tbl || "").trim();

                const isMatch = currentOrderId === targetId || (targetTable && currentTable === targetTable && order.status === 'ready');

                if (isMatch) {
                    console.log(`[WAITER] FOUND in Log Date: ${log.date}`);
                    found = true;
                    foundDate = log.date; // Capture the DATE
                    
                    const updatedItems = (order.items || []).map((i: any) => 
                        i.status === 'ready' ? { ...i, status: 'served' } : i
                    );

                    return { ...order, status: 'served', items: updatedItems };
                }
                return order;
            });

            if (found) {
                modifiedOrders = updatedOrders;
                break; 
            }
        }

        if (!foundDate || !modifiedOrders) {
            console.error(`[WAITER] Order ${targetId} not found.`);
            return { success: false, error: "Order not found" };
        }

        // FIX: Update using Composite Key (date + tenant_id)
        const { error } = await supabaseAdmin
            .from("daily_order_logs")
            .update({ orders_data: modifiedOrders })
            .eq("tenant_id", tenantId)
            .eq("date", foundDate); // Correct identifier

        if (error) {
            console.error("[WAITER] DB Update Error:", error);
            return { success: false, error: error.message };
        }

        revalidatePath("/staff/waiter");
        return { success: true };

    } catch (e: any) {
        console.error("Mark Served Exception:", e.message);
        return { success: false, error: e.message };
    }
}