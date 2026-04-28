// Hermes-style parallel agentic loop
// Safe (read-only) tools execute concurrently via Promise.all
// Stateful/write tools execute sequentially

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
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set')

  const {
    model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-haiku',
    maxIterations = 40,
    maxTokens = 4096,
  } = options

  let messages: AgentMessage[] = [{ role: 'user', content: prompt }]

  for (let i = 0; i < maxIterations; i++) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'BLKLIST Outreach',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages,
        tools: toolDefs,
        tool_choice: 'auto',
      }),
    })

    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`)
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
