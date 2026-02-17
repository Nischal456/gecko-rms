"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

// --- HELPER ---
async function getTenantId() {
  const cookieStore = await cookies();
  return cookieStore.get("gecko_tenant_id")?.value;
}

// --- 1. GET INVENTORY ---
export async function getInventory() {
  const tenantId = await getTenantId();
  if (!tenantId) return { success: false, error: "Unauthorized" };

  const { data, error } = await supabaseAdmin
    .from("inventory")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  // Map old 'quantity' field to 'stock' if migration isn't perfect
  const formattedData = data?.map(item => ({
      ...item,
      stock: item.stock ?? item.quantity ?? 0 
  })) || [];

  return { success: !error, data: formattedData };
}

// --- 2. UPDATE STOCK (With Storage Saver Logic) ---
export async function updateStock(id: string, adjustment: number, reason: string = "manual") {
  const tenantId = await getTenantId();
  if (!tenantId) return { success: false };

  // A. Fetch current
  const { data: item } = await supabaseAdmin
    .from("inventory")
    .select("stock, name")
    .eq("id", id)
    .single();

  if (!item) return { success: false, error: "Item not found" };

  // B. Calculate new stock
  const newStock = Math.max(0, (item.stock || 0) + adjustment);

  // C. Update DB
  const { error } = await supabaseAdmin
    .from("inventory")
    .update({ stock: newStock })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  // D. STORAGE SAVER: Log to JSON if deducting stock
  // This saves DB rows by packing thousands of deductions into one JSON array per day
  if (adjustment < 0) {
      const today = new Date().toISOString().split('T')[0];
      const logEntry = {
          item: item.name,
          qty: adjustment,
          time: new Date().toLocaleTimeString(),
          reason
      };

      // In a real RPC, this would be: 
      // log_data = jsonb_set(log_data, '{logs}', log_data->'logs' || entry)
      // Here we simulate the logic structure:
      const { data: currentLog } = await supabaseAdmin
          .from('inventory_daily_logs')
          .select('logs')
          .eq('tenant_id', tenantId)
          .eq('date', today)
          .single();

      const newLogs = currentLog ? [logEntry, ...currentLog.logs] : [logEntry];

      await supabaseAdmin.from('inventory_daily_logs').upsert({
          tenant_id: tenantId,
          date: today,
          logs: newLogs
      }, { onConflict: 'date, tenant_id' });
  }

  revalidatePath("/staff/manager/inventory");
  revalidatePath("/admin/inventory");
  return { success: true, newStock };
}

// --- 3. ADD ITEM ---
export async function addInventoryItem(data: any) {
  const tenantId = await getTenantId();
  if (!tenantId) return { success: false };

  const { error } = await supabaseAdmin.from("inventory").insert({
    tenant_id: tenantId,
    name: data.name,
    category: data.category || 'packaged',
    stock: Number(data.stock) || 0,
    max_stock: Number(data.max_stock) || 100,
    unit: data.unit || 'pc',
    price: Number(data.price) || 0,
    linked_menu_item: data.linked_menu_item || null
  });

  if (!error) {
      revalidatePath("/staff/manager/inventory");
      revalidatePath("/admin/inventory");
  }
  return { success: !error, error: error?.message };
}

// --- 4. UPDATE ITEM DETAILS ---
export async function updateInventoryItem(id: string, data: any) {
  const { error } = await supabaseAdmin.from("inventory").update(data).eq("id", id);
  if (!error) {
      revalidatePath("/staff/manager/inventory");
      revalidatePath("/admin/inventory");
  }
  return { success: !error };
}

// --- 5. DELETE ITEM ---
export async function deleteInventoryItem(id: string) {
  const { error } = await supabaseAdmin.from("inventory").delete().eq("id", id);
  if (!error) {
      revalidatePath("/staff/manager/inventory");
      revalidatePath("/admin/inventory");
  }
  return { success: !error };
}