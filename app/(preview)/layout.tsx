'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getUser } from '@/lib/auth-client'

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    const user = getUser()
    if (!user) { router.replace('/login'); return }
    if (user.role === 'patient') { router.replace('/patient/todo'); return }
  }, [router])

  return <>{children}</>
}
