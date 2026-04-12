import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get('limit') ?? 14), 365)

  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('checkins')
    .select('*')
    .eq('user_id', userId)
    .order('checkin_date', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ checkins: data || [] })
}
