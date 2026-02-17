"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { sendResetEmail } from "@/lib/mail";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

// --- 1. REQUEST RESET ---
export async function requestPasswordReset(code: string, email: string) {
  try {
    const { data: tenant, error } = await supabaseAdmin
      .from("tenants")
      .select("id, name")
      .eq("code", code.toUpperCase().trim())
      .eq("admin_email", email.trim()) // Checked against admin_email
      .single();

    if (error || !tenant) {
      return { success: false, error: "Invalid Restaurant Code or Email." };
    }

    const token = randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 3600000); 

    await supabaseAdmin
      .from("tenants")
      .update({ reset_token: token, reset_token_expiry: expiry.toISOString() })
      .eq("id", tenant.id);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const resetLink = `${baseUrl}/reset-password/${token}`;
    
    await sendResetEmail(email, resetLink);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- 2. PERFORM RESET ---
export async function resetPassword(token: string, newPassword: string) {
  try {
    const { data: tenant, error } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("reset_token", token)
      .gt("reset_token_expiry", new Date().toISOString())
      .single();

    if (error || !tenant) return { success: false, error: "Invalid or expired link." };

    await supabaseAdmin
      .from("tenants")
      .update({ 
        admin_password: newPassword, 
        reset_token: null, 
        reset_token_expiry: null 
      })
      .eq("id", tenant.id);

    // Optional: Add notification
    await supabaseAdmin.from("notifications").insert([{
      tenant_id: tenant.id,
      title: "Security Alert",
      message: "Admin password was reset successfully.",
      type: "alert",
      is_read: false
    }]);

    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: "Update failed." };
  }
}

// --- 3. MAIN LOGIN HANDLER (UPDATED WITH SUSPENSION) ---
export async function loginUser(data: any) {
  const code = data instanceof FormData ? data.get("code") as string : data.code;
  const email = data instanceof FormData ? data.get("email") as string : data.email;
  const password = data instanceof FormData ? data.get("password") as string : data.password;

  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === "production";

  // A. SUPER ADMIN LOGIN
  // Ideally store these in .env
  const SUPER_EMAIL = process.env.SUPER_ADMIN_EMAIL || "super@gecko.works";
  const SUPER_PASS = process.env.SUPER_ADMIN_PASSWORD || "admin123";

  if (email === SUPER_EMAIL && password === SUPER_PASS) {
    cookieStore.set("gecko_super_admin", "true", { 
      path: '/', 
      httpOnly: true, 
      secure: isProduction, 
      maxAge: 60 * 60 * 24 * 7, // 7 Days
      sameSite: "lax"
    });
    return { success: true, role: "super_admin", url: "/super-admin", name: "Master Control" };
  }

  // B. RESTAURANT ADMIN LOGIN
  try {
    const { data: tenant, error } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("code", code?.toUpperCase().trim())
      .single();

    // 1. Check Existence
    if (error || !tenant) return { success: false, error: "Invalid Restaurant Code." };

    // 2. ⛔ SUSPENSION CHECK ⛔
    if (tenant.subscription_status === 'suspended') {
        return { 
            success: false, 
            error: "⛔ SERVICE SUSPENDED: Your restaurant's access has been paused. Please contact GeckoRMS Administrator." 
        };
    }

    // 3. Verify Credentials (Email & Password)
    // Note: Comparing admin_email from DB vs input
    if (tenant.admin_email !== email) return { success: false, error: "Invalid Email Address." };
    if (tenant.admin_password !== password) return { success: false, error: "Incorrect Password." };

    // 4. Successful Login -> Set Cookie
    cookieStore.set("gecko_tenant_id", tenant.id.toString(), { 
      path: '/', 
      httpOnly: true, 
      secure: isProduction, 
      maxAge: 60 * 60 * 24 * 7, 
      sameSite: "lax"
    });
    
    return { success: true, role: "restaurant_admin", url: "/admin", name: tenant.name };

  } catch (err: any) {
    console.error("Login Error:", err);
    return { success: false, error: "System Error. Please try again." };
  }
}

// --- 4. IMPERSONATION (SUPER ADMIN ONLY) ---
export async function impersonateTenant(tenantId: number) {
  const cookieStore = await cookies();
  const isSuper = cookieStore.get("gecko_super_admin");
  const isProduction = process.env.NODE_ENV === "production";
  
  if (!isSuper) return { success: false, error: "Unauthorized: Super Admin Access Required" };

  // Set the tenant ID cookie so the admin dashboard loads for this tenant
  cookieStore.set("gecko_tenant_id", tenantId.toString(), { 
    path: '/', 
    httpOnly: true, 
    secure: isProduction,
    maxAge: 60 * 60 * 24, // 1 Day Impersonation
    sameSite: "lax"
  });

  return { success: true, url: "/admin" };
}

// --- 5. LOGOUT ---
export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete("gecko_tenant_id");
  cookieStore.delete("gecko_super_admin");
  cookieStore.delete("gecko_staff_token");
  return { success: true };
}