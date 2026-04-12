import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const SessionSchema = z.object({
  userId: z.string().uuid(),
  subject: z.string(),
  description: z.string().optional(),
  imageUrls: z.array(z.string().url()).optional(),
  // legacy single-image field – kept for backward compatibility
  imageUrl: z.string().url().optional(),
  durationMinutes: z.number().int().min(0).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, subject, description, imageUrls, imageUrl, durationMinutes } = SessionSchema.parse(body)

    const supabase = await createServerClient()

    // Determine if this user is a preschooler — if so, skip the
    // description/images requirements and synthesize a stub description.
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('is_preschool')
      .eq('id', userId)
      .single()
    if (userErr || !user) {
      return NextResponse.json({ error: 'المستخدم مش موجود' }, { status: 400 })
    }
    const isPreschool = !!user.is_preschool

    let finalDescription: string
    if (isPreschool) {
      finalDescription = `تدريب تمهيدي — ${subject}`
    } else {
      if (!description || description.trim().length < 5) {
        return NextResponse.json({ error: 'لازم تكتب وصف للي ذاكرته' }, { status: 400 })
      }
      finalDescription = description
    }

    // Merge: imageUrls takes precedence; fall back to single imageUrl
    const allUrls: string[] = isPreschool
      ? []
      : imageUrls && imageUrls.length > 0
        ? imageUrls
        : imageUrl ? [imageUrl] : []

    // Store as JSON array string so the quiz page can parse multiple URLs.
    // Single-image sessions store a plain URL string for backward compat.
    const storedImageUrl = allUrls.length === 0
      ? null
      : allUrls.length === 1
        ? allUrls[0]
        : JSON.stringify(allUrls)

    const { data, error } = await supabase
      .from('study_sessions')
      .insert({
        user_id: userId,
        subject,
        description: finalDescription,
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
