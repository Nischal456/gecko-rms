"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

async function getContext() {
  const c = await cookies();
  const tId = c.get("gecko_tenant_id")?.value;
  const sTok = c.get("gecko_staff_token")?.value;
  return {
    tenantId: tId ? Number(tId) : 5,
    staff: sTok ? JSON.parse(sTok) : { name: "Demo Staff", id: "staff_001" }
  };
}

// --- 1. GET REPORT DATA ---
export async function getWaiterReports() {
  const { tenantId, staff } = await getContext();
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

  try {
    // A. FETCH PERFORMANCE (Orders from this month)
    const { data: logs } = await supabaseAdmin
      .from("daily_order_logs")
      .select("date, orders_data")
      .eq("tenant_id", tenantId)
      .gte("date", firstDay); // Current month only

    // Process Stats
    let totalSales = 0;
    let tablesServed = 0;
    const dailyMap: Record<string, number> = {};

    (logs || []).forEach((log: any) => {
      const orders = Array.isArray(log.orders_data) ? log.orders_data : [];
      // Filter orders by this staff member
      const myOrders = orders.filter((o: any) => 
        o.staff?.toLowerCase() === staff.name.toLowerCase() && 
        o.status !== 'cancelled'
      );

      myOrders.forEach((o: any) => {
        totalSales += (Number(o.total) || 0);
        tablesServed += 1; // Or use unique table logic
        
        // Chart Data
        const day = new Date(log.date).getDate();
        dailyMap[day] = (dailyMap[day] || 0) + (Number(o.total) || 0);
      });
    });

    const chartData = Object.keys(dailyMap).map(d => ({
        day: `Day ${d}`,
        sales: dailyMap[d]
    })).sort((a, b) => parseInt(a.day.split(' ')[1]) - parseInt(b.day.split(' ')[1]));

    // B. FETCH PAYROLL & LEAVE (JSON Columns from Staff Profile)
    // Assuming table 'staff_profiles' exists. If not, we return mock/empty structure.
    const { data: profile } = await supabaseAdmin
        .from("staff_members") // Adjust table name if different
        .select("payroll_history, leave_requests")
        .eq("tenant_id", tenantId)
        .eq("name", staff.name)
        .single();

    return {
        success: true,
        stats: { totalSales, tablesServed, chartData },
        payroll: profile?.payroll_history || [], 
        leaves: profile?.leave_requests || []
    };

  } catch (e) {
      console.error(e);
      return { success: false, msg: "Failed to load reports" };
  }
}

// --- 2. SUBMIT LEAVE REQUEST (JSON UPDATE) ---
export async function submitLeaveRequest(requestData: any) {
    const { tenantId, staff } = await getContext();
    
    // Create new request object
    const newRequest = {
        id: `LVE-${Date.now()}`,
        ...requestData,
        status: 'pending',
        date_applied: new Date().toISOString().split('T')[0]
    };

    try {
        // 1. Get current list
        const { data: user } = await supabaseAdmin
            .from("staff_members")
            .select("id, leave_requests")
            .eq("tenant_id", tenantId)
            .eq("name", staff.name)
            .single();

        if (!user) return { success: false, msg: "Profile not found" };

        // 2. Append new request to JSON array
        const currentLeaves = Array.isArray(user.leave_requests) ? user.leave_requests : [];
        const updatedLeaves = [newRequest, ...currentLeaves];

        // 3. Save back (Efficient Storage)
        const { error } = await supabaseAdmin
            .from("staff_members")
            .update({ leave_requests: updatedLeaves })
            .eq("id", user.id);

        if (error) throw error;

        revalidatePath("/staff/waiter/reports");
        return { success: true };

    } catch (e: any) {
        return { success: false, msg: e.message || "Failed to submit" };
    }
}