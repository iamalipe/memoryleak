import { useRef, useEffect, useState, useMemo } from "react"
import CodeMirror from "@uiw/react-codemirror"
import type { ReactCodeMirrorRef } from "@uiw/react-codemirror"
import { markdown } from "@codemirror/lang-markdown"
import { EditorView, keymap, Decoration, WidgetType } from "@codemirror/view"
import type { DecorationSet } from "@codemirror/view"
import { RangeSetBuilder, StateField } from "@codemirror/state"
import { syntaxTree } from "@codemirror/language"
import { 
  indentWithTab, 
  undo, 
  redo, 
  selectAll, 
  toggleComment, 
  moveLineUp, 
  moveLineDown, 
  copyLineUp, 
  copyLineDown,
  indentMore,
  indentLess
} from "@codemirror/commands"
import { openSearchPanel } from "@codemirror/search"
import { useTheme } from "@/components/theme/theme-provider"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { 
  Undo2, 
  Redo2, 
  Search, 
  AlignLeft, 
  MessageSquareCode, 
  Indent, 
  Outdent,
  MoreVertical,
} from "lucide-react"

// Lightweight custom markdown formatter
function formatMarkdown(content: string): string {
  if (!content) return ""
  
  const lines = content.split(/\r?\n/)
  const formattedLines: string[] = []
  let inCodeBlock = false
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    
    // Trim trailing whitespace
    line = line.trimEnd()
    
    // Detect code blocks
    if (line.startsWith("```")) {
      inCodeBlock = !inCodeBlock
      
      // Ensure empty line before code block start
      if (inCodeBlock && i > 0 && formattedLines.length > 0 && formattedLines[formattedLines.length - 1] !== "") {
        formattedLines.push("")
      }
      
      formattedLines.push(line)
      
      // Ensure empty line after code block end
      if (!inCodeBlock && i < lines.length - 1 && lines[i + 1].trim() !== "") {
        formattedLines.push("")
      }
      continue
    }
    
    if (inCodeBlock) {
      formattedLines.push(line)
      continue
    }
    
    // Format headers: ensure space after #
    if (line.startsWith("#")) {
      const match = line.match(/^(#+)(.*)$/)
      if (match) {
        const hashes = match[1]
        const headingText = match[2].trim()
        if (headingText) {
          line = `${hashes} ${headingText}`
        }
      }
      
      // Ensure empty line before header
      if (i > 0 && formattedLines.length > 0 && formattedLines[formattedLines.length - 1] !== "") {
        formattedLines.push("")
      }
    }
    
    formattedLines.push(line)
  }
  
  let formattedContent = formattedLines.join("\n").trim()
  
  // Ensure exactly one trailing newline at the end (VS Code standard)
  if (formattedContent) {
    formattedContent += "\n"
  }
  
  return formattedContent
}

// Interactive Checkbox Widget for Markdown Checklists
class CheckboxWidget extends WidgetType {
  readonly checked: boolean
  readonly pos: number

  constructor(checked: boolean, pos: number) {
    super()
    this.checked = checked
    this.pos = pos
  }

  eq(other: CheckboxWidget) {
    return other.checked === this.checked && other.pos === this.pos
  }

  toDOM(view: EditorView) {
    const input = document.createElement("input")
    input.type = "checkbox"
    input.checked = this.checked
    input.className = "mr-2 h-4 w-4 rounded-sm border-border bg-background text-primary accent-primary focus:ring-ring focus:ring-offset-background cursor-pointer"
    
    input.addEventListener("change", (e) => {
      const isChecked = (e.target as HTMLInputElement).checked
      const newMarker = isChecked ? "[x]" : "[ ]"
      
      view.dispatch({
        changes: {
          from: this.pos,
          to: this.pos + 3,
          insert: newMarker
        }
      })
    })
    
    return input
  }
}

// Widget to hide markdown markers
class HiddenMarkerWidget extends WidgetType {
  toDOM() {
    const span = document.createElement("span")
    span.style.display = "none"
    return span
  }
}

// State Field to manage Live Preview decorations
const markdownLivePreviewField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none
  },
  update(decorations, tr) {
    if (!tr.docChanged && !tr.selection) {
      return decorations.map(tr.changes)
    }

    const builder = new RangeSetBuilder<Decoration>()
    const { state } = tr
    const selection = state.selection.main
    const cursorLine = state.doc.lineAt(selection.head).number

    syntaxTree(state).iterate({
      enter(node) {
        // 1. Task Checkbox Markers
        if (node.name === "TaskMarker") {
          const text = state.sliceDoc(node.from, node.to)
          if (text.startsWith("[") && text.endsWith("]")) {
            const checked = text.toLowerCase().includes("x")
            builder.add(
              node.from,
              node.to,
              Decoration.replace({
                widget: new CheckboxWidget(checked, node.from),
                block: false
              })
            )
          }
          return
        }

        // 2. Hide formatting symbols on inactive lines
        const isMarker = 
          node.name === "HeaderMark" ||
          node.name === "EmphasisMark" ||
          node.name === "StrongMark" ||
          node.name === "CodeMark" ||
          node.name === "LinkMark" ||
          node.name === "URL"

        if (isMarker) {
          const line = state.doc.lineAt(node.from).number
          if (line !== cursorLine) {
            builder.add(
              node.from,
              node.to,
              Decoration.replace({
                widget: new HiddenMarkerWidget(),
                block: false
              })
            )
          }
        }
      }
    })

    return builder.finish()
  },
  provide(field) {
    return EditorView.decorations.from(field)
  }
})

