import { useNoteStore } from "@/hooks/use-note-store"
import { BookOpen, Code, Pencil } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import CodeMirrorEditor from "./code-mirror-editor/code-mirror-editor"
import MilkdownEditor from "./milkdown-editor/milkdown-editor"
import { ObsidianPreview } from "./obsidian-preview"
import ProseMirrorEditor from "./prose-mirror-editor/prose-mirror-editor"
import { RichEditor } from "./rich-editor"

interface EditorContainerProps {
  panel: "left" | "right"
}

type EditorModeType =
  | "vscode"
  | "obsidian"
  | "CodeMirror"
  | "ProseMirror"
  | "Milkdown"

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

  const [editorMode, setEditorMode] = useState<EditorModeType>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("editor-mode") as EditorModeType) || "vscode"
    }
    return "vscode"
  })

  const toggleEditorMode = useCallback((mode: EditorModeType) => {
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
          <div className="flex shrink-0 items-center gap-1 rounded-lg border bg-muted/35 p-0.5 select-none">
            <button
              onClick={() => toggleEditorMode("vscode")}
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-all ${
                editorMode === "vscode"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
              title="VS Code Mode"
            >
              {editorMode === "vscode" ? (
                <Code className="h-3.5 w-3.5" />
              ) : (
                <Pencil className="h-3.5 w-3.5" />
              )}
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
            <button
              onClick={() => toggleEditorMode("CodeMirror")}
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-all ${
                editorMode === "CodeMirror"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
              title="CodeMirror"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">CodeMirror</span>
            </button>
            <button
              onClick={() => toggleEditorMode("ProseMirror")}
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-all ${
                editorMode === "ProseMirror"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
              title="ProseMirror"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">ProseMirror</span>
            </button>
            <button
              onClick={() => toggleEditorMode("Milkdown")}
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-all ${
                editorMode === "Milkdown"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
              title="Milkdown"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Milkdown</span>
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
        {editorMode === "obsidian" && (
          <ObsidianPreview
            content={text}
            onChange={handleContentChange}
            onEdit={() => toggleEditorMode("vscode")}
          />
        )}

        {editorMode === "vscode" && (
          <RichEditor
            value={text}
            onChange={handleContentChange}
            placeholder="Start writing markdown..."
            mode={editorMode}
          />
        )}
        {editorMode === "CodeMirror" && (
          <CodeMirrorEditor
            value={text}
            onChange={handleContentChange}
            placeholder="Start writing markdown..."
          />
        )}
        {editorMode === "ProseMirror" && (
          <ProseMirrorEditor
            value={text}
            onChange={handleContentChange}
            placeholder="Start writing markdown..."
          />
        )}
        {editorMode === "Milkdown" && (
          <MilkdownEditor
            value={text}
            onChange={handleContentChange}
            placeholder="Start writing markdown..."
          />
        )}
      </div>
    </div>
  )
}
