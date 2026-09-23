'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/auth-client'
import styles from '../patient.module.css'

type TestItem = {
  id: number
  name: string
  type: number
  attempt_count: number
  latest: { attempt_number: number; score: number; taken_at: string } | null
}

export default function TestsPage() {
  const router = useRouter()
  const [tests, setTests] = useState<TestItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/patient/tests').then(r => r.json()).then(d => setTests(d.tests ?? []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className={styles.main} style={{ padding: 24 }}><p>読み込み中...</p></div>

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '16px 16px 80px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#15803d', marginBottom: 20 }}>テスト</h1>

      {tests.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '60px 16px', fontSize: 14 }}>
          <p>割り当てられたテストはありません</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tests.map(t => (
            <button key={t.id}
              onClick={() => router.push(`/patient/tests/${t.id}`)}
              style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: '16px 18px',
                textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#dcfce7',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                {t.type === 0 ? '📋' : '✏️'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>{t.name}</div>
                {t.attempt_count === 0 ? (
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>未受験</div>
                ) : (
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    {t.attempt_count}回受験済 ·
                    最新スコア: <span style={{ color: '#15803d', fontWeight: 600 }}>{t.latest?.score}点</span>
                  </div>
                )}
              </div>
              <div style={{ color: '#94a3b8', fontSize: 18 }}>›</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
