/**
 * 类型定义文件
 */

export interface Doc {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

// AI设置类型 (单个配置项)
export interface AISettings {
  id: string       // 配置唯一标识
  name: string     // 配置名称，如 "我的CPA" 或 "DeepSeek"
  apiUrl: string   // API地址
  apiKey: string   // API密钥
  model: string    // 模型名称
}

export interface KnowledgeEntry {
  id: string
  category: '人物' | '世界观' | '剧情' | '设定' | '其他'
  title: string
  keywords: string[]
  content: string
}
