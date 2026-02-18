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

    // Query using ILIKE for case-insensitive matching on the code
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

    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: "Update failed." };
  }
}

// --- 3. MAIN LOGIN HANDLER (ENV VAR SUPPORT RESTORED) ---
export async function loginUser(data: any) {
  const code = data instanceof FormData ? data.get("code") as string : data.code;
  const email = data instanceof FormData ? data.get("email") as string : data.email;
  const password = data instanceof FormData ? data.get("password") as string : data.password;

  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === "production";

  // --- CLEAN INPUTS ---
  const cleanEmail = email?.toLowerCase().trim();
  const cleanCode = code?.trim().toUpperCase();

  // --- CONFIG (CHECKS .ENV FIRST, DEFAULTS TO HARDCODED) ---
  const SUPER_EMAIL = (process.env.SUPER_ADMIN_EMAIL || "super@gecko.works").toLowerCase();
  const SUPER_PASS = process.env.SUPER_ADMIN_PASSWORD || "admin123";

  // ---------------------------------------------------------
  // A. SUPER ADMIN LOGIN (Exclusive Path)
  // ---------------------------------------------------------
  if (cleanEmail === SUPER_EMAIL) {
      if (password === SUPER_PASS) {
          // Success
          (await cookieStore).set("gecko_super_admin", "true", { 
            path: '/', 
            httpOnly: true, 
            secure: isProduction, 
            maxAge: 60 * 60 * 24 * 7, 
            sameSite: "lax"
          });
          return { success: true, role: "super_admin", url: "/super-admin", name: "Master Control" };
      } else {
          // Fail explicitly - do not fall through
          console.error("Super Admin Login Failed: Incorrect Password");
          return { success: false, error: "Invalid Admin Credentials" };
      }
  }

  // ---------------------------------------------------------
  // B. RESTAURANT ADMIN LOGIN (Standard Path)
  // ---------------------------------------------------------
  try {
    // 1. Fetch Tenant
    const { data: tenant, error } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .ilike("code", cleanCode) 
      .single();

    if (error || !tenant) {
        return { success: false, error: "Invalid Restaurant Code." };
    }

    // 2. Suspension Check
    if (tenant.subscription_status === 'suspended') {
        return { 
            success: false, 
            error: "⛔ SERVICE SUSPENDED: Contact GeckoRMS Administrator." 
        };
    }

    // 3. Email Check
    const dbEmail = (tenant.admin_email || tenant.email || "").toLowerCase().trim();
    if (dbEmail !== cleanEmail) {
        return { success: false, error: "Invalid Email Address." };
    }

    // 4. Password Check
    if (tenant.admin_password !== password) {
        return { success: false, error: "Incorrect Password." };
    }

    // 5. Success
    (await cookieStore).set("gecko_tenant_id", tenant.id.toString(), { 
      path: '/', 
      httpOnly: true, 
      secure: isProduction, 
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
  const isSuper = (await cookieStore).get("gecko_super_admin");
  const isProduction = process.env.NODE_ENV === "production";
  
  if (!isSuper) return { success: false, error: "Unauthorized" };

  (await cookieStore).set("gecko_tenant_id", tenantId.toString(), { 
    path: '/', 
    httpOnly: true, 
    secure: isProduction,
    maxAge: 60 * 60 * 24, 
    sameSite: "lax"
  });

  return { success: true, url: "/admin" };
}

// --- 5. LOGOUT ---
export async function logoutUser() {
  const cookieStore = await cookies();
  (await cookieStore).delete("gecko_tenant_id");
  (await cookieStore).delete("gecko_super_admin");
  (await cookieStore).delete("gecko_staff_token");
  return { success: true };
}