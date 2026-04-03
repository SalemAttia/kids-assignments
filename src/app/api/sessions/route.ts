import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const SessionSchema = z.object({
  userId: z.string().uuid(),
  subject: z.string(),
  description: z.string().min(5),
  imageUrls: z.array(z.string().url()).optional(),
  // legacy single-image field – kept for backward compatibility
  imageUrl: z.string().url().optional(),
  durationMinutes: z.number().int().min(0).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, subject, description, imageUrls, imageUrl, durationMinutes } = SessionSchema.parse(body)

    // Merge: imageUrls takes precedence; fall back to single imageUrl
    const allUrls: string[] = imageUrls && imageUrls.length > 0
      ? imageUrls
      : imageUrl ? [imageUrl] : []

    // Store as JSON array string so the quiz page can parse multiple URLs.
    // Single-image sessions store a plain URL string for backward compat.
    const storedImageUrl = allUrls.length === 0
      ? null
      : allUrls.length === 1
        ? allUrls[0]
        : JSON.stringify(allUrls)

    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('study_sessions')
      .insert({
        user_id: userId,
        subject,
        description,
        image_url: storedImageUrl,
        duration_minutes: durationMinutes ?? 0,
      })
      .select('id')
      .single()

    if (error) throw error
    return NextResponse.json({ sessionId: data.id })
  } catch (err: unknown) {
    console.error(err)
    return NextResponse.json({ error: 'فشل حفظ جلسة الدراسة' }, { status: 500 })
  }
}
