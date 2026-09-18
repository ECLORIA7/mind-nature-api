import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data } = await supabaseAdmin.from('addictions').select('id, name').order('id')
  return Response.json({ addictions: data ?? [] })
}
