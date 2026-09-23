'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from '../login/login.module.css'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [accessToken, setAccessToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [tokenError, setTokenError] = useState(false)

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    const params = new URLSearchParams(hash)
    const token = params.get('access_token')
    const type = params.get('type')
    if (!token || type !== 'recovery') {
      setTokenError(true)
    } else {
      setAccessToken(token)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('パスワードが一致しません'); return }
    if (password.length < 8) { setError('パスワードは8文字以上にしてください'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: accessToken, new_password: password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? '更新に失敗しました'); return }
      setDone(true)
    } catch {
      setError('ネットワークエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Mind Nature</h1>
        <p className={styles.subtitle}>新しいパスワードを設定</p>

        {tokenError ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#ef4444', marginBottom: 24 }}>
              リンクが無効または期限切れです。<br />
              再度パスワード再設定をお試しください。
            </p>
            <button className={styles.button} onClick={() => router.push('/forgot-password')}>
              再設定を申請する
            </button>
          </div>
        ) : done ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#15803d', marginBottom: 24 }}>
              パスワードを更新しました。<br />
              新しいパスワードでログインしてください。
            </p>
            <button className={styles.button} onClick={() => router.push('/login')}>
              ログインへ
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <input
              className={styles.input}
              type="password"
              placeholder="新しいパスワード（8文字以上）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <input
              className={styles.input}
              type="password"
              placeholder="パスワードの確認"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            {error && <p className={styles.error}>{error}</p>}
            <button className={styles.button} type="submit" disabled={loading}>
              {loading ? '更新中...' : 'パスワードを更新する'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
