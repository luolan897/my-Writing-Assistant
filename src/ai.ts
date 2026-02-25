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

export async function sendToAI(
  messages: Message[],
  settings: AISettings,
  currentContent?: string
): Promise<string> {
  const lastUserMsg = messages[messages.length - 1]?.content || ''
  const matched = getMatchedKnowledge(lastUserMsg)

  let systemPrompt = `你是一个专业的小说写作助手。帮助用户进行创作、润色、分析角色、构思情节等。
回答要简洁实用，直接给出建议或修改后的内容。`

  if (matched.length > 0) {
    systemPrompt += '\n\n以下是相关的设定资料，请参考：\n'
    matched.forEach((k) => {
      systemPrompt += `\n【${k.category}】${k.title}：\n${k.content}\n`
    })
  }

  if (currentContent) {
    const plainText = currentContent.replace(/<[^>]*>/g, '').trim()
    if (plainText.length > 0) {
      systemPrompt += `\n\n当前文档内容：\n${plainText.slice(0, 3000)}`
    }
  }

  // 1. 处理原始 URL
  let targetUrl = settings.apiUrl.trim();
  if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;
  if (!targetUrl.endsWith('/chat/completions')) {
      targetUrl = targetUrl.replace(/\/$/, '') + '/v1/chat/completions';
  }
  targetUrl = targetUrl.replace('/v1/v1', '/v1');

  // 2. 【核心黑科技】使用公开代理服务绕过浏览器跨域限制
  // 这样网页版就能像 Cherry Studio 一样访问任何公益站了
  const finalUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

  try {
    const res = await fetch(finalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: settings.model.trim() || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
        stream: false
      }),
    })

    if (!res.ok) {
        const errDetail = await res.text();
        throw new Error(`API错误: ${res.status} ${errDetail}`);
    }
    
    const data = await res.json()
    return data.choices?.[0]?.message?.content || '无响应'
  } catch (err: any) {
    console.error("请求失败:", err);
    return `请求失败了。原因：${err.message}\n提示：请检查 API Key 是否正确。`;
  }
}
