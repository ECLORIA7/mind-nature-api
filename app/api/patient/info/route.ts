import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser, requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireAuth(user)
  if (authError) return authError

  const { data: patient } = await supabaseAdmin
    .from('patients')
    .select(`
      id, age, sex,
      profiles ( full_name, hospital_id, hospitals ( name ) ),
      patient_addictions ( addiction_id, addictions ( name, short_name ) ),
      patient_counselors ( counselor_id, counselors ( profiles ( full_name ) ) )
    `)
    .eq('id', user!.id)
    .single()

  if (!patient) {
    return Response.json({ error: '患者情報が見つかりません' }, { status: 404 })
  }

  return Response.json({ patient })
}
