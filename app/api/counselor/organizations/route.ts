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

  let orgsQuery = supabaseAdmin
    .from('organizations')
    .select('id, name, description, hospital_id, created_at')
    .order('created_at', { ascending: true })

  // 管理者カウンセラーは自分の所属チームの組織のみ
  if (!isOperator && rank === 0 && user!.hospital_id) {
    orgsQuery = orgsQuery.eq('hospital_id', user!.hospital_id)
  } else if (!isOperator) {
    // 一般カウンセラーは自分の所属チームの組織のみ（閲覧用）
    if (user!.hospital_id) {
      orgsQuery = orgsQuery.eq('hospital_id', user!.hospital_id)
    }
  }

  const { data: orgs } = await orgsQuery

  const orgIds = (orgs ?? []).map((o) => o.id)
  let groups: { id: number; organization_id: number | null; name: string; description: string }[] = []
  if (orgIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('client_groups')
      .select('id, organization_id, name, description')
      .in('organization_id', orgIds)
      .order('created_at', { ascending: true })
    groups = data ?? []
  }

  const { data: members } = await supabaseAdmin
    .from('group_members')
    .select('group_id, patient_id')

  return Response.json({
    organizations: orgs ?? [],
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

  if (action === 'create_group') {
    if (!isOperator) {
      const rank = await getCounselorRank(user!.id)
      if (rank !== 0) return Response.json({ error: '権限がありません' }, { status: 403 })
      // 管理者カウンセラーは自分の所属チームの組織配下のみ
      if (body.organization_id && user!.hospital_id) {
        const { data: org } = await supabaseAdmin
          .from('organizations').select('hospital_id').eq('id', body.organization_id).single()
        if (org?.hospital_id !== user!.hospital_id) {
          return Response.json({ error: '自分の所属組織のみ操作できます' }, { status: 403 })
        }
      }
    }
    const { organization_id, name, description } = body
    if (!name?.trim()) return Response.json({ error: 'グループ名は必須です' }, { status: 400 })
    const { data, error } = await supabaseAdmin
      .from('client_groups')
      .insert({ organization_id: organization_id || null, name: name.trim(), description: description ?? '' })
      .select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ group: data })
  }

  // 組織の作成は運営のみ
  if (!isOperator) return Response.json({ error: '運営者権限が必要です' }, { status: 403 })

  const { name, description, hospital_id } = body
  if (!name?.trim()) return Response.json({ error: '組織名は必須です' }, { status: 400 })
  const { data, error } = await supabaseAdmin
    .from('organizations')
    .insert({ name: name.trim(), description: description ?? '', hospital_id: hospital_id || null })
    .select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ organization: data })
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req)
  const err = requireCounselor(user)
  if (err) return err

  const isOperator = user!.role === 'admin'
  const body = await req.json()
  const { action } = body

  if (action === 'update_group') {
    if (!isOperator) {
      const rank = await getCounselorRank(user!.id)
      if (rank !== 0) return Response.json({ error: '権限がありません' }, { status: 403 })
      // 管理者カウンセラーは自分の所属チームの組織配下のみ
      const { data: grp } = await supabaseAdmin.from('client_groups').select('organization_id').eq('id', body.id).single()
      if (grp?.organization_id) {
        const { data: org } = await supabaseAdmin.from('organizations').select('hospital_id').eq('id', grp.organization_id).single()
        if (org?.hospital_id !== user!.hospital_id) {
          return Response.json({ error: '自分の所属組織のみ操作できます' }, { status: 403 })
        }
      }
    }
    const { id, name, description } = body
    const { error } = await supabaseAdmin
      .from('client_groups')
      .update({ name: name.trim(), description: description ?? '' })
      .eq('id', id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  }

  // 組織の編集は運営のみ
  if (!isOperator) return Response.json({ error: '運営者権限が必要です' }, { status: 403 })

  const { id, name, description, hospital_id } = body
  const { error } = await supabaseAdmin
    .from('organizations')
    .update({ name: name.trim(), description: description ?? '', ...(hospital_id !== undefined && { hospital_id: hospital_id || null }) })
    .eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
