import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthUser, requireAuth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireAuth(user)
  if (authError) return authError

  await supabase.auth.signOut()

  return Response.json({ message: 'ログアウトしました' })
}
