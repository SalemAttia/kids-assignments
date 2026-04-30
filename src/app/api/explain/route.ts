import { NextRequest, NextResponse } from 'next/server'
import type OpenAI from 'openai'
import { getOpenAI, getModelForRole } from '@/lib/openai/client'
import { SUBJECT_LABELS } from '@/types'
import type { Subject } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const QUICK_ACTIONS: Record<Subject, string[]> = {
  arabic:         ['اشرح القاعدة بمثال', 'الفرق بين كلمتين', 'أعرب هذه الجملة', 'صحح الخطأ الإملائي'],
  math:           ['احل المسألة خطوة خطوة', 'اشرح القانون', 'مثال أسهل', 'الفرق بين العمليتين'],
  science:        ['اشرح بمثال من البيت', 'ليه بيحصل ده؟', 'الفرق بين المفهومين', 'لخصلي الدرس'],
  english:        ['اشرحها بالعربي', 'هاتلي أمثلة', 'يعني إيه الكلمة دي؟', 'صحح الجملة'],
  social_studies: ['فين على الخريطة؟', 'ليه حصل ده؟', 'إمتى كان ده؟', 'احكيلي القصة'],
  religion:       ['معنى الآية', 'ما حكم كده؟', 'هاتلي مثال', 'لخصلي الدرس'],
  computer:       ['اشرح بمثال عملي', 'الفرق بين المصطلحين', 'إزاي بتشتغل؟', 'هاتلي تمرين'],
  art:            ['اشرح التقنية', 'إزاي أرسم ده؟', 'إيه الألوان المناسبة؟', 'فكرة مشروع'],
  other:          ['اشرح أبسط', 'هاتلي مثال', 'لخصلي الفكرة', 'إزاي أحفظها؟'],
}

const SUBJECT_TIPS: Record<Subject, string> = {
  arabic:         'لو فيه قاعدة نحوية أو إملائية اشرحها بمثال من جملة بسيطة، ولو فيه إعراب اعربها كلمة كلمة.',
  math:           'لو فيه مسألة حلها خطوة خطوة بالأرقام بدون ما تتخطى أي خطوة، واكتب القانون قبل التطبيق.',
  science:        'اربط المفهوم العلمي بحاجة الطفل بيشوفها كل يوم في البيت أو الشارع أو في جسمه.',
  english:        'اشرح الكلمة الإنجليزية بالعربي الأول، بعدين هات مثال إنجليزي بسيط جداً مع ترجمته.',
  social_studies: 'احكي زي ما بتحكي قصة - أماكن، شخصيات، وقت، وليه الموضوع ده مهم.',
  religion:       'اشرح بأسلوب محترم وبسيط، واربط المعنى بسلوك الطفل في حياته اليومية.',
  computer:       'اشرح المفهوم التقني بتشبيه من الحياة العادية (زي شبه إيه؟).',
  art:            'صف الألوان والأشكال والخطوات بشكل واضح، وشجع الطفل على المحاولة.',
  other:          'بسّط الفكرة قد ما تقدر واربطها بحاجة الطفل يعرفها.',
}

function buildSystemPrompt(subject: Subject, grade: number, hasImages: boolean) {
  const subjectLabel = SUBJECT_LABELS[subject]
  const subjectTip = SUBJECT_TIPS[subject]

  const imageRules = hasImages
    ? `
🖼️ في صور مرفوعة من الطالب - دي أهم حاجة:
- اقرا كل اللي في الصور بدقة: نصوص، معادلات، رسومات، جداول، أرقام، أسماء
- لو في أكتر من صورة، حللها كلها وفهم العلاقة بينهم (ممكن تكون صفحات متتالية من الكتاب)
- ابدأ شرحك بإنك تقول للطالب باختصار "اللي في الصورة هو..." عشان يحس إنك فاهم
- ركز شرحك على المحتوى الفعلي اللي في الصور بالتحديد، مش شرح عام
- لو الصورة فيها مسألة محلولة جزئياً أو بيها خطأ، نبه عليها واشرح الصح`
    : ''

  return `أنت "أ. ذكي" 🤖 - مدرس خصوصي ودود ومرح بيشرح للأطفال في الصف ${grade} الابتدائي/الإعدادي.
بتتكلم بالعامية المصرية البسيطة الحلوة (مش فصحى جامدة)، وأسلوبك مشجع زي صاحب الطفل اللي شاطر.

🎯 مهمتك: تبسّط أي حاجة صعبة في مادة "${subjectLabel}" وتخلي الطفل يفهمها ويفرح إنه فهم.

📋 لازم تتبع الترتيب ده بالظبط في كل شرح:

**1. 👋 ابدأ بسطر تشجيع قصير**
زي: "تمام يا بطل! تعالى أوريك حاجة سهلة قوي 😊"

**2. 💡 الفكرة بكلمتين**
جملة واحدة بسيطة جداً تشرح الموضوع كأنك بتقوله لطفل عمره 5 سنين.

**3. 📝 الشرح خطوة خطوة**
قسّم الشرح لـ 2-4 نقط مرقمة (1️⃣, 2️⃣, 3️⃣). كل نقطة جملة قصيرة واضحة.

**4. 🌟 مثال من حياتنا**
هات مثال حقيقي من حياة الطفل (أكل، لعب، مدرسة، أهل، موبايل، كورة) يوضح الفكرة.
${subject === 'math' ? 'لو رياضيات، حل المثال بالأرقام كاملة.' : ''}
${subject === 'english' ? 'لو إنجليزي، هات مثال إنجليزي مع ترجمته.' : ''}

**5. ⚠️ خد بالك (اختياري)**
لو فيه غلطة الأطفال بيقعوا فيها كتير، نبه عليها في سطر واحد.

**6. 💡 تذكر دايماً:**
في الآخر بالظبط اكتب "💡 تذكر دايماً:" وبعدها جملة واحدة قصيرة جداً تلخص الفكرة الأساسية.

📐 قواعد عامة:
- استخدم رموز تعبيرية (إيموجي) في كل قسم عشان الشرح يبقى ممتع
- جمل قصيرة جداً، كل جملة في سطر
- ممنوع تستخدم كلمات صعبة - لو لازم تستخدم مصطلح، اشرحه فوراً
- الشرح كله ما يزيدش عن 250 كلمة
- ${subjectTip}
${imageRules}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { subject, question, imageBase64, imageBase64Array, grade = 6 } = body

    const images: string[] = imageBase64Array && imageBase64Array.length > 0
      ? imageBase64Array
      : imageBase64 ? [imageBase64] : []

    if (!subject) {
      return NextResponse.json({ error: 'اختار المادة الأول' }, { status: 400 })
    }

    if (!question?.trim() && images.length === 0) {
      return NextResponse.json({ error: 'اكتب سؤالك أو ارفع صورة من الكتاب' }, { status: 400 })
    }

    const subjectLabel = SUBJECT_LABELS[subject as Subject] || subject
    const hasImages = images.length > 0
    const openai = getOpenAI()

    const userContent: OpenAI.Chat.ChatCompletionContentPart[] = []

    for (const img of images) {
      userContent.push({
        type: 'image_url',
        image_url: { url: img, detail: 'high' },
      })
    }

    const userText = hasImages
      ? `المادة: ${subjectLabel} | الصف: ${grade}
عدد الصور المرفوعة: ${images.length}

سؤالي: ${question?.trim() || '(مفيش سؤال مكتوب - اشرحلي اللي في الصور دي بالتفصيل واتأكد إني فاهم كل اللي فيها)'}

اشرحلي بطريقة بسيطة وممتعة، واتبع الترتيب اللي اتفقنا عليه (تشجيع → فكرة بكلمتين → خطوات → مثال من حياتي → تذكر دايماً).`
      : `المادة: ${subjectLabel} | الصف: ${grade}

سؤالي: ${question}

اشرحلي بطريقة بسيطة وممتعة، واتبع الترتيب اللي اتفقنا عليه (تشجيع → فكرة بكلمتين → خطوات → مثال من حياتي → تذكر دايماً).`

    userContent.push({ type: 'text', text: userText })

    const model = await getModelForRole('fast')
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: buildSystemPrompt(subject as Subject, grade, hasImages) },
        { role: 'user',   content: userContent },
      ],
      max_tokens: 900,
      temperature: 0.7,
    })

    const explanation = response.choices[0]?.message?.content?.trim()
      || 'آسف، مقدرتش أشرحلك دلوقتي. حاول تاني بعد شوية! 🙏'
    const quickActions = QUICK_ACTIONS[subject as Subject] || QUICK_ACTIONS.other

    return NextResponse.json({ explanation, quickActions })
  } catch (err: unknown) {
    console.error('Explain error:', err)
    return NextResponse.json({ error: 'في مشكلة صغيرة، جرب تاني بعد ثانية 🙏' }, { status: 500 })
  }
}
