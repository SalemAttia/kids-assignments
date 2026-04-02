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
  imageUrl: z.string().url().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sessionId, subject, description, grade, imageUrl } = RequestSchema.parse(body)

    const supabase = await createServerClient()
    const prompt = buildGenerateQuestionsPrompt(subject as Subject, description, grade)

    const messages: Parameters<typeof openai.chat.completions.create>[0]['messages'] = [
      { role: 'system', content: prompt.system },
    ]

    if (imageUrl) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: prompt.user },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      })
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
