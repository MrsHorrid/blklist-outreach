type ProviderConfig = {
  apiKey: string
  baseUrl: string
  model: string
  extraHeaders: Record<string, string>
}

export function getAIProvider(): ProviderConfig {
  const provider = process.env.AI_PROVIDER || 'openrouter'

  if (provider === 'groq') {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) throw new Error('GROQ_API_KEY is not set')
    return {
      apiKey,
      baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      extraHeaders: {},
    }
  }

  // OpenRouter (default)
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set')
  return {
    apiKey,
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    model: process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash',
    extraHeaders: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'BLKLIST Outreach',
    },
  }
}
