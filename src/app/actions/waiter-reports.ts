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

async function getStaffMember(tenantId: number, staff: { id: string, name: string }) {
    let query = supabaseAdmin.from("staff").select("*").eq("tenant_id", tenantId);
    
    // Check if staff.id is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (staff.id && uuidRegex.test(staff.id)) {
        query = query.eq("id", staff.id);
    } else {
        query = query.eq("full_name", staff.name);
    }
    
    const { data, error } = await query.maybeSingle();
    if (error) console.error("Error looking up staff member:", error);
    return data;
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
      .select("date, orders_data, paid_history")
      .eq("tenant_id", tenantId)
      .gte("date", firstDay); // Current month only

    // Process Stats
    let totalSales = 0;
    let tablesServed = 0;
    const dailyMap: Record<string, number> = {};

    (logs || []).forEach((log: any) => {
      const activeOrders = Array.isArray(log.orders_data) ? log.orders_data : [];
      let paidOrders = [];
      try {
          if (typeof log.paid_history === 'string') paidOrders = JSON.parse(log.paid_history);
          else if (Array.isArray(log.paid_history)) paidOrders = log.paid_history;
      } catch(e) {}
      
      const allOrders = [...activeOrders, ...paidOrders];

      // Filter orders by this staff member
      const myOrders = allOrders.filter((o: any) => {
          if (o.status === 'cancelled') return false;
          
          const targetName = staff.name.toLowerCase();
          if (o.staff && o.staff.toLowerCase() === targetName) return true;
          if (o.served_by && typeof o.served_by === 'string' && o.served_by.toLowerCase().includes(targetName)) return true;
          return false;
      });

      myOrders.forEach((o: any) => {
        const amt = Number(o.total || o.grandTotal) || 0;
        totalSales += amt;
        tablesServed += 1;
        
        // Chart Data
        const day = new Date(log.date).getDate();
        dailyMap[day] = (dailyMap[day] || 0) + amt;
      });
    });

    const chartData = Object.keys(dailyMap).map(d => ({
        day: `Day ${d}`,
        sales: dailyMap[d]
    })).sort((a, b) => parseInt(a.day.split(' ')[1]) - parseInt(b.day.split(' ')[1]));

    // B. FETCH PAYROLL & LEAVE FROM ACTUAL DB TABLES
    const staffMember = await getStaffMember(tenantId, staff);

    let payroll: any[] = [];
    let leaves: any[] = [];

    if (staffMember) {
        // Fetch payroll history
        const { data: dbPayments } = await supabaseAdmin
            .from("staff_payments")
            .select("*")
            .eq("staff_id", staffMember.id)
            .order("payment_date", { ascending: false });

        if (dbPayments) {
            payroll = dbPayments.map((pay: any) => ({
                month: pay.salary_month || '',
                date: pay.payment_date ? pay.payment_date.split('T')[0] : '',
                amount: Number(pay.amount) || 0,
                type: pay.type || ''
            }));
        }

        // Fetch leaves
        const { data: dbLeaves } = await supabaseAdmin
            .from("staff_leaves")
            .select("*")
            .eq("staff_id", staffMember.id)
            .order("start_date", { ascending: false });

        if (dbLeaves) {
            leaves = dbLeaves.map((leave: any) => {
                let leaveType = 'Leave';
                let displayReason = leave.reason || '';
                if (leave.reason && leave.reason.startsWith('[')) {
                    const closingBracket = leave.reason.indexOf(']');
                    if (closingBracket > 0) {
                        leaveType = leave.reason.slice(1, closingBracket);
                        displayReason = leave.reason.slice(closingBracket + 1).trim();
                    }
                }
                return {
                    id: leave.id,
                    status: leave.status || 'pending',
                    type: leaveType,
                    from: leave.start_date,
                    to: leave.end_date,
                    reason: displayReason,
                    date_applied: leave.created_at ? leave.created_at.split('T')[0] : (leave.start_date || '')
                };
            });
        }
    }

    return {
        success: true,
        stats: { totalSales, tablesServed, chartData },
        payroll, 
        leaves
    };

  } catch (e) {
      console.error(e);
      return { success: false, msg: "Failed to load reports" };
  }
}

// --- 2. SUBMIT LEAVE REQUEST (JSON UPDATE -> TABLE INSERT) ---
export async function submitLeaveRequest(requestData: any) {
    const { tenantId, staff } = await getContext();
    
    try {
        const staffMember = await getStaffMember(tenantId, staff);
        if (!staffMember) return { success: false, msg: "Profile not found" };

        const reasonValue = `[${requestData.type}] ${requestData.reason}`;

        // Insert leave request directly into staff_leaves table
        const { error } = await supabaseAdmin
            .from("staff_leaves")
            .insert({
                tenant_id: tenantId,
                staff_id: staffMember.id,
                start_date: requestData.from,
                end_date: requestData.to,
                reason: reasonValue,
                status: 'pending'
            });

        if (error) throw error;

        revalidatePath("/staff/waiter/reports");
        return { success: true };

    } catch (e: any) {
        return { success: false, msg: e.message || "Failed to submit" };
    }
}