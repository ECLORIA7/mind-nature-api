'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/auth-client'

type Choice = { id: number; choice_order: number; text: string; is_correct: boolean; score: number }
type Question = { id: number; question_order: number; title: string; test_choices: Choice[] }
type Grade = { max_score: number; grade_text: string }
type Result = { id: string; attempt_number: number; answers: { question_id: number; selected_choice_ids: number[] }[]; score: number; taken_at: string }
type Test = { id: number; name: string; type: number; description: string | null }

export default function TestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [test, setTest] = useState<Test | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'menu' | 'take' | 'result'>('menu')
  const [selectedResult, setSelectedResult] = useState<Result | null>(null)
  // answers during exam: { [questionId]: Set<choiceId> }
  const [answers, setAnswers] = useState<Record<number, Set<number>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ score: number; result: Result } | null>(null)

  const load = () => {
    setLoading(true)
    apiFetch(`/patient/tests/${id}`).then(r => r.json()).then(d => {
      setTest(d.test)
      setQuestions(d.questions ?? [])
      setGrades(d.grades ?? [])
      setResults(d.results ?? [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  function startTest() {
    const init: Record<number, Set<number>> = {}
    for (const q of questions) init[q.id] = new Set()
    setAnswers(init)
    setSubmitResult(null)
    setView('take')
  }

  function toggleChoice(questionId: number, choiceId: number, isRadio: boolean) {
    setAnswers(prev => {
      const next = { ...prev }
      const sel = new Set(prev[questionId] ?? [])
      if (isRadio) {
        sel.clear()
        sel.add(choiceId)
      } else {
        if (sel.has(choiceId)) sel.delete(choiceId)
        else sel.add(choiceId)
      }
      next[questionId] = sel
      return next
    })
  }

  async function handleSubmit() {
    if (submitting) return
    const unanswered = questions.filter(q => (answers[q.id]?.size ?? 0) === 0)
    if (unanswered.length > 0) {
      alert(`${unanswered[0].question_order}問目が未回答です`)
      return
    }
    setSubmitting(true)
    const payload = questions.map(q => ({
      question_id: q.id,
      selected_choice_ids: [...(answers[q.id] ?? [])],
    }))
    const res = await apiFetch(`/patient/tests/${id}`, {
      method: 'POST',
      body: JSON.stringify({ answers: payload }),
    })
    const data = await res.json()
    setSubmitting(false)
    if (res.ok) {
      setSubmitResult({ score: data.score, result: data.result })
      load()
    }
  }

  function getGrade(score: number) {
    for (const g of grades) {
      if (score <= g.max_score) return g.grade_text
    }
    return grades[grades.length - 1]?.grade_text ?? ''
  }

  function showResult(r: Result) {
    setSelectedResult(r)
    setView('result')
  }

  if (loading) return <div style={{ padding: 24 }}><p>読み込み中...</p></div>
  if (!test) return <div style={{ padding: 24 }}><p>テストが見つかりません</p></div>

  const questionCount = questions.length

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '16px 16px 80px' }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => view === 'menu' ? router.back() : setView('menu')}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#15803d' }}>‹</button>
        <h1 style={{ fontSize: 17, fontWeight: 700, color: '#15803d', flex: 1 }}>{test.name}</h1>
      </div>

      {/* ===== メニュー ===== */}
      {view === 'menu' && (
        <>
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 14, padding: '14px 18px', marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: '#15803d', marginBottom: 6 }}>
              {test.type === 0 ? '📋 スコア型（合計点でグレード判定）' : '✏️ 理解度テスト（正答数/問数）'}
            </div>
            <div style={{ fontSize: 13, color: '#64748b' }}>{questionCount}問</div>
          </div>

          <button onClick={startTest}
            style={{ display: 'block', width: '100%', background: '#15803d', color: 'white', border: 'none',
              borderRadius: 14, padding: '16px', fontSize: 16, fontWeight: 600, cursor: 'pointer', marginBottom: 24 }}>
            {results.length === 0 ? 'テストを受ける' : 'もう一度受ける'}
          </button>

          {/* 過去の結果 */}
          {results.length > 0 && (
            <>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: '#334155', marginBottom: 12 }}>過去の結果</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[...results].reverse().map(r => (
                  <button key={r.id} onClick={() => showResult(r)}
                    style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 16px',
                      textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{r.attempt_number}回目</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>
                        {new Date(r.taken_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#15803d' }}>
                        {test.type === 0 ? `${r.score}点` : `${r.score}/${questionCount}点`}
                      </div>
                      {test.type === 0 && (
                        <div style={{ fontSize: 11, color: '#64748b' }}>{getGrade(r.score)}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ===== 受験画面 ===== */}
      {view === 'take' && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {questions.map((q, qi) => {
              const isRadio = test.type === 0
              const correctCount = q.test_choices.filter(c => c.is_correct).length
              const isMulti = correctCount > 1
              return (
                <div key={q.id} style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: '16px 18px' }}>
                  <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>
                    {qi + 1}問目{!isRadio && isMulti ? '（複数選択可）' : ''}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', marginBottom: 14, lineHeight: 1.6 }}>{q.title}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {q.test_choices.map(c => {
                      const selected = answers[q.id]?.has(c.id) ?? false
                      return (
                        <button key={c.id}
                          onClick={() => toggleChoice(q.id, c.id, isRadio)}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1.5px solid',
                            borderColor: selected ? '#15803d' : '#e2e8f0', borderRadius: 10, background: selected ? '#f0fdf4' : 'white',
                            cursor: 'pointer', textAlign: 'left' }}>
                          <div style={{ width: 20, height: 20, borderRadius: isRadio ? '50%' : 4, border: '2px solid',
                            borderColor: selected ? '#15803d' : '#cbd5e1', background: selected ? '#15803d' : 'white',
                            flexShrink: 0 }} />
                          <span style={{ fontSize: 14, color: '#1e293b', lineHeight: 1.5 }}>{c.text}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
          {submitResult ? (
            <div style={{ marginTop: 24, background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 14,
              padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#15803d', marginBottom: 4 }}>送信しました</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#15803d', marginBottom: 16 }}>
                {test.type === 0 ? `${submitResult.score}点` : `${submitResult.score}/${questionCount}点`}
              </div>
              <button onClick={() => { setSelectedResult(submitResult.result); setView('result') }}
                style={{ background: '#15803d', color: 'white', border: 'none', borderRadius: 12,
                  padding: '12px 32px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                結果の詳細を見る
              </button>
            </div>
          ) : (
            <button onClick={handleSubmit} disabled={submitting}
              style={{ display: 'block', width: '100%', background: submitting ? '#86efac' : '#15803d', color: 'white',
                border: 'none', borderRadius: 14, padding: '16px', fontSize: 16, fontWeight: 600,
                cursor: submitting ? 'default' : 'pointer', marginTop: 24 }}>
              {submitting ? '送信中...' : '回答を送信する'}
            </button>
          )}
        </>
      )}

      {/* ===== 結果画面 ===== */}
      {view === 'result' && selectedResult && (
        <>
          {/* スコア */}
          <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 16, padding: '20px',
            textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: '#15803d', marginBottom: 6 }}>{selectedResult.attempt_number}回目の結果</div>
            <div style={{ fontSize: 40, fontWeight: 800, color: '#15803d' }}>
              {test.type === 0 ? `${selectedResult.score}点` : `${selectedResult.score}/${questionCount}点`}
            </div>
            {test.type === 0 && (
              <div style={{ fontSize: 15, color: '#166534', marginTop: 8, fontWeight: 500 }}>
                {getGrade(selectedResult.score)}
              </div>
            )}
          </div>

          {/* 各問の詳細 */}
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#334155', marginBottom: 12 }}>回答詳細</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {questions.map((q, qi) => {
              const ans = selectedResult.answers.find(a => a.question_id === q.id)
              const selectedIds = new Set(ans?.selected_choice_ids ?? [])
              const correctIds = new Set(q.test_choices.filter(c => c.is_correct).map(c => c.id))
              const isCorrect = test.type === 1
                ? [...correctIds].every(id => selectedIds.has(id)) && [...selectedIds].every(id => correctIds.has(id))
                : null
              return (
                <div key={q.id} style={{ background: 'white', border: '1.5px solid',
                  borderColor: isCorrect === true ? '#86efac' : isCorrect === false ? '#fca5a5' : '#e2e8f0',
                  borderRadius: 14, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    {test.type === 1 && (
                      <span style={{ fontSize: 18 }}>{isCorrect ? '⭕' : '❌'}</span>
                    )}
                    <span style={{ fontSize: 13, color: '#64748b' }}>{qi + 1}問目</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 10, lineHeight: 1.5 }}>{q.title}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {q.test_choices.map(c => {
                      const wasSelected = selectedIds.has(c.id)
                      const isCorrectChoice = c.is_correct
                      let bg = 'transparent'
                      let border = '#e2e8f0'
                      if (test.type === 1) {
                        if (wasSelected && isCorrectChoice) { bg = '#dcfce7'; border = '#86efac' }
                        else if (wasSelected && !isCorrectChoice) { bg = '#fee2e2'; border = '#fca5a5' }
                        else if (!wasSelected && isCorrectChoice) { bg = '#fef9c3'; border = '#fde047' }
                      } else {
                        if (wasSelected) { bg = '#dcfce7'; border = '#86efac' }
                      }
                      return (
                        <div key={c.id} style={{ padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${border}`, background: bg,
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: '#334155' }}>
                          <span>{c.text}</span>
                          {test.type === 0 && wasSelected && (
                            <span style={{ color: '#15803d', fontWeight: 600, fontSize: 12 }}>{c.score}点</span>
                          )}
                          {test.type === 1 && !wasSelected && isCorrectChoice && (
                            <span style={{ color: '#a16207', fontSize: 11 }}>正解</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
