'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/auth-client'
import styles from './clients.module.css'

type Addiction = { id: number; name: string }
type Client = {
  id: string
  full_name: string
  furigana: string | null
  age: string | null
  sex: number
  email: string
  nickname: string | null
  profile_completed: boolean
  created_at: string
  addictions: Addiction[]
}

function formatDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

export default function CounselorClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [addictions, setAddictions] = useState<Addiction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [searchName, setSearchName] = useState('')
  const [filterAddiction, setFilterAddiction] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  useEffect(() => {
    apiFetch('/counselor/clients')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return }
        setClients(d.clients ?? [])
        setAddictions(d.addictions ?? [])
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (searchName) {
        const q = searchName.toLowerCase()
        if (!(c.full_name ?? '').toLowerCase().includes(q) && !(c.furigana ?? '').toLowerCase().includes(q)) return false
      }
      if (filterAddiction && !c.addictions.some((a) => String(a.id) === filterAddiction)) return false
      if (filterDateFrom && new Date(c.created_at) < new Date(filterDateFrom)) return false
      if (filterDateTo) {
        const to = new Date(filterDateTo)
        to.setDate(to.getDate() + 1)
        if (new Date(c.created_at) >= to) return false
      }
      return true
    })
  }, [clients, searchName, filterAddiction, filterDateFrom, filterDateTo])

  const resetFilters = () => { setSearchName(''); setFilterAddiction(''); setFilterDateFrom(''); setFilterDateTo('') }

  if (loading) return <p>読み込み中...</p>
  if (error) return <p style={{ color: '#dc2626' }}>{error}</p>

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.heading}>
          クライアント一覧（自チーム）
          <span className={styles.count}>{filtered.length} / {clients.length}名</span>
        </h1>
      </div>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>名前・フリガナ</label>
          <input className={styles.filterInput} placeholder="山田 / ヤマダ" value={searchName} onChange={(e) => setSearchName(e.target.value)} />
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>症状カテゴリー</label>
          <select className={styles.filterSelect} value={filterAddiction} onChange={(e) => setFilterAddiction(e.target.value)}>
            <option value="">すべて</option>
            {addictions.map((a) => <option key={a.id} value={a.id}>{a.name}に関する悩み</option>)}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>登録日（開始）</label>
          <input className={styles.filterInput} type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>登録日（終了）</label>
          <input className={styles.filterInput} type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
        </div>
        <button className={styles.resetBtn} onClick={resetFilters}>リセット</button>
      </div>

      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <span>氏名</span><span>メールアドレス</span><span>症状カテゴリー</span><span>ステータス</span><span>登録日</span>
        </div>
        {filtered.length === 0 && <p className={styles.empty}>該当するクライアントがいません</p>}
        {filtered.map((c) => (
          <div key={c.id} className={styles.tableRow} onClick={() => router.push(`/preview/${c.id}`)} style={{ cursor: 'pointer' }}>
            <div className={styles.nameCell}>
              <span className={styles.name}>{c.full_name || '（未設定）'}</span>
              {c.furigana && <span className={styles.furigana}>{c.furigana}</span>}
            </div>
            <span className={styles.email}>{c.email}</span>
            <div className={styles.tags}>
              {c.addictions.length === 0
                ? <span className={styles.tagNone}>未設定</span>
                : c.addictions.map((a) => <span key={a.id} className={styles.tag}>{a.name}</span>)
              }
            </div>
            <span>
              <span className={c.profile_completed ? styles.badgeComplete : styles.badgePending}>
                {c.profile_completed ? '登録完了' : '未入力'}
              </span>
            </span>
            <span className={styles.dateCell}>{formatDate(c.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
