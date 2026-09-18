'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { getUser, clearSession } from '@/lib/auth-client'
import styles from './operator.module.css'

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const user = getUser()
    if (!user) { router.replace('/login'); return }
    if (user.role !== 'admin') { router.replace('/login'); return }
  }, [router])

  const handleLogout = () => {
    clearSession()
    router.replace('/login')
  }

  return (
    <div className={styles.wrapper}>
      <nav className={styles.nav}>
        <span className={styles.brand}>MindNature 運営</span>
        <div className={styles.links}>
          <Link href="/operator/teams" className={pathname.startsWith('/operator/teams') ? styles.active : styles.link}>チーム管理</Link>
          <Link href="/operator/counselors" className={pathname.startsWith('/operator/counselors') ? styles.active : styles.link}>カウンセラー管理</Link>
        </div>
        <button onClick={handleLogout} className={styles.logout}>ログアウト</button>
      </nav>
      <main className={styles.main}>{children}</main>
    </div>
  )
}
