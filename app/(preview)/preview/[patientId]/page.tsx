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

type Tab = 'ToDo' | '行動の記録' | 'チャット' | 'グループ' | 'マイページ' | 'カウンセラー記録'
const PATIENT_TABS: Tab[] = ['ToDo', '行動の記録', 'チャット', 'グループ', 'マイページ']

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

  // 行動の記録
  const [behaviorAddicId, setBehaviorAddicId] = useState<number | null>(null)
  const [behaviorYear, setBehaviorYear] = useState(new Date().getFullYear())
  const [behaviorMonth, setBehaviorMonth] = useState(new Date().getMonth() + 1)
  const [behaviorCalendar, setBehaviorCalendar] = useState<Record<string, { abstained: boolean | null; has_entries: boolean }>>({})
  const [behaviorStreak, setBehaviorStreak] = useState(0)
  const [behaviorLoading, setBehaviorLoading] = useState(false)

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

  // Load behavior calendar
  useEffect(() => {
    if (activeTab !== '行動の記録' || !behaviorAddicId) return
    setBehaviorLoading(true)
    apiFetch(`/patient/behavior/calendar?addiction_id=${behaviorAddicId}&year=${behaviorYear}&month=${behaviorMonth}&patient_id=${patientId}`)
      .then((r) => r.json())
      .then((d) => { setBehaviorCalendar(d.calendar ?? {}); setBehaviorStreak(d.current_streak ?? 0) })
      .finally(() => setBehaviorLoading(false))
  }, [activeTab, patientId, behaviorAddicId, behaviorYear, behaviorMonth])

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

        {/* ===== 行動の記録 ===== */}
        {activeTab === '行動の記録' && (() => {
          const DOW = ['日', '月', '火', '水', '木', '金', '土']
          const firstDay = new Date(behaviorYear, behaviorMonth - 1, 1).getDay()
          const lastDate = new Date(behaviorYear, behaviorMonth, 0).getDate()
          const grid: (number | null)[] = [...Array(firstDay).fill(null)]
          for (let d = 1; d <= lastDate; d++) grid.push(d)
          const todayStr = new Date().toLocaleDateString('sv-SE')
          function marker(dateStr: string) {
            const rec = behaviorCalendar[dateStr]
            if (!rec) return ''
            if (rec.abstained === true) {
              let streak = 0
              const d = new Date(dateStr)
              while (behaviorCalendar[d.toLocaleDateString('sv-SE')]?.abstained === true) { streak++; d.setDate(d.getDate() - 1) }
              return streak % 7 === 0 ? '🌸' : '⭕'
            }
            return '❌'
          }
          function prevMonth() {
            if (behaviorMonth === 1) { setBehaviorYear(y => y - 1); setBehaviorMonth(12) } else setBehaviorMonth(m => m - 1)
          }
          function nextMonth() {
            if (behaviorMonth === 12) { setBehaviorYear(y => y + 1); setBehaviorMonth(1) } else setBehaviorMonth(m => m + 1)
          }
          return (
            <div>
              <h1 className={styles.heading}>行動の記録</h1>
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
              {behaviorStreak > 0 && (
                <div style={{ background: '#fef9c3', border: '1.5px solid #fbbf24', borderRadius: 12, padding: '10px 16px', marginBottom: 12, fontSize: 14, color: '#92400e', textAlign: 'center' }}>
                  🔥 断酒 <strong style={{ fontSize: 18 }}>{behaviorStreak}日</strong> 継続中
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <button className={styles.sendBtn} style={{ padding: '6px 14px', fontSize: 16 }} onClick={prevMonth}>‹</button>
                <span style={{ fontWeight: 500 }}>{behaviorYear}年{behaviorMonth}月</span>
                <button className={styles.sendBtn} style={{ padding: '6px 14px', fontSize: 16 }} onClick={nextMonth}>›</button>
              </div>
              {behaviorLoading ? <p>読み込み中...</p> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
                  {DOW.map((d, i) => (
                    <div key={d} style={{ textAlign: 'center', fontSize: 11, color: i === 0 ? '#dc2626' : i === 6 ? '#2563eb' : '#64748b', padding: '4px 0' }}>{d}</div>
                  ))}
                  {grid.map((day, i) => {
                    if (!day) return <div key={`e${i}`} />
                    const dateStr = `${behaviorYear}-${String(behaviorMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                    const isToday = dateStr === todayStr
                    const isFuture = dateStr > todayStr
                    const m = isFuture ? '' : marker(dateStr)
                    return (
                      <div key={day} style={{ aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: isToday ? '#15803d' : 'transparent' }}>
                        {m && <span style={{ fontSize: 14, lineHeight: 1 }}>{m}</span>}
                        <span style={{ fontSize: 11, lineHeight: 1, color: isToday ? 'white' : isFuture ? '#94a3b8' : '#334155' }}>{day}</span>
                      </div>
                    )
                  })}
                </div>
              )}
              <div style={{ display: 'flex', gap: 12, marginTop: 12, fontSize: 12, color: '#64748b' }}>
                <span>⭕ 断酒</span><span>🌸 7日達成</span><span>❌ 記録あり</span>
              </div>
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
          </div>
        )}

      </div>
    </div>
  )
}
