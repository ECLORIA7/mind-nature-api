'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getUser, clearSession } from '@/lib/auth-client'
import styles from './counselor.module.css'

export default function CounselorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const user = getUser()
    if (!user) { router.push('/login'); return }
    if (user.role === 'patient') { router.push('/patient/todo'); return }
  }, [router])

  useEffect(() => { setMenuOpen(false) }, [pathname])

  const handleLogout = () => {
    clearSession()
    router.push('/login')
  }

  const links = [
    { href: '/counselor/patients', label: 'クライアント一覧', active: pathname.startsWith('/counselor/patients') },
    { href: '/counselor/clients', label: '一覧（管理者）', active: pathname.startsWith('/counselor/clients') },
    { href: '/counselor/register', label: 'クライアント登録', active: pathname === '/counselor/register' },
    { href: '/counselor/organizations', label: 'グループ', active: pathname.startsWith('/counselor/organizations') || pathname.startsWith('/counselor/group-chat') },
    { href: '/counselor/mypage', label: 'マイページ', active: pathname === '/counselor/mypage' },
  ]

  return (
    <div className={styles.wrapper}>
      <nav className={styles.nav}>
        <span className={styles.logo}>Mind Nature</span>
        <div className={styles.navLinks}>
          {links.map((l) => (
            <a key={l.href} href={l.href} className={l.active ? styles.active : ''}>{l.label}</a>
          ))}
          <button onClick={handleLogout} className={styles.logout}>ログアウト</button>
        </div>
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
