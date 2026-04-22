import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Doc, Message, AISettings, KnowledgeEntry } from './types'

interface Store {
  docs: Doc[]
  currentDocId: string | null
  messages: Message[]
  
  // --- 多模型管理 ---
  aiProviders: AISettings[]
  activeProviderId: string
  addAIProvider: (name: string) => void
  updateAIProvider: (id: string, settings: Partial<AISettings>) => void
  deleteAIProvider: (id: string) => void
  setActiveProvider: (id: string) => void

  knowledge: KnowledgeEntry[]
  externalKnowledge: KnowledgeEntry[]
  addDoc: (title: string) => void
  updateDoc: (id: string, content: string) => void
  renameDoc: (id: string, title: string) => void
  deleteDoc: (id: string) => void
  setCurrentDoc: (id: string) => void
  addMessage: (msg: Message) => void
  updateMessage: (index: number, content: string) => void
  clearMessages: () => void
  removeMessagesFrom: (index: number) => void
  addKnowledge: (entry: Omit<KnowledgeEntry, 'id'>) => void
  updateKnowledge: (id: string, entry: Partial<KnowledgeEntry>) => void
  deleteKnowledge: (id: string) => void
  appendToKnowledge: (id: string, content: string) => void
  setExternalKnowledge: (entries: KnowledgeEntry[]) => void
  clearExternalKnowledge: () => void
}

const DEFAULT_PROVIDER: AISettings = {
  id: 'default',
  name: '默认配置',
  apiUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
}

export const useStore = create<Store>()(
  persist(
    (set) => ({
      docs: [],
      currentDocId: null,
      messages: [],
      
      // --- 多模型管理实现 ---
      aiProviders: [DEFAULT_PROVIDER],
      activeProviderId: 'default',
      
      addAIProvider: (name) => set((s) => {
        const newProvider: AISettings = {
          id: Date.now().toString(),
          name: name,
          apiUrl: '',
          apiKey: '',
          model: '',
        }
        return { aiProviders: [...s.aiProviders, newProvider], activeProviderId: newProvider.id }
      }),

      updateAIProvider: (id, settings) => set((s) => ({
        aiProviders: s.aiProviders.map(p => p.id === id ? { ...p, ...settings } : p)
      })),

      deleteAIProvider: (id) => set((s) => {
        const newProviders = s.aiProviders.filter(p => p.id !== id)
        const newActiveId = s.activeProviderId === id 
          ? (newProviders[0]?.id || 'default') 
          : s.activeProviderId
        return { 
          aiProviders: newProviders.length > 0 ? newProviders : [DEFAULT_PROVIDER],
          activeProviderId: newActiveId
        }
      }),

      setActiveProvider: (id) => set({ activeProviderId: id }),

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
      updateMessage: (index, content) => set((s) => ({ messages: s.messages.map((m, i) => i === index ? { ...m, content } : m) })),
      clearMessages: () => set({ messages: [] }),
      removeMessagesFrom: (index) => set((s) => ({ messages: s.messages.slice(0, index) })),
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
        aiProviders: state.aiProviders,
        activeProviderId: state.activeProviderId,
        knowledge: state.knowledge,
      })
    }
  )
)

export const getCurrentDoc = () => {
  const { docs, currentDocId } = useStore.getState()
  return docs.find((d) => d.id === currentDocId)
}
