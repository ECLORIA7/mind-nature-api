'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/auth-client'
import styles from './todo.module.css'

type Todo = { id: string; content: string; completed: boolean; created_at: string }

export default function PatientTodoPage() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [stage, setStage] = useState<string | null>(null)
  const [startedAt, setStartedAt] = useState<string | null | undefined>(undefined)
  const [notice, setNotice] = useState<{ content: string; updated_at: string } | null>(null)

  const fetchTodos = () =>
    apiFetch('/patient/todo')
      .then((r) => r.json())
      .then((d) => setTodos(d.todos ?? []))
      .finally(() => setLoading(false))

  useEffect(() => {
    fetchTodos()
    apiFetch('/patient/fun-events/abstract')
      .then((r) => r.json())
      .then((d) => { setStartedAt(d.started_at ?? null); setStage(d.stage ?? null) })
    apiFetch('/patient/notice')
      .then((r) => r.json())
      .then((d) => { if (d.content) setNotice({ content: d.content, updated_at: d.updated_at }) })
  }, [])

  const addTodo = async () => {
    if (!input.trim()) return
    setSaving(true)
    await apiFetch('/patient/todo', { method: 'POST', body: JSON.stringify({ content: input }) })
    setInput('')
    await fetchTodos()
    setSaving(false)
  }

  const toggleTodo = async (id: string, completed: boolean) => {
    await apiFetch('/patient/todo', { method: 'PATCH', body: JSON.stringify({ id, completed: !completed }) })
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, completed: !completed } : t))
  }

  if (loading) return <p>読み込み中...</p>

  return (
    <div>
      <h1 className={styles.heading}>ToDo</h1>

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
      <div className={styles.inputRow}>
        <input
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTodo()}
          placeholder="新しいToDoを入力..."
        />
        <button className={styles.addBtn} onClick={addTodo} disabled={saving}>追加</button>
      </div>
      <ul className={styles.list}>
        {todos.length === 0 && <p className={styles.empty}>ToDoはありません</p>}
        {todos.map((t) => (
          <li key={t.id} className={styles.item} onClick={() => toggleTodo(t.id, t.completed)}>
            <span className={t.completed ? styles.checkDone : styles.check} />
            <span className={t.completed ? styles.textDone : styles.text}>{t.content}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
