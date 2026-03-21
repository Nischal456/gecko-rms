"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

// --- HELPERS (Not Exported) ---
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

// --- ABSOLUTE BAR ITEM FILTER (Not Exported) ---
function isItemForBar(item: any): boolean {
    const station = String(item.prep_station || item.prepStation || item.station || '').toLowerCase().trim();
    const category = String(item.category || item.dietary || '').toLowerCase().trim();
    const itemName = String(item.name || '').toLowerCase().trim();

    // 1. ABSOLUTE EXCLUSION: If assigned to Kitchen/Food, BAN from Bar immediately.
    if (['kitchen', 'food', 'main'].includes(station)) return false;

    // 2. ABSOLUTE INCLUSION: If assigned to Bar/Coffee/Drinks, ALLOW to Bar immediately.
    if (['bar', 'bot', 'coffee', 'drinks'].includes(station)) return true;

    // 3. STRICT CATEGORY FALLBACK (Only runs if Station is totally empty)
    if (['drinks', 'beverage', 'bar', 'coffee', 'liquor', 'cocktail', 'mocktail', 'hookah'].includes(category)) return true;

    // 4. KEYWORD FALLBACK (Includes 'hukka' for Cloud aHUkka)
    const botKeywords = [
        'hookah', 'hukka', 'shisha', 'cigarette', 'smoke', 'coal', 'cigar',
        'coke', 'sprite', 'fanta', 'pepsi', 'dew', 'red bull', 'sting',
        'mojito', 'beer', 'wine', 'vodka', 'whiskey', 'rum', 'gin', 'tequila', 
        'cocktail', 'mocktail', 'juice', 'shake', 'smoothie', 'water',
        'tea', 'coffee', 'latte', 'espresso', 'americano', 'cappuccino'
    ];

    if (botKeywords.some(keyword => itemName.includes(keyword))) return true;

    return false; 
}

// ============================================================================
// 1. BOT (BAR ORDER TICKET) LOGIC
// ============================================================================

export async function getBartenderTickets() {
  const tenantId = await getTenantId();
  if (!tenantId) return { success: false, data: [] };
  
  const dateStr = new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0];

  try {
    const { data: logs } = await supabaseAdmin
      .from("daily_order_logs")
      .select("date, orders_data")
      .eq("tenant_id", tenantId)
      .gte("date", dateStr); 

    if (!logs || logs.length === 0) return { success: true, data: [] };

    let allOrders: any[] = [];
    logs.forEach((log: any) => {
        allOrders = [...allOrders, ...safeParse(log.orders_data)];
    });

    const activeOrders = allOrders.filter((o: any) => 
        ['pending', 'cooking', 'ready', 'preparing'].includes((o.status || '').toLowerCase().trim())
    );

    const mappedOrders = activeOrders.map((order: any) => {
        let validItems = (order.items || []).filter((item: any) => {
            const s = (item.status || '').toLowerCase().trim();
            if (['void', 'cancelled'].includes(s) || item.qty <= 0) return false;
            return isItemForBar(item);
        });

        // CALCULATE BAR-SPECIFIC STATUS TO PREVENT KANBAN JUMPING
        let barOnlyStatus = 'pending';
        if (validItems.length > 0) {
            const allReady = validItems.every((i: any) => ['ready', 'served', 'cancelled', 'void'].includes((i.status||'').toLowerCase()));
            const anyCooking = validItems.some((i: any) => ['cooking', 'ready', 'preparing'].includes((i.status||'').toLowerCase()));
            if (allReady) barOnlyStatus = 'ready';
            else if (anyCooking) barOnlyStatus = 'cooking';
        } else {
            barOnlyStatus = 'served'; // Hide ticket if there are no bar items
        }

        return {
            id: order.id,
            table_name: order.tbl || order.table_name || "Unknown",
            status: barOnlyStatus, 
            created_at: order.timestamp || order.created_at || new Date().toISOString(),
            order_items: validItems.map((item: any) => ({
                id: item.id || Math.random().toString(36),
                unique_id: item.unique_id || item.cartId || item.id,
                name: item.name,
                quantity: item.qty || item.quantity || 1,
                notes: item.note || item.notes || "",
                variant: item.variant || item.variantName || "",
                status: item.status || 'pending',
                station: item.station || item.prep_station || 'bar',
                category: item.category || item.dietary || 'drinks'
            }))
        };
    }).filter((ticket: any) => ticket.order_items.length > 0 && ticket.status !== 'served'); 

    return { success: true, data: mappedOrders };

  } catch (e) {
    return { success: false, data: [] };
  }
}

export async function updateBartenderTicketStatus(orderId: string, status: string) {
    const tenantId = await getTenantId();
    const targetId = String(orderId).trim();
    const dateStr = new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0];

    const { data: logs } = await supabaseAdmin.from("daily_order_logs").select("date, orders_data").eq("tenant_id", tenantId).gte("date", dateStr);
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
                
                const newItems = (order.items || []).map((i: any) => {
                    const currentItemStatus = (i.status || '').toLowerCase().trim();
                    if (['served', 'cancelled', 'void'].includes(currentItemStatus)) return i;
                    
                    // ONLY UPDATE IF IT IS A BAR ITEM! (Leave kitchen items alone)
                    if (isItemForBar(i)) return { ...i, status };
                    return i; 
                });

                // Safely update overall status to sync correctly with POS/Waiter 
                const allServed = newItems.every((i: any) => ['served', 'cancelled', 'void'].includes((i.status||'').toLowerCase()));
                const allReady = newItems.every((i: any) => ['ready', 'served', 'cancelled', 'void'].includes((i.status||'').toLowerCase()));
                const anyCooking = newItems.some((i: any) => ['cooking', 'ready', 'preparing'].includes((i.status||'').toLowerCase()));
                
                let newOrderStatus = order.status;
                if (allServed) newOrderStatus = 'served';
                else if (allReady) newOrderStatus = 'ready';
                else if (anyCooking && order.status === 'pending') newOrderStatus = 'cooking';

                return { ...order, status: newOrderStatus, items: newItems };
            }
            return order;
        });

        if (found) {
            modifiedOrders = updatedOrders;
            break;
        }
    }

    if (!targetLog || !modifiedOrders) return { success: false };

    await supabaseAdmin.from("daily_order_logs").update({ orders_data: modifiedOrders }).eq("tenant_id", tenantId).eq("date", targetLog.date);
    revalidatePath("/staff/waiter"); revalidatePath("/staff/bartender");
    return { success: true };
}

