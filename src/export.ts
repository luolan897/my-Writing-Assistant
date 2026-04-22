/**
 * 文档导出功能
 * 支持导出为 TXT 和 Word 格式
 */
import { saveAs } from 'file-saver'
import type { KnowledgeEntry } from './types'

/**
 * 将 HTML 内容转换为纯文本
 * @param html HTML字符串
 * @returns 纯文本字符串
 */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')      // <br> 转换行
    .replace(/<\/p>/gi, '\n\n')          // </p> 转双换行
    .replace(/<\/div>/gi, '\n')          // </div> 转换行
    .replace(/<\/h[1-6]>/gi, '\n\n')     // 标题结束转双换行
    .replace(/<[^>]*>/g, '')             // 移除所有HTML标签
    .replace(/&nbsp;/g, ' ')             // 转换空格
    .replace(/&lt;/g, '<')               // 转换特殊字符
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim()
}

/**
 * 导出为 TXT 文件
 * @param title 文件名
 * @param content HTML内容
 */
export function exportToTxt(title: string, content: string) {
  const text = htmlToPlainText(content)
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  saveAs(blob, `${title}.txt`)
}

/**
 * 导出为 Word 文件
 * @param title 文件名
 * @param content HTML内容
 */
export function exportToWord(title: string, content: string) {
  // 使用 HTML 格式创建 Word 文档
  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" 
          xmlns:w="urn:schemas-microsoft-com:office:word">
    <head><meta charset="utf-8"><title>${title}</title></head>
    <body>${content}</body>
    </html>
  `
  const blob = new Blob([html], { type: 'application/msword' })
  saveAs(blob, `${title}.doc`)
}

/**
 * 导出知识库为 TXT (人类阅读格式)
 */
export function exportKnowledgeToTxt(knowledge: KnowledgeEntry[]) {
  const text = knowledge.map(k => (
    `【${k.category}】${k.title}\n` +
    `关键词: ${k.keywords.join(', ')}\n` +
    `内容:\n${k.content}\n` +
    `----------------------------`
  )).join('\n\n')
  
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  saveAs(blob, `知识库导出_${new Date().toLocaleDateString()}.txt`)
}

/**
 * 导出知识库为 JSON (数据备份格式，可用于导入)
 */
export function exportKnowledgeToJSON(knowledge: KnowledgeEntry[]) {
  const data = JSON.stringify(knowledge, null, 2)
  const blob = new Blob([data], { type: 'application/json;charset=utf-8' })
  saveAs(blob, `知识库备份_${new Date().toLocaleDateString()}.json`)
}
