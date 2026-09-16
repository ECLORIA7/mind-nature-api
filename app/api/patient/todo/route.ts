import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser, requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireAuth(user)
  if (authError) return authError

  const patientId = user!.role === 'patient'
    ? user!.id
    : req.nextUrl.searchParams.get('patient_id') ?? user!.id

  const { data: todos } = await supabaseAdmin
    .from('todos')
    .select('*')
    .eq('patient_id', patientId)
    .order('due_date', { ascending: true })

  return Response.json({ todos: todos ?? [] })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireAuth(user)
  if (authError) return authError

  const body = await req.json().catch(() => ({}))
  const title = body.title?.trim()
  const due_date = body.due_date ?? null

  if (!title) {
    return Response.json({ error: 'title は必須です' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('todos')
    .insert({ patient_id: user!.id, title, due_date })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ todo: data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireAuth(user)
  if (authError) return authError

  const body = await req.json().catch(() => ({}))
  const { id, completed } = body

  if (!id) return Response.json({ error: 'id は必須です' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('todos')
    .update({ completed })
    .eq('id', id)
    .eq('patient_id', user!.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ message: '更新しました' })
}
