'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/auth-client'
import styles from './preview.module.css'

type Patient = {
  age: string; sex: number; furigana: string; nickname: string; address: string; daily_rhythm: string
  interests: string; profession: string; work_history: string; personal_relations: string
  harsh_childhood: string; criminal_record: string; other_traumas: string; supplement: string; goals: string
  counselor_supplement: string; counselor_findings: string; counselor_history: string
}
type Symptom = {
  addiction_id: number; addictions?: { name: string }; severity: string; start_date: string
  frequency: string; difficulties: string; trouble: string; methods: string; goal: string; supplement: string
}
type Addiction = { addiction_id: number; addictions: { name: string } }
type Todo = { id: string; title?: string; content?: string; completed: boolean }
type Message = { id: string; poster_id: string; content: string; sequence_num: number; profiles?: { full_name: string } }
type Group = { id: string; name: string; organizations?: { name: string } }

type Tab = 'ToDo' | '行動の記録' | 'テスト' | 'チャット' | 'グループ' | 'マイページ' | 'カウンセラー記録'
const PATIENT_TABS: Tab[] = ['ToDo', '行動の記録', 'テスト', 'チャット', 'グループ', 'マイページ']

export default function PreviewPage() {
  const { patientId } = useParams<{ patientId: string }>()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('ToDo')

  // Core patient data (always loaded)
  const [fullName, setFullName] = useState('')
  const [patient, setPatient] = useState<Patient | null>(null)
  const [symptoms, setSymptoms] = useState<Symptom[]>([])
  const [addictions, setAddictions] = useState<Addiction[]>([])
  const [coreLoading, setCoreLoading] = useState(true)
  const [notes, setNotes] = useState({ counselor_supplement: '', counselor_findings: '', counselor_history: '' })
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // ToDo
  const [todos, setTodos] = useState<Todo[]>([])
  const [todosLoaded, setTodosLoaded] = useState(false)

  // Chat
  const [selectedAddic, setSelectedAddic] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Groups
  const [groups, setGroups] = useState<Group[]>([])
  const [groupsLoaded, setGroupsLoaded] = useState(false)

  // Tests
  type TestItem = { id: number; name: string; type: number; enabled: boolean; attempt_count: number; latest: { score: number; taken_at: string } | null }
  type TestResult = { id: string; attempt_number: number; score: number; taken_at: string; answers: { question_id: number; selected_choice_ids: number[] }[] }
  type TestChoice = { id: number; choice_order: number; text: string; is_correct: boolean; score: number }
  type TestQuestion = { id: number; question_order: number; title: string; test_choices: TestChoice[] }
  type TestGrade = { max_score: number; grade_text: string }
  const [tests, setTests] = useState<TestItem[]>([])
  const [testsLoaded, setTestsLoaded] = useState(false)
  const [selectedTestId, setSelectedTestId] = useState<number | null>(null)
  const [testDetail, setTestDetail] = useState<{ questions: TestQuestion[]; grades: TestGrade[]; results: TestResult[] } | null>(null)
  const [testDetailLoading, setTestDetailLoading] = useState(false)
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null)

  // 行動の記録
  const [behaviorAddicId, setBehaviorAddicId] = useState<number | null>(null)
  const [behaviorView, setBehaviorView] = useState<'month' | 'day'>('month')
  const [behaviorYear, setBehaviorYear] = useState(new Date().getFullYear())
  const [behaviorMonth, setBehaviorMonth] = useState(new Date().getMonth() + 1)
  const [behaviorDate, setBehaviorDate] = useState(new Date().toLocaleDateString('sv-SE'))
  const [behaviorCalendar, setBehaviorCalendar] = useState<Record<string, { abstained: boolean | null; has_entries: boolean }>>({})
  const [behaviorStreak, setBehaviorStreak] = useState(0)
  const [behaviorLoading, setBehaviorLoading] = useState(false)
  const [behaviorDayRecord, setBehaviorDayRecord] = useState<{ abstained: boolean } | null>(null)
  const [behaviorDayEntries, setBehaviorDayEntries] = useState<{
    id: string; start_time: string; end_time: string | null
    location: string | null; companions: string | null; mood: string | null
    drinks: { type: string; amount: string }[]; notes: string | null
  }[]>([])

  // Load core patient data
  useEffect(() => {
    apiFetch(`/counselor/patient?id=${patientId}`)
      .then((r) => r.json())
      .then((d) => {
        setFullName(d.profile?.full_name ?? '')
        setPatient(d.patient)
        setSymptoms(d.symptoms ?? [])
        setAddictions(d.addictions ?? [])
        setNotes({
          counselor_supplement: d.patient?.counselor_supplement ?? '',
          counselor_findings: d.patient?.counselor_findings ?? '',
          counselor_history: d.patient?.counselor_history ?? '',
        })
        if ((d.addictions ?? []).length > 0) {
          setSelectedAddic(d.addictions[0].addiction_id)
        }
      })
      .finally(() => setCoreLoading(false))
  }, [patientId])

  // Load ToDo when tab active
  useEffect(() => {
    if (activeTab !== 'ToDo' || todosLoaded) return
    apiFetch(`/patient/todo?patient_id=${patientId}`)
      .then((r) => r.json())
      .then((d) => setTodos(d.todos ?? []))
      .finally(() => setTodosLoaded(true))
  }, [activeTab, patientId, todosLoaded])

  // Load chat messages
  useEffect(() => {
    if (activeTab !== 'チャット' || !selectedAddic) return
    setChatLoading(true)
    apiFetch(`/patient/bbs?patient_id=${patientId}&addic=${selectedAddic}`)
      .then((r) => r.json())
      .then((d) => setMessages(d.messages ?? []))
      .finally(() => setChatLoading(false))
  }, [activeTab, patientId, selectedAddic])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Load groups
  useEffect(() => {
    if (activeTab !== 'グループ' || groupsLoaded) return
    apiFetch(`/patient/groups?patient_id=${patientId}`)
      .then((r) => r.json())
      .then((d) => setGroups(d.groups ?? []))
      .finally(() => setGroupsLoaded(true))
  }, [activeTab, patientId, groupsLoaded])

  // Load tests list (テストタブ or カウンセラー記録タブ)
  useEffect(() => {
    if ((activeTab !== 'テスト' && activeTab !== 'カウンセラー記録') || testsLoaded) return
    apiFetch(`/counselor/patient/tests?patient_id=${patientId}`)
      .then((r) => r.json())
      .then((d) => setTests(d.tests ?? []))
      .finally(() => setTestsLoaded(true))
  }, [activeTab, patientId, testsLoaded])

  const toggleTest = async (testId: number, enabled: boolean) => {
    await apiFetch('/counselor/patient/tests', {
      method: 'PUT',
      body: JSON.stringify({ patient_id: patientId, test_id: testId, enabled }),
    })
    setTestsLoaded(false)
  }

  // Load test detail
  useEffect(() => {
    if (!selectedTestId) return
    setTestDetail(null)
    setSelectedResult(null)
    setTestDetailLoading(true)
    apiFetch(`/patient/tests/${selectedTestId}?patient_id=${patientId}`)
      .then((r) => r.json())
      .then((d) => {
        setTestDetail({ questions: d.questions ?? [], grades: d.grades ?? [], results: d.results ?? [] })
      })
      .catch(() => {
        setTestDetail({ questions: [], grades: [], results: [] })
      })
      .finally(() => setTestDetailLoading(false))
  }, [selectedTestId, patientId])

  // Load behavior calendar (月間)
  useEffect(() => {
    if (activeTab !== '行動の記録' || !behaviorAddicId || behaviorView !== 'month') return
    setBehaviorLoading(true)
    apiFetch(`/patient/behavior/calendar?addiction_id=${behaviorAddicId}&year=${behaviorYear}&month=${behaviorMonth}&patient_id=${patientId}`)
      .then((r) => r.json())
      .then((d) => { setBehaviorCalendar(d.calendar ?? {}); setBehaviorStreak(d.current_streak ?? 0) })
      .finally(() => setBehaviorLoading(false))
  }, [activeTab, patientId, behaviorAddicId, behaviorYear, behaviorMonth, behaviorView])

  // Load behavior day data (日別)
  useEffect(() => {
    if (activeTab !== '行動の記録' || !behaviorAddicId || behaviorView !== 'day') return
    setBehaviorLoading(true)
    apiFetch(`/patient/behavior/daily?addiction_id=${behaviorAddicId}&date=${behaviorDate}&patient_id=${patientId}`)
      .then((r) => r.json())
      .then((d) => { setBehaviorDayRecord(d.daily); setBehaviorDayEntries(d.entries ?? []) })
      .finally(() => setBehaviorLoading(false))
  }, [activeTab, patientId, behaviorAddicId, behaviorDate, behaviorView])

  // behavior 初期 addiction
  useEffect(() => {
    if (addictions.length > 0 && !behaviorAddicId) setBehaviorAddicId(addictions[0].addiction_id)
  }, [addictions, behaviorAddicId])

  const sendMessage = async () => {
    if (!chatInput.trim() || !selectedAddic) return
    setSending(true)
    await apiFetch('/patient/bbs', {
      method: 'POST',
      body: JSON.stringify({ content: chatInput, addic: selectedAddic, patient_id: patientId }),
    })
    setChatInput('')
    const r = await apiFetch(`/patient/bbs?patient_id=${patientId}&addic=${selectedAddic}`)
    const d = await r.json()
    setMessages(d.messages ?? [])
    setSending(false)
  }

  const saveNotes = async () => {
    setSaving(true)
    await apiFetch('/counselor/patient', {
      method: 'PATCH',
      body: JSON.stringify({ patient_id: patientId, ...notes }),
    })
    setEditing(false)
    setSaving(false)
  }

  const sexLabel = (s: number) => s === 1 ? '男性' : s === 2 ? '女性' : s === 3 ? 'その他' : '—'

  if (coreLoading) return (
    <div className={styles.overlay}>
      <div className={styles.banner}><span>読み込み中...</span></div>
      <p style={{ padding: 32 }}>読み込み中...</p>
    </div>
  )

  return (
    <div className={styles.overlay}>
      {/* Preview banner */}
      <div className={styles.banner}>
        <button className={styles.bannerBack} onClick={() => router.back()}>← 戻る</button>
        <span className={styles.bannerName}>プレビュー中：{fullName}</span>
        <span style={{ fontSize: 11, opacity: 0.7 }}>カウンセラービュー</span>
      </div>

      {/* Patient-style green nav */}
      <nav className={styles.nav}>
        <span className={styles.brand}>MindNature</span>
        <div className={styles.navLinks}>
          {PATIENT_TABS.map((t) => (
            <button
              key={t}
              className={activeTab === t ? styles.navLinkActive : styles.navLink}
              onClick={() => setActiveTab(t)}
            >{t}</button>
          ))}
          <button
            className={activeTab === 'カウンセラー記録' ? styles.navLinkCounselorActive : styles.navLinkCounselor}
            onClick={() => setActiveTab('カウンセラー記録')}
          >カウンセラー記録</button>
        </div>
      </nav>

      {/* Content */}
      <div className={styles.content}>

        {/* ===== ToDo ===== */}
        {activeTab === 'ToDo' && (
          <div>
            <h1 className={styles.heading}>ToDo</h1>
            {!todosLoaded ? <p>読み込み中...</p> : (
              <ul className={styles.todoList}>
                {todos.length === 0 && <p className={styles.empty}>ToDoはありません</p>}
                {todos.map((t) => (
                  <li key={t.id} className={styles.todoItem}>
                    <span className={t.completed ? styles.checkDone : styles.check} />
                    <span className={t.completed ? styles.todoTextDone : styles.todoText}>
                      {t.title ?? t.content ?? ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ===== チャット ===== */}
        {activeTab === 'チャット' && (
          <div>
            <h1 className={styles.heading}>カウンセラーとのチャット</h1>
            {addictions.length === 0 ? (
              <p className={styles.empty}>症状カテゴリーが設定されていません</p>
            ) : (
              <div className={styles.chatWrapper}>
                {addictions.length > 1 && (
                  <div className={styles.addictionTabs}>
                    {addictions.map((a) => (
                      <button
                        key={a.addiction_id}
                        className={`${styles.addictionTab} ${selectedAddic === a.addiction_id ? styles.addictionTabActive : ''}`}
                        onClick={() => setSelectedAddic(a.addiction_id)}
                      >
                        {a.addictions.name}
                      </button>
                    ))}
                  </div>
                )}
                {chatLoading ? <p>読み込み中...</p> : (
                  <div className={styles.messages}>
                    {messages.length === 0 && <p className={styles.empty}>メッセージはありません</p>}
                    {messages.map((m) => {
                      const isPatient = m.poster_id === patientId
                      return (
                        <div key={m.id} className={isPatient ? styles.rowMe : styles.rowOther}>
                          {!isPatient && <div className={styles.senderName}>{m.profiles?.full_name ?? 'カウンセラー'}</div>}
                          <div className={isPatient ? styles.bubbleMe : styles.bubbleOther}>{m.content}</div>
                        </div>
                      )
                    })}
                    <div ref={bottomRef} />
                  </div>
                )}
                <div className={styles.inputRow}>
                  <input
                    className={styles.input}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="カウンセラーとして返信..."
                  />
                  <button className={styles.sendBtn} onClick={sendMessage} disabled={sending}>送信</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== グループ ===== */}
        {activeTab === 'グループ' && (
          <div>
            <h1 className={styles.heading}>グループ</h1>
            {!groupsLoaded ? <p>読み込み中...</p> : groups.length === 0 ? (
              <p className={styles.empty}>グループに所属していません</p>
            ) : (
              groups.map((g) => (
                <div key={g.id} className={styles.groupCard}>
                  <div className={styles.groupName}>{g.name}</div>
                  {g.organizations && (
                    <div className={styles.groupOrg}>{(g.organizations as { name?: string }).name}</div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ===== テスト ===== */}
        {activeTab === 'テスト' && (() => {
          function getGrade(grades: TestGrade[], score: number) {
            for (const g of grades) { if (score <= g.max_score) return g.grade_text }
            return grades[grades.length - 1]?.grade_text ?? ''
          }

          // 結果詳細表示中
          if (selectedResult && testDetail) {
            const test = tests.find(t => t.id === selectedTestId)
            const qCount = testDetail.questions.length
            return (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <button onClick={() => setSelectedResult(null)}
                    style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#15803d' }}>‹</button>
                  <h1 className={styles.heading} style={{ margin: 0 }}>{test?.name} — {selectedResult.attempt_number}回目の結果</h1>
                </div>
                <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 14, padding: 18, textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 36, fontWeight: 800, color: '#15803d' }}>
                    {test?.type === 0 ? `${selectedResult.score}点` : `${selectedResult.score}/${qCount}点`}
                  </div>
                  {test?.type === 0 && (
                    <div style={{ fontSize: 14, color: '#166534', marginTop: 4 }}>{getGrade(testDetail.grades, selectedResult.score)}</div>
                  )}
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                    {new Date(selectedResult.taken_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {testDetail.questions.map((q, qi) => {
                    const ans = selectedResult.answers.find(a => a.question_id === q.id)
                    const selectedIds = new Set(ans?.selected_choice_ids ?? [])
                    const correctIds = new Set(q.test_choices.filter(c => c.is_correct).map(c => c.id))
                    const isCorrect = test?.type === 1
                      ? [...correctIds].every(id => selectedIds.has(id)) && [...selectedIds].every(id => correctIds.has(id))
                      : null
                    return (
                      <div key={q.id} style={{ background: 'white', border: '1.5px solid',
                        borderColor: isCorrect === true ? '#86efac' : isCorrect === false ? '#fca5a5' : '#e2e8f0',
                        borderRadius: 12, padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          {test?.type === 1 && <span style={{ fontSize: 16 }}>{isCorrect ? '⭕' : '❌'}</span>}
                          <span style={{ fontSize: 12, color: '#64748b' }}>{qi + 1}問目</span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 8, lineHeight: 1.5 }}>{q.title}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {q.test_choices.map(c => {
                            const wasSelected = selectedIds.has(c.id)
                            let bg = 'transparent'; let border = '#e2e8f0'
                            if (test?.type === 1) {
                              if (wasSelected && c.is_correct) { bg = '#dcfce7'; border = '#86efac' }
                              else if (wasSelected && !c.is_correct) { bg = '#fee2e2'; border = '#fca5a5' }
                              else if (!wasSelected && c.is_correct) { bg = '#fef9c3'; border = '#fde047' }
                            } else if (wasSelected) { bg = '#dcfce7'; border = '#86efac' }
                            return (
                              <div key={c.id} style={{ padding: '6px 10px', borderRadius: 8, border: `1.5px solid ${border}`,
                                background: bg, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#334155' }}>
                                <span>{c.text}</span>
                                {test?.type === 0 && wasSelected && <span style={{ color: '#15803d', fontWeight: 600 }}>{c.score}点</span>}
                                {test?.type === 1 && !wasSelected && c.is_correct && <span style={{ color: '#a16207', fontSize: 11 }}>正解</span>}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          }

          // テスト詳細（過去結果一覧）
          if (selectedTestId !== null) {
            const test = tests.find(t => t.id === selectedTestId)
            const qCount = testDetail?.questions.length ?? 0
            return (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <button onClick={() => setSelectedTestId(null)}
                    style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#15803d' }}>‹</button>
                  <h1 className={styles.heading} style={{ margin: 0 }}>{test?.name}</h1>
                </div>
                {testDetailLoading ? <p>読み込み中...</p> : (() => {
                  const detail = testDetail ?? { questions: [], grades: [], results: [] }
                  return (
                    <>
                      {detail.results.length === 0 ? (
                        <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '16px 0 8px' }}>まだ受験していません</p>
                      ) : (
                        <>
                          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>受験履歴</h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                            {[...detail.results].reverse().map(r => (
                              <button key={r.id} onClick={() => setSelectedResult(r)}
                                style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '12px 14px',
                                  textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{r.attempt_number}回目</div>
                                  <div style={{ fontSize: 12, color: '#94a3b8' }}>
                                    {new Date(r.taken_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: 16, fontWeight: 700, color: '#15803d' }}>
                                    {test?.type === 0 ? `${r.score}点` : `${r.score}/${qCount}点`}
                                  </div>
                                  {test?.type === 0 && (
                                    <div style={{ fontSize: 11, color: '#64748b' }}>{getGrade(detail.grades, r.score)}</div>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                      <h3 style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>テスト内容（{qCount}問）</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {detail.questions.map((q, qi) => (
                          <div key={q.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px' }}>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>{qi + 1}問目</div>
                            <div style={{ fontSize: 13, color: '#1e293b' }}>{q.title}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )
                })()}
              </div>
            )
          }

          // テスト一覧（カウンセラービューは全テスト表示）
          return (
            <div>
              <h1 className={styles.heading}>テスト結果</h1>
              <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>カウンセラービュー：全テストの結果を確認できます</p>
              {!testsLoaded ? <p>読み込み中...</p> : tests.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: '48px 0' }}>テストがありません</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {tests.map(t => (
                    <button key={t.id} onClick={() => setSelectedTestId(t.id)}
                      style={{ background: 'white', border: `1.5px solid ${t.attempt_count > 0 ? '#86efac' : '#e2e8f0'}`, borderRadius: 14, padding: '14px 16px',
                        textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#dcfce7',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                        {t.type === 0 ? '📋' : '✏️'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{t.name}</span>
                          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10,
                            background: t.enabled ? '#dcfce7' : '#f1f5f9',
                            color: t.enabled ? '#15803d' : '#94a3b8' }}>
                            {t.enabled ? '表示中' : '非表示'}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: t.attempt_count > 0 ? '#15803d' : '#94a3b8' }}>
                          {t.attempt_count === 0 ? '未受験' : `${t.attempt_count}回受験 · 最新: ${t.latest?.score}点`}
                        </div>
                      </div>
                      <span style={{ color: '#94a3b8', fontSize: 18 }}>›</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })()}

        {/* ===== 行動の記録 ===== */}
        {activeTab === '行動の記録' && (() => {
          const DOW = ['日', '月', '火', '水', '木', '金', '土']
          const todayStr = new Date().toLocaleDateString('sv-SE')

          function calMarker(dateStr: string) {
            const rec = behaviorCalendar[dateStr]
            if (!rec) return ''
            if (rec.abstained === true) {
              let streak = 0; const d = new Date(dateStr)
              while (behaviorCalendar[d.toLocaleDateString('sv-SE')]?.abstained === true) { streak++; d.setDate(d.getDate() - 1) }
              return streak % 7 === 0 ? '🌸' : '⭕'
            }
            return '❌'
          }

          const firstDay = new Date(behaviorYear, behaviorMonth - 1, 1).getDay()
          const lastDate = new Date(behaviorYear, behaviorMonth, 0).getDate()
          const grid: (number | null)[] = [...Array(firstDay).fill(null)]
          for (let d = 1; d <= lastDate; d++) grid.push(d)

          const dayLabel = new Date(behaviorDate + 'T00:00:00')
            .toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })

          return (
            <div>
              <h1 className={styles.heading}>行動の記録</h1>

              {/* 症状タブ */}
              {addictions.length > 1 && (
                <div className={styles.addictionTabs} style={{ marginBottom: 12 }}>
                  {addictions.map((a) => (
                    <button key={a.addiction_id}
                      className={`${styles.addictionTab} ${behaviorAddicId === a.addiction_id ? styles.addictionTabActive : ''}`}
                      onClick={() => setBehaviorAddicId(a.addiction_id)}
                    >{a.addictions.name}</button>
                  ))}
                </div>
              )}

              {/* ストリーク */}
              {behaviorStreak > 0 && (
                <div style={{ background: '#fef9c3', border: '1.5px solid #fbbf24', borderRadius: 12, padding: '10px 16px', marginBottom: 12, fontSize: 14, color: '#92400e', textAlign: 'center' }}>
                  🔥 断酒 <strong style={{ fontSize: 18 }}>{behaviorStreak}日</strong> 継続中
                </div>
              )}

              {/* 月間 / 日別 切り替え */}
              <div style={{ display: 'flex', background: '#dcfce7', borderRadius: 10, padding: 4, gap: 4, marginBottom: 12 }}>
                {(['month', 'day'] as const).map((v) => (
                  <button key={v}
                    onClick={() => setBehaviorView(v)}
                    style={{ flex: 1, padding: 8, border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer',
                      background: behaviorView === v ? '#15803d' : 'none',
                      color: behaviorView === v ? 'white' : '#15803d',
                      fontWeight: behaviorView === v ? 500 : 400 }}
                  >{v === 'month' ? '月間' : '日別'}</button>
                ))}
              </div>

              {/* ===== 月間カレンダー ===== */}
              {behaviorView === 'month' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <button className={styles.sendBtn} style={{ padding: '6px 14px', fontSize: 16 }}
                      onClick={() => { if (behaviorMonth === 1) { setBehaviorYear(y => y-1); setBehaviorMonth(12) } else setBehaviorMonth(m => m-1) }}>‹</button>
                    <span style={{ fontWeight: 500 }}>{behaviorYear}年{behaviorMonth}月</span>
                    <button className={styles.sendBtn} style={{ padding: '6px 14px', fontSize: 16 }}
                      onClick={() => { if (behaviorMonth === 12) { setBehaviorYear(y => y+1); setBehaviorMonth(1) } else setBehaviorMonth(m => m+1) }}>›</button>
                  </div>
                  {behaviorLoading ? <p>読み込み中...</p> : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
                      {DOW.map((d, i) => (
                        <div key={d} style={{ textAlign: 'center', fontSize: 11, color: i===0?'#dc2626':i===6?'#2563eb':'#64748b', padding: '4px 0' }}>{d}</div>
                      ))}
                      {grid.map((day, i) => {
                        if (!day) return <div key={`e${i}`} />
                        const ds = `${behaviorYear}-${String(behaviorMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                        const isToday = ds === todayStr
                        const isFuture = ds > todayStr
                        const m = isFuture ? '' : calMarker(ds)
                        return (
                          <div key={day}
                            onClick={() => { setBehaviorDate(ds); setBehaviorView('day') }}
                            style={{ aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', cursor: 'pointer',
                              background: isToday ? '#15803d' : 'transparent' }}>
                            {m && <span style={{ fontSize: 14, lineHeight: 1 }}>{m}</span>}
                            <span style={{ fontSize: 11, lineHeight: 1, color: isToday?'white':isFuture?'#94a3b8':'#334155' }}>{day}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 12, marginTop: 12, fontSize: 12, color: '#64748b' }}>
                    <span>⭕ 断酒</span><span>🌸 7日達成</span><span>❌ 記録あり</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11 }}>日付をタップ→日別</span>
                  </div>
                </>
              )}

              {/* ===== 日別ビュー ===== */}
              {behaviorView === 'day' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <button className={styles.sendBtn} style={{ padding: '6px 14px', fontSize: 16 }} onClick={() => {
                      const d = new Date(behaviorDate); d.setDate(d.getDate()-1); setBehaviorDate(d.toLocaleDateString('sv-SE'))
                    }}>‹</button>
                    <span style={{ fontWeight: 500 }}>{dayLabel}</span>
                    <button className={styles.sendBtn} style={{ padding: '6px 14px', fontSize: 16 }} onClick={() => {
                      const d = new Date(behaviorDate); d.setDate(d.getDate()+1); setBehaviorDate(d.toLocaleDateString('sv-SE'))
                    }}>›</button>
                  </div>
                  {behaviorLoading ? <p>読み込み中...</p> : (
                    <>
                      {behaviorDayRecord?.abstained && (
                        <div style={{ background: '#dcfce7', border: '1.5px solid #86efac', borderRadius: 12, padding: '12px 16px', marginBottom: 12, color: '#15803d', fontWeight: 500, textAlign: 'center' }}>
                          ⭕ この日は断酒できました
                        </div>
                      )}
                      {behaviorDayEntries.length === 0 && !behaviorDayRecord && (
                        <p style={{ textAlign: 'center', color: '#94a3b8', padding: '32px 0', fontSize: 14 }}>記録がありません</p>
                      )}
                      {behaviorDayEntries.map((e) => (
                        <div key={e.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, marginBottom: 10 }}>
                          <div style={{ fontSize: 15, fontWeight: 600, color: '#15803d', marginBottom: 8 }}>
                            {e.start_time.slice(0,5)}〜{e.end_time ? e.end_time.slice(0,5) : '？'}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                            {[e.location, e.companions, e.mood].filter(Boolean).map((v, i) => (
                              <span key={i} style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 20, padding: '3px 10px', fontSize: 12, color: '#15803d' }}>{v}</span>
                            ))}
                          </div>
                          {e.drinks?.length > 0 && (
                            <div style={{ fontSize: 13, color: '#334155' }}>
                              {e.drinks.map((d, i) => <span key={i}>{d.type}{d.amount ? `（${d.amount}）` : ''}{i < e.drinks.length-1 ? '・' : ''}</span>)}
                            </div>
                          )}
                          {e.notes && <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{e.notes}</p>}
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          )
        })()}

        {/* ===== マイページ ===== */}
        {activeTab === 'マイページ' && (
          <div>
            <h1 className={styles.heading}>マイページ</h1>
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>基本情報</h2>
              <div className={styles.grid}>
                {[
                  ['氏名', fullName],
                  ['フリガナ', patient?.furigana],
                  ['ニックネーム', patient?.nickname],
                  ['年齢', patient?.age],
                  ['性別', sexLabel(patient?.sex ?? 0)],
                  ['住所', patient?.address],
                  ['職業', patient?.profession],
                  ['職歴', patient?.work_history],
                  ['趣味', patient?.interests],
                  ['生活リズム', patient?.daily_rhythm],
                  ['人間関係', patient?.personal_relations],
                  ['目標', patient?.goals],
                  ['補足', patient?.supplement],
                  ['子供の頃の過酷な経験', patient?.harsh_childhood],
                  ['犯罪歴・補導歴', patient?.criminal_record],
                  ['その他のトラウマ', patient?.other_traumas],
                ].map(([label, val]) => (
                  <div key={label} className={styles.field}>
                    <label className={styles.label}>{label}</label>
                    <p className={styles.value}>{val || '—'}</p>
                  </div>
                ))}
              </div>
            </div>

            {symptoms.length > 0 && (
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>症状カテゴリー別情報</h2>
                {symptoms.map((s) => {
                  const name = addictions.find((a) => a.addiction_id === s.addiction_id)?.addictions?.name ?? ''
                  return (
                    <div key={s.addiction_id} className={styles.symptomBlock}>
                      <h3 className={styles.symptomTitle}>{name}に関する悩み</h3>
                      <div className={styles.grid}>
                        {[
                          ['重症度', s.severity], ['症状の開始日', s.start_date],
                          ['頻度', s.frequency], ['生活上困っていること', s.difficulties],
                          ['症状によるトラブル', s.trouble], ['行動の方法', s.methods],
                          ['症状に関する目標', s.goal], ['補足', s.supplement],
                        ].map(([label, val]) => (
                          <div key={label} className={styles.field}>
                            <label className={styles.label}>{label}</label>
                            <p className={styles.value}>{val || '—'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== カウンセラー記録（counselor-only tab） ===== */}
        {activeTab === 'カウンセラー記録' && (
          <div>
            <h1 className={styles.heading}>{fullName} のプロフィール</h1>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>基本情報</h2>
              <div className={styles.grid}>
                {[
                  ['年齢', patient?.age], ['性別', sexLabel(patient?.sex ?? 0)],
                  ['フリガナ', patient?.furigana], ['ニックネーム', patient?.nickname],
                  ['住所', patient?.address], ['職業', patient?.profession],
                  ['職歴', patient?.work_history], ['趣味', patient?.interests],
                  ['生活リズム', patient?.daily_rhythm], ['人間関係', patient?.personal_relations],
                  ['目標', patient?.goals], ['補足', patient?.supplement],
                  ['子供の頃の過酷な経験', patient?.harsh_childhood],
                  ['犯罪歴・補導歴', patient?.criminal_record],
                  ['その他のトラウマ', patient?.other_traumas],
                ].map(([label, val]) => (
                  <div key={label} className={styles.field}>
                    <label className={styles.label}>{label}</label>
                    <p className={styles.value}>{val || '—'}</p>
                  </div>
                ))}
              </div>
            </div>

            {symptoms.length > 0 && (
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>症状カテゴリー別情報</h2>
                {symptoms.map((s) => {
                  const name = addictions.find((a) => a.addiction_id === s.addiction_id)?.addictions?.name ?? ''
                  return (
                    <div key={s.addiction_id} className={styles.symptomBlock}>
                      <h3 className={styles.symptomTitle}>{name}に関する悩み</h3>
                      <div className={styles.grid}>
                        {[
                          ['重症度', s.severity], ['症状の開始日', s.start_date],
                          ['頻度', s.frequency], ['生活上困っていること', s.difficulties],
                          ['症状によるトラブル', s.trouble], ['行動の方法', s.methods],
                          ['症状に関する目標', s.goal], ['補足', s.supplement],
                        ].map(([label, val]) => (
                          <div key={label} className={styles.field}>
                            <label className={styles.label}>{label}</label>
                            <p className={styles.value}>{val || '—'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>カウンセラーメモ</h2>
                {!editing && <button className={styles.editBtn} onClick={() => setEditing(true)}>編集</button>}
              </div>
              <div className={styles.noteGrid}>
                {[
                  { label: '補足事項', key: 'counselor_supplement' },
                  { label: '所見', key: 'counselor_findings' },
                  { label: 'カウンセリングの経緯', key: 'counselor_history' },
                ].map(({ label, key }) => (
                  <div key={key} className={styles.field}>
                    <label className={styles.label}>{label}</label>
                    {editing ? (
                      <textarea
                        className={styles.textarea}
                        rows={4}
                        value={notes[key as keyof typeof notes]}
                        onChange={(e) => setNotes((n) => ({ ...n, [key]: e.target.value }))}
                      />
                    ) : (
                      <p className={styles.value}>{notes[key as keyof typeof notes] || '—'}</p>
                    )}
                  </div>
                ))}
              </div>
              {editing && (
                <div className={styles.actions}>
                  <button className={styles.saveBtn} onClick={saveNotes} disabled={saving}>{saving ? '保存中...' : '保存'}</button>
                  <button className={styles.cancelBtn} onClick={() => setEditing(false)}>キャンセル</button>
                </div>
              )}
            </div>

            {/* テスト割り当て */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>テスト割り当て</h2>
              {!testsLoaded ? <p>読み込み中...</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {tests.map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'white',
                      border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 16px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 2 }}>{t.name}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>
                          {t.attempt_count === 0 ? '未受験' : `${t.attempt_count}回受験 · 最新: ${t.latest?.score}点`}
                        </div>
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flexShrink: 0 }}>
                        <span style={{ fontSize: 13, color: t.enabled ? '#15803d' : '#94a3b8', fontWeight: 500 }}>
                          {t.enabled ? '表示中' : '非表示'}
                        </span>
                        <div onClick={() => toggleTest(t.id, !t.enabled)}
                          style={{ width: 44, height: 24, borderRadius: 12, background: t.enabled ? '#15803d' : '#cbd5e1',
                            position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
                          <div style={{ position: 'absolute', top: 2, left: t.enabled ? 22 : 2, width: 20, height: 20,
                            borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
