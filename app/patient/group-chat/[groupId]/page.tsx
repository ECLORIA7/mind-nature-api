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

export default function PatientGroupChatPage() {
  const params = useParams()
  const groupId = params.groupId as string
  const [messages, setMessages] = useState<Message[]>([])
  const [groupName, setGroupName] = useState('')
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const fetchMessages = async () => {
    const res = await apiFetch(`/patient/group-messages?group_id=${groupId}`)
    const data = await res.json()
    setMessages(data.messages ?? [])
  }

  useEffect(() => {
    const init = async () => {
      const res = await apiFetch('/patient/groups')
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
    await apiFetch('/patient/group-messages', {
      method: 'POST',
      body: JSON.stringify({ group_id: Number(groupId), content: input }),
    })
    setInput('')
    await fetchMessages()
    setSending(false)
  }

  const deleteMessage = async (messageId: number) => {
    await apiFetch('/patient/group-messages', {
      method: 'DELETE',
      body: JSON.stringify({ message_id: messageId }),
    })
    await fetchMessages()
  }

  const canDelete = (idx: number) => !messages.slice(idx + 1).some((m) => !m.is_mine)

  if (loading) return <p>読み込み中...</p>

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <a href="/patient/groups" className={styles.back}>← グループ一覧に戻る</a>
        <h1 className={styles.heading}>{groupName || 'グループチャット'}</h1>
      </div>
      <div className={styles.messages}>
        {messages.length === 0 && <p className={styles.empty}>メッセージはありません</p>}
        {messages.map((m, idx) => (
          <div key={m.id} className={m.is_mine ? styles.rowMe : styles.rowOther}>
            {!m.is_mine && <div className={styles.senderName}>{m.sender_name}</div>}
            <div className={m.is_mine ? styles.bubbleMe : styles.bubbleOther}>{m.content}</div>
            {m.is_mine && canDelete(idx) && (
              <button
                onClick={() => deleteMessage(m.id)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 11, cursor: 'pointer', padding: '2px 4px', alignSelf: 'flex-end' }}
              >削除</button>
            )}
          </div>
        ))}
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
