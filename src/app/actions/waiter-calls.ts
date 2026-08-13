"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

function safeParse(val: any) {
    if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return null; }
    }
    return val;
}

export async function callWaiter(tenantId: string, tableNo: string) {
    try {
        const today = new Date().toLocaleDateString('en-CA');
        
        // 0. Validate Table against Floor Plan
        const { data: tableData } = await supabaseAdmin
            .from("restaurant_tables")
            .select("label")
            .eq("tenant_id", tenantId)
            .ilike("label", tableNo.trim())
            .maybeSingle();

        if (!tableData) {
            return { success: false, error: "We couldn't find that table. Please double-check your table number and try again." };
        }

        const validTable = tableData.label;
        
        // 1. Fetch current daily_order_logs
        const { data: currentLog, error: fetchError } = await supabaseAdmin
            .from("daily_order_logs")
            .select("date, orders_data")
            .eq("tenant_id", tenantId)
            .eq("date", today)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            return { success: false, error: fetchError.message };
        }

        const callObject = {
            id: `CALL-${Date.now()}-${Math.random().toString(36).substring(2,9)}`,
            type: "waiter_call",
            table_no: validTable,
            tbl: validTable,
            status: "waiter_call_active",
            created_at: new Date().toISOString(),
            timestamp: new Date().toISOString(),
            items: [], // Ensures kitchen/bartender scripts don't crash
            total: 0
        };

        if (!currentLog) {
            // Create new day log if it doesn't exist
            await supabaseAdmin.from("daily_order_logs").insert({
                tenant_id: tenantId,
                date: today,
                orders_data: [callObject]
            });
        } else {
            // Append to existing
            const currentOrders = safeParse(currentLog.orders_data) || [];
            
            // Avoid duplicate active calls for the same table
            const existingCallIndex = currentOrders.findIndex((o: any) => 
                o.type === 'waiter_call' && 
                o.status === 'waiter_call_active' && 
                (o.table_no === validTable || o.tbl === validTable)
            );

            if (existingCallIndex >= 0) {
                // Already calling
                return { success: true };
            }

            await supabaseAdmin.from("daily_order_logs").update({
                orders_data: [...currentOrders, callObject]
            }).eq("tenant_id", tenantId).eq("date", today);
        }

        revalidatePath("/staff/waiter");
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function resolveWaiterCall(passedTenantId: string, callId: string) {
    try {
        const today = new Date().toLocaleDateString('en-CA');
        
        const cookieStore = await cookies();
        const rawCookieId = cookieStore.get("gecko_tenant_id")?.value;
        const tenantId = rawCookieId ? Number(rawCookieId) : Number(passedTenantId);

        const { data: currentLog, error: fetchError } = await supabaseAdmin
            .from("daily_order_logs")
            .select("date, orders_data")
            .eq("tenant_id", tenantId)
            .eq("date", today)
            .single();

        if (fetchError || !currentLog) return { success: false, error: fetchError?.message || "Log not found" };

        const currentOrders = safeParse(currentLog.orders_data) || [];
        const updatedOrders = currentOrders.map((o: any) => {
            if (o.id === callId) {
                return { ...o, status: "waiter_call_resolved", resolved_at: new Date().toISOString() };
            }
            return o;
        });

        const { error: updateError } = await supabaseAdmin.from("daily_order_logs").update({
            orders_data: updatedOrders
        }).eq("tenant_id", tenantId).eq("date", today);

        if (updateError) return { success: false, error: updateError.message };

        revalidatePath("/staff/waiter");
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
