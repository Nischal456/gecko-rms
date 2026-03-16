"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";

// --- 1. GET PUBLIC STAFF LIST (Cached) ---
export async function getPublicStaffList() {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("gecko_tenant_id")?.value;

  if (!tenantId) return { success: false, needsSetup: true };

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("name, code, logo_url")
    .eq("id", tenantId)
    .single();
  
  const { data: staff } = await supabaseAdmin
    .from("staff")
    .select("id, full_name, role, status") 
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .order("full_name");

  return { 
    success: true, 
    tenantName: tenant?.name, 
    tenantCode: tenant?.code,
    logo: tenant?.logo_url,
    staff: staff || [] 
  };
}

// --- 2. FAST LOGIN ---
export async function staffLogin(staffId: string, pin: string) {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("gecko_tenant_id")?.value;

  if (!tenantId) return { success: false, error: "Device not linked." };

  // A. Verify PIN
  const { data: staff } = await supabaseAdmin
    .from("staff")
    .select("id, role, full_name, pin_code")
    .eq("id", staffId)
    .eq("tenant_id", tenantId)
    .single();

  if (!staff || staff.pin_code !== pin) {
    return { success: false, error: "Incorrect PIN." };
  }

  // B. Create Session
  const sessionData = JSON.stringify({
    id: staff.id,
    name: staff.full_name,
    role: staff.role,
    tenant_id: tenantId,
    login_time: Date.now()
  });

  // C. Set Cookie (CRITICAL FIX: secure: false)
  cookieStore.set("gecko_staff_token", sessionData, { 
    path: "/", 
    httpOnly: true, 
    sameSite: "lax",
    secure: false, 
    maxAge: 60 * 60 * 24 * 7 
  });

  // D. ROUTING LOGIC (FIXED: Added Bartender routing)
  let redirectUrl = "/staff/pos"; // Default fallback
  
  if (staff.role === "waiter") redirectUrl = "/staff/waiter";
  if (staff.role === "chef") redirectUrl = "/staff/kitchen";
  if (staff.role === "manager") redirectUrl = "/staff/manager";
  if (staff.role === "cashier") redirectUrl = "/staff/cashier"; 
  if (staff.role === "bartender") redirectUrl = "/staff/bartender"; // Successfully routes to BarOS
  
  return { success: true, role: staff.role, url: redirectUrl };
}

// --- 3. LOGOUT ---
export async function logoutStaff() {
    const cookieStore = await cookies();
    cookieStore.delete("gecko_staff_token");
    return { success: true };
}

// --- 4. LINK DEVICE ---
export async function linkDeviceToRestaurant(code: string) {
  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("id, name")
    .eq("code", code.toUpperCase().trim())
    .single();

  if (!tenant) return { success: false, error: "Invalid Code" };

  const cookieStore = await cookies();
  
  // CRITICAL FIX: secure: false
  cookieStore.set("gecko_tenant_id", tenant.id.toString(), { 
    path: "/", 
    httpOnly: true, 
    secure: false, 
    maxAge: 60 * 60 * 24 * 365 
  });

  return { success: true, name: tenant.name };
}

// --- 5. UNLINK DEVICE ---
export async function unlinkDevice() {
    const cookieStore = await cookies();
    cookieStore.delete("gecko_tenant_id");
    cookieStore.delete("gecko_staff_token");
    return { success: true };
}