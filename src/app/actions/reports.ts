"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";

export type ReportRange = "today" | "7d" | "30d" | "90d" | "1y";

// --- HELPERS ---
function getSafeId(id: string | null | undefined): number {
  return id && !isNaN(Number(id)) ? Number(id) : 5;
}

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
  return getSafeId(rawId);
}

// --- MAIN REPORT ACTION ---
export async function getReportData(range: ReportRange) {
  const tenantId = await getTenantId();
  
  // 1. Calculate Date Ranges
  const now = new Date();
  let startDate = new Date();
  let prevStartDate = new Date();
  let prevEndDate = new Date();
  
  // Reset time for accurate daily comparisons
  now.setHours(23, 59, 59, 999); 

  switch (range) {
      case "today": 
          startDate.setHours(0, 0, 0, 0); 
          prevStartDate.setDate(now.getDate() - 1); 
          prevStartDate.setHours(0,0,0,0);
          prevEndDate.setDate(now.getDate() - 1);
          prevEndDate.setHours(23,59,59,999);
          break;
      case "7d": 
          startDate.setDate(now.getDate() - 7); 
          prevStartDate.setDate(now.getDate() - 14);
          prevEndDate.setDate(now.getDate() - 7);
          break;
      case "30d": 
          startDate.setDate(now.getDate() - 30); 
          prevStartDate.setDate(now.getDate() - 60);
          prevEndDate.setDate(now.getDate() - 30);
          break;
      case "90d": 
          startDate.setDate(now.getDate() - 90); 
          prevStartDate.setDate(now.getDate() - 180);
          prevEndDate.setDate(now.getDate() - 90);
          break;
      case "1y":
          startDate.setDate(now.getDate() - 365);
          prevStartDate.setDate(now.getDate() - 730);
          prevEndDate.setDate(now.getDate() - 365);
          break;
  }
  
  const currentStartStr = startDate.toISOString().split('T')[0];
  const prevStartStr = prevStartDate.toISOString().split('T')[0];
  const prevEndStr = prevEndDate.toISOString().split('T')[0];

  try {
      // --- A. FETCH DATA ---
      const { data: logs } = await supabaseAdmin
          .from("daily_order_logs")
          .select("date, orders_data, paid_history") 
          .eq("tenant_id", tenantId)
          .gte("date", currentStartStr)
          .order("date", { ascending: true });

      const { data: prevLogs } = await supabaseAdmin
          .from("daily_order_logs")
          .select("orders_data, paid_history")
          .eq("tenant_id", tenantId)
          .gte("date", prevStartStr)
          .lte("date", prevEndStr);

      let expenses: any[] = [];
      try {
          const { data: expData } = await supabaseAdmin
              .from("staff_payments") // Ensure this table exists, or change to operating_expenses
              .select("*")
              .eq("tenant_id", tenantId)
              .gte("payment_date", currentStartStr)
              .order("payment_date", { ascending: false });
          if (expData) expenses = expData;
      } catch (e) {}

      // --- AGGREGATION CONTAINERS ---
      let totalRevenue = 0;
      let prevRevenue = 0;
      let totalExpense = 0;
      let orderCount = 0;
      
      const itemMap: Record<string, { qty: number, sales: number }> = {};
      const dailyMap: Record<string, { revenue: number, expense: number }> = {};
      const paymentMethods: Record<string, number> = {}; // Built dynamically
      const staffPerformance: Record<string, number> = {};
      const allTransactions: any[] = [];

      // 1. Process Current Data
      (logs || []).forEach((log: any) => {
          const dateKey = log.date; 
          if (!dailyMap[dateKey]) dailyMap[dateKey] = { revenue: 0, expense: 0 };

          const activeOrders = safeParse(log.orders_data);
          const paidOrders = safeParse(log.paid_history);
          
          // Merge Active and Paid
          // Filter out cancelled. 
          const validActive = activeOrders.filter((o: any) => o.status !== 'cancelled');
          const allSales = [...validActive, ...paidOrders];
          
          allSales.forEach((order: any) => {
              // --- STATUS CHECK ---
              // Is this order strictly paid?
              // 'paid_history' items are always paid. Active items need status check.
              const isPaid = paidOrders.includes(order) || ['paid', 'completed'].includes(order.status);
              
              const amount = Number(order.grandTotal || order.total || 0);
              
              // Only add to Total Revenue if PAID
              if (isPaid) {
                  totalRevenue += amount;
                  dailyMap[dateKey].revenue += amount;

                  // Payment Method Tracking (Only for paid)
                  let method = order.payment_method || "Cash";
                  // Normalize
                  if (method.toLowerCase().includes("qr")) method = "QR";
                  else if (method.toLowerCase().includes("card") || method.toLowerCase().includes("visa")) method = "Card";
                  else if (method.toLowerCase().includes("cash")) method = "Cash";
                  
                  paymentMethods[method] = (paymentMethods[method] || 0) + amount;

                  // Staff Tracking (Only for paid)
                  // Default to 'Cashier' if missing (e.g. direct POS orders often lack served_by)
                  const staff = order.served_by || "Cashier"; 
                  staffPerformance[staff] = (staffPerformance[staff] || 0) + amount;
              }

              // Count total orders (including pending, excluding cancelled)
              orderCount += 1;

              // Item Tracking (All valid orders)
              if (Array.isArray(order.items)) {
                  order.items.forEach((item: any) => {
                      const iName = item.name || item.n || "Unknown";
                      const iQty = Number(item.qty || item.q || 1);
                      const iPrice = Number(item.price || item.p || 0);

                      if (!itemMap[iName]) itemMap[iName] = { qty: 0, sales: 0 };
                      itemMap[iName].qty += iQty;
                      itemMap[iName].sales += iPrice * iQty;
                  });
              }

              // Add to Transaction List
              allTransactions.push({
                  id: order.invoice_no || order.id || `ORD-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
                  date: order.paid_at || order.timestamp || log.date,
                  amount: amount,
                  type: "Income",
                  method: order.payment_method || (isPaid ? "Cash" : "Pending"),
                  details: `Table ${order.table_no || order.tbl || 'N/A'}`,
                  status: isPaid ? 'Completed' : 'Pending', // Explicit Status
                  items: order.items || [], 
                  customer: { name: order.customer_name, address: order.customer_address }
              });
          });
      });

      // 2. Process Expenses
      expenses.forEach((exp: any) => {
          const amount = Number(exp.amount) || 0;
          totalExpense += amount;
          
          const dateKey = exp.payment_date ? exp.payment_date.split('T')[0] : ""; 
          if (dateKey) {
              if (!dailyMap[dateKey]) dailyMap[dateKey] = { revenue: 0, expense: 0 };
              dailyMap[dateKey].expense += amount; 
          }
          
          allTransactions.push({
              id: `EXP-${(exp.id || Math.random()).toString().slice(-4)}`,
              date: exp.payment_date,
              amount: amount,
              type: "Expense",
              method: "Transfer",
              details: exp.type || "Expense",
              status: "Paid",
              items: [],
              note: exp.notes
          });
      });

      // 3. Calculate Previous Revenue
      (prevLogs || []).forEach((log: any) => {
          const paid = safeParse(log.paid_history);
          paid.forEach((o: any) => {
              prevRevenue += Number(o.grandTotal || o.total || 0);
          });
      });

      // 4. Final Calculations
      const netProfit = totalRevenue - totalExpense;
      const margin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;
      
      let revenueTrend = 0;
      if (prevRevenue > 0) revenueTrend = Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100);
      else if (totalRevenue > 0) revenueTrend = 100;

      // 5. Format Data for Frontend
      const chartData = Object.keys(dailyMap).sort().map(date => ({
          date, 
          revenue: dailyMap[date].revenue || 0,
          expense: dailyMap[date].expense || 0,
          profit: (dailyMap[date].revenue || 0) - (dailyMap[date].expense || 0)
      }));

      const topItems = Object.keys(itemMap)
          .map(name => ({ name, ...itemMap[name] }))
          .sort((a, b) => b.sales - a.sales)
          .slice(0, 5);

      const sortedTransactions = allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return {
          success: true,
          stats: {
              totalRevenue,
              totalExpense,
              netProfit,
              margin,
              orderCount,
              revenueTrend
          },
          chartData,
          paymentMethods,   
          staffPerformance, 
          topItems,
          transactions: sortedTransactions
      };

  } catch (e) {
      console.error("Report Sync Error:", e);
      return { success: false, stats: null };
  }
}