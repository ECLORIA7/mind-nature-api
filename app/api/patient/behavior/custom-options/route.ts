import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser, requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireAuth(user)
  if (authError) return authError

  const params = req.nextUrl.searchParams
  const patientId = user!.role === 'patient'
    ? user!.id
    : (params.get('patient_id') ?? user!.id)

  const addictionId = parseInt(params.get('addiction_id') ?? '0')
  if (!addictionId) return Response.json({ error: 'addiction_id が必要です' }, { status: 400 })

  const { data } = await supabaseAdmin
    .from('behavior_custom_options')
    .select('field_name, value, use_count')
    .eq('patient_id', patientId)
    .eq('addiction_id', addictionId)
    .order('use_count', { ascending: false })

  const grouped: Record<string, string[]> = {}
  for (const row of data ?? []) {
    if (!grouped[row.field_name]) grouped[row.field_name] = []
    grouped[row.field_name].push(row.value)
  }

  return Response.json({ options: grouped })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireAuth(user)
  if (authError) return authError

  if (user!.role !== 'patient') {
    return Response.json({ error: 'クライアントのみ登録できます' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const { addiction_id, field_name, value } = body

  if (!addiction_id || !field_name || !value?.trim()) {
    return Response.json({ error: 'addiction_id, field_name, value は必須です' }, { status: 400 })
  }

  const { data: existing } = await supabaseAdmin
    .from('behavior_custom_options')
    .select('id, use_count')
    .eq('patient_id', user!.id)
    .eq('addiction_id', addiction_id)
    .eq('field_name', field_name)
    .eq('value', value.trim())
    .maybeSingle()

  if (existing) {
    await supabaseAdmin
      .from('behavior_custom_options')
      .update({ use_count: existing.use_count + 1 })
      .eq('id', existing.id)
  } else {
    await supabaseAdmin
      .from('behavior_custom_options')
      .insert({
        patient_id: user!.id,
        addiction_id,
        field_name,
        value: value.trim(),
        use_count: 1,
      })
  }

  return Response.json({ ok: true }, { status: 201 })
}
