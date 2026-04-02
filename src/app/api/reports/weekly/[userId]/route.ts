import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { SUBJECT_LABELS } from '@/types'
import type { Subject } from '@/types'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const supabase = await createServerClient()

  const now = new Date()
  const dayOfWeek = now.getDay()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - dayOfWeek)
  weekStart.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('study_sessions')
    .select('subject, reports(total_score)')
    .eq('user_id', userId)
    .gte('created_at', weekStart.toISOString())

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const sessions = data || []
  const scores = sessions.flatMap(s => (s.reports as Array<{total_score: number}> || []).map(r => r.total_score))
  const subjectCounts = sessions.reduce((acc, s) => {
    acc[s.subject] = (acc[s.subject] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return NextResponse.json({
    sessionCount: sessions.length,
    avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    maxScore: scores.length ? Math.max(...scores) : 0,
    minScore: scores.length ? Math.min(...scores) : 0,
    subjectBreakdown: Object.entries(subjectCounts).map(([subject, count]) => ({
      subject,
      label: SUBJECT_LABELS[subject as Subject] || subject,
      count,
    })),
    weekStart: weekStart.toISOString().split('T')[0],
    weekEnd: now.toISOString().split('T')[0],
  })
}
