import { useState } from 'react'
import { useStore } from './store'
import { sendToAI } from './ai'
import './LongTextImport.css'

export function LongTextImport({ onClose }: { onClose: () => void }) {
  const { addKnowledge } = useStore()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  const handleImport = async () => {
    if (!text.trim() || loading) return
    setLoading(true)
    try {
      const prompt = `提取设定: ${text.slice(0, 2000)}`
      const reply = await sendToAI([{ role: 'user', content: prompt }], null)
      const jsonStr = reply.match(/\[[\s\S]*\]/)?.[0]
      if (jsonStr) {
        JSON.parse(jsonStr).forEach((e: any) => addKnowledge(e))
        alert('完成')
        onClose()
      }
    } catch (err: any) {
      alert(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="long-import-modal">
      <textarea value={text} onChange={e => setText(e.target.value)} />
      <button onClick={handleImport} disabled={loading}>开始</button>
      <button onClick={onClose}>关闭</button>
    </div>
  )
}
