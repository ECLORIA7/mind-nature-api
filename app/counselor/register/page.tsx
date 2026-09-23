'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/auth-client'
import styles from './register.module.css'

type Group = { id: number; name: string; organization_id: number | null }
type Addiction = { id: number; name: string }

type SelectedAddiction = { addiction_id: number; name: string }

export default function RegisterClientPage() {
  const [email, setEmail] = useState('')
  const [groupId, setGroupId] = useState('')
  const [groups, setGroups] = useState<Group[]>([])
  const [allAddictions, setAllAddictions] = useState<Addiction[]>([])
  const [selectedAddictions, setSelectedAddictions] = useState<SelectedAddiction[]>([])
  const [addingId, setAddingId] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ email: string; password: string; groupName?: string } | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiFetch('/counselor/organizations')
      .then((r) => r.json())
      .then((d) => { setGroups(d.groups ?? []) })
    fetch('/api/addictions')
      .then((r) => r.json())
      .then((d) => { setAllAddictions(d.addictions ?? []) })
  }, [])

  const addCategory = () => {
    if (!addingId) return
    const addiction = allAddictions.find((a) => String(a.id) === addingId)
    if (!addiction) return
    if (selectedAddictions.some((s) => s.addiction_id === addiction.id)) return
    setSelectedAddictions((prev) => [...prev, { addiction_id: addiction.id, name: addiction.name }])
    setAddingId('')
  }

  const removeCategory = (id: number) => {
    setSelectedAddictions((prev) => prev.filter((s) => s.addiction_id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setResult(null)
    if (!email.trim()) { setError('メールアドレスを入力してください'); return }
    setSaving(true)
    try {
      const res = await apiFetch('/counselor/register', {
        method: 'POST',
        body: JSON.stringify({
          type: 'patient',
          email: email.trim(),
          addictions: selectedAddictions.map((s) => ({ addiction_id: s.addiction_id })),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? '登録に失敗しました'); return }

      const newPatientId = data.user_id
      let groupName: string | undefined
      if (groupId && newPatientId) {
        await apiFetch('/counselor/group-members', {
          method: 'POST',
          body: JSON.stringify({ group_id: Number(groupId), patient_id: newPatientId }),
        })
        groupName = groups.find((g) => String(g.id) === groupId)?.name
      }

      setResult({ email: email.trim(), password: data.temporary_password, groupName })
      setEmail('')
      setGroupId('')
      setSelectedAddictions([])
    } catch {
      setError('ネットワークエラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className={styles.heading}>クライアント登録</h1>
      <div className={styles.card}>
        <p className={styles.desc}>
          メールアドレスを入力してアカウントを作成します。<br />
          仮パスワードが発行されますので、クライアントへお伝えください。<br />
          クライアントは初回ログイン時に自分でプロフィールを入力します。
        </p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>メールアドレス</label>
          <input
            className={styles.input}
            type="email"
            placeholder="client@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label className={styles.label}>症状カテゴリー（任意）</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <select
              value={addingId}
              onChange={(e) => setAddingId(e.target.value)}
              style={{ padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, flex: 1, minWidth: 120 }}
            >
              <option value="">症状を選択</option>
              {allAddictions
                .filter((a) => !selectedAddictions.some((s) => s.addiction_id === a.id))
                .map((a) => <option key={a.id} value={a.id}>{a.name}</option>)
              }
            </select>
            <button
              type="button"
              onClick={addCategory}
              disabled={!addingId}
              style={{ padding: '9px 16px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, cursor: addingId ? 'pointer' : 'not-allowed', opacity: addingId ? 1 : 0.5 }}
            >
              追加
            </button>
          </div>
          {selectedAddictions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
              {selectedAddictions.map((s) => (
                <div key={s.addiction_id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0fdf4', borderRadius: 8, padding: '8px 12px' }}>
                  <span style={{ flex: 1, fontSize: 14, color: '#15803d', fontWeight: 500 }}>{s.name}</span>
                  <button type="button" onClick={() => removeCategory(s.addiction_id)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 16, cursor: 'pointer', padding: '0 4px' }}>×</button>
                </div>
              ))}
            </div>
          )}

          <label className={styles.label}>グループに追加（任意）</label>
          <select className={styles.input} value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="">グループを選択しない</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>

          {error && <p className={styles.error}>{error}</p>}
          <button className={styles.button} type="submit" disabled={saving}>
            {saving ? '登録中...' : 'アカウントを作成'}
          </button>
        </form>
      </div>

      {result && (
        <div className={styles.resultCard}>
          <h2 className={styles.resultTitle}>登録完了</h2>
          <p className={styles.resultDesc}>以下の情報をクライアントへお伝えください。</p>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>メールアドレス</span>
            <span className={styles.resultValue}>{result.email}</span>
          </div>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>仮パスワード</span>
            <span className={styles.resultPassword}>{result.password}</span>
          </div>
          {result.groupName && (
            <div className={styles.resultRow}>
              <span className={styles.resultLabel}>追加されたグループ</span>
              <span className={styles.resultValue}>{result.groupName}</span>
            </div>
          )}
          <p className={styles.resultNote}>※ クライアントが初回ログイン後にプロフィールを入力します。</p>
        </div>
      )}
    </div>
  )
}
