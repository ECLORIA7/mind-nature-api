import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser, requireCounselor } from '@/lib/auth'

async function getCounselorRank(userId: string): Promise<number> {
  const { data } = await supabaseAdmin.from('counselors').select('rank').eq('id', userId).single()
  return data?.rank ?? 1
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  const err = requireCounselor(user)
  if (err) return err

  const isOperator = user!.role === 'admin'
  const rank = isOperator ? 0 : await getCounselorRank(user!.id)

  // 組織は運営画面のみ。カウンセラー向けにはグループだけ返す
  let groups: { id: number; organization_id: number | null; name: string; description: string }[] = []

  if (isOperator) {
    // 運営は全グループ
    const { data } = await supabaseAdmin
      .from('client_groups')
      .select('id, organization_id, name, description')
      .order('created_at', { ascending: true })
    groups = data ?? []
  } else if (user!.hospital_id) {
    // カウンセラーは自分の所属チームに紐づく組織のグループのみ
    const { data: orgs } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('hospital_id', user!.hospital_id)
    const orgIds = (orgs ?? []).map((o) => o.id)
    if (orgIds.length > 0) {
      const { data } = await supabaseAdmin
        .from('client_groups')
        .select('id, organization_id, name, description')
        .in('organization_id', orgIds)
        .order('created_at', { ascending: true })
      groups = data ?? []
    }
  }

  const { data: members } = await supabaseAdmin
    .from('group_members')
    .select('group_id, patient_id')

  return Response.json({
    groups,
    members: members ?? [],
    viewer_role: user!.role,
    viewer_rank: rank,
  })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  const err = requireCounselor(user)
  if (err) return err

  const isOperator = user!.role === 'admin'
  const body = await req.json()
  const { action } = body

  if (action === 'create_group' || !action) {
    if (!isOperator) {
      const rank = await getCounselorRank(user!.id)
      if (rank !== 0) return Response.json({ error: '権限がありません' }, { status: 403 })
    }

    const { name, description } = body
    if (!name?.trim()) return Response.json({ error: 'グループ名は必須です' }, { status: 400 })

    // organization_idが指定されていない場合、所属チームの組織を自動割り当て
    let organization_id = body.organization_id ?? null
    if (!organization_id && user!.hospital_id) {
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .eq('hospital_id', user!.hospital_id)
        .limit(1)
        .single()
      organization_id = org?.id ?? null
    }

    const { data, error } = await supabaseAdmin
      .from('client_groups')
      .insert({ organization_id, name: name.trim(), description: description ?? '' })
      .select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ group: data })
  }

  return Response.json({ error: '不正なアクション' }, { status: 400 })
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req)
  const err = requireCounselor(user)
  if (err) return err

  const isOperator = user!.role === 'admin'
  const body = await req.json()
  const { action } = body

  if (action === 'update_group' || !action) {
    if (!isOperator) {
      const rank = await getCounselorRank(user!.id)
      if (rank !== 0) return Response.json({ error: '権限がありません' }, { status: 403 })
    }
    const { id, name, description } = body
    const { error } = await supabaseAdmin
      .from('client_groups')
      .update({ name: name.trim(), description: description ?? '' })
      .eq('id', id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  }

  return Response.json({ error: '不正なアクション' }, { status: 400 })
}
