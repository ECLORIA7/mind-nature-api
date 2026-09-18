'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/auth-client'
import styles from './detail.module.css'

type Patient = {
  age: string; sex: number; furigana: string; nickname: string
  address: string; daily_rhythm: string; interests: string; profession: string
  work_history: string; personal_relations: string; harsh_childhood: string
  criminal_record: string; other_traumas: string; supplement: string; goals: string
  profile_completed: boolean
}
type Symptom = {
  addiction_id: number; addictions?: { name: string }; severity: string; start_date: string
  frequency: string; difficulties: string; trouble: string; methods: string; goal: string; supplement: string
}
type Addiction = { addiction_id: number; addictions: { name: string } }

function formatDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function OperatorClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [createdAt, setCreatedAt] = useState('')
  const [patient, setPatient] = useState<Patient | null>(null)
  const [symptoms, setSymptoms] = useState<Symptom[]>([])
  const [addictions, setAddictions] = useState<Addiction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch(`/operator/clients/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return }
        setFullName(d.profile?.full_name ?? '')
        setEmail(d.email ?? '')
        setCreatedAt(d.created_at ?? '')
        setPatient(d.patient)
        setSymptoms(d.symptoms ?? [])
        setAddictions(d.addictions ?? [])
      })
      .finally(() => setLoading(false))
  }, [id])

  const sexLabel = (s: number) => s === 1 ? '男性' : s === 2 ? '女性' : s === 3 ? 'その他' : '—'

  if (loading) return <p>読み込み中...</p>
  if (error) return <p style={{ color: '#dc2626' }}>{error}</p>

  return (
    <div>
      <button className={styles.back} onClick={() => router.push('/operator/clients')}>← クライアント一覧</button>

      <div className={styles.header}>
        <div>
          <h1 className={styles.heading}>{fullName || '（氏名未設定）'}</h1>
          {patient?.furigana && <p className={styles.furigana}>{patient.furigana}</p>}
        </div>
        <span className={patient?.profile_completed ? styles.badgeComplete : styles.badgePending}>
          {patient?.profile_completed ? '登録完了' : 'プロフィール未入力'}
        </span>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>アカウント情報</h2>
        <div className={styles.grid}>
          {[
            ['メールアドレス', email],
            ['登録日時', formatDate(createdAt)],
            ['ニックネーム', patient?.nickname],
          ].map(([label, val]) => (
            <div key={label} className={styles.field}>
              <label className={styles.label}>{label}</label>
              <p className={styles.value}>{val || '—'}</p>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>基本情報</h2>
        <div className={styles.grid}>
          {[
            ['年齢', patient?.age ? `${patient.age}歳` : null],
            ['性別', sexLabel(patient?.sex ?? 0)],
            ['住所', patient?.address],
            ['職業', patient?.profession],
            ['職歴', patient?.work_history],
            ['趣味・関心', patient?.interests],
            ['生活リズム', patient?.daily_rhythm],
            ['人間関係', patient?.personal_relations],
            ['目標', patient?.goals],
            ['補足', patient?.supplement],
            ['子供の頃の過酷な経験', patient?.harsh_childhood],
            ['犯罪歴・補導歴', patient?.criminal_record],
            ['その他のトラウマ', patient?.other_traumas],
          ].map(([label, val]) => (
            <div key={label} className={styles.field}>
              <label className={styles.label}>{label}</label>
              <p className={styles.value}>{val || '—'}</p>
            </div>
          ))}
        </div>
      </div>

      {addictions.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>症状カテゴリー</h2>
          <div className={styles.tags}>
            {addictions.map((a) => (
              <span key={a.addiction_id} className={styles.tag}>{a.addictions?.name}に関する悩み</span>
            ))}
          </div>
        </div>
      )}

      {symptoms.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>症状カテゴリー別情報</h2>
          {symptoms.map((s) => {
            const name = addictions.find((a) => a.addiction_id === s.addiction_id)?.addictions?.name ?? ''
            return (
              <div key={s.addiction_id} className={styles.symptomBlock}>
                <h3 className={styles.symptomTitle}>{name}に関する悩み</h3>
                <div className={styles.grid}>
                  {[
                    ['重症度', s.severity], ['開始時期', s.start_date], ['頻度', s.frequency],
                    ['困っていること', s.difficulties], ['生活への支障', s.trouble],
                    ['これまでの対処法', s.methods], ['目標', s.goal], ['補足', s.supplement],
                  ].map(([label, val]) => (
                    <div key={label} className={styles.field}>
                      <label className={styles.label}>{label}</label>
                      <p className={styles.value}>{val || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
