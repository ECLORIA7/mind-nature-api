'use client'

import { useEffect, useState, useRef } from 'react'
import { apiFetch, getUser } from '@/lib/auth-client'
import styles from './chat.module.css'

type Message = {
  id: string
  poster_id: string
  content: string
  sequence_num: number
  created_at: string
  profiles: { full_name: string } | null
}

type Addiction = { addiction_id: number; addictions: { name: string } }

export default function PatientChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [addictions, setAddictions] = useState<Addiction[]>([])
  const [selectedAddic, setSelectedAddic] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const user = getUser()

  const fetchMessages = (adicId: number) =>
    apiFetch(`/patient/bbs?addic=${adicId}`)
      .then((r) => r.json())
      .then((d) => setMessages(d.messages ?? []))

  useEffect(() => {
    apiFetch('/patient/info')
      .then((r) => r.json())
      .then((d) => {
        const adics: Addiction[] = d.patient?.patient_addictions ?? []
        setAddictions(adics)
        if (adics.length > 0) {
          const id = adics[0].addiction_id
          setSelectedAddic(id)
          return fetchMessages(id)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleAddicChange = (id: number) => {
    setSelectedAddic(id)
    setLoading(true)
    fetchMessages(id).finally(() => setLoading(false))
  }

  const deleteMessage = async (messageId: string) => {
    await apiFetch('/patient/bbs', {
      method: 'DELETE',
      body: JSON.stringify({ message_id: messageId }),
    })
    if (selectedAddic) await fetchMessages(selectedAddic)
  }

  const canDelete = (idx: number) => !messages.slice(idx + 1).some((m) => m.poster_id !== user?.id)

  const send = async () => {
    if (!input.trim() || !selectedAddic) return
    setSending(true)
    await apiFetch('/patient/bbs', {
      method: 'POST',
      body: JSON.stringify({ content: input, addic: selectedAddic }),
    })
    setInput('')
    await fetchMessages(selectedAddic)
    setSending(false)
  }

  if (loading) return <p>読み込み中...</p>

  if (addictions.length === 0) {
    return (
      <div className={styles.wrapper}>
        <h1 className={styles.heading}>カウンセラーとのチャット</h1>
        <p style={{ color: '#94a3b8', padding: 16 }}>症状カテゴリーが登録されていません。カウンセラーにご連絡ください。</p>
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.heading}>カウンセラーとのチャット</h1>
      {addictions.length > 1 && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 8 }}>
          {addictions.map((a) => (
            <button
              key={a.addiction_id}
              onClick={() => handleAddicChange(a.addiction_id)}
              style={{
                padding: '6px 14px', borderRadius: 20, border: 'none', fontSize: 13, cursor: 'pointer',
                background: selectedAddic === a.addiction_id ? '#15803d' : '#e2e8f0',
                color: selectedAddic === a.addiction_id ? '#fff' : '#374151',
              }}
            >
              {a.addictions.name}
            </button>
          ))}
        </div>
      )}
      <div className={styles.messages}>
        {messages.length === 0 && <p className={styles.empty}>メッセージはありません</p>}
        {messages.map((m, idx) => {
          const isMe = m.poster_id === user?.id
          return (
            <div key={m.id} className={isMe ? styles.rowMe : styles.rowOther}>
              {!isMe && <div className={styles.senderName}>{m.profiles?.full_name ?? 'カウンセラー'}</div>}
              <div className={isMe ? styles.bubbleMe : styles.bubbleOther}>{m.content}</div>
              {isMe && canDelete(idx) && (
                <button
                  onClick={() => deleteMessage(m.id)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 11, cursor: 'pointer', padding: '2px 4px', alignSelf: 'flex-end' }}
                >削除</button>
              )}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      <div className={styles.inputRow}>
        <textarea
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="メッセージを入力..."
          rows={2}
          style={{ resize: 'none' }}
        />
        <button className={styles.sendBtn} onClick={send} disabled={sending}>送信</button>
      </div>
    </div>
  )
}
