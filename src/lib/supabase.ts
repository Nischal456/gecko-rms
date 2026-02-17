import { createClient } from '@supabase/supabase-js'

// Use Service Role for Super Admin Actions (Bypasses RLS)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)