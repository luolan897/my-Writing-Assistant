import { useState, useEffect } from 'react'
import { useStore, getCurrentDoc } from './store'
import { sendToAI, getMatchedKnowledge } from './ai'
import { exportToTxt, exportToWord } from './export'
import { Editor } from './Editor'
import { Knowledge } from './Knowledge'
import './App.css'

function App() {
  const { docs, currentDocId, messages, aiSettings, knowledge, externalKnowledge, addDoc, updateDoc, renameDoc, deleteDoc, setCurrentDoc, addMessage, clearMessages, removeMessagesFrom, updateMessage, updateAISettings, appendToKnowledge, setExternalKnowledge, clearExternalKnowledge } = useStore()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showKnowledge, setShowKnowledge] = useState(false)
  const [editingTitle, setEditingTitle] = useState<string | null>(null)
  const [saveDropdown, setSaveDropdown] = useState<string | null>(null)
  const [storageUsage, setStorageUsage] = useState('')

  // 编辑功能的临时状态
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')

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
      addMessage({ role: 'assistant', content: `错误: ${err.message}` })
    }
    setLoading(false)
  }

  // 修改并重新生成按钮逻辑
  const handleEditSubmit = async (index: number) => {
    if (loading) return
    updateMessage(index, editValue)
    const history = [...messages.slice(0, index), { ...messages[index], content: editValue }]
    removeMessagesFrom(index + 1)
    setEditingIdx(null)
    setLoading(true)
    try {
      const reply = await sendToAI(history, aiSettings, currentDoc?.content)
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
                <input autoFocus defaultValue={doc.title} onBlur={(e) => { renameDoc(doc.id, e.target.value); setEditingTitle(null) }} onClick={(e) => e.stopPropagation()} />
              ) : (
                <>
                  <span onDoubleClick={() => setEditingTitle(doc.id)}>{doc.title}</span>
                  <button className="delete-btn" onClick={(e) => { e.stopPropagation(); if (confirm('确定删除?')) deleteDoc(doc.id) }}>×</button>
                </>
              )}
            </li>
          ))}
        </ul>
        <div className="sidebar-footer">
          <button onClick={() => setShowKnowledge(true)}>📖 知识库 ({knowledge.length})</button>
          <button onClick={() => setShowSettings(true)}>⚙️ AI设置</button>
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
                <span>🤖 AI 助手</span>
                <button onClick={clearMessages}>清空</button>
              </div>
              <div className="chat-messages">
                {messages.length === 0 && (
                  <div className="chat-hint">
                    <p>💡 你可以问我：</p>
                    <ul><li>帮我分析一下这段的情绪</li><li>帮我想一个转折点</li><li>润色一下这段对话</li></ul>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`message ${msg.role}`}>
                    {/* 修改点：只有在这里增加了判断，不改变任何层级 */}
                    <div className="message-content">
                      {editingIdx === i ? (
                        <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
                          <textarea style={{width:'100%', minHeight:'60px'}} value={editValue} onChange={(e)=>setEditValue(e.target.value)} />
                          <div style={{display:'flex', gap:'5px'}}>
                            <button style={{fontSize:'12px'}} onClick={()=>handleEditSubmit(i)}>保存</button>
                            <button style={{fontSize:'12px'}} onClick={()=>setEditingIdx(null)}>取消</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {msg.content}
                          {msg.role === 'user' && <span style={{cursor:'pointer', marginLeft:'8px', opacity:0.5}} onClick={()=>{setEditingIdx(i); setEditValue(msg.content)}}>✏️</span>}
                        </>
                      )}
                    </div>
                    {msg.role === 'assistant' && (
                      <div className="message-actions">
                        <button className="insert-btn" onClick={() => insertToEditor(msg.content)}>📝 插入</button>
                        <button className="save-btn" onClick={() => setSaveDropdown(saveDropdown === `${i}` ? null : `${i}`)}>💾 存入知识库</button>
                        {saveDropdown === `${i}` && (
                          <div className="save-dropdown">
                            {knowledge.map(k => <button key={k.id} onClick={() => { appendToKnowledge(k.id, msg.content); setSaveDropdown(null) }}>{k.title}</button>)}
                            {knowledge.length === 0 && <span className="no-knowledge">请先创建知识库条目</span>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {loading && <div className="message assistant loading">思考中...</div>}
              </div>
              {/* 这里的渲染确保 matchedKnowledge 被使用，防止构建报错 */}
              {matchedKnowledge.length > 0 && <div className="matched-hint">📎 参考: {matchedKnowledge.map(k => k.title).join('、')}</div>}
              <div className="chat-input">
                <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="输入消息..." onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }} />
                <button onClick={handleSend} disabled={loading}>发送</button>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <h2>✨ 写作助手</h2>
            <p>选择或创建一个文档开始写作</p>
            <button onClick={() => { const t = prompt('标题:'); if(t) addDoc(t) }}>创建新文档</button>
          </div>
        )}
      </main>

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>设置</h3>
            <label>API URL<input value={aiSettings.apiUrl} onChange={(e) => updateAISettings({ apiUrl: e.target.value })} /></label>
            <label>API Key<input type="password" value={aiSettings.apiKey} onChange={(e) => updateAISettings({ apiKey: e.target.value })} /></label>
            <label>模型<input value={aiSettings.model} onChange={(e) => updateAISettings({ model: e.target.value })} /></label>
            
            <div className="settings-section">
              <h4>数据管理</h4>
              <p className="storage-info">存储使用: {storageUsage}</p>
              {/* 确保 externalKnowledge 等变量被使用 */}
              <button type="button" onClick={() => {
                const inp = document.createElement('input'); inp.type = 'file'; inp.onchange = async (e) => {
                  const f = (e.target as any).files[0]; if (f) setExternalKnowledge(JSON.parse(await f.text()));
                }; inp.click();
              }}>加载外部知识库 ({externalKnowledge.length})</button>
              {externalKnowledge.length > 0 && <button onClick={clearExternalKnowledge}>卸载外部</button>}
            </div>
            <button onClick={() => setShowSettings(false)}>关闭</button>
          </div>
        </div>
      )}
      {showKnowledge && <Knowledge onClose={() => setShowKnowledge(false)} />}
    </div>
  )
}

export default App
