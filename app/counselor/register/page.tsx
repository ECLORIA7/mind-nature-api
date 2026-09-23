'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/auth-client'
import styles from './register.module.css'

type Group = { id: number; name: string; organization_id: number | null }

export default function RegisterClientPage() {
  const [email, setEmail] = useState('')
  const [groupId, setGroupId] = useState('')
  const [groups, setGroups] = useState<Group[]>([])
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ email: string; password: string; groupName?: string } | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiFetch('/counselor/organizations')
      .then((r) => r.json())
      .then((d) => { setGroups(d.groups ?? []) })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setResult(null)
    if (!email.trim()) { setError('メールアドレスを入力してください'); return }
    setSaving(true)
    try {
      const res = await apiFetch('/counselor/register', {
        method: 'POST',
        body: JSON.stringify({ type: 'patient', email: email.trim() }),
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
