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

  let systemPrompt = `你是一个专业的小说写作助手。帮助用户进行创作、润色、分析角色、构思情节等。
回答要简洁实用，直接给出建议或修改后的内容。`

  if (matched.length > 0) {
    systemPrompt += '\n\n以下是相关的设定资料，请参考：\n'
    matched.forEach((k) => { systemPrompt += `\n【${k.category}】${k.title}：\n${k.content}\n` })
  }

  if (currentContent) {
    const plainText = currentContent.replace(/<[^>]*>/g, '').trim()
    if (plainText.length > 0) systemPrompt += `\n\n当前文档内容：\n${plainText.slice(0, 3000)}`
  }

  // --- 跨域修复逻辑 ---
  let rawUrl = settings.apiUrl.trim();
  if (!rawUrl.startsWith('http')) rawUrl = 'https://' + rawUrl;
  if (!rawUrl.endsWith('/chat/completions')) {
      rawUrl = rawUrl.replace(/\/$/, '') + '/v1/chat/completions';
  }
  rawUrl = rawUrl.replace('/v1/v1', '/v1');

  // 使用代理绕过 CORS 限制
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(rawUrl)}`;

  const res = await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: settings.model.trim() || 'gpt-3.5-turbo',
      messages: [{ role: 'system', content: systemPrompt }, ...messages.map(m => ({role: m.role, content: m.content}))],
      stream: false
    }),
  })

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API错误(${res.status}): ${errText}`);
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content || '无响应'
}
