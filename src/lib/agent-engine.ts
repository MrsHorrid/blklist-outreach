// Hermes-style parallel agentic loop
// Safe (read-only) tools execute concurrently via Promise.all
// Stateful/write tools execute sequentially

import { getAIProvider } from './ai-provider'

export type ToolDef = {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: object
  }
}

export type AgentMessage = {
  role: 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

type ToolCall = {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

// These tools are read-only and safe to run in parallel
const PARALLEL_SAFE = new Set([
  'web_search',
  'fetch_page',
  'firecrawl_scrape',
  'check_mx_record',
  'find_email_pattern',
])

export type AgentOptions = {
  model?: string
  maxIterations?: number
  maxTokens?: number
}

export async function runAgent(
  prompt: string,
  toolDefs: ToolDef[],
  executor: (name: string, args: Record<string, string>) => Promise<string>,
  options: AgentOptions = {}
): Promise<string> {
  const { apiKey, baseUrl, model: defaultModel, extraHeaders } = getAIProvider()

  const {
    model = defaultModel,
    maxIterations = 40,
    maxTokens = 4096,
  } = options

  let messages: AgentMessage[] = [{ role: 'user', content: prompt }]

  for (let i = 0; i < maxIterations; i++) {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...extraHeaders,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages,
        tools: toolDefs,
        tool_choice: 'auto',
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      // Groq returns 400 with code "tool_use_failed" when the model generates a
      // malformed tool call (XML-style instead of JSON). Retry once with a nudge.
      let errJson: { error?: { code?: string } } = {}
      try { errJson = JSON.parse(errText) } catch { /* ignore */ }
      if (res.status === 400 && errJson.error?.code === 'tool_use_failed' && i < maxIterations - 1) {
        console.warn(`[agent] tool_use_failed on iteration ${i}, retrying...`)
        messages = [...messages, {
          role: 'user',
          content: 'Your last response contained a malformed tool call. Please retry using the correct JSON tool_calls format.',
        }]
        continue
      }
      throw new Error(`AI provider ${res.status}: ${errText}`)
    }
    const data = await res.json()
    const choice = data.choices?.[0]
    if (!choice) throw new Error('Empty response from model')

    const reply: AgentMessage = {
      role: 'assistant',
      content: choice.message.content ?? null,
      tool_calls: choice.message.tool_calls,
    }
    messages = [...messages, reply]

    // No tool calls = final answer
    if (choice.finish_reason !== 'tool_calls' || !reply.tool_calls?.length) {
      return reply.content ?? ''
    }

    const calls = reply.tool_calls as ToolCall[]
    const allSafe = calls.every(c => PARALLEL_SAFE.has(c.function.name))

    let toolResults: AgentMessage[]

    if (allSafe && calls.length > 1) {
      // Hermes pattern: safe tools run in parallel
      toolResults = await Promise.all(
        calls.map(async (call) => {
          const args = JSON.parse(call.function.arguments || '{}') as Record<string, string>
          const preview = Object.values(args)[0]?.slice(0, 70) ?? ''
          console.log(`[agent:⚡parallel] ${call.function.name}(${preview})`)
          const result = await executor(call.function.name, args)
          return { role: 'tool' as const, tool_call_id: call.id, content: result }
        })
      )
    } else {
      // Sequential for stateful tools or single call
      toolResults = []
      for (const call of calls) {
        const args = JSON.parse(call.function.arguments || '{}') as Record<string, string>
        const preview = Object.values(args)[0]?.slice(0, 70) ?? ''
        console.log(`[agent:→sequential] ${call.function.name}(${preview})`)
        const result = await executor(call.function.name, args)
        toolResults.push({ role: 'tool', tool_call_id: call.id, content: result })
      }
    }

    messages = [...messages, ...toolResults]
  }

  throw new Error(`Agent exceeded ${maxIterations} iterations`)
}
