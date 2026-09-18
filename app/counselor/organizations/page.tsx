'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/auth-client'
import styles from './organizations.module.css'

type Org = { id: number; name: string; description: string }
type Group = { id: number; organization_id: number | null; name: string; description: string }
type Member = { id: string; full_name: string; nickname: string | null }
type GroupMembers = Record<number, Member[]>

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Org[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [allPatients, setAllPatients] = useState<Member[]>([])
  const [groupMembers, setGroupMembers] = useState<GroupMembers>({})
  const [loading, setLoading] = useState(true)
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null)
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null)

  const [showOrgForm, setShowOrgForm] = useState(false)
  const [editOrgId, setEditOrgId] = useState<number | null>(null)
  const [orgForm, setOrgForm] = useState({ name: '', description: '' })

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
    setOrgs(data.organizations ?? [])
    setGroups(data.groups ?? [])
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

  const handleSaveOrg = async () => {
    setError('')
    if (!orgForm.name.trim()) { setError('組織名は必須です'); return }
    setSaving(true)
    if (editOrgId) {
      await apiFetch('/counselor/organizations', {
        method: 'PATCH',
        body: JSON.stringify({ id: editOrgId, name: orgForm.name, description: orgForm.description }),
      })
    } else {
      const res = await apiFetch('/counselor/organizations', {
        method: 'POST',
        body: JSON.stringify({ name: orgForm.name, description: orgForm.description }),
      })
      const data = await res.json()
      if (data.organization) setSelectedOrgId(data.organization.id)
    }
    setShowOrgForm(false)
    setEditOrgId(null)
    setOrgForm({ name: '', description: '' })
    await fetchData()
    setSaving(false)
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
        body: JSON.stringify({ action: 'create_group', organization_id: selectedOrgId, name: groupForm.name, description: groupForm.description }),
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

  const selectedOrg = orgs.find((o) => o.id === selectedOrgId)
  const orgGroups = groups.filter((g) => g.organization_id === selectedOrgId)

  if (loading) return <p>読み込み中...</p>

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.heading}>組織・グループ管理</h1>
        <button className={styles.addBtn} onClick={() => { setShowOrgForm(true); setEditOrgId(null); setOrgForm({ name: '', description: '' }) }}>
          + 組織を追加
        </button>
      </div>

      {showOrgForm && (
        <div className={styles.form} style={{ marginBottom: 20, maxWidth: 480 }}>
          <p className={styles.formTitle}>{editOrgId ? '組織を編集' : '新しい組織を追加'}</p>
          <input className={styles.input} placeholder="組織名" value={orgForm.name} onChange={(e) => setOrgForm((f) => ({ ...f, name: e.target.value }))} />
          <input className={styles.input} placeholder="説明（任意）" value={orgForm.description} onChange={(e) => setOrgForm((f) => ({ ...f, description: e.target.value }))} />
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.formActions}>
            <button className={styles.saveBtn} onClick={handleSaveOrg} disabled={saving}>{saving ? '保存中...' : '保存'}</button>
            <button className={styles.cancelBtn} onClick={() => { setShowOrgForm(false); setError('') }}>キャンセル</button>
          </div>
        </div>
      )}

      <div className={styles.layout}>
        <div className={styles.sidebar}>
          {orgs.length === 0 && <p className={styles.noOrg}>組織が登録されていません</p>}
          {orgs.map((org) => (
            <div
              key={org.id}
              className={`${styles.orgCard} ${selectedOrgId === org.id ? styles.active : ''}`}
              onClick={() => { setSelectedOrgId(org.id); setExpandedGroupId(null) }}
            >
              <p className={styles.orgName}>{org.name}</p>
              <p className={styles.orgMeta}>{groups.filter((g) => g.organization_id === org.id).length}グループ</p>
            </div>
          ))}
        </div>

        <div className={styles.detail}>
          {!selectedOrg ? (
            <p className={styles.placeholder}>左の組織を選択してください</p>
          ) : (
            <>
              <div className={styles.detailHeader}>
                <h2 className={styles.detailName}>{selectedOrg.name}</h2>
                <button className={styles.editBtn} onClick={() => { setEditOrgId(selectedOrg.id); setOrgForm({ name: selectedOrg.name, description: selectedOrg.description ?? '' }); setShowOrgForm(true) }}>編集</button>
              </div>

              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>グループ一覧</span>
                <button className={styles.smallBtn} onClick={() => { setShowGroupForm(true); setEditGroupId(null); setGroupForm({ name: '', description: '' }) }}>+ グループを追加</button>
              </div>

              {showGroupForm && (
                <div className={styles.form}>
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

              <div className={styles.groupList}>
                {orgGroups.length === 0 && <p className={styles.noGroup}>グループが登録されていません</p>}
                {orgGroups.map((group) => {
                  const members = groupMembers[group.id] ?? []
                  const isExpanded = expandedGroupId === group.id
                  const currentMembers = groupMembers[group.id]
                  const nonMembers = allPatients.filter((p) => !members.some((m) => m.id === p.id))

                  return (
                    <div key={group.id} className={styles.groupRow}>
                      <div className={styles.groupRowHeader} onClick={() => toggleGroup(group.id)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span className={styles.groupRowName}>{group.name}</span>
                          <button className={styles.editBtn} onClick={(e) => { e.stopPropagation(); setEditGroupId(group.id); setGroupForm({ name: group.name, description: group.description ?? '' }); setShowGroupForm(true) }}>編集</button>
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
                                <button className={styles.removeBtn} onClick={() => handleRemoveMember(group.id, m.id)}>削除</button>
                              </div>
                            ))}
                          </div>

                          {addMemberGroupId === group.id ? (
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
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
