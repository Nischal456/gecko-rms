"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

// --- HELPER ---
async function getTenantId() {
  const cookieStore = await cookies();
  return cookieStore.get("gecko_tenant_id")?.value;
}

// --- 1. GET STAFF ---
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

// --- 2. CREATE STAFF ---
export async function createStaff(data: any) {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) return { success: false, error: "Unauthorized" };

    // Explicitly map the data to ensure we only insert valid columns
    const { error } = await supabaseAdmin.from("staff").insert({
      tenant_id: tenantId,
      name: data.name,
      role: data.role || "staff",
      pin: data.pin || "0000", // Default POS login pin if not provided
      phone: data.phone || null,
      salary: Number(data.salary) || 0,
      status: data.status || "active",
      joined_at: data.joined_at || new Date().toISOString()
    });

    if (error) throw error;

    revalidatePath("/admin/staff");
    return { success: true };
  } catch (error: any) {
    console.error("Create Staff Error:", error);
    return { success: false, error: error.message };
  }
}

// --- 3. UPDATE STAFF ---
export async function updateStaff(id: string, data: any) {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) return { success: false, error: "Unauthorized" };

    // Build update payload safely (ignoring undefined values)
    const updatePayload = {
        name: data.name,
        role: data.role,
        pin: data.pin,
        phone: data.phone,
        salary: data.salary !== undefined ? Number(data.salary) : undefined,
        status: data.status
    };

    // Clean up undefined keys so Supabase doesn't complain
    Object.keys(updatePayload).forEach(key => updatePayload[key as keyof typeof updatePayload] === undefined && delete updatePayload[key as keyof typeof updatePayload]);

    const { error } = await supabaseAdmin
        .from("staff")
        .update(updatePayload)
        .eq("id", id)
        .eq("tenant_id", tenantId); // Security: ensure they only update their own staff

    if (error) throw error;

    revalidatePath("/admin/staff");
    return { success: true };
  } catch (error: any) {
    console.error("Update Staff Error:", error);
    return { success: false, error: error.message };
  }
}

// --- 4. DELETE STAFF ---
export async function deleteStaff(id: string) {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) return { success: false, error: "Unauthorized" };

    const { error } = await supabaseAdmin
        .from("staff")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId); // Security check

    if (error) throw error;

    revalidatePath("/admin/staff");
    return { success: true };
  } catch (error: any) {
    console.error("Delete Staff Error:", error);
    return { success: false, error: error.message };
  }
}