import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const
type Prayer = typeof PRAYERS[number]

const ToggleSchema = z.object({
  userId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  prayer: z.enum(PRAYERS),
  done: z.boolean(),
})

// POST /api/prayers  — mark or unmark a single prayer for a given day
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, date, prayer, done } = ToggleSchema.parse(body)

    const supabase = await createServerClient()

    // Upsert: create the row if it doesn't exist, then update the targeted column
    const { error } = await supabase
      .from('prayer_logs')
      .upsert(
        { user_id: userId, prayer_date: date, [prayer]: done },
        { onConflict: 'user_id,prayer_date' }
      )

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error(err)
    return NextResponse.json({ error: 'فشل حفظ الصلاة' }, { status: 500 })
  }
}
