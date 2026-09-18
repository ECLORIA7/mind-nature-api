'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getUser, clearSession } from '@/lib/auth-client'
import styles from './operator.module.css'

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const user = getUser()
    if (!user) { router.replace('/login'); return }
    if (user.role !== 'admin') { router.replace('/login'); return }
  }, [router])

  useEffect(() => { setMenuOpen(false) }, [pathname])

  const handleLogout = () => {
    clearSession()
    router.replace('/login')
  }

  const links = [
    { href: '/operator/teams', label: 'チーム管理', active: pathname.startsWith('/operator/teams') },
    { href: '/operator/counselors', label: 'カウンセラー管理', active: pathname.startsWith('/operator/counselors') },
    { href: '/operator/clients', label: 'クライアント一覧', active: pathname.startsWith('/operator/clients') },
  ]

  return (
    <div className={styles.wrapper}>
      <nav className={styles.nav}>
        <span className={styles.brand}>MindNature 運営</span>
        <div className={styles.links}>
          {links.map((l) => (
            <a key={l.href} href={l.href} className={l.active ? styles.active : styles.link}>{l.label}</a>
          ))}
        </div>
        <button onClick={handleLogout} className={styles.logout}>ログアウト</button>
        <button className={styles.hamburger} onClick={() => setMenuOpen((o) => !o)} aria-label="メニュー">
          <span /><span /><span />
        </button>
      </nav>

      <div className={`${styles.mobileMenu} ${menuOpen ? styles.open : ''}`}>
        {links.map((l) => (
          <a key={l.href} href={l.href} className={l.active ? styles.active : ''}>{l.label}</a>
        ))}
        <button onClick={handleLogout} className={styles.mobileLogout}>ログアウト</button>
      </div>

      <main className={styles.main}>{children}</main>
    </div>
  )
}
