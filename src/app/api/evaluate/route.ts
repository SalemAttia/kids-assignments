import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { openai, OPENAI_MODEL } from '@/lib/openai/client'
import { buildEvaluateAnswersPrompt } from '@/lib/openai/prompts'
import { EvaluationSchema, parseJSON } from '@/lib/openai/parser'
import { calculatePoints, calculateNewStreak } from '@/lib/utils/gamification'
import { z } from 'zod'
import type { Subject } from '@/types'

const RequestSchema = z.object({
  sessionId: z.string().uuid(),
  answers: z.array(z.object({
    questionId: z.string().uuid(),
    answerText: z.string(),
  })),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sessionId, answers } = RequestSchema.parse(body)

    const supabase = await createServerClient()

    // Fetch session + user
    const { data: session } = await supabase
      .from('study_sessions')
      .select('*, users(*)')
      .eq('id', sessionId)
      .single()

    if (!session) throw new Error('Session not found')

    // Fetch questions
    const { data: questions } = await supabase
      .from('questions')
      .select('*')
      .eq('session_id', sessionId)
      .order('order_index')

    if (!questions) throw new Error('Questions not found')

    // Build QA pairs for evaluation
    const qaMap = new Map(answers.map(a => [a.questionId, a.answerText]))
    const questionsAndAnswers = questions.map(q => ({
      question_id: q.id,
      question_text: q.question_text,
      question_type: q.question_type,
      correct_answer: q.correct_answer,
      student_answer: qaMap.get(q.id) || '',
    }))

    const prompt = buildEvaluateAnswersPrompt(
      session.subject as Subject,
      session.users.grade,
      questionsAndAnswers
    )

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0].message.content || '{}'
    const evaluation = parseJSON(EvaluationSchema, raw)

    // Insert answers
    const answerRows = answers.map(a => {
      const pq = evaluation.per_question.find(p => p.question_id === a.questionId)
      return {
        question_id: a.questionId,
        session_id: sessionId,
        answer_text: a.answerText,
        is_correct: pq?.is_correct ?? null,
        score: pq?.score ?? null,
      }
    })
    await supabase.from('answers').insert(answerRows)

    // Build full answers review (all questions, not just mistakes)
    const allAnswersReview = questionsAndAnswers.map(q => {
      const pq = evaluation.per_question.find(p => p.question_id === q.question_id)
      return {
        question_text: q.question_text,
        student_answer: q.student_answer,
        correct_answer: q.correct_answer,
        is_correct: pq?.is_correct ?? false,
        explanation: pq?.explanation || '',
      }
    })

    // Insert report (upsert to handle retakes of the same session)
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .upsert({
        session_id: sessionId,
        total_score: evaluation.total_score,
        feedback: evaluation.feedback,
        mistakes: evaluation.mistakes,
        suggestions: evaluation.suggestions,
        all_answers_review: allAnswersReview,
      }, { onConflict: 'session_id' })
      .select()
      .single()

    if (reportError) console.error('Report insert error:', reportError)

    // Update user points + streak
    const user = session.users
    const streakDelta = calculateNewStreak(user.last_active)
    const newStreak = streakDelta === -1 ? 1 : streakDelta === 0 ? user.streak : user.streak + 1
    const points = calculatePoints(evaluation.total_score, newStreak)

    await supabase
      .from('users')
      .update({
        points: user.points + points,
        streak: newStreak,
        last_active: new Date().toISOString().split('T')[0],
      })
      .eq('id', user.id)

    return NextResponse.json({
      report: {
        ...report,
        mistakes: evaluation.mistakes,
        suggestions: evaluation.suggestions,
      },
      allAnswersReview,
      pointsEarned: points,
      newStreak,
    })
  } catch (err: unknown) {
    console.error(err)
    return NextResponse.json({ error: 'فشل تقييم الإجابات' }, { status: 500 })
  }
}
