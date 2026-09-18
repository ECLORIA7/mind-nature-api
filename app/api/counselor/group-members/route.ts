import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser, requireCounselor } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  const err = requireCounselor(user)
  if (err) return err

  const group_id = req.nextUrl.searchParams.get('group_id')
  if (!group_id) return Response.json({ error: 'group_idが必要です' }, { status: 400 })

  const { data: members } = await supabaseAdmin
    .from('group_members')
    .select('patient_id')
    .eq('group_id', group_id)

  const patientIds = (members ?? []).map((m) => m.patient_id)

  let patients: { id: string; full_name: string; nickname: string | null }[] = []
  if (patientIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('patients')
      .select('id, full_name, nickname')
      .in('id', patientIds)
    patients = data ?? []
  }

  const { data: allPatients } = await supabaseAdmin
    .from('patients')
    .select('id, full_name, nickname')
    .order('full_name')

  return Response.json({ members: patients, all_patients: allPatients ?? [] })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  const err = requireCounselor(user)
  if (err) return err

  const { group_id, patient_id, action } = await req.json()
  if (!group_id || !patient_id) return Response.json({ error: '必須項目が不足しています' }, { status: 400 })

  if (action === 'remove') {
    const { error } = await supabaseAdmin
      .from('group_members')
      .delete()
      .eq('group_id', group_id)
      .eq('patient_id', patient_id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  }

  const { error } = await supabaseAdmin
    .from('group_members')
    .upsert({ group_id, patient_id })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
