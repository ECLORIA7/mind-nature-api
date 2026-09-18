'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/auth-client'
import styles from './patients.module.css'

type Addiction = { addiction_id: number; addictions: { name: string } }
type Patient = {
  id: string
  age: string | null
  sex: number
  profiles: { full_name: string; hospital_id: number }
  patient_addictions: Addiction[]
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/counselor/patients')
      .then((r) => r.json())
      .then((d) => setPatients(d.patients ?? []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p>読み込み中...</p>

  return (
    <div>
      <h1 className={styles.heading}>患者一覧</h1>
      {patients.length === 0 ? (
        <p className={styles.empty}>患者が登録されていません</p>
      ) : (
        <div className={styles.grid}>
          {patients.map((p) => (
            <div key={p.id} className={styles.card}>
              <h2 className={styles.name}>{p.profiles?.full_name}</h2>
              <p className={styles.meta}>{p.age ? `${p.age}歳` : ''} {p.sex === 1 ? '男性' : p.sex === 2 ? '女性' : ''}</p>
              <div className={styles.tags}>
                {p.patient_addictions?.map((pa) => (
                  <span key={pa.addiction_id} className={styles.tag}>{pa.addictions?.name}に関する悩み</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
