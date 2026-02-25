import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Doc, Message, AISettings, KnowledgeEntry } from './types'

interface Store {
  docs: Doc[]
  currentDocId: string | null
  messages: Message[]
  aiSettings: AISettings
  knowledge: KnowledgeEntry[]
  externalKnowledge: KnowledgeEntry[]
  addDoc: (title: string) => void
  updateDoc: (id: string, content: string) => void
  renameDoc: (id: string, title: string) => void
  deleteDoc: (id: string) => void
  setCurrentDoc: (id: string) => void
  addMessage: (msg: Message) => void
  clearMessages: () => void
  removeLastMessage: () => void
  updateAISettings: (settings: Partial<AISettings>) => void
  addKnowledge: (entry: Omit<KnowledgeEntry, 'id'>) => void
  updateKnowledge: (id: string, entry: Partial<KnowledgeEntry>) => void
  deleteKnowledge: (id: string) => void
  appendToKnowledge: (id: string, content: string) => void
  setExternalKnowledge: (entries: KnowledgeEntry[]) => void
  clearExternalKnowledge: () => void
}

export const useStore = create<Store>()(
  persist(
    (set) => ({
      docs: [],
      currentDocId: null,
      messages: [],
      aiSettings: {
        apiUrl: 'https://max8.us.ci',
        apiKey: '',
        model: 'gpt-4o-mini',
      },
      knowledge: [],
      externalKnowledge: [],
      addDoc: (title) => {
        const doc: Doc = { id: Date.now().toString(), title, content: '', createdAt: Date.now(), updatedAt: Date.now() }
        set((s) => ({ docs: [...s.docs, doc], currentDocId: doc.id }))
      },
      updateDoc: (id, content) => set((s) => ({ docs: s.docs.map((d) => d.id === id ? { ...d, content, updatedAt: Date.now() } : d) })),
      renameDoc: (id, title) => set((s) => ({ docs: s.docs.map((d) => (d.id === id ? { ...d, title } : d)) })),
      deleteDoc: (id) => set((s) => ({ docs: s.docs.filter((d) => d.id !== id), currentDocId: s.currentDocId === id ? null : s.currentDocId, messages: s.currentDocId === id ? [] : s.messages })),
      setCurrentDoc: (id) => set((s) => ({ currentDocId: id, messages: s.currentDocId !== id ? [] : s.messages })),
      addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
      clearMessages: () => set({ messages: [] }),
      removeLastMessage: () => set((s) => ({ messages: s.messages.slice(0, -1) })),
      updateAISettings: (settings) => set((s) => ({ aiSettings: { ...s.aiSettings, ...settings } })),
      addKnowledge: (entry) => set((s) => ({ knowledge: [...s.knowledge, { ...entry, id: Date.now().toString() }] })),
      updateKnowledge: (id, entry) => set((s) => ({ knowledge: s.knowledge.map((k) => k.id === id ? { ...k, ...entry } : k) })),
      deleteKnowledge: (id) => set((s) => ({ knowledge: s.knowledge.filter((k) => k.id !== id) })),
      appendToKnowledge: (id, content) => set((s) => ({ knowledge: s.knowledge.map((k) => k.id === id ? { ...k, content: k.content + '\n\n---\n\n' + content } : k) })),
      setExternalKnowledge: (entries) => set({ externalKnowledge: entries }),
      clearExternalKnowledge: () => set({ externalKnowledge: [] }),
    }),
    { 
      name: 'writing-assistant-store',
      partialize: (state) => ({
        docs: state.docs,
        currentDocId: state.currentDocId,
        messages: state.messages,
        aiSettings: state.aiSettings, // 保持保存 Key
        knowledge: state.knowledge,
      })
    }
  )
)

export const getCurrentDoc = () => {
  const { docs, currentDocId } = useStore.getState()
  return docs.find((d) => d.id === currentDocId)
}
