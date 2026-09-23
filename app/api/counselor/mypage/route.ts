import { NextRequest } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { getAuthUser, requireCounselor } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireCounselor(user)
  if (authError) return authError

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name, birth_date, phone, hospital_id, hospitals(name)')
    .eq('id', user!.id)
    .single()

  const { data: counselor } = await supabaseAdmin
    .from('counselors')
    .select('rank, member_number')
    .eq('id', user!.id)
    .single()

  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user!.id)

  return Response.json({
    full_name: profile?.full_name ?? '',
    birth_date: profile?.birth_date ?? '',
    phone: profile?.phone ?? '',
    email: authUser?.user?.email ?? '',
    hospital_name: (profile?.hospitals as { name: string } | null)?.name ?? '',
    member_number: counselor?.member_number ?? null,
    rank: counselor?.rank ?? 1,
    created_at: authUser?.user?.created_at ?? '',
  })
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireCounselor(user)
  if (authError) return authError

  const body = await req.json().catch(() => ({}))
  const { birth_date, phone, email } = body

  const profileUpdate: Record<string, unknown> = {}
  if (birth_date !== undefined) profileUpdate.birth_date = birth_date || null
  if (phone !== undefined) profileUpdate.phone = phone || null

  if (Object.keys(profileUpdate).length > 0) {
    await supabaseAdmin.from('profiles').update(profileUpdate).eq('id', user!.id)
  }

  if (email) {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user!.id)
    if (authUser?.user?.email !== email) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user!.id, { email })
      if (error) return Response.json({ error: 'メールアドレスの更新に失敗しました' }, { status: 400 })
    }
  }

  return Response.json({ message: '更新しました' })
}
