"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";

// --- HELPER: Parse JSON safely ---
function safeParse(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  }
  return [];
}

async function getTenantId(): Promise<number> {
  const cookieStore = await cookies();
  const rawId = cookieStore.get("gecko_tenant_id")?.value;
  return rawId && !isNaN(Number(rawId)) ? Number(rawId) : 5;
}

export async function getManagerDashboard() {
  const tenantId = await getTenantId();
  const today = new Date().toISOString().split('T')[0];

  try {
    // 1. FETCH REVENUE (Today's Active Orders AND Paid Bills)
    const { data: logs } = await supabaseAdmin
      .from("daily_order_logs")
      .select("orders_data, paid_history") // <-- CRITICAL FIX: Fetch paid_history
      .eq("tenant_id", tenantId)
      .eq("date", today)
      .maybeSingle();

    const activeOrders = safeParse(logs?.orders_data);
    const paidBills = safeParse(logs?.paid_history);

    // Calculate Revenue
    let totalRevenue = 0;
    
    // Add up finalized bills (Real Cash)
    paidBills.forEach((bill: any) => {
        totalRevenue += Number(bill.grandTotal || 0);
    });

    // Add up active orders (Projected Cash)
    activeOrders.forEach((order: any) => {
        if (!['cancelled', 'paid', 'completed'].includes(order.status)) {
            totalRevenue += Number(order.total || 0);
        }
    });

    const totalOrders = paidBills.length + activeOrders.length;
    const openOrders = activeOrders.filter((o: any) => !['cancelled', 'paid', 'completed'].includes(o.status)).length;

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

    // 6. FETCH RECENT ACTIVITY (Merge Paid & Active)
    const allActivity = [
        ...activeOrders.map((o: any) => ({
            id: o.id,
            table_name: o.tbl,
            status: o.status,
            total_amount: o.total,
            created_at: o.timestamp || new Date().toISOString()
        })),
        ...paidBills.map((b: any) => ({
            id: b.invoice_no,
            table_name: b.table_no,
            status: 'paid',
            total_amount: b.grandTotal,
            created_at: b.paid_at || new Date().toISOString()
        }))
    ];

    // Sort descending (newest first) and take top 10
    const recentActivity = allActivity
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);

    // 7. CHART DATA (Hourly Distribution)
    const hourlyData: Record<string, number> = {};
    
    // Process Paid Bills for Chart
    paidBills.forEach((b: any) => {
        const date = new Date(b.paid_at || new Date());
        const hour = date.getHours();
        const key = `${hour}:00`;
        hourlyData[key] = (hourlyData[key] || 0) + (Number(b.grandTotal) || 0);
    });

    // Process Active Orders for Chart
    activeOrders.forEach((o: any) => {
        if (!['cancelled', 'paid', 'completed'].includes(o.status)) {
            const date = new Date(o.timestamp || new Date());
            const hour = date.getHours();
            const key = `${hour}:00`;
            hourlyData[key] = (hourlyData[key] || 0) + (Number(o.total) || 0);
        }
    });

    const chartData = Object.keys(hourlyData).map(key => ({
        time: key,
        value: hourlyData[key]
    })).sort((a, b) => parseInt(a.time) - parseInt(b.time));
    
    // Fallback if no chart data yet
    if(chartData.length === 0) {
        const h = new Date().getHours();
        chartData.push({ time: `${h}:00`, value: 0 });
    }

    // 8. FETCH TENANT DATA (For Top Left Logo/Name)
    const { data: tenant } = await supabaseAdmin
        .from("tenants")
        .select("name, code, logo_url")
        .eq("id", tenantId)
        .maybeSingle();

    return {
      success: true,
      tenant: { 
          name: tenant?.name || "Restaurant Manager", 
          code: tenant?.code || "MGR", 
          logo_url: tenant?.logo_url || "" 
      },
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
      chartData
    };

  } catch (e) {
    console.error("Manager Dashboard Error:", e);
    return null;
  }
}