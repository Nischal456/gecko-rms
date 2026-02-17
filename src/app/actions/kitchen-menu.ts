"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

async function getTenantId() {
  const cookieStore = await cookies();
  const rawId = cookieStore.get("gecko_tenant_id")?.value;
  return rawId && !isNaN(Number(rawId)) ? Number(rawId) : 5;
}

// --- 1. FETCH MENU (Targeting 'menu_optimized') ---
export async function getKitchenMenuData() {
  const tenantId = await getTenantId();
  
  try {
    // Fetch from the new OPTIMIZED table
    const { data, error } = await supabaseAdmin
      .from("menu_optimized")
      .select("id, category_name, items") 
      .eq("tenant_id", tenantId)
      .order("sort_order", { ascending: true });

    if (error) throw error;

    // Sanitize: Ensure 'items' is always an array
    const formatted = (data || []).map((cat: any) => ({
        ...cat,
        items: Array.isArray(cat.items) ? cat.items : []
    }));

    return { success: true, categories: formatted };

  } catch (error: any) {
    console.error("Menu Fetch Error:", error.message);
    return { success: false, categories: [], error: error.message };
  }
}

// --- 2. SAVE CATEGORY ---
export async function saveKitchenCategory(id: string | null, name: string) {
    const tenantId = await getTenantId();
    
    if (id) {
        await supabaseAdmin.from("menu_optimized").update({ category_name: name }).eq("id", id).eq("tenant_id", tenantId);
    } else {
        // Create new category with empty items array
        await supabaseAdmin.from("menu_optimized").insert({ 
            category_name: name, 
            tenant_id: tenantId, 
            items: [] 
        });
    }
    
    revalidatePath("/staff/kitchen/menu");
    return { success: true };
}

// --- 3. DELETE CATEGORY ---
export async function deleteKitchenCategory(id: string) {
    const tenantId = await getTenantId();
    await supabaseAdmin.from("menu_optimized").delete().eq("id", id).eq("tenant_id", tenantId);
    revalidatePath("/staff/kitchen/menu");
    return { success: true };
}

// --- 4. SAVE ITEM (Push to JSONB Array) ---
export async function saveKitchenItem(categoryId: string, item: any) {
    const tenantId = await getTenantId();
    
    // Get current category data
    const { data: cat } = await supabaseAdmin
        .from("menu_optimized")
        .select("items")
        .eq("id", categoryId)
        .eq("tenant_id", tenantId)
        .single();

    if (!cat) return { success: false, error: "Category not found" };

    let currentItems = Array.isArray(cat.items) ? cat.items : [];

    const newItem = {
        id: item.id || crypto.randomUUID(),
        name: item.name,
        description: item.description || "",
        price: Number(item.price),
        sub_category: item.sub_category || "",
        image_url: item.image_url || "",
        dietary: item.dietary || "non-veg",
        station: item.station || "kitchen",
        variants: item.variants || [],
        is_available: item.is_available ?? true
    };

    if (item.id) {
        // Update existing item
        currentItems = currentItems.map((i: any) => i.id === item.id ? newItem : i);
    } else {
        // Add new item
        currentItems.push(newItem);
    }

    const { error } = await supabaseAdmin
        .from("menu_optimized")
        .update({ items: currentItems })
        .eq("id", categoryId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/staff/kitchen/menu");
    return { success: true };
}

// --- 5. DELETE ITEM (Filter JSONB Array) ---
// FIXED: Now accepts (categoryId, itemId) to match Frontend
export async function deleteKitchenItem(categoryId: string, itemId: string) {
    const tenantId = await getTenantId();

    const { data: cat } = await supabaseAdmin
        .from("menu_optimized")
        .select("items")
        .eq("id", categoryId)
        .eq("tenant_id", tenantId)
        .single();

    if (!cat) return { success: false };

    const updatedItems = (cat.items || []).filter((i: any) => i.id !== itemId);

    await supabaseAdmin
        .from("menu_optimized")
        .update({ items: updatedItems })
        .eq("id", categoryId);

    revalidatePath("/staff/kitchen/menu");
    return { success: true };
}

// --- 6. TOGGLE AVAILABILITY (Update JSONB Field) ---
// FIXED: Now accepts (categoryId, itemId, status) to match Frontend
export async function quickToggleItem(categoryId: string, itemId: string, status: boolean) {
    const tenantId = await getTenantId();

    const { data: cat } = await supabaseAdmin
        .from("menu_optimized")
        .select("items")
        .eq("id", categoryId)
        .eq("tenant_id", tenantId)
        .single();

    if (!cat) return { success: false };

    const updatedItems = (cat.items || []).map((i: any) => 
        i.id === itemId ? { ...i, is_available: status } : i
    );

    await supabaseAdmin
        .from("menu_optimized")
        .update({ items: updatedItems })
        .eq("id", categoryId);

    revalidatePath("/staff/kitchen/menu");
    return { success: true };
}