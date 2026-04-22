import { useState, useEffect } from 'react'
import { useStore, getCurrentDoc } from './store'
import { sendToAI, getMatchedKnowledge } from './ai'
import { exportToTxt, exportToWord } from './export'
import { Editor } from './Editor'
import { Knowledge } from './Knowledge'
import './App.css'

function App() {
  const { 
    docs, currentDocId, messages, aiProviders, activeProviderId, knowledge, 
    addDoc, updateDoc, renameDoc, deleteDoc, setCurrentDoc, addMessage, clearMessages, 
    removeMessagesFrom, addAIProvider, updateAIProvider, deleteAIProvider, 
    setActiveProvider, appendToKnowledge
  } = useStore()
  
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showKnowledge, setShowKnowledge] = useState(false)
  const [editingTitle, setEditingTitle] = useState<string | null>(null)
  const [saveDropdown, setSaveDropdown] = useState<string | null>(null)
  const [storageUsage, setStorageUsage] = useState('')

  const currentDoc = getCurrentDoc()
  const matchedKnowledge = input ? getMatchedKnowledge(input) : []
  const activeProvider = aiProviders.find(p => p.id === activeProviderId) || aiProviders[0]

  useEffect(() => {
    const data = localStorage.getItem('writing-assistant-store') || ''
    setStorageUsage((data.length / 1024).toFixed(1) + " KB")
  }, [docs, knowledge, messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user' as const, content: input }
    addMessage(userMsg); setInput(''); setLoading(true)
    try {
      const reply = await sendToAI([...messages, userMsg], null, currentDoc?.content)
      addMessage({ role: 'assistant', content: reply })
    } catch (err: any) {
      addMessage({ role: 'assistant', content: `错误: ${err.message}` })
    }
    setLoading(false)
  }

  const handleRegenerateAI = async (index: number) => {
    if (loading) return
    const history = messages.slice(0, index)
    removeMessagesFrom(index)
    setLoading(true)
    try {
      const reply = await sendToAI(history, null, currentDoc?.content)
      addMessage({ role: 'assistant', content: reply })
    } catch (err: any) {
      addMessage({ role: 'assistant', content: `错误: ${err.message}` })
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
        <div className="sidebar-header">
          <h2>📚 文档</h2>
          <button onClick={() => { const t = prompt('标题:'); if(t) addDoc(t) }}>+ 新建</button>
        </div>
        <ul className="doc-list">
          {docs.map((doc) => (
            <li key={doc.id} className={doc.id === currentDocId ? 'active' : ''} onClick={() => setCurrentDoc(doc.id)}>
              {editingTitle === doc.id ? (
                <input autoFocus defaultValue={doc.title} onBlur={(e) => { renameDoc(doc.id, e.target.value); setEditingTitle(null) }} onClick={(e)=>e.stopPropagation()} />
              ) : (
                <><span onDoubleClick={() => setEditingTitle(doc.id)}>{doc.title}</span><button className="delete-btn" onClick={(e) => {e.stopPropagation(); if(confirm('删除?')) deleteDoc(doc.id)}}>×</button></>
              )}
            </li>
          ))}
        </ul>
        <div className="sidebar-footer">
          <button onClick={() => setShowKnowledge(true)}>📖 知识库 ({knowledge.length})</button>
          <button onClick={() => setShowSettings(true)}>⚙️ 设置</button>
          {currentDoc && (
            <div className="export-btns">
              <button onClick={() => exportToTxt(currentDoc.title, currentDoc.content)}>TXT</button>
              <button onClick={() => exportToWord(currentDoc.title, currentDoc.content)}>Word</button>
            </div>
          )}
        </div>
      </aside>

      <main className="main">
        {currentDoc ? (
          <>
            <div className="editor-panel">
              <Editor content={currentDoc.content} onChange={(val) => updateDoc(currentDoc.id, val)} />
            </div>
            <div className="chat-panel">
              <div className="chat-header">
                <span>🤖 {activeProvider.name}</span>
                <select value={activeProviderId} onChange={(e) => setActiveProvider(e.target.value)} className="model-select">
                   {aiProviders.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button onClick={clearMessages}>清空</button>
              </div>
              <div className="chat-messages">
                {messages.map((msg, i) => (
                  <div key={i} className={`message ${msg.role}`}>
                    <div className="message-content">{msg.content}</div>
                    {msg.role === 'assistant' && (
                      <div className="message-actions">
                        <button className="insert-btn" onClick={() => insertToEditor(msg.content)}>📝 插入</button>
                        <button className="regen-btn" onClick={() => handleRegenerateAI(i)}>🔄 重发</button>
                        <button className="save-btn" onClick={() => setSaveDropdown(saveDropdown === `${i}` ? null : `${i}`)}>💾 存</button>
                        {saveDropdown === `${i}` && (
                          <div className="save-dropdown">
                            {knowledge.map(k => <button key={k.id} onClick={() => { appendToKnowledge(k.id, msg.content); setSaveDropdown(null) }}>{k.title}</button>)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {loading && <div className="message assistant loading">思考中...</div>}
              </div>
              {matchedKnowledge.length > 0 && <div className="matched-hint">📎 参考: {matchedKnowledge.length} 条资料</div>}
              <div className="chat-input">
                <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => {if(e.key === 'Enter' && !e.shiftKey){e.preventDefault(); handleSend();}}} placeholder="输入消息..." />
                <button onClick={handleSend} disabled={loading}>发送</button>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <h2>✨ 写作助手</h2>
            <button onClick={() => {const t=prompt('标题:'); if(t) addDoc(t)}}>新文档</button>
          </div>
        )}
      </main>

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-sidebar">
              <h4>模型配置</h4>
              <button className="btn-add" onClick={() => addAIProvider('新配置')}>+ 添加</button>
              <ul className="provider-list">
                {aiProviders.map(p => (
                  <li key={p.id} className={p.id === activeProviderId ? 'active' : ''} onClick={() => setActiveProvider(p.id)}>
                    {p.name}
                  </li>
                ))}
              </ul>
            </div>
            <div className="settings-main">
              <button className="btn-close-x" onClick={() => setShowSettings(false)}>×</button>
              <h3>编辑: {activeProvider.name}</h3>
              <div className="form-group">
                <label>配置名称</label>
                <input value={activeProvider.name} onChange={e => updateAIProvider(activeProviderId, { name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>API URL</label>
                <input value={activeProvider.apiUrl} placeholder="https://..." onChange={e => updateAIProvider(activeProviderId, { apiUrl: e.target.value })} />
              </div>
              <div className="form-group">
                <label>API Key</label>
                <input type="password" value={activeProvider.apiKey} onChange={e => updateAIProvider(activeProviderId, { apiKey: e.target.value })} />
              </div>
              <div className="form-group">
                <label>模型名称</label>
                <input value={activeProvider.model} placeholder="gpt-4o" onChange={e => updateAIProvider(activeProviderId, { model: e.target.value })} />
              </div>
              <div className="settings-footer">
                <span>存储: {storageUsage}</span>
                <div className="footer-btns">
                  <button className="btn-del" onClick={() => deleteAIProvider(activeProviderId)}>删除</button>
                  <button className="btn-confirm" onClick={() => setShowSettings(false)}>完成</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {showKnowledge && <Knowledge onClose={() => setShowKnowledge(false)} />}
    </div>
  )
}

export default App
