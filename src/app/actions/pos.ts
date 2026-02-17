"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

// --- HELPERS ---
async function getTenantId(): Promise<number> {
  const cookieStore = await cookies();
  const rawId = cookieStore.get("gecko_tenant_id")?.value;
  return rawId && !isNaN(Number(rawId)) ? Number(rawId) : 5;
}

// --- 1. GET LIVE STATS (SELF-HEALING + ORDERS LIST) ---
export async function getPOSStats() {
  const tenantId = await getTenantId();
  const today = new Date().toISOString().split('T')[0];

  try {
      // 1. Fetch ALL Tables with VISUAL DATA
      const { data: tables } = await supabaseAdmin
          .from("restaurant_tables")
          .select("id, label, status, section, shape, seats, x, y, width, height, rotation") 
          .eq("tenant_id", tenantId)
          .order("label", { ascending: true });

      // 2. Fetch Today's Orders
      const { data: logs } = await supabaseAdmin
          .from("daily_order_logs")
          .select("orders_data")
          .eq("tenant_id", tenantId)
          .eq("date", today)
          .limit(1)
          .maybeSingle();

      const orders = logs && Array.isArray(logs.orders_data) ? logs.orders_data : [];
      
      // 3. IDENTIFY REALITY
      const activeOrders = orders.filter((o: any) => 
          !['cancelled', 'completed', 'paid'].includes(o.status)
      );
      
      const activeTableLabels = new Set(activeOrders.map((o: any) => o.tbl));

      // 4. AUTO-HEAL DATABASE
      const updates = [];

      const tablesToOccupy = tables?.filter(t => activeTableLabels.has(t.label) && t.status === 'free').map(t => t.label) || [];
      if (tablesToOccupy.length > 0) {
          updates.push(supabaseAdmin
              .from("restaurant_tables")
              .update({ status: 'occupied' })
              .eq("tenant_id", tenantId)
              .in("label", tablesToOccupy)
          );
      }

      const tablesToFree = tables?.filter(t => !activeTableLabels.has(t.label) && t.status === 'occupied').map(t => t.label) || [];
      if (tablesToFree.length > 0) {
          updates.push(supabaseAdmin
              .from("restaurant_tables")
              .update({ status: 'free' })
              .eq("tenant_id", tenantId)
              .in("label", tablesToFree)
          );
      }

      if (updates.length > 0) await Promise.all(updates);

      // 5. CALCULATE STATS
      const finalTables = tables?.map(t => {
          if (activeTableLabels.has(t.label)) return { ...t, status: 'occupied' };
          if (t.status === 'occupied' && !activeTableLabels.has(t.label)) return { ...t, status: 'free' };
          return t;
      }) || [];

      const totalTables = finalTables.length;
      const occupiedCount = finalTables.filter(t => t.status === 'occupied').length;
      const vacantCount = totalTables - occupiedCount; 
      const occupancyRate = totalTables > 0 ? Math.round((occupiedCount / totalTables) * 100) : 0;

      const totalOrders = orders.filter((o: any) => o.status !== 'cancelled').length;
      const totalRevenue = orders.reduce((acc: number, o: any) => o.status !== 'cancelled' ? acc + (Number(o.total) || 0) : acc, 0);

      return { 
          success: true, 
          stats: { 
              totalTables, 
              vacantCount, 
              occupiedCount, 
              occupancyRate, 
              totalOrders, 
              totalRevenue,
              tables: finalTables,
              orders_list: orders.reverse() 
          } 
      };
  } catch (e) { return { success: false, stats: null }; }
}

// --- 2. GET MENU ---
export async function getPOSMenu() {
  const tenantId = await getTenantId();
  let { data: menuData } = await supabaseAdmin.from("menu_optimized").select("*").eq("tenant_id", tenantId).order("sort_order", { ascending: true });

  if (!menuData || menuData.length === 0) {
      const { data: fallbackData } = await supabaseAdmin.from("menu_optimized").select("*").eq("tenant_id", 0).order("sort_order", { ascending: true });
      if (fallbackData) menuData = fallbackData;
  }

  let allItems: any[] = [];
  let categories: any[] = [];

  if (menuData && menuData.length > 0) {
      categories = menuData.map(cat => ({ id: cat.id, name: cat.category_name }));
      menuData.forEach(cat => {
          if (Array.isArray(cat.items)) {
              allItems = [...allItems, ...cat.items.map((item: any) => ({
                  ...item,
                  category: cat.category_name,
                  price: Number(item.price) || 0,
                  is_available: item.is_available !== false,
                  description: item.description || "",
                  variants: item.variants || []
              }))];
          }
      });
  }
  return { categories, items: allItems.filter(i => i.is_available) };
}

