'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/auth-client'
import styles from './todo.module.css'

type Todo = { id: string; title: string; completed: boolean }

export default function PatientTodoPage() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [stage, setStage] = useState<string | null>(null)
  const [startedAt, setStartedAt] = useState<string | null | undefined>(undefined)
  const [notice, setNotice] = useState<{ content: string; updated_at: string } | null>(null)

  useEffect(() => {
    apiFetch('/patient/todo')
      .then((r) => r.json())
      .then((d) => setTodos(d.todos ?? []))
      .finally(() => setLoading(false))
    apiFetch('/patient/fun-events/abstract')
      .then((r) => r.json())
      .then((d) => { setStartedAt(d.started_at ?? null); setStage(d.stage ?? null) })
    apiFetch('/patient/notice')
      .then((r) => r.json())
      .then((d) => { if (d.content) setNotice({ content: d.content, updated_at: d.updated_at }) })
  }, [])

  if (loading) return <p>読み込み中...</p>

  return (
    <div>
      <h1 className={styles.heading}>ホーム</h1>

      {/* カウンセリングステージ */}
      {startedAt !== undefined && (
        !startedAt ? (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 14, color: '#64748b' }}>
            まだカウンセリングは始まっておりません。
          </div>
        ) : (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>現在のステージ</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#15803d' }}>{stage}ステージ</span>
          </div>
        )
      )}

      {/* カウンセラーからの掲示 */}
      {notice && (
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
          <p style={{ fontSize: 12, color: '#92400e', margin: '0 0 6px', fontWeight: 600 }}>📌 カウンセラーからのお知らせ</p>
          <p style={{ fontSize: 14, color: '#1e293b', margin: 0, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{notice.content}</p>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '6px 0 0', textAlign: 'right' }}>
            {new Date(notice.updated_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      )}

      {/* ToDo（カウンセラー設定） */}
      {todos.length > 0 && (
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#334155', marginBottom: 10 }}>今日やること</h2>
          <ul className={styles.list}>
            {todos.map((t) => (
              <li key={t.id} className={styles.item}>
                <span className={t.completed ? styles.checkDone : styles.check} />
                <span className={t.completed ? styles.textDone : styles.text}>{t.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
