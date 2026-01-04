import { marked } from 'marked'
import katex from 'katex'

interface MathPattern {
  placeholder: string
  content: string
  type: 'block' | 'inline'
}

export const fullMarkdownParser = (text: string): string => {
  if (!text) return ''

  marked.setOptions({
    gfm: true,
    breaks: false,
  })

  let protectedText = text
  const mathPatterns: MathPattern[] = []
  let mathIndex = 0

  protectedText = protectedText.replace(
    /\$\$([^$]+?)\$\$/g,
    (_match, content) => {
      const placeholder = `MATH_BLOCK_${mathIndex}`
      mathPatterns.push({ placeholder, content, type: 'block' })
      mathIndex++
      return `<math type="block" id="${placeholder}">${content}</math>`
    }
  )

  protectedText = protectedText.replace(
    /\$([^$]+?)\$/g,
    (_match, content) => {
      const placeholder = `MATH_INLINE_${mathIndex}`
      mathPatterns.push({ placeholder, content, type: 'inline' })
      mathIndex++
      return `<math type="inline" id="${placeholder}">${content}</math>`
    }
  )

  protectedText = protectedText.replace(
    /\\\[([^$]+?)\\\]/g,
    (_match, content) => {
      const placeholder = `MATH_BLOCK_${mathIndex}`
      mathPatterns.push({ placeholder, content, type: 'block' })
      mathIndex++
      return `<math type="block" id="${placeholder}">${content}</math>`
    }
  )

  protectedText = protectedText.replace(
    /\\\(([^$]+?)\\\)/g,
    (_match, content) => {
      const placeholder = `MATH_INLINE_${mathIndex}`
      mathPatterns.push({ placeholder, content, type: 'inline' })
      mathIndex++
      return `<math type="inline" id="${placeholder}">${content}</math>`
    }
  )

  let html = marked.parse(protectedText) as string

  mathPatterns.forEach((item) => {
    const regex = new RegExp(
      `<math\\s+type="${item.type}"\\s+id="${item.placeholder}">([^<]*)</math>`,
      'g'
    )

    let mathElement: string
    if (item.type === 'inline') {
      mathElement = `<span class="katex-inline" data-math="${encodeURIComponent(item.content)}"></span>`
    } else {
      mathElement = `<div class="katex-block" data-math="${encodeURIComponent(item.content)}"></div>`
    }

    html = html.replace(regex, mathElement)
  })

  return html
}

export const exportMarkdownParser = (text: string): string => {
  if (!text) return ''

  marked.setOptions({
    gfm: true,
    breaks: false,
  })

  let protectedText = text
  const mathPatterns: MathPattern[] = []
  let mathIndex = 0

  protectedText = protectedText.replace(
    /\$\$([^$]+?)\$\$/g,
    (_match, content) => {
      const placeholder = `MATH_BLOCK_${mathIndex}`
      mathPatterns.push({ placeholder, content, type: 'block' })
      mathIndex++
      return `<math type="block" id="${placeholder}">${content}</math>`
    }
  )

  protectedText = protectedText.replace(
    /\$([^$]+?)\$/g,
    (_match, content) => {
      const placeholder = `MATH_INLINE_${mathIndex}`
      mathPatterns.push({ placeholder, content, type: 'inline' })
      mathIndex++
      return `<math type="inline" id="${placeholder}">${content}</math>`
    }
  )

  protectedText = protectedText.replace(
    /\\\[([^$]+?)\\\]/g,
    (_match, content) => {
      const placeholder = `MATH_BLOCK_${mathIndex}`
      mathPatterns.push({ placeholder, content, type: 'block' })
      mathIndex++
      return `<math type="block" id="${placeholder}">${content}</math>`
    }
  )

  protectedText = protectedText.replace(
    /\\\(([^$]+?)\\\)/g,
    (_match, content) => {
      const placeholder = `MATH_INLINE_${mathIndex}`
      mathPatterns.push({ placeholder, content, type: 'inline' })
      mathIndex++
      return `<math type="inline" id="${placeholder}">${content}</math>`
    }
  )

  let html = marked.parse(protectedText) as string

  mathPatterns.forEach((item) => {
    const regex = new RegExp(
      `<math\\s+type="${item.type}"\\s+id="${item.placeholder}">([^<]*)</math>`,
      'g'
    )

    try {
      if (item.type === 'inline') {
        const rendered = katex.renderToString(item.content, {
          throwOnError: false,
          displayMode: false
        })
        html = html.replace(regex, rendered)
      } else {
        const rendered = katex.renderToString(item.content, {
          throwOnError: false,
          displayMode: true
        })
        html = html.replace(regex, `<div class="katex-block-standalone">${rendered}</div>`)
      }
    } catch (error) {
      console.error('KaTeX rendering error:', error)
      const fallback = item.type === 'inline' ? `$${item.content}$` : `$$${item.content}$$`
      html = html.replace(regex, fallback)
    }
  })

  return html
}

export const renderMath = (): void => {
  document.querySelectorAll('[data-math]').forEach((mathNode) => {
    const mathContent = decodeURIComponent(mathNode.getAttribute('data-math') || '')
    try {
      if (mathNode.classList.contains('katex-block')) {
        katex.render(mathContent, mathNode as HTMLElement, {
          throwOnError: false,
          displayMode: true
        })
      } else {
        katex.render(mathContent, mathNode as HTMLElement, {
          throwOnError: false,
          displayMode: false
        })
      }
    } catch (error) {
      console.error('KaTeX rendering error:', error)
      mathNode.innerHTML = `\\[${mathContent}\\]`
    }
  })
}