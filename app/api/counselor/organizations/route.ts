import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser, requireCounselor } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  const err = requireCounselor(user)
  if (err) return err

  const { data: orgs } = await supabaseAdmin
    .from('organizations')
    .select('id, name, description, created_at')
    .order('created_at', { ascending: true })

  const { data: groups } = await supabaseAdmin
    .from('client_groups')
    .select('id, organization_id, name, description')
    .order('created_at', { ascending: true })

  const { data: members } = await supabaseAdmin
    .from('group_members')
    .select('group_id, patient_id')

  return Response.json({ organizations: orgs ?? [], groups: groups ?? [], members: members ?? [] })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  const err = requireCounselor(user)
  if (err) return err

  const body = await req.json()
  const { action } = body

  if (action === 'create_group') {
    const { organization_id, name, description } = body
    if (!name?.trim()) return Response.json({ error: 'グループ名は必須です' }, { status: 400 })
    const { data, error } = await supabaseAdmin
      .from('client_groups')
      .insert({ organization_id: organization_id || null, name: name.trim(), description: description ?? '' })
      .select()
      .single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ group: data })
  }

  const { name, description } = body
  if (!name?.trim()) return Response.json({ error: '組織名は必須です' }, { status: 400 })
  const { data, error } = await supabaseAdmin
    .from('organizations')
    .insert({ name: name.trim(), description: description ?? '' })
    .select()
    .single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ organization: data })
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req)
  const err = requireCounselor(user)
  if (err) return err

  const body = await req.json()
  const { action } = body

  if (action === 'update_group') {
    const { id, name, description } = body
    const { error } = await supabaseAdmin
      .from('client_groups')
      .update({ name: name.trim(), description: description ?? '' })
      .eq('id', id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  }

  const { id, name, description } = body
  const { error } = await supabaseAdmin
    .from('organizations')
    .update({ name: name.trim(), description: description ?? '' })
    .eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
