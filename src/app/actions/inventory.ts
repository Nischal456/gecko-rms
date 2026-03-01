"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { unstable_noStore as noStore } from 'next/cache'; // CRITICAL: Prevents stale data caching

async function getTenantId() {
  const cookieStore = await cookies();
  return cookieStore.get("gecko_tenant_id")?.value;
}

// --- 1. GET INVENTORY ---
export async function getInventory() {
  noStore(); // Force real-time fetch
  const tenantId = await getTenantId();
  if (!tenantId) return { success: false, error: "Unauthorized" };

  const { data, error } = await supabaseAdmin
    .from("inventory")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  const formattedData = data?.map(item => {
      const currentStock = item.stock !== undefined ? item.stock : (item.quantity || 0);
      const totalUnits = item.volume_per_unit > 1 
        ? (currentStock / item.volume_per_unit).toFixed(2) 
        : currentStock;

      return {
        ...item,
        stock: currentStock,
        display_stock: item.volume_per_unit > 1 
            ? `${totalUnits} ${item.unit}s (${currentStock}${item.base_unit})`
            : `${currentStock} ${item.unit}`
      }
  }) || [];

  return { success: !error, data: formattedData };
}

// --- 2. UPDATE STOCK ---
export async function updateStock(id: string, deductAmount: number, reason: string = "sale") {
  const tenantId = await getTenantId();
  if (!tenantId) return { success: false };

  const { data: item } = await supabaseAdmin.from("inventory").select("stock, quantity, name, cost_price, base_unit, volume_per_unit").eq("id", id).single();
  if (!item) return { success: false, error: "Item not found" };

  const currentStock = item.stock !== undefined ? item.stock : (item.quantity || 0);
  const newStock = Math.max(0, currentStock - deductAmount);
  
  const costPerBaseUnit = (item.cost_price || 0) / (item.volume_per_unit || 1);
  const cogsForThisTransaction = costPerBaseUnit * deductAmount;

  await supabaseAdmin.from("inventory").update({ stock: newStock, quantity: newStock }).eq("id", id);

  const today = new Date().toISOString().split('T')[0];
  const logEntry = { item: item.name, qty_deducted: deductAmount, unit: item.base_unit, cogs: cogsForThisTransaction, time: new Date().toLocaleTimeString(), reason };

  const { data: currentLog } = await supabaseAdmin.from('inventory_daily_logs').select('logs, total_cogs').eq('tenant_id', tenantId).eq('date', today).single();
  const newLogs = currentLog && currentLog.logs ? [logEntry, ...currentLog.logs] : [logEntry];
  const newTotalCogs = (currentLog?.total_cogs || 0) + cogsForThisTransaction;

  await supabaseAdmin.from('inventory_daily_logs').upsert({ tenant_id: tenantId, date: today, logs: newLogs, total_cogs: newTotalCogs }, { onConflict: 'date, tenant_id' });

  revalidatePath("/staff/manager/inventory");
  revalidatePath("/admin/inventory");
  return { success: true, newStock };
}

// --- 2.5 MANUAL STOCK ADJUSTMENT ---
export async function manualStockAdjust(id: string, changeAmount: number) {
  const tenantId = await getTenantId();
  if (!tenantId) return { success: false };

  const { data: item } = await supabaseAdmin.from("inventory").select("stock, quantity").eq("id", id).single();
  if (!item) return { success: false };

  const currentStock = item.stock !== undefined ? item.stock : (item.quantity || 0);
  const newStock = Math.max(0, currentStock + changeAmount);
  
  await supabaseAdmin.from("inventory").update({ stock: newStock, quantity: newStock }).eq("id", id);

  revalidatePath("/staff/manager/inventory");
  revalidatePath("/admin/inventory");
  return { success: true, newStock };
}

// --- 3. FETCH MENU ITEMS ---
export async function getMenuItemsForLinking() {
    noStore();
    const tenantId = await getTenantId();
    if (!tenantId) return { success: false, data: [] };

    const { data } = await supabaseAdmin.from("menu_optimized").select("items").eq("tenant_id", tenantId);
    const { data: globalData } = await supabaseAdmin.from("menu_optimized").select("items").eq("tenant_id", 0);

    let allItems: string[] = [];
    const extractItems = (rows: any[]) => {
        rows?.forEach(row => {
            if (Array.isArray(row.items)) {
                row.items.forEach((item: any) => { if (item.name) allItems.push(item.name); });
            }
        });
    };

    extractItems(data || []);
    extractItems(globalData || []);

    return { success: true, data: Array.from(new Set(allItems)).sort() };
}

// --- 4. ADD ITEM ---
export async function addInventoryItem(data: any) {
  const tenantId = await getTenantId();
  if (!tenantId) return { success: false };

  const volumePerUnit = Number(data.volume_per_unit) || 1;
  const initialBottles = Number(data.stock) || 0;
  const totalBaseStock = initialBottles * volumePerUnit;

  const { error } = await supabaseAdmin.from("inventory").insert({
    tenant_id: tenantId,
    name: data.name,
    category: data.category || 'packaged',
    stock: totalBaseStock, 
    quantity: totalBaseStock, 
    max_stock: (Number(data.max_stock) || 100) * volumePerUnit,
    unit: data.unit || 'pc',
    base_unit: data.base_unit || 'pc',
    volume_per_unit: volumePerUnit,
    cost_price: Number(data.cost_price) || 0,
    price: Number(data.price) || 0,
    linked_menu_item: data.linked_menu_item || null
  });

  revalidatePath("/admin/inventory");
  return { success: !error, error: error?.message };
}

export async function deleteInventoryItem(id: string) {
  await supabaseAdmin.from("inventory").delete().eq("id", id);
  revalidatePath("/admin/inventory");
  return { success: true };
}

// --- 5. FINANCIALS (INCOME & EXPENSE) ---
export async function getExpenses() {
  noStore(); // Force real-time fetch
  const tenantId = await getTenantId();
  if (!tenantId) return { success: false, data: [] };
  const { data, error } = await supabaseAdmin.from("expenses").select("*").eq("tenant_id", tenantId).order("date", { ascending: false }).order("created_at", { ascending: false });
  return { success: !error, data: data || [] };
}

// CRITICAL FIX: Securing the custom categories with a hidden tag
export async function addExpense(data: any) {
  const tenantId = await getTenantId();
  if (!tenantId) return { success: false };
  
  const rawAmount = Math.abs(Number(data.amount));
  
  // If the frontend said it was an income, append a secret tag so the DB never forgets!
  let finalCategory = data.category;
  if (data.type === 'income' && !finalCategory.includes('[INC]')) {
      finalCategory = finalCategory + ' [INC]';
  } else if (data.type === 'expense' && !finalCategory.includes('[EXP]')) {
      finalCategory = finalCategory + ' [EXP]';
  }

  const { error } = await supabaseAdmin.from("expenses").insert({ 
      tenant_id: tenantId, 
      category: finalCategory, 
      amount: rawAmount, 
      description: data.description || "", 
      date: data.date || new Date().toISOString().split('T')[0] 
  });
  
  if (error) console.error("Database Save Error:", error);

  revalidatePath("/admin/inventory");
  return { success: !error, error: error?.message }; 
}

export async function deleteExpense(id: string) {
  await supabaseAdmin.from("expenses").delete().eq("id", id);
  revalidatePath("/admin/inventory");
  return { success: true };
}