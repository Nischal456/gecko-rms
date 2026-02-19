"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

// --- HELPERS (Synced with Waiter.ts) ---
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
      // Handle double-stringification edge cases
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

// --- 1. GET CASHIER DATA ---
export async function getCashierData() {
  const tenantId = await getTenantId();
  const today = new Date().toISOString().split('T')[0];

  try {
    const { data: tenant } = await supabaseAdmin.from("tenants").select("*").eq("id", tenantId).single();
    const { data: tables } = await supabaseAdmin.from("restaurant_tables").select("*").eq("tenant_id", tenantId).order("label", { ascending: true });
    
    // Fetch latest log by composite key (tenant_id + date)
    const { data: log } = await supabaseAdmin
        .from("daily_order_logs")
        .select("orders_data, paid_history")
        .eq("tenant_id", tenantId)
        .eq("date", today)
        .maybeSingle();

    // --- FETCH MENU ---
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
              // Merge logic for display if multiple orders exist for one table
              const existing = tableOrderMap.get(order.tbl);
              existing.items = [...existing.items, ...order.items];
              existing.total = Number(existing.total) + Number(order.total);
              
              // Status Priority: Ready > Cooking > Pending
              const statusPriority = { 'ready': 4, 'payment_pending': 3, 'cooking': 2, 'pending': 1, 'served': 0 };
              const existingP = statusPriority[existing.status as keyof typeof statusPriority] || 0;
              const newP = statusPriority[order.status as keyof typeof statusPriority] || 0;
              
              if (newP > existingP) existing.status = order.status;
          } else {
              tableOrderMap.set(order.tbl, { ...order });
          }
      }
    });

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
    console.error("Cashier Fetch Error:", error);
    return { success: false, activeOrders: [] };
  }
}

// --- 2. CREATE ORDER (SMART MERGE LOGIC) ---
export async function createCashierOrder(tableId: string, items: any[], type: 'dine_in' | 'takeaway') {
    const tenantId = await getTenantId();
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Prepare New Items
    const compactItems = items.map((i: any) => ({
        id: i.id, name: i.name, price: i.price, qty: i.qty,
        variant: i.variantName || "", note: i.note || "", status: "pending"             
    }));
    const newTotal = compactItems.reduce((sum: number, item: any) => sum + (item.price * item.qty), 0);

    // 2. Fetch Log
    const { data: currentLog } = await supabaseAdmin
        .from("daily_order_logs")
        .select("orders_data")
        .eq("tenant_id", tenantId)
        .eq("date", today)
        .maybeSingle();

    const existingOrders = safeParse(currentLog?.orders_data);
    let orderUpdated = false;
    
    // 3. MERGE LOGIC: If table has a 'pending' order, append items. Else create new.
    const updatedOrders = existingOrders.map((order: any) => {
        // Only merge if it's the same table AND status is still strictly 'pending' (not cooking/served)
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
        // Create NEW Order if no pending order found
        const orderId = Date.now().toString(36).toUpperCase();
        const finalTableId = type === 'takeaway' ? `TAKEAWAY-${orderId.slice(-4)}` : tableId;

        const newOrder = {
            id: orderId, tbl: finalTableId, items: compactItems, total: newTotal, status: 'pending',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            staff: "Cashier", type, timestamp: new Date().toISOString()
        };
        finalOrders = [...existingOrders, newOrder];
        
        // Mark table occupied if new dine-in
        if (type === 'dine_in') {
            await supabaseAdmin.from("restaurant_tables").update({ status: 'occupied' }).eq("label", finalTableId).eq("tenant_id", tenantId);
        }
    }

    // 4. DB Update using Composite Key
    const { error } = await supabaseAdmin.from("daily_order_logs").upsert({ 
        tenant_id: tenantId, date: today, orders_data: finalOrders 
    }, { onConflict: 'tenant_id, date' });

    if (error) return { success: false, error: error.message };

    revalidatePath("/staff/cashier");
    return { success: true };
}

// --- 3. CANCEL ORDER (STRICT: Only Pending) ---
export async function cancelOrder(orderId: string, tableId: string) {
    const tenantId = await getTenantId();
    const today = new Date().toISOString().split('T')[0];

    const { data: log } = await supabaseAdmin.from("daily_order_logs").select("orders_data").eq("tenant_id", tenantId).eq("date", today).maybeSingle();
    if (!log) return { success: false, error: "Log not found" };

    const currentOrders = safeParse(log.orders_data);
    let found = false;

    const updatedOrders = currentOrders.map((order: any) => {
        // STRICT CHECK: Only cancel if status is 'pending'
        if ((order.id === orderId || order.tbl === tableId) && order.status === 'pending') {
            found = true;
            return { ...order, status: 'cancelled' };
        }
        return order;
    });

    if (!found) return { success: false, error: "Order is Cooking or Served. Cannot Cancel." };

    await supabaseAdmin.from("daily_order_logs").update({ orders_data: updatedOrders }).eq("tenant_id", tenantId).eq("date", today);
    
    if (!tableId.startsWith("TAKEAWAY")) {
        const remainingActive = updatedOrders.some((o:any) => o.tbl === tableId && !['cancelled', 'paid', 'completed'].includes(o.status));
        if(!remainingActive) {
            await supabaseAdmin.from("restaurant_tables").update({ status: 'free' }).eq("label", tableId).eq("tenant_id", tenantId);
        }
    }

    revalidatePath("/staff/cashier");
    return { success: true };
}

// --- 4. SERVE ORDER ---
export async function serveOrder(orderId: string, tableId: string) {
    const tenantId = await getTenantId();
    const today = new Date().toISOString().split('T')[0];

    const { data: log } = await supabaseAdmin.from("daily_order_logs").select("orders_data").eq("tenant_id", tenantId).eq("date", today).maybeSingle();
    if (!log) return { success: false, error: "Log not found" };

    const currentOrders = safeParse(log.orders_data);
    
    const updatedOrders = currentOrders.map((order: any) => {
        // CRITICAL FIX: Only serve if the order is not already cancelled, paid, or completed
        if ((order.id === orderId || order.tbl === tableId) && !['cancelled', 'paid', 'completed'].includes(order.status)) {
            const newItems = (order.items || []).map((i:any) => {
                // Ensure cancelled items within the order stay cancelled
                if (i.status === 'cancelled') return i;
                return { ...i, status: 'served' };
            });
            return { ...order, status: 'served', items: newItems };
        }
        return order;
    });

    await supabaseAdmin.from("daily_order_logs").update({ orders_data: updatedOrders }).eq("tenant_id", tenantId).eq("date", today);
    revalidatePath("/staff/cashier");
    return { success: true };
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

    // Consolidate all active orders for this table
    currentOrders.forEach((order: any) => {
        if (order.tbl === tableId && !['cancelled', 'completed', 'paid'].includes(order.status)) {
            found = true;
            
            // CRITICAL FIX: Uses the exact order ID as the Invoice / Bill Number
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