import { NextRequest } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const email = String(body.email ?? '').trim()
  if (!email) return Response.json({ error: 'email は必須です' }, { status: 400 })

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: 'https://app.mind-nature.net/reset-password' },
  })

  if (error || !data?.properties?.action_link) {
    // メールが存在しない場合も成功を返す（セキュリティのため）
    return Response.json({ message: '送信しました' })
  }

  await resend.emails.send({
    from: 'MindNature <noreply@mind-nature.net>',
    to: email,
    subject: 'MindNature パスワード再設定のご案内',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#1e40af;">パスワードの再設定</h2>
        <p>パスワード再設定のリクエストを受け付けました。</p>
        <p>下のボタンをクリックして、新しいパスワードを設定してください。</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${data.properties.action_link}"
            style="background:#1e40af;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-size:16px;font-weight:600;">
            パスワードを再設定する
          </a>
        </div>
        <p style="color:#94a3b8;font-size:12px;">
          このリンクは1時間で失効します。<br>
          心当たりがない場合はこのメールを無視してください。
        </p>
      </div>
    `,
  })

  return Response.json({ message: '送信しました' })
}
