"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

// --- CONSTANTS ---
const FALLBACK_TENANT_UUID = "00000000-0000-0000-0000-000000000000";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Securely handles BOTH UUIDs (SaaS) and Numbers (like Tenant 5)
function getSafeId(id: string | null | undefined): string | number {
  if (!id) return 5; // Default for local
  if (UUID_REGEX.test(id)) return id; // Allows your SaaS string IDs
  if (!isNaN(Number(id))) return Number(id); // Allows local numeric IDs
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

  // --- CRITICAL FIX: Preserve routing data (station/category) for KDS ---
  const newOrder = {
      id: crypto.randomUUID(),
      tbl: orderData.table_no, // Short key 'tbl' to save space
      time: new Date().toLocaleTimeString(),
      status: "pending",
      total: orderData.total,
      items: orderData.items.map((i: any) => ({
          id: i.id || "",
          unique_id: i.unique_id || i.cartId || `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          n: i.name || i.n, // 'n' for optimized size
          name: i.name || i.n, // 'name' required for Kitchen/Bar OS
          q: Number(i.qty || i.q || 1),  
          qty: Number(i.qty || i.q || 1), // 'qty' required for Kitchen/Bar OS
          p: Number(i.price || i.p || 0),
          price: Number(i.price || i.p || 0), 
          note: i.notes || i.note || "",
          status: "pending",
          
          // These are mandatory for the Bar/Kitchen routing engine!
          station: i.station || i.prep_station || "",
          category: i.category || "",
          dietary: i.dietary || ""
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
  revalidatePath("/staff/cashier");
  revalidatePath("/admin/inventory");
  return { success: true, orderId: newOrder.id };
}