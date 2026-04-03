import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { openai, OPENAI_MODEL } from '@/lib/openai/client'
import { buildWeeklySummaryPrompt } from '@/lib/openai/prompts'
import { WeeklySummarySchema, parseJSON } from '@/lib/openai/parser'
import { SUBJECT_LABELS } from '@/types'
import type { Subject } from '@/types'
import { z } from 'zod'

const RequestSchema = z.object({ userId: z.string().uuid() })

type StudyReport = { total_score: number; mistakes?: Array<{ explanation: string }> }

function normalizeToArray<T>(value: unknown): T[] {
  if (!value) return []
  if (Array.isArray(value)) return value as T[]
  if (typeof value === 'object') return [value as T]
  return []
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = RequestSchema.parse(await req.json())
    const supabase = await createServerClient()

    const now = new Date()
    const dayOfWeek = now.getDay()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - dayOfWeek)
    weekStart.setHours(0, 0, 0, 0)

    const { data: user } = await supabase.from('users').select('*').eq('id', userId).single()
    if (!user) throw new Error('User not found')

    const { data: sessions } = await supabase
      .from('study_sessions')
      .select('subject, reports(total_score, mistakes)')
      .eq('user_id', userId)
      .gte('created_at', weekStart.toISOString())

    const allSessions = sessions || []

    const scores = allSessions.flatMap(s =>
      normalizeToArray<StudyReport>((s as any).reports).map(r => r.total_score),
    )
    const subjectScores: Record<string, number[]> = {}

    allSessions.forEach(s => {
      if (!subjectScores[s.subject]) subjectScores[s.subject] = []
      const score = normalizeToArray<StudyReport>((s as any).reports)[0]?.total_score
      if (score !== undefined) subjectScores[s.subject].push(score)
    })

    const subjectAvgs = Object.entries(subjectScores).map(([subj, sc]) => ({
      subject: subj,
      avg: sc.reduce((a, b) => a + b, 0) / sc.length,
    })).sort((a, b) => b.avg - a.avg)

    const bestSubject = subjectAvgs[0]?.subject || 'غير محدد'
    const worstSubject = subjectAvgs[subjectAvgs.length - 1]?.subject || 'غير محدد'
    const commonMistakes = allSessions
      .flatMap(s =>
        normalizeToArray<StudyReport>((s as any).reports).flatMap(r =>
          normalizeToArray<{ explanation: string }>(r.mistakes).map(m => m.explanation),
        ),
      )
      .slice(0, 3)

    const prompt = buildWeeklySummaryPrompt({
      studentName: user.name,
      grade: user.grade,
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: now.toISOString().split('T')[0],
      sessionCount: allSessions.length,
      subjects: [...new Set(allSessions.map(s => SUBJECT_LABELS[s.subject as Subject] || s.subject))],
      avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      maxScore: scores.length ? Math.max(...scores) : 0,
      minScore: scores.length ? Math.min(...scores) : 0,
      bestSubject: SUBJECT_LABELS[bestSubject as Subject] || bestSubject,
      worstSubject: SUBJECT_LABELS[worstSubject as Subject] || worstSubject,
      commonMistakes,
    })

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      response_format: { type: 'json_object' },
    })

    const summaryData = parseJSON(WeeklySummarySchema, completion.choices[0].message.content || '{}')

    const weekStartStr = weekStart.toISOString().split('T')[0]
    const weekEndStr = now.toISOString().split('T')[0]

    await supabase.from('weekly_summaries').upsert({
      user_id: userId,
      week_start: weekStartStr,
      week_end: weekEndStr,
      summary: summaryData.summary,
      strengths: summaryData.strengths,
      weaknesses: summaryData.weaknesses,
      recommendations: summaryData.recommendations,
    }, { onConflict: 'user_id,week_start' })

    return NextResponse.json(summaryData)
  } catch (err: unknown) {
    console.error(err)
    return NextResponse.json({ error: 'فشل توليد الملخص الأسبوعي' }, { status: 500 })
  }
}
