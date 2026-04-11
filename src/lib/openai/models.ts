export const MODEL_OPTIONS = [
  // GPT-5 series
  { value: 'gpt-5.2', label: 'GPT-5.2' },
  // GPT-4.1 series
  { value: 'gpt-4.1', label: 'GPT-4.1' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
  { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano' },
  // GPT-4o series
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  // GPT-4 series
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-4', label: 'GPT-4' },
  // GPT-3.5
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  // o-series (reasoning models)
  { value: 'o4-mini', label: 'o4-mini' },
  { value: 'o3', label: 'o3' },
  { value: 'o3-pro', label: 'o3-pro' },
  { value: 'o3-mini', label: 'o3-mini' },
  { value: 'o1', label: 'o1' },
  { value: 'o1-mini', label: 'o1-mini' },
  { value: 'o1-preview', label: 'o1-preview' },
] as const

export const VALID_MODEL_VALUES = MODEL_OPTIONS.map(m => m.value)

export type ModelRole = 'reasoning' | 'fast'

export const DEFAULT_MODELS: Record<ModelRole, string> = {
  reasoning: 'gpt-4.1',
  fast: 'gpt-4.1-mini',
}

/** o-series models don't support response_format: { type: 'json_object' } */
export function isOSeriesModel(model: string): boolean {
  return model.startsWith('o')
}
