import { NextRequest } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { new_email } = body

  if (!new_email?.trim()) {
    return Response.json({ error: '新しいメールアドレスは必須です' }, { status: 400 })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(new_email.trim())) {
    return Response.json({ error: '有効なメールアドレスを入力してください' }, { status: 400 })
  }

  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id)
  const oldEmail = authUser?.user?.email ?? ''

  if (oldEmail === new_email.trim()) {
    return Response.json({ error: '現在と同じメールアドレスです' }, { status: 400 })
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    email: new_email.trim(),
  })
  if (updateError) {
    return Response.json({ error: 'メールアドレスの更新に失敗しました' }, { status: 500 })
  }

  await resend.emails.send({
    from: 'MindNature <noreply@mind-nature.net>',
    to: 'staff@mind-nature.net',
    subject: '【MindNature】クライアントのメールアドレスが変更されました',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#15803d;">メールアドレス変更のお知らせ</h2>
        <p>クライアントがマイページからメールアドレスを変更しました。</p>
        <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:0 0 8px;"><strong>クライアント名：</strong>${profile?.full_name ?? '（未設定）'}</p>
          <p style="margin:0 0 8px;"><strong>変更前：</strong>${oldEmail}</p>
          <p style="margin:0;"><strong>変更後：</strong>${new_email.trim()}</p>
        </div>
        <p style="color:#94a3b8;font-size:12px;">このメールはシステムから自動送信されています。</p>
      </div>
    `,
  })

  return Response.json({ message: 'メールアドレスを変更しました' })
}
