import { useNoteStore } from "@/hooks/use-note-store"
import { useCallback, useEffect, useRef, useState } from "react"
import { RichEditor } from "./rich-editor"
import { ObsidianPreview } from "./obsidian-preview"
import { Code, BookOpen, Pencil } from "lucide-react"

interface EditorContainerProps {
  panel: "left" | "right"
}

const DEBOUNCE_MS = 800

export const EditorContainer = ({ panel }: EditorContainerProps) => {
  const activeNoteId = useNoteStore((state) =>
    panel === "left" ? state.activeNoteId : state.rightActiveNoteId
  )

  const note = useNoteStore((state) =>
    state.notes.find((n) => n.id === activeNoteId)
  )

  const updateNote = useNoteStore((state) => state.updateNote)

  const storeContent = note?.content ?? ""
  const [text, setText] = useState(storeContent)
  const [prevStoreContent, setPrevStoreContent] = useState(storeContent)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [editorMode, setEditorMode] = useState<"vscode" | "obsidian">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("editor-mode") as "vscode" | "obsidian") || "vscode"
    }
    return "vscode"
  })

  const toggleEditorMode = useCallback((mode: "vscode" | "obsidian") => {
    setEditorMode(mode)
    localStorage.setItem("editor-mode", mode)
  }, [])

  // Keep refs of latest values for the unmount flush callback
  const updateNoteRef = useRef(updateNote)
  const activeNoteIdRef = useRef(activeNoteId)
  const textRef = useRef(text)

  useEffect(() => {
    updateNoteRef.current = updateNote
    activeNoteIdRef.current = activeNoteId
    textRef.current = text
  }, [updateNote, activeNoteId, text])

  if (storeContent !== prevStoreContent) {
    setPrevStoreContent(storeContent)
    setText(storeContent)
  }

  const handleContentChange = useCallback(
    (newText: string) => {
      setText(newText)

      if (!activeNoteId) return

      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      debounceRef.current = setTimeout(() => {
        updateNote(activeNoteId, { content: newText })
      }, DEBOUNCE_MS)
    },
    [activeNoteId, updateNote]
  )

  // Flush any pending changes on unmount (e.g. when tab switches or document closes)
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        if (activeNoteIdRef.current) {
          updateNoteRef.current(activeNoteIdRef.current, {
            content: textRef.current,
          })
        }
      }
    }
  }, [])

  if (!note) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background/50 p-4 text-center text-sm text-muted-foreground select-none">
        Select or create a file to start editing
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background p-2">
      <div className="mb-1 flex flex-none items-center justify-between border-b pb-1">
        <h1 className="max-w-[50%] truncate text-lg font-semibold select-text">
          {note.title}
        </h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border bg-muted/35 p-0.5 select-none shrink-0">
            <button
              onClick={() => toggleEditorMode("vscode")}
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-all ${
                editorMode === "vscode"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
              title="VS Code Mode"
            >
              {editorMode === "vscode" ? <Code className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">Editor</span>
            </button>
            <button
              onClick={() => toggleEditorMode("obsidian")}
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-all ${
                editorMode === "obsidian"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
              title="Reading Mode"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reading</span>
            </button>
          </div>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground select-none">
            {note.updatedAt
              ? new Date(note.updatedAt).toLocaleTimeString()
              : "Unsaved"}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {editorMode === "obsidian" ? (
          <ObsidianPreview
            content={text}
            onChange={handleContentChange}
            onEdit={() => toggleEditorMode("vscode")}
          />
        ) : (
          <RichEditor
            value={text}
            onChange={handleContentChange}
            placeholder="Start writing markdown..."
            mode={editorMode}
          />
        )}
      </div>
    </div>
  )
}
