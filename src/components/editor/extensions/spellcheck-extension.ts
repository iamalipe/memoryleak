import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view"
import { RangeSetBuilder } from "@codemirror/state"
import { isWordSpelledCorrectly, useDictionaryStore } from "@/hooks/use-dictionary-store"
import { toast } from "sonner"

const misspelledDecoration = Decoration.mark({
  class: "cm-misspelled",
})

function checkSpelling(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const text = view.state.doc.toString()

  const wordRegex = /[a-zA-Z]+(?:'[a-zA-Z]+)?(?:-[a-zA-Z]+)*/g
  let match

  for (const { from, to } of view.visibleRanges) {
    const rangeText = text.slice(from, to)
    wordRegex.lastIndex = 0

    while ((match = wordRegex.exec(rangeText)) !== null) {
      const word = match[0]
      const wordFrom = from + match.index
      const wordTo = wordFrom + word.length

      if (!isWordSpelledCorrectly(word)) {
        builder.add(wordFrom, wordTo, misspelledDecoration)
      }
    }
  }

  return builder.finish()
}

export const spellcheckPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = checkSpelling(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = checkSpelling(update.view)
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
)

export const spellcheckContextMenuHandler = EditorView.domEventHandlers({
  contextmenu(event, view) {
    const target = event.target as HTMLElement
    if (target.classList.contains("cm-misspelled")) {
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
      if (pos !== null) {
        const text = view.state.doc.toString()
        const wordRegex = /[a-zA-Z]+(?:'[a-zA-Z]+)?(?:-[a-zA-Z]+)*/g
        let match

        while ((match = wordRegex.exec(text)) !== null) {
          const start = match.index
          const end = start + match[0].length
          if (pos >= start && pos <= end) {
            const word = match[0]
            event.preventDefault()

            toast(`Add "${word}" to custom dictionary?`, {
              action: {
                label: "Add",
                onClick: () => {
                  useDictionaryStore.getState().addWord(word)
                  toast.success(`"${word}" added to custom dictionary.`)
                  // Force refresh editor decorations
                  view.requestMeasure()
                },
              },
            })
            return true
          }
        }
      }
    }
    return false
  },
})
