"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

async function getTenantId() {
  const cookieStore = await cookies();
  return cookieStore.get("gecko_tenant_id")?.value;
}

export async function getStaff() {
  const tenantId = await getTenantId();
  if (!tenantId) return { success: false, data: [] };

  // 1. Get Staff
  const { data: staffList, error } = await supabaseAdmin
    .from("staff")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("joined_at", { ascending: false });

  if (error) return { success: false, error: error.message };

  // 2. Get Pending Leaves for Badge
  const { data: pendingLeaves } = await supabaseAdmin
    .from("staff_leaves")
    .select("staff_id")
    .eq("tenant_id", tenantId)
    .eq("status", "pending");

  // 3. Attach "hasPendingLeave" flag
  const enrichedStaff = staffList.map(s => ({
      ...s,
      hasPendingLeave: pendingLeaves?.some(l => l.staff_id === s.id)
  }));

  return { success: true, data: enrichedStaff };
}

// ... keep createStaff, updateStaff, deleteStaff as they were ...
export async function createStaff(data: any) {
  const tenantId = await getTenantId();
  if (!tenantId) return { success: false };
  const { error } = await supabaseAdmin.from("staff").insert({ tenant_id: tenantId, ...data });
  if (!error) revalidatePath("/admin/staff");
  return { success: !error, error: error?.message };
}

export async function updateStaff(id: string, data: any) {
  const { error } = await supabaseAdmin.from("staff").update(data).eq("id", id);
  if (!error) revalidatePath("/admin/staff");
  return { success: !error, error: error?.message };
}

export async function deleteStaff(id: string) {
  const { error } = await supabaseAdmin.from("staff").delete().eq("id", id);
  if (!error) revalidatePath("/admin/staff");
  return { success: !error };
}