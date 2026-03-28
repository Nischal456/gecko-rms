"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

// --- HELPER: GET CURRENT TENANT ID ---
async function getTenantId() {
  const cookieStore = await cookies();
  const id = cookieStore.get("gecko_tenant_id")?.value;
  if (!id) throw new Error("Unauthorized");
  return id;
}

// --- 1. FETCH FLOOR PLAN ---
export async function getFloorPlan() {
  const tenantId = await getTenantId();
  
  const getCachedFloorPlan = unstable_cache(
    async () => {
      const { data, error } = await supabaseAdmin
        .from("restaurant_tables")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("table_number", { ascending: true }); // Numeric sort if possible

      if (error) return { success: false, error: error.message };
      return { success: true, data };
    },
    [`floor-plan-${tenantId}`],
    { tags: [`tables-${tenantId}`], revalidate: 3600 }
  );

  return getCachedFloorPlan();
}

// --- 2. CREATE NEW TABLE ---
export async function createTable(tableNumber: string, seats: number) {
  const tenantId = await getTenantId();

  const { error } = await supabaseAdmin
    .from("restaurant_tables")
    .insert([{ tenant_id: tenantId, table_number: tableNumber, seats: seats, status: 'free' }]);

  if (error) return { success: false, error: error.message };
  revalidateTag(`tables-${tenantId}`, undefined as any);
  revalidatePath("/admin");
  return { success: true };
}

// --- 3. UPDATE TABLE STATUS (Simulate Seating/Billing) ---
export async function updateTableStatus(tableId: number, status: string) {
  const tenantId = await getTenantId();
  const { error } = await supabaseAdmin
    .from("restaurant_tables")
    .update({ status: status })
    .eq("id", tableId);

  if (error) return { success: false, error: error.message };
  revalidateTag(`tables-${tenantId}`, undefined as any);
  revalidatePath("/admin");
  return { success: true };
}

// --- 4. DELETE TABLE ---
export async function deleteTable(tableId: number) {
  const tenantId = await getTenantId();
  const { error } = await supabaseAdmin
    .from("restaurant_tables")
    .delete()
    .eq("id", tableId);

  if (error) return { success: false, error: error.message };
  revalidateTag(`tables-${tenantId}`, undefined as any);
  revalidatePath("/admin");
  return { success: true };
}