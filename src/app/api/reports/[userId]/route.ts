import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const supabase = await createServerClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('study_sessions')
    .select(`
      id, subject, description, duration_minutes, created_at,
      reports(id, total_score, feedback, mistakes, suggestions, created_at)
    `)
    .eq('user_id', userId)
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Normalize: Supabase may return reports as object or array depending on the FK uniqueness
  const sessions = (data || []).map(s => ({
    ...s,
    reports: s.reports
      ? (Array.isArray(s.reports) ? s.reports : [s.reports])
      : [],
  }))

  return NextResponse.json({ sessions })
}
