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
  if (matched.length > 0) systemPrompt += '\n参考资料：' + matched.map(k => k.content).join('\n')
  if (currentContent) systemPrompt += `\n内容预览：${currentContent.replace(/<[^>]*>/g, '').slice(0, 1000)}`

  // 1. 严格处理 URL（模拟 Cherry Studio 的逻辑）
  let baseUrl = settings.apiUrl.trim();
  if (!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;
  
  // 移除所有末尾斜杠
  baseUrl = baseUrl.replace(/\/+$/, '');

  // 确保最终路径包含 /chat/completions
  let finalUrl = baseUrl;
  if (!finalUrl.endsWith('/chat/completions')) {
    if (finalUrl.endsWith('/v1')) {
      finalUrl += '/chat/completions';
    } else {
      finalUrl += '/v1/chat/completions';
    }
  }

  // 2. 构造请求体
  const body = {
    model: settings.model.trim() || 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: systemPrompt }, 
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ],
    stream: false
  };

  try {
    const res = await fetch(finalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey.trim() || 'sk-dummy'}`,
      },
      body: JSON.stringify(body),
      // 设置为 cors 模式
      mode: 'cors',
    });

    if (!res.ok) {
      const errDetail = await res.text();
      throw new Error(`HTTP ${res.status}: ${errDetail || '未知错误'}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'AI 未返回有效回复';

  } catch (error: any) {
    console.error('AI Request Error:', error);

    // 错误类型判断
    if (error.message.includes('Failed to fetch')) {
      return `【网络/跨域错误】\n1. 请检查 Render 地址是否填错：${finalUrl}\n2. CPA 服务可能没允许跨域 (CORS)。\n3. Render 正在休眠，请稍后再试。`;
    }
    
    return `AI 响应失败：${error.message}`;
  }
}
