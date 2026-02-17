"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

// --- HELPER: GET TENANT ID ---
async function getTenantId() {
  const cookieStore = await cookies();
  return cookieStore.get("gecko_tenant_id")?.value;
}

// ==========================================
// 1. STAFF MANAGEMENT
// ==========================================

export async function getStaffList() {
  const tenantId = await getTenantId();
  if (!tenantId) return { success: false, error: "Unauthorized" };

  // FIX: Sorted by 'full_name' to be safe
  const { data, error } = await supabaseAdmin
    .from('staff')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('full_name', { ascending: true });

  if (error) {
    console.error("Get Staff Error:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export async function saveStaff(formData: any) {
  const tenantId = await getTenantId();
  if (!tenantId) return { success: false, error: "Unauthorized" };

  // --- UPDATED PAYLOAD WITH NEW FIELDS ---
  const payload = {
    full_name: formData.full_name,
    role: formData.role,
    phone: formData.phone,
    email: formData.email, // Added
    salary: formData.salary, // Added
    pin_code: formData.pin_code,
    status: formData.status,
    emergency_contact_name: formData.emergency_contact_name, // Added
    emergency_contact_phone: formData.emergency_contact_phone, // Added
    tenant_id: tenantId 
  };

  let error;

  if (formData.id) {
    // UPDATE
    const res = await supabaseAdmin
      .from('staff')
      .update(payload)
      .eq('id', formData.id)
      .eq('tenant_id', tenantId);
    error = res.error;
  } else {
    // CREATE
    const res = await supabaseAdmin
      .from('staff')
      .insert([payload]);
    error = res.error;
  }

  if (error) {
    console.error("Save Staff Error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath('/staff/manager/staff');
  return { success: true };
}

export async function deleteStaff(id: string) {
  const tenantId = await getTenantId();
  if (!tenantId) return { success: false, error: "Unauthorized" };

  const { error } = await supabaseAdmin
    .from('staff')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error("Delete Staff Error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath('/staff/manager/staff');
  return { success: true };
}

// ==========================================
// 2. PAYROLL & LEAVE FUNCTIONS
// ==========================================

export async function getStaffDetails(staffId: string) {
  const tenantId = await getTenantId();
  if (!tenantId) return { success: false };

  const { data: staff } = await supabaseAdmin.from("staff").select("*").eq("id", staffId).single();
  
  // Fetch payments
  const { data: payments } = await supabaseAdmin
    .from("staff_payments")
    .select("*")
    .eq("staff_id", staffId)
    .order("payment_date", { ascending: false });

  // Fetch leaves
  const { data: leaves } = await supabaseAdmin
    .from("staff_leaves")
    .select("*")
    .eq("staff_id", staffId)
    .order("start_date", { ascending: false });

  return { success: true, staff, payments, leaves };
}

export async function recordPayment(staffId: string, amount: number, type: string, notes: string, salaryMonth: string) {
  const tenantId = await getTenantId();
  if (!tenantId) return { success: false };

  const { error } = await supabaseAdmin.from("staff_payments").insert({
    tenant_id: tenantId,
    staff_id: staffId,
    amount,
    type, 
    notes,
    salary_month: salaryMonth,
    payment_date: new Date().toISOString()
  });

  if (!error) revalidatePath("/staff/manager/staff");
  return { success: !error };
}

export async function updateLeaveStatus(leaveId: string, staffId: string, status: 'approved' | 'rejected') {
  const tenantId = await getTenantId();
  const { error } = await supabaseAdmin.from("staff_leaves").update({ status }).eq("id", leaveId);
  
  // Notification logic
  const message = status === 'approved' ? "Leave approved." : "Leave declined.";
  await supabaseAdmin.from("notifications").insert({
    tenant_id: tenantId,
    staff_id: staffId,
    title: `Leave ${status}`,
    message: message,
    type: status === 'approved' ? 'success' : 'alert',
    is_read: false
  });

  revalidatePath("/staff/manager");
  return { success: true };
}

export async function createLeaveRequest(staffId: string, start: string, end: string, reason: string) {
  const tenantId = await getTenantId();
  const { error } = await supabaseAdmin.from("staff_leaves").insert({
    tenant_id: tenantId,
    staff_id: staffId,
    start_date: start,
    end_date: end,
    reason,
    status: 'approved' // Manager creating leave implies approval
  });
  
  if (!error) revalidatePath("/staff/manager/staff");
  return { success: !error };
}