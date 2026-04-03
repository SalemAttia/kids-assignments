import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// GET /api/schedule/[userId]
// Returns all schedule entries grouped by day_of_week
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('study_schedule')
    .select('day_of_week, subject, order_index')
    .eq('user_id', userId)
    .order('day_of_week')
    .order('order_index')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Group by day
  const byDay: Record<number, string[]> = {}
  for (let i = 0; i <= 6; i++) byDay[i] = []
  ;(data || []).forEach(r => byDay[r.day_of_week].push(r.subject))

  return NextResponse.json({ schedule: byDay })
}
