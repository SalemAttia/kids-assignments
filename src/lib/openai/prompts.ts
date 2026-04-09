import { Subject, SUBJECT_LABELS } from '@/types'

const SUBJECT_INSTRUCTIONS: Record<Subject, string> = {
  arabic: `- الأسئلة لازم تكون عن اللغة العربية بس (قواعد، نحو، إملاء، معاني كلمات، قراءة، فهم نصوص)
- اكتب الأسئلة والاختيارات بالعربية الفصحى البسيطة المناسبة لعمر الطفل
- ممنوع تسأل عن أي مادة تانية`,

  math: `- الأسئلة لازم تكون عن الرياضيات بس (جمع، طرح، ضرب، قسمة، أشكال، أرقام، مسائل كلامية بسيطة)
- اكتب الأسئلة بالعامية المصرية البسيطة، والأرقام والرموز الرياضية تتكتب عادي
- ممنوع تسأل عن أي مادة تانية`,

  science: `- الأسئلة لازم تكون عن العلوم بس (النباتات، الحيوانات، جسم الإنسان، الطقس، المادة، الفضاء حسب المنهج المصري)
- اكتب الأسئلة بالعامية المصرية البسيطة
- ممنوع تسأل عن أي مادة تانية`,

  english: `- Questions MUST be about the English language only (vocabulary, grammar, reading, spelling, simple comprehension)
- Write ALL questions, options, and the correct_answer in ENGLISH ONLY — do NOT use Arabic at any point
- Use simple, age-appropriate English for a young student
- Use "A.", "B.", "C." as option prefixes (not Arabic letters)
- If the study description or images contain Arabic, translate the concepts into English — never copy Arabic text into the output
- Do NOT ask about other subjects like math or science`,

  social_studies: `- الأسئلة لازم تكون عن الدراسات الاجتماعية بس (تاريخ مصر، جغرافيا، المجتمع، المواطنة حسب المنهج المصري)
- اكتب الأسئلة بالعامية المصرية البسيطة
- ممنوع تسأل عن أي مادة تانية`,

  religion: `- الأسئلة لازم تكون عن التربية الدينية بس (القيم، العبادات، القصص الدينية، الأخلاق حسب المنهج المصري)
- اكتب الأسئلة بلغة بسيطة محترمة مناسبة للطفل
- ممنوع تسأل عن أي مادة تانية`,

  computer: `- الأسئلة لازم تكون عن الحاسب الآلي بس (أجزاء الكمبيوتر، الإنترنت، البرامج البسيطة، الاستخدام الآمن)
- اكتب الأسئلة بالعامية المصرية البسيطة، والمصطلحات التقنية زي ما هي (mouse, keyboard, ...)
- ممنوع تسأل عن أي مادة تانية`,

  art: `- الأسئلة لازم تكون عن التربية الفنية بس (الألوان، الرسم، الأشكال، الخامات، الفنانين)
- اكتب الأسئلة بالعامية المصرية البسيطة
- ممنوع تسأل عن أي مادة تانية`,

  other: `- الأسئلة لازم تكون مرتبطة مباشرة بالمحتوى اللي الطالب كتبه في الوصف أو الصور
- اكتب الأسئلة بالعامية المصرية البسيطة
- ممنوع تخرج عن الموضوع اللي ذاكره الطالب`,
}

