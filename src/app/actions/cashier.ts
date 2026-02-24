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

// --- 1. GET CASHIER DATA ---
export async function getCashierData() {
  const tenantId = await getTenantId();
  const today = new Date().toISOString().split('T')[0];

  try {
    const { data: tenant } = await supabaseAdmin.from("tenants").select("*").eq("id", tenantId).single();
    const { data: tables } = await supabaseAdmin.from("restaurant_tables").select("*").eq("tenant_id", tenantId).order("label", { ascending: true });
    
    const { data: log } = await supabaseAdmin
        .from("daily_order_logs")
        .select("orders_data, paid_history")
        .eq("tenant_id", tenantId)
        .eq("date", today)
        .maybeSingle();

    const { data: optimizedMenu } = await supabaseAdmin
        .from("menu_optimized")
        .select("category_name, items")
        .eq("tenant_id", tenantId);

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

    const activeOrders = safeParse(log?.orders_data);
    const paidHistory = safeParse(log?.paid_history);

    let totalRevenue = 0;
    let pendingBills = 0;
    const tableOrderMap = new Map();

    paidHistory.forEach((bill: any) => {
        if(bill.grandTotal) totalRevenue += Number(bill.grandTotal);
    });

    activeOrders.forEach((order: any) => {
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

    for (const [tbl, existing] of tableOrderMap.entries()) {
        const validItems = existing.items.filter((i:any) => !['cancelled', 'void'].includes(i.status) && i.qty > 0);
        const hasReady = validItems.some((i:any) => i.status === 'ready');
        const hasCooking = validItems.some((i:any) => ['cooking', 'pending'].includes(i.status));
        
        if (hasReady) existing.status = 'ready'; 
        else if (hasCooking) existing.status = 'cooking';
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

    const profile = {
      name: tenant?.settings?.profile?.name || tenant?.name,
      code: tenant?.code,
      address: tenant?.settings?.profile?.address || tenant?.address,
      phone: tenant?.settings?.profile?.phone || tenant?.phone,
      logo_url: tenant?.logo_url,
      bank_accounts: tenant?.settings?.bank_accounts || [] 
    };

    return {
      success: true,
      restaurant: profile,
      stats: { totalRevenue, pendingBills },
      tables: richTables,
      menu: flatMenu, 
      categories: categories, 
      activeOrders: Array.from(tableOrderMap.values()).reverse()
    };
  } catch (error) {
    return { success: false, activeOrders: [] };
  }
}

// --- 2. CREATE ORDER ---
export async function createCashierOrder(tableId: string, items: any[], type: 'dine_in' | 'takeaway') {
    const tenantId = await getTenantId();
    const today = new Date().toISOString().split('T')[0];
    
    const compactItems = items.map((i: any) => ({
        id: i.id, 
        unique_id: `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        name: i.name, 
        price: i.price, 
        qty: i.qty,
        variant: i.variantName || "", 
        note: i.note || "", 
        status: "pending"             
    }));
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
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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

    revalidatePath("/staff/cashier");
    return { success: true };
}

// --- 3. CANCEL ORDER (TYPE COERCION FIX) ---
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
                    
                    if (itemIdToCancel) {
                        found = true;
                        foundDate = log.date;
                        let amountToDeduct = 0;
                        let itemCancelled = false; 
                        
                        const newItems = order.items.map((i:any) => {
                            // CRITICAL FIX: Wrap in String() to prevent 123 === "123" failure
                            const sig = String(i.unique_id || i.id || `${i.name}||${i.variant || ''}`).trim();
                            const targetSig = String(itemIdToCancel).trim();
                            const safeStatus = (i.status || '').toLowerCase().trim();

                            if (sig === targetSig && safeStatus === 'pending' && !itemCancelled) {
                                itemCancelled = true;
                                amountToDeduct += (Number(i.price) * Number(i.qty));
                                return { ...i, status: 'cancelled' };
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
                        const isFullyPending = order.items.every((i:any) => ['pending', 'cancelled', 'void'].includes((i.status || '').toLowerCase().trim()));
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
            return { success: false, error: "Could not cancel. Item might be cooking or already served." };
        }

        await supabaseAdmin.from("daily_order_logs").update({ orders_data: modifiedOrders }).eq("tenant_id", tenantId).eq("date", foundDate);
        
        if (!tableLabel.startsWith("TAKEAWAY")) {
            const remainingActive = modifiedOrders.some((o:any) => o.tbl === tableLabel && !['cancelled', 'paid', 'completed'].includes(o.status));
            if(!remainingActive) {
                await supabaseAdmin.from("restaurant_tables").update({ status: 'free' }).eq("label", tableLabel).eq("tenant_id", tenantId);
            }
        }

        revalidatePath("/staff/cashier");
        return { success: true };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// --- 4. SERVE ORDER (TYPE COERCION FIX) ---
export async function serveOrder(orderId: string | number, tableLabel?: string, itemIdentifiers?: string[]) {
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

        // Force itemIdentifiers into strings just in case
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

                            if (isItemMatch && safeStatus === 'ready') {
                                return { ...i, status: 'served' };
                            }
                        } 
                        else if (safeStatus === 'ready') {
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

        const { error } = await supabaseAdmin
            .from("daily_order_logs")
            .update({ orders_data: modifiedOrders })
            .eq("tenant_id", tenantId)
            .eq("date", foundDate); 

        if (error) {
            return { success: false, error: error.message };
        }

        revalidatePath("/staff/cashier");
        return { success: true };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// --- 5. FINALIZE (Checkout) ---
export async function finalizeTransaction(tableId: string, orderId: string, paymentMethod: string, amount: number, tenantInfo: any, customerDetails?: any) {
    const tenantId = await getTenantId();
    const today = new Date().toISOString().split('T')[0];
    
    const { data: log } = await supabaseAdmin.from("daily_order_logs").select("orders_data, paid_history").eq("tenant_id", tenantId).eq("date", today).maybeSingle();
    if (!log) return { success: false, error: "Log not found" };

    const currentOrders = safeParse(log.orders_data);
    const currentHistory = safeParse(log.paid_history);
    const remainingOrders: any[] = [];
    const newHistoryItems: any[] = [];
    let found = false;

    currentOrders.forEach((order: any) => {
        if (order.tbl === tableId && !['cancelled', 'completed', 'paid'].includes(order.status)) {
            found = true;
            const displayBillNo = order.bill_no || order.id.slice(-6).toUpperCase();

            newHistoryItems.push({
                invoice_no: displayBillNo,
                bill_no: displayBillNo, 
                date: new Date().toISOString(),
                table_no: tableId,
                restaurant_name: tenantInfo?.name,
                items: order.items,
                grandTotal: amount, 
                payment_method: paymentMethod,
                served_by: order.staff || "Cashier",
                paid_at: new Date().toISOString(),
                original_order_id: order.id,
                customer_name: customerDetails?.name || "",
                customer_address: customerDetails?.address || ""
            });
        } else {
            remainingOrders.push(order);
        }
    });

    if(!found) return { success: false, error: "No active orders." };

    await supabaseAdmin.from("daily_order_logs").update({ 
        orders_data: remainingOrders, 
        paid_history: [...currentHistory, ...newHistoryItems] 
    }).eq("tenant_id", tenantId).eq("date", today);

    if (!tableId.startsWith("TAKEAWAY")) {
        await supabaseAdmin.from("restaurant_tables").update({ status: 'free' }).eq("label", tableId).eq("tenant_id", tenantId);
    }
    
    revalidatePath("/staff/cashier");
    return { success: true };
}

// --- 6. SETTINGS ---
export async function updateStoreSettings(profile: any, accounts: any[]) {
    const tenantId = await getTenantId();
    const { data: tenant } = await supabaseAdmin.from("tenants").select("settings").eq("id", tenantId).single();
    await supabaseAdmin.from("tenants").update({ settings: { ...(tenant?.settings || {}), profile, bank_accounts: accounts } }).eq("id", tenantId);
    revalidatePath("/staff/cashier");
    return { success: true };
}

// --- 7. REPORTS ---
export async function getCashierReports(days: number) {
    const tenantId = await getTenantId();
    const startDate = new Date(); startDate.setDate(startDate.getDate() - days);
    const startStr = startDate.toISOString().split('T')[0];

    try {
        const { data: logs } = await supabaseAdmin.from("daily_order_logs").select("*").eq("tenant_id", tenantId).gte("date", startStr).order("date", { ascending: true });
        if (!logs) return { success: true, bills: [], summary: {}, chartData: [] };

        const allBills: any[] = [];
        const summary: any = { total: 0, count: 0, byMethod: {}, byStaff: {} };
        const chartData: any[] = [];

        logs.forEach((log: any) => {
            const history = safeParse(log.paid_history);
            let dailyTotal = 0;
            history.forEach((bill: any) => {
                if(bill && bill.grandTotal) {
                    allBills.push(bill);
                    const amt = Number(bill.grandTotal);
                    dailyTotal += amt;
                    summary.total += amt;
                    summary.count++;
                    const method = bill.payment_method || "Cash";
                    if(summary.byMethod[method]) summary.byMethod[method] += amt; else summary.byMethod[method] = amt;
                    const staff = bill.served_by || "Cashier";
                    if(summary.byStaff[staff]) summary.byStaff[staff] += amt; else summary.byStaff[staff] = amt;
                }
            });
            chartData.push({ label: log.date, value: dailyTotal });
        });
        return { success: true, bills: allBills.reverse(), summary, chartData };
    } catch (e) { return { success: false }; }
}