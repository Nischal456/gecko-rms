"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { getKathmanduDateString } from "@/lib/utils";
import { getActiveBusinessDate } from "@/app/actions/business-date";

// --- HELPERS (Not Exported) ---
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

// --- ABSOLUTE BAR ITEM FILTER (Not Exported) ---
// If split is active, the kitchen uses this to EXCLUDE these items.
function isItemForBar(item: any): boolean {
    const station = String(item.prep_station || item.prepStation || item.station || '').toLowerCase().trim();
    const category = String(item.category || item.dietary || '').toLowerCase().trim();
    const itemName = String(item.name || '').toLowerCase().trim();

    // 1. ABSOLUTE EXCLUSION: If assigned to Kitchen/Food, it is NOT for Bar.
    if (['kitchen', 'food', 'main'].includes(station)) return false;

    // 2. ABSOLUTE INCLUSION: If assigned to Bar/Coffee/Drinks, it IS for Bar.
    if (['bar', 'bot', 'coffee', 'drinks'].includes(station)) return true;
    
    // 3. STRICT CATEGORY FALLBACK
    if (['drinks', 'beverage', 'bar', 'coffee', 'liquor', 'cocktail', 'mocktail', 'hookah'].includes(category)) return true;

    // 4. KEYWORD FALLBACK
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
// 1. KDS BOARD LOGIC 
// ============================================================================

export async function getKitchenTickets() {
  const tenantId = await getTenantId();
  if (!tenantId) return { success: false, data: [] };
  
  const getCachedData = unstable_cache(
    async () => {
      const dateStr = getKathmanduDateString(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

      try {
        const { data: tenant } = await supabaseAdmin.from('tenants').select('feature_flags').eq('id', tenantId).single();
        const isSplitActive = tenant?.feature_flags?.split_kot_bot === true;

        const { data: logs } = await supabaseAdmin.from("daily_order_logs").select("date, orders_data").eq("tenant_id", tenantId).gte("date", dateStr); 

        if (!logs || logs.length === 0) return { success: true, data: [] };

        let allOrders: any[] = [];
        logs.forEach((log: any) => { allOrders = [...allOrders, ...safeParse(log.orders_data)]; });

        const activeOrders = allOrders.filter((o: any) => ['pending', 'cooking', 'ready', 'preparing'].includes((o.status || '').toLowerCase().trim()));

        const mappedOrders = activeOrders.map((order: any) => {
            let validItems = (order.items || []).filter((item: any) => {
                const s = (item.status || '').toLowerCase().trim();
                if (['void', 'cancelled'].includes(s) || item.qty <= 0) return false;

                // Strict exclusion for the kitchen IF SPLIT IS ON
                if (isSplitActive && isItemForBar(item)) return false;

                return true; 
            });

            // CALCULATE KITCHEN-SPECIFIC STATUS TO PREVENT KANBAN JUMPING
            let kitOnlyStatus = 'pending';
            if (validItems.length > 0) {
                const allReady = validItems.every((i: any) => ['ready', 'served', 'cancelled', 'void'].includes((i.status || '').toLowerCase()));
                const anyCooking = validItems.some((i: any) => ['cooking', 'ready', 'preparing'].includes((i.status || '').toLowerCase()));
                if (allReady) kitOnlyStatus = 'ready';
                else if (anyCooking) kitOnlyStatus = 'cooking';
            } else {
                kitOnlyStatus = 'served'; // Hide ticket if there are no kitchen items
            }

            return {
                id: order.id,
                table_name: order.tbl || order.table_name || "Unknown",
                status: kitOnlyStatus, 
                created_at: order.timestamp || order.created_at || new Date().toISOString(),
                order_items: validItems.map((item: any) => ({
                    id: item.id || Math.random().toString(36),
                    unique_id: item.unique_id || item.cartId || item.id, 
                    name: item.name,
                    quantity: item.qty || item.quantity || 1,
                    notes: item.note || item.notes || "",
                    variant: item.variant || item.variantName || "",
                    status: item.status || "pending",
                    station: item.station || "kitchen",
                    prep_station: item.prep_station || "kitchen"
                }))
            };
        }).filter((ticket: any) => ticket.order_items.length > 0 && ticket.status !== 'served'); 

        // Gather cancellations from the last 2 hours
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).getTime();
        const cancellations: any[] = [];

        allOrders.forEach((order: any) => {
            const orderStatus = (order.status || '').toLowerCase().trim();
            const items = order.items || [];
            
            // Check if entire order was cancelled
            if (orderStatus === 'cancelled') {
                const cancelledTime = order.timestamp || order.created_at || new Date().toISOString();
                if (new Date(cancelledTime).getTime() > twoHoursAgo) {
                    cancellations.push({
                        type: 'order',
                        orderId: order.id,
                        tableName: order.tbl || order.table_name || "Unknown",
                        cancelledAt: cancelledTime,
                        reason: order.cancel_reason || 'Round Cancelled',
                        by: order.cancelled_by || 'Waiter',
                        itemsCount: items.length
                    });
                }
            } else {
                // Check for individual cancelled items
                items.forEach((item: any) => {
                    const itemStatus = (item.status || '').toLowerCase().trim();
                    if (itemStatus === 'cancelled' && item.cancelled_at) {
                        if (new Date(item.cancelled_at).getTime() > twoHoursAgo) {
                            cancellations.push({
                                type: 'item',
                                orderId: order.id,
                                itemId: item.unique_id || item.cartId || item.id,
                                tableName: order.tbl || order.table_name || "Unknown",
                                name: item.name,
                                quantity: item.qty || 1,
                                variant: item.variant || item.variantName || "",
                                notes: item.note || item.notes || "",
                                cancelledAt: item.cancelled_at,
                                reason: item.cancel_reason || 'No reason provided',
                                by: item.cancelled_by || 'Waiter'
                            });
                        }
                    }
                });
            }
        });

        const businessDate = await getActiveBusinessDate(tenantId);
        return { 
            success: true, 
            data: mappedOrders, 
            cancellations: cancellations.sort((a, b) => new Date(b.cancelledAt).getTime() - new Date(a.cancelledAt).getTime()),
            businessDate
        };
      } catch (e) { return { success: false, data: [], cancellations: [] }; }
    },
    [`kitchen-tickets-${tenantId}-v2`],
    { tags: [`orders-${tenantId}`], revalidate: 3600 }
  );

  return getCachedData();
}

export async function updateTicketStatus(orderId: string, status: string) {
    const tenantId = await getTenantId();
    const targetId = String(orderId).trim();
    const dateStr = getKathmanduDateString(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

    const { data: tenant } = await supabaseAdmin.from('tenants').select('feature_flags').eq('id', tenantId).single();
    const isSplitActive = tenant?.feature_flags?.split_kot_bot === true;

    const { data: logs } = await supabaseAdmin.from("daily_order_logs").select("date, orders_data").eq("tenant_id", tenantId).gte("date", dateStr);
    if (!logs) return { success: false };

    let targetLog: any = null;
    let modifiedOrders = null;

    for (const log of logs) {
        const currentOrders = safeParse(log.orders_data);
        let found = false;

        const updatedOrders = currentOrders.map((order: any) => {
            if (String(order.id || '').trim() === targetId) {
                found = true; targetLog = log;
                
                const newItems = (order.items || []).map((i: any) => {
                    const currentItemStatus = (i.status || '').toLowerCase().trim();
                    if (['served', 'cancelled', 'void'].includes(currentItemStatus)) return i;
                    
                    // ONLY UPDATE IF IT IS A KITCHEN ITEM! (Leave bar items alone if split is active)
                    if (isSplitActive && isItemForBar(i)) return i; 
                    
                    return { ...i, status };
                });
                
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
    revalidateTag(`orders-${tenantId}`, undefined as any);
    revalidatePath("/staff/waiter"); revalidatePath("/staff/cashier");
    return { success: true };
}

export async function updateItemStatus(itemId: string, status: string, orderId: string) {
    const tenantId = await getTenantId();
    const targetOrderId = String(orderId).trim();
    const targetItemId = String(itemId).trim();
    const dateStr = getKathmanduDateString(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

    const { data: logs } = await supabaseAdmin.from("daily_order_logs").select("date, orders_data").eq("tenant_id", tenantId).gte("date", dateStr);
    if (!logs) return { success: false };

    let targetLog: any = null;
    let modifiedOrders = null;

    for (const log of logs) {
        const currentOrders = safeParse(log.orders_data);
        let found = false;

        const updatedOrders = currentOrders.map((order: any) => {
            if (String(order.id || '').trim() === targetOrderId) {
                found = true; targetLog = log;
                
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

        if (found) { modifiedOrders = updatedOrders; break; }
    }

    if (!targetLog || !modifiedOrders) return { success: false };

    await supabaseAdmin.from("daily_order_logs").update({ orders_data: modifiedOrders }).eq("tenant_id", tenantId).eq("date", targetLog.date);
    revalidateTag(`orders-${tenantId}`, undefined as any);
    revalidatePath("/staff/waiter"); revalidatePath("/staff/cashier");
    return { success: true };
}

// ============================================================================
// 2. MENU MANAGER 
// ============================================================================

export async function getKitchenMenu() {
    const tenantId = await getTenantId();
    
    const getCachedMenu = unstable_cache(
      async () => {
        const { data, error } = await supabaseAdmin.from("menu_items").select("id, name, price, category, is_available").eq("tenant_id", tenantId).order("category", { ascending: true });
        return { success: !error, data: data || [] };
      },
      [`kitchen-menu-${tenantId}`],
      { tags: [`menu-${tenantId}`], revalidate: 3600 }
    );
    
    return getCachedMenu();
}

export async function toggleMenuItem(itemId: number, isAvailable: boolean) {
    const tenantId = await getTenantId();
    const { error } = await supabaseAdmin.from("menu_items").update({ is_available: isAvailable }).eq("id", itemId).eq("tenant_id", tenantId);
    if (error) return { success: false };
    revalidateTag(`menu-${tenantId}`, undefined as any);
    revalidatePath("/staff/kitchen/menu"); revalidatePath("/staff/menu"); 
    return { success: true };
}

export async function disableMenuItem(itemName: string) {
    const tenantId = await getTenantId();
    const { error } = await supabaseAdmin.from("menu_items").update({ is_available: false }).eq("tenant_id", tenantId).eq("name", itemName);
    if (error) return { success: false, error: error.message };
    revalidateTag(`menu-${tenantId}`, undefined as any);
    revalidatePath("/staff/menu"); return { success: true };
}

async function getStaffMember(tenantId: number, staff: { id: string, name: string }) {
    let query = supabaseAdmin.from("staff").select("*").eq("tenant_id", tenantId);
    
    // Check if staff.id is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (staff.id && uuidRegex.test(staff.id)) {
        query = query.eq("id", staff.id);
    } else {
        query = query.eq("full_name", staff.name);
    }
    
    const { data, error } = await query.maybeSingle();
    if (error) console.error("Error looking up staff member:", error);
    return data;
}

export async function getKitchenStats() {
    const tenantId = await getTenantId();
    if (!tenantId) return { success: false };
    
    const getCachedStats = unstable_cache(
      async () => {
        const { data: tenant } = await supabaseAdmin.from('tenants').select('feature_flags').eq('id', tenantId).single();
        const isSplitActive = tenant?.feature_flags?.split_kot_bot === true;

        const datesToCheck = [
            getKathmanduDateString(new Date(Date.now() - 24 * 60 * 60 * 1000)),
            getKathmanduDateString(),
            getKathmanduDateString(new Date(Date.now() + 24 * 60 * 60 * 1000))
        ];

        const { data: logs } = await supabaseAdmin.from("daily_order_logs").select("orders_data, paid_history").eq("tenant_id", tenantId).in("date", datesToCheck);

        if (!logs || logs.length === 0) return { success: true, stats: { total: 0, completed: 0, pending: 0, revenue: 0 }, history: [] };

        let allOrders: any[] = [];
        logs.forEach(log => { 
            const active = safeParse(log.orders_data) || [];
            let paid = [];
            try {
                if (typeof log.paid_history === 'string') paid = JSON.parse(log.paid_history);
                else if (Array.isArray(log.paid_history)) paid = log.paid_history;
            } catch(e) {}
            
            const normalizedPaid = paid.map((p: any) => ({
                ...p,
                id: p.id || p.invoice_no || `paid-${Date.now()}-${Math.random()}`,
                timestamp: p.timestamp || p.date || new Date(p.serverTimestamp || Date.now()).toISOString(),
                status: p.status || 'paid',
                table_name: p.table_name || p.table_no
            }));

            allOrders = [...allOrders, ...active, ...normalizedPaid]; 
        });

        const uniqueOrdersMap = new Map();
        allOrders.forEach(o => { if (o.id) uniqueOrdersMap.set(o.id, o); });
        let finalOrders = Array.from(uniqueOrdersMap.values());

        const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
        finalOrders = finalOrders.filter(o => new Date(o.timestamp || o.created_at || 0).getTime() >= twentyFourHoursAgo);

        if (isSplitActive) {
            finalOrders = finalOrders.map(o => {
                const foodItems = (o.items || []).filter((item: any) => !isItemForBar(item));

                const foodRevenue = foodItems.reduce((acc: number, curr: any) => {
                    const itemStatus = (curr.status || '').toLowerCase().trim();
                    if (['cancelled', 'void'].includes(itemStatus)) return acc;
                    
                    const price = Number(curr.price) || 0;
                    const qty = Number(curr.qty || curr.quantity) || 1;
                    return acc + (price * qty);
                }, 0);

                return { ...o, items: foodItems, custom_food_revenue: foodRevenue };
            }).filter(o => o.items.length > 0); 
        }
        
        const historyOrders = finalOrders.filter((o: any) => {
            const s = (o.status || '').toLowerCase().trim();
            return ['ready', 'served', 'payment_pending', 'paid', 'completed', 'cancelled', 'void'].includes(s);
        });

        const successfulOrders = historyOrders.filter((o: any) => {
            const s = (o.status || '').toLowerCase().trim();
            return !['cancelled', 'void'].includes(s);
        });
        
        const pending = finalOrders.filter((o: any) => {
            const s = (o.status || '').toLowerCase().trim();
            return ['pending', 'cooking', 'preparing'].includes(s);
        });
        
        const revenue = successfulOrders.reduce((acc: number, curr: any) => {
            const amountToCount = isSplitActive && curr.custom_food_revenue !== undefined ? curr.custom_food_revenue : curr.total;
            return acc + (Number(amountToCount) || 0);
        }, 0);

        const history = historyOrders
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
                completed: successfulOrders.length,
                pending: pending.length,
                revenue: revenue
            },
            history: history
        };
      },
      [`kitchen-stats-v2-${tenantId}`],
      { tags: [`orders-${tenantId}`], revalidate: 3600 }
    );
    
    const cachedData = await getCachedStats();

    // DYNAMIC STAFF DATA FETCH (OUTSIDE CACHE)
    let payroll: any[] = [];
    let leaves: any[] = [];
    try {
        const cookieStore = await cookies();
        const staffCookie = cookieStore.get("gecko_staff_token")?.value;
        if (staffCookie) {
            const staff = JSON.parse(staffCookie);
            const staffMember = await getStaffMember(tenantId, staff);

            if (staffMember) {
                // Fetch payroll history
                const { data: dbPayments } = await supabaseAdmin
                    .from("staff_payments")
                    .select("*")
                    .eq("staff_id", staffMember.id)
                    .order("payment_date", { ascending: false });

                if (dbPayments) {
                    payroll = dbPayments.map((pay: any) => ({
                        id: pay.id,
                        staff_name: staffMember.full_name,
                        payment_date: pay.payment_date,
                        amount: Number(pay.amount) || 0
                    }));
                }

                // Fetch leaves
                const { data: dbLeaves } = await supabaseAdmin
                    .from("staff_leaves")
                    .select("*")
                    .eq("staff_id", staffMember.id)
                    .order("start_date", { ascending: false });

                if (dbLeaves) {
                    leaves = dbLeaves.map((leave: any) => {
                        let leaveType = 'Leave';
                        let displayReason = leave.reason || '';
                        if (leave.reason && leave.reason.startsWith('[')) {
                            const closingBracket = leave.reason.indexOf(']');
                            if (closingBracket > 0) {
                                leaveType = leave.reason.slice(1, closingBracket);
                                displayReason = leave.reason.slice(closingBracket + 1).trim();
                            }
                        }
                        return {
                            id: leave.id,
                            status: leave.status || 'pending',
                            type: leaveType,
                            from: leave.start_date,
                            to: leave.end_date,
                            reason: displayReason,
                            date_applied: leave.created_at ? leave.created_at.split('T')[0] : (leave.start_date || '')
                        };
                    });
                }
            }
        }
    } catch (e) {
        console.error("Error fetching kitchen staff reports context:", e);
    }

    return {
        ...cachedData,
        payroll,
        leaves
    };
}

// --- LEGACY ---
export async function getKitchenData() { return getKitchenTickets(); }