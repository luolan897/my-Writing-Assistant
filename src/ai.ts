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
  
  // 1. 构建 System Prompt
  let systemPrompt = `你是一个写作助手。`
  if (matched.length > 0) systemPrompt += '\n参考资料：' + matched.map(k => k.content).join('\n')
  if (currentContent) systemPrompt += `\n内容预览：${currentContent.replace(/<[^>]*>/g, '').slice(0, 1000)}`

  // 2. 智能处理 URL
  let baseUrl = settings.apiUrl.trim();
  
  // 确保有协议头
  if (!/^https?:\/\//i.test(baseUrl)) {
    baseUrl = 'https://' + baseUrl;
  }

  // 移除末尾的所有斜杠
  baseUrl = baseUrl.replace(/\/+$/, '');

  let finalUrl = baseUrl;

  // 核心逻辑：确保路径以 /v1/chat/completions 结尾，且不重复拼接
  if (!finalUrl.endsWith('/chat/completions')) {
    if (finalUrl.endsWith('/v1')) {
      finalUrl += '/chat/completions';
    } else {
      finalUrl += '/v1/chat/completions';
    }
  }

  console.log('--- AI 请求详情 ---');
  console.log('请求地址:', finalUrl);
  console.log('使用模型:', settings.model);

  try {
    // 设置请求超时（Render 唤醒可能很慢，这里不设死，交给浏览器默认）
    const res = await fetch(finalUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${settings.apiKey.trim()}` 
      },
      body: JSON.stringify({
        model: settings.model.trim() || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt }, 
          ...messages.map(m => ({ role: m.role, content: m.content }))
        ],
        stream: false
      }),
    });

    if (!res.ok) {
      const errorDetail = await res.text();
      console.error('API 响应错误:', res.status, errorDetail);
      throw new Error(`服务器返回错误 ${res.status}: ${errorDetail.slice(0, 100)}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('API 返回格式异常:', data);
      return 'AI 返回了空内容，请检查后台日志。';
    }

    return content;

  } catch (error: any) {
    console.error('请求发生异常:', error);
    
    // 针对常见错误的友好提示
    if (error.message.includes('Failed to fetch')) {
      return `无法连接到 AI 服务器。原因可能是：\n1. URL 填写错误 (当前: ${finalUrl})\n2. Render 实例正在启动，请等待一分钟后重试\n3. 跨域 (CORS) 被拦截`;
    }
    
    return `请求失败: ${error.message}`;
  }
}
