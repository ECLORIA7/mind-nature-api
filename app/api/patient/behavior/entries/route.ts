import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser, requireAuth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireAuth(user)
  if (authError) return authError

  if (user!.role !== 'patient') {
    return Response.json({ error: 'クライアントのみ記録できます' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const { addiction_id, date, start_time, end_time, location, companions, mood, drinks, notes } = body

  if (!addiction_id || !date || !start_time) {
    return Response.json({ error: 'addiction_id, date, start_time は必須です' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('alcohol_entries')
    .insert({
      patient_id: user!.id,
      addiction_id,
      record_date: date,
      start_time,
      end_time: end_time ?? null,
      location: location ?? null,
      companions: companions ?? null,
      mood: mood ?? null,
      drinks: drinks ?? [],
      notes: notes ?? null,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // 飲んだ日として behavior_daily に upsert
  await supabaseAdmin
    .from('behavior_daily')
    .upsert({
      patient_id: user!.id,
      addiction_id,
      record_date: date,
      abstained: false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'patient_id,addiction_id,record_date' })

  return Response.json({ entry: data }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireAuth(user)
  if (authError) return authError

  if (user!.role !== 'patient') {
    return Response.json({ error: 'クライアントのみ編集できます' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const { id, end_time, location, companions, mood, drinks, notes } = body

  if (!id) return Response.json({ error: 'id は必須です' }, { status: 400 })

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (end_time !== undefined) updateData.end_time = end_time
  if (location !== undefined) updateData.location = location
  if (companions !== undefined) updateData.companions = companions
  if (mood !== undefined) updateData.mood = mood
  if (drinks !== undefined) updateData.drinks = drinks
  if (notes !== undefined) updateData.notes = notes

  const { data, error } = await supabaseAdmin
    .from('alcohol_entries')
    .update(updateData)
    .eq('id', id)
    .eq('patient_id', user!.id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ entry: data })
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser(req)
  const authError = requireAuth(user)
  if (authError) return authError

  if (user!.role !== 'patient') {
    return Response.json({ error: 'クライアントのみ削除できます' }, { status: 403 })
  }

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return Response.json({ error: 'id は必須です' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('alcohol_entries')
    .delete()
    .eq('id', id)
    .eq('patient_id', user!.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ok: true })
}
