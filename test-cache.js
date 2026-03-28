const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local", { supabaseUrl, supabaseKey });
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const today = new Date().toISOString().split('T')[0];
    console.log("Date used natively:", today);
    
    let { data: logs, error } = await supabase
        .from("daily_order_logs")
        .select("date, orders_data")
        .eq("tenant_id", 5)
        .order("date", { ascending: false })
        .limit(3);
        
    if (error) console.error("Error fetching logs:", error);
    else console.log("Recent Logs Dates:", logs.map(l => l.date));
    
    let { data: menu, error: menuErr } = await supabase
        .from("menu_optimized")
        .select("items")
        .eq("tenant_id", 5);
        
    if (menuErr) console.error("Error fetching menu:", menuErr);
    else console.log("Menu Categories Count:", menu ? menu.length : 0);
}

test();
