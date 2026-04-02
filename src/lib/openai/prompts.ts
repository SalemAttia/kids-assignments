import { Subject, SUBJECT_LABELS } from '@/types'

export function buildGenerateQuestionsPrompt(
  subject: Subject,
  description: string,
  grade: number
) {
  const subjectLabel = SUBJECT_LABELS[subject]
  return {
    system: `أنت مساعد تعليمي متخصص في تصميم أسئلة للطلاب المصريين.
مهمتك: توليد أسئلة دراسية باللغة العربية بناءً على ما يدرسه الطالب.
أجب دائماً بـ JSON فقط، بدون أي نص إضافي.`,
    user: `الطالب في الصف: ${grade}
المادة: ${subjectLabel}
وصف ما درسه اليوم: ${description}

أنشئ من 3 إلى 5 أسئلة باللغة العربية:
- مزيج من أسئلة الاختيار المتعدد وأسئلة الإجابة القصيرة
- مناسبة لمستوى الصف ${grade}
- مبنية على المحتوى المذكور فقط

أعد JSON بالشكل التالي:
{
  "questions": [
    {
      "question_text": "...",
      "question_type": "multiple_choice",
      "options": ["أ. ...", "ب. ...", "ج. ...", "د. ..."],
      "correct_answer": "أ. ..."
    },
    {
      "question_text": "...",
      "question_type": "short_answer",
      "options": null,
      "correct_answer": "..."
    }
  ]
}`
  }
}

export function buildEvaluateAnswersPrompt(
  subject: Subject,
  grade: number,
  questionsAndAnswers: Array<{
    question_id: string
    question_text: string
    question_type: string
    correct_answer: string
    student_answer: string
  }>
) {
  const subjectLabel = SUBJECT_LABELS[subject]
  return {
    system: `أنت مصحح اختبارات تعليمي متخصص بالمناهج المصرية.
قيّم إجابات الطالب بموضوعية ودقة، وقدم تغذية راجعة تشجيعية باللغة العربية.
أجب دائماً بـ JSON فقط.`,
    user: `الطالب في الصف: ${grade}
المادة: ${subjectLabel}

الأسئلة والإجابات:
${JSON.stringify(questionsAndAnswers, null, 2)}

قيّم الإجابات وأعد JSON بالشكل التالي:
{
  "total_score": <0-100>,
  "feedback": "<جملتان أو ثلاث بالعربية تشجع الطالب وتلخص أداءه>",
  "per_question": [
    {
      "question_id": "...",
      "is_correct": true,
      "score": 100,
      "explanation": "..."
    }
  ],
  "mistakes": [
    {
      "question_id": "...",
      "question_text": "...",
      "given_answer": "...",
      "correct_answer": "...",
      "explanation": "<شرح مبسط للخطأ بالعربية>"
    }
  ],
  "suggestions": ["<اقتراح تحسين 1>", "<اقتراح تحسين 2>"]
}`
  }
}

export function buildWeeklySummaryPrompt(params: {
  studentName: string
  grade: number
  weekStart: string
  weekEnd: string
  sessionCount: number
  subjects: string[]
  avgScore: number
  maxScore: number
  minScore: number
  bestSubject: string
  worstSubject: string
  commonMistakes: string[]
}) {
  return {
    system: `أنت مستشار تعليمي يقدم تقارير أسبوعية للوالدين عن تقدم أبنائهم الدراسي.
اكتب بأسلوب احترافي ومشجع باللغة العربية.
أجب دائماً بـ JSON فقط.`,
    user: `اسم الطالب: ${params.studentName}
الصف: ${params.grade}
الفترة: من ${params.weekStart} إلى ${params.weekEnd}
عدد جلسات الدراسة: ${params.sessionCount}
المواد المدروسة: ${params.subjects.join(', ')}
متوسط الدرجات: ${params.avgScore}%
أعلى درجة: ${params.maxScore}% في ${params.bestSubject}
أدنى درجة: ${params.minScore}% في ${params.worstSubject}
الأخطاء المتكررة: ${params.commonMistakes.join(', ')}

اكتب تقريراً أسبوعياً شاملاً:
{
  "summary": "<فقرة كاملة>",
  "strengths": ["<نقطة قوة 1>", "<نقطة قوة 2>"],
  "weaknesses": ["<نقطة ضعف 1>"],
  "recommendations": ["<توصية 1>", "<توصية 2>", "<توصية 3>"]
}`
  }
}
