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
    .select('addiction_id, behavior_type, addictions(name)')
    .eq('patient_id', patientId)

  return Response.json({ profile, patient, symptoms: symptoms ?? [], addictions: addictions ?? [] })
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireCounselor(user)
  if (authError) return authError

  const body = await req.json().catch(() => ({}))
  const { patient_id, counselor_supplement, counselor_findings, counselor_history, full_name, furigana, age, sex } = body

  if (!patient_id) return Response.json({ error: 'patient_id は必須です' }, { status: 400 })

  const patientUpdate: Record<string, unknown> = {}
  if (counselor_supplement !== undefined) patientUpdate.counselor_supplement = counselor_supplement
  if (counselor_findings !== undefined) patientUpdate.counselor_findings = counselor_findings
  if (counselor_history !== undefined) patientUpdate.counselor_history = counselor_history
  if (furigana !== undefined) patientUpdate.furigana = furigana
  if (age !== undefined) patientUpdate.age = age
  if (sex !== undefined) patientUpdate.sex = sex

  if (Object.keys(patientUpdate).length > 0) {
    await supabaseAdmin.from('patients').update(patientUpdate).eq('id', patient_id)
  }
  if (full_name !== undefined) {
    await supabaseAdmin.from('profiles').update({ full_name }).eq('id', patient_id)
  }

  return Response.json({ message: '更新しました' })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireCounselor(user)
  if (authError) return authError

  const body = await req.json().catch(() => ({}))
  const { action, patient_id, addiction_id, behavior_type } = body
  if (!patient_id) return Response.json({ error: 'patient_id は必須です' }, { status: 400 })

  if (action === 'add_addiction') {
    if (!addiction_id) return Response.json({ error: 'addiction_id は必須です' }, { status: 400 })
    // behavior_typeはaddictionsテーブルから自動取得
    const { data: addic } = await supabaseAdmin.from('addictions').select('behavior_type').eq('id', addiction_id).single()
    const { error } = await supabaseAdmin.from('patient_addictions').upsert(
      { patient_id, addiction_id, behavior_type: addic?.behavior_type ?? 'other' },
      { onConflict: 'patient_id,addiction_id' }
    )
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ message: '追加しました' })
  }

  if (action === 'remove_addiction') {
    if (!addiction_id) return Response.json({ error: 'addiction_id は必須です' }, { status: 400 })
    const { error } = await supabaseAdmin.from('patient_addictions')
      .delete().eq('patient_id', patient_id).eq('addiction_id', addiction_id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ message: '削除しました' })
  }

  return Response.json({ error: '不正なアクション' }, { status: 400 })
}
