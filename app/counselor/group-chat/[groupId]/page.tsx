'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { apiFetch } from '@/lib/auth-client'
import styles from './group-chat.module.css'

type Message = {
  id: number
  sender_id: string
  sender_name: string
  content: string
  created_at: string
  is_mine: boolean
}

export default function CounselorGroupChatPage() {
  const params = useParams()
  const groupId = params.groupId as string
  const [messages, setMessages] = useState<Message[]>([])
  const [groupName, setGroupName] = useState('')
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const fetchMessages = async () => {
    const res = await apiFetch(`/counselor/group-messages?group_id=${groupId}`)
    const data = await res.json()
    setMessages(data.messages ?? [])
  }

  useEffect(() => {
    const init = async () => {
      const res = await apiFetch('/counselor/organizations')
      const data = await res.json()
      const group = (data.groups ?? []).find((g: { id: number; name: string }) => String(g.id) === groupId)
      if (group) setGroupName(group.name)
      await fetchMessages()
      setLoading(false)
    }
    init()
  }, [groupId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    if (!input.trim()) return
    setSending(true)
    await apiFetch('/counselor/group-messages', {
      method: 'POST',
      body: JSON.stringify({ group_id: Number(groupId), content: input }),
    })
    setInput('')
    await fetchMessages()
    setSending(false)
  }

  if (loading) return <p>読み込み中...</p>

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <a href="/counselor/organizations" className={styles.back}>← 組織管理に戻る</a>
        <h1 className={styles.heading}>{groupName || 'グループチャット'}</h1>
      </div>
      <div className={styles.messages}>
        {messages.length === 0 && <p className={styles.empty}>メッセージはありません</p>}
        {messages.map((m) => (
          <div key={m.id} className={m.is_mine ? styles.rowMe : styles.rowOther}>
            {!m.is_mine && <div className={styles.senderName}>{m.sender_name}</div>}
            <div className={m.is_mine ? styles.bubbleMe : styles.bubbleOther}>{m.content}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className={styles.inputRow}>
        <input
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="メッセージを入力..."
        />
        <button className={styles.sendBtn} onClick={send} disabled={sending}>送信</button>
      </div>
    </div>
  )
}
