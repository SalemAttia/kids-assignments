import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// GET /api/schedule/adherence/[userId]
// Returns a 7-day breakdown comparing the child's weekly schedule against
// the subjects actually studied this week. Used by the parent dashboard to
// highlight which scheduled subjects were skipped.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  const supabase = await createServerClient()

  // Week boundaries — Sunday 00:00 local through now.
  // Matches the convention in src/app/api/reports/weekly/[userId]/route.ts.
  const now = new Date()
  const dow = now.getDay()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - dow)
  weekStart.setHours(0, 0, 0, 0)

  const [scheduleRes, sessionsRes] = await Promise.all([
    supabase
      .from('study_schedule')
      .select('day_of_week, subject, order_index')
      .eq('user_id', userId)
      .order('day_of_week')
      .order('order_index'),
    supabase
      .from('study_sessions')
      .select('subject, created_at')
      .eq('user_id', userId)
      .gte('created_at', weekStart.toISOString()),
  ])

  if (scheduleRes.error) {
    return NextResponse.json({ error: scheduleRes.error.message }, { status: 500 })
  }
  if (sessionsRes.error) {
    return NextResponse.json({ error: sessionsRes.error.message }, { status: 500 })
  }

  const schedule = scheduleRes.data ?? []
  const sessions = sessionsRes.data ?? []

  const scheduledByDay: Record<number, string[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }
  schedule.forEach(r => {
    scheduledByDay[r.day_of_week].push(r.subject)
  })

  // Local TZ getDay() matches weekStart computation above.
  const studiedByDay: Record<number, Set<string>> = {
    0: new Set(), 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set(), 5: new Set(), 6: new Set(),
  }
  sessions.forEach(s => {
    const d = new Date(s.created_at)
    studiedByDay[d.getDay()].add(s.subject)
  })

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + i)
    const isPast = i < dow
    const isToday = i === dow
    const isFuture = i > dow
    const scheduled = scheduledByDay[i]
    const studied = Array.from(studiedByDay[i])
    // Lenient: only strictly-past days contribute to "missed".
    // Today's unstudied scheduled subjects render as neutral "pending".
    const missed = isPast ? scheduled.filter(s => !studiedByDay[i].has(s)) : []
    const extras = studied.filter(s => !scheduled.includes(s))
    return {
      dayOfWeek: i,
      date: date.toISOString().split('T')[0],
      isToday,
      isPast,
      isFuture,
      scheduled,
      studied,
      missed,
      extras,
    }
  })

  return NextResponse.json({
    weekStart: weekStart.toISOString().split('T')[0],
    weekEnd: now.toISOString().split('T')[0],
    today: dow,
    hasSchedule: schedule.length > 0,
    days,
  })
}
