"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

// --- CONSTANTS ---
const FALLBACK_TENANT_UUID = "00000000-0000-0000-0000-000000000000";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getSafeId(id: string | null | undefined): string {
  if (id && UUID_REGEX.test(id)) return id;
  return FALLBACK_TENANT_UUID;
}

async function getTenantId() {
  const cookieStore = await cookies();
  return getSafeId(cookieStore.get("gecko_tenant_id")?.value);
}

// --- CREATE ORDER (JSON OPTIMIZED) ---
export async function createOrderJSON(orderData: any) {
  const tenantId = await getTenantId();
  const today = new Date().toISOString().split('T')[0];

  if (!orderData.items || orderData.items.length === 0) {
      return { success: false, error: "Cart is empty" };
  }

  // 1. Construct the Compact Order Object
  const newOrder = {
      id: crypto.randomUUID(),
      tbl: orderData.table_no, // Short key 'tbl' to save space
      time: new Date().toLocaleTimeString(),
      status: "pending",
      total: orderData.total,
      items: orderData.items.map((i: any) => ({
          n: i.name, // 'n' for name
          q: i.qty,  // 'q' for qty
          p: i.price,// 'p' for price
          note: i.notes || ""
      }))
  };

  // 2. Fetch Today's Log
  const { data: currentLog } = await supabaseAdmin
      .from("daily_order_logs")
      .select("orders_data, total_revenue")
      .eq("tenant_id", tenantId)
      .eq("date", today)
      .single();

  let updatedOrders = currentLog ? currentLog.orders_data : [];
  let updatedRevenue = currentLog ? currentLog.total_revenue : 0;

  // 3. Append New Order
  // Note: For extreme concurrency (100+ orders/sec), you'd use a Postgres Function. 
  // For standard restaurant speed, this JS push is fine.
  updatedOrders.push(newOrder);
  updatedRevenue += newOrder.total;

  // 4. Save Back (Upsert)
  const { error } = await supabaseAdmin
      .from("daily_order_logs")
      .upsert({
          tenant_id: tenantId,
          date: today,
          orders_data: updatedOrders,
          total_revenue: updatedRevenue,
          updated_at: new Date().toISOString()
      }, { onConflict: 'date, tenant_id' });

  if (error) {
      console.error("Order Save Failed:", error);
      return { success: false, error: "Failed to save order" };
  }

  revalidatePath("/staff/waiter");
  return { success: true, orderId: newOrder.id };
}