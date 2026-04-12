import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { openai, getModelForRole } from '@/lib/openai/client'
import { isOSeriesModel } from '@/lib/openai/models'
import { buildCheckinAnalysisPrompt } from '@/lib/openai/prompts'
import { CheckinAnalysisSchema, parseJSON } from '@/lib/openai/parser'
import { z } from 'zod'

const CHECKIN_POINTS = 10

const SubjectCheckinSchema = z.object({
  subject: z.enum(['arabic','math','science','english','social_studies','religion','computer','art','other']),
  difficulty: z.enum(['easy','medium','hard']),
  confidence: z.number().int().min(1).max(5),
  enjoyment: z.enum(['like','meh','dislike']),
})

const RequestSchema = z.object({
  userId: z.string().uuid(),
  mood: z.enum(['great','good','okay','tired','sad']).nullable(),
  energy: z.enum(['high','medium','low']).nullable(),
  sleep: z.enum(['good','okay','bad']).nullable(),
  subjectsStudied: z.array(SubjectCheckinSchema).default([]),
  hardestThing: z.string().max(2000).nullable().optional(),
  struggleImageUrl: z.string().url().nullable().optional(),
  bestThing: z.string().max(500).nullable().optional(),
  bothered: z.boolean().default(false),
  botheredNote: z.string().max(2000).nullable().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = RequestSchema.parse(body)

    const supabase = await createServerClient()
    const today = new Date().toISOString().split('T')[0]

    // Upsert by (user_id, checkin_date) so re-submitting the same day replaces
    const { data: checkin, error } = await supabase
      .from('checkins')
      .upsert({
        user_id: parsed.userId,
        checkin_date: today,
        mood: parsed.mood,
        energy: parsed.energy,
        sleep: parsed.sleep,
        subjects_studied: parsed.subjectsStudied,
        hardest_thing: parsed.hardestThing ?? null,
        struggle_image_url: parsed.struggleImageUrl ?? null,
        best_thing: parsed.bestThing ?? null,
        bothered: parsed.bothered,
        bothered_note: parsed.botheredNote ?? null,
      }, { onConflict: 'user_id,checkin_date' })
      .select()
      .single()

    if (error) {
      console.error('Check-in upsert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Award points (only if this is the first check-in today)
    const { data: user } = await supabase
      .from('users')
      .select('points')
      .eq('id', parsed.userId)
      .single()

    if (user) {
      await supabase
        .from('users')
        .update({ points: (user.points ?? 0) + CHECKIN_POINTS })
        .eq('id', parsed.userId)
    }

    // Fire-and-forget AI analysis (does NOT block the response)
    void analyzeCheckin(parsed.userId, checkin.id).catch(err =>
      console.error('Check-in AI analysis failed:', err)
    )

    return NextResponse.json({
      checkin,
      pointsEarned: CHECKIN_POINTS,
    })
  } catch (err) {
    console.error('POST /api/checkins error:', err)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

async function analyzeCheckin(userId: string, checkinId: string) {
  const supabase = await createServerClient()

  const { data: user } = await supabase
    .from('users')
    .select('name, grade')
    .eq('id', userId)
    .single()

  if (!user) return

  const { data: today } = await supabase
    .from('checkins')
    .select('*')
    .eq('id', checkinId)
    .single()

  if (!today) return

  const { data: recent } = await supabase
    .from('checkins')
    .select('checkin_date, mood, energy, subjects_studied, hardest_thing, bothered')
    .eq('user_id', userId)
    .neq('id', checkinId)
    .order('checkin_date', { ascending: false })
    .limit(6)

  const prompt = buildCheckinAnalysisPrompt({
    studentName: user.name,
    grade: user.grade,
    today: {
      checkin_date: today.checkin_date,
      mood: today.mood,
      energy: today.energy,
      sleep: today.sleep,
      subjects_studied: today.subjects_studied || [],
      hardest_thing: today.hardest_thing,
      best_thing: today.best_thing,
      bothered: today.bothered,
      bothered_note: today.bothered_note,
    },
    recent: (recent || []).map(r => ({
      checkin_date: r.checkin_date,
      mood: r.mood,
      energy: r.energy,
      subjects_studied: r.subjects_studied || [],
      hardest_thing: r.hardest_thing,
      bothered: r.bothered,
    })),
  })

  const model = await getModelForRole('fast')
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ],
    ...(isOSeriesModel(model) ? {} : { response_format: { type: 'json_object' } }),
  })

  const raw = completion.choices[0].message.content || '{}'
  const analysis = parseJSON(CheckinAnalysisSchema, raw)

  await supabase
    .from('checkins')
    .update({ ai_flags: analysis })
    .eq('id', checkinId)
}
