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

  // --- 这里的逻辑可以适配各种公益站 ---
  let finalUrl = settings.apiUrl.trim();
  
  // 1. 如果没写 http，自动加 https
  if (!finalUrl.startsWith('http')) {
    finalUrl = 'https://' + finalUrl;
  }

  // 2. 智能补全路径：如果用户只写了域名或 v1，补全末尾
  if (!finalUrl.endsWith('/chat/completions')) {
      // 删掉末尾的斜杠
      finalUrl = finalUrl.replace(/\/$/, '');
      if (finalUrl.endsWith('/v1')) {
          finalUrl += '/chat/completions';
      } else {
          finalUrl += '/v1/chat/completions';
      }
  }
  
  // 3. 最终防御：防止出现 v1/v1 的情况
  finalUrl = finalUrl.replace('/v1/v1', '/v1');

  console.log("正在尝试请求接口:", finalUrl); 

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
        const errBody = await res.text();
        // 专门处理常见的错误提示
        if (res.status === 401) throw new Error("API Key 错误或已失效");
        if (res.status === 404) throw new Error("接口地址(URL)填写错误，找不到路径");
        if (res.status === 403) throw new Error("服务器拒绝访问，可能是跨域(CORS)限制");
        throw new Error(`服务器返回错误(${res.status}): ${errBody.slice(0, 100)}`);
    }
    
    const data = await res.json()
    return data.choices?.[0]?.message?.content || 'AI 返回了空内容'
  } catch (err: any) {
    console.error("请求彻底失败:", err);
    // 给小白用户的温馨提示
    if (err.message.includes('Failed to fetch')) {
        return "网络连接失败！可能原因：\n1. 你的网络无法直接访问该公益站\n2. 该公益站禁止了浏览器跨域请求(CORS)\n3. 接口地址拼写错误";
    }
    return `请求出错: ${err.message}`;
  }
}
