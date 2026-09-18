'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch, getUser, saveSession, getToken } from '@/lib/auth-client'
import styles from './setup.module.css'

type Addiction = { id: number; name: string }

export default function ClientSetupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState(0)
  const [addictions, setAddictions] = useState<Addiction[]>([])
  const [selectedAddictions, setSelectedAddictions] = useState<number[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const user = getUser()
    if (!user || user.role !== 'patient') {
      router.replace('/login')
      return
    }
    fetch('/api/addictions').then((r) => r.json()).then((d) => setAddictions(d.addictions ?? []))
  }, [router])

  const toggleAddiction = (id: number) => {
    setSelectedAddictions((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!fullName.trim()) { setError('氏名を入力してください'); return }
    if (!selectedAddictions.length) { setError('依存症の種類を選択してください'); return }
    setSaving(true)
    try {
      const res = await apiFetch('/client/setup', {
        method: 'POST',
        body: JSON.stringify({ full_name: fullName, age: age || null, sex, addictions: selectedAddictions }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? '保存に失敗しました'); return }
      const user = getUser()!
      const token = getToken()!
      const refreshToken = localStorage.getItem('refresh_token') ?? ''
      saveSession({
        access_token: token,
        refresh_token: refreshToken,
        user: { ...user, full_name: fullName, profile_completed: true },
      })
      router.push('/patient/todo')
    } catch {
      setError('ネットワークエラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>プロフィール設定</h1>
        <p className={styles.subtitle}>初回ログインです。情報を入力してください。</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>氏名 <span className={styles.required}>必須</span></label>
          <input
            className={styles.input}
            type="text"
            placeholder="山田 太郎"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <label className={styles.label}>年齢</label>
          <input
            className={styles.input}
            type="number"
            placeholder="例：35"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            min={1}
            max={120}
          />

          <label className={styles.label}>性別</label>
          <div className={styles.radioGroup}>
            {[{ v: 1, l: '男性' }, { v: 2, l: '女性' }, { v: 3, l: 'その他' }].map(({ v, l }) => (
              <label key={v} className={styles.radio}>
                <input type="radio" name="sex" value={v} checked={sex === v} onChange={() => setSex(v)} />
                {l}
              </label>
            ))}
          </div>

          <label className={styles.label}>症状カテゴリー <span className={styles.required}>必須</span></label>
          <div className={styles.checkGroup}>
            {addictions.map((a) => (
              <label key={a.id} className={styles.check}>
                <input
                  type="checkbox"
                  checked={selectedAddictions.includes(a.id)}
                  onChange={() => toggleAddiction(a.id)}
                />
                {a.name}に関する悩み
              </label>
            ))}
          </div>

          {error && <p className={styles.error}>{error}</p>}
          <button className={styles.button} type="submit" disabled={saving}>
            {saving ? '保存中...' : '登録して始める'}
          </button>
        </form>
      </div>
    </div>
  )
}
