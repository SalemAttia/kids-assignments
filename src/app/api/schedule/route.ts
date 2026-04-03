import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const Schema = z.object({
  userId: z.string().uuid(),
  dayOfWeek: z.number().int().min(0).max(6),
  subject: z.string().min(1),
  active: z.boolean(), // true = add, false = remove
})

// POST /api/schedule — toggle a subject on/off for a given day
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, dayOfWeek, subject, active } = Schema.parse(body)
    const supabase = await createServerClient()

    if (active) {
      // Count existing entries for this day to set order_index
      const { count } = await supabase
        .from('study_schedule')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('day_of_week', dayOfWeek)

      await supabase.from('study_schedule').upsert(
        { user_id: userId, day_of_week: dayOfWeek, subject, order_index: count ?? 0 },
        { onConflict: 'user_id,day_of_week,subject' }
      )
    } else {
      await supabase
        .from('study_schedule')
        .delete()
        .eq('user_id', userId)
        .eq('day_of_week', dayOfWeek)
        .eq('subject', subject)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'فشل حفظ الجدول' }, { status: 500 })
  }
}
