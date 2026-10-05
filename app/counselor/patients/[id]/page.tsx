'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/auth-client'
import styles from './detail.module.css'

type Patient = {
  age: string; sex: number; furigana: string; nickname: string; address: string; daily_rhythm: string; interests: string
  profession: string; work_history: string; personal_relations: string; harsh_childhood: string
  criminal_record: string; other_traumas: string; supplement: string; goals: string
  counselor_supplement: string; counselor_findings: string; counselor_history: string
}
type Symptom = {
  addiction_id: number; addictions?: { name: string }; severity: string; start_date: string
  frequency: string; difficulties: string; trouble: string; methods: string; goal: string; supplement: string
}
type Addiction = { addiction_id: number; behavior_type: string; addictions: { name: string } }
type AllAddiction = { id: number; name: string }
type TestItem = { id: number; name: string; type: number; enabled: boolean; attempt_count: number; latest: { score: number; taken_at: string } | null }

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [patient, setPatient] = useState<Patient | null>(null)
  const [symptoms, setSymptoms] = useState<Symptom[]>([])
  const [addictions, setAddictions] = useState<Addiction[]>([])
  const [allAddictions, setAllAddictions] = useState<AllAddiction[]>([])
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState({ counselor_supplement: '', counselor_findings: '', counselor_history: '' })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tests, setTests] = useState<TestItem[]>([])
  const [testsLoading, setTestsLoading] = useState(true)
  type FunEntry = { id: string; entry_num: number; content: string; created_at: string }
  const [funEntries, setFunEntries] = useState<FunEntry[]>([])
  const [funLoading, setFunLoading] = useState(true)
  const [programStartedAt, setProgramStartedAt] = useState<string | null | undefined>(undefined)
  const [programStage, setProgramStage] = useState<string | null>(null)
  const [programStarting, setProgramStarting] = useState(false)
  const [stageChanging, setStageChanging] = useState(false)
  const [todos, setTodos] = useState<{ id: string; title: string; completed: boolean }[]>([])
  const [todoInput, setTodoInput] = useState('')
  const [todoSaving, setTodoSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [noticeSaving, setNoticeSaving] = useState(false)
  const [noticeEditing, setNoticeEditing] = useState(false)
  const [noticeInput, setNoticeInput] = useState('')

  // 依存症管理
  const [showAddAddicForm, setShowAddAddicForm] = useState(false)
  const [newAddicId, setNewAddicId] = useState('')

  const loadDetail = () => {
    apiFetch(`/counselor/patient?id=${id}`)
      .then((r) => r.json())
      .then((d) => {
        setFullName(d.profile?.full_name ?? '')
        setPatient(d.patient)
        setSymptoms(d.symptoms)
        setAddictions(d.addictions)
        setNotes({
          counselor_supplement: d.patient?.counselor_supplement ?? '',
          counselor_findings: d.patient?.counselor_findings ?? '',
          counselor_history: d.patient?.counselor_history ?? '',
        })
      })
      .finally(() => setLoading(false))
  }

  const loadTests = () => {
    setTestsLoading(true)
    apiFetch(`/counselor/patient/tests?patient_id=${id}`)
      .then(r => r.json()).then(d => setTests(d.tests ?? []))
      .finally(() => setTestsLoading(false))
  }

  const toggleTest = async (testId: number, enabled: boolean) => {
    await apiFetch('/counselor/patient/tests', {
      method: 'PUT',
      body: JSON.stringify({ patient_id: id, test_id: testId, enabled }),
    })
    loadTests()
  }

  useEffect(() => {
    loadDetail()
    loadTests()
    apiFetch('/addictions').then(r => r.json()).then(d => setAllAddictions(d.addictions ?? []))
    apiFetch(`/patient/fun-events/abstract?patient_id=${id}`)
      .then(r => r.json()).then(d => {
        setFunEntries(d.entries ?? [])
        setProgramStartedAt(d.started_at ?? null)
        setProgramStage(d.stage ?? null)
      })
      .finally(() => setFunLoading(false))
    apiFetch(`/patient/notice?patient_id=${id}`)
      .then(r => r.json()).then(d => { if (d.content) setNotice(d.content) })
    apiFetch(`/patient/todo?patient_id=${id}`)
      .then(r => r.json()).then(d => setTodos(d.todos ?? []))
  }, [id])

  const handleAddTodo = async () => {
    if (!todoInput.trim()) return
    setTodoSaving(true)
    const r = await apiFetch('/counselor/patient/todo', {
      method: 'POST',
      body: JSON.stringify({ patient_id: id, title: todoInput.trim() }),
    })
    const d = await r.json()
    if (d.todo) setTodos((prev) => [...prev, d.todo])
    setTodoInput('')
    setTodoSaving(false)
  }

  const handleDeleteTodo = async (todoId: string) => {
    await apiFetch('/counselor/patient/todo', { method: 'DELETE', body: JSON.stringify({ id: todoId }) })
    setTodos((prev) => prev.filter((t) => t.id !== todoId))
  }

  const handleSaveNotice = async () => {
    setNoticeSaving(true)
    await apiFetch('/counselor/patient/notice', {
      method: 'PUT',
      body: JSON.stringify({ patient_id: id, content: noticeInput }),
    })
    setNotice(noticeInput)
    setNoticeEditing(false)
    setNoticeSaving(false)
  }

  const STAGES = ['制御', '疑似', '想像', '維持']

  const handleStartProgram = async () => {
    if (!confirm('カウンセリングプログラムを開始しますか？')) return
    setProgramStarting(true)
    await apiFetch('/counselor/start-program', { method: 'POST', body: JSON.stringify({ patient_id: id }) })
    setProgramStartedAt(new Date().toISOString())
    setProgramStage('制御')
    setProgramStarting(false)
  }

  const handleChangeStage = async (stage: string) => {
    if (!confirm(`ステージを「${stage}」に変更しますか？`)) return
    setStageChanging(true)
    await apiFetch('/counselor/start-program', { method: 'PATCH', body: JSON.stringify({ patient_id: id, stage }) })
    setProgramStage(stage)
    setStageChanging(false)
  }

  const handleSave = async () => {
    setSaving(true)
    await apiFetch('/counselor/patient', {
      method: 'PATCH',
      body: JSON.stringify({ patient_id: id, ...notes }),
    })
    setEditing(false)
    setSaving(false)
  }

  const handleAddAddiction = async () => {
    if (!newAddicId) return
    await apiFetch('/counselor/patient', {
      method: 'POST',
      body: JSON.stringify({ action: 'add_addiction', patient_id: id, addiction_id: Number(newAddicId) }),
    })
    setShowAddAddicForm(false)
    setNewAddicId('')
    loadDetail()
  }

  const handleRemoveAddiction = async (addictionId: number) => {
    if (!confirm('この症状カテゴリーを削除しますか？')) return
    await apiFetch('/counselor/patient', {
      method: 'POST',
      body: JSON.stringify({ action: 'remove_addiction', patient_id: id, addiction_id: addictionId }),
    })
    loadDetail()
  }

  const sexLabel = (s: number) => s === 1 ? '男性' : s === 2 ? '女性' : s === 3 ? 'その他' : '—'

  if (loading) return <p>読み込み中...</p>

  return (
    <div>
      <button className={styles.back} onClick={() => router.push('/counselor/patients')}>← 患者一覧</button>
      <div className={styles.header}>
        <h1 className={styles.heading}>{fullName}</h1>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>基本情報（クライアント入力）</h2>
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

      {/* 症状カテゴリー管理 */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>症状カテゴリー</h2>
          <button className={styles.editBtn} onClick={() => setShowAddAddicForm(true)}>+ 追加</button>
        </div>

        {showAddAddicForm && (
          <div style={{ background: '#f8fafc', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>症状カテゴリー</label>
                <select value={newAddicId} onChange={(e) => setNewAddicId(e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}>
                  <option value="">選択してください</option>
                  {allAddictions.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <button onClick={handleAddAddiction} style={{ padding: '9px 18px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer' }}>追加</button>
              <button onClick={() => setShowAddAddicForm(false)} style={{ padding: '9px 14px', background: '#e2e8f0', color: '#374151', border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer' }}>キャンセル</button>
            </div>
          </div>
        )}

        {addictions.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: 14 }}>症状カテゴリーが登録されていません</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {addictions.map((a) => (
              <div key={a.addiction_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', flex: 1 }}>{a.addictions?.name}</span>
                <button onClick={() => handleRemoveAddiction(a.addiction_id)}
                  style={{ padding: '5px 10px', background: 'none', border: 'none', fontSize: 12, color: '#ef4444', cursor: 'pointer' }}>削除</button>
              </div>
            ))}
          </div>
        )}
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

      {/* ToDo管理 */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>今日やること（ToDo）</h2>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            value={todoInput}
            onChange={(e) => setTodoInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
            placeholder="ToDoを追加..."
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}
          />
          <button
            onClick={handleAddTodo}
            disabled={todoSaving || !todoInput.trim()}
            style={{ background: '#1e293b', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 14, cursor: 'pointer', opacity: todoInput.trim() ? 1 : 0.5 }}
          >追加</button>
        </div>
        {todos.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: 14 }}>ToDoはありません</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {todos.map((t) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', borderRadius: 8, padding: '8px 12px' }}>
                <span style={{ flex: 1, fontSize: 14, color: '#1e293b' }}>{t.title}</span>
                <button
                  onClick={() => handleDeleteTodo(t.id)}
                  style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 13, cursor: 'pointer' }}
                >削除</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 掲示メッセージ */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>トップページへの掲示</h2>
          {!noticeEditing && (
            <button className={styles.editBtn} onClick={() => { setNoticeInput(notice); setNoticeEditing(true) }}>
              {notice ? '編集' : '作成'}
            </button>
          )}
        </div>
        {noticeEditing ? (
          <>
            <textarea
              className={styles.textarea}
              rows={4}
              value={noticeInput}
              onChange={(e) => setNoticeInput(e.target.value)}
              placeholder="クライアントのトップページに表示するメッセージを入力..."
            />
            <div className={styles.actions}>
              <button className={styles.saveBtn} onClick={handleSaveNotice} disabled={noticeSaving}>
                {noticeSaving ? '保存中...' : '保存'}
              </button>
              <button className={styles.cancelBtn} onClick={() => setNoticeEditing(false)}>キャンセル</button>
            </div>
          </>
        ) : notice ? (
          <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: '12px 16px', fontSize: 14, color: '#1e293b', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
            {notice}
          </div>
        ) : (
          <p style={{ color: '#94a3b8', fontSize: 14 }}>掲示メッセージはありません</p>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>カウンセラー記録</h2>
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
            <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>{saving ? '保存中...' : '保存'}</button>
            <button className={styles.cancelBtn} onClick={() => setEditing(false)}>キャンセル</button>
          </div>
        )}
      </div>

      {/* カウンセリングプログラム */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>カウンセリングプログラム</h2>
        {programStartedAt === undefined ? (
          <p style={{ color: '#94a3b8', fontSize: 14 }}>読み込み中...</p>
        ) : !programStartedAt ? (
          <div>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 12 }}>
              スタートすると進捗カウントが始まります。
            </p>
            <button
              onClick={handleStartProgram}
              disabled={programStarting}
              style={{ background: '#15803d', color: 'white', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: programStarting ? 0.6 : 1 }}
            >
              {programStarting ? '開始中...' : 'カウンセリングスタート'}
            </button>
          </div>
        ) : (
          <div>
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 14, color: '#15803d' }}>
              ✅ 開始日：{new Date(programStartedAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            {/* ステージ表示 */}
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 8px' }}>現在のステージ</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {STAGES.map((s) => (
                  <div key={s} style={{
                    padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                    background: programStage === s ? '#15803d' : '#f1f5f9',
                    color: programStage === s ? 'white' : '#94a3b8',
                  }}>{s}ステージ</div>
                ))}
              </div>
            </div>
            {/* ステージ変更ボタン */}
            {(() => {
              const currentIdx = STAGES.indexOf(programStage ?? '')
              const nextStage = currentIdx < STAGES.length - 1 ? STAGES[currentIdx + 1] : null
              return nextStage ? (
                <button
                  onClick={() => handleChangeStage(nextStage)}
                  disabled={stageChanging}
                  style={{ background: '#1e40af', color: 'white', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: stageChanging ? 0.6 : 1 }}
                >
                  {stageChanging ? '変更中...' : `${nextStage}ステージへ移行`}
                </button>
              ) : (
                <p style={{ fontSize: 13, color: '#15803d', fontWeight: 600 }}>🎉 全ステージ完了</p>
              )
            })()}
          </div>
        )}
      </div>

      {/* 良かったことの書き出し */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>良かったことの書き出し</h2>
        {funLoading ? (
          <p style={{ color: '#94a3b8', fontSize: 14 }}>読み込み中...</p>
        ) : funEntries.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: 14 }}>まだ記録がありません</p>
        ) : (
          <>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>{funEntries.length} / 50話</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {funEntries.map((e) => (
                <div key={e.id} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d', marginBottom: 4 }}>No.{e.entry_num} · {new Date(e.created_at).toLocaleDateString('ja-JP')}</div>
                  <p style={{ fontSize: 14, color: '#1e293b', margin: 0, lineHeight: 1.7 }}>{e.content}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>テスト割り当て</h2>
        {testsLoading ? <p>読み込み中...</p> : (
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
                  <div
                    onClick={() => toggleTest(t.id, !t.enabled)}
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
  )
}
