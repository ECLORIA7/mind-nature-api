'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { getUser, clearSession } from '@/lib/auth-client'
import styles from './patient.module.css'

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const user = getUser()
    if (!user) {
      router.replace('/login')
    } else if (user.role !== 'patient') {
      router.replace('/counselor/patients')
    }
  }, [router])

  useEffect(() => { setMenuOpen(false) }, [pathname])

  const handleLogout = () => {
    clearSession()
    router.replace('/login')
  }

  const links = [
    { href: '/patient/todo', label: 'ToDo', active: pathname === '/patient/todo' },
    { href: '/patient/behavior', label: '行動の記録', active: pathname.startsWith('/patient/behavior') },
    { href: '/patient/tests', label: 'テスト', active: pathname.startsWith('/patient/tests') },
    { href: '/patient/chat', label: 'チャット', active: pathname === '/patient/chat' },
    { href: '/patient/groups', label: 'グループ', active: pathname.startsWith('/patient/groups') || pathname.startsWith('/patient/group-chat') },
    { href: '/patient/mypage', label: 'マイページ', active: pathname === '/patient/mypage' },
  ]

  return (
    <div className={styles.wrapper}>
      <nav className={styles.nav}>
        <span className={styles.brand}>MindNature</span>
        <div className={styles.links}>
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={l.active ? styles.active : styles.link}>{l.label}</Link>
          ))}
        </div>
        <button onClick={handleLogout} className={styles.logout}>ログアウト</button>
        <button className={styles.hamburger} onClick={() => setMenuOpen((o) => !o)} aria-label="メニュー">
          <span /><span /><span />
        </button>
      </nav>

      <div className={`${styles.mobileMenu} ${menuOpen ? styles.open : ''}`}>
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={l.active ? styles.active : ''}>{l.label}</Link>
        ))}
        <button onClick={handleLogout} className={styles.mobileLogout}>ログアウト</button>
      </div>

      <main className={styles.main}>{children}</main>
    </div>
  )
}
