import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser, requireCounselor } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireCounselor(user)
  if (authError) return authError

  const { patient_id, title } = await req.json().catch(() => ({}))
  if (!patient_id || !title?.trim()) return Response.json({ error: 'patient_idとtitleは必須です' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('todos')
    .insert({ patient_id, title: title.trim() })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ todo: data }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireCounselor(user)
  if (authError) return authError

  const { id } = await req.json().catch(() => ({}))
  if (!id) return Response.json({ error: 'idは必須です' }, { status: 400 })

  const { error } = await supabaseAdmin.from('todos').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ message: '削除しました' })
}
