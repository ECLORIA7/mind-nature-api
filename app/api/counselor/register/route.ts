import { NextRequest } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser, requireCounselor } from '@/lib/auth'

const resend = new Resend(process.env.RESEND_API_KEY)

function generatePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireCounselor(user)
  if (authError) return authError

  const body = await req.json().catch(() => ({}))
  const type = body.type

  if (!['patient', 'counselor'].includes(type)) {
    return Response.json({ error: 'type は patient または counselor を指定してください' }, { status: 400 })
  }

  if (type === 'patient') {
    return registerPatient(body, user!.hospital_id)
  } else {
    return registerCounselor(body, user!)
  }
}

async function registerPatient(body: Record<string, unknown>, hospitalId: number | null) {
  const email = String(body.email ?? '').trim()

  if (!email) {
    return Response.json({ error: 'email は必須です' }, { status: 400 })
  }

  const password = generatePassword()

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (authError) return Response.json({ error: authError.message }, { status: 400 })

  const userId = authData.user.id

  await supabaseAdmin.from('profiles').insert({
    id: userId,
    role: 'patient',
    full_name: '',
    hospital_id: hospitalId,
  })

  await supabaseAdmin.from('patients').insert({ id: userId, age: null, sex: 0, profile_completed: false })

  // カテゴリー登録（カウンセラーが事前設定）
  const addictions = body.addictions as { addiction_id: number; behavior_type: string }[] | undefined
  if (Array.isArray(addictions) && addictions.length > 0) {
    await supabaseAdmin.from('patient_addictions').insert(
      addictions.map((a) => ({ patient_id: userId, addiction_id: a.addiction_id, behavior_type: a.behavior_type }))
    )
  }

  await resend.emails.send({
    from: 'MindNature <noreply@mind-nature.net>',
    to: email,
    cc: ['staff@mind-nature.net'],
    subject: 'MindNature アカウント登録のご案内',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#15803d;">MindNature へようこそ</h2>
        <p>カウンセラーよりアカウントが作成されました。</p>
        <p>以下の情報でログインし、プロフィールを入力してください。</p>
        <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:0 0 8px;"><strong>ログインURL：</strong><br>
            <a href="https://app.mind-nature.net" style="color:#15803d;">https://app.mind-nature.net</a>
          </p>
          <p style="margin:0 0 8px;"><strong>メールアドレス：</strong><br>${email}</p>
          <p style="margin:0;"><strong>仮パスワード：</strong><br>
            <span style="font-size:20px;font-weight:bold;letter-spacing:0.05em;color:#15803d;">${password}</span>
          </p>
        </div>
        <p>ログイン後、プロフィール入力画面が表示されます。<br>氏名・年齢・症状カテゴリーなどをご入力ください。</p>
        <p style="color:#94a3b8;font-size:12px;">このメールに心当たりがない場合はご連絡ください。</p>
      </div>
    `,
  })

  return Response.json({
    message: 'クライアントアカウントを作成しました',
    user_id: userId,
    temporary_password: password,
  }, { status: 201 })
}

async function registerCounselor(body: Record<string, unknown>, currentUser: { id: string; role: string; hospital_id: number | null }) {
  const { data: myData } = await supabaseAdmin
    .from('counselors')
    .select('rank')
    .eq('id', currentUser.id)
    .single()

  if (!myData || myData.rank !== 0) {
    return Response.json({ error: 'カウンセラー登録には管理者権限が必要です' }, { status: 403 })
  }

  const name = String(body.name ?? '').trim()
  const email = String(body.email ?? '').trim()
  const rank = body.rank ? Number(body.rank) : 1

  if (!name || !email) {
    return Response.json({ error: 'name, email は必須です' }, { status: 400 })
  }

  const password = generatePassword()

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (authError) return Response.json({ error: authError.message }, { status: 400 })

  const userId = authData.user.id

  await supabaseAdmin.from('profiles').insert({
    id: userId,
    role: 'counselor',
    full_name: name,
    hospital_id: currentUser.hospital_id,
  })

  await supabaseAdmin.from('counselors').insert({ id: userId, rank })

  return Response.json({
    message: 'カウンセラーアカウントを作成しました',
    user_id: userId,
    temporary_password: password,
  }, { status: 201 })
}
