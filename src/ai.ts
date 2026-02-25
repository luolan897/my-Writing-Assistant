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
    systemPrompt += '\n资料：' + matched.map(k => k.content).join('\n')
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

  // 使用 allorigins 代理，这可以绕过几乎所有公益站的跨域封锁
  const finalUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

  try {
    const response = await fetch(finalUrl, {
      method: 'POST',
      // 注意：使用 allorigins 这种中转时，有时需要特殊处理 headers
      body: JSON.stringify({
        model: settings.model || 'gpt-3.5-turbo',
        messages: [{ role: 'system', content: systemPrompt }, ...messages.map(m => ({role: m.role, content: m.content}))],
      }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey.trim()}`
      }
    });

    // 如果 allorigins 的 POST 方式有问题，我们回退到不带代理的模式尝试
    // 但通常 Failed to fetch 就是因为需要代理
    if (!response.ok) throw new Error('网络响应异常');

    const data = await response.json();
    // allorigins 会把结果包装在 contents 字段里，如果是字符串需要解析
    const resObj = typeof data.contents === 'string' ? JSON.parse(data.contents) : data;
    return resObj.choices?.[0]?.message?.content || 'AI未返回有效内容';
  } catch (err: any) {
    // 最后的绝招：如果代理也失败，尝试直接请求（万一站长开了跨域呢）
    try {
        const directRes = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey.trim()}` },
            body: JSON.stringify({
                model: settings.model,
                messages: [{ role: 'system', content: systemPrompt }, ...messages.map(m => ({role: m.role, content: m.content}))]
            })
        });
        const directData = await directRes.json();
        return directData.choices[0].message.content;
    } catch (e) {
        throw new Error("接口调用失败。请检查 API Key 或在浏览器安装 Allow CORS 插件。");
    }
  }
}
