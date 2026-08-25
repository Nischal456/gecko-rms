"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { getBusinessDate } from "@/lib/utils";
import { unstable_noStore } from "next/cache";

function safeParse(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return [];
}

export async function getActiveBusinessDate(tenantId: string | number): Promise<string> {
    unstable_noStore();
    const dateStr = getBusinessDate(new Date());
    
    try {
        const { data } = await supabaseAdmin
            .from("daily_order_logs")
            .select("orders_data")
            .eq("tenant_id", tenantId)
            .eq("date", dateStr)
            .maybeSingle();

        if (data) {
            const orders = safeParse(data.orders_data);
            const isClosed = orders.some((o: any) => o.id === "DAY_CLOSE_META" && o.status === "closed");
            if (isClosed) {
                return await getNextDateString(dateStr);
            }
        }
    } catch (err) {
        console.error("Error in getActiveBusinessDate:", err);
    }
    return dateStr;
}

export async function getPreviousDateString(dateStr: string): Promise<string> {
    const d = new Date(dateStr + "T12:00:00");
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export async function getNextDateString(dateStr: string): Promise<string> {
    const d = new Date(dateStr + "T12:00:00");
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
