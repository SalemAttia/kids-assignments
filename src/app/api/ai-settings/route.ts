import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { VALID_MODEL_VALUES, DEFAULT_MODELS } from '@/lib/openai/models'

const validModels = VALID_MODEL_VALUES as unknown as readonly [string, ...string[]]

const PatchSchema = z.object({
  reasoning_model: z.enum(validModels).optional(),
  fast_model: z.enum(validModels).optional(),
})

export async function GET() {
  try {
    const supabase = await createServerClient()
    const { data } = await supabase
      .from('ai_settings')
      .select('reasoning_model, fast_model')
      .eq('id', 'global')
      .single()

    return NextResponse.json(data ?? DEFAULT_MODELS)
  } catch {
    return NextResponse.json(DEFAULT_MODELS)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const updates = PatchSchema.parse(body)

    const supabase = await createServerClient()
    const { error } = await supabase
      .from('ai_settings')
      .upsert({
        id: 'global',
        ...updates,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })

    if (error) throw error
    return NextResponse.json({ ok: true, ...updates })
  } catch (err: unknown) {
    console.error(err)
    return NextResponse.json({ error: 'فشل تحديث إعدادات الذكاء الاصطناعي' }, { status: 500 })
  }
}
