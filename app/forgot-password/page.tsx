'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from '../login/login.module.css'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setSent(true)
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
        <p className={styles.subtitle}>パスワードの再設定</p>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#15803d', marginBottom: 24, lineHeight: 1.7 }}>
              メールを送信しました。<br />
              受信したメールのリンクから<br />
              パスワードを再設定してください。
            </p>
            <button className={styles.button} onClick={() => router.push('/login')}>
              ログインに戻る
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <p style={{ fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 8 }}>
              登録済みのメールアドレスを入力してください。<br />
              パスワード再設定用のリンクをお送りします。
            </p>
            <input
              className={styles.input}
              type="email"
              placeholder="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error && <p className={styles.error}>{error}</p>}
            <button className={styles.button} type="submit" disabled={loading}>
              {loading ? '送信中...' : '再設定メールを送信'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/login')}
              style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 14, cursor: 'pointer', textAlign: 'center' }}
            >
              ログインに戻る
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
