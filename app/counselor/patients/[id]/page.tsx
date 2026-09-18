'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiFetch, getUser } from '@/lib/auth-client'
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
type Addiction = { addiction_id: number; addictions: { name: string } }
type Todo = { id: string; title?: string; content?: string; completed: boolean; created_at: string }
type Message = { id: string; poster_id: string; content: string; sequence_num: number; created_at: string; profiles?: { full_name: string } }
type Group = { id: string; name: string; organizations?: { name: string } }

const TABS = ['プロフィール', 'ToDo', 'チャット', 'グループ', 'マイページ'] as const
type Tab = typeof TABS[number]

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const me = getUser()
  const [activeTab, setActiveTab] = useState<Tab>('プロフィール')

  // Profile data
  const [fullName, setFullName] = useState('')
  const [furigana, setFurigana] = useState('')
  const [patient, setPatient] = useState<Patient | null>(null)
  const [symptoms, setSymptoms] = useState<Symptom[]>([])
  const [addictions, setAddictions] = useState<Addiction[]>([])
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState({ counselor_supplement: '', counselor_findings: '', counselor_history: '' })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Todo data
  const [todos, setTodos] = useState<Todo[]>([])
  const [todosLoaded, setTodosLoaded] = useState(false)

  // Chat data
  const [selectedAddic, setSelectedAddic] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Groups data
  const [groups, setGroups] = useState<Group[]>([])
  const [groupsLoaded, setGroupsLoaded] = useState(false)

  useEffect(() => {
    apiFetch(`/counselor/patient?id=${id}`)
      .then((r) => r.json())
      .then((d) => {
        setFullName(d.profile?.full_name ?? '')
        setFurigana(d.patient?.furigana ?? '')
        setPatient(d.patient)
        setSymptoms(d.symptoms)
        setAddictions(d.addictions)
        setNotes({
          counselor_supplement: d.patient?.counselor_supplement ?? '',
          counselor_findings: d.patient?.counselor_findings ?? '',
          counselor_history: d.patient?.counselor_history ?? '',
        })
        if ((d.addictions ?? []).length > 0) {
          setSelectedAddic(d.addictions[0].addiction_id)
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  // Load todos when tab selected
  useEffect(() => {
    if (activeTab !== 'ToDo' || todosLoaded) return
    apiFetch(`/patient/todo?patient_id=${id}`)
      .then((r) => r.json())
      .then((d) => setTodos(d.todos ?? []))
      .finally(() => setTodosLoaded(true))
  }, [activeTab, id, todosLoaded])

  // Load chat messages when addiction selected
  useEffect(() => {
    if (activeTab !== 'チャット' || !selectedAddic) return
    setChatLoading(true)
    apiFetch(`/patient/bbs?patient_id=${id}&addic=${selectedAddic}`)
      .then((r) => r.json())
      .then((d) => setMessages(d.messages ?? []))
      .finally(() => setChatLoading(false))
  }, [activeTab, id, selectedAddic])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Load groups when tab selected
  useEffect(() => {
    if (activeTab !== 'グループ' || groupsLoaded) return
    apiFetch(`/patient/groups?patient_id=${id}`)
      .then((r) => r.json())
      .then((d) => setGroups(d.groups ?? []))
      .finally(() => setGroupsLoaded(true))
  }, [activeTab, id, groupsLoaded])

  const handleSave = async () => {
    setSaving(true)
    await apiFetch('/counselor/patient', {
      method: 'PATCH',
      body: JSON.stringify({ patient_id: id, ...notes }),
    })
    setEditing(false)
    setSaving(false)
  }

  const sendMessage = async () => {
    if (!chatInput.trim() || !selectedAddic) return
    setSending(true)
    await apiFetch('/patient/bbs', {
      method: 'POST',
      body: JSON.stringify({ content: chatInput, addic: selectedAddic, patient_id: id }),
    })
    setChatInput('')
    const r = await apiFetch(`/patient/bbs?patient_id=${id}&addic=${selectedAddic}`)
    const d = await r.json()
    setMessages(d.messages ?? [])
    setSending(false)
  }

  const sexLabel = (s: number) => s === 1 ? '男性' : s === 2 ? '女性' : s === 3 ? 'その他' : '—'

  if (loading) return <p>読み込み中...</p>

  const backPath = me?.role === 'admin' ? '/operator/clients' : '/counselor/patients'
  const backLabel = me?.role === 'admin' ? '← クライアント一覧' : '← 患者一覧'

  return (
    <div>
      <button className={styles.back} onClick={() => router.push(backPath)}>{backLabel}</button>
      <div className={styles.header}>
        <h1 className={styles.heading}>{fullName}</h1>
        {furigana && <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>{furigana}</div>}
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t}
            className={`${styles.tab} ${activeTab === t ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(t)}
          >{t}</button>
        ))}
      </div>

      {/* ========== プロフィール ========== */}
      {activeTab === 'プロフィール' && (
        <>
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
        </>
      )}

      {/* ========== ToDo ========== */}
      {activeTab === 'ToDo' && (
        <div className={styles.section}>
          <div className={styles.previewBanner}>クライアントのToDoを閲覧中（読み取り専用）</div>
          <h2 className={styles.sectionTitle}>ToDo</h2>
          {!todosLoaded ? <p>読み込み中...</p> : (
            <ul className={styles.todoList}>
              {todos.length === 0 && <p className={styles.todoEmpty}>ToDoはありません</p>}
              {todos.map((t) => (
                <li key={t.id} className={styles.todoItem}>
                  <span className={t.completed ? styles.todoCheckDone : styles.todoCheck} />
                  <span className={t.completed ? styles.todoTextDone : styles.todoText}>
                    {t.title ?? t.content ?? ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ========== チャット ========== */}
      {activeTab === 'チャット' && (
        <div className={styles.section}>
          <div className={styles.previewBanner}>カウンセラーとクライアントのチャット（カウンセラーとして返信できます）</div>
          <h2 className={styles.sectionTitle}>チャット</h2>
          {addictions.length === 0 ? (
            <p className={styles.chatNoAddiction}>症状カテゴリーが設定されていません</p>
          ) : (
            <>
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
                <div className={styles.chatMessages}>
                  {messages.length === 0 && <p style={{ color: '#94a3b8', fontSize: 14 }}>メッセージはありません</p>}
                  {messages.map((m) => {
                    const isPatient = m.poster_id === id
                    return (
                      <div key={m.id} className={isPatient ? styles.chatRowMe : styles.chatRowOther}>
                        {!isPatient && <div className={styles.chatSenderName}>{m.profiles?.full_name ?? 'カウンセラー'}</div>}
                        <div className={isPatient ? styles.chatBubbleMe : styles.chatBubbleOther}>{m.content}</div>
                      </div>
                    )
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
              <div className={styles.chatSendRow}>
                <input
                  className={styles.chatInput}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="クライアントへメッセージを送信..."
                />
                <button className={styles.chatSendBtn} onClick={sendMessage} disabled={sending}>送信</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========== グループ ========== */}
      {activeTab === 'グループ' && (
        <div className={styles.section}>
          <div className={styles.previewBanner}>クライアントが所属するグループ（読み取り専用）</div>
          <h2 className={styles.sectionTitle}>グループ</h2>
          {!groupsLoaded ? <p>読み込み中...</p> : groups.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: 14 }}>グループに所属していません</p>
          ) : (
            groups.map((g) => (
              <div key={g.id} className={styles.groupCard}>
                <div className={styles.groupName}>{g.name}</div>
                {g.organizations && <div className={styles.groupOrg}>{(g.organizations as { name?: string }).name}</div>}
              </div>
            ))
          )}
        </div>
      )}

      {/* ========== マイページ ========== */}
      {activeTab === 'マイページ' && (
        <div className={styles.section}>
          <div className={styles.previewBanner}>クライアントのマイページと同じ情報（読み取り専用）</div>
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

          {symptoms.length > 0 && (
            <>
              <h2 className={styles.sectionTitle} style={{ marginTop: 24 }}>症状カテゴリー別情報</h2>
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
            </>
          )}
        </div>
      )}
    </div>
  )
}
