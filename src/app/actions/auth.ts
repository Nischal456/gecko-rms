"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { sendResetEmail } from "@/lib/mail";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

// --- 1. REQUEST RESET ---
export async function requestPasswordReset(code: string, email: string) {
  try {
    const cleanCode = code.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();

    const { data: tenant, error } = await supabaseAdmin
      .from("tenants")
      .select("id, name, admin_email, email") 
      .ilike("code", cleanCode)
      .single();

    if (error || !tenant) {
      return { success: false, error: "Invalid Restaurant Code." };
    }

    const dbEmail = (tenant.admin_email || tenant.email || "").toLowerCase().trim();
    if (dbEmail !== cleanEmail) {
      return { success: false, error: "Email does not match our records." };
    }

    const token = randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 3600000); 

    await supabaseAdmin
      .from("tenants")
      .update({ reset_token: token, reset_token_expiry: expiry.toISOString() })
      .eq("id", tenant.id);

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://46.225.226.113";
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

    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: "Update failed." };
  }
}

// --- 3. MAIN LOGIN HANDLER ---
export async function loginUser(data: any) {
  const code = data instanceof FormData ? data.get("code") as string : data.code;
  const email = data instanceof FormData ? data.get("email") as string : data.email;
  const password = data instanceof FormData ? data.get("password") as string : data.password;

  const cookieStore = await cookies();

  const cleanEmail = email?.toLowerCase().trim();
  const cleanCode = code?.trim().toUpperCase();

  const SUPER_EMAIL = (process.env.SUPER_ADMIN_EMAIL || "super@gecko.works").toLowerCase();
  const SUPER_PASS = process.env.SUPER_ADMIN_PASSWORD || "admin123";

  // A. SUPER ADMIN LOGIN
  if (cleanEmail === SUPER_EMAIL) {
      if (password === SUPER_PASS) {
          cookieStore.set("gecko_super_admin", "true", { 
            path: '/', 
            httpOnly: true, 
            secure: false, // CRITICAL FIX: Set to false for HTTP IP addresses
            maxAge: 60 * 60 * 24 * 7, 
            sameSite: "lax"
          });
          return { success: true, role: "super_admin", url: "/super-admin", name: "Master Control" };
      } else {
          return { success: false, error: "Invalid Admin Credentials" };
      }
  }

  // B. RESTAURANT ADMIN LOGIN
  try {
    const { data: tenant, error } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .ilike("code", cleanCode) 
      .single();

    if (error || !tenant) return { success: false, error: "Invalid Restaurant Code." };

    if (tenant.subscription_status === 'suspended') {
        return { success: false, error: "⛔ SERVICE SUSPENDED: Contact GeckoRMS Administrator." };
    }

    const dbEmail = (tenant.admin_email || tenant.email || "").toLowerCase().trim();
    if (dbEmail !== cleanEmail) return { success: false, error: "Invalid Email Address." };

    if (tenant.admin_password !== password) return { success: false, error: "Incorrect Password." };

    cookieStore.set("gecko_tenant_id", tenant.id.toString(), { 
      path: '/', 
      httpOnly: true, 
      secure: false, // CRITICAL FIX: Set to false for HTTP IP addresses
      maxAge: 60 * 60 * 24 * 7, 
      sameSite: "lax"
    });
    
    return { success: true, role: "restaurant_admin", url: "/admin", name: tenant.name };

  } catch (err: any) {
    return { success: false, error: "Connection Error. Try again." };
  }
}

// --- 4. IMPERSONATION ---
export async function impersonateTenant(tenantId: number) {
  const cookieStore = await cookies();
  const isSuper = cookieStore.get("gecko_super_admin");
  
  if (!isSuper) return { success: false, error: "Unauthorized" };

  cookieStore.set("gecko_tenant_id", tenantId.toString(), { 
    path: '/', 
    httpOnly: true, 
    secure: false, // CRITICAL FIX
    maxAge: 60 * 60 * 24, 
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