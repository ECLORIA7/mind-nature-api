import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser, requireCounselor } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireCounselor(user)
  if (authError) return authError

  const addiction_id = req.nextUrl.searchParams.get('addic')

  const { data: counselor } = await supabaseAdmin
    .from('counselors')
    .select('rank')
    .eq('id', user!.id)
    .single()

  let query = supabaseAdmin
    .from('patients')
    .select(`
      id, age, sex, furigana,
      profiles ( full_name, hospital_id, hospitals ( name ) ),
      patient_addictions ( addiction_id, addictions ( name, short_name ) ),
      patient_counselors ( counselor_id, counselors ( profiles ( full_name ) ) )
    `)

  // 管理者以外は同じ病院のみ
  if (counselor?.rank !== 0) {
    query = query.eq('profiles.hospital_id', user!.hospital_id)
  }

  if (addiction_id) {
    query = query.eq('patient_addictions.addiction_id', Number(addiction_id))
  }

  const { data: patients, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ patients: patients ?? [] })
}
