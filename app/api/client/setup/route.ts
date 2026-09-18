import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser, requireAuth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireAuth(user)
  if (authError) return authError

  if (user!.role !== 'patient') {
    return Response.json({ error: '権限がありません' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const full_name = String(body.full_name ?? '').trim()
  const age = body.age ? String(body.age) : null
  const sex = body.sex ? Number(body.sex) : 0
  const addictions: number[] = Array.isArray(body.addictions) ? body.addictions : []

  if (!full_name) {
    return Response.json({ error: '氏名は必須です' }, { status: 400 })
  }

  await supabaseAdmin
    .from('profiles')
    .update({ full_name })
    .eq('id', user!.id)

  await supabaseAdmin
    .from('patients')
    .update({ age, sex, profile_completed: true })
    .eq('id', user!.id)

  if (addictions.length) {
    await supabaseAdmin.from('patient_addictions').delete().eq('patient_id', user!.id)
    await supabaseAdmin.from('patient_addictions').insert(
      addictions.map((addiction_id) => ({ patient_id: user!.id, addiction_id }))
    )
  }

  return Response.json({ message: 'プロフィールを設定しました' })
}
