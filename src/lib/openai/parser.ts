import { z } from 'zod'

const QuestionSchema = z.object({
  question_text: z.string(),
  question_type: z.enum(['multiple_choice', 'short_answer']),
  options: z.array(z.string()).nullable(),
  correct_answer: z.string(),
})

export const GeneratedQuestionsSchema = z.object({
  questions: z.array(QuestionSchema),
})

const PerQuestionSchema = z.object({
  question_id: z.string(),
  is_correct: z.boolean(),
  score: z.number(),
  explanation: z.string(),
})

const MistakeSchema = z.object({
  question_id: z.string(),
  question_text: z.string(),
  given_answer: z.string(),
  correct_answer: z.string(),
  explanation: z.string(),
})

export const EvaluationSchema = z.object({
  total_score: z.number().min(0).max(100),
  feedback: z.string(),
  per_question: z.array(PerQuestionSchema),
  mistakes: z.array(MistakeSchema),
  suggestions: z.array(z.string()),
})

export const WeeklySummarySchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  recommendations: z.array(z.string()),
})

export function parseJSON<T>(schema: z.ZodSchema<T>, raw: string): T {
  const parsed = JSON.parse(raw)
  return schema.parse(parsed)
}
