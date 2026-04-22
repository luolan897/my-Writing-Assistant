// src/App.tsx 中的主要修改点（你可以直接全选替换整个文件）

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

  // 核心功能：重新生成
  const handleRegenerateAI = async (index: number) => {
    if (loading) return
    // 1. 获取这条 AI 回复之前的所有消息作为历史
    const history = messages.slice(0, index)
    // 2. 从 Store 中移除这条消息（及之后的消息）
    removeMessagesFrom(index)
    // 3. 重新开始加载并发送请求
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
          {currentDoc && <div className="export-btns">
            <button onClick={() => exportToTxt(currentDoc.title, currentDoc.content)}>导出TXT</button>
            <button onClick={() => exportToWord(currentDoc.title, currentDoc.content)}>导出Word</button>
          </div>}
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
                        {/* 这里是新增的重新生成按钮 */}
                        <button className="regen-btn" onClick={() => handleRegenerateAI(i)} title="重新生成">🔄 重发</button>
                        <button className="save-btn" onClick={() => setSaveDropdown(saveDropdown === `${i}` ? null : `${i}`)}>💾 存</button>
                        {saveDropdown === `${i}` && (
                          <div className="save-dropdown">
                            {knowledge.length > 0 ? (
                              knowledge.map(k => <button key={k.id} onClick={() => { appendToKnowledge(k.id, msg.content); setSaveDropdown(null) }}>{k.title}</button>)
                            ) : (
                              <div className="no-knowledge">请先去知识库新建条目</div>
                            )}
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
        ) : <div className="empty-state"><h2>✨ 写作助手</h2><button onClick={() => {const t=prompt('标题:'); if(t) addDoc(t)}}>新文档</button></div>}
      </main>

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-sidebar">
              <h4>模型配置</h4>
              <button className="btn-add" onClick={() => addAI
