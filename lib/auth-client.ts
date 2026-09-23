'use client'

export type User = {
  id: string
  email: string
  role: 'patient' | 'counselor' | 'admin'
  full_name: string
  hospital_id: number | null
  profile_completed?: boolean
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')
}

export function saveSession(data: { access_token: string; refresh_token: string; user: User }) {
  localStorage.setItem('access_token', data.access_token)
  localStorage.setItem('refresh_token', data.refresh_token)
  localStorage.setItem('user', JSON.stringify(data.user))
}

export function clearSession() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
}

function buildHeaders(token: string | null, extra?: HeadersInit): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra ?? {}),
  }
}

let refreshing: Promise<string | null> | null = null

async function tryRefresh(): Promise<string | null> {
  if (refreshing) return refreshing
  refreshing = (async () => {
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) return null
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
      if (!res.ok) return null
      const data = await res.json()
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      return data.access_token as string
    } catch {
      return null
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken()
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: buildHeaders(token, options.headers as HeadersInit),
  })

  if (res.status === 401) {
    const newToken = await tryRefresh()
    if (newToken) {
      return fetch(`/api${path}`, {
        ...options,
        headers: buildHeaders(newToken, options.headers as HeadersInit),
      })
    }
    clearSession()
    window.location.href = '/login'
  }

  return res
}
