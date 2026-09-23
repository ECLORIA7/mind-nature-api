import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser, requireAuth } from '@/lib/auth'

// GET: 割り当て済みテスト一覧（クライアント用）
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireAuth(user)
  if (authError) return authError

  const params = req.nextUrl.searchParams
  const patientId = user!.role === 'patient'
    ? user!.id
    : (params.get('patient_id') ?? user!.id)

  // 割り当て済みテストを取得
  const { data: assigned } = await supabaseAdmin
    .from('patient_tests')
    .select('test_id, enabled')
    .eq('patient_id', patientId)
    .eq('enabled', true)

  if (!assigned || assigned.length === 0) {
    return Response.json({ tests: [] })
  }

  const testIds = assigned.map(a => a.test_id)

  const { data: tests } = await supabaseAdmin
    .from('tests')
    .select('id, name, type')
    .in('id', testIds)
    .order('id')

  // 各テストの受験回数を取得
  const { data: results } = await supabaseAdmin
    .from('test_results')
    .select('test_id, attempt_number, score, taken_at')
    .eq('patient_id', patientId)
    .in('test_id', testIds)
    .order('attempt_number', { ascending: false })

  const latestResults: Record<number, { attempt_number: number; score: number; taken_at: string }> = {}
  for (const r of results ?? []) {
    if (!latestResults[r.test_id]) {
      latestResults[r.test_id] = r
    }
  }

  const testsWithStatus = (tests ?? []).map(t => ({
    ...t,
    attempt_count: results?.filter(r => r.test_id === t.id).length ?? 0,
    latest: latestResults[t.id] ?? null,
  }))

  return Response.json({ tests: testsWithStatus })
}
