import { useState, useEffect } from 'react'
import { useStore, getCurrentDoc } from './store'
import { sendToAI, getMatchedKnowledge } from './ai'
import { exportToTxt, exportToWord } from './export'
import { Editor } from './Editor'
import { Knowledge } from './Knowledge'
import './App.css'

function App() {
  const { docs, currentDocId, messages, aiSettings, knowledge, externalKnowledge, addDoc, updateDoc, renameDoc, deleteDoc, setCurrentDoc, addMessage, clearMessages, removeMessagesFrom, updateAISettings, appendToKnowledge, setExternalKnowledge, clearExternalKnowledge } = useStore()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showKnowledge, setShowKnowledge] = useState(false)
  const [editingTitle, setEditingTitle] = useState<string | null>(null)
  const [saveDropdown, setSaveDropdown] = useState<string | null>(null)
  const [storageUsage, setStorageUsage] = useState('')

  const currentDoc = getCurrentDoc()
  const matchedKnowledge = input ? getMatchedKnowledge(input) : []

  useEffect(() => {
    const data = localStorage.getItem('writing-assistant-store') || ''
    setStorageUsage((data.length / 1024).toFixed(1) + " KB")
  }, [docs, knowledge, messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user' as const, content: input }
    addMessage(userMsg); setInput(''); setLoading(true)
    try {
      const reply = await sendToAI([...messages, userMsg], aiSettings, currentDoc?.content)
      addMessage({ role: 'assistant', content: reply })
    } catch (err: any) {
      addMessage({ role: 'assistant', content: `请求失败: ${err.message}` })
    }
    setLoading(false)
  }

  // 重新生成逻辑：传入当前消息的索引
  const handleRegenerate = async (index: number) => {
    if (loading) return
    // 1. 获取这条消息之前的历史
    const history = messages.slice(0, index)
    // 2. 从 Store 中删掉这条回复及之后的内容
    removeMessagesFrom(index)
    // 3. 重新请求
    setLoading(true)
    try {
      const reply = await sendToAI(history, aiSettings, currentDoc?.content)
      addMessage({ role: 'assistant', content: reply })
    } catch (err: any) {
      addMessage({ role: 'assistant', content: `重新生成失败: ${err.message}` })
    }
    setLoading(false)
  }

  const insertToEditor = (text: string) => {
    if (!currentDoc) return
    updateDoc(currentDoc.id, currentDoc.content + '<p>' + text.replace(/\n/g, '</p><p>') + '</p>')
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header"><h2>📚 文档</h2><button onClick={() => {const t = prompt('标题:'); if(t) addDoc(t)}}>+ 新建</button></div>
        <ul className="doc-list">
          {docs.map((doc) => (
            <li key={doc.id} className={doc.id === currentDocId ? 'active' : ''} onClick={() => setCurrentDoc(doc.id)}>
              {editingTitle === doc.id ? <input autoFocus defaultValue={doc.title} onBlur={(e) => { renameDoc(doc.id, e.target.value); setEditingTitle(null) }} /> : <><span onDoubleClick={() => setEditingTitle(doc.id)}>{doc.title}</span><button onClick={(e) => {e.stopPropagation(); if(confirm('删除?')) deleteDoc(doc.id)}}>×</button></>}
            </li>
          ))}
        </ul>
        <div className="sidebar-footer">
          <button onClick={() => setShowKnowledge(true)}>📖 知识库({knowledge.length})</button>
          <button onClick={() => setShowSettings(true)}>⚙️ 设置</button>
        </div>
      </aside>

      <main className="main">
        {currentDoc ? (
          <><div className="editor-panel"><Editor content={currentDoc.content} onChange={(val) => updateDoc(currentDoc.id, val)} /></div>
            <div className="chat-panel">
              <div className="chat-header"><span>🤖 AI 助手</span><button onClick={clearMessages}>清空</button></div>
              <div className="chat-messages">
                {messages.map((msg, i) => (
                  <div key={i} className={`message ${msg.role}`}><div className="message-content">{msg.content}</div>
                    {msg.role === 'assistant' && (
                      <div className="message-actions">
                        <button onClick={() => insertToEditor(msg.content)}>📝 插入</button>
                        {/* 重新生成按钮加在这里 */}
                        <button onClick={() => handleRegenerate(i)}>🔄 重新生成</button>
                        <button onClick={() => setSaveDropdown(saveDropdown === `${i}` ? null : `${i}`)}>💾 存入知识库</button>
                        {saveDropdown === `${i}` && <div className="save-dropdown">{knowledge.map(k => <button key={k.id} onClick={() => { appendToKnowledge(k.id, msg.content); setSaveDropdown(null) }}>{k.title}</button>)}</div>}
                      </div>
                    )}
                  </div>
                ))}
                {loading && <div className="message assistant loading">思考中...</div>}
              </div>
              <div className="chat-input">
                <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => {if(e.key === 'Enter' && !e.shiftKey){e.preventDefault(); handleSend();}}} placeholder="输入消息..." />
                <button onClick={handleSend} disabled={loading}>发送</button>
              </div>
            </div></>
        ) : <div className="empty-state"><h2>✨ 写作助手</h2><button onClick={() => {const t = prompt('标题:'); if(t) addDoc(t)}}>创建新文档</button></div>}
      </main>

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>AI 设置</h3>
            <label>API URL<input value={aiSettings.apiUrl} onChange={(e) => updateAISettings({ apiUrl: e.target.value })} /></label>
            <label>API Key<input type="password" value={aiSettings.apiKey} onChange={(e) => updateAISettings({ apiKey: e.target.value })} /></label>
            <label>模型<input value={aiSettings.model} onChange={(e) => updateAISettings({ model: e.target.value })} /></label>
            <div className="settings-section">
                <p>存储: {storageUsage} | 外部知识: {externalKnowledge.length}条</p>
                <button onClick={clearExternalKnowledge}>清空外部知识库</button>
            </div>
            <button onClick={() => setShowSettings(false)}>确定</button>
          </div>
        </div>
      )}
      {showKnowledge && <Knowledge onClose={() => setShowKnowledge(false)} />}
    </div>
  )
}

export default App
