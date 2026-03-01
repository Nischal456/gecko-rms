"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { v2 as cloudinary } from 'cloudinary';

// CLOUDINARY CONFIG
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

async function getTenantId() {
  const cookieStore = await cookies();
  return cookieStore.get("gecko_tenant_id")?.value;
}

// --- HELPER TO PARSE JSON SAFELY ---
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

// --- MAIN DASHBOARD DATA ---
export async function getDashboardData() {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) return null;

    // Dates for Trends
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0];

    // FETCH EVERYTHING IN PARALLEL
    const [tenantRes, logsRes, notifRes] = await Promise.all([
      // 👇 CHANGED TO feature_flags 👇
      supabaseAdmin.from("tenants").select("name, code, logo_url, plan, custom_price, created_at, feature_flags").eq("id", tenantId).single(),
      supabaseAdmin.from("daily_order_logs").select("date, orders_data, paid_history").eq("tenant_id", tenantId).in("date", [today, yesterday]),
      supabaseAdmin.from("notifications").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(10)
    ]);
    const tenant = tenantRes.data;
    if (!tenant) return null;

    // --- PROCESS LOGS ---
    const logs = logsRes.data || [];
    
    // --- 1. PARSE TODAY'S DATA (ACTIVE + PAID) ---
    const todayLog = logs.find(l => l.date === today);
    const todayActive = safeParse(todayLog?.orders_data).filter((o: any) => o.status !== 'cancelled');
    const todayPaid = safeParse(todayLog?.paid_history);
    // Merge them so sales don't disappear when paid
    const todayOrders = [...todayActive, ...todayPaid];
    
    // --- 2. PARSE YESTERDAY'S DATA (ACTIVE + PAID) ---
    const yesterdayLog = logs.find(l => l.date === yesterday);
    const yesterdayActive = safeParse(yesterdayLog?.orders_data).filter((o: any) => o.status !== 'cancelled');
    const yesterdayPaid = safeParse(yesterdayLog?.paid_history);
    const yesterdayOrders = [...yesterdayActive, ...yesterdayPaid];

    // Metrics Calculation
    // Note: 'total' is used in active orders, 'grandTotal' is used in paid history. We check both.
    const calcRevenue = (orders: any[]) => orders.reduce((sum, o) => sum + (Number(o.grandTotal || o.total) || 0), 0);
    
    const todayRevenue = calcRevenue(todayOrders);
    const yesterdayRevenue = calcRevenue(yesterdayOrders);

    const calcTrend = (now: number, before: number) => {
      if (before === 0) return now > 0 ? 100 : 0;
      return Math.round(((now - before) / before) * 100);
    };

    // BILLING LOGIC
    const createdDate = new Date(tenant.created_at || new Date());
    const billDay = createdDate.getDate();
    const currentDay = new Date().getDate();
    let nextBillDate = new Date();
    if (currentDay > billDay) nextBillDate.setMonth(nextBillDate.getMonth() + 1);
    nextBillDate.setDate(billDay);

    let price = tenant.custom_price;
    if (!price) {
        if (tenant.plan === 'starter') price = 5000;
        else if (tenant.plan === 'business') price = 25000;
        else price = 12000;
    }

    const billingInfo = {
        plan: tenant.plan || 'starter',
        amount: price,
        nextDate: nextBillDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        daysLeft: Math.ceil((nextBillDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    };

    // ACTIVE ORDERS (Kitchen Status) - Only count from Active list
    const activeOrdersCount = todayActive.filter((o: any) => !['paid', 'completed', 'cancelled'].includes(o.status)).length;

    const stats = {
      revenue: { value: todayRevenue, trend: calcTrend(todayRevenue, yesterdayRevenue) },
      orders: { value: todayOrders.length, trend: calcTrend(todayOrders.length, yesterdayOrders.length) },
      active: activeOrdersCount,
      avgTicket: { 
          value: todayOrders.length > 0 ? Math.round(todayRevenue / todayOrders.length) : 0,
          trend: 0 
      },
      topItems: getTopItemsFromJSON(todayOrders),
      currentPlan: tenant.plan || 'starter',
      billingInfo,
      notifications: notifRes.data || [] 
    };

    // Flatten recent orders for the Feed (Reverse to show newest first)
    // We prioritize Active orders at the top, then Paid
    const recentOrders = [...todayActive, ...todayPaid]
        .sort((a: any, b: any) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime())
        .slice(0, 10)
        .map((o: any) => ({
            id: o.id || o.invoice_no, // Paid orders use invoice_no
            total_amount: o.grandTotal || o.total,
            status: o.status || 'paid', // Paid history items might not have status field, assume paid
            created_at: o.timestamp || o.date || new Date().toISOString(),
            items: o.items || []
        }));

    return { tenant, stats, recentOrders };

  } catch (error) {
    console.error("Dashboard Data Error:", error);
    return null;
  }
}

function getTopItemsFromJSON(orders: any[]) {
  const itemCounts: Record<string, number> = {};
  orders.forEach(order => {
    const items = order.items || [];
    items.forEach((item: any) => {
      // Handle both 'name' (standard) and 'n' (optimized) keys if present
      const name = item.name || item.n; 
      const qty = Number(item.qty || item.q || 1);
      if(name) itemCounts[name] = (itemCounts[name] || 0) + qty;
    });
  });
  return Object.entries(itemCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([name, count]) => ({ name, count }));
}

// --- MARK NOTIFICATION AS READ ---
export async function markNotificationRead(notifId: string) {
    await supabaseAdmin.from("notifications").update({ is_read: true }).eq("id", notifId);
    revalidatePath("/admin");
}

// --- LOGO UPLOAD ---
export async function uploadRestaurantLogo(formData: FormData) {
  const tenantId = await getTenantId();
  if(!tenantId) return { success: false, error: "Unauthorized" };
  const file = formData.get("file") as File;
  if (!file) return { success: false, error: "No file provided" };
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = `data:${file.type};base64,${buffer.toString('base64')}`;
    const uploadResponse = await cloudinary.uploader.upload(base64Image, {
      folder: "gecko_restaurants",
      public_id: `restaurant_${tenantId}_logo`,
      overwrite: true,
      transformation: [{ width: 400, height: 400, crop: "fill" }]
    });
    await supabaseAdmin.from("tenants").update({ logo_url: uploadResponse.secure_url }).eq("id", tenantId);
    revalidatePath("/admin");
    return { success: true, url: uploadResponse.secure_url };
  } catch (error: any) { return { success: false, error: "Upload failed" }; }
}