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
    .select('age, sex, address, daily_rhythm, interests, profession, work_history, personal_relations, harsh_childhood, criminal_record, other_traumas, supplement, goals, holiday')
    .eq('id', user!.id)
    .single()

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name, email:id')
    .eq('id', user!.id)
    .single()

  const { data: symptoms } = await supabaseAdmin
    .from('patient_symptom_details')
    .select('*, addictions(name)')
    .eq('patient_id', user!.id)

  const { data: addictions } = await supabaseAdmin
    .from('patient_addictions')
    .select('addiction_id, addictions(name)')
    .eq('patient_id', user!.id)

  return Response.json({ patient, profile, symptoms: symptoms ?? [], addictions: addictions ?? [] })
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireAuth(user)
  if (authError) return authError
  if (user!.role !== 'patient') return Response.json({ error: '権限がありません' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const { full_name, age, sex, address, daily_rhythm, interests, profession, work_history,
    personal_relations, harsh_childhood, criminal_record, other_traumas, supplement, goals, holiday, symptom_details } = body

  if (full_name !== undefined) {
    await supabaseAdmin.from('profiles').update({ full_name }).eq('id', user!.id)
  }

  await supabaseAdmin.from('patients').update({
    ...(age !== undefined && { age }),
    ...(sex !== undefined && { sex }),
    ...(address !== undefined && { address }),
    ...(daily_rhythm !== undefined && { daily_rhythm }),
    ...(interests !== undefined && { interests }),
    ...(profession !== undefined && { profession }),
    ...(work_history !== undefined && { work_history }),
    ...(personal_relations !== undefined && { personal_relations }),
    ...(harsh_childhood !== undefined && { harsh_childhood }),
    ...(criminal_record !== undefined && { criminal_record }),
    ...(other_traumas !== undefined && { other_traumas }),
    ...(supplement !== undefined && { supplement }),
    ...(goals !== undefined && { goals }),
    ...(holiday !== undefined && { holiday }),
  }).eq('id', user!.id)

  if (Array.isArray(symptom_details)) {
    for (const s of symptom_details) {
      await supabaseAdmin.from('patient_symptom_details').upsert({
        patient_id: user!.id,
        addiction_id: s.addiction_id,
        severity: s.severity,
        start_date: s.start_date || null,
        frequency: s.frequency,
        difficulties: s.difficulties,
        trouble: s.trouble,
        methods: s.methods,
        goal: s.goal,
        supplement: s.supplement,
      }, { onConflict: 'patient_id,addiction_id' })
    }
  }

  return Response.json({ message: 'プロフィールを更新しました' })
}
