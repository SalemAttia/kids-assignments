import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { SUBJECT_LABELS } from '@/types'
import type { Subject } from '@/types'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const supabase = await createServerClient()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)

  const [todayRes, weekRes, userRes] = await Promise.all([
    supabase
      .from('study_sessions')
      .select('id, subject, duration_minutes, reports(total_score)')
      .eq('user_id', userId)
      .gte('created_at', todayStart.toISOString()),
    supabase
      .from('study_sessions')
      .select('id, subject, duration_minutes, created_at, reports(total_score)')
      .eq('user_id', userId)
      .gte('created_at', weekStart.toISOString())
      .order('created_at', { ascending: true }),
    supabase
      .from('users')
      .select('name, points, streak, grade')
      .eq('id', userId)
      .single(),
  ])

  const todaySessions = todayRes.data || []
  const weekSessions = weekRes.data || []

  const todaySubjects = [...new Set(todaySessions.map(s => s.subject))]
  const todayMinutes = todaySessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0)
  const weekMinutes = weekSessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0)

  // Build daily breakdown for the week (minutes per day)
  const dayLabels = ['الحد', 'الاتنين', 'التلات', 'الأربع', 'الخميس', 'الجمعة', 'السبت']
  const dailyBreakdown: Record<number, { label: string; minutes: number; sessions: number }> = {}
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    dailyBreakdown[i] = { label: dayLabels[d.getDay()], minutes: 0, sessions: 0 }
  }
  weekSessions.forEach(s => {
    const d = new Date(s.created_at)
    const dayIndex = Math.floor((d.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24))
    if (dayIndex >= 0 && dayIndex < 7) {
      dailyBreakdown[dayIndex].minutes += s.duration_minutes || 0
      dailyBreakdown[dayIndex].sessions += 1
    }
  })

  return NextResponse.json({
    user: userRes.data,
    today: {
      sessionCount: todaySessions.length,
      subjectCount: todaySubjects.length,
      subjects: todaySubjects.map(s => ({ key: s, label: SUBJECT_LABELS[s as Subject] || s })),
      totalMinutes: todayMinutes,
    },
    week: {
      sessionCount: weekSessions.length,
      totalMinutes: weekMinutes,
      dailyBreakdown: Object.values(dailyBreakdown),
    },
  })
}
