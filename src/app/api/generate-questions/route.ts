import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { openai, getModelForRole } from '@/lib/openai/client'
import { isOSeriesModel } from '@/lib/openai/models'
import { buildGenerateQuestionsPrompt } from '@/lib/openai/prompts'
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

    // Merge image sources
    const allImageUrls: string[] = imageUrls && imageUrls.length > 0
      ? imageUrls
      : imageUrl ? [imageUrl] : []

    // Enforce minimum 2 images for new sessions (imageUrls array flow)
    if (imageUrls !== undefined && imageUrls.length > 0 && imageUrls.length < 2) {
      return NextResponse.json(
        { error: 'لازم ترفع صورتين على الأقل من الكتاب عشان نعملك أسئلة كويسة' },
        { status: 400 }
      )
    }

    const supabase = await createServerClient()
    const prompt = buildGenerateQuestionsPrompt(
      subject as Subject,
      description,
      grade,
      (difficulty ?? 'easy') as QuizDifficulty,
      allImageUrls.length > 0,
    )

    const messages: Parameters<typeof openai.chat.completions.create>[0]['messages'] = [
      { role: 'system', content: prompt.system },
    ]

    if (allImageUrls.length > 0) {
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

    // Only keep multiple-choice questions with valid options
    const questions = parsed.filter(q =>
      q.question_type === 'multiple_choice' && Array.isArray(q.options) && q.options.length >= 2
    )

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
