"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { unstable_noStore as noStore } from 'next/cache';

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
  if (rawId) return getSafeId(rawId);
  
  const staffCookie = cookieStore.get("gecko_staff_token");
  if (staffCookie?.value) {
      try { return getSafeId(JSON.parse(staffCookie.value).tenant_id); } catch(e){}
  }
  return 5;
}

// --- MAIN REPORT ACTION ---
export async function getReportData(range: ReportRange) {
  noStore(); 
  const tenantId = await getTenantId();
  
  // 1. Calculate Date Ranges
  const now = new Date();
  let startDate = new Date();
  let prevStartDate = new Date();
  let prevEndDate = new Date();
  
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
      // Fetch POS Logs
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

      let financialLogs: any[] = [];
      try {
          const { data: expData } = await supabaseAdmin
              .from("expenses") 
              .select("*")
              .eq("tenant_id", tenantId)
              .gte("date", currentStartStr)
              .order("created_at", { ascending: false });
          if (expData) financialLogs = expData;
      } catch (e) {
          console.error("Failed to fetch expenses", e);
      }

      let totalRevenue = 0; // Actual Cash Received
      let totalCreditDue = 0; // Money floating in credit
      let prevRevenue = 0;
      let totalExpense = 0;
      let orderCount = 0;
      
      const itemMap: Record<string, { qty: number, sales: number }> = {};
      const dailyMap: Record<string, { revenue: number, expense: number }> = {};
      const paymentMethods: Record<string, number> = {}; 
      const staffPerformance: Record<string, number> = {};
      const allTransactions: any[] = [];

      // 1. Process Current POS Data
      (logs || []).forEach((log: any) => {
          const dateKey = log.date; 
          if (!dailyMap[dateKey]) dailyMap[dateKey] = { revenue: 0, expense: 0 };

          const paidOrders = safeParse(log.paid_history);
          
          paidOrders.forEach((order: any) => {
              const grandTotal = Number(order.grandTotal || order.total || 0);
              const discountAmt = Number(order.discount || 0);
              let actualRevenue = grandTotal;
              let currentDue = 0;
              let finalMethod = "Pending";

              let rawMethod = String(order.payment_method || order.method || "Cash").toLowerCase();
              if (rawMethod.includes("qr") || rawMethod.includes("esewa") || rawMethod.includes("fonepay")) finalMethod = "QR";
              else if (rawMethod.includes("card") || rawMethod.includes("visa") || rawMethod.includes("pos")) finalMethod = "Card";
              else if (rawMethod.includes("credit")) finalMethod = "Credit";
              else if (rawMethod.includes("cash")) finalMethod = "Cash";
              else finalMethod = order.payment_method || "Cash";

              // Extract exact cash received if Credit
              if (finalMethod === "Credit") {
                  const tendered = Number(order.tendered || 0);
                  actualRevenue = tendered; 
                  currentDue = order.credit_due !== undefined ? Number(order.credit_due) : Math.max(0, grandTotal - tendered);
              }

              // ACTUAL RECEIVED FLOW (For Net Profit & Cash in drawer)
              totalRevenue += actualRevenue;
              totalCreditDue += currentDue; 
              dailyMap[dateKey].revenue += actualRevenue;
              
              // SALES VOLUME FLOW (For Methods & Staff Splits)
              // FIX: Now uses Grand Total so Credit shows generated volume!
              paymentMethods[finalMethod] = (paymentMethods[finalMethod] || 0) + grandTotal;
              const staff = order.served_by || order.staff || "Cashier"; 
              staffPerformance[staff] = (staffPerformance[staff] || 0) + grandTotal;

              orderCount += 1;

              // STRIKOUT WASTE FILTER: Exclude cancelled items from top sellers math
              const cleanItems = (order.items || []).filter((i:any) => !['cancelled', 'void'].includes((i.status || '').toLowerCase().trim()));
              
              if (Array.isArray(cleanItems)) {
                  cleanItems.forEach((item: any) => {
                      const iName = item.name || item.n || "Unknown";
                      const iQty = Number(item.qty || item.q || 1);
                      const iPrice = Number(item.price || item.p || 0);

                      if (!itemMap[iName]) itemMap[iName] = { qty: 0, sales: 0 };
                      itemMap[iName].qty += iQty;
                      itemMap[iName].sales += iPrice * iQty;
                  });
              }

              allTransactions.push({
                  id: order.invoice_no || order.id || `ORD-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
                  date: order.paid_at || order.timestamp || log.date,
                  amount: grandTotal,
                  discount: discountAmt,
                  tendered: actualRevenue,
                  due: currentDue,
                  type: "POS Bill",
                  method: finalMethod,
                  details: `Table ${order.table_no || order.tbl || 'N/A'}`,
                  status: currentDue > 0 ? 'Partial/Credit' : 'Completed', 
                  items: order.items || [], // <--- Pass ALL items to frontend (Frontend will strike-through waste)
                  customer: { name: order.customer_name, address: order.customer_address }
              });
          });
      });

      // 2. Process Manual Financial Logs (Income & Expenses)
      financialLogs.forEach((log: any) => {
          const amount = Number(log.amount) || 0;
          const categoryStr = String(log.category || "").toUpperCase();
          const dateKey = log.date ? log.date.split('T')[0] : ""; 
          
          if (dateKey && !dailyMap[dateKey]) dailyMap[dateKey] = { revenue: 0, expense: 0 };
          
          const isIncome = categoryStr.includes('[INC]') || categoryStr.includes('INCOME') || categoryStr.includes('DEPOSIT') || categoryStr.includes('CATERING');
          const cleanCategory = log.category.replace(/\[INC\]|\[EXP\]/gi, '').replace(/_/g, ' ').trim();

          if (isIncome) {
              totalRevenue += amount;
              if (dateKey) dailyMap[dateKey].revenue += amount;
              
              paymentMethods["Manual Income"] = (paymentMethods["Manual Income"] || 0) + amount;
              
              allTransactions.push({
                  id: `INC-${(log.id || Math.random()).toString().slice(-4).toUpperCase()}`,
                  date: log.created_at || log.date,
                  amount: amount,
                  discount: 0,
                  tendered: amount,
                  due: 0,
                  type: "Manual Income",
                  method: "Manual Log",
                  details: cleanCategory,
                  status: "Completed",
                  items: [],
                  note: log.description 
              });
          } else {
              totalExpense += amount;
              if (dateKey) dailyMap[dateKey].expense += amount;
              
              allTransactions.push({
                  id: `EXP-${(log.id || Math.random()).toString().slice(-4).toUpperCase()}`,
                  date: log.created_at || log.date,
                  amount: amount,
                  discount: 0,
                  tendered: amount,
                  due: 0,
                  type: "Manual Expense",
                  method: "Deduction",
                  details: cleanCategory,
                  status: "Completed",
                  items: [],
                  note: log.description 
              });
          }
      });

      // 3. Calculate Previous Revenue
      (prevLogs || []).forEach((log: any) => {
          const paid = safeParse(log.paid_history);
          paid.forEach((o: any) => {
              let amt = Number(o.grandTotal || o.total || 0);
              if (String(o.payment_method).toLowerCase() === 'credit') {
                  amt = Number(o.tendered || 0); 
              }
              prevRevenue += amt;
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
              totalCreditDue, 
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