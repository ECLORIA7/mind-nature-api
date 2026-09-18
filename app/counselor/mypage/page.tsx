'use client'

import { useEffect, useState } from 'react'
import { getUser, type User } from '@/lib/auth-client'
import styles from './mypage.module.css'

export default function CounselorMyPage() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    setUser(getUser())
  }, [])

  return (
    <div>
      <h1 className={styles.heading}>マイページ</h1>
      <div className={styles.card}>
        <p className={styles.role}>{user?.role === 'admin' ? '管理者' : 'カウンセラー'}</p>
        <h2 className={styles.name}>{user?.full_name}</h2>
        <p className={styles.email}>{user?.email}</p>
      </div>
    </div>
  )
}
