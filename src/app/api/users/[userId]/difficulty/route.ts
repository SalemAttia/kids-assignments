import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const BodySchema = z.object({
  difficulty: z.enum(['easy', 'medium', 'hard']),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const body = await req.json()
    const { difficulty } = BodySchema.parse(body)

    const supabase = await createServerClient()
    const { error } = await supabase
      .from('users')
      .update({ quiz_difficulty: difficulty })
      .eq('id', userId)

    if (error) throw error
    return NextResponse.json({ ok: true, difficulty })
  } catch (err: unknown) {
    console.error(err)
    return NextResponse.json({ error: 'فشل تحديث مستوى الأسئلة' }, { status: 500 })
  }
}
