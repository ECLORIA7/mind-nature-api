'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/auth-client'
import styles from './detail.module.css'

type Patient = {
  age: string; sex: number; furigana: string; nickname: string; address: string; daily_rhythm: string; interests: string
  profession: string; work_history: string; personal_relations: string; harsh_childhood: string
  criminal_record: string; other_traumas: string; supplement: string; goals: string
  counselor_supplement: string; counselor_findings: string; counselor_history: string
}
type Symptom = {
  addiction_id: number; addictions?: { name: string }; severity: string; start_date: string
  frequency: string; difficulties: string; trouble: string; methods: string; goal: string; supplement: string
}
type Addiction = { addiction_id: number; addictions: { name: string } }

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [patient, setPatient] = useState<Patient | null>(null)
  const [symptoms, setSymptoms] = useState<Symptom[]>([])
  const [addictions, setAddictions] = useState<Addiction[]>([])
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState({ counselor_supplement: '', counselor_findings: '', counselor_history: '' })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch(`/counselor/patient?id=${id}`)
      .then((r) => r.json())
      .then((d) => {
        setFullName(d.profile?.full_name ?? '')
        setPatient(d.patient)
        setSymptoms(d.symptoms)
        setAddictions(d.addictions)
        setNotes({
          counselor_supplement: d.patient?.counselor_supplement ?? '',
          counselor_findings: d.patient?.counselor_findings ?? '',
          counselor_history: d.patient?.counselor_history ?? '',
        })
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleSave = async () => {
    setSaving(true)
    await apiFetch('/counselor/patient', {
      method: 'PATCH',
      body: JSON.stringify({ patient_id: id, ...notes }),
    })
    setEditing(false)
    setSaving(false)
  }

  const sexLabel = (s: number) => s === 1 ? '男性' : s === 2 ? '女性' : s === 3 ? 'その他' : '—'

  if (loading) return <p>読み込み中...</p>

  return (
    <div>
      <button className={styles.back} onClick={() => router.push('/counselor/patients')}>← 患者一覧</button>
      <div className={styles.header}>
        <h1 className={styles.heading}>{fullName}</h1>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>基本情報（クライアント入力）</h2>
        <div className={styles.grid}>
          {[
            ['年齢', patient?.age], ['性別', sexLabel(patient?.sex ?? 0)],
            ['フリガナ', patient?.furigana], ['ニックネーム', patient?.nickname],
            ['住所', patient?.address], ['職業', patient?.profession],
            ['職歴', patient?.work_history], ['趣味', patient?.interests],
            ['生活リズム', patient?.daily_rhythm], ['人間関係', patient?.personal_relations],
            ['目標', patient?.goals], ['補足', patient?.supplement],
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
                    ['重症度', s.severity], ['症状の開始日', s.start_date],
                    ['頻度', s.frequency], ['生活上困っていること', s.difficulties],
                    ['症状によるトラブル', s.trouble], ['行動の方法', s.methods],
                    ['症状に関する目標', s.goal], ['補足', s.supplement],
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

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>カウンセラー記録</h2>
          {!editing && <button className={styles.editBtn} onClick={() => setEditing(true)}>編集</button>}
        </div>
        <div className={styles.noteGrid}>
          {[
            { label: '補足事項', key: 'counselor_supplement' },
            { label: '所見', key: 'counselor_findings' },
            { label: 'カウンセリングの経緯', key: 'counselor_history' },
          ].map(({ label, key }) => (
            <div key={key} className={styles.field}>
              <label className={styles.label}>{label}</label>
              {editing ? (
                <textarea
                  className={styles.textarea}
                  rows={4}
                  value={notes[key as keyof typeof notes]}
                  onChange={(e) => setNotes((n) => ({ ...n, [key]: e.target.value }))}
                />
              ) : (
                <p className={styles.value}>{notes[key as keyof typeof notes] || '—'}</p>
              )}
            </div>
          ))}
        </div>
        {editing && (
          <div className={styles.actions}>
            <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>{saving ? '保存中...' : '保存'}</button>
            <button className={styles.cancelBtn} onClick={() => setEditing(false)}>キャンセル</button>
          </div>
        )}
      </div>
    </div>
  )
}
