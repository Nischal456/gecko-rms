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
  const tenantCookie = cookieStore.get("gecko_tenant_id");
  const rawId = tenantCookie?.value;
  if (rawId) return parseInt(rawId, 10);

  const staffCookie = cookieStore.get("gecko_staff_token");
  const staffToken = staffCookie?.value;
  if (staffToken) {
      try { return parseInt(JSON.parse(staffToken).tenant_id, 10); } catch (e) {}
  }
  return 5; 
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

// --- REVENUE CALCULATION ENGINE (CREDIT AWARE) ---
function calculateRealRevenue(activeOrders: any[], paidHistory: any[]) {
    let revenue = 0;

    // 1. Paid History (Includes completed Cash/QR and Credit)
    paidHistory.forEach(o => {
        const method = String(o.payment_method || o.method || "Cash").toLowerCase();
        if (method.includes('credit')) {
            revenue += Number(o.tendered || 0); // Only count actual cash received for credit
        } else {
            revenue += Number(o.grandTotal || o.total || 0); // Cash/QR is fully received
        }
    });

    // 2. Active Orders (Rarely paid, but just in case they are marked 'paid' but not moved to history yet)
    activeOrders.forEach(o => {
        if (['paid', 'completed'].includes(o.status)) {
            const method = String(o.payment_method || o.method || "Cash").toLowerCase();
            if (method.includes('credit')) {
                revenue += Number(o.tendered || 0);
            } else {
                revenue += Number(o.grandTotal || o.total || 0);
            }
        }
    });

    return revenue;
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
      supabaseAdmin.from("tenants").select("name, code, logo_url, plan, custom_price, created_at, feature_flags").eq("id", tenantId).single(),
      supabaseAdmin.from("daily_order_logs").select("date, orders_data, paid_history").eq("tenant_id", tenantId).in("date", [today, yesterday]),
      supabaseAdmin.from("notifications").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(10)
    ]);
    
    const tenant = tenantRes.data;
    if (!tenant) return null;

    // --- PROCESS LOGS ---
    const logs = logsRes.data || [];
    
    // --- 1. PARSE TODAY'S DATA ---
    const todayLog = logs.find(l => l.date === today);
    const todayActive = safeParse(todayLog?.orders_data).filter((o: any) => o.status !== 'cancelled');
    const todayPaid = safeParse(todayLog?.paid_history);
    
    // --- 2. PARSE YESTERDAY'S DATA ---
    const yesterdayLog = logs.find(l => l.date === yesterday);
    const yesterdayActive = safeParse(yesterdayLog?.orders_data).filter((o: any) => o.status !== 'cancelled');
    const yesterdayPaid = safeParse(yesterdayLog?.paid_history);

    // --- METRICS CALCULATION ---
    const todayRevenue = calculateRealRevenue(todayActive, todayPaid);
    const yesterdayRevenue = calculateRealRevenue(yesterdayActive, yesterdayPaid);

    // Total order count (Active + Paid)
    const todayOrderCount = todayActive.length + todayPaid.length;
    const yesterdayOrderCount = yesterdayActive.length + yesterdayPaid.length;

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

    // ACTIVE ORDERS (Kitchen Status)
    const activeOrdersCount = todayActive.filter((o: any) => !['paid', 'completed', 'cancelled'].includes(o.status)).length;

    const stats = {
      revenue: { value: todayRevenue, trend: calcTrend(todayRevenue, yesterdayRevenue) },
      orders: { value: todayOrderCount, trend: calcTrend(todayOrderCount, yesterdayOrderCount) },
      active: activeOrdersCount,
      avgTicket: { 
          value: todayOrderCount > 0 ? Math.round(todayRevenue / todayOrderCount) : 0,
          trend: 0 
      },
      topItems: getTopItemsFromJSON([...todayActive, ...todayPaid]),
      currentPlan: tenant.plan || 'starter',
      billingInfo,
      notifications: notifRes.data || [] 
    };

    // Flatten recent orders for the Feed
    const recentOrders = [...todayActive, ...todayPaid]
        .sort((a: any, b: any) => new Date(b.created_at || b.timestamp || b.date).getTime() - new Date(a.created_at || a.timestamp || a.date).getTime())
        .slice(0, 10)
        .map((o: any) => ({
            id: o.id || o.invoice_no, 
            total_amount: o.grandTotal || o.total,
            status: o.status || 'paid', 
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