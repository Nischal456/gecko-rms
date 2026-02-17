"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";

async function getTenantId(): Promise<number> {
  const cookieStore = await cookies();
  const rawId = cookieStore.get("gecko_tenant_id")?.value;
  return rawId && !isNaN(Number(rawId)) ? Number(rawId) : 5;
}

export async function getManagerDashboard() {
  const tenantId = await getTenantId();
  const today = new Date().toISOString().split('T')[0];

  try {
    // 1. FETCH REVENUE (Today's Orders)
    const { data: logs } = await supabaseAdmin
      .from("daily_order_logs")
      .select("orders_data")
      .eq("tenant_id", tenantId)
      .eq("date", today)
      .maybeSingle();

    const orders = logs && Array.isArray(logs.orders_data) ? logs.orders_data : [];
    
    // Filter valid orders
    const validOrders = orders.filter((o: any) => o.status !== 'cancelled');
    const activeOrders = orders.filter((o: any) => !['cancelled', 'paid', 'completed'].includes(o.status));

    // Calculate Revenue
    const totalRevenue = validOrders.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0);
    const totalOrders = validOrders.length;
    const openOrders = activeOrders.length;

    // 2. FETCH EXPENSES (Today's Real Expenses)
    let totalExpense = 0;
    try {
        const { data: expenses } = await supabaseAdmin
            .from("operating_expenses")
            .select("amount")
            .eq("tenant_id", tenantId)
            .eq("date", today);
        
        if (expenses) {
            totalExpense = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        }
    } catch (e) {
        // If table doesn't exist yet, expense is 0
        totalExpense = 0;
    }

    // 3. CALCULATE NET PROFIT (Strict Math)
    const netProfit = totalRevenue - totalExpense;
    const margin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

    // 4. FETCH TABLES (Occupancy)
    const { data: tables } = await supabaseAdmin
        .from("restaurant_tables")
        .select("status")
        .eq("tenant_id", tenantId);
    
    const occupiedTables = tables?.filter((t: any) => t.status === 'occupied').length || 0;

    // 5. FETCH STAFF (Active)
    const { count: staffCount } = await supabaseAdmin
        .from("staff_members")
        .select("*", { count: 'exact', head: true })
        .eq("tenant_id", tenantId);

    // 6. FETCH RECENT ACTIVITY
    const recentActivity = validOrders.reverse().slice(0, 10).map((o: any) => ({
        id: o.id,
        table_name: o.tbl,
        status: o.status,
        total_amount: o.total,
        created_at: o.timestamp || new Date().toISOString()
    }));

    // 7. CHART DATA (Hourly Distribution)
    const hourlyData: Record<string, number> = {};
    validOrders.forEach((o: any) => {
        const date = new Date(o.timestamp || new Date());
        const hour = date.getHours();
        const key = `${hour}:00`;
        hourlyData[key] = (hourlyData[key] || 0) + (Number(o.total) || 0);
    });

    const chartData = Object.keys(hourlyData).map(key => ({
        time: key,
        value: hourlyData[key]
    })).sort((a, b) => parseInt(a.time) - parseInt(b.time));

    return {
      success: true,
      tenant: { name: "Restaurant Manager", code: "MGR", logo_url: "" },
      stats: {
        revenue: totalRevenue,
        expenses: totalExpense, // Real Data
        profit: netProfit,      // Real Data
        margin: margin,
        orders: openOrders,
        totalOrders: totalOrders,
        staffOnline: staffCount || 1,
        occupancy: occupiedTables,
        pendingKitchen: activeOrders.filter((o:any) => o.status === 'pending' || o.status === 'cooking').length,
        lowStock: 0 // Placeholder until inventory linked
      },
      recentActivity,
      chartData: chartData.length > 0 ? chartData : [{ time: 'Now', value: 0 }]
    };

  } catch (e) {
    console.error("Manager Dashboard Error:", e);
    return null;
  }
}