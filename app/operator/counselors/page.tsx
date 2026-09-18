'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/auth-client'
import styles from './counselors.module.css'

type Team = { id: number; name: string }
type Counselor = {
  id: string; rank: number; email: string
  profiles: { full_name: string; hospital_id: number | null; hospitals?: { name: string } }
}

export default function CounselorsPage() {
  const [counselors, setCounselors] = useState<Counselor[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: '', name: '', hospital_id: '', rank: '1' })
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ name: string; email: string; password: string } | null>(null)
  const [error, setError] = useState('')

  const fetchData = () =>
    Promise.all([
      apiFetch('/operator/counselors').then((r) => r.json()).then((d) => setCounselors(d.counselors ?? [])),
      apiFetch('/operator/teams').then((r) => r.json()).then((d) => setTeams(d.teams ?? [])),
    ]).finally(() => setLoading(false))

  useEffect(() => { fetchData() }, [])

  const setField = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setError('')
    if (!form.email || !form.name) { setError('メールと氏名は必須です'); return }
    setSaving(true)
    const res = await apiFetch('/operator/counselors', {
      method: 'POST',
      body: JSON.stringify({
        email: form.email, name: form.name,
        hospital_id: form.hospital_id ? Number(form.hospital_id) : null,
        rank: Number(form.rank),
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? '登録に失敗しました'); setSaving(false); return }
    setResult({ name: form.name, email: form.email, password: data.temporary_password })
    setForm({ email: '', name: '', hospital_id: '', rank: '1' })
    setShowForm(false)
    await fetchData()
    setSaving(false)
  }

  const setRank = async (id: string, rank: number) => {
    await apiFetch('/operator/counselors', { method: 'PATCH', body: JSON.stringify({ id, rank }) })
    await fetchData()
  }

  const setTeam = async (id: string, hospital_id: number | null) => {
    await apiFetch('/operator/counselors', { method: 'PATCH', body: JSON.stringify({ id, hospital_id }) })
    await fetchData()
  }

  if (loading) return <p>読み込み中...</p>

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.heading}>カウンセラー管理</h1>
        <button className={styles.addBtn} onClick={() => { setShowForm(true); setResult(null) }}>+ カウンセラーを追加</button>
      </div>

      {showForm && (
        <div className={styles.form}>
          <h2 className={styles.formTitle}>新しいカウンセラーを追加</h2>
          <input className={styles.input} placeholder="氏名" value={form.name} onChange={(e) => setField('name', e.target.value)} />
          <input className={styles.input} type="email" placeholder="メールアドレス" value={form.email} onChange={(e) => setField('email', e.target.value)} />
          <select className={styles.select} value={form.hospital_id} onChange={(e) => setField('hospital_id', e.target.value)}>
            <option value="">チームを選択（任意）</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select className={styles.select} value={form.rank} onChange={(e) => setField('rank', e.target.value)}>
            <option value="1">カウンセラー</option>
            <option value="0">管理者</option>
          </select>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.formActions}>
            <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>{saving ? '登録中...' : 'アカウントを作成'}</button>
            <button className={styles.cancelBtn} onClick={() => setShowForm(false)}>キャンセル</button>
          </div>
        </div>
      )}

      {result && (
        <div className={styles.resultCard}>
          <p className={styles.resultTitle}>登録完了　仮パスワードをお伝えください</p>
          <p>{result.name}　{result.email}</p>
          <p className={styles.password}>{result.password}</p>
        </div>
      )}

      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <span>氏名</span><span>メール</span><span>チーム</span><span>役割</span>
        </div>
        {counselors.length === 0 && <p className={styles.empty}>カウンセラーが登録されていません</p>}
        {counselors.map((c) => (
          <div key={c.id} className={styles.tableRow}>
            <span className={styles.name}>{c.profiles?.full_name}</span>
            <span className={styles.email}>{c.email}</span>
            <select className={styles.rowSelect} value={c.profiles?.hospital_id ?? ''} onChange={(e) => setTeam(c.id, e.target.value ? Number(e.target.value) : null)}>
              <option value="">未所属</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select className={styles.rowSelect} value={c.rank} onChange={(e) => setRank(c.id, Number(e.target.value))}>
              <option value={1}>カウンセラー</option>
              <option value={0}>管理者</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}
