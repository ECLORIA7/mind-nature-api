import { NextRequest } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const email = body.email?.trim()
  const password = body.password

  if (!email || !password) {
    return Response.json({ error: 'email と password は必須です' }, { status: 400 })
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.session) {
    return Response.json({ error: 'メールアドレスまたはパスワードが間違っています' }, { status: 401 })
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, hospital_id, full_name')
    .eq('id', data.user.id)
    .single()

  if (!profile) {
    return Response.json({ error: 'プロフィールが見つかりません' }, { status: 404 })
  }

  return Response.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
    user: {
      id: data.user.id,
      email: data.user.email,
      role: profile.role,
      full_name: profile.full_name,
      hospital_id: profile.hospital_id,
    },
  })
}
