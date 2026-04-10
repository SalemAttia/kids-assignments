import OpenAI from 'openai'

let _openai: OpenAI | null = null

export function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'placeholder',
    })
  }
  return _openai
}

// Keep backward-compatible export that lazily instantiates
export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    return (getOpenAI() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1'

import { DEFAULT_MODELS, type ModelRole } from './models'

export async function getModelForRole(role: ModelRole): Promise<string> {
  try {
    const { createServerClient } = await import('@/lib/supabase/server')
    const supabase = await createServerClient()
    const { data } = await supabase
      .from('ai_settings')
      .select('reasoning_model, fast_model')
      .eq('id', 'global')
      .single()

    if (!data) return DEFAULT_MODELS[role]
    return role === 'reasoning' ? data.reasoning_model : data.fast_model
  } catch {
    return DEFAULT_MODELS[role]
  }
}
