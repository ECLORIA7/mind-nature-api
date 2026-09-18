'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { getUser, clearSession } from '@/lib/auth-client'
import styles from './patient.module.css'

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const user = getUser()
    if (!user) {
      router.replace('/login')
    } else if (user.role !== 'patient') {
      router.replace('/counselor/patients')
    }
  }, [router])

  const handleLogout = () => {
    clearSession()
    router.replace('/login')
  }

  return (
    <div className={styles.wrapper}>
      <nav className={styles.nav}>
        <span className={styles.brand}>MindNature</span>
        <div className={styles.links}>
          <Link href="/patient/todo" className={pathname === '/patient/todo' ? styles.active : styles.link}>ToDo</Link>
          <Link href="/patient/chat" className={pathname === '/patient/chat' ? styles.active : styles.link}>チャット</Link>
          <Link href="/patient/mypage" className={pathname === '/patient/mypage' ? styles.active : styles.link}>マイページ</Link>
        </div>
        <button onClick={handleLogout} className={styles.logout}>ログアウト</button>
      </nav>
      <main className={styles.main}>{children}</main>
    </div>
  )
}
