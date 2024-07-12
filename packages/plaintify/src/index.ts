import { MarkedExtension, Renderer, RendererObject, Tokens } from 'marked'

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

/**
 * A [marked](https://marked.js.org/) extension to convert Markdown to Plaintext.
 */
export default function markedPlaintify(
  options: Options = {}
): MarkedExtension {
  const plainTextRenderer: Options = {}
  const mdIgnores: string[] = ['constructor', 'hr', 'checkbox', 'br', 'space']
  const mdInlines: string[] = ['strong', 'em', 'codespan', 'del', 'text']
  const mdEscapes: string[] = ['html', 'code', 'codespan']

  let currentTableHeader: string[] = []

  // New Renderer functions
  const listitem: typeof Renderer.prototype.listitem = token =>
    '\n' + token.text.trim()

  const tablecell: typeof Renderer.prototype.tablecell = token => {
    if (token.header) {
      currentTableHeader.push(token.text)
    }

    return token.text + '__CELL_PAD__'
  }

  const tablerow: typeof Renderer.prototype.tablerow = token => {
    const chunks = token.text.split('__CELL_PAD__').filter(Boolean)

    return (
      currentTableHeader
        .map((title, i) => title + ': ' + chunks[i])
        .join('\n') + '\n\n'
    )
  }

  const linkOrImage = (token: Tokens.Link | Tokens.Image | Tokens.Generic) => {
    return (token.text ?? '') + '\n\n'
  }

  Object.getOwnPropertyNames(Renderer.prototype).forEach(prop => {
    if (mdIgnores.includes(prop)) {
      // ignore certain Markdown elements
      plainTextRenderer[prop] = () => ''
    } else if (mdInlines.includes(prop)) {
      // preserve inline elements
      plainTextRenderer[prop] = token => token.text
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
    } else if (prop === 'blockquote') {
      // handle blockquote items
      plainTextRenderer[prop] = token => token.text.trim() + '\n\n'
    } else if (prop === 'table') {
      // handle table elements
      plainTextRenderer[prop] = (token): string => {
        currentTableHeader = []

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
      plainTextRenderer[prop] = token => (token.text ?? '') + '\n\n'
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
