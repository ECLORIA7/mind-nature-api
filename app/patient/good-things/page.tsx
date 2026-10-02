'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/auth-client'

type Entry = { id: string; entry_num: number; content: string; created_at: string }

const DESCRIPTION = `今までに体験したよかった事、嬉しかった事、楽しかった事、面白かったことを、簡単に５０話、書き出してください。

一つの話は、後から読んでも、あの日のあの出来事だとわかるように、いつ、どこで、誰がいて、何があったかを、１行から３行で書いてください。

書く順番は、できるだけ物心がついたころから、順に書くようにしてください。幼少期のことをなるべく多く書いてください。

この書き出しは、精神が安定する訓練に使う材料を作るものです。

【例】
１、５歳の頃、自分の家の庭でお父さんと相撲を取った
２、５歳の頃、正月にお年玉をもらった
３、小学校に入学するときに、ランドセルを買ってもらった`

function calcProgress(startedAt: string | null, entries: Entry[]) {
  const refDate = startedAt
    ? startedAt
    : entries.length > 0 ? entries[0].created_at : new Date().toISOString()
  const start = new Date(refDate)
  start.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysElapsed = Math.max(1, Math.floor((today.getTime() - start.getTime()) / 86400000) + 1)
  const todayStr = today.toLocaleDateString('sv-SE')
  const todayCount = entries.filter((e) => e.created_at.slice(0, 10) === todayStr).length
  const weekTarget = daysElapsed <= 7 ? 25 : 50
  const scheduledTotal = Math.min(50, daysElapsed * 3)
  const behind = Math.max(0, scheduledTotal - entries.length)
  return { daysElapsed, todayCount, weekTarget, behind, scheduledTotal }
}

export default function GoodThingsPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [startedAt, setStartedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [descOpen, setDescOpen] = useState(false)
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  const fetchData = () =>
    apiFetch('/patient/fun-events/abstract')
      .then((r) => r.json())
      .then((d) => {
        setStartedAt(d.started_at)
        setEntries(d.entries ?? [])
      })
      .finally(() => setLoading(false))

  useEffect(() => { fetchData() }, [])

  const handleAdd = async () => {
    if (!input.trim()) return
    setSaving(true)
    await apiFetch('/patient/fun-events/abstract', {
      method: 'POST',
      body: JSON.stringify({ content: input.trim() }),
    })
    setInput('')
    await fetchData()
    setSaving(false)
  }

  const handleEdit = async (id: string) => {
    if (!editContent.trim()) return
    setEditSaving(true)
    await apiFetch('/patient/fun-events/abstract', {
      method: 'PATCH',
      body: JSON.stringify({ id, content: editContent.trim() }),
    })
    setEditId(null)
    await fetchData()
    setEditSaving(false)
  }

  if (loading) return <p style={{ padding: 16 }}>読み込み中...</p>

  const prog = calcProgress(startedAt, entries)
  const canAdd = entries.length < 50

  return (
    <div style={{ maxWidth: 640, paddingBottom: 40 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#14532d', marginBottom: 4 }}>良かったことの書き出し</h1>
      <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>目標：50話（2週間）</p>

      {/* 説明文 */}
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={() => setDescOpen((o) => !o)}
          style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer', color: '#374151' }}
        >
          {descOpen ? '▲ 説明文を閉じる' : '▼ 説明文を表示'}
        </button>
        {descOpen && (
          <div style={{ marginTop: 10, background: '#f8fafc', borderRadius: 10, padding: '14px 16px', fontSize: 14, color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-wrap', border: '1px solid #e2e8f0' }}>
            {DESCRIPTION}
          </div>
        )}
      </div>

      {/* 進捗 */}
      <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '14px 16px', marginBottom: 20, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 100 }}>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 2px' }}>合計</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: '#15803d', margin: 0 }}>{entries.length}<span style={{ fontSize: 13, fontWeight: 400 }}> / 50話</span></p>
        </div>
        <div style={{ flex: 1, minWidth: 100 }}>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 2px' }}>今日</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: prog.todayCount >= 3 ? '#15803d' : '#f59e0b', margin: 0 }}>{prog.todayCount}<span style={{ fontSize: 13, fontWeight: 400 }}> / 3話</span></p>
        </div>
        <div style={{ flex: 1, minWidth: 100 }}>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 2px' }}>1週目目標</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: entries.length >= 25 ? '#15803d' : '#94a3b8', margin: 0 }}>25話</p>
        </div>
      </div>

      {/* 遅れている場合の促し */}
      {prog.behind > 0 && entries.length < 50 && (
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 14, color: '#92400e' }}>
          本日はあと<strong>{prog.behind}話</strong>です。
        </div>
      )}

      {entries.length >= 50 && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '14px 16px', marginBottom: 16, fontSize: 15, color: '#15803d', fontWeight: 600 }}>
          🎉 50話の書き出しが完了しました！お疲れ様でした。
        </div>
      )}

      {/* 入力エリア */}
      {canAdd && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 8, fontWeight: 600 }}>
            No.{entries.length + 1} を書く
          </p>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="例：小学校3年の頃、運動会でリレーの選手に選ばれて嬉しかった"
            rows={3}
            style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
          <button
            onClick={handleAdd}
            disabled={saving || !input.trim()}
            style={{ marginTop: 10, background: '#15803d', color: 'white', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: input.trim() ? 'pointer' : 'not-allowed', opacity: input.trim() ? 1 : 0.5 }}
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      )}

      {/* エントリー一覧 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[...entries].reverse().map((e) => (
          <div key={e.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: editId === e.id ? 8 : 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>No.{e.entry_num}</span>
              {editId !== e.id && (
                <button
                  onClick={() => { setEditId(e.id); setEditContent(e.content) }}
                  style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: 6, padding: '3px 10px', fontSize: 12, cursor: 'pointer', color: '#64748b' }}
                >
                  変更
                </button>
              )}
            </div>
            {editId === e.id ? (
              <>
                <textarea
                  value={editContent}
                  onChange={(ev) => setEditContent(ev.target.value)}
                  rows={3}
                  style={{ width: '100%', border: '1px solid #3b82f6', borderRadius: 8, padding: '8px 10px', fontSize: 14, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button
                    onClick={() => handleEdit(e.id)}
                    disabled={editSaving || !editContent.trim()}
                    style={{ background: '#1e40af', color: 'white', border: 'none', borderRadius: 6, padding: '7px 18px', fontSize: 13, cursor: 'pointer' }}
                  >
                    {editSaving ? '保存中...' : '保存'}
                  </button>
                  <button
                    onClick={() => setEditId(null)}
                    style={{ background: '#e2e8f0', color: '#374151', border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 13, cursor: 'pointer' }}
                  >
                    キャンセル
                  </button>
                </div>
              </>
            ) : (
              <p style={{ fontSize: 14, color: '#1e293b', margin: 0, lineHeight: 1.7 }}>{e.content}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
