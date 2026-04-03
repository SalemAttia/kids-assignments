import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('study_sessions')
    .select(`
      id, subject, description, image_url, duration_minutes, created_at,
      reports(id, total_score, feedback, mistakes, suggestions, all_answers_review, created_at)
    `)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  return NextResponse.json({ session: data })
}
