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

  let systemPrompt = `你是一个小说写作助手。`
  if (matched.length > 0) {
    systemPrompt += '\n参考资料：' + matched.map(k => k.content).join('\n')
  }
  if (currentContent) {
    systemPrompt += `\n文档内容：${currentContent.replace(/<[^>]*>/g, '').slice(0, 1000)}`
  }

  let targetUrl = settings.apiUrl.trim();
  if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;
  if (!targetUrl.endsWith('/chat/completions')) {
    targetUrl = targetUrl.replace(/\/$/, '') + '/v1/chat/completions';
  }
  targetUrl = targetUrl.replace('/v1/v1', '/v1');

  // 使用代理绕过跨域封锁
  const finalUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

  const response = await fetch(finalUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey.trim()}`
    },
    body: JSON.stringify({
      model: settings.model || 'gpt-3.5-turbo',
      messages: [{ role: 'system', content: systemPrompt }, ...messages.map(m => ({role: m.role, content: m.content}))],
      stream: false
    })
  });

  if (!response.ok) throw new Error(`API报错: ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'AI未返回内容';
}
