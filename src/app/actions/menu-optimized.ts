"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";

async function getTenantId() {
  const cookieStore = await cookies();
  const rawId = cookieStore.get("gecko_tenant_id")?.value;
  
  // FIX: Strictly use the cookie ID. If missing, return 0 (Auth Error).
  if (rawId && !isNaN(Number(rawId))) {
      return Number(rawId);
  }
  
  console.error("CRITICAL: No Tenant ID found in cookies.");
  return 0; 
}

// ============================================================================
// 1. PUBLIC ACCESS (For Customers Scanning QR)
// ============================================================================

export async function getPublicMenuData(tenantId: string) {
  // 1. Validate ID from URL
  const id = Number(tenantId);
  if (isNaN(id) || id === 0) return { success: false, categories: [], tenant_name: "Invalid Menu", tenant_logo: "" };

  // 2. Fetch Data (Parallel: Menu Data + Tenant Name & Logo)
  const [menuRes, tenantRes] = await Promise.all([
    supabaseAdmin
      .from("menu_optimized")
      .select("id, category_name, items")
      .eq("tenant_id", id)
      .order("sort_order", { ascending: true }),
    
    supabaseAdmin
      .from("tenants")
      .select("name, logo_url") // UPDATED: Now fetching logo_url
      .eq("id", id)
      .single()
  ]);

  if (menuRes.error) {
      console.error(`Public Menu Fetch Error (Tenant ${id}):`, menuRes.error);
      return { success: false, categories: [], tenant_name: "Error", tenant_logo: "" };
  }

  // 3. Format & Filter (Hide hidden items) with ROBUST PARSING
  const formatted = menuRes.data.map((cat: any) => {
      let items = [];
      
      // Handle different data types from Supabase (JSONB array vs String)
      if (Array.isArray(cat.items)) {
          items = cat.items;
      } else if (typeof cat.items === 'string') {
          try { 
              items = JSON.parse(cat.items); 
          } catch (e) { 
              console.error("Error parsing items JSON:", e);
              items = []; 
          }
      }

      // Filter only available items
      return {
          ...cat,
          items: items.filter((i: any) => i.is_available !== false)
      };
  });

  // Return categories AND the tenant details
  return { 
      success: true, 
      categories: formatted, 
      tenant_name: tenantRes.data?.name || "Digital Menu",
      tenant_logo: tenantRes.data?.logo_url || "" // Return the logo
  };
}

// ============================================================================
// 2. INTERNAL MANAGEMENT (For Admin & Kitchen)
// ============================================================================

// --- FETCH MENU ---
export async function getKitchenMenuData() {
  const tenantId = await getTenantId();
  // Safety check: if no ID, return empty but safe object
  if (tenantId === 0) return { success: false, categories: [], tenant_id: 0 }; 
  
  const { data, error } = await supabaseAdmin
    .from("menu_optimized")
    .select("id, category_name, items") // items is JSONB
    .eq("tenant_id", tenantId)
    .order("sort_order", { ascending: true });

  if (error) {
      console.error("Menu Fetch Error:", error);
      return { success: false, categories: [], tenant_id: tenantId };
  }

  // Ensure items is always an array
  const formatted = data.map((cat: any) => ({
      ...cat,
      items: Array.isArray(cat.items) ? cat.items : []
  }));

  // CRITICAL FIX: Return tenant_id so frontend can use it as fallback
  return { success: true, categories: formatted, tenant_id: tenantId };
}

// --- SAVE CATEGORY ---
export async function saveKitchenCategory(id: string | null, name: string) {
    const tenantId = await getTenantId();
    if (tenantId === 0) return { success: false, error: "Unauthorized" };
    
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
    revalidatePath("/admin/menu"); 
    revalidateTag(`menu-${tenantId}`, undefined as any);
    return { success: true };
}

// --- DELETE CATEGORY ---
export async function deleteKitchenCategory(id: string) {
    const tenantId = await getTenantId();
    if (tenantId === 0) return { success: false, error: "Unauthorized" };

    await supabaseAdmin.from("menu_optimized").delete().eq("id", id).eq("tenant_id", tenantId);
    
    revalidatePath("/staff/kitchen/menu");
    revalidatePath("/staff/manager/menu");
    revalidatePath("/admin/menu");
    revalidateTag(`menu-${tenantId}`, undefined as any);
    return { success: true };
}

// --- SAVE ITEM (JSONB Push/Update) ---
export async function saveKitchenItem(categoryId: string, item: any) {
    const tenantId = await getTenantId();
    if (tenantId === 0) return { success: false, error: "Unauthorized" };
    
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
        is_available: item.is_available,
        is_special: item.is_special || false
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
    revalidatePath("/menu/[id]"); // Update Public View
    revalidateTag(`menu-${tenantId}`, undefined as any);
    return { success: true };
}

// --- DELETE ITEM (JSONB Filter) ---
export async function deleteKitchenItem(categoryId: string, itemId: string) {
    const tenantId = await getTenantId();
    if (tenantId === 0) return { success: false, error: "Unauthorized" };

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
    if (tenantId === 0) return { success: false, error: "Unauthorized" };

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
    revalidatePath("/menu/[id]");
    revalidateTag(`menu-${tenantId}`, undefined as any);
    return { success: true };
}

// --- TOGGLE SPECIAL (JSONB Update) ---
export async function toggleSpecialItem(categoryId: string, itemId: string, isSpecial: boolean) {
    const tenantId = await getTenantId();
    if (tenantId === 0) return { success: false, error: "Unauthorized" };

    const { data: cat } = await supabaseAdmin
        .from("menu_optimized")
        .select("items")
        .eq("id", categoryId)
        .eq("tenant_id", tenantId)
        .single();

    if (!cat) return { success: false };

    const items = (cat.items || []).map((i: any) => 
        i.id === itemId ? { ...i, is_special: isSpecial } : i
    );

    await supabaseAdmin
        .from("menu_optimized")
        .update({ items })
        .eq("id", categoryId);

    revalidatePath("/staff/kitchen/menu");
    revalidatePath("/staff/manager/menu");
    revalidatePath("/admin/menu");
    revalidatePath("/menu/[id]");
    return { success: true };
}

// ============================================================================
// *** TITANIUM ALIAS EXPORTS (FIXES ALL IMPORT ERRORS) ***
// ============================================================================

// 1. Core Data
export const getMenuData = getKitchenMenuData;

// 2. Categories
export const saveCategory = saveKitchenCategory;
export const deleteCategory = deleteKitchenCategory;

// 3. Items
export const saveMenuItem = saveKitchenItem;
export const deleteMenuItem = deleteKitchenItem;

// 4. Toggles (Wrapper for signature mismatch)
export async function toggleItemAvailability(categoryId: string, itemId: string) {
    const tenantId = await getTenantId();
    if (tenantId === 0) return { success: false }; // Safety check

    const { data: cat } = await supabaseAdmin
        .from("menu_optimized")
        .select("items")
        .eq("id", categoryId)
        .eq("tenant_id", tenantId)
        .single();

    if (!cat) return { success: false };

    // Flip the current status
    const items = (cat.items || []).map((i: any) => 
        i.id === itemId ? { ...i, is_available: !i.is_available } : i
    );

    await supabaseAdmin.from("menu_optimized").update({ items }).eq("id", categoryId);
    
    revalidatePath("/staff/manager/menu");
    revalidatePath("/admin/menu");
    revalidatePath("/menu/[id]");
    return { success: true };
}