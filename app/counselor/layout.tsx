'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getUser, clearSession } from '@/lib/auth-client'
import styles from './counselor.module.css'

export default function CounselorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const user = getUser()
    if (!user) { router.push('/login'); return }
    if (user.role === 'patient') { router.push('/patient/todo'); return }
  }, [router])

  const handleLogout = () => {
    clearSession()
    router.push('/login')
  }

  return (
    <div className={styles.wrapper}>
      <nav className={styles.nav}>
        <span className={styles.logo}>Mind Nature</span>
        <div className={styles.navLinks}>
          <a href="/counselor/patients" className={pathname === '/counselor/patients' ? styles.active : ''}>患者一覧</a>
          <a href="/counselor/mypage" className={pathname === '/counselor/mypage' ? styles.active : ''}>マイページ</a>
          <button onClick={handleLogout} className={styles.logout}>ログアウト</button>
        </div>
      </nav>
      <main className={styles.main}>{children}</main>
    </div>
  )
}
