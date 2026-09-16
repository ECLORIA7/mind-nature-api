import { NextRequest } from 'next/server'
import { supabaseAdmin } from './supabase'

export type AuthUser = {
  id: string
  email: string
  role: 'patient' | 'counselor' | 'admin'
  hospital_id: number | null
  full_name: string
}

export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, hospital_id, full_name')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  return {
    id: user.id,
    email: user.email!,
    role: profile.role,
    hospital_id: profile.hospital_id,
    full_name: profile.full_name,
  }
}

export function requireAuth(user: AuthUser | null) {
  if (!user) {
    return Response.json({ error: '認証が必要です' }, { status: 401 })
  }
  return null
}

export function requireCounselor(user: AuthUser | null) {
  if (!user) {
    return Response.json({ error: '認証が必要です' }, { status: 401 })
  }
  if (user.role === 'patient') {
    return Response.json({ error: 'カウンセラー権限が必要です' }, { status: 403 })
  }
  return null
}
