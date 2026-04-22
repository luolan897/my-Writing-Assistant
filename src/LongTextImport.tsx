import { useState } from 'react'
import { useStore } from './store'
import { sendToAI } from './ai'
import './LongTextImport.css'

export function LongTextImport({ onClose }: { onClose: () => void }) {
  const { addKnowledge } = useStore()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleImport = async () => {
    if (!text.trim() || loading) return
    setLoading(true)
    const chapters = text.split(/第[一二三四五六七八九十百\d]+章/).filter(c => c.length > 100)
    try {
      for (let i = 0; i < chapters.length; i++) {
        setProgress(Math.round(((i + 1) / chapters.length) * 100))
        const prompt = `分析此章节提取设定(JSON数组格式): ${chapters[i].slice(0, 2000)}`
        await sendToAI([{ role: 'user', content: prompt }], null).then(reply => {
           const jsonStr = reply.match(/\[[\s\S]*\]/)?.[0]
           if (jsonStr) JSON.parse(jsonStr).forEach((e: any) => addKnowledge(e))
        })
      }
      alert('分析完成！')
      onClose()
    } catch (err: any) {
      alert(`出错: ${err.message}`)
    }
    setLoading(false)
  }

  return (
    <div className="long-import-modal">
      <div className="long-import-container">
        <h3>长文分析</h3>
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="粘贴长篇文本..." />
        <div className="actions">
          <span>{loading ? `处理中: ${progress}%` : ''}</span>
          <button onClick={onClose}>取消</button>
          <button onClick={handleImport} disabled={loading}>开始</button>
        </div>
      </div>
    </div>
  )
}
