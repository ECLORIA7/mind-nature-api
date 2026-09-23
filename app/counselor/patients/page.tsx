'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/auth-client'
import styles from './patients.module.css'

type Addiction = { addiction_id: number; addictions: { name: string } }
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
    if (!res.ok) {
      setEditError('保存に失敗しました')
      setSaving(false)
      return
    }
    setEditTarget(null)
    setLoading(true)
    await fetchPatients()
    setSaving(false)
  }

  if (loading) return <p>読み込み中...</p>

  return (
    <div>
      <h1 className={styles.heading}>患者一覧</h1>
      {patients.length === 0 ? (
        <p className={styles.empty}>患者が登録されていません</p>
      ) : (
        <div className={styles.grid}>
          {patients.map((p) => (
            <div key={p.id} style={{ position: 'relative' }}>
              <div className={styles.card} onClick={() => router.push(`/preview/${p.id}`)} style={{ cursor: 'pointer' }}>
                <h2 className={styles.name}>{p.profiles?.full_name}</h2>
                {p.furigana && <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>{p.furigana}</p>}
                <p className={styles.meta}>{p.age ? `${p.age}歳` : ''} {p.sex === 1 ? '男性' : p.sex === 2 ? '女性' : ''}</p>
                <div className={styles.tags}>
                  {p.patient_addictions?.map((pa) => (
                    <span key={pa.addiction_id} className={styles.tag}>{pa.addictions?.name}に関する悩み</span>
                  ))}
                </div>
              </div>
              <button
                onClick={(e) => openEdit(p, e)}
                style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: '1px solid #cbd5e1', borderRadius: 6, padding: '3px 10px', fontSize: 12, color: '#64748b', cursor: 'pointer' }}
              >
                編集
              </button>
            </div>
          ))}
        </div>
      )}

      {editTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 420 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: '#1e293b' }}>患者情報の編集</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>氏名</label>
                <input
                  value={editForm.full_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>ふりがな</label>
                <input
                  value={editForm.furigana}
                  onChange={(e) => setEditForm((f) => ({ ...f, furigana: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>年齢</label>
                <input
                  value={editForm.age}
                  onChange={(e) => setEditForm((f) => ({ ...f, age: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }}
                  placeholder="例: 35"
                />
              </div>
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
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ flex: 1, background: '#1e40af', color: 'white', border: 'none', borderRadius: 10, padding: '12px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
              >
                {saving ? '保存中...' : '保存'}
              </button>
              <button
                onClick={() => setEditTarget(null)}
                style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 10, padding: '12px', fontSize: 15, cursor: 'pointer' }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
