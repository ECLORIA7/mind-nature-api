'use client'

import { useEffect, useState, useRef } from 'react'
import { apiFetch, getUser } from '@/lib/auth-client'
import styles from './chat.module.css'

type Message = {
  id: string
  sender_role: string
  content: string
  sequence_num: number
  created_at: string
  profiles: { full_name: string }
}

export default function PatientChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const user = getUser()

  const fetchMessages = () =>
    apiFetch('/patient/bbs')
      .then((r) => r.json())
      .then((d) => setMessages(d.messages ?? []))
      .finally(() => setLoading(false))

  useEffect(() => { fetchMessages() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    if (!input.trim()) return
    setSending(true)
    await apiFetch('/patient/bbs', { method: 'POST', body: JSON.stringify({ content: input }) })
    setInput('')
    await fetchMessages()
    setSending(false)
  }

  if (loading) return <p>読み込み中...</p>

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.heading}>カウンセラーとのチャット</h1>
      <div className={styles.messages}>
        {messages.length === 0 && <p className={styles.empty}>メッセージはありません</p>}
        {messages.map((m) => {
          const isMe = m.sender_role === 'patient'
          return (
            <div key={m.id} className={isMe ? styles.rowMe : styles.rowOther}>
              {!isMe && <div className={styles.senderName}>{m.profiles?.full_name}</div>}
              <div className={isMe ? styles.bubbleMe : styles.bubbleOther}>{m.content}</div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      <div className={styles.inputRow}>
        <input
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="メッセージを入力..."
        />
        <button className={styles.sendBtn} onClick={send} disabled={sending}>送信</button>
      </div>
    </div>
  )
}
