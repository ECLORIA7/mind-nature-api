import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser, requireOperator } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireOperator(user)
  if (authError) return authError

  const { data: teams } = await supabaseAdmin
    .from('hospitals')
    .select('id, name, description, created_at')
    .order('id')

  const { data: counselors } = await supabaseAdmin
    .from('counselors')
    .select('id, rank, profiles(full_name, hospital_id, email:id)')

  return Response.json({ teams: teams ?? [], counselors: counselors ?? [] })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireOperator(user)
  if (authError) return authError

  const body = await req.json().catch(() => ({}))
  const name = String(body.name ?? '').trim()
  const description = String(body.description ?? '').trim()

  if (!name) return Response.json({ error: 'チーム名は必須です' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('hospitals')
    .insert({ name, description })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 400 })

  return Response.json({ team: data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireOperator(user)
  if (authError) return authError

  const body = await req.json().catch(() => ({}))
  const { id, name, description } = body

  if (!id) return Response.json({ error: 'id は必須です' }, { status: 400 })

  await supabaseAdmin.from('hospitals').update({ name, description }).eq('id', id)

  return Response.json({ message: '更新しました' })
}
