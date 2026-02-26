import type { Message, AISettings, KnowledgeEntry } from './types'
import { useStore } from './store'

export function getMatchedKnowledge(text: string): KnowledgeEntry[] {
  const { knowledge, externalKnowledge } = useStore.getState()
  const allKnowledge = [...knowledge, ...externalKnowledge]
  return allKnowledge.filter((k) => {
    const keywords = Array.isArray(k.keywords) ? k.keywords : []
    return keywords.some((kw) => text.toLowerCase().includes(kw.toLowerCase()))
  })
}

export async function sendToAI(messages: Message[], settings: AISettings, currentContent?: string): Promise<string> {
  const lastUserMsg = messages[messages.length - 1]?.content || ''
  const matched = getMatchedKnowledge(lastUserMsg)

  let systemPrompt = `你是一个写作助手。`
  if (matched.length > 0) systemPrompt += '\n参考资料：\n' + matched.map(k => k.content).join('\n')
  if (currentContent) systemPrompt += `\n文档内容：${currentContent.replace(/<[^>]*>/g, '').slice(0, 1000)}`

  let finalUrl = settings.apiUrl.trim();
  if (!finalUrl.startsWith('http')) finalUrl = 'https://' + finalUrl;
  if (!finalUrl.endsWith('/chat/completions')) {
    finalUrl = finalUrl.replace(/\/$/, '') + '/v1/chat/completions';
  }
  finalUrl = finalUrl.replace('/v1/v1', '/v1');

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
  });

  if (!res.ok) {
    const errText = await res.text();
    try {
      const errObj = JSON.parse(errText);
      throw new Error(errObj.error?.message || errObj.message || `API码:${res.status}`);
    } catch {
      throw new Error(errText.slice(0, 100) || `API状态码:${res.status}`);
    }
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'AI无响应';
}
