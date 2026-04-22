import { saveAs } from 'file-saver'
import { KnowledgeEntry } from './types'

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim()
}

export function exportToTxt(title: string, content: string) {
  const text = htmlToPlainText(content)
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  saveAs(blob, `${title}.txt`)
}

export function exportToWord(title: string, content: string) {
  const html = `<html><head><meta charset="utf-8"></head><body>${content}</body></html>`
  const blob = new Blob([html], { type: 'application/msword' })
  saveAs(blob, `${title}.doc`)
}

export function exportKnowledgeToJSON(knowledge: KnowledgeEntry[]) {
  const data = JSON.stringify(knowledge, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  saveAs(blob, `知识库备份_${new Date().toLocaleDateString()}.json`)
}

export function exportKnowledgeToTxt(knowledge: KnowledgeEntry[]) {
  const content = knowledge.map(k => `【${k.category}】${k.title}\n关键词: ${k.keywords.join(',')}\n内容: ${k.content}\n`).join('\n---\n\n')
  const blob = new Blob([content], { type: 'text/plain' })
  saveAs(blob, `知识库手册_${new Date().toLocaleDateString()}.txt`)
}
