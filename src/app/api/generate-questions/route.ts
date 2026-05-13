import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { openai, getModelForRole } from '@/lib/openai/client'
import { isOSeriesModel } from '@/lib/openai/models'
import { buildGenerateQuestionsPrompt, buildPreschoolQuestionsPrompt, type PreschoolSubject } from '@/lib/openai/prompts'
import { GeneratedQuestionsSchema, parseJSON } from '@/lib/openai/parser'
import { z } from 'zod'
import type { Subject, QuizDifficulty } from '@/types'

const RequestSchema = z.object({
  sessionId: z.string().uuid(),
  subject: z.string(),
  description: z.string(),
  grade: z.number(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  imageUrls: z.array(z.string().url()).optional(),
  // legacy single-image field
  imageUrl: z.string().url().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sessionId, subject, description, grade, difficulty, imageUrls, imageUrl } = RequestSchema.parse(body)

    const supabase = await createServerClient()

    // Detect preschool mode from the session's user (server-side source of truth).
    const { data: sessionRow, error: sessionErr } = await supabase
      .from('study_sessions')
      .select('users(is_preschool)')
      .eq('id', sessionId)
      .single()
    if (sessionErr || !sessionRow) {
      return NextResponse.json({ error: 'الجلسة مش موجودة' }, { status: 400 })
    }
    // The Supabase join returns either an object or an array depending on relation; normalize.
    const userField = (sessionRow as { users: { is_preschool: boolean } | { is_preschool: boolean }[] }).users
    const isPreschool = Array.isArray(userField)
      ? !!userField[0]?.is_preschool
      : !!userField?.is_preschool

    // Merge image sources (school mode only)
    const allImageUrls: string[] = !isPreschool && imageUrls && imageUrls.length > 0
      ? imageUrls
      : !isPreschool && imageUrl ? [imageUrl] : []

    // Enforce minimum 4 images for new sessions (school-mode imageUrls array flow)
    if (!isPreschool && imageUrls !== undefined && imageUrls.length > 0 && imageUrls.length < 4) {
      return NextResponse.json(
        { error: 'لازم ترفع 4 صور على الأقل من الكتاب عشان نعملك أسئلة كويسة' },
        { status: 400 }
      )
    }

    const prompt = isPreschool
      ? buildPreschoolQuestionsPrompt(subject as PreschoolSubject)
      : buildGenerateQuestionsPrompt(
          subject as Subject,
          description,
          grade,
          (difficulty ?? 'easy') as QuizDifficulty,
          allImageUrls.length > 0,
        )

    const messages: Parameters<typeof openai.chat.completions.create>[0]['messages'] = [
      { role: 'system', content: prompt.system },
    ]

    if (!isPreschool && allImageUrls.length > 0) {
      const contentParts: Parameters<typeof openai.chat.completions.create>[0]['messages'][number]['content'] = [
        { type: 'text', text: prompt.user },
        ...allImageUrls.map(url => ({
          type: 'image_url' as const,
          image_url: { url },
        })),
      ]
      messages.push({ role: 'user', content: contentParts })
    } else {
      messages.push({ role: 'user', content: prompt.user })
    }

    const model = await getModelForRole('reasoning')
    const completion = await openai.chat.completions.create({
      model,
      messages,
      ...(isOSeriesModel(model) ? {} : { response_format: { type: 'json_object' } }),
    })

    const raw = completion.choices[0].message.content || '{}'
    const { questions: parsed } = parseJSON(GeneratedQuestionsSchema, raw)

    // Preschool mode stays multiple-choice only. School mode allows the full type set,
    // but each type must have a valid options shape.
    const TYPES_REQUIRING_OPTIONS = new Set([
      'multiple_choice',
      'multi_select',
      'true_false',
    ])
    const TYPES_WITHOUT_OPTIONS = new Set(['short_answer', 'fill_blank'])

    const questions = parsed.filter(q => {
      if (isPreschool) {
        return q.question_type === 'multiple_choice'
          && Array.isArray(q.options)
          && q.options.length >= 2
      }
      if (TYPES_REQUIRING_OPTIONS.has(q.question_type)) {
        if (!Array.isArray(q.options) || q.options.length < 2) return false
        if (q.question_type === 'true_false' && q.options.length !== 2) return false
        return true
      }
      if (TYPES_WITHOUT_OPTIONS.has(q.question_type)) {
        return typeof q.correct_answer === 'string' && q.correct_answer.trim().length > 0
      }
      return false
    })

    if (questions.length === 0) {
      return NextResponse.json({ error: 'فشل توليد الأسئلة - حاول تاني' }, { status: 500 })
    }

    const rows = questions.map((q, i) => ({
      session_id: sessionId,
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options,
      correct_answer: q.correct_answer,
      order_index: i,
    }))

    const { data, error } = await supabase
      .from('questions')
      .insert(rows)
      .select()

    if (error) throw error

    return NextResponse.json({ questions: data })
  } catch (err: unknown) {
    console.error(err)
    return NextResponse.json({ error: 'فشل توليد الأسئلة' }, { status: 500 })
  }
}
