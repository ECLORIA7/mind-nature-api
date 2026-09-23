'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/auth-client'
import styles from './mypage.module.css'

type Profile = {
  full_name: string
  birth_date: string
  phone: string
  email: string
  hospital_name: string
  member_number: number | null
  rank: number
  created_at: string
}

function formatDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

export default function CounselorMyPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ birth_date: '', phone: '', email: '' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [pwOpen, setPwOpen] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwDone, setPwDone] = useState(false)

  const fetchProfile = () =>
    apiFetch('/counselor/mypage')
      .then((r) => r.json())
      .then((d) => {
        setProfile(d)
        setForm({ birth_date: d.birth_date ?? '', phone: d.phone ?? '', email: d.email ?? '' })
      })
      .finally(() => setLoading(false))

  useEffect(() => { fetchProfile() }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveError('')
    setSaving(true)
    const res = await apiFetch('/counselor/mypage', {
      method: 'PATCH',
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setSaveError(data.error ?? '保存に失敗しました'); return }
    await fetchProfile()
    setEditing(false)
  }

  const handlePwChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError('')
    if (newPw !== confirmPw) { setPwError('新しいパスワードが一致しません'); return }
    if (newPw.length < 8) { setPwError('パスワードは8文字以上にしてください'); return }
    setPwSaving(true)
    const res = await apiFetch('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
    })
    const data = await res.json()
    setPwSaving(false)
    if (!res.ok) { setPwError(data.error ?? '変更に失敗しました'); return }
    setPwDone(true)
    setCurrentPw(''); setNewPw(''); setConfirmPw('')
  }

  if (loading) return <p>読み込み中...</p>

  const inputStyle = { width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' as const }

  return (
    <div>
      <h1 className={styles.heading}>マイページ</h1>

      {/* プロフィールカード */}
      <div className={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <p className={styles.role}>{profile?.rank === 0 ? '管理者' : 'カウンセラー'}</p>
            <h2 className={styles.name}>{profile?.full_name}</h2>
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 14px', fontSize: 13, color: '#64748b', cursor: 'pointer' }}
            >
              編集
            </button>
          )}
        </div>

        {/* 読み取り専用の情報 */}
        <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
          {[
            { label: '所属', value: profile?.hospital_name || '未所属' },
            { label: '所属内ID', value: profile?.member_number != null ? String(profile.member_number).padStart(3, '0') : '—' },
            { label: '登録日', value: formatDate(profile?.created_at ?? '') },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#94a3b8', width: 80, flexShrink: 0 }}>{label}</span>
              <span style={{ fontSize: 14, color: '#1e293b' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* 編集可能な情報 */}
        {editing ? (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>生年月日</label>
              <input type="date" value={form.birth_date} onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>電話番号</label>
              <input type="tel" placeholder="090-0000-0000" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>メールアドレス</label>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} style={inputStyle} />
            </div>
            {saveError && <p style={{ color: '#ef4444', fontSize: 13 }}>{saveError}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" disabled={saving} style={{ flex: 1, background: '#1e40af', color: 'white', border: 'none', borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? '保存中...' : '保存'}
              </button>
              <button type="button" onClick={() => { setEditing(false); setSaveError('') }} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 8, padding: '11px', fontSize: 14, cursor: 'pointer' }}>
                キャンセル
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {[
              { label: 'メールアドレス', value: profile?.email },
              { label: '生年月日', value: profile?.birth_date ? formatDate(profile.birth_date) : '—' },
              { label: '電話番号', value: profile?.phone || '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#94a3b8', width: 80, flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: 14, color: '#1e293b' }}>{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* パスワード変更 */}
      <div className={styles.card} style={{ marginTop: 16 }}>
        <button
          onClick={() => { setPwOpen((o) => !o); setPwDone(false); setPwError('') }}
          style={{ background: 'none', border: 'none', fontSize: 15, fontWeight: 600, color: '#1e293b', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          パスワードを変更する
          <span style={{ fontSize: 12, color: '#94a3b8' }}>{pwOpen ? '▲' : '▼'}</span>
        </button>

        {pwOpen && (
          <form onSubmit={handlePwChange} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pwDone && <p style={{ color: '#15803d', fontSize: 14 }}>パスワードを変更しました</p>}
            <input type="password" placeholder="現在のパスワード" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required style={inputStyle} />
            <input type="password" placeholder="新しいパスワード（8文字以上）" value={newPw} onChange={(e) => setNewPw(e.target.value)} required style={inputStyle} />
            <input type="password" placeholder="新しいパスワード（確認）" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required style={inputStyle} />
            {pwError && <p style={{ color: '#ef4444', fontSize: 13 }}>{pwError}</p>}
            <button type="submit" disabled={pwSaving} style={{ background: '#1e40af', color: 'white', border: 'none', borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: pwSaving ? 0.6 : 1 }}>
              {pwSaving ? '変更中...' : 'パスワードを変更する'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
