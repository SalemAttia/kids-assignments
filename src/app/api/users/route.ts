import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const BodySchema = z.object({
  name: z.string().min(1).max(40),
  grade: z.number().int().min(0).max(12),
  is_preschool: z.boolean().optional().default(false),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, grade, is_preschool } = BodySchema.parse(body)

    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('users')
      .insert({ name, grade, is_preschool })
      .select('id')
      .single()

    if (error) throw error
    return NextResponse.json({ id: data.id })
  } catch (err: unknown) {
    console.error(err)
    return NextResponse.json({ error: 'فشل إضافة الطفل' }, { status: 500 })
  }
}
