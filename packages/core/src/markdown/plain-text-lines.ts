import { isLiteralPlainTextNode, isSyntaxNode } from './extract.ts'
import { parseBody } from './grammar.ts'
import type { Span } from './model.ts'
import { plainTextOfRange } from './plain-text.ts'
import { isWikiNodeName } from './wiki-nodes.ts'

/**
 * The plain text a reader sees in a note body (no frontmatter), one entry per
 * non-blank source line. It is the projection `ParsedNote.displayText` uses
 * (syntax marks and URLs dropped, wiki brackets flattened, code literal), but
 * keeps the line structure, so a heading or list item without closing
 * punctuation stays its own unit for sentence counting. Feeds the writing
 * statistics.
 */
export function plainTextLines(body: string): string[] {
  const cuts: Span[] = []
  const literalRanges: Span[] = []
  parseBody(body).iterate({
    enter: (node) => {
      const { name, from, to } = node
      if (isSyntaxNode(name)) {
        cuts.push({ from, to })
      }
      if (isLiteralPlainTextNode(name)) {
        literalRanges.push({ from, to })
      }
      // Wiki links flatten as a whole (see `renderMarkdownText`).
      return !isWikiNodeName(name)
    },
  })

  const lines = sourceLines(body)
  const cutsByLine = spansByLine(cuts, lines)
  const literalsByLine = spansByLine(literalRanges, lines)
  const texts: string[] = []
  for (const [index, line] of lines.entries()) {
    const text = plainTextOfRange(
      body,
      line.from,
      line.to,
      cutsByLine[index] ?? [],
      literalsByLine[index] ?? [],
    )
    if (text !== '') {
      texts.push(text)
    }
  }
  return texts
}

/** Each source line's range, newline excluded. */
function sourceLines(body: string): Span[] {
  const lines: Span[] = []
  let from = 0
  while (true) {
    const newline = body.indexOf('\n', from)
    if (newline === -1) {
      lines.push({ from, to: body.length })
      return lines
    }
    lines.push({ from, to: newline })
    from = newline + 1
  }
}

/**
 * The spans touching each line, so every line's projection only walks its own
 * spans: linear in the note's size rather than lines × spans.
 */
function spansByLine(spans: readonly Span[], lines: readonly Span[]): Span[][] {
  const byLine: Span[][] = lines.map(() => [])
  for (const span of spans) {
    for (let index = lineIndexAt(lines, span.from); index < lines.length; index++) {
      const line = lines[index]
      if (line === undefined || line.from >= span.to) {
        break
      }
      if (line.to > span.from || line.from === span.from) {
        byLine[index]?.push(span)
      }
    }
  }
  return byLine
}

/** The index of the line holding `offset` (lines are sorted and contiguous). */
function lineIndexAt(lines: readonly Span[], offset: number): number {
  let low = 0
  let high = lines.length - 1
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    const line = lines[middle]
    if (line !== undefined && line.from <= offset) {
      low = middle
    } else {
      high = middle - 1
    }
  }
  return low
}
