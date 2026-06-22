"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { unstable_noStore as noStore } from 'next/cache';
import { getBusinessDate, offsetDateString } from "@/lib/utils";

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

async function getTenantId(): Promise<string | number> {
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
  
  // 1. Calculate Date Ranges using the active business date
  const currentBusinessDate = getBusinessDate(new Date());

  let currentStartStr = "";
  let currentEndStr = "";
  let prevStartStr = "";
  let prevEndStr = "";

  switch (range) {
      case "today": 
          currentStartStr = currentBusinessDate;
          currentEndStr = currentBusinessDate;
          prevStartStr = offsetDateString(currentBusinessDate, -1);
          prevEndStr = offsetDateString(currentBusinessDate, -1);
          break;
      case "7d": 
          currentStartStr = offsetDateString(currentBusinessDate, -6);
          currentEndStr = currentBusinessDate;
          prevStartStr = offsetDateString(currentBusinessDate, -13);
          prevEndStr = offsetDateString(currentBusinessDate, -7);
          break;
      case "30d": 
          currentStartStr = offsetDateString(currentBusinessDate, -29);
          currentEndStr = currentBusinessDate;
          prevStartStr = offsetDateString(currentBusinessDate, -59);
          prevEndStr = offsetDateString(currentBusinessDate, -30);
          break;
      case "90d": 
          currentStartStr = offsetDateString(currentBusinessDate, -89);
          currentEndStr = currentBusinessDate;
          prevStartStr = offsetDateString(currentBusinessDate, -179);
          prevEndStr = offsetDateString(currentBusinessDate, -90);
          break;
      case "1y":
          currentStartStr = offsetDateString(currentBusinessDate, -364);
          currentEndStr = currentBusinessDate;
          prevStartStr = offsetDateString(currentBusinessDate, -729);
          prevEndStr = offsetDateString(currentBusinessDate, -365);
          break;
  }

  try {
      // Fetch POS Logs
      const { data: logs } = await supabaseAdmin
          .from("daily_order_logs")
          .select("date, orders_data, paid_history") 
          .eq("tenant_id", tenantId)
          .gte("date", currentStartStr)
          .lte("date", currentEndStr)
          .order("date", { ascending: true });

      const { data: prevLogs } = await supabaseAdmin
          .from("daily_order_logs")
          .select("orders_data, paid_history")
          .eq("tenant_id", tenantId)
          .gte("date", prevStartStr)
          .lte("date", prevEndStr);

      const { data: tenantData } = await supabaseAdmin
          .from("tenants")
          .select("qr_codes")
          .eq("id", tenantId)
          .single();
      const firstQrName = tenantData?.qr_codes?.[0]?.name || "FonePay";

      let financialLogs: any[] = [];
      try {
          const { data: expData } = await supabaseAdmin
              .from("expenses") 
              .select("*")
              .eq("tenant_id", tenantId)
              .gte("date", currentStartStr)
              .lte("date", currentEndStr)
              .order("created_at", { ascending: false });
          if (expData) financialLogs = expData;
      } catch (e) {
          console.error("Failed to fetch expenses", e);
      }

      let totalRevenue = 0; // Actual Cash Collected
      let totalSales = 0;   // Accrual Revenue Source (Order Totals)
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
              const currentDue = order.credit_due !== undefined ? Number(order.credit_due) : 0;
              const staff = order.served_by || order.staff || "Cashier";

              let creditPayments = order.credit_payments || [];
              if (typeof creditPayments === 'string') {
                  try { creditPayments = JSON.parse(creditPayments); } catch(e) { creditPayments = []; }
              } else if (!Array.isArray(creditPayments)) {
                  creditPayments = [];
              }

              // ORDER REVENUE: Counted only once at order creation
              totalSales += grandTotal;
              orderCount += 1;
              totalCreditDue += currentDue;

              // Upfront paid cash at checkout
              const sumCreditPayments = creditPayments.reduce((sum: number, cp: any) => sum + (Number(cp.amount) || 0), 0);
              const upfrontAmt = grandTotal - (currentDue + sumCreditPayments);
              
              if (upfrontAmt > 0) {
                  totalRevenue += upfrontAmt;
                  dailyMap[dateKey].revenue += upfrontAmt;
              }

              // Top items & staff performance math
              staffPerformance[staff] = (staffPerformance[staff] || 0) + grandTotal;

              const cleanItems = (order.items || []).filter((i:any) => !['cancelled', 'void'].includes((i.status || '').toLowerCase().trim()));
              cleanItems.forEach((item: any) => {
                  const iName = item.name || item.n || "Unknown";
                  const iQty = Number(item.qty || item.q || 1);
                  const iPrice = Number(item.price || item.p || 0);

                  if (!itemMap[iName]) itemMap[iName] = { qty: 0, sales: 0 };
                  itemMap[iName].qty += iQty;
                  itemMap[iName].sales += iPrice * iQty;
              });

              // Push POS Bill transaction
              let rawMethod = String(order.payment_method || order.method || "Cash");
              let finalMethod = rawMethod.toLowerCase().includes("credit") ? "Credit" : rawMethod;

              allTransactions.push({
                  id: order.invoice_no || order.id || `ORD-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
                  date: order.paid_at || order.timestamp || log.date,
                  businessDate: log.date,
                  amount: grandTotal,
                  discount: discountAmt,
                  tendered: Number(order.tendered) || upfrontAmt,
                  due: currentDue,
                  type: "POS Bill",
                  method: finalMethod,
                  splits: order.splits || [],
                  credit_payments: creditPayments,
                  details: `Table ${order.table_no || order.tbl || 'N/A'}`,
                  status: currentDue > 0 ? 'Partial/Credit' : 'Completed', 
                  items: order.items || [], 
                  served_by: staff,
                  customer: { name: order.customer_name, address: order.customer_address }
              });

              // Push separate Credit Payment transactions
              creditPayments.forEach((p: any) => {
                  const pAmt = Number(p.amount) || 0;
                  const pMethod = p.method || "Cash";
                  const pDateStr = p.business_date || dateKey;

                  if (pAmt > 0) {
                      allTransactions.push({
                          id: `PAY-${(order.invoice_no || order.id || "").slice(-6).toUpperCase()}`,
                          date: p.date || order.paid_at || log.date,
                          businessDate: pDateStr,
                          amount: pAmt,
                          discount: 0,
                          tendered: pAmt,
                          due: 0,
                          type: "Credit Payment",
                          method: pMethod,
                          details: `Credit Payment for Inv: ${order.invoice_no}`,
                          status: "Completed",
                          items: [],
                          served_by: staff,
                          customer: { name: order.customer_name, address: order.customer_address }
                      });

                      // Cash inflow event counts towards Cash Collected
                      totalRevenue += pAmt;
                      if (!dailyMap[pDateStr]) dailyMap[pDateStr] = { revenue: 0, expense: 0 };
                      dailyMap[pDateStr].revenue += pAmt;
                  }
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
          const cleanCategory = log.category.replace(/\[INC\]|\[EXP\]/gi, '').replace(/_#[a-z0-9]+/gi, '').replace(/_/g, ' ').trim();

          let cleanNote = log.description;
          let paymentIntegration = "Cash";
          try {
              if (log.description && log.description.trim().startsWith('{')) {
                  const parsed = JSON.parse(log.description);
                  cleanNote = parsed.note || "";
                  if (parsed.method) paymentIntegration = parsed.method;
              }
          } catch(e) {}

          // MERGE BANK TRANSFER INTO PRIMARY QR METHOD (per user request)
          if (paymentIntegration === "Bank Transfer") {
              paymentIntegration = firstQrName;
          }

          if (isIncome) {
              totalSales += amount;
              totalRevenue += amount;
              if (dateKey) dailyMap[dateKey].revenue += amount;
              
              allTransactions.push({
                  id: `INC-${(log.id || Math.random()).toString().slice(-4).toUpperCase()}`,
                  date: log.created_at || log.date,
                  businessDate: dateKey,
                  amount: amount,
                  discount: 0,
                  tendered: amount,
                  due: 0,
                  type: "Manual Income",
                  method: paymentIntegration,
                  details: cleanCategory,
                  status: "Completed",
                  items: [],
                  note: cleanNote 
              });
          } else {
              totalExpense += amount;
              if (dateKey) dailyMap[dateKey].expense += amount;
              
              allTransactions.push({
                  id: `EXP-${(log.id || Math.random()).toString().slice(-4).toUpperCase()}`,
                  date: log.created_at || log.date,
                  businessDate: dateKey,
                  amount: amount,
                  discount: 0,
                  tendered: amount,
                  due: 0,
                  type: "Manual Expense",
                  method: paymentIntegration,
                  details: cleanCategory,
                  status: "Completed",
                  items: [],
                  note: cleanNote 
              });
          }
      });

      // 3. Calculate Previous Revenue (Previous Cash Collected)
      (prevLogs || []).forEach((log: any) => {
          const paid = safeParse(log.paid_history);
          paid.forEach((o: any) => {
              const grandTotal = Number(o.grandTotal || o.total || 0);
              const currentDue = o.credit_due !== undefined ? Number(o.credit_due) : 0;
              let creditPayments = o.credit_payments || [];
              if (typeof creditPayments === 'string') {
                  try { creditPayments = JSON.parse(creditPayments); } catch(e) { creditPayments = []; }
              } else if (!Array.isArray(creditPayments)) {
                  creditPayments = [];
              }

              const sumCreditPayments = creditPayments.reduce((sum: number, cp: any) => sum + (Number(cp.amount) || 0), 0);
              const upfrontAmt = grandTotal - (currentDue + sumCreditPayments);

              // Upfront paid cash in previous range
              if (log.date >= prevStartStr && log.date <= prevEndStr && upfrontAmt > 0) {
                  prevRevenue += upfrontAmt;
              }

              // Credit payments in previous range
              creditPayments.forEach((p: any) => {
                  const pAmt = Number(p.amount) || 0;
                  const pDateStr = p.business_date || log.date;
                  if (pDateStr >= prevStartStr && pDateStr <= prevEndStr && pAmt > 0) {
                      prevRevenue += pAmt;
                  }
              });
          });
      });

      // 4. Populate Payment Methods Breakdown from current date range Transactions
      allTransactions.forEach((tx: any) => {
          const amt = Number(tx.amount) || 0;
          const bsDate = tx.businessDate;
          const isInRange = bsDate >= currentStartStr && bsDate <= currentEndStr;

          if (isInRange) {
              if (tx.type === 'POS Bill') {
                  const currentDue = Number(tx.due) || 0;
                  const creditPayments = tx.credit_payments || [];
                  const sumCreditPayments = creditPayments.reduce((sum: number, cp: any) => sum + (Number(cp.amount) || 0), 0);
                  const upfrontAmt = amt - (currentDue + sumCreditPayments);

                  if (upfrontAmt > 0) {
                      let rawSplits = tx.splits || [];
                      if (typeof rawSplits === 'string') {
                          try { rawSplits = JSON.parse(rawSplits); } catch(e) { rawSplits = []; }
                      }
                      let upfrontSplits = [...rawSplits];
                      if (upfrontSplits.length === 0) {
                          upfrontSplits = [{ method: tx.method || 'Cash', amount: amt }];
                      }

                      // Deduct credit payments
                      creditPayments.forEach((cp: any) => {
                          const cpAmt = Number(cp.amount) || 0;
                          const cpMethod = cp.method || 'Cash';
                          let match = upfrontSplits.find((s: any) => s.method === cpMethod);
                          if (match) {
                              match.amount = Math.max(0, Number(match.amount) - cpAmt);
                          }
                      });

                      // Filter out Credit splits
                      upfrontSplits = upfrontSplits.filter((s: any) => s.method !== 'Credit' && Number(s.amount) > 0);

                      const totalUpfrontSplitsAmt = upfrontSplits.reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0);
                      upfrontSplits.forEach((s: any) => {
                          const sAmt = Number(s.amount) || 0;
                          const share = totalUpfrontSplitsAmt > 0 ? (sAmt / totalUpfrontSplitsAmt) : 0;
                          const allocated = upfrontAmt * share;
                          paymentMethods[s.method] = (paymentMethods[s.method] || 0) + allocated;
                      });
                  }

                  if (currentDue > 0) {
                      paymentMethods['Credit'] = (paymentMethods['Credit'] || 0) + currentDue;
                  }
              } else if (tx.type === 'Credit Payment') {
                  paymentMethods[tx.method] = (paymentMethods[tx.method] || 0) + amt;
              } else if (tx.type === 'Manual Income') {
                  paymentMethods[tx.method] = (paymentMethods[tx.method] || 0) + amt;
              } else if (tx.type === 'Manual Expense') {
                  paymentMethods[tx.method] = (paymentMethods[tx.method] || 0) - amt;
              }
          }
      });

      // 5. Final Calculations
      const netProfit = totalRevenue - totalExpense;
      const margin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;
      
      let revenueTrend = 0;
      if (prevRevenue > 0) revenueTrend = Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100);
      else if (totalRevenue > 0) revenueTrend = 100;

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
              totalRevenue, // Cash collected (Actual Received)
              totalCreditDue, 
              totalExpense,
              netProfit,
              margin,
              orderCount,
              revenueTrend,
              totalSales // Accrual sales
          },
          chartData,
          paymentMethods,   
          staffPerformance, 
          topItems,
          transactions: sortedTransactions,
          businessDate: currentBusinessDate
      };

  } catch (e) {
      console.error("Report Sync Error:", e);
      return { success: false, stats: null };
  }
}