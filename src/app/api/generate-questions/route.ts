import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { openai, OPENAI_MODEL } from '@/lib/openai/client'
import { buildGenerateQuestionsPrompt } from '@/lib/openai/prompts'
import { GeneratedQuestionsSchema, parseJSON } from '@/lib/openai/parser'
import { z } from 'zod'
import type { Subject } from '@/types'

const RequestSchema = z.object({
  sessionId: z.string().uuid(),
  subject: z.string(),
  description: z.string(),
  grade: z.number(),
  imageUrls: z.array(z.string().url()).optional(),
  // legacy single-image field
  imageUrl: z.string().url().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sessionId, subject, description, grade, imageUrls, imageUrl } = RequestSchema.parse(body)

    // Merge image sources
    const allImageUrls: string[] = imageUrls && imageUrls.length > 0
      ? imageUrls
      : imageUrl ? [imageUrl] : []

    const supabase = await createServerClient()
    const prompt = buildGenerateQuestionsPrompt(subject as Subject, description, grade)

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

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0].message.content || '{}'
    const { questions } = parseJSON(GeneratedQuestionsSchema, raw)

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