export function buildGenerateQuestionsPrompt(
  subject: Subject,
  description: string,
  grade: number,
  hasImages: boolean = false
) {
  const subjectLabel = SUBJECT_LABELS[subject]
  const subjectInstructions = SUBJECT_INSTRUCTIONS[subject]

  const imageSystemRules = hasImages
    ? `- الصور المرفقة هي المصدر الأساسي للأسئلة - لازم تحلل كل صورة بالتفصيل
- اقرأ كل النصوص والرسومات والجداول والأشكال والمعادلات اللي في الصور كويس جداً
- الأسئلة لازم تكون مبنية على المحتوى الفعلي اللي موجود في الصور
- لو في صور فيها معادلات أو قواعد أو تعريفات أو أمثلة، اسأل عنها بالتحديد
- ممنوع تعمل أسئلة عشوائية أو عامة - كل سؤال لازم يكون مرتبط بحاجة موجودة في الصور`
    : `- الأسئلة مبنية على الوصف اللي الطالب كتبه عن اللي ذاكره`

  const imageUserRules = hasImages
    ? `- لازم 80% من الأسئلة على الأقل تكون مبنية مباشرة على المحتوى اللي في الصور
- الأسئلة الباقية ممكن تكون على الوصف اللي الطالب كتبه
- لو الصورة فيها أمثلة أو تمارين أو جداول، اسأل عنها بالتحديد
- اذكر في السؤال تفاصيل من الصورة (أرقام، أسماء، مصطلحات) عشان الطالب يعرف إنك فاهم اللي ذاكره`
    : `- الأسئلة مبنية على المحتوى المذكور في الوصف`

  return {
    system: `أنت مدرس ذكي وودود بيساعد طلاب مصريين في المذاكرة.
مهمتك: تحلل الصور والمحتوى اللي الطالب بيذاكره وتعمل أسئلة بسيطة وسهلة ومرتبطة بيه.
القواعد:
- الأسئلة لازم تكون بسيطة جداً وسهلة الفهم لطفل في الصف ${grade}
- كل الأسئلة لازم تكون اختيار من متعدد فقط (مفيش أسئلة إجابة قصيرة)
- الأسئلة تكون مباشرة وواضحة - سؤال واحد بسيط في كل مرة
- الاختيارات لازم تكون قصيرة ومفهومة وواضح الفرق بينها
- خلي الإجابة الصحيحة واضحة للطالب اللي ذاكر - مش عايزين أسئلة خداعية
- ⚠️ قاعدة مهمة جداً: لازم كل الأسئلة تكون عن مادة "${subjectLabel}" فقط - ممنوع تماماً تسأل عن أي مادة تانية
${subjectInstructions}
${imageSystemRules}
- أجب دائماً بـ JSON فقط، بدون أي نص إضافي`,
    user: `الطالب في الصف: ${grade}
المادة: ${subjectLabel}
اللي ذاكره النهارده: ${description}
(مهم: اسأل أسئلة بسيطة وسهلة ومباشرة - الطالب لسه بيتعلم)
${hasImages ? '⚠️ مهم جداً: الصور المرفقة هي المرجع الأساسي - حللها كويس واسأل على اللي فيها بالتحديد' : ''}

تعليمات خاصة بالمادة:
${subjectInstructions}

أنشئ 8 أسئلة اختيار من متعدد عن مادة "${subjectLabel}":
- كل الأسئلة اختيار من متعدد (3 اختيارات واضحة ومختلفة)
- الأسئلة تكون بسيطة ومباشرة وسهلة
- ممنوع أسئلة خداعية أو معقدة أو فيها تفاصيل كتير
- خلي السؤال قصير ومفهوم
${imageUserRules}

أعد JSON بالشكل التالي:
{
  "questions": [
    {
      "question_text": "...",
      "question_type": "multiple_choice",
      "options": ["أ. ...", "ب. ...", "ج. ..."],
      "correct_answer": "أ. ..."
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
    system: `أنت مدرس طيب ومشجع جداً بتصحح اختبارات للطلاب المصريين.
قيّم إجابات الطالب بتساهل ولطف، وقدم تغذية راجعة إيجابية ومشجعة بالعامية المصرية البسيطة.
القواعد:
- ابدأ دايماً بتشجيع الطالب حتى لو الإجابات غلط
- كن متساهل في التصحيح - لو الإجابة قريبة من الصح أو فيها جزء صح، احسبها صح
- لو الطالب اختار إجابة قريبة من الصح بس مش بالظبط، ادّيله الدرجة
- الشرح لازم يكون بسيط جداً ومفهوم لطفل
- شجع الطالب كتير وخليه يحس إنه شاطر
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
