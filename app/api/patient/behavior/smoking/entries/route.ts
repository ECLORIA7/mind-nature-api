import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser, requireAuth } from '@/lib/auth'

async function patientOwnsAddiction(patientId: string, addictionId: number): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('patient_addictions').select('addiction_id')
    .eq('patient_id', patientId).eq('addiction_id', addictionId).maybeSingle()
  return data !== null
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireAuth(user)
  if (authError) return authError

  const params = req.nextUrl.searchParams
  const patientId = user!.role === 'patient' ? user!.id : (params.get('patient_id') ?? user!.id)
  const addictionId = parseInt(params.get('addiction_id') ?? '0')
  const date = params.get('date') ?? ''
  if (!addictionId || !date) return Response.json({ error: 'addiction_id と date が必要です' }, { status: 400 })

  const { data: entries } = await supabaseAdmin
    .from('smoking_entries')
    .select('*')
    .eq('patient_id', patientId)
    .eq('addiction_id', addictionId)
    .eq('record_date', date)
    .order('smoked_at', { ascending: true })

  return Response.json({ entries: entries ?? [] })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireAuth(user)
  if (authError) return authError
  if (user!.role !== 'patient') return Response.json({ error: 'クライアントのみ記録できます' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const { addiction_id, date, smoked_at, location, trigger } = body
  if (!addiction_id || !date || !smoked_at) return Response.json({ error: 'addiction_id, date, smoked_at は必須です' }, { status: 400 })
  if (!(await patientOwnsAddiction(user!.id, addiction_id))) return Response.json({ error: '権限がありません' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('smoking_entries')
    .insert({ patient_id: user!.id, addiction_id, record_date: date, smoked_at, location: location ?? null, trigger: trigger ?? null })
    .select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // 喫煙した日として behavior_daily に記録
  await supabaseAdmin.from('behavior_daily').upsert(
    { patient_id: user!.id, addiction_id, record_date: date, abstained: false, updated_at: new Date().toISOString() },
    { onConflict: 'patient_id,addiction_id,record_date' }
  )

  return Response.json({ entry: data }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireAuth(user)
  if (authError) return authError
  if (user!.role !== 'patient') return Response.json({ error: 'クライアントのみ編集できます' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const { id, location, trigger } = body
  if (!id) return Response.json({ error: 'id は必須です' }, { status: 400 })

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (location !== undefined) update.location = location
  if (trigger !== undefined) update.trigger = trigger

  const { data, error } = await supabaseAdmin
    .from('smoking_entries').update(update).eq('id', id).eq('patient_id', user!.id).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ entry: data })
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireAuth(user)
  if (authError) return authError
  if (user!.role !== 'patient') return Response.json({ error: 'クライアントのみ削除できます' }, { status: 403 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return Response.json({ error: 'id は必須です' }, { status: 400 })

  const { data: entry } = await supabaseAdmin.from('smoking_entries').select('record_date, addiction_id').eq('id', id).eq('patient_id', user!.id).single()
  const { error } = await supabaseAdmin.from('smoking_entries').delete().eq('id', id).eq('patient_id', user!.id)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // その日の残りエントリーがなければ behavior_daily も削除
  if (entry) {
    const { data: remaining } = await supabaseAdmin.from('smoking_entries')
      .select('id').eq('patient_id', user!.id).eq('addiction_id', entry.addiction_id).eq('record_date', entry.record_date)
    if (!remaining || remaining.length === 0) {
      await supabaseAdmin.from('behavior_daily').delete()
        .eq('patient_id', user!.id).eq('addiction_id', entry.addiction_id).eq('record_date', entry.record_date)
    }
  }

  return Response.json({ ok: true })
}
