const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8').split('\n');
const envMap = {};
env.forEach(line => {
    const [key, val] = line.split('=');
    if (key && val) envMap[key.trim()] = val.trim();
});

const supabaseAdmin = createClient(envMap['NEXT_PUBLIC_SUPABASE_URL'] || process.env.SUPABASE_URL, envMap['SUPABASE_SERVICE_ROLE_KEY'] || process.env.SUPABASE_KEY);

function safeParse(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : (typeof parsed === 'string' ? JSON.parse(parsed) : []);
    } catch (e) {
      return [];
    }
  }
  return [];
}

async function simulateWaiterData(tenantId) {
    const today = new Date().toISOString().split('T')[0];
    console.log("Simulating today:", today, "tenant:", tenantId);
    
    const { data: tables, error: tableError } = await supabaseAdmin
        .from("restaurant_tables")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("label", { ascending: true });

    console.log("Tables found:", tables ? tables.length : 0);

    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const { data: logs } = await supabaseAdmin
        .from("daily_order_logs")
        .select("date, orders_data, paid_history")
        .eq("tenant_id", tenantId)
        .in("date", [yesterdayStr, today])
        .order("date", { ascending: false });

    console.log("Logs found:", logs ? logs.length : 0);
    const todayLog = logs?.find((l) => l.date === today);
    const activeOrders = safeParse(todayLog?.orders_data);
    
    console.log("Active Orders count:", activeOrders.length);
    console.log("First Order:", activeOrders[0] || "None");
}

simulateWaiterData(9);