interface RichEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  mode?: "vscode" | "obsidian"
}

export const RichEditor = ({ 
  value, 
  onChange, 
  placeholder = "Start writing markdown...",
  mode = "vscode"
}: RichEditorProps) => {
  const editorRef = useRef<ReactCodeMirrorRef>(null)
  const { theme } = useTheme()
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia("(max-width: 768px)").matches)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Resolve light/dark theme dynamically
  const resolvedTheme = useMemo(() => {
    if (theme === "system") {
      if (typeof window !== "undefined") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      }
      return "light"
    }
    return theme === "dark" || theme === "cyberpunk" ? "dark" : "light"
  }, [theme])

  // Custom editor base styles aligned with the app's CSS theme variables
  const editorBaseTheme = useMemo(() => {
    const isObsidian = mode === "obsidian"

    return EditorView.theme({
      "&": {
        height: "100%",
        fontSize: isObsidian ? "16px" : "14px",
        fontFamily: isObsidian 
          ? "var(--font-sans), sans-serif" 
          : "var(--font-mono, Menlo, Monaco, Consolas, 'Courier New', monospace)",
        backgroundColor: "transparent",
      },
      ".cm-scroller": {
        overflow: "auto",
        scrollbarWidth: "thin",
      },
      ".cm-gutters": {
        backgroundColor: "transparent",
        borderRight: isObsidian ? "none" : "1px solid var(--border)",
        color: "var(--muted-foreground)",
        opacity: 0.6,
        display: isObsidian ? "none" : "flex",
      },
      ".cm-activeLineGutter": {
        backgroundColor: "var(--muted)",
        color: "var(--foreground)",
        fontWeight: "bold",
      },
      ".cm-activeLine": {
        backgroundColor: isObsidian ? "transparent" : "var(--muted) / 30%",
      },
      ".cm-cursor": {
        borderLeftColor: "var(--foreground)",
      },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
        backgroundColor: "var(--accent) !important",
        color: "var(--accent-foreground) !important",
      },
      ".cm-content": {
        caretColor: "var(--foreground)",
        padding: isObsidian 
          ? "32px max(1.5rem, calc((100% - 720px) / 2))" 
          : "12px 8px",
      },
      ".cm-line": {
        padding: isObsidian ? "6px 0" : "0 4px",
      },
      ".cm-placeholder": {
        color: "var(--muted-foreground)",
        opacity: 0.8,
      },
      // Inline Markdown formatting for Obsidian Mode
      ...(isObsidian ? {
        ".cm-content .tok-heading1": {
          fontSize: "2em",
          fontWeight: "800",
          color: "var(--foreground)",
          margin: "1.2rem 0 0.6rem 0",
          display: "inline-block",
        },
        ".cm-content .tok-heading2": {
          fontSize: "1.6em",
          fontWeight: "750",
          color: "var(--foreground)",
          margin: "1rem 0 0.5rem 0",
          display: "inline-block",
        },
        ".cm-content .tok-heading3": {
          fontSize: "1.3em",
          fontWeight: "700",
          color: "var(--foreground)",
          margin: "0.8rem 0 0.4rem 0",
          display: "inline-block",
        },
        ".cm-content .tok-strong": {
          fontWeight: "bold",
          color: "var(--foreground)",
        },
        ".cm-content .tok-emphasis": {
          fontStyle: "italic",
        },
        ".cm-content .tok-meta": {
          color: "var(--muted-foreground)",
          opacity: 0.45,
        },
        ".cm-content .tok-quote": {
          borderLeft: "4px solid var(--border)",
          paddingLeft: "16px",
          color: "var(--muted-foreground)",
          fontStyle: "italic",
          display: "block",
          margin: "0.5rem 0",
        },
        ".cm-content .tok-inlineCode": {
          backgroundColor: "var(--muted)",
          padding: "2px 6px",
          borderRadius: "6px",
          fontFamily: "var(--font-mono)",
          fontSize: "0.85em",
          border: "1px solid var(--border)",
        },
        ".cm-content .tok-link": {
          color: "oklch(0.6 0.15 250)",
          textDecoration: "underline",
          cursor: "pointer",
        }
      } : {})
    })
  }, [mode])

  // Programmatic Actions helpers
  const handleUndo = () => {
    if (editorRef.current?.view) {
      undo(editorRef.current.view)
    }
  }

  const handleRedo = () => {
    if (editorRef.current?.view) {
      redo(editorRef.current.view)
    }
  }

  const handleSelectAll = () => {
    if (editorRef.current?.view) {
      selectAll(editorRef.current.view)
      editorRef.current.view.focus()
    }
  }

  const handleFind = () => {
    if (editorRef.current?.view) {
      openSearchPanel(editorRef.current.view)
    }
  }

  const handleToggleComment = () => {
    if (editorRef.current?.view) {
      toggleComment(editorRef.current.view)
      editorRef.current.view.focus()
    }
  }

  const handleIndent = () => {
    if (editorRef.current?.view) {
      indentMore(editorRef.current.view)
      editorRef.current.view.focus()
    }
  }

  const handleOutdent = () => {
    if (editorRef.current?.view) {
      indentLess(editorRef.current.view)
      editorRef.current.view.focus()
    }
  }

  const handleFormat = () => {
    if (editorRef.current?.view) {
      const view = editorRef.current.view
      const currentDoc = view.state.doc.toString()
      const formatted = formatMarkdown(currentDoc)
      if (formatted !== currentDoc) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: formatted }
        })
        toast.success("Document formatted successfully!")
      } else {
        toast.info("Document already formatted.")
      }
      view.focus()
    }
  }

  const handleCut = () => {
    if (editorRef.current?.view) {
      const view = editorRef.current.view
      const { from, to } = view.state.selection.main
      const selectedText = view.state.sliceDoc(from, to)
      if (selectedText) {
        navigator.clipboard.writeText(selectedText).then(() => {
          view.dispatch({
            changes: { from, to, insert: "" }
          })
          toast.success("Text cut to clipboard")
        }).catch(() => {
          toast.error("Cut failed. Please use Cmd+X / Ctrl+X.")
        })
      }
      view.focus()
    }
  }

  const handleCopy = () => {
    if (editorRef.current?.view) {
      const view = editorRef.current.view
      const { from, to } = view.state.selection.main
      const selectedText = view.state.sliceDoc(from, to)
      if (selectedText) {
        navigator.clipboard.writeText(selectedText).then(() => {
          toast.success("Text copied to clipboard")
        }).catch(() => {
          toast.error("Copy failed. Please use Cmd+C / Ctrl+C.")
        })
      }
      view.focus()
    }
  }

  const handlePaste = () => {
    if (editorRef.current?.view) {
      const view = editorRef.current.view
      navigator.clipboard.readText().then((text) => {
        if (text) {
          view.dispatch(view.state.replaceSelection(text))
          toast.success("Text pasted")
        }
      }).catch(() => {
        toast.error("Paste blocked. Please use Cmd+V / Ctrl+V.")
      })
      view.focus()
    }
  }

  // Intercepting keys & registering custom cross-platform VS Code keyboard bindings
  const keyboardShortcutsExtension = useMemo(() => {
    return keymap.of([
      // Intercept and ignore default browser Save (Mod+S)
      {
        key: "Mod-s",
        run: () => {
          toast.success("Changes are automatically saved!", {
            id: "autosave-notification"
          })
          return true // handled, prevent default
        }
      },
      // Intercept and ignore default browser Print (Mod+P)
      {
        key: "Mod-p",
        run: () => {
          return true // handled, prevent default
        }
      },
      // Move Line Up (Alt+Up)
      {
        key: "Alt-ArrowUp",
        run: moveLineUp
      },
      // Move Line Down (Alt+Down)
      {
        key: "Alt-ArrowDown",
        run: moveLineDown
      },
      // Copy Line Up (Shift+Alt+Up)
      {
        key: "Shift-Alt-ArrowUp",
        run: copyLineUp
      },
      // Copy Line Down (Shift+Alt+Down)
      {
        key: "Shift-Alt-ArrowDown",
        run: copyLineDown
      },
      // Toggle Comment (Mod+/)
      {
        key: "Mod-/",
        run: toggleComment
      },
      // Format Document (Shift+Alt+F)
      {
        key: "Shift-Alt-f",
        run: (view) => {
          const currentDoc = view.state.doc.toString()
          const formatted = formatMarkdown(currentDoc)
          if (formatted !== currentDoc) {
            view.dispatch({
              changes: { from: 0, to: view.state.doc.length, insert: formatted }
            })
            toast.success("Document formatted successfully!")
          } else {
            toast.info("Document already formatted.")
          }
          return true
        }
      },
      // Standard Tab / Shift+Tab indent behavior
      indentWithTab
    ])
  }, [])

  // Memoized CodeMirror extensions list
  const extensions = useMemo(() => {
    const list = [
      markdown(),
      editorBaseTheme,
      keyboardShortcutsExtension,
      EditorView.lineWrapping,
    ]
    if (mode === "obsidian") {
      list.push(markdownLivePreviewField)
    }
    return list
  }, [editorBaseTheme, keyboardShortcutsExtension, mode])

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-xs">
      {/* Mobile-Friendly Quick Actions Toolbar */}
      {isMobile && (
        <div className="flex items-center justify-between border-b bg-muted/20 px-2 py-1 shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleUndo} title="Undo">
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleRedo} title="Redo">
              <Redo2 className="h-4 w-4" />
            </Button>
            <div className="h-4 w-px bg-border shrink-0 mx-0.5" />
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleIndent} title="Indent (Tab)">
              <Indent className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleOutdent} title="Outdent (Shift+Tab)">
              <Outdent className="h-4 w-4" />
            </Button>
            <div className="h-4 w-px bg-border shrink-0 mx-0.5" />
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleToggleComment} title="Toggle Comment">
              <MessageSquareCode className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleFormat} title="Format Document">
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleFind} title="Find / Search">
              <Search className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Dropdown Menu for other actions on Mobile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleUndo}>Undo</DropdownMenuItem>
              <DropdownMenuItem onClick={handleRedo}>Redo</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleCut}>Cut</DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopy}>Copy</DropdownMenuItem>
              <DropdownMenuItem onClick={handlePaste}>Paste</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleFind}>Find</DropdownMenuItem>
              <DropdownMenuItem onClick={handleSelectAll}>Select All</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleToggleComment}>Toggle Comment</DropdownMenuItem>
              <DropdownMenuItem onClick={handleFormat}>Format Document</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Desktop Context Menu wrapping the Editor */}
      <ContextMenu>
        <ContextMenuTrigger className="flex-1 overflow-hidden h-full w-full">
          <CodeMirror
            ref={editorRef}
            value={value}
            height="100%"
            theme={resolvedTheme}
            extensions={extensions}
            placeholder={placeholder}
            onChange={onChange}
            className="h-full w-full outline-hidden"
            basicSetup={{
              lineNumbers: mode === "vscode",
              foldGutter: mode === "vscode",
              highlightActiveLine: mode === "vscode",
              highlightActiveLineGutter: mode === "vscode",
            }}
          />
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuItem onClick={handleUndo}>
            Undo
            <span className="ml-auto text-xs text-muted-foreground">Cmd+Z</span>
          </ContextMenuItem>
          <ContextMenuItem onClick={handleRedo}>
            Redo
            <span className="ml-auto text-xs text-muted-foreground">Cmd+Shift+Z</span>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleCut}>
            Cut
            <span className="ml-auto text-xs text-muted-foreground">Cmd+X</span>
          </ContextMenuItem>
          <ContextMenuItem onClick={handleCopy}>
            Copy
            <span className="ml-auto text-xs text-muted-foreground">Cmd+C</span>
          </ContextMenuItem>
          <ContextMenuItem onClick={handlePaste}>
            Paste
            <span className="ml-auto text-xs text-muted-foreground">Cmd+V</span>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleFind}>
            Find / Replace
            <span className="ml-auto text-xs text-muted-foreground">Cmd+F</span>
          </ContextMenuItem>
          <ContextMenuItem onClick={handleSelectAll}>
            Select All
            <span className="ml-auto text-xs text-muted-foreground">Cmd+A</span>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleToggleComment}>
            Toggle Comment
            <span className="ml-auto text-xs text-muted-foreground">Cmd+/</span>
          </ContextMenuItem>
          <ContextMenuItem onClick={handleFormat}>
            Format Document
            <span className="ml-auto text-xs text-muted-foreground">Shift+Alt+F</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  )
}
