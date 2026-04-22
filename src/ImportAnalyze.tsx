import { useState } from 'react'
import { useStore } from './store'
import { sendToAI } from './ai'
import './ImportAnalyze.css'

export function ImportAnalyze({ onClose }: { onClose: () => void }) {
  // 修改这里：移除了 aiSettings
  const { addKnowledge } = useStore()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAnalyze = async () => {
    if (!text.trim() || loading) return
    setLoading(true)
    try {
      const prompt = `请分析以下文本，提取其中的人物、地理、势力设定，以JSON数组格式返回，每个对象包含 category(分类), title(标题), keywords(关键词数组), content(内容) 字段：\n\n${text}`
      // 注意：sendToAI 现在不需要传入第二个参数了，它内部会自动获取
      const reply = await sendToAI([{ role: 'user', content: prompt }], null)
      const jsonStr = reply.match(/\[[\s\S]*\]/)?.[0]
      if (jsonStr) {
        const entries = JSON.parse(jsonStr)
        entries.forEach((e: any) => addKnowledge(e))
        alert('分析导入成功！')
        onClose()
      } else {
        alert('无法解析 AI 返回的内容')
      }
    } catch (err: any) {
      alert(`分析失败: ${err.message}`)
    }
    setLoading(false)
  }

  return (
    <div className="import-modal">
      <div className="import-container">
        <div className="import-header">
          <h3>AI 提取设定</h3>
          <button onClick={onClose}>×</button>
        </div>
        <textarea 
          placeholder="粘贴想要分析的内容，AI 将自动提取人物和设定..." 
          value={text} 
          onChange={e => setText(e.target.value)} 
        />
        <div className="import-footer">
          <button className="btn-cancel" onClick={onClose}>取消</button>
          <button className="btn-confirm" onClick={handleAnalyze} disabled={loading}>
            {loading ? '分析中...' : '开始分析'}
          </button>
        </div>
      </div>
    </div>
  )
}
