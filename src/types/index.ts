export interface User {
  id: string
  name: string
  grade: number
  points: number
  streak: number
  last_active: string | null
  created_at: string
}

export type Subject = 'arabic' | 'math' | 'science' | 'english' | 'social_studies' | 'religion' | 'computer' | 'art' | 'other'

export const SUBJECT_LABELS: Record<Subject, string> = {
  arabic: 'اللغة العربية',
  math: 'الرياضيات',
  science: 'العلوم',
  english: 'اللغة الإنجليزية',
  social_studies: 'الدراسات الاجتماعية',
  religion: 'التربية الدينية',
  computer: 'الحاسب الآلي',
  art: 'التربية الفنية',
  other: 'أخرى'
}

export interface StudySession {
  id: string
  user_id: string
  subject: Subject
  description: string
  image_url: string | null
  created_at: string
}

export interface Question {
  id: string
  session_id: string
  question_text: string
  question_type: 'multiple_choice' | 'short_answer'
  options: string[] | null
  correct_answer: string
  order_index: number
}

export interface Answer {
  id: string
  question_id: string
  session_id: string
  answer_text: string
  is_correct: boolean | null
  score: number | null
}

export interface MistakeItem {
  question_id: string
  question_text: string
  given_answer: string
  correct_answer: string
  explanation: string
}

export interface Report {
  id: string
  session_id: string
  total_score: number
  feedback: string
  mistakes: MistakeItem[]
  suggestions: string[]
  created_at: string
}

export interface WeeklySummary {
  id: string
  user_id: string
  week_start: string
  week_end: string
  summary: string
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
}

export interface GenerateQuestionsRequest {
  sessionId: string
  subject: Subject
  description: string
  grade: number
  imageUrl?: string
}

export interface EvaluateRequest {
  sessionId: string
  answers: { questionId: string; answerText: string }[]
}
