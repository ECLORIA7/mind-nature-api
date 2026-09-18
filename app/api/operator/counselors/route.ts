import { NextRequest } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser, requireOperator } from '@/lib/auth'

const resend = new Resend(process.env.RESEND_API_KEY)

function generatePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireOperator(user)
  if (authError) return authError

  const { data: counselors } = await supabaseAdmin
    .from('counselors')
    .select('id, rank, profiles(full_name, hospital_id, hospitals(name))')
    .order('rank')

  const ids = (counselors ?? []).map((c) => c.id)
  const emailMap: Record<string, string> = {}
  const createdAtMap: Record<string, string> = {}
  if (ids.length > 0) {
    for (const id of ids) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(id)
      if (authUser?.user) {
        emailMap[id] = authUser.user.email ?? ''
        createdAtMap[id] = authUser.user.created_at
      }
    }
  }

  const enriched = (counselors ?? []).map((c) => ({
    ...c,
    email: emailMap[c.id] ?? '',
    created_at: createdAtMap[c.id] ?? '',
  }))

  return Response.json({ counselors: enriched })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireOperator(user)
  if (authError) return authError

  const body = await req.json().catch(() => ({}))
  const email = String(body.email ?? '').trim()
  const name = String(body.name ?? '').trim()
  const hospital_id = body.hospital_id ? Number(body.hospital_id) : null
  const rank = body.rank !== undefined ? Number(body.rank) : 1

  if (!email || !name) return Response.json({ error: 'email と name は必須です' }, { status: 400 })

  const password = generatePassword()

  const { data: authData, error: authError2 } = await supabaseAdmin.auth.admin.createUser({
    email, password, email_confirm: true,
  })
  if (authError2) return Response.json({ error: authError2.message }, { status: 400 })

  const userId = authData.user.id

  await supabaseAdmin.from('profiles').insert({
    id: userId, role: 'counselor', full_name: name, hospital_id,
  })
  await supabaseAdmin.from('counselors').insert({ id: userId, rank })

  await resend.emails.send({
    from: 'MindNature <noreply@mind-nature.net>',
    to: email,
    cc: ['staff@mind-nature.net'],
    subject: 'MindNature カウンセラーアカウント登録のご案内',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#1e40af;">MindNature カウンセラー登録</h2>
        <p>${name} 様、カウンセラーアカウントが作成されました。</p>
        <div style="background:#eff6ff;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:0 0 8px;"><strong>ログインURL：</strong><br>
            <a href="https://app.mind-nature.net" style="color:#1e40af;">https://app.mind-nature.net</a>
          </p>
          <p style="margin:0 0 8px;"><strong>メールアドレス：</strong><br>${email}</p>
          <p style="margin:0;"><strong>仮パスワード：</strong><br>
            <span style="font-size:20px;font-weight:bold;color:#1e40af;">${password}</span>
          </p>
        </div>
        <p style="color:#94a3b8;font-size:12px;">このメールに心当たりがない場合はご連絡ください。</p>
      </div>
    `,
  })

  return Response.json({ message: 'カウンセラーアカウントを作成しました', temporary_password: password }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireOperator(user)
  if (authError) return authError

  const body = await req.json().catch(() => ({}))
  const { id, rank, hospital_id, name } = body

  if (!id) return Response.json({ error: 'id は必須です' }, { status: 400 })

  if (rank !== undefined) await supabaseAdmin.from('counselors').update({ rank }).eq('id', id)
  if (hospital_id !== undefined || name !== undefined) {
    await supabaseAdmin.from('profiles').update({
      ...(hospital_id !== undefined && { hospital_id }),
      ...(name !== undefined && { full_name: name }),
    }).eq('id', id)
  }

  return Response.json({ message: '更新しました' })
}
