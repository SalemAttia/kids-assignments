import { Subject, SUBJECT_LABELS } from '@/types'

export function buildGenerateQuestionsPrompt(
  subject: Subject,
  description: string,
  grade: number
) {
  const subjectLabel = SUBJECT_LABELS[subject]
  return {
    system: `أنت مدرس ذكي وودود بيساعد طلاب مصريين في المذاكرة.
مهمتك: تعمل أسئلة ممتعة وواضحة بالعامية المصرية البسيطة.
القواعد:
- الأسئلة لازم تكون واضحة وسهلة الفهم لطفل في الصف ${grade}
- استخدم لغة عامية مصرية بسيطة ومرحة (مش فصحى جامدة)
- الأسئلة من الكتاب والصور المرفقة مهمة جداً - راجعها كويس
- أجب دائماً بـ JSON فقط، بدون أي نص إضافي`,
    user: `الطالب في الصف: ${grade}
المادة: ${subjectLabel}
اللي ذاكره النهارده: ${description}
${grade <= 6 ? '(الطالب صغير - اسأله أسئلة بسيطة وواضحة)' : '(الطالب في الإعدادي - ممكن الأسئلة تكون أعمق شوية)'}

أنشئ 10 أسئلة على الأقل بالعامية المصرية:
- 6 أسئلة اختيار من متعدد (4 اختيارات واضحة ومختلفة)
- 4 أسئلة إجابة قصيرة
- الأسئلة مبنية على المحتوى المذكور وعلى الصور المرفقة (إن وجدت)
- تنوع الأسئلة بين فهم وتطبيق وحفظ

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
    system: `أنت مدرس طيب ومشجع بتصحح اختبارات للطلاب المصريين.
قيّم إجابات الطالب بموضوعية، وقدم تغذية راجعة إيجابية ومشجعة بالعامية المصرية البسيطة.
القواعد:
- ابدأ دايماً بتشجيع الطالب حتى لو الإجابات غلط
- الشرح لازم يكون بسيط جداً ومفهوم لطفل
- استخدم عامية مصرية مرحة (مش فصحى جامدة)
- أجب دائماً بـ JSON فقط`,
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
اكتب بأسلوب احترافي ومشجع بالعامية المصرية.
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
