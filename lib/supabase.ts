import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!

// クライアントサイド用（RLS適用）
export const supabase = createClient(supabaseUrl, supabasePublishableKey)

// サーバーサイド用（管理者権限・RLSバイパス）
export const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey)
