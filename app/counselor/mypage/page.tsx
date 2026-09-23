'use client'

import { useEffect, useState } from 'react'
import { getUser, apiFetch, type User } from '@/lib/auth-client'
import styles from './mypage.module.css'

export default function CounselorMyPage() {
  const [user, setUser] = useState<User | null>(null)
  const [pwOpen, setPwOpen] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwDone, setPwDone] = useState(false)

  useEffect(() => { setUser(getUser()) }, [])

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

  return (
    <div>
      <h1 className={styles.heading}>マイページ</h1>
      <div className={styles.card}>
        <p className={styles.role}>{user?.role === 'admin' ? '管理者' : 'カウンセラー'}</p>
        <h2 className={styles.name}>{user?.full_name}</h2>
        <p className={styles.email}>{user?.email}</p>
      </div>

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
            <input
              type="password"
              placeholder="現在のパスワード"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              required
              style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 14 }}
            />
            <input
              type="password"
              placeholder="新しいパスワード（8文字以上）"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              required
              style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 14 }}
            />
            <input
              type="password"
              placeholder="新しいパスワード（確認）"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              required
              style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 14 }}
            />
            {pwError && <p style={{ color: '#ef4444', fontSize: 13 }}>{pwError}</p>}
            <button
              type="submit"
              disabled={pwSaving}
              style={{ background: '#1e40af', color: 'white', border: 'none', borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: pwSaving ? 0.6 : 1 }}
            >
              {pwSaving ? '変更中...' : 'パスワードを変更する'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
