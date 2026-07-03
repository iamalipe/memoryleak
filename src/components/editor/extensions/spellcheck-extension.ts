import {
  isWordSpelledCorrectly,
  getSpellingSuggestions,
  useDictionaryStore,
} from "@/hooks/use-dictionary-store"
import { RangeSetBuilder } from "@codemirror/state"
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  hoverTooltip,
} from "@codemirror/view"
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
    private listener: () => void

    constructor(view: EditorView) {
      this.decorations = checkSpelling(view)
      this.listener = () => {
        // Force refresh editor decorations when spelling results arrive
        view.requestMeasure()
      }
      window.addEventListener("spelling-cache-updated", this.listener)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = checkSpelling(update.view)
      }
    }

    destroy() {
      window.removeEventListener("spelling-cache-updated", this.listener)
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

// Native hover tooltip displaying suggestions from background worker
export const spellcheckHoverTooltip = hoverTooltip((view, pos) => {
  const text = view.state.doc.toString()
  const wordRegex = /[a-zA-Z]+(?:'[a-zA-Z]+)?(?:-[a-zA-Z]+)*/g
  let match

  while ((match = wordRegex.exec(text)) !== null) {
    const start = match.index
    const end = start + match[0].length

    if (pos >= start && pos <= end) {
      const word = match[0]
      if (isWordSpelledCorrectly(word)) continue

      return {
        pos: start,
        end: end,
        above: true,
        create(view) {
          const dom = document.createElement("div")
          dom.className = "cm-spelling-tooltip p-2 bg-popover border border-border rounded-xl shadow-lg flex flex-col gap-1 text-xs select-none min-w-[140px]"

          const title = document.createElement("div")
          title.className = "text-[10px] text-muted-foreground font-semibold px-2 pb-1 border-b border-border"
          title.textContent = `Suggestions for "${word}":`
          dom.appendChild(title)

          const suggestionsContainer = document.createElement("div")
          suggestionsContainer.className = "flex flex-col gap-0.5 max-h-[150px] overflow-y-auto"
          dom.appendChild(suggestionsContainer)

          const loadingIndicator = document.createElement("div")
          loadingIndicator.className = "text-muted-foreground px-2 py-1 italic text-[11px]"
          loadingIndicator.textContent = "Loading suggestions..."
          suggestionsContainer.appendChild(loadingIndicator)

          // Load suggestions from worker asynchronously
          getSpellingSuggestions(word).then((suggestions) => {
            suggestionsContainer.innerHTML = ""

            if (suggestions.length === 0) {
              const noSug = document.createElement("div")
              noSug.className = "text-muted-foreground px-2 py-1 italic text-[11px]"
              noSug.textContent = "No suggestions"
              suggestionsContainer.appendChild(noSug)
            } else {
              suggestions.slice(0, 5).forEach((sug) => {
                const btn = document.createElement("button")
                btn.className = "px-2 py-1 text-left rounded-md hover:bg-muted text-foreground font-medium transition-colors cursor-pointer w-full text-xs"
                btn.textContent = sug
                btn.onclick = () => {
                  view.dispatch({
                    changes: { from: start, to: end, insert: sug },
                  })
                }
                suggestionsContainer.appendChild(btn)
              })
            }
          })

          const separator = document.createElement("div")
          separator.className = "border-t border-border my-1"
          dom.appendChild(separator)

          const addBtn = document.createElement("button")
          addBtn.className = "px-2 py-1 text-left rounded-md hover:bg-purple-500/10 text-purple-500 font-semibold transition-colors cursor-pointer w-full text-[10px] flex items-center gap-1"
          addBtn.textContent = "Add to Dictionary"
          addBtn.onclick = () => {
            useDictionaryStore.getState().addWord(word)
            toast.success(`"${word}" added to custom dictionary.`)
            view.requestMeasure()
          }
          dom.appendChild(addBtn)

          return { dom }
        },
      }
    }
  }
  return null
})
