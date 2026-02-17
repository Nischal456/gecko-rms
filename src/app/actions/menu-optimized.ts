"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

async function getTenantId() {
  const cookieStore = await cookies();
  const rawId = cookieStore.get("gecko_tenant_id")?.value;
  return rawId && !isNaN(Number(rawId)) ? Number(rawId) : 5;
}

// --- FETCH MENU (From menu_optimized) ---
export async function getKitchenMenuData() {
  const tenantId = await getTenantId();
  
  const { data, error } = await supabaseAdmin
    .from("menu_optimized")
    .select("id, category_name, items") // items is JSONB
    .eq("tenant_id", tenantId)
    .order("sort_order", { ascending: true });

  if (error) {
      console.error("Menu Fetch Error:", error);
      return { success: false, categories: [] };
  }

  // Ensure items is always an array
  const formatted = data.map((cat: any) => ({
      ...cat,
      items: Array.isArray(cat.items) ? cat.items : []
  }));

  return { success: true, categories: formatted };
}

// --- SAVE CATEGORY ---
export async function saveKitchenCategory(id: string | null, name: string) {
    const tenantId = await getTenantId();
    
    if (id) {
        await supabaseAdmin.from("menu_optimized").update({ category_name: name }).eq("id", id).eq("tenant_id", tenantId);
    } else {
        await supabaseAdmin.from("menu_optimized").insert({ 
            category_name: name, 
            tenant_id: tenantId, 
            items: [] // Start empty
        });
    }
    
    revalidatePath("/staff/kitchen/menu");
    revalidatePath("/staff/manager/menu");
    revalidatePath("/admin/menu"); // Revalidate Admin too
    return { success: true };
}

// --- DELETE CATEGORY ---
export async function deleteKitchenCategory(id: string) {
    const tenantId = await getTenantId();
    await supabaseAdmin.from("menu_optimized").delete().eq("id", id).eq("tenant_id", tenantId);
    
    revalidatePath("/staff/kitchen/menu");
    revalidatePath("/staff/manager/menu");
    revalidatePath("/admin/menu");
    return { success: true };
}

// --- SAVE ITEM (JSONB Push/Update) ---
export async function saveKitchenItem(categoryId: string, item: any) {
    const tenantId = await getTenantId();
    
    // 1. Fetch current category data
    const { data: cat } = await supabaseAdmin
        .from("menu_optimized")
        .select("items")
        .eq("id", categoryId)
        .eq("tenant_id", tenantId)
        .single();

    if (!cat) return { success: false, error: "Category not found" };

    let items = Array.isArray(cat.items) ? cat.items : [];

    // 2. Prepare Item Object
    const newItem = {
        id: item.id || crypto.randomUUID(), // Generate ID if new
        name: item.name,
        description: item.description,
        price: Number(item.price),
        sub_category: item.sub_category,
        image_url: item.image_url,
        dietary: item.dietary,
        station: item.station,
        variants: item.variants,
        is_available: item.is_available
    };

    // 3. Update Array
    if (item.id) {
        // Edit existing
        items = items.map((i: any) => i.id === item.id ? newItem : i);
    } else {
        // Add new
        items.push(newItem);
    }

    // 4. Save back to DB
    const { error } = await supabaseAdmin
        .from("menu_optimized")
        .update({ items: items })
        .eq("id", categoryId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/staff/kitchen/menu");
    revalidatePath("/staff/manager/menu");
    revalidatePath("/admin/menu");
    return { success: true };
}

// --- DELETE ITEM (JSONB Filter) ---
export async function deleteKitchenItem(categoryId: string, itemId: string) {
    const tenantId = await getTenantId();

    const { data: cat } = await supabaseAdmin
        .from("menu_optimized")
        .select("items")
        .eq("id", categoryId)
        .eq("tenant_id", tenantId)
        .single();

    if (!cat) return { success: false };

    const items = (cat.items || []).filter((i: any) => i.id !== itemId);

    await supabaseAdmin
        .from("menu_optimized")
        .update({ items })
        .eq("id", categoryId);

    revalidatePath("/staff/kitchen/menu");
    revalidatePath("/staff/manager/menu");
    revalidatePath("/admin/menu");
    return { success: true };
}

// --- TOGGLE AVAILABILITY (JSONB Update) ---
export async function quickToggleItem(categoryId: string, itemId: string, status: boolean) {
    const tenantId = await getTenantId();

    const { data: cat } = await supabaseAdmin
        .from("menu_optimized")
        .select("items")
        .eq("id", categoryId)
        .eq("tenant_id", tenantId)
        .single();

    if (!cat) return { success: false };

    const items = (cat.items || []).map((i: any) => 
        i.id === itemId ? { ...i, is_available: status } : i
    );

    await supabaseAdmin
        .from("menu_optimized")
        .update({ items })
        .eq("id", categoryId);

    revalidatePath("/staff/kitchen/menu");
    revalidatePath("/staff/manager/menu");
    revalidatePath("/admin/menu");
    return { success: true };
}

// ============================================================================
// *** TITANIUM ALIAS EXPORTS (FIXES ALL IMPORT ERRORS) ***
// ============================================================================

// 1. Core Data
export const getMenuData = getKitchenMenuData;

// 2. Categories
export const saveCategory = saveKitchenCategory;     // FIXES ERROR 1
export const deleteCategory = deleteKitchenCategory; // FIXES ERROR 2

// 3. Items
export const saveMenuItem = saveKitchenItem;
export const deleteMenuItem = deleteKitchenItem;

// 4. Toggles (Wrapper for signature mismatch)
export async function toggleItemAvailability(categoryId: string, itemId: string) {
    const tenantId = await getTenantId();
    const { data: cat } = await supabaseAdmin
        .from("menu_optimized")
        .select("items")
        .eq("id", categoryId)
        .eq("tenant_id", tenantId)
        .single();

    if (!cat) return { success: false };

    const items = (cat.items || []).map((i: any) => 
        i.id === itemId ? { ...i, is_available: !i.is_available } : i
    );

    await supabaseAdmin.from("menu_optimized").update({ items }).eq("id", categoryId);
    
    revalidatePath("/staff/manager/menu");
    revalidatePath("/admin/menu");
    return { success: true };
}