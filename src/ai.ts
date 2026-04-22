import type { Message, KnowledgeEntry } from './types'
import { useStore } from './store'

export function getMatchedKnowledge(text: string): KnowledgeEntry[] {
  const { knowledge, externalKnowledge } = useStore.getState()
  const allKnowledge = [...knowledge, ...externalKnowledge]
  return allKnowledge.filter((k) => {
    const keywords = Array.isArray(k.keywords) ? k.keywords : []
    return keywords.some((kw) => text.toLowerCase().includes(kw.toLowerCase()))
  })
}

export async function sendToAI(messages: Message[], _ignored: any, currentContent?: string): Promise<string> {
  const { aiProviders, activeProviderId } = useStore.getState()
  const settings = aiProviders.find(p => p.id === activeProviderId) || aiProviders[0]

  if (!settings.apiUrl) throw new Error('请先在设置中配置 AI 服务地址')

  const lastUserMsg = messages[messages.length - 1]?.content || ''
  const matched = getMatchedKnowledge(lastUserMsg)
  
  let systemPrompt = `你是一个写作助手。`
  if (matched.length > 0) systemPrompt += '\n参考资料：' + matched.map(k => k.content).join('\n')
  if (currentContent) systemPrompt += `\n内容预览：${currentContent.replace(/<[^>]*>/g, '').slice(0, 1000)}`

  // 规范化 URL
  let baseUrl = settings.apiUrl.trim().replace(/\/+$/, '')
  if (!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl
  let finalUrl = baseUrl
  if (!finalUrl.endsWith('/chat/completions')) {
    finalUrl = finalUrl.endsWith('/v1') ? `${finalUrl}/chat/completions` : `${finalUrl}/v1/chat/completions`
  }

  const res = await fetch(finalUrl, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      'Authorization': `Bearer ${settings.apiKey.trim()}` 
    },
    body: JSON.stringify({
      model: settings.model.trim() || 'gpt-3.5-turbo',
      messages: [{ role: 'system', content: systemPrompt }, ...messages.map(m => ({role: m.role, content: m.content}))],
      stream: false
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`API错误 ${res.status}: ${errText}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content || 'AI未响应'
}