export async function updateBartenderItemStatus(itemId: string, status: string, orderId: string) {
    const tenantId = await getTenantId();
    const targetOrderId = String(orderId).trim();
    const targetItemId = String(itemId).trim();
    const dateStr = new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0];

    const { data: logs } = await supabaseAdmin.from("daily_order_logs").select("date, orders_data").eq("tenant_id", tenantId).gte("date", dateStr);
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

                const allServed = newItems.every((i: any) => ['served', 'cancelled', 'void'].includes((i.status||'').toLowerCase()));
                const allReady = newItems.every((i: any) => ['ready', 'served', 'cancelled', 'void'].includes((i.status||'').toLowerCase()));
                const anyCooking = newItems.some((i: any) => ['cooking', 'ready', 'preparing'].includes((i.status||'').toLowerCase()));
                
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

    await supabaseAdmin.from("daily_order_logs").update({ orders_data: modifiedOrders }).eq("tenant_id", tenantId).eq("date", targetLog.date);
    revalidatePath("/staff/waiter"); revalidatePath("/staff/bartender");
    return { success: true };
}

// ============================================================================
// 2. REPORTS LOGIC
// ============================================================================

export async function getBartenderStats() {
    const tenantId = await getTenantId();
    if (!tenantId) return { success: false };

    const now = new Date();
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
    
    const datesToCheck = [
        yesterday.toISOString().split('T')[0],
        now.toISOString().split('T')[0],
        tomorrow.toISOString().split('T')[0]
    ];

    const { data: logs } = await supabaseAdmin.from("daily_order_logs").select("orders_data").eq("tenant_id", tenantId).in("date", datesToCheck);

    if (!logs || logs.length === 0) return { success: true, stats: { total: 0, completed: 0, pending: 0, revenue: 0 }, history: [] };

    let allOrders: any[] = [];
    logs.forEach(log => {
        allOrders = [...allOrders, ...safeParse(log.orders_data)];
    });

    const uniqueOrdersMap = new Map();
    allOrders.forEach(o => {
        if (o.id) uniqueOrdersMap.set(o.id, o);
    });
    let finalOrders = Array.from(uniqueOrdersMap.values());

    const twentyFourHoursAgo = now.getTime() - (24 * 60 * 60 * 1000);
    finalOrders = finalOrders.filter(o => {
        const orderTime = new Date(o.timestamp || o.created_at || 0).getTime();
        return orderTime >= twentyFourHoursAgo;
    });

    finalOrders = finalOrders.map(o => {
        const barItems = (o.items || []).filter((item: any) => isItemForBar(item));

        const mappedBarItems = barItems.map((item: any) => ({
            id: item.id || Math.random().toString(36),
            unique_id: item.unique_id || item.cartId || item.id,
            name: item.name,
            qty: item.qty || item.quantity || 1,
            quantity: item.qty || item.quantity || 1, 
            notes: item.note || item.notes || "",
            variant: item.variant || item.variantName || "",
            status: item.status || 'pending',
            price: item.price || 0
        }));

        const barRevenue = mappedBarItems.reduce((acc: number, curr: any) => {
            const itemStatus = (curr.status || '').toLowerCase().trim();
            if (['cancelled', 'void'].includes(itemStatus)) return acc;
            return acc + (Number(curr.price) * Number(curr.quantity));
        }, 0);

        return { ...o, items: mappedBarItems, custom_bar_revenue: barRevenue };
    }).filter(o => o.items.length > 0); 
    
    const completed = finalOrders.filter((o: any) => {
        return o.items.every((i: any) => {
            const s = (i.status || '').toLowerCase().trim();
            return ['ready', 'served', 'completed', 'paid', 'cancelled', 'void'].includes(s);
        });
    });
    
    const pending = finalOrders.filter((o: any) => {
        return o.items.some((i: any) => {
            const s = (i.status || '').toLowerCase().trim();
            return ['pending', 'cooking', 'preparing'].includes(s);
        });
    });
    
    const revenue = completed.reduce((acc: number, curr: any) => {
        return acc + (Number(curr.custom_bar_revenue) || 0);
    }, 0);

    const history = finalOrders
        .sort((a,b) => new Date(b.timestamp || b.created_at || 0).getTime() - new Date(a.timestamp || a.created_at || 0).getTime())
        .slice(0, 100)
        .map((order: any) => {
            let displayStatus = 'pending';
            const allDone = order.items.every((i: any) => ['ready', 'served', 'completed', 'paid', 'cancelled', 'void'].includes((i.status || '').toLowerCase().trim()));
            if (allDone) {
                displayStatus = 'ready';
            } else {
                const anyCooking = order.items.some((i: any) => ['cooking', 'preparing'].includes((i.status || '').toLowerCase().trim()));
                if (anyCooking) displayStatus = 'cooking';
            }

            return {
                id: order.id,
                table_name: order.tbl || order.table_name || "Unknown",
                created_at: order.timestamp || order.created_at || new Date().toISOString(),
                status: displayStatus,
                order_items: order.items 
            };
        });

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