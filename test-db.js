const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8').split('\n');
const envMap = {};
env.forEach(line => {
    const [key, val] = line.split('=');
    if (key && val) envMap[key.trim()] = val.trim();
});

const supabaseUrl = envMap['NEXT_PUBLIC_SUPABASE_URL'] || process.env.SUPABASE_URL;
const supabaseKey = envMap['SUPABASE_SERVICE_ROLE_KEY'] || process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: m } = await supabase.from('menu_optimized').select('tenant_id').limit(10);
    const mIds = [...new Set(m?.map(r=>r.tenant_id) || [])];
    console.log("Menu tenant_ids:", mIds);

    const { data: t } = await supabase.from('restaurant_tables').select('tenant_id').limit(10);
    const tIds = [...new Set(t?.map(r=>r.tenant_id) || [])];
    console.log("Table tenant_ids:", tIds);

    const { data: o } = await supabase.from('daily_order_logs').select('tenant_id, date').order('date', {ascending: false}).limit(5);
    console.log("Recent order logs tenant_ids:", o);
}
check();
