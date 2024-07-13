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
  const plainTextRenderer: Options = {}
  const mdIgnores: string[] = ['constructor', 'hr', 'checkbox', 'br', 'space']
  const mdInlines: string[] = ['strong', 'em', 'codespan', 'del', 'text']
  const mdEscapes: string[] = ['html', 'code', 'codespan']

  let currentTableHeader: string[] = []

  // 1. Check next function in the new Marked Renderer
  // 2. Check how to obtain the text
  // 3. Output it in the format of the marked-plaintify extension

  const space: typeof Renderer.prototype.space = () => ''

  const code: typeof Renderer.prototype.code = token => {
    return escapeHTML(token.text) + '\n\n'
  }

  const blockquote: typeof Renderer.prototype.blockquote = token => {
    const text = parser.parse(token.tokens)
    return text.trim() + '\n\n'
  }

  const html: typeof Renderer.prototype.html = token => {
    return escapeHTML(token.text) + '\n\n'
  }

  const heading: typeof Renderer.prototype.heading = token => {
    const text = parser.parseInline(token.tokens)
    return text + '\n\n'
  }

  const hr: typeof Renderer.prototype.hr = () => ''

  const list: typeof Renderer.prototype.list = token => {
    let text = ''
    for (let j = 0; j < token.items.length; j++) {
      const item = token.items[j]
      text += listitem(item)
    }

    return '\n' + text.trim() + '\n\n'
  }

  const listitem: typeof Renderer.prototype.listitem = token => {
    const text = parser.parse(token.tokens)
    return '\n' + text.trim()
  }

  const checkbox: typeof Renderer.prototype.checkbox = () => ''

  const paragraph: typeof Renderer.prototype.paragraph = token => {
    const text = parser.parseInline(token.tokens)
    return text + '\n\n'
  }

  const table: typeof Renderer.prototype.table = token => {
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

  const tablerow: typeof Renderer.prototype.tablerow = token => {
    const chunks = token.text.split('__CELL_PAD__').filter(Boolean)

    return (
      currentTableHeader
        .map((title, i) => title + ': ' + chunks[i])
        .join('\n') + '\n\n'
    )
  }

  const tablecell: typeof Renderer.prototype.tablecell = token => {
    const text = parser.parseInline(token.tokens)

    if (token.header) {
      currentTableHeader.push(text)
    }

    return (text ?? '') + '__CELL_PAD__'
  }

  const strong: typeof Renderer.prototype.strong = token => {
    const text = parser.parseInline(token.tokens)
    return text
  }

  const em: typeof Renderer.prototype.em = token => {
    const text = parser.parseInline(token.tokens)
    return text
  }

  const codespan: typeof Renderer.prototype.codespan = token => token.text

  const br: typeof Renderer.prototype.br = () => ''

  const del: typeof Renderer.prototype.del = token => {
    const text = parser.parseInline(token.tokens)
    return text
  }

  const link: typeof Renderer.prototype.link = token => {
    const text = parser.parseInline(token.tokens)
    return (token.text ?? '') + '\n\n'
  }

  const image: typeof Renderer.prototype.image = token => {
    return (token.text ?? '') + '\n\n'
  }

  const text: typeof Renderer.prototype.text = token => token.text

  Object.getOwnPropertyNames(Renderer.prototype).forEach(prop => {
    if (prop === 'space') {
      plainTextRenderer[prop] = space
    }

    // OLD CODE

    if (mdIgnores.includes(prop)) {
      // ignore certain Markdown elements
      plainTextRenderer[prop] = () => ''
    } else if (mdInlines.includes(prop)) {
      // preserve inline elements
      plainTextRenderer[prop] = token => {
        if (token.tokens && token.tokens.length > 0) {
          return parseTokens(token.tokens)
        } else {
          return token.text ?? ''
        }
      }
    } else if (mdEscapes.includes(prop)) {
      // escaped elements
      plainTextRenderer[prop] = token => escapeHTML(token.text) + '\n\n'
    } else if (prop === 'list') {
      // handle list element
      plainTextRenderer[prop] = token => {
        let body = ''
        for (let j = 0; j < token.items.length; j++) {
          const item = token.items[j]
          body += listitem(item)
        }

        return '\n' + body.trim() + '\n\n'
      }
    } else if (prop === 'listitem') {
      // handle list items
      plainTextRenderer[prop] = listitem
    } else if (prop === 'table') {
      // handle table elements
      plainTextRenderer[prop] = (token): string => {
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
    } else if (prop === 'tablerow') {
      // handle table rows
      plainTextRenderer[prop] = tablerow
    } else if (prop === 'tablecell') {
      // handle table cells
      plainTextRenderer[prop] = tablecell
    } else if (prop === 'link' || prop === 'image') {
      // handle links and images
      plainTextRenderer[prop] = linkOrImage
    } else if (prop === 'paragraph') {
      plainTextRenderer[prop] = token => {
        const firstToken = token.tokens[0]

        if (
          firstToken &&
          (firstToken.type === 'link' || firstToken.type === 'image')
        ) {
          return linkOrImage(firstToken)
        } else {
          return (token.text ?? '') + '\n\n'
        }
      }
    } else {
      // handle other (often block-level) elements
      plainTextRenderer[prop] = token => {
        if (token.tokens && token.tokens.length > 0) {
          return parseTokens(token.tokens) + '\n\n'
        } else {
          return (token.text ?? '') + '\n\n'
        }
      }
    }
  })

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
