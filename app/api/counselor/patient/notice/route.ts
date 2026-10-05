import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser, requireCounselor } from '@/lib/auth'

export async function PUT(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireCounselor(user)
  if (authError) return authError

  const { patient_id, content } = await req.json().catch(() => ({}))
  if (!patient_id) return Response.json({ error: 'patient_idは必須です' }, { status: 400 })

  if (!content?.trim()) {
    await supabaseAdmin.from('counselor_notices').delete().eq('patient_id', patient_id)
    return Response.json({ message: '掲示を削除しました' })
  }

  const { error } = await supabaseAdmin
    .from('counselor_notices')
    .upsert({ patient_id, content: content.trim(), updated_at: new Date().toISOString() }, { onConflict: 'patient_id' })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ message: '掲示を更新しました' })
}
