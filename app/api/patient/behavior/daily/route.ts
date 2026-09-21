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
  const date = params.get('date') ?? new Date().toISOString().split('T')[0]

  if (!addictionId) return Response.json({ error: 'addiction_id が必要です' }, { status: 400 })

  const [{ data: daily }, { data: entries }] = await Promise.all([
    supabaseAdmin
      .from('behavior_daily')
      .select('*')
      .eq('patient_id', patientId)
      .eq('addiction_id', addictionId)
      .eq('record_date', date)
      .maybeSingle(),
    supabaseAdmin
      .from('alcohol_entries')
      .select('*')
      .eq('patient_id', patientId)
      .eq('addiction_id', addictionId)
      .eq('record_date', date)
      .order('start_time', { ascending: true }),
  ])

  return Response.json({ daily: daily ?? null, entries: entries ?? [] })
}

async function patientOwnsAddiction(patientId: string, addictionId: number): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('patient_addictions')
    .select('addiction_id')
    .eq('patient_id', patientId)
    .eq('addiction_id', addictionId)
    .maybeSingle()
  return data !== null
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireAuth(user)
  if (authError) return authError

  if (user!.role !== 'patient') {
    return Response.json({ error: 'クライアントのみ記録できます' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const { addiction_id, date, abstained, notes } = body

  if (!addiction_id || !date) {
    return Response.json({ error: 'addiction_id と date は必須です' }, { status: 400 })
  }

  if (!(await patientOwnsAddiction(user!.id, addiction_id))) {
    return Response.json({ error: 'この症状カテゴリーはあなたのものではありません' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin
    .from('behavior_daily')
    .upsert({
      patient_id: user!.id,
      addiction_id,
      record_date: date,
      abstained: abstained ?? false,
      notes: notes ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'patient_id,addiction_id,record_date' })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // 断酒連続日数を計算して返す（ミルストーン判定用）
  let currentStreak = 0
  if (abstained) {
    const today = date
    const { data: allRecords } = await supabaseAdmin
      .from('behavior_daily')
      .select('record_date, abstained')
      .eq('patient_id', user!.id)
      .eq('addiction_id', addiction_id)
      .lte('record_date', today)
      .order('record_date', { ascending: false })
      .limit(400)

    if (allRecords) {
      const map = new Map(allRecords.map((r) => [r.record_date, r.abstained]))
      const d = new Date(today)
      while (true) {
        const key = d.toISOString().split('T')[0]
        if (map.get(key) === true) {
          currentStreak++
          d.setDate(d.getDate() - 1)
        } else {
          break
        }
      }
    }
  }

  return Response.json({ record: data, current_streak: currentStreak })
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireAuth(user)
  if (authError) return authError

  if (user!.role !== 'patient') {
    return Response.json({ error: 'クライアントのみ削除できます' }, { status: 403 })
  }

  const params = req.nextUrl.searchParams
  const addictionId = parseInt(params.get('addiction_id') ?? '0')
  const date = params.get('date') ?? ''

  if (!addictionId || !date) {
    return Response.json({ error: 'addiction_id と date は必須です' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('behavior_daily')
    .delete()
    .eq('patient_id', user!.id)
    .eq('addiction_id', addictionId)
    .eq('record_date', date)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ok: true })
}