// --- 3. GET POS DATA (AGGREGATOR FOR FRONTEND) ---
// *** THIS FUNCTION WAS MISSING, NOW ADDED ***
export async function getPOSData() {
    try {
        const [menu, stats] = await Promise.all([getPOSMenu(), getPOSStats()]);
        
        // Map tables for POS view (ensure name exists)
        const tables = stats.stats?.tables.map((t: any) => ({
            ...t,
            name: t.label // Ensure 'name' property exists for frontend compatibility
        })) || [];

        return {
            success: true,
            categories: menu.categories,
            items: menu.items,
            tables: tables
        };
    } catch (e) {
        return { success: false, categories: [], items: [], tables: [] };
    }
}

// --- 4. SUBMIT ORDER (RPC + TAKEAWAY) ---
export async function submitOrder(tableId: string, cartItems: any[], total: number) {
  const tenantId = await getTenantId(); 
  const today = new Date().toISOString().split('T')[0];
  
  // 1. CHECK TAKEAWAY
  const isTakeaway = tableId.startsWith("TAKEAWAY");

  let staffName = "Server";
  try {
      const cookieStore = await cookies();
      const token = cookieStore.get("gecko_staff_token")?.value;
      if (token) staffName = JSON.parse(token).name;
  } catch (e) {}

  const orderId = crypto.randomUUID().split('-')[0].toUpperCase();
  const newOrder = {
      id: orderId,
      tbl: tableId, 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      items: cartItems.map((item: any) => ({
          id: item.id,
          qty: item.qty,
          name: item.name,
          note: item.note || "",
          price: item.price,
          status: 'pending',
          variant: item.variantName || ""
      })),
      staff: staffName,
      total: total,
      status: 'pending',
      timestamp: new Date().toISOString()
  };

  // 2. SAVE TO DB (RPC)
  const { error: rpcError } = await supabaseAdmin.rpc('upsert_order_log', {
      p_tenant_id: tenantId,
      p_date: today,
      p_order_data: newOrder
  });

  if (rpcError) {
      console.error("[POS] RPC Error:", rpcError);
      return { success: false, msg: "Save Failed: " + rpcError.message };
  }

  // 3. UPDATE TABLE STATUS
  if (!isTakeaway) {
      await supabaseAdmin
          .from("restaurant_tables")
          .update({ status: 'occupied' }) 
          .eq("label", tableId)
          .eq("tenant_id", tenantId); 
  }

  // 4. INVENTORY SYNC
  (async () => {
      try {
          const itemNames = cartItems.map((i: any) => i.name);
          const { data: inv } = await supabaseAdmin.from("inventory").select("*").eq("tenant_id", tenantId).in("item_name", itemNames);
          if (inv) {
              for (const cartItem of cartItems) {
                  const stock = inv.find(i => i.item_name.toLowerCase() === cartItem.name.toLowerCase());
                  if (stock) await supabaseAdmin.from("inventory").update({ quantity: Math.max(0, stock.quantity - cartItem.qty) }).eq("id", stock.id);
              }
          }
      } catch (e) {}
  })();

  revalidatePath("/staff/waiter");
  return { success: true, orderId };
}

// --- 5. MODIFY ORDER ---
export async function modifyOrder(orderId: string, cartItems: any[], total: number) {
    const tenantId = await getTenantId();
    const today = new Date().toISOString().split('T')[0];

    // 1. Fetch Today's Log
    const { data: log } = await supabaseAdmin
        .from("daily_order_logs")
        .select("id, orders_data")
        .eq("tenant_id", tenantId)
        .eq("date", today)
        .single();

    if (!log) return { success: false, msg: "Order not found today" };

    // 2. Find the specific Order
    let orders = Array.isArray(log.orders_data) ? log.orders_data : [];
    const orderIndex = orders.findIndex((o: any) => o.id === orderId);

    if (orderIndex === -1) return { success: false, msg: "Order ID not found" };

    // 3. SAFETY LOCK
    const currentStatus = orders[orderIndex].status;
    if (['cooking', 'ready', 'served', 'paid', 'completed'].includes(currentStatus)) {
        return { success: false, msg: `Cannot modify! Order is ${currentStatus.toUpperCase()}` };
    }

    // 4. Update the Order Data
    orders[orderIndex] = {
        ...orders[orderIndex],
        items: cartItems.map((item: any) => ({
            id: item.id,
            qty: item.qty,
            name: item.name,
            note: item.note || "",
            price: item.price,
            status: 'pending',
            variant: item.variantName || ""
        })),
        total: total,
        timestamp: new Date().toISOString()
    };

    // 5. Save Changes
    const { error } = await supabaseAdmin
        .from("daily_order_logs")
        .update({ orders_data: orders })
        .eq("id", log.id);

    if (error) return { success: false, msg: "Update failed: " + error.message };

    revalidatePath("/staff/waiter");
    return { success: true };
}