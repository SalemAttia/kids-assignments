import { NextRequest, NextResponse } from 'next/server'
import { getOpenAI, OPENAI_MODEL } from '@/lib/openai/client'
import { SUBJECT_LABELS } from '@/types'
import type { Subject } from '@/types'

const QUICK_ACTIONS: Record<Subject, string[]> = {
  arabic:         ['اشرح القاعدة بمثال', 'الفرق بين كلمتين', 'أعرب هذه الجملة', 'صحح الخطأ الإملائي'],
  math:           ['احل هذه المسألة خطوة بخطوة', 'اشرح القانون', 'أعطني مثالاً أسهل', 'ما الفرق بين العمليتين؟'],
  science:        ['اشرح بمثال من الحياة', 'لماذا يحدث هذا؟', 'ما الفرق بين المفهومين؟', 'لخص الدرس'],
  english:        ['Explain in simple Arabic', 'Give me examples', 'What does this word mean?', 'Fix my sentence'],
  social_studies: ['أين تقع على الخريطة؟', 'لماذا حدث هذا؟', 'متى كان ذلك؟', 'اشرح بأسلوب قصة'],
  religion:       ['اشرح معنى الآية', 'ما حكم هذه المسألة؟', 'أعطني مثالاً', 'لخص الدرس'],
  computer:       ['اشرح بمثال عملي', 'ما الفرق بين المصطلحين؟', 'كيف تعمل هذه التقنية؟', 'أعطني تمريناً'],
  art:            ['اشرح هذه التقنية', 'كيف أرسم هذا؟', 'ما الألوان المناسبة؟', 'أعطني فكرة مشروع'],
  other:          ['اشرح بطريقة أبسط', 'أعطني مثالاً', 'لخص الفكرة', 'كيف أحفظ هذا؟'],
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { subject, question, imageBase64, grade = 6 } = body

    if (!subject || !question?.trim()) {
      return NextResponse.json({ error: 'يرجى إدخال السؤال والمادة' }, { status: 400 })
    }

    const subjectLabel = SUBJECT_LABELS[subject as Subject] || subject
    const openai = getOpenAI()

    const userContent: OpenAI.Chat.ChatCompletionContentPart[] = []

    if (imageBase64) {
      userContent.push({
        type: 'image_url',
        image_url: { url: imageBase64, detail: 'high' },
      })
    }

    userContent.push({
      type: 'text',
      text: `المادة: ${subjectLabel}
الصف: ${grade}
السؤال أو ما لا أفهمه: ${question}

${imageBase64 ? 'الصورة المرفقة تُظهر ما لا أفهمه.' : ''}

اشرح لي بطريقة بسيطة جداً كأنك تشرح لطفل صغير، استخدم أمثلة من الحياة اليومية، وكن ودوداً ومشجعاً.`,
    })

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: `أنت مدرس خبير وودود متخصص في ${subjectLabel} للمرحلة الابتدائية والإعدادية المصرية.
مهمتك: شرح المفاهيم الصعبة بطريقة بسيطة جداً ومسلية للأطفال.
القواعد:
- استخدم لغة عربية بسيطة ومشجعة
- أضف أمثلة من الحياة اليومية
- قسّم الشرح لخطوات قصيرة وواضحة
- استخدم رموز تعبيرية لجعل الشرح ممتعاً
- لا تتجاوز 200 كلمة في الشرح
- في النهاية اكتب "💡 تذكر دائماً:" مع جملة واحدة تلخص الفكرة الرئيسية`,
        },
        {
          role: 'user',
          content: userContent,
        },
      ],
      max_tokens: 600,
      temperature: 0.7,
    })

    const explanation = response.choices[0]?.message?.content || 'عذراً، لم أستطع الشرح الآن. حاول مجدداً!'
    const quickActions = QUICK_ACTIONS[subject as Subject] || QUICK_ACTIONS.other

    return NextResponse.json({ explanation, quickActions })
  } catch (err: unknown) {
    console.error('Explain error:', err)
    return NextResponse.json({ error: 'حدث خطأ، حاول مجدداً' }, { status: 500 })
  }
}

// Need to import OpenAI type for content parts
import type OpenAI from 'openai'
