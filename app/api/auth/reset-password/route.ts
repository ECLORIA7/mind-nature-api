import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { access_token, new_password } = body

  if (!access_token || !new_password) {
    return Response.json({ error: 'access_token と new_password は必須です' }, { status: 400 })
  }
  if (String(new_password).length < 8) {
    return Response.json({ error: 'パスワードは8文字以上にしてください' }, { status: 400 })
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(access_token)
  if (error || !user) {
    return Response.json({ error: 'リンクが無効または期限切れです' }, { status: 400 })
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    password: new_password,
  })
  if (updateError) {
    return Response.json({ error: 'パスワードの更新に失敗しました' }, { status: 500 })
  }

  return Response.json({ message: 'パスワードを更新しました' })
}
