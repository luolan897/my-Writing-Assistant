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
  if (matched.length > 0) {
    systemPrompt += '\n参考资料：' + matched.map(k => k.content).join('\n')
  }
  if (currentContent) {
    systemPrompt += `\n文档：${currentContent.replace(/<[^>]*>/g, '').slice(0, 1000)}`
  }

  let targetUrl = settings.apiUrl.trim();
  if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;
  if (!targetUrl.endsWith('/chat/completions')) {
    targetUrl = targetUrl.replace(/\/$/, '') + '/v1/chat/completions';
  }
  targetUrl = targetUrl.replace('/v1/v1', '/v1');

  // 使用跨域代理。
  const finalUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

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
    })
  });

  if (!res.ok) {
      const err = await res.text();
      throw new Error(err || `错误码:${res.status}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'AI无响应';
}
