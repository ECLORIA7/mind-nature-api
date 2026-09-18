import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: '認証が必要です' }, { status: 401 })
  if (user.role === 'patient') return Response.json({ error: '権限がありません' }, { status: 403 })

  const { id } = await params

  // 管理者（rank=0カウンセラー）の場合、自チームのクライアントのみ
  if (user.role === 'counselor') {
    const { data: counselor } = await supabaseAdmin
      .from('counselors')
      .select('rank')
      .eq('id', user.id)
      .single()
    if (!counselor || counselor.rank !== 0) {
      return Response.json({ error: '権限がありません' }, { status: 403 })
    }
    // 同じチームか確認
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('hospital_id')
      .eq('id', id)
      .single()
    if (profile?.hospital_id !== user.hospital_id) {
      return Response.json({ error: 'このクライアントは担当外です' }, { status: 403 })
    }
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name')
    .eq('id', id)
    .single()

  const { data: patient } = await supabaseAdmin
    .from('patients')
    .select('age, sex, furigana, nickname, address, daily_rhythm, interests, profession, work_history, personal_relations, harsh_childhood, criminal_record, other_traumas, supplement, goals, profile_completed')
    .eq('id', id)
    .single()

  const { data: symptoms } = await supabaseAdmin
    .from('patient_symptom_details')
    .select('*, addictions(name)')
    .eq('patient_id', id)

  const { data: addictions } = await supabaseAdmin
    .from('patient_addictions')
    .select('addiction_id, addictions(name)')
    .eq('patient_id', id)

  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(id)
  const email = authUser?.user?.email ?? ''
  const created_at = authUser?.user?.created_at ?? ''

  return Response.json({ profile, patient, symptoms: symptoms ?? [], addictions: addictions ?? [], email, created_at })
}
