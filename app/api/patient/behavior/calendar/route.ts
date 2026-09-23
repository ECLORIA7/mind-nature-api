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
  const behaviorType = params.get('behavior_type') ?? 'alcohol'
  if (!addictionId) return Response.json({ error: 'addiction_id が必要です' }, { status: 400 })

  const now = new Date()
  const year = parseInt(params.get('year') ?? String(now.getFullYear()))
  const month = parseInt(params.get('month') ?? String(now.getMonth() + 1))

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { data: dailyRecords } = await supabaseAdmin
    .from('behavior_daily')
    .select('record_date, abstained')
    .eq('patient_id', patientId)
    .eq('addiction_id', addictionId)
    .gte('record_date', startDate)
    .lte('record_date', endDate)

  const calendar: Record<string, { abstained: boolean | null; has_entries: boolean; count?: number }> = {}

  if (behaviorType === 'smoking') {
    const { data: smokingEntries } = await supabaseAdmin
      .from('smoking_entries')
      .select('record_date')
      .eq('patient_id', patientId)
      .eq('addiction_id', addictionId)
      .gte('record_date', startDate)
      .lte('record_date', endDate)

    const countMap: Record<string, number> = {}
    for (const e of smokingEntries ?? []) {
      countMap[e.record_date] = (countMap[e.record_date] ?? 0) + 1
    }
    for (const r of dailyRecords ?? []) {
      calendar[r.record_date] = { abstained: r.abstained, has_entries: !!countMap[r.record_date], count: countMap[r.record_date] ?? 0 }
    }
    for (const [date, count] of Object.entries(countMap)) {
      if (!calendar[date]) calendar[date] = { abstained: false, has_entries: true, count }
    }
  } else if (behaviorType === 'gambling') {
    const { data: gamblingEntries } = await supabaseAdmin
      .from('gambling_entries')
      .select('record_date')
      .eq('patient_id', patientId)
      .eq('addiction_id', addictionId)
      .gte('record_date', startDate)
      .lte('record_date', endDate)

    const entryDateSet = new Set(gamblingEntries?.map((d) => d.record_date) ?? [])
    for (const r of dailyRecords ?? []) {
      calendar[r.record_date] = { abstained: r.abstained, has_entries: entryDateSet.has(r.record_date) }
    }
    for (const d of entryDateSet) {
      if (!calendar[d]) calendar[d] = { abstained: false, has_entries: true }
    }
  } else {
    // alcohol
    const { data: entryDates } = await supabaseAdmin
      .from('alcohol_entries')
      .select('record_date')
      .eq('patient_id', patientId)
      .eq('addiction_id', addictionId)
      .gte('record_date', startDate)
      .lte('record_date', endDate)

    const entryDateSet = new Set(entryDates?.map((d) => d.record_date) ?? [])
    for (const r of dailyRecords ?? []) {
      calendar[r.record_date] = { abstained: r.abstained, has_entries: entryDateSet.has(r.record_date) }
    }
    for (const d of entryDateSet) {
      if (!calendar[d]) calendar[d] = { abstained: false, has_entries: true }
    }
  }

  // 連続断酒日数
  const today = new Date().toISOString().split('T')[0]
  const { data: allRecords } = await supabaseAdmin
    .from('behavior_daily')
    .select('record_date, abstained')
    .eq('patient_id', patientId)
    .eq('addiction_id', addictionId)
    .lte('record_date', today)
    .order('record_date', { ascending: false })
    .limit(400)

  let currentStreak = 0
  if (allRecords) {
    const map = new Map(allRecords.map((r) => [r.record_date, r.abstained]))
    const d = new Date(today)
    while (true) {
      const key = d.toISOString().split('T')[0]
      if (map.get(key) === true) { currentStreak++; d.setDate(d.getDate() - 1) }
      else break
    }
  }

  return Response.json({ calendar, current_streak: currentStreak, year, month })
}
