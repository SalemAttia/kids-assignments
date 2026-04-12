export type QuizDifficulty = 'easy' | 'medium' | 'hard'

export const QUIZ_DIFFICULTY_LABELS: Record<QuizDifficulty, string> = {
  easy: 'سهل',
  medium: 'متوسط',
  hard: 'صعب',
}

export interface User {
  id: string
  name: string
  grade: number
  points: number
  streak: number
  last_active: string | null
  quiz_difficulty: QuizDifficulty
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
  difficulty: QuizDifficulty
  imageUrls: string[]
  /** @deprecated Use imageUrls instead */
  imageUrl?: string
}

export interface EvaluateRequest {
  sessionId: string
  answers: { questionId: string; answerText: string }[]
}

// ---------- Check-ins ----------

export type CheckinMood = 'great' | 'good' | 'okay' | 'tired' | 'sad'
export type CheckinEnergy = 'high' | 'medium' | 'low'
export type CheckinSleep = 'good' | 'okay' | 'bad'
export type CheckinSubjectDifficulty = 'easy' | 'medium' | 'hard'
export type CheckinSubjectEnjoyment = 'like' | 'meh' | 'dislike'

export interface CheckinSubject {
  subject: Subject
  difficulty: CheckinSubjectDifficulty
  confidence: number // 1..5
  enjoyment: CheckinSubjectEnjoyment
}

export interface CheckinAIFlags {
  summary: string
  red_flags: string[]
  themes: string[]
}

export interface Checkin {
  id: string
  user_id: string
  checkin_date: string
  mood: CheckinMood | null
  energy: CheckinEnergy | null
  sleep: CheckinSleep | null
  subjects_studied: CheckinSubject[]
  hardest_thing: string | null
  struggle_image_url: string | null
  best_thing: string | null
  bothered: boolean
  bothered_note: string | null
  ai_flags: CheckinAIFlags | null
  created_at: string
}

export const CHECKIN_MOOD_LABELS: Record<CheckinMood, { emoji: string; label: string }> = {
  great: { emoji: '😄', label: 'رائع'   },
  good:  { emoji: '🙂', label: 'كويس'   },
  okay:  { emoji: '😐', label: 'عادي'   },
  tired: { emoji: '😕', label: 'تعبان'  },
  sad:   { emoji: '😢', label: 'زعلان'  },
}
