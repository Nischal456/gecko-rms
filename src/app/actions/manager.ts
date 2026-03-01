"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";

// --- CONSTANTS & SAAS ID SYNC ---
const FALLBACK_TENANT_UUID = "00000000-0000-0000-0000-000000000000";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Securely handles BOTH UUIDs (SaaS) and Numbers (like Tenant 5)
function getSafeId(id: string | null | undefined): string | number {
  if (!id) return 5;
  if (UUID_REGEX.test(id)) return id;
  if (!isNaN(Number(id))) return Number(id);
  return FALLBACK_TENANT_UUID;
}

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

async function getTenantId() {
  const cookieStore = await cookies();
  const rawId = cookieStore.get("gecko_tenant_id")?.value;
  if (rawId) return getSafeId(rawId);
  
  const staffToken = cookieStore.get("gecko_staff_token")?.value;
  if (staffToken) {
      try { return getSafeId(JSON.parse(staffToken).tenant_id); } catch (e) {}
  }
  return 5;
}

export async function getManagerDashboard() {
  const tenantId = await getTenantId();
  const today = new Date().toISOString().split('T')[0];

  try {
    // 1. FETCH REVENUE (Today's Active Orders AND Paid Bills)
    const { data: logs } = await supabaseAdmin
      .from("daily_order_logs")
      .select("orders_data, paid_history") 
      .eq("tenant_id", tenantId)
      .eq("date", today)
      .maybeSingle();

    const activeOrders = safeParse(logs?.orders_data);
    const paidBills = safeParse(logs?.paid_history);

    // Calculate Base Revenue from POS
    let totalRevenue = 0;
    
    // Add up finalized bills (Real Cash)
    paidBills.forEach((bill: any) => {
        totalRevenue += Number(bill.grandTotal || bill.total || 0);
    });

    // Add up active orders (Projected Cash)
    activeOrders.forEach((order: any) => {
        if (!['cancelled', 'paid', 'completed'].includes(order.status)) {
            totalRevenue += Number(order.total || 0);
        }
    });

    const totalOrders = paidBills.length + activeOrders.length;
    const openOrders = activeOrders.filter((o: any) => !['cancelled', 'paid', 'completed'].includes(o.status)).length;

    // 2. FETCH EXPENSES AND MANUAL INCOME (Today's Real Data)
    let totalExpense = 0;
    try {
        const { data: financialLogs } = await supabaseAdmin
            .from("expenses") 
            .select("amount, category")
            .eq("tenant_id", tenantId)
            .eq("date", today);
        
        if (financialLogs) {
            financialLogs.forEach(item => {
                const categoryStr = String(item.category || "").toLowerCase();
                const amount = Number(item.amount) || 0;
                
                // If it is manually logged income (Custom Title + [INC] tag or standard income word)
                if (categoryStr.includes('[inc]') || categoryStr.includes('income') || categoryStr.includes('deposit') || categoryStr.includes('catering')) {
                    totalRevenue += amount; // Add manual income to Total Revenue!
                } 
                // Otherwise it's an expense
                else {
                    totalExpense += amount;
                }
            });
        }
    } catch (e) {
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
    let staffCount = 1;
    try {
        const { count } = await supabaseAdmin
            .from("staff")
            .select("*", { count: 'exact', head: true })
            .eq("tenant_id", tenantId)
            .eq("status", "active");
        staffCount = count || 1;
    } catch (e) {}

    // 6. FETCH LOW STOCK INVENTORY 
    let lowStockCount = 0;
    try {
        const { count } = await supabaseAdmin
            .from("inventory")
            .select("*", { count: 'exact', head: true })
            .eq("tenant_id", tenantId)
            .lte("stock", 10); // Alert if stock is 10 or less
        lowStockCount = count || 0;
    } catch (e) {}

    // 7. FETCH RECENT ACTIVITY (Merge Paid & Active)
    const allActivity = [
        ...activeOrders.map((o: any) => ({
            id: o.id,
            table_name: o.tbl || o.table_no,
            status: o.status,
            total_amount: o.total,
            created_at: o.timestamp || new Date().toISOString()
        })),
        ...paidBills.map((b: any) => ({
            id: b.invoice_no || b.id,
            table_name: b.table_no || b.tbl,
            status: 'paid',
            total_amount: b.grandTotal || b.total,
            created_at: b.paid_at || b.timestamp || new Date().toISOString()
        }))
    ];

    // Sort descending (newest first) and take top 10
    const recentActivity = allActivity
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);

    // 8. CHART DATA (Hourly Distribution)
    const hourlyData: Record<string, number> = {};
    
    // Process Paid Bills for Chart
    paidBills.forEach((b: any) => {
        const date = new Date(b.paid_at || b.timestamp || new Date());
        const hour = date.getHours();
        const key = `${hour}:00`;
        hourlyData[key] = (hourlyData[key] || 0) + (Number(b.grandTotal || b.total) || 0);
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
    
    if(chartData.length === 0) {
        const h = new Date().getHours();
        chartData.push({ time: `${h}:00`, value: 0 });
    }

    // 9. FETCH TENANT DATA (For Top Left Logo/Name)
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
        expenses: totalExpense, 
        profit: netProfit,     
        margin: margin,
        orders: openOrders,
        totalOrders: totalOrders,
        staffOnline: staffCount,
        occupancy: occupiedTables,
        pendingKitchen: activeOrders.filter((o:any) => o.status === 'pending' || o.status === 'cooking').length,
        lowStock: lowStockCount 
      },
      recentActivity,
      chartData
    };

  } catch (e) {
    console.error("Manager Dashboard Error:", e);
    return null;
  }
}