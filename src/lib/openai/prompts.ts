import { Subject, SUBJECT_LABELS, QuizDifficulty, CheckinSubject, CheckinMood, CheckinEnergy, CheckinSleep } from '@/types'

const DIFFICULTY_INSTRUCTIONS: Record<QuizDifficulty, string> = {
  easy: `- مستوى الأسئلة: سهل جداً
- الأسئلة لازم تكون مباشرة ومن صميم الدرس، والإجابة الصحيحة تكون واضحة للطالب اللي ذاكر
- ابعد عن أي تفاصيل دقيقة أو أسئلة تحتاج تفكير عميق`,

  medium: `- مستوى الأسئلة: متوسط
- ممكن تسأل أسئلة تحتاج الطالب يفكر شوية أو يربط بين معلومتين من الدرس
- الأسئلة تكون واضحة لكن مش كلها سهلة جداً - خلي فيها تحدي مناسب`,

  hard: `- مستوى الأسئلة: صعب
- اسأل أسئلة تحتاج فهم عميق وتطبيق، مش مجرد حفظ
- ممكن تسأل أسئلة تحليل أو استنتاج أو تطبيق على حالات جديدة مبنية على الدرس
- خلي الأسئلة فيها تحدي حقيقي لكن لسه في نطاق اللي ذاكره الطالب - ممنوع أسئلة تعجيزية أو خارج الدرس`,
}

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

  english: `- الأسئلة لازم تكون عن اللغة الإنجليزية بس (كلمات، معاني، قواعد بسيطة، إملاء، قراءة بسيطة)
- الطلاب مبيتكلموش إنجليزي كويس، فلازم الأسئلة تكون مخلوطة عربي وإنجليزي عشان تبقى سهلة عليهم
- اكتب نص السؤال والتعليمات بالعربية (زي: "ما معنى كلمة ... ؟" أو "اختار الترجمة الصحيحة لـ ...")
- الكلمة أو الجملة الإنجليزية اللي بتسأل عنها تبقى بالإنجليزية زي ما هي
- الاختيارات ممكن تكون عربي (لو السؤال عن معنى كلمة إنجليزية) أو إنجليزي (لو السؤال عن إملاء أو قواعد)
- استخدم "أ."، "ب."، "ج." كبادئات للاختيارات
- ممنوع تسأل عن أي مادة تانية`,

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
  difficulty: QuizDifficulty = 'easy',
  hasImages: boolean = false
) {
  const subjectLabel = SUBJECT_LABELS[subject]
  const subjectInstructions = SUBJECT_INSTRUCTIONS[subject]
  const difficultyInstructions = DIFFICULTY_INSTRUCTIONS[difficulty]

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
مهمتك: تحلل الصور والمحتوى اللي الطالب بيذاكره وتعمل أسئلة مرتبطة بيه على المستوى المطلوب.
القواعد:
- الأسئلة لازم تكون مناسبة لطفل في الصف ${grade}
- كل الأسئلة لازم تكون اختيار من متعدد فقط (مفيش أسئلة إجابة قصيرة)
- كل سؤال واحد واضح - سؤال لمعلومة واحدة في كل مرة
- الاختيارات لازم تكون قصيرة ومفهومة وواضح الفرق بينها
- ممنوع الأسئلة الخداعية (اللي بتضحك على الطالب بالصياغة) - لكن مسموح الأسئلة اللي تحتاج تفكير حسب المستوى المطلوب
${difficultyInstructions}
- ⚠️ قاعدة مهمة جداً: لازم كل الأسئلة تكون عن مادة "${subjectLabel}" فقط - ممنوع تماماً تسأل عن أي مادة تانية
${subjectInstructions}
${imageSystemRules}
- أجب دائماً بـ JSON فقط، بدون أي نص إضافي`,
    user: `الطالب في الصف: ${grade}
المادة: ${subjectLabel}
اللي ذاكره النهارده: ${description}
${hasImages ? '⚠️ مهم جداً: الصور المرفقة هي المرجع الأساسي - حللها كويس واسأل على اللي فيها بالتحديد' : ''}

تعليمات خاصة بالمادة:
${subjectInstructions}

المستوى المطلوب للأسئلة:
${difficultyInstructions}

أنشئ 8 أسئلة اختيار من متعدد عن مادة "${subjectLabel}":
- كل الأسئلة اختيار من متعدد (3 اختيارات واضحة ومختلفة)
- السؤال قصير ومفهوم والاختيارات واضحة
- ممنوع أسئلة خداعية (لكن مسموح الأسئلة اللي تحتاج تفكير حسب المستوى المطلوب فوق)
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

export function buildCheckinAnalysisPrompt(params: {
  studentName: string
  grade: number
  today: {
    checkin_date: string
    mood: CheckinMood | null
    energy: CheckinEnergy | null
    sleep: CheckinSleep | null
    subjects_studied: CheckinSubject[]
    hardest_thing: string | null
    best_thing: string | null
    bothered: boolean
    bothered_note: string | null
  }
  recent: Array<{
    checkin_date: string
    mood: CheckinMood | null
    energy: CheckinEnergy | null
    subjects_studied: CheckinSubject[]
    hardest_thing: string | null
    bothered: boolean
  }>
}) {
  const subjectsLine = params.today.subjects_studied.length > 0
    ? params.today.subjects_studied.map(s =>
        `${SUBJECT_LABELS[s.subject]}: صعوبة=${s.difficulty}, ثقة=${s.confidence}/5, متعة=${s.enjoyment}`
      ).join(' | ')
    : 'لم يذاكر مواد اليوم'

  const recentLine = params.recent.length > 0
    ? params.recent.map(r =>
        `${r.checkin_date}: mood=${r.mood ?? '?'}, energy=${r.energy ?? '?'}, bothered=${r.bothered ? 'yes' : 'no'}` +
        (r.hardest_thing ? `, hardest="${r.hardest_thing.slice(0, 80)}"` : '') +
        (r.subjects_studied.length > 0
          ? `, subjects=[${r.subjects_studied.map(s => `${s.subject}(c${s.confidence},${s.difficulty})`).join(',')}]`
          : '')
      ).join('\n')
    : 'لا يوجد تشيك-إن سابق'

  return {
    system: `أنت مستشار تعليمي ونفسي بتساعد أهالي الطلاب المصريين يفهموا ابنهم بيحس إزاي ومحتاج إيه.
مهمتك: تحلل التشيك-إن اليومي للطالب مع آخر أيام سابقة، وترجع إشارات واضحة للأهل.
القواعد:
- اكتب بالعامية المصرية البسيطة، باختصار شديد
- كل "red_flag" لازم يكون قصير جداً ومحدد (زي: "ثقة منخفضة في الرياضيات 3 أيام متتالية")، مش شرح طويل
- كل "theme" كلمة أو كلمتين يلخصوا موضوع متكرر (زي: "الكسور"، "قلق من الامتحان")
- الـ summary جملة أو جملتين بس تلخص إحساس اليوم
- ما تبالغش في التحذيرات - بس اللي فعلاً ملحوظ
- لو مفيش إشارات خطر، رجع red_flags فاضية
- أجب بـ JSON فقط`,
    user: `الطالب: ${params.studentName} (الصف ${params.grade})
تاريخ اليوم: ${params.today.checkin_date}

تشيك-إن اليوم:
- المزاج: ${params.today.mood ?? '?'}
- الطاقة: ${params.today.energy ?? '?'}
- النوم: ${params.today.sleep ?? '?'}
- المواد اللي ذاكرها: ${subjectsLine}
- أصعب حاجة: ${params.today.hardest_thing || '(لم يذكر)'}
- أحسن حاجة: ${params.today.best_thing || '(لم يذكر)'}
- في حاجة مضايقاه: ${params.today.bothered ? `آه - "${params.today.bothered_note || 'بدون تفاصيل'}"` : 'لا'}

آخر 6 أيام سابقة (للاتجاه):
${recentLine}

حلل ورجع JSON:
{
  "summary": "<جملة أو جملتين>",
  "red_flags": ["<إشارة خطر قصيرة 1>", "<إشارة خطر قصيرة 2>"],
  "themes": ["<موضوع متكرر 1>", "<موضوع متكرر 2>"]
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
