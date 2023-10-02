import { parseAttrs } from 'attributes-parser'
import type { MarkedExtension } from 'marked'
import { transform } from './transformer.js'
import type { Options, TransformOptions } from './types.js'

/**
 * A [marked](https://marked.js.org/) extension to transform code blocks within Markdown documents
 * into code previews.
 */
export default function markedCodePreview(
  options: Options = {}
): MarkedExtension {
  return {
    extensions: [
      {
        name: 'fences',
        level: 'block',
        tokenizer(_, parent) {
          const hooksData: TransformOptions['data'] = {}
          const { template } = options

          if (
            this.lexer.options.hooks &&
            this.lexer.options.hooks !== null &&
            'data' in this.lexer.options.hooks
          ) {
            Object.assign(hooksData, this.lexer.options.hooks.data)
          }

          parent.forEach((token, index) => {
            if (token.type !== 'code' || !token.lang) return

            const { preview, ...meta } = parseAttrs(token.lang)

            if (!preview) return

            transform(token, {
              index,
              parent,
              template,
              data: { ...hooksData, ...meta }
            })
          })

          return undefined
        }
      }
    ]
  }
}

export type { Options }
