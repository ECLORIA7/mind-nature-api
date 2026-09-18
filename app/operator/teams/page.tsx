'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/auth-client'
import styles from './teams.module.css'

type Team = { id: number; name: string; description: string }
type Counselor = { id: string; rank: number; profiles: { full_name: string; hospital_id: number | null } }

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [counselors, setCounselors] = useState<Counselor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)

  const fetchData = () =>
    apiFetch('/operator/teams')
      .then((r) => r.json())
      .then((d) => { setTeams(d.teams ?? []); setCounselors(d.counselors ?? []) })
      .finally(() => setLoading(false))

  useEffect(() => { fetchData() }, [])

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    if (editId) {
      await apiFetch('/operator/teams', { method: 'PATCH', body: JSON.stringify({ id: editId, name, description }) })
    } else {
      await apiFetch('/operator/teams', { method: 'POST', body: JSON.stringify({ name, description }) })
    }
    setName(''); setDescription(''); setShowForm(false); setEditId(null)
    await fetchData()
    setSaving(false)
  }

  const startEdit = (t: Team) => {
    setEditId(t.id); setName(t.name); setDescription(t.description ?? ''); setShowForm(true)
  }

  const teamCounselors = (teamId: number) => counselors.filter((c) => c.profiles?.hospital_id === teamId)

  if (loading) return <p>読み込み中...</p>

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.heading}>チーム管理</h1>
        <button className={styles.addBtn} onClick={() => { setShowForm(true); setEditId(null); setName(''); setDescription('') }}>
          + チームを追加
        </button>
      </div>

      {showForm && (
        <div className={styles.form}>
          <h2 className={styles.formTitle}>{editId ? 'チームを編集' : '新しいチームを追加'}</h2>
          <input className={styles.input} placeholder="チーム名" value={name} onChange={(e) => setName(e.target.value)} />
          <textarea className={styles.textarea} placeholder="説明（任意）" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          <div className={styles.formActions}>
            <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>{saving ? '保存中...' : '保存'}</button>
            <button className={styles.cancelBtn} onClick={() => { setShowForm(false); setEditId(null) }}>キャンセル</button>
          </div>
        </div>
      )}

      <div className={styles.grid}>
        {teams.length === 0 && <p className={styles.empty}>チームが登録されていません</p>}
        {teams.map((t) => {
          const members = teamCounselors(t.id)
          const admins = members.filter((c) => c.rank === 0)
          return (
            <div key={t.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardName}>{t.name}</h2>
                <button className={styles.editBtn} onClick={() => startEdit(t)}>編集</button>
              </div>
              {t.description && <p className={styles.cardDesc}>{t.description}</p>}
              <div className={styles.cardMeta}>
                <span className={styles.metaItem}>管理者：{admins.length > 0 ? admins.map((c) => c.profiles.full_name).join('、') : '未設定'}</span>
                <span className={styles.metaItem}>カウンセラー：{members.length}名</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
