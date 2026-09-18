'use client'

import { useEffect, useState } from 'react'
import { apiFetch, getUser } from '@/lib/auth-client'
import styles from './mypage.module.css'

type SymptomDetail = {
  addiction_id: number
  addictions?: { name: string }
  severity: string
  start_date: string
  frequency: string
  difficulties: string
  trouble: string
  methods: string
  goal: string
  supplement: string
}

type Profile = {
  full_name: string
  age: string
  sex: number
  address: string
  daily_rhythm: string
  interests: string
  profession: string
  work_history: string
  personal_relations: string
  harsh_childhood: string
  criminal_record: string
  other_traumas: string
  supplement: string
  goals: string
  symptom_details: SymptomDetail[]
  addictions: { addiction_id: number; addictions: { name: string } }[]
}

const DAYS = ['月', '火', '水', '木', '金', '土', '日']

export default function PatientMyPage() {
  const user = getUser()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<Profile>>({})
  const [symptomForms, setSymptomForms] = useState<SymptomDetail[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchProfile = () =>
    apiFetch('/client/profile')
      .then((r) => r.json())
      .then((d) => {
        const merged = { ...d.patient, ...d.profile, symptom_details: d.symptoms, addictions: d.addictions }
        setProfile(merged)
        setForm(merged)
        setSymptomForms(d.symptoms.length > 0 ? d.symptoms : d.addictions.map((a: { addiction_id: number }) => ({
          addiction_id: a.addiction_id, severity: '', start_date: '', frequency: '',
          difficulties: '', trouble: '', methods: '', goal: '', supplement: ''
        })))
      })
      .finally(() => setLoading(false))

  useEffect(() => { fetchProfile() }, [])

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }))

  const setSymptom = (idx: number, key: string, val: string) =>
    setSymptomForms((prev) => prev.map((s, i) => i === idx ? { ...s, [key]: val } : s))

  const handleSave = async () => {
    setSaving(true)
    await apiFetch('/client/profile', {
      method: 'PATCH',
      body: JSON.stringify({ ...form, symptom_details: symptomForms }),
    })
    await fetchProfile()
    setEditing(false)
    setSaving(false)
  }

  if (loading) return <p>読み込み中...</p>

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.heading}>マイページ</h1>
        {!editing && <button className={styles.editBtn} onClick={() => setEditing(true)}>編集</button>}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>基本情報</h2>
        <div className={styles.grid}>
          {[
            { label: '氏名', key: 'full_name' },
            { label: '年齢', key: 'age' },
            { label: '住所', key: 'address' },
            { label: '職業', key: 'profession' },
            { label: '職歴', key: 'work_history' },
            { label: '趣味', key: 'interests' },
            { label: '生活リズム', key: 'daily_rhythm' },
            { label: '人間関係', key: 'personal_relations' },
            { label: '目標', key: 'goals' },
            { label: '補足', key: 'supplement' },
            { label: '子供の頃の過酷な経験', key: 'harsh_childhood' },
            { label: '犯罪歴・補導歴', key: 'criminal_record' },
            { label: 'その他のトラウマ', key: 'other_traumas' },
          ].map(({ label, key }) => (
            <div key={key} className={styles.field}>
              <label className={styles.label}>{label}</label>
              {editing ? (
                <textarea className={styles.textarea} value={(form as Record<string, string>)[key] ?? ''} onChange={(e) => set(key, e.target.value)} rows={2} />
              ) : (
                <p className={styles.value}>{(profile as unknown as Record<string, string>)[key] || '—'}</p>
              )}
            </div>
          ))}

          <div className={styles.field}>
            <label className={styles.label}>性別</label>
            {editing ? (
              <select className={styles.select} value={form.sex ?? 0} onChange={(e) => set('sex', e.target.value)}>
                <option value={0}>未選択</option>
                <option value={1}>男性</option>
                <option value={2}>女性</option>
                <option value={3}>その他</option>
              </select>
            ) : (
              <p className={styles.value}>{profile?.sex === 1 ? '男性' : profile?.sex === 2 ? '女性' : profile?.sex === 3 ? 'その他' : '—'}</p>
            )}
          </div>
        </div>
      </div>

      {(profile?.addictions ?? []).length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>症状カテゴリー別情報</h2>
          {symptomForms.map((s, idx) => {
            const name = profile?.addictions.find((a) => a.addiction_id === s.addiction_id)?.addictions?.name ?? ''
            return (
              <div key={s.addiction_id} className={styles.symptomBlock}>
                <h3 className={styles.symptomTitle}>{name}に関する悩み</h3>
                <div className={styles.grid}>
                  {[
                    { label: '重症度', key: 'severity' },
                    { label: '症状の開始日', key: 'start_date' },
                    { label: '頻度', key: 'frequency' },
                    { label: '生活上困っていること', key: 'difficulties' },
                    { label: '症状によるトラブル', key: 'trouble' },
                    { label: '行動の方法', key: 'methods' },
                    { label: '症状に関する目標', key: 'goal' },
                    { label: '補足', key: 'supplement' },
                  ].map(({ label, key }) => (
                    <div key={key} className={styles.field}>
                      <label className={styles.label}>{label}</label>
                      {editing ? (
                        <textarea className={styles.textarea} value={(s as unknown as Record<string, string>)[key] ?? ''} onChange={(e) => setSymptom(idx, key, e.target.value)} rows={2} />
                      ) : (
                        <p className={styles.value}>{(s as unknown as Record<string, string>)[key] || '—'}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editing && (
        <div className={styles.actions}>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>{saving ? '保存中...' : '保存'}</button>
          <button className={styles.cancelBtn} onClick={() => setEditing(false)}>キャンセル</button>
        </div>
      )}
    </div>
  )
}
