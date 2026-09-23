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
    .from('gambling_entries')
    .select('*')
    .eq('patient_id', patientId)
    .eq('addiction_id', addictionId)
    .eq('record_date', date)
    .order('created_at', { ascending: true })

  // 週間・月間の負け金額集計
  const d = new Date(date + 'T00:00:00')
  const dayOfWeek = d.getDay()
  const weekStart = new Date(d); weekStart.setDate(d.getDate() - dayOfWeek)
  const weekEnd = new Date(d); weekEnd.setDate(d.getDate() + (6 - dayOfWeek))
  const monthStart = `${date.slice(0, 7)}-01`
  const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]

  const [{ data: weekData }, { data: monthData }] = await Promise.all([
    supabaseAdmin.from('gambling_entries').select('amount_lost, amount_spent')
      .eq('patient_id', patientId).eq('addiction_id', addictionId)
      .gte('record_date', weekStart.toISOString().split('T')[0])
      .lte('record_date', weekEnd.toISOString().split('T')[0]),
    supabaseAdmin.from('gambling_entries').select('amount_lost, amount_spent')
      .eq('patient_id', patientId).eq('addiction_id', addictionId)
      .gte('record_date', monthStart).lte('record_date', monthEnd),
  ])

  const sum = (arr: { amount_lost: number; amount_spent: number }[] | null) => ({
    lost: arr?.reduce((s, r) => s + (r.amount_lost ?? 0), 0) ?? 0,
    spent: arr?.reduce((s, r) => s + (r.amount_spent ?? 0), 0) ?? 0,
  })

  return Response.json({ entries: entries ?? [], week: sum(weekData), month: sum(monthData) })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireAuth(user)
  if (authError) return authError
  if (user!.role !== 'patient') return Response.json({ error: 'クライアントのみ記録できます' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const { addiction_id, date, session_time, location, trigger, amount_spent, amount_lost } = body
  if (!addiction_id || !date) return Response.json({ error: 'addiction_id と date は必須です' }, { status: 400 })
  if (!(await patientOwnsAddiction(user!.id, addiction_id))) return Response.json({ error: '権限がありません' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('gambling_entries')
    .insert({
      patient_id: user!.id, addiction_id, record_date: date,
      session_time: session_time ?? null, location: location ?? null, trigger: trigger ?? null,
      amount_spent: amount_spent ?? 0, amount_lost: amount_lost ?? 0,
    })
    .select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })

  await supabaseAdmin.from('behavior_daily').upsert(
    { patient_id: user!.id, addiction_id, record_date: date, abstained: false, updated_at: new Date().toISOString() },
    { onConflict: 'patient_id,addiction_id,record_date' }
  )

  return Response.json({ entry: data }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireAuth(user)
  if (authError) return authError
  if (user!.role !== 'patient') return Response.json({ error: 'クライアントのみ削除できます' }, { status: 403 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return Response.json({ error: 'id は必須です' }, { status: 400 })

  const { data: entry } = await supabaseAdmin.from('gambling_entries').select('record_date, addiction_id').eq('id', id).eq('patient_id', user!.id).single()
  const { error } = await supabaseAdmin.from('gambling_entries').delete().eq('id', id).eq('patient_id', user!.id)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  if (entry) {
    const { data: remaining } = await supabaseAdmin.from('gambling_entries')
      .select('id').eq('patient_id', user!.id).eq('addiction_id', entry.addiction_id).eq('record_date', entry.record_date)
    if (!remaining || remaining.length === 0) {
      await supabaseAdmin.from('behavior_daily').delete()
        .eq('patient_id', user!.id).eq('addiction_id', entry.addiction_id).eq('record_date', entry.record_date)
    }
  }

  return Response.json({ ok: true })
}
