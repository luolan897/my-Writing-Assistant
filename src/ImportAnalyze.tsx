import { useState } from 'react'
import { useStore } from './store'
import { sendToAI } from './ai'
import './ImportAnalyze.css'

export function ImportAnalyze({ onClose }: { onClose: () => void }) {
  const { addKnowledge } = useStore()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAnalyze = async () => {
    if (!text.trim() || loading) return
    setLoading(true)
    try {
      const prompt = `请提取JSON格式数组：\n\n${text}`
      const reply = await sendToAI([{ role: 'user', content: prompt }], null)
      const jsonStr = reply.match(/\[[\s\S]*\]/)?.[0]
      if (jsonStr) {
        JSON.parse(jsonStr).forEach((e: any) => addKnowledge(e))
        alert('成功！')
        onClose()
      }
    } catch (err: any) {
      alert(`失败: ${err.message}`)
    }
    setLoading(false)
  }

  return (
    <div className="import-modal">
      <div className="import-container">
        <textarea value={text} onChange={e => setText(e.target.value)} />
        <button onClick={handleAnalyze} disabled={loading}>分析</button>
        <button onClick={onClose}>取消</button>
      </div>
    </div>
  )
}
