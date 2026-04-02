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

export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o'
