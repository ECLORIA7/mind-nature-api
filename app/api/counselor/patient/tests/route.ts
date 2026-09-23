import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser, requireCounselor } from '@/lib/auth'

// GET: 全テスト一覧 + 患者への割り当て状況
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireCounselor(user)
  if (authError) return authError

  const patientId = req.nextUrl.searchParams.get('patient_id')
  if (!patientId) return Response.json({ error: 'patient_id が必要です' }, { status: 400 })

  const [{ data: tests }, { data: assigned }, { data: results }] = await Promise.all([
    supabaseAdmin.from('tests').select('id, name, type').order('id'),
    supabaseAdmin.from('patient_tests').select('test_id, enabled').eq('patient_id', patientId),
    supabaseAdmin.from('test_results')
      .select('test_id, attempt_number, score, taken_at')
      .eq('patient_id', patientId)
      .order('taken_at', { ascending: false }),
  ])

  const assignedMap = new Map((assigned ?? []).map(a => [a.test_id, a.enabled]))

  const latestResults: Record<number, { attempt_number: number; score: number; taken_at: string }> = {}
  for (const r of results ?? []) {
    if (!latestResults[r.test_id]) latestResults[r.test_id] = r
  }

  const testsWithStatus = (tests ?? []).map(t => ({
    ...t,
    enabled: assignedMap.get(t.id) ?? false,
    attempt_count: (results ?? []).filter(r => r.test_id === t.id).length,
    latest: latestResults[t.id] ?? null,
  }))

  return Response.json({ tests: testsWithStatus })
}

// PUT: テストの割り当てON/OFFを切り替え
export async function PUT(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireCounselor(user)
  if (authError) return authError

  const body = await req.json().catch(() => ({}))
  const { patient_id, test_id, enabled } = body

  if (!patient_id || test_id === undefined || enabled === undefined) {
    return Response.json({ error: 'patient_id, test_id, enabled が必要です' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('patient_tests')
    .upsert({ patient_id, test_id, enabled, assigned_at: new Date().toISOString() },
      { onConflict: 'patient_id,test_id' })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ok: true })
}
