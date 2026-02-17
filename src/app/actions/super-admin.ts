"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

// ==========================================
// 1. SYSTEM ALERTS (Context-Aware)
// ==========================================

export async function getSystemAlerts() {
  try {
    // FETCH NOTIFICATIONS + TENANT DETAILS
    // We use a foreign key join to get the name and code
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select(`
        *,
        tenants (
          name,
          code
        )
      `)
      .order("created_at", { ascending: false })
      .limit(50); // Fetch last 50 events

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error("Alert Fetch Error:", error);
    return { success: false, error: error.message };
  }
}

export async function markSystemRead(id: string) {
  try {
    await supabaseAdmin.from("notifications").update({ is_read: true }).eq("id", id);
    revalidatePath("/super-admin");
    return { success: true };
  } catch (e) {
    return { success: false };
  }
}

// ==========================================
// 2. BROADCAST SYSTEM
// ==========================================

export async function sendNotification(target: string, message: string, type: 'info' | 'alert' | 'success' | 'warning') {
  try {
    let tenantIds: any[] = [];
    
    // Determine Targets
    if (target === 'all') {
      const { data } = await supabaseAdmin.from("tenants").select("id");
      if (data) tenantIds = data.map(t => t.id);
    } else {
      tenantIds = [target];
    }

    if (tenantIds.length === 0) return { success: false, error: "No targets found" };

    // Create Bulk Payload
    const payload = tenantIds.map(id => ({
      tenant_id: id,
      title: "Admin Broadcast",
      message: message,
      type: type,
      is_read: false
    }));

    // Insert
    const { error } = await supabaseAdmin.from("notifications").insert(payload);
    if (error) throw error;
    
    revalidatePath("/admin");       // Update Client Dashboards
    revalidatePath("/super-admin"); // Update Super Admin Feed
    return { success: true };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ==========================================
// 3. TENANT CRUD OPERATIONS
// ==========================================

export async function getAllTenants() {
  try {
    const { data, error } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Added this helper as it is often needed for "Edit Tenant" modals
export async function getTenantById(id: number) {
  try {
    const { data, error } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createTenant(data: any) {
  try {
    const { error } = await supabaseAdmin.from("tenants").insert([{
      name: data.name,
      code: data.code.toUpperCase(),
      email: data.email,
      admin_password: data.password, // Ideally hash this before storing
      plan: data.plan,
      subscription_status: 'active',
      feature_flags: { kds: true, inventory: true, accounts: true }
    }]);

    if (error) throw error;
    
    revalidatePath("/super-admin");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function toggleSubscription(id: number, currentStatus: string) {
  try {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const { error } = await supabaseAdmin
      .from("tenants")
      .update({ subscription_status: newStatus })
      .eq("id", id);

    if (error) throw error;

    revalidatePath("/super-admin");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateFeatureFlags(id: number, flags: any) {
  try {
    const { error } = await supabaseAdmin
      .from("tenants")
      .update({ feature_flags: flags })
      .eq("id", id);
      
    if (error) throw error;
    revalidatePath("/super-admin");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteTenant(id: number) {
  try {
    const { error } = await supabaseAdmin.from("tenants").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/super-admin");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateTenantPrice(id: number, price: number) {
  try {
    const { error } = await supabaseAdmin
      .from("tenants")
      .update({ custom_price: price })
      .eq("id", id);

    if (error) throw error;
    revalidatePath("/super-admin");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateTenantPlan(id: number, plan: string) {
  try {
    const { error } = await supabaseAdmin
      .from("tenants")
      .update({ plan: plan })
      .eq("id", id);

    if (error) throw error;
    revalidatePath("/super-admin");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}