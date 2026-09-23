import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { refresh_token } = body

  if (!refresh_token) {
    return Response.json({ error: 'refresh_token が必要です' }, { status: 400 })
  }

  const { data, error } = await supabase.auth.refreshSession({ refresh_token })
  if (error || !data.session) {
    return Response.json({ error: 'セッションの更新に失敗しました' }, { status: 401 })
  }

  return Response.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
  })
}
