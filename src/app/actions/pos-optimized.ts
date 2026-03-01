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

  // EXACTLY AS YOU PROVIDED IT
  const newOrder = {
      id: crypto.randomUUID(),
      tbl: orderData.table_no, // Short key 'tbl' to save space
      time: new Date().toLocaleTimeString(),
      status: "pending",
      total: orderData.total,
      items: orderData.items.map((i: any) => ({
          n: i.name || i.n, // 'n' for name
          q: Number(i.qty || i.q || 1),  // 'q' for qty
          p: Number(i.price || i.p || 0),// 'p' for price
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

  // --- INVENTORY SYNC INJECTION ---
  try {
      const { data: inventoryItems } = await supabaseAdmin
          .from("inventory")
          .select("id, name, stock, quantity, linked_menu_item, base_unit, volume_per_unit")
          .eq("tenant_id", tenantId);

      if (inventoryItems && inventoryItems.length > 0) {
          const superClean = (str: string) => String(str).toLowerCase().replace(/[^a-z0-9]/g, '');

          for (const cartItem of orderData.items) {
              const rawName = cartItem.name || cartItem.n || "";
              const rawQty = Number(cartItem.qty || cartItem.q || 1);
              const cartClean = superClean(rawName); 
              
              const stockItem = inventoryItems.find(i => {
                  const invClean = superClean(i.name);
                  const linkedClean = i.linked_menu_item ? superClean(i.linked_menu_item) : "";
                  return invClean === cartClean ||
                         (linkedClean !== "" && linkedClean === cartClean) ||
                         (linkedClean !== "" && cartClean.includes(linkedClean)) ||
                         (invClean !== "" && cartClean.includes(invClean));
              });
              
              if (stockItem) {
                  const deductionAmount = rawQty * Number(stockItem.volume_per_unit || 1);
                  const currentStock = stockItem.stock !== undefined ? stockItem.stock : (stockItem.quantity || 0);
                  const newStock = Math.max(0, Number(currentStock) - deductionAmount);
                  
                  await supabaseAdmin.from("inventory")
                      .update({ stock: newStock, quantity: newStock })
                      .eq("id", stockItem.id);
              }
          }
      }
  } catch (invError) {
      console.error("Inventory Sync Error:", invError);
  }
  // --- END INVENTORY SYNC ---

  revalidatePath("/staff/waiter");
  revalidatePath("/staff/cashier");
  revalidatePath("/admin/inventory");
  return { success: true, orderId: newOrder.id };
}