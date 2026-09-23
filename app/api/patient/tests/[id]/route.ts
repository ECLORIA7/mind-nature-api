import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser, requireAuth } from '@/lib/auth'

// GET: テスト詳細（設問・選択肢・過去の回答結果）
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req)
  const authError = requireAuth(user)
  if (authError) return authError

  const { id } = await params
  const testId = parseInt(id)
  const searchParams = req.nextUrl.searchParams
  const patientId = user!.role === 'patient'
    ? user!.id
    : (searchParams.get('patient_id') ?? user!.id)

  const [{ data: test }, { data: questions }, { data: grades }, { data: results }] = await Promise.all([
    supabaseAdmin.from('tests').select('id, name, type, description').eq('id', testId).single(),
    supabaseAdmin.from('test_questions')
      .select('id, question_order, title, test_choices(id, choice_order, text, is_correct, score)')
      .eq('test_id', testId)
      .order('question_order'),
    supabaseAdmin.from('test_grades').select('max_score, grade_text').eq('test_id', testId).order('max_score'),
    supabaseAdmin.from('test_results')
      .select('id, attempt_number, answers, score, taken_at')
      .eq('patient_id', patientId)
      .eq('test_id', testId)
      .order('attempt_number', { ascending: true }),
  ])

  if (!test) return Response.json({ error: 'テストが見つかりません' }, { status: 404 })

  // 設問の選択肢を choice_order でソート
  const sortedQuestions = (questions ?? []).map(q => ({
    ...q,
    test_choices: [...(q.test_choices as { id: number; choice_order: number; text: string; is_correct: boolean; score: number }[])]
      .sort((a, b) => a.choice_order - b.choice_order),
  }))

  return Response.json({ test, questions: sortedQuestions, grades: grades ?? [], results: results ?? [] })
}

// POST: テスト回答を提出
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req)
  const authError = requireAuth(user)
  if (authError) return authError

  if (user!.role !== 'patient') {
    return Response.json({ error: 'クライアントのみ回答できます' }, { status: 403 })
  }

  const { id } = await params
  const testId = parseInt(id)
  const body = await req.json().catch(() => ({}))
  // answers: { question_id: number, selected_choice_ids: number[] }[]
  const { answers } = body

  if (!answers || !Array.isArray(answers)) {
    return Response.json({ error: 'answers が必要です' }, { status: 400 })
  }

  // テストと設問を取得してスコア計算
  const [{ data: test }, { data: questions }] = await Promise.all([
    supabaseAdmin.from('tests').select('id, type').eq('id', testId).single(),
    supabaseAdmin.from('test_questions')
      .select('id, test_choices(id, is_correct, score)')
      .eq('test_id', testId),
  ])

  if (!test) return Response.json({ error: 'テストが見つかりません' }, { status: 404 })

  let totalScore = 0
  const choiceMap = new Map<number, { is_correct: boolean; score: number }>()
  for (const q of questions ?? []) {
    for (const c of q.test_choices as { id: number; is_correct: boolean; score: number }[]) {
      choiceMap.set(c.id, c)
    }
  }

  if (test.type === 0) {
    // スコア型: 各選択肢の score を合計
    for (const a of answers) {
      for (const cid of a.selected_choice_ids ?? []) {
        totalScore += choiceMap.get(cid)?.score ?? 0
      }
    }
  } else {
    // 正誤型: 各設問で全選択肢が正確に一致すれば1点
    for (const a of answers) {
      const choices = (questions ?? []).find(q => q.id === a.question_id)
        ?.test_choices as { id: number; is_correct: boolean }[] | undefined
      if (!choices) continue
      const correctIds = new Set(choices.filter(c => c.is_correct).map(c => c.id))
      const selectedIds = new Set<number>((a.selected_choice_ids ?? []) as number[])
      const allCorrect = [...correctIds].every(id => selectedIds.has(id)) &&
        [...selectedIds].every(id => correctIds.has(id))
      if (allCorrect) totalScore++
    }
  }

  // 受験回数を取得
  const { count } = await supabaseAdmin
    .from('test_results')
    .select('*', { count: 'exact', head: true })
    .eq('patient_id', user!.id)
    .eq('test_id', testId)

  const attemptNumber = (count ?? 0) + 1

  const { data: result, error } = await supabaseAdmin
    .from('test_results')
    .insert({
      patient_id: user!.id,
      test_id: testId,
      attempt_number: attemptNumber,
      answers,
      score: totalScore,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ result, score: totalScore }, { status: 201 })
}
