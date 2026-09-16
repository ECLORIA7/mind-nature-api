import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser, requireCounselor } from '@/lib/auth'

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
  const name = String(body.name ?? '').trim()
  const email = String(body.email ?? '').trim()
  const addictions: number[] = Array.isArray(body.addictions) ? body.addictions : []
  const counselor_ids: string[] = Array.isArray(body.counselor_ids) ? body.counselor_ids : []
  const age = body.age ? String(body.age) : null
  const sex = body.sex ? Number(body.sex) : 0

  if (!name || !email || !addictions.length) {
    return Response.json({ error: 'name, email, addictions は必須です' }, { status: 400 })
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
    full_name: name,
    hospital_id: hospitalId,
  })

  await supabaseAdmin.from('patients').insert({ id: userId, age, sex })

  if (addictions.length) {
    await supabaseAdmin.from('patient_addictions').insert(
      addictions.map((addiction_id) => ({ patient_id: userId, addiction_id }))
    )
  }

  if (counselor_ids.length) {
    await supabaseAdmin.from('patient_counselors').insert(
      counselor_ids.map((counselor_id) => ({ patient_id: userId, counselor_id }))
    )
  }

  return Response.json({
    message: '患者アカウントを作成しました',
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
