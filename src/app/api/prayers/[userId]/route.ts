import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// GET /api/prayers/[userId]?date=YYYY-MM-DD          → today's log
// GET /api/prayers/[userId]?days=7                    → last N days (for parent dashboard)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  const { searchParams } = new URL(req.url)
  const days = searchParams.get('days')
  const dateParam = searchParams.get('date')

  const supabase = await createServerClient()

  if (days) {
    // Return last N days of prayer logs (for parent dashboard)
    const n = Math.min(parseInt(days, 10) || 7, 30)
    const from = new Date()
    from.setDate(from.getDate() - n + 1)
    from.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('prayer_logs')
      .select('prayer_date, fajr, dhuhr, asr, maghrib, isha')
      .eq('user_id', userId)
      .gte('prayer_date', from.toISOString().split('T')[0])
      .order('prayer_date', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ logs: data || [] })
  }

  // Single day (defaults to today)
  const date = dateParam || new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('prayer_logs')
    .select('prayer_date, fajr, dhuhr, asr, maghrib, isha')
    .eq('user_id', userId)
    .eq('prayer_date', date)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Return a default empty row if no record exists yet
  return NextResponse.json(data ?? {
    prayer_date: date,
    fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false,
  })
}
