'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/auth-client'
import styles from './organizations.module.css'

type Group = { id: number; organization_id: number | null; name: string; description: string }
type Member = { id: string; full_name: string; nickname: string | null }
type GroupMembers = Record<number, Member[]>

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [allPatients, setAllPatients] = useState<Member[]>([])
  const [groupMembers, setGroupMembers] = useState<GroupMembers>({})
  const [loading, setLoading] = useState(true)
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null)
  const [viewerRank, setViewerRank] = useState<number>(1)
  const [viewerRole, setViewerRole] = useState<string>('')

  const [showGroupForm, setShowGroupForm] = useState(false)
  const [editGroupId, setEditGroupId] = useState<number | null>(null)
  const [groupForm, setGroupForm] = useState({ name: '', description: '' })

  const [addMemberGroupId, setAddMemberGroupId] = useState<number | null>(null)
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    const res = await apiFetch('/counselor/organizations')
    const data = await res.json()
    setGroups(data.groups ?? [])
    setViewerRole(data.viewer_role ?? '')
    setViewerRank(data.viewer_rank ?? 1)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const fetchGroupMembers = async (groupId: number) => {
    const res = await apiFetch(`/counselor/group-members?group_id=${groupId}`)
    const data = await res.json()
    setGroupMembers((prev) => ({ ...prev, [groupId]: data.members ?? [] }))
    setAllPatients(data.all_patients ?? [])
  }

  const toggleGroup = async (groupId: number) => {
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null)
    } else {
      setExpandedGroupId(groupId)
      await fetchGroupMembers(groupId)
    }
  }

  const handleSaveGroup = async () => {
    setError('')
    if (!groupForm.name.trim()) { setError('グループ名は必須です'); return }
    setSaving(true)
    if (editGroupId) {
      await apiFetch('/counselor/organizations', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'update_group', id: editGroupId, name: groupForm.name, description: groupForm.description }),
      })
    } else {
      await apiFetch('/counselor/organizations', {
        method: 'POST',
        body: JSON.stringify({ action: 'create_group', name: groupForm.name, description: groupForm.description }),
      })
    }
    setShowGroupForm(false)
    setEditGroupId(null)
    setGroupForm({ name: '', description: '' })
    await fetchData()
    setSaving(false)
  }

  const handleAddMember = async (groupId: number) => {
    if (!selectedPatientId) return
    await apiFetch('/counselor/group-members', {
      method: 'POST',
      body: JSON.stringify({ group_id: groupId, patient_id: selectedPatientId }),
    })
    setSelectedPatientId('')
    setAddMemberGroupId(null)
    await fetchGroupMembers(groupId)
  }

  const handleRemoveMember = async (groupId: number, patientId: string) => {
    await apiFetch('/counselor/group-members', {
      method: 'POST',
      body: JSON.stringify({ group_id: groupId, patient_id: patientId, action: 'remove' }),
    })
    await fetchGroupMembers(groupId)
  }

  const canEdit = viewerRole === 'admin' || viewerRank === 0

  if (loading) return <p>読み込み中...</p>

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.heading}>グループ管理</h1>
        {canEdit && (
          <button className={styles.addBtn} onClick={() => { setShowGroupForm(true); setEditGroupId(null); setGroupForm({ name: '', description: '' }) }}>
            + グループを追加
          </button>
        )}
      </div>

      {showGroupForm && (
        <div className={styles.form} style={{ marginBottom: 20, maxWidth: 480 }}>
          <p className={styles.formTitle}>{editGroupId ? 'グループを編集' : '新しいグループを追加'}</p>
          <input className={styles.input} placeholder="グループ名" value={groupForm.name} onChange={(e) => setGroupForm((f) => ({ ...f, name: e.target.value }))} />
          <input className={styles.input} placeholder="説明（任意）" value={groupForm.description} onChange={(e) => setGroupForm((f) => ({ ...f, description: e.target.value }))} />
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.formActions}>
            <button className={styles.saveBtn} onClick={handleSaveGroup} disabled={saving}>{saving ? '保存中...' : '保存'}</button>
            <button className={styles.cancelBtn} onClick={() => { setShowGroupForm(false); setError('') }}>キャンセル</button>
          </div>
        </div>
      )}

      <div className={styles.groupList} style={{ maxWidth: 640 }}>
        {groups.length === 0 && <p className={styles.noGroup}>グループが登録されていません</p>}
        {groups.map((group) => {
          const members = groupMembers[group.id] ?? []
          const isExpanded = expandedGroupId === group.id
          const currentMembers = groupMembers[group.id]
          const nonMembers = allPatients.filter((p) => !members.some((m) => m.id === p.id))

          return (
            <div key={group.id} className={styles.groupRow}>
              <div className={styles.groupRowHeader} onClick={() => toggleGroup(group.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className={styles.groupRowName}>{group.name}</span>
                  {canEdit && (
                    <button className={styles.editBtn} onClick={(e) => { e.stopPropagation(); setEditGroupId(group.id); setGroupForm({ name: group.name, description: group.description ?? '' }); setShowGroupForm(true) }}>編集</button>
                  )}
                  <a href={`/counselor/group-chat/${group.id}`} style={{ fontSize: 12, color: '#1e40af', textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>チャットへ</a>
                </div>
                <span className={styles.groupRowCount}>{isExpanded && currentMembers ? `${currentMembers.length}名` : '▼'}</span>
              </div>

              {isExpanded && (
                <div className={styles.groupDetail}>
                  <div className={styles.memberList}>
                    {members.length === 0 && <p style={{ color: '#94a3b8', fontSize: 13 }}>メンバーがいません</p>}
                    {members.map((m) => (
                      <div key={m.id} className={styles.memberRow}>
                        <span>
                          <span className={styles.memberName}>{m.full_name}</span>
                          {m.nickname && <span className={styles.memberNickname}>（{m.nickname}）</span>}
                        </span>
                        {canEdit && (
                          <button className={styles.removeBtn} onClick={() => handleRemoveMember(group.id, m.id)}>削除</button>
                        )}
                      </div>
                    ))}
                  </div>

                  {canEdit && (
                    addMemberGroupId === group.id ? (
                      <div className={styles.addMemberRow}>
                        <select className={styles.select} value={selectedPatientId} onChange={(e) => setSelectedPatientId(e.target.value)}>
                          <option value="">クライアントを選択</option>
                          {nonMembers.map((p) => (
                            <option key={p.id} value={p.id}>{p.full_name}{p.nickname ? `（${p.nickname}）` : ''}</option>
                          ))}
                        </select>
                        <button className={styles.addMemberBtn} onClick={() => handleAddMember(group.id)}>追加</button>
                        <button className={styles.cancelBtn} onClick={() => { setAddMemberGroupId(null); setSelectedPatientId('') }}>閉じる</button>
                      </div>
                    ) : (
                      <button className={styles.smallBtn} onClick={() => { setAddMemberGroupId(group.id); setSelectedPatientId('') }}>+ メンバーを追加</button>
                    )
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
