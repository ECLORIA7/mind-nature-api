import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser, requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireAuth(user)
  if (authError) return authError

  const patient_id = user!.role === 'patient'
    ? user!.id
    : req.nextUrl.searchParams.get('patient_id')
  if (!patient_id) return Response.json({ error: 'patient_idが必要です' }, { status: 400 })

  const { data } = await supabaseAdmin
    .from('counselor_notices')
    .select('content, updated_at')
    .eq('patient_id', patient_id)
    .single()

  return Response.json({ content: data?.content ?? null, updated_at: data?.updated_at ?? null })
}
