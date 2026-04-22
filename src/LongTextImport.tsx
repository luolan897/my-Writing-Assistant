import { useState } from 'react'
import { useStore } from './store'
import { sendToAI } from './ai'
import './LongTextImport.css'

export function LongTextImport({ onClose }: { onClose: () => void }) {
  // 修改这里：移除了 aiSettings
  const { addKnowledge } = useStore()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleImport = async () => {
    if (!text.trim() || loading) return
    setLoading(true)
    
    // 简单的按章节切分逻辑
    const chapters = text.split(/第[一二三四五六七八九十百\d]+章/).filter(c => c.length > 100)
    
    try {
      for (let i = 0; i < chapters.length; i++) {
        setProgress(Math.round(((i + 1) / chapters.length) * 100))
        const prompt = `分析此章节提取设定(JSON数组格式): ${chapters[i].slice(0, 2000)}`
        const reply = await sendToAI([{ role: 'user', content: prompt }], null)
        const jsonStr = reply.match(/\[[\s\S]*\]/)?.[0]
        if (jsonStr) {
          JSON.parse(jsonStr).forEach((e: any) => addKnowledge(e))
        }
      }
      alert('长文分段分析完成！')
      onClose()
    } catch (err: any) {
      alert(`处理出错: ${err.message}`)
    }
    setLoading(false)
  }

  return (
    <div className="long-import-modal">
      <div className="long-import-container">
        <h3>长文导入分析</h3>
        <p>支持粘贴数万字内容，系统将自动切分并逐段分析提取设定。</p>
        <textarea 
          value={text} 
          onChange={e => setText(e.target.value)} 
          placeholder="在此粘贴长篇文本..." 
        />
        {loading && <div className="progress-bar"><div style={{ width: `${progress}%` }}></div></div>}
        <div className="actions">
          <button onClick={onClose}>取消</button>
          <button className="btn-run" onClick={handleImport} disabled={loading}>
            {loading ? `处理中 ${progress}%` : '开始长文分析'}
          </button>
        </div>
      </div>
    </div>
  )
}
