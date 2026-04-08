import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()

  // Fetch session to get image URLs for storage cleanup
  const { data: session } = await supabase
    .from('study_sessions')
    .select('image_url')
    .eq('id', id)
    .single()

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  // Delete session (cascades to questions, answers, reports)
  const { error } = await supabase
    .from('study_sessions')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Clean up images from storage
  if (session.image_url) {
    try {
      let urls: string[] = []
      try {
        const parsed = JSON.parse(session.image_url)
        urls = Array.isArray(parsed) ? parsed : [session.image_url]
      } catch {
        urls = [session.image_url]
      }

      const paths = urls
        .map(url => {
          const match = url.match(/study-images\/(.+)$/)
          return match ? match[1] : null
        })
        .filter((p): p is string => p !== null)

      if (paths.length > 0) {
        await supabase.storage.from('study-images').remove(paths)
      }
    } catch {
      // Storage cleanup is best-effort
    }
  }

  return NextResponse.json({ success: true })
}

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

  // Normalize: Supabase may return reports as object or array depending on FK uniqueness
  const session = {
    ...data,
    reports: data.reports
      ? (Array.isArray(data.reports) ? data.reports : [data.reports])
      : [],
  }

  return NextResponse.json({ session })
}
