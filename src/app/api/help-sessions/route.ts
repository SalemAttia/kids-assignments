import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const RequestSchema = z.object({
  userId: z.string().uuid(),
  subject: z.string(),
  question: z.string(),
  explanation: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, subject, question, explanation } = RequestSchema.parse(body)

    const supabase = await createServerClient()

    const { data, error } = await supabase
      .from('help_sessions')
      .insert({ user_id: userId, subject, question, explanation })
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ id: data.id })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
