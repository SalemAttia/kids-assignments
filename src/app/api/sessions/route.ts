import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const SessionSchema = z.object({
  userId: z.string().uuid(),
  subject: z.string(),
  description: z.string().min(5),
  imageUrl: z.string().url().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, subject, description, imageUrl } = SessionSchema.parse(body)

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('study_sessions')
      .insert({ user_id: userId, subject, description, image_url: imageUrl ?? null })
      .select('id')
      .single()

    if (error) throw error

    return NextResponse.json({ sessionId: data.id })
  } catch (err: unknown) {
    console.error(err)
    return NextResponse.json(
      { error: 'فشل حفظ جلسة الدراسة' },
      { status: 500 }
    )
  }
}
