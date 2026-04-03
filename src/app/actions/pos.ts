"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

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

// --- 1. GET LIVE STATS (SELF-HEALING + ORDERS LIST) ---
export async function getPOSStats() {
  const tenantId = await getTenantId();

  const getCachedPOSStats = unstable_cache(
    async () => {
      const today = new Date().toISOString().split('T')[0];

      try {
          const { data: tables } = await supabaseAdmin
              .from("restaurant_tables")
              .select("id, label, status, section, shape, seats, x, y, width, height, rotation") 
              .eq("tenant_id", tenantId)
              .order("label", { ascending: true });

          const { data: logs } = await supabaseAdmin
              .from("daily_order_logs")
              .select("orders_data")
              .eq("tenant_id", tenantId)
              .eq("date", today)
              .limit(1)
              .maybeSingle();

          const orders = logs && Array.isArray(logs.orders_data) ? logs.orders_data : [];
          
          const activeOrders = orders.filter((o: any) => 
              !['cancelled', 'completed', 'paid'].includes(o.status)
          );
          
          const activeTableLabels = new Set(activeOrders.map((o: any) => o.tbl));

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
    },
    [`pos-stats-${tenantId}-v2`],
    { tags: [`orders-${tenantId}`, `tables-${tenantId}`], revalidate: 3600 }
  );

  return getCachedPOSStats();
}

// --- 2. GET MENU ---
export async function getPOSMenu() {
  const tenantId = await getTenantId();
  
  const getCachedPOSMenu = unstable_cache(
    async () => {
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
    },
    [`pos-menu-${tenantId}-v2`],
    { tags: [`menu-${tenantId}`], revalidate: 3600 }
  );

  return getCachedPOSMenu();
}

// --- 3. GET POS DATA ---
export async function getPOSData() {
    try {
        const [menu, stats] = await Promise.all([getPOSMenu(), getPOSStats()]);
        const tables = stats.stats?.tables.map((t: any) => ({
            ...t,
            name: t.label 
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

// --- 4. SUBMIT ORDER ---
export async function submitOrder(tableId: string, cartItems: any[], total: number) {
    const tenantId = await getTenantId();
    const todayStr = new Date().toISOString().split('T')[0];

    // 3-Day Window for finding existing pending orders
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const datesToCheck = [
        yesterday.toISOString().split('T')[0],
        todayStr,
        tomorrow.toISOString().split('T')[0]
    ];

    const isTakeaway = tableId.startsWith("TAKEAWAY");

    let staffName = "Server";
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("gecko_staff_token")?.value;
        if (token) staffName = JSON.parse(token).name;
    } catch (e) {}

    // --- CRITICAL FIX: SECURE METADATA FALLBACK ---
    // Look up live menu to guarantee station arrays even if client drops payload
    const { data: menuData } = await supabaseAdmin.from("menu_optimized").select("items").eq("tenant_id", tenantId);
    const liveMenu = new Map();
    if (menuData) {
        menuData.forEach((cat: any) => {
            if (Array.isArray(cat.items)) {
                cat.items.forEach((m: any) => liveMenu.set(m.name, m));
            }
        });
    }

    const compactItems = cartItems.map((i: any) => {
        const dbItem = liveMenu.get(i.name) || {};
        return {
            id: i.id || dbItem.id || "",
            unique_id: `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
            name: i.name,
            price: i.price,
            qty: i.qty,
            variant: i.variantName || i.variant || "",
            note: i.note || i.notes || "",
            status: "pending",
            time_added: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            // Pass these through securely so the Server Actions (Kitchen/Bar) know where to route them!
            station: dbItem.station || i.station || i.prep_station || "kitchen",
            category: dbItem.category_name || dbItem.category || i.category || "",
            dietary: dbItem.dietary || i.dietary || ""
        };
    });

    try {
        const { data: logs } = await supabaseAdmin
            .from("daily_order_logs")
            .select("date, orders_data")
            .eq("tenant_id", tenantId)
            .in("date", datesToCheck);

        let orderAppended = false;
        let targetDate = todayStr;
        let finalOrdersForTargetDate: any[] = [];

        // 1. Try to append to an existing pending order for the same table (Dine In only)
        if (!isTakeaway && logs && logs.length > 0) {
            for (const log of logs) {
                const currentOrders = safeParse(log.orders_data);
                let foundInThisLog = false;

                const updatedOrders = currentOrders.map((order: any) => {
                    if (order.tbl === tableId && order.status === 'pending') {
                        foundInThisLog = true;
                        orderAppended = true;
                        targetDate = log.date;
                        return {
                            ...order,
                            items: [...order.items, ...compactItems],
                            total: Number(order.total) + total,
                            timestamp: new Date().toISOString()
                        };
                    }
                    return order;
                });

                if (foundInThisLog) {
                    finalOrdersForTargetDate = updatedOrders;
                    break;
                }
            }
        }

        // 2. If no pending order to append to, create a brand new order in TODAY's log
        if (!orderAppended) {
            const orderId = Date.now().toString(36).toUpperCase();
            const type = isTakeaway ? 'takeaway' : 'dine_in';
            const finalTableId = isTakeaway ? `TAKEAWAY-${orderId.slice(-4)}` : tableId;

            const newOrder = {
                id: orderId,
                tbl: finalTableId,
                items: compactItems,
                total: total,
                status: 'pending',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                staff: staffName,
                type,
                timestamp: new Date().toISOString()
            };

            const todayLog = logs?.find(l => l.date === todayStr);
            const existingTodayOrders = safeParse(todayLog?.orders_data);
            finalOrdersForTargetDate = [...existingTodayOrders, newOrder];
            targetDate = todayStr;

            if (type === 'dine_in') {
                await supabaseAdmin.from("restaurant_tables").update({ status: 'occupied' }).eq("label", finalTableId).eq("tenant_id", tenantId);
            }
        }

        // 3. Save the log 
        const { error: upsertError } = await supabaseAdmin.from("daily_order_logs").upsert({
            tenant_id: tenantId,
            date: targetDate,
            orders_data: finalOrdersForTargetDate
        }, { onConflict: 'tenant_id, date' });

        if (upsertError) throw upsertError;

        revalidateTag(`orders-${tenantId}`, undefined as any);
        revalidatePath("/staff/waiter");
        revalidatePath("/staff/cashier");
        return { success: true };
    } catch (e: any) {
        console.error("Submit Order Error:", e);
        return { success: false, msg: e.message };
    }
}

// --- 5. MODIFY ORDER ---
export async function modifyOrder(orderId: string, updatedItems: any[], newTotal: number) {
    const tenantId = await getTenantId();
    const targetId = String(orderId).trim();
    
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

        if (!logs || logs.length === 0) return { success: false, msg: "No logs found" };

        // Fetch live menu for secure metadata fallback (Bypass Cache explicitly)
        const { data: menuData } = await supabaseAdmin.from("menu_optimized").select("items").eq("tenant_id", tenantId);
        const liveMenu = new Map();
        if (menuData) {
            menuData.forEach((cat: any) => {
                if (Array.isArray(cat.items)) {
                    cat.items.forEach((m: any) => liveMenu.set(m.name, m));
                }
            });
        }

        let foundDate = null;
        let modifiedOrders = null;

        for (const log of logs) {
            const currentOrders = safeParse(log.orders_data);
            let found = false;

            const updatedOrders = currentOrders.map((order: any) => {
                if (String(order.id || "").trim() === targetId) {
                    found = true;
                    foundDate = log.date; 
                    
                    // CRITICAL FIX: Secure metadata mapping with DB fallback
                    const itemsWithStatus = updatedItems.map(item => {
                        const dbItem = liveMenu.get(item.name) || {};
                        return {
                            ...item,
                            unique_id: item.unique_id || item.cartId || `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
                            status: item.status || 'pending',
                            time_added: item.time_added || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            station: dbItem.station || item.station || item.prep_station || "kitchen",
                            category: dbItem.category_name || dbItem.category || item.category || "",
                            dietary: dbItem.dietary || item.dietary || ""
                        };
                    });

                    // Recalculate parent status dynamically
                    const hasPending = itemsWithStatus.some((i:any) => (i.status||'').toLowerCase().trim() === 'pending');
                    const hasCooking = itemsWithStatus.some((i:any) => (i.status||'').toLowerCase().trim() === 'cooking');
                    const hasReady = itemsWithStatus.some((i:any) => (i.status||'').toLowerCase().trim() === 'ready');
                    
                    let newStatus = 'payment_pending';
                    if (hasReady) newStatus = 'ready';
                    else if (hasCooking) newStatus = 'cooking';
                    else if (hasPending) newStatus = 'pending';

                    return { 
                        ...order, 
                        items: itemsWithStatus, 
                        total: newTotal,
                        status: newStatus,
                        timestamp: new Date().toISOString()
                    };
                }
                return order;
            });

            if (found) {
                modifiedOrders = updatedOrders;
                break; 
            }
        }

        if (!foundDate || !modifiedOrders) {
            return { success: false, msg: "Order not found. It may be from an older session." };
        }

        await supabaseAdmin
            .from("daily_order_logs")
            .update({ orders_data: modifiedOrders })
            .eq("tenant_id", tenantId)
            .eq("date", foundDate); 

        revalidateTag(`orders-${tenantId}`, undefined as any);
        revalidatePath("/staff/waiter");
        revalidatePath("/staff/cashier");
        return { success: true };

    } catch (e: any) {
        return { success: false, msg: e.message };
    }
}