'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/auth-client'
import styles from './groups.module.css'

type Group = {
  id: number
  name: string
  organization_id: number | null
  organizations: { name: string } | null
}

export default function PatientGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/patient/groups')
      .then((r) => r.json())
      .then((d) => setGroups(d.groups ?? []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p>読み込み中...</p>

  return (
    <div>
      <h1 className={styles.heading}>グループチャット</h1>
      {groups.length === 0 ? (
        <p className={styles.empty}>参加しているグループはありません</p>
      ) : (
        <div className={styles.list}>
          {groups.map((g) => (
            <a key={g.id} href={`/patient/group-chat/${g.id}`} className={styles.card}>
              <div className={styles.groupName}>{g.name}</div>
              {g.organizations && <div className={styles.orgName}>{g.organizations.name}</div>}
              <div className={styles.arrow}>→</div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
