import { NextRequest } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { current_password, new_password } = body

  if (!current_password || !new_password) {
    return Response.json({ error: '現在のパスワードと新しいパスワードは必須です' }, { status: 400 })
  }
  if (String(new_password).length < 8) {
    return Response.json({ error: 'パスワードは8文字以上にしてください' }, { status: 400 })
  }

  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id)
  const email = authUser?.user?.email
  if (!email) return Response.json({ error: 'ユーザーが見つかりません' }, { status: 404 })

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: current_password })
  if (signInError) {
    return Response.json({ error: '現在のパスワードが正しくありません' }, { status: 400 })
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    password: new_password,
  })
  if (updateError) {
    return Response.json({ error: 'パスワードの更新に失敗しました' }, { status: 500 })
  }

  return Response.json({ message: 'パスワードを変更しました' })
}
