import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser, requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireAuth(user)
  if (authError) return authError
  if (user!.role !== 'patient') return Response.json({ error: '権限がありません' }, { status: 403 })

  const { data: patient } = await supabaseAdmin
    .from('patients')
    .select('age, sex, furigana, nickname, address, daily_rhythm, interests, profession, work_history, goals, holiday')
    .eq('id', user!.id)
    .single()

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name, email:id')
    .eq('id', user!.id)
    .single()

  const { data: addictions } = await supabaseAdmin
    .from('patient_addictions')
    .select('addiction_id, addictions(name)')
    .eq('patient_id', user!.id)

  return Response.json({ patient, profile, symptoms: [], addictions: addictions ?? [] })
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireAuth(user)
  if (authError) return authError
  if (user!.role !== 'patient') return Response.json({ error: '権限がありません' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const { full_name, age, sex, furigana, nickname, address, daily_rhythm, interests, profession, work_history, goals, holiday } = body

  if (full_name !== undefined) {
    await supabaseAdmin.from('profiles').update({ full_name }).eq('id', user!.id)
  }

  await supabaseAdmin.from('patients').update({
    ...(age !== undefined && { age }),
    ...(sex !== undefined && { sex }),
    ...(furigana !== undefined && { furigana }),
    ...(nickname !== undefined && { nickname }),
    ...(address !== undefined && { address }),
    ...(daily_rhythm !== undefined && { daily_rhythm }),
    ...(interests !== undefined && { interests }),
    ...(profession !== undefined && { profession }),
    ...(work_history !== undefined && { work_history }),
    ...(goals !== undefined && { goals }),
    ...(holiday !== undefined && { holiday }),
  }).eq('id', user!.id)

  return Response.json({ message: 'プロフィールを更新しました' })
}
