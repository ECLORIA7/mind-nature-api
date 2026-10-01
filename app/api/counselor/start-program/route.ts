import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser, requireCounselor } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireCounselor(user)
  if (authError) return authError

  const { patient_id } = await req.json().catch(() => ({}))
  if (!patient_id) return Response.json({ error: 'patient_idは必須です' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('counseling_programs')
    .upsert({ patient_id, started_at: new Date().toISOString() }, { onConflict: 'patient_id' })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ message: 'プログラムを開始しました' })
}
