import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser, requireCounselor } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireCounselor(user)
  if (authError) return authError

  const { searchParams } = new URL(req.url)
  const patientId = searchParams.get('id')
  if (!patientId) return Response.json({ error: 'id は必須です' }, { status: 400 })

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name, hospital_id')
    .eq('id', patientId)
    .single()

  const { data: patient } = await supabaseAdmin
    .from('patients')
    .select('age, sex, furigana, nickname, address, daily_rhythm, interests, profession, work_history, personal_relations, harsh_childhood, criminal_record, other_traumas, supplement, goals, counselor_supplement, counselor_findings, counselor_history')
    .eq('id', patientId)
    .single()

  const { data: symptoms } = await supabaseAdmin
    .from('patient_symptom_details')
    .select('*, addictions(name)')
    .eq('patient_id', patientId)

  const { data: addictions } = await supabaseAdmin
    .from('patient_addictions')
    .select('addiction_id, addictions(name)')
    .eq('patient_id', patientId)

  return Response.json({ profile, patient, symptoms: symptoms ?? [], addictions: addictions ?? [] })
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireCounselor(user)
  if (authError) return authError

  const body = await req.json().catch(() => ({}))
  const { patient_id, counselor_supplement, counselor_findings, counselor_history } = body

  if (!patient_id) return Response.json({ error: 'patient_id は必須です' }, { status: 400 })

  await supabaseAdmin.from('patients').update({
    ...(counselor_supplement !== undefined && { counselor_supplement }),
    ...(counselor_findings !== undefined && { counselor_findings }),
    ...(counselor_history !== undefined && { counselor_history }),
  }).eq('id', patient_id)

  return Response.json({ message: '更新しました' })
}
