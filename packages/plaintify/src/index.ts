import {
  marked,
  Marked,
  MarkedExtension,
  Renderer,
  RendererObject
} from 'marked'

/**
 * Options for configuring the markedPlaintify extension.
 */
export type Options = RendererObject & {
  /**
   * Custom 3rd-party renderers.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: (...args: any[]) => string | false
}

const blockLevelElements = [
  'space',
  'hr',
  'heading',
  'code',
  'table',
  'blockquote',
  'list',
  'html',
  'paragraph'
]

const inlineElements = [
  'escape',
  'html',
  'link',
  'image',
  'strong',
  'em',
  'codespan',
  'br',
  'del',
  'text'
]

/**
 * A [marked](https://marked.js.org/) extension to convert Markdown to Plaintext.
 */
export default function markedPlaintify(
  instance: Marked | typeof marked,
  options: Options = {}
): MarkedExtension {
  const parser = instance.Parser
  const mdIgnores: string[] = ['constructor', 'hr', 'checkbox', 'br', 'space']
  const mdInlines: string[] = ['strong', 'em', 'codespan', 'del', 'text']
  const mdEscapes: string[] = ['html', 'code', 'codespan']

  let currentTableHeader: string[] = []

  // Renderer functions

  const space: typeof Renderer.prototype.space = () => ''

  const code: Options['code'] = token => {
    return escapeHTML(token.text) + '\n\n'
  }

  const blockquote: Options['blockquote'] = token => {
    const text = parser.parse(token.tokens)
    return text.trim() + '\n\n'
  }

  const html: Options['html'] = token => {
    return escapeHTML(token.text) + '\n\n'
  }

  const heading: Options['heading'] = token => {
    const text = parser.parseInline(token.tokens)
    return text + '\n\n'
  }

  const hr: Options['hr'] = () => ''

  const list: Options['list'] = token => {
    let text = ''
    for (let j = 0; j < token.items.length; j++) {
      const item = token.items[j]
      text += listitem(item)
    }

    return '\n' + text.trim() + '\n\n'
  }

  const listitem: Options['listitem'] = token => {
    const text = parser.parse(token.tokens)
    return '\n' + text.trim()
  }

  const checkbox: Options['checkbox'] = () => ''

  const paragraph: Options['paragraph'] = token => {
    let text = parser.parseInline(token.tokens)

    // Removing extra newlines introduced by other renderer functions
    text = text.replace(/\n{2,}/g, '')

    return text + '\n\n'
  }

  const table: Options['table'] = token => {
    currentTableHeader = []

    // parsing headers
    for (let j = 0; j < token.header.length; j++) {
      tablecell(token.header[j])
    }

    // parsing rows
    let body = ''
    for (let j = 0; j < token.rows.length; j++) {
      const row = token.rows[j]
      let cell = ''
      for (let k = 0; k < row.length; k++) {
        cell += tablecell(row[k])
      }
      body += tablerow({ text: cell })
    }

    return body
  }

  const tablerow: Options['tablerow'] = token => {
    const chunks = token.text.split('__CELL_PAD__').filter(Boolean)

    return (
      currentTableHeader
        .map((title, i) => title + ': ' + chunks[i])
        .join('\n') + '\n\n'
    )
  }

  const tablecell: Options['tablecell'] = token => {
    const text = parser.parseInline(token.tokens)

    if (token.header) {
      currentTableHeader.push(text)
    }

    return (text ?? '') + '__CELL_PAD__'
  }

  const strong: Options['strong'] = token => {
    const text = parser.parseInline(token.tokens)
    return text
  }

  const em: Options['em'] = token => {
    const text = parser.parseInline(token.tokens)
    return text
  }

  const codespan: Options['codespan'] = token => token.text

  const br: Options['br'] = () => ''

  const del: Options['del'] = token => {
    const text = parser.parseInline(token.tokens)
    return text
  }

  const link: Options['link'] = token => {
    const text = parser.parseInline(token.tokens)
    return (text ?? '') + '\n\n'
  }

  const image: Options['image'] = token => {
    return (token.text ?? '') + '\n\n'
  }

  const text: Options['text'] = token => token.text

  const plainTextRenderer: Options = {
    space,
    code,
    blockquote,
    html,
    heading,
    hr,
    list,
    listitem,
    checkbox,
    paragraph,
    table,
    tablerow,
    tablecell,
    strong,
    em,
    codespan,
    br,
    del,
    link,
    image,
    text
  }

  // DEBUG
  // for (const prop in plainTextRenderer) {
  //   plainTextRenderer[prop] = printToken
  // }

  // function printToken(token: Tokens.Generic) {
  //   const text = `type: ${token.type}, text: ${token.raw}`

  //   return `\n${text}\n`
  // }

  return {
    useNewRenderer: true,
    renderer: {
      ...plainTextRenderer,
      ...options
    }
  }
}

/**
 * Escapes HTML characters in a string.
 */
function escapeHTML(html: string): string {
  const escapeMap: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }

  return html.replace(/[&<>"']/g, match => escapeMap[match])
}
