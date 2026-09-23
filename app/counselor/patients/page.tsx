'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/auth-client'
import styles from './patients.module.css'

const BEHAVIOR_TYPES = [
  { value: 'alcohol', label: '飲酒' },
  { value: 'smoking', label: '禁煙' },
  { value: 'gambling', label: 'ギャンブル' },
  { value: 'other', label: 'その他' },
]

type Addiction = { addiction_id: number; behavior_type: string; addictions: { name: string } }
type Patient = {
  id: string
  age: string | null
  sex: number
  furigana: string | null
  profiles: { full_name: string; hospital_id: number }
  patient_addictions: Addiction[]
}
type EditForm = { full_name: string; furigana: string; age: string; sex: string }

export default function PatientsPage() {
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('')
  const [editTarget, setEditTarget] = useState<Patient | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ full_name: '', furigana: '', age: '', sex: '' })
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const fetchPatients = () =>
    apiFetch('/counselor/patients')
      .then((r) => r.json())
      .then((d) => setPatients(d.patients ?? []))
      .finally(() => setLoading(false))

  useEffect(() => { fetchPatients() }, [])

  const openEdit = (p: Patient, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditTarget(p)
    setEditForm({
      full_name: p.profiles?.full_name ?? '',
      furigana: p.furigana ?? '',
      age: p.age ?? '',
      sex: String(p.sex ?? ''),
    })
    setEditError('')
  }

  const handleSave = async () => {
    if (!editTarget) return
    setSaving(true)
    setEditError('')
    const res = await apiFetch('/counselor/patient', {
      method: 'PATCH',
      body: JSON.stringify({
        patient_id: editTarget.id,
        full_name: editForm.full_name || undefined,
        furigana: editForm.furigana || undefined,
        age: editForm.age || undefined,
        sex: editForm.sex ? Number(editForm.sex) : undefined,
      }),
    })
    if (!res.ok) { setEditError('保存に失敗しました'); setSaving(false); return }
    setEditTarget(null)
    setLoading(true)
    await fetchPatients()
    setSaving(false)
  }

  const behaviorLabel = (type: string) => BEHAVIOR_TYPES.find((t) => t.value === type)?.label ?? type

  const filteredPatients = filterType
    ? patients.filter((p) => p.patient_addictions?.some((pa) => pa.behavior_type === filterType))
    : patients

  if (loading) return <p>読み込み中...</p>

  return (
    <div>
      <h1 className={styles.heading}>患者一覧</h1>

      {/* カテゴリーフィルター */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilterType('')}
          style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid #e2e8f0', background: filterType === '' ? '#1e293b' : '#f8fafc', color: filterType === '' ? '#fff' : '#374151', fontSize: 13, cursor: 'pointer' }}
        >
          すべて
        </button>
        {BEHAVIOR_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setFilterType(t.value)}
            style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid #e2e8f0', background: filterType === t.value ? '#1e293b' : '#f8fafc', color: filterType === t.value ? '#fff' : '#374151', fontSize: 13, cursor: 'pointer' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filteredPatients.length === 0 ? (
        <p className={styles.empty}>患者が登録されていません</p>
      ) : (
        <div className={styles.grid}>
          {filteredPatients.map((p) => (
            <div key={p.id} style={{ position: 'relative' }}>
              <div className={styles.card} onClick={() => router.push(`/preview/${p.id}`)} style={{ cursor: 'pointer' }}>
                <h2 className={styles.name}>{p.profiles?.full_name}</h2>
                {p.furigana && <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>{p.furigana}</p>}
                <p className={styles.meta}>{p.age ? `${p.age}歳` : ''} {p.sex === 1 ? '男性' : p.sex === 2 ? '女性' : ''}</p>
                <div className={styles.tags}>
                  {p.patient_addictions?.map((pa) => (
                    <span key={pa.addiction_id} className={styles.tag}>
                      {pa.addictions?.name}（{behaviorLabel(pa.behavior_type ?? 'other')}）
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 6 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); router.push(`/counselor/patients/${p.id}`) }}
                  style={{ background: '#1e40af', border: 'none', borderRadius: 6, padding: '3px 10px', fontSize: 12, color: '#fff', cursor: 'pointer' }}
                >
                  詳細
                </button>
                <button
                  onClick={(e) => openEdit(p, e)}
                  style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: 6, padding: '3px 10px', fontSize: 12, color: '#64748b', cursor: 'pointer' }}
                >
                  編集
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 420 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: '#1e293b' }}>患者情報の編集</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: '氏名', key: 'full_name', placeholder: '' },
                { label: 'ふりがな', key: 'furigana', placeholder: '' },
                { label: '年齢', key: 'age', placeholder: '例: 35' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>{label}</label>
                  <input
                    value={editForm[key as keyof EditForm]}
                    onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }}
                  />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>性別</label>
                <select
                  value={editForm.sex}
                  onChange={(e) => setEditForm((f) => ({ ...f, sex: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 14 }}
                >
                  <option value="">未設定</option>
                  <option value="1">男性</option>
                  <option value="2">女性</option>
                  <option value="3">その他</option>
                </select>
              </div>
            </div>
            {editError && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 8 }}>{editError}</p>}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={handleSave} disabled={saving} style={{ flex: 1, background: '#1e40af', color: 'white', border: 'none', borderRadius: 10, padding: '12px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                {saving ? '保存中...' : '保存'}
              </button>
              <button onClick={() => setEditTarget(null)} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 10, padding: '12px', fontSize: 15, cursor: 'pointer' }}>
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
