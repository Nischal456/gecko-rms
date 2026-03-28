"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

async function getTenantId() {
  const cookieStore = await cookies();
  return cookieStore.get("gecko_tenant_id")?.value;
}

export async function getTables() {
  const tenantId = await getTenantId();
  if (!tenantId) return { success: false, error: "Unauthorized" };

  const getCachedTables = unstable_cache(
    async () => {
      const { data, error } = await supabaseAdmin
        .from("restaurant_tables")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("label", { ascending: true });

      if (error) return { success: false, error: error.message };
      return { success: true, data };
    },
    [`floor-tables-${tenantId}`],
    { tags: [`tables-${tenantId}`], revalidate: 3600 }
  );

  return getCachedTables();
}

export async function saveTableLayout(tables: any[]) {
  const tenantId = await getTenantId();
  if (!tenantId) return { success: false, error: "Unauthorized" };

  const updates = tables.map(t => ({
    id: t.id, // ID is now guaranteed to be a valid UUID from frontend
    tenant_id: tenantId,
    label: t.label,
    x: Math.round(t.x),
    y: Math.round(t.y),
    width: Math.round(t.width),
    height: Math.round(t.height),
    rotation: Math.round(t.rotation || 0),
    shape: t.shape,
    seats: t.seats,
    status: t.status,
    section: t.section
  }));

  const { error } = await supabaseAdmin.from("restaurant_tables").upsert(updates);
  
  if (error) {
      console.error("Save Error:", error);
      return { success: false, error: error.message };
  }
  
  revalidateTag(`tables-${tenantId}`, undefined as any);
  revalidatePath("/admin/floor");
  return { success: true };
}

export async function deleteTable(tableId: string) {
  const tenantId = await getTenantId();
  const { error } = await supabaseAdmin.from("restaurant_tables").delete().eq("id", tableId);
  if (error) return { success: false, error: error.message };
  if (tenantId) revalidateTag(`tables-${tenantId}`, undefined as any);
  revalidatePath("/admin/floor");
  return { success: true };
}