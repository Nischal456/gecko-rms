"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

async function getTenantId() {
  const cookieStore = await cookies();
  return cookieStore.get("gecko_tenant_id")?.value;
}

// --- GET MENU ---
export async function getMenu() {
  const tenantId = await getTenantId();
  if (!tenantId) return { success: false, error: "Unauthorized" };

  const { data: categories, error } = await supabaseAdmin
    .from("menu_categories")
    .select("*, menu_items(*)")
    .eq("tenant_id", tenantId)
    .order("sort_order", { ascending: true });

  if (error) return { success: false, error: error.message };

  // Sort items by creation
  categories?.forEach(cat => {
    cat.menu_items.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  });

  return { success: true, data: categories };
}

// --- CATEGORY ACTIONS ---
export async function createCategory(name: string) {
  const tenantId = await getTenantId();
  if (!tenantId) return { success: false };
  const { error } = await supabaseAdmin.from("menu_categories").insert({ tenant_id: tenantId, name, sort_order: 99 });
  if (!error) revalidatePath("/admin/menu");
  return { success: !error };
}

export async function deleteCategory(id: string) {
  const { error } = await supabaseAdmin.from("menu_categories").delete().eq("id", id);
  if (!error) revalidatePath("/admin/menu");
  return { success: !error };
}

// --- CREATE ITEM ---
export async function createItem(data: any) {
  const tenantId = await getTenantId();
  if (!tenantId) return { success: false };

  const variants = Array.isArray(data.variants) ? data.variants : [];
  let basePrice = 0;
  if (variants.length > 0) {
      const prices = variants.map((v: any) => Number(v.price)).filter((p: number) => !isNaN(p) && p > 0);
      if (prices.length > 0) basePrice = Math.min(...prices);
  }

  const { error } = await supabaseAdmin.from("menu_items").insert({
    tenant_id: tenantId,
    category_id: data.category_id,
    name: data.name,
    description: data.description,
    dietary: data.dietary,
    station: data.station,
    image_url: data.image_url, 
    variants: variants,
    price: basePrice,
    is_available: true
  });

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/menu");
  return { success: true };
}

// --- UPDATE ITEM (FIXED) ---
export async function updateItem(id: string, data: any) {
  const variants = Array.isArray(data.variants) ? data.variants : [];
  let basePrice = 0;
  if (variants.length > 0) {
      const prices = variants.map((v: any) => Number(v.price)).filter((p: number) => !isNaN(p) && p > 0);
      if (prices.length > 0) basePrice = Math.min(...prices);
  }

  const { error } = await supabaseAdmin.from("menu_items").update({
    category_id: data.category_id, // Allows transferring category
    name: data.name,
    description: data.description,
    dietary: data.dietary,
    station: data.station,
    image_url: data.image_url,
    variants: variants,
    price: basePrice
  }).eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/menu");
  return { success: true };
}

export async function toggleItemStock(id: string, currentStatus: boolean) {
  const { error } = await supabaseAdmin.from("menu_items").update({ is_available: !currentStatus }).eq("id", id);
  if (!error) revalidatePath("/admin/menu");
  return { success: !error };
}

export async function deleteItem(id: string) {
  const { error } = await supabaseAdmin.from("menu_items").delete().eq("id", id);
  if (!error) revalidatePath("/admin/menu");
  return { success: !error };
}