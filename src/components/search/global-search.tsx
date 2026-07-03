import { useEffect, useState, useMemo, useTransition } from "react"
import { FolderIcon, FileTextIcon, ArrowRightLeftIcon, SparklesIcon, Loader2 } from "lucide-react"
import { useNoteStore, type FolderType } from "@/hooks/use-note-store"
import { db } from "@/hooks/db"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"

function getSnippet(content: string, query: string): string | null {
  if (!query.trim()) return null
  const lowerContent = content.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const index = lowerContent.indexOf(lowerQuery)
  if (index === -1) return null

  let start = content.lastIndexOf("\n", index)
  if (start === -1) start = 0
  else start = start + 1

  let end = content.indexOf("\n", index)
  if (end === -1) end = content.length

  const line = content.substring(start, end).trim()
  
  if (line.length > 80) {
    const matchIndex = line.toLowerCase().indexOf(lowerQuery)
    const startIdx = Math.max(0, matchIndex - 30)
    const endIdx = Math.min(line.length, matchIndex + lowerQuery.length + 30)
    return (startIdx > 0 ? "..." : "") + line.substring(startIdx, endIdx) + (endIdx < line.length ? "..." : "")
  }
  return line
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [noteContents, setNoteContents] = useState<{ id: string; title: string; content: string }[]>([])
  const [semanticResults, setSemanticResults] = useState<{ id: string; score: number }[]>([])
  const [isLoadingContents, setIsLoadingContents] = useState(false)
  const [isSearchingSemantic, startSemanticSearch] = useTransition()

  const { notes, folders, openNote, openNoteInCurrentTab, setSearchQuery } = useNoteStore()

  // 1. Hotkey & Action Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle palette on Cmd+P / Ctrl+P
      if (e.key === "p" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }

      // Handle Enter & Shift+Enter navigation when open
      if (open && e.key === "Enter") {
        const selectedItem = document.querySelector('[data-selected="true"]')
        if (selectedItem) {
          const valAttr = selectedItem.getAttribute("data-value")
          if (valAttr && (valAttr.startsWith("note-") || valAttr.startsWith("note-semantic-"))) {
            const noteId = valAttr.split("-").pop()
            if (noteId) {
              e.preventDefault()
              if (e.shiftKey) {
                handleSelectNote(noteId, "current")
              } else {
                handleSelectNote(noteId, "new")
              }
            }
          }
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, noteContents])

  // 2. Load Content and trigger missing vector indexing on Open
  useEffect(() => {
    if (!open) return

    let active = true
    const loadContent = async () => {
      setIsLoadingContents(true)
      try {
        const loaded = await Promise.all(
          notes.map(async (note) => {
            const content = await db.getContent(note.id)
            return { id: note.id, title: note.title, content }
          })
        )
        if (active) {
          setNoteContents(loaded)
        }

        // Run self-healing background index checking
        const { indexMissingNotes } = await import("@/lib/vector-store")
        await indexMissingNotes(notes)
      } catch (err) {
        console.error("Failed to load content for global search:", err)
      } finally {
        if (active) {
          setIsLoadingContents(false)
        }
      }
    }

    loadContent()
    return () => {
      active = false
    }
  }, [open, notes])

  // 3. Trigger Semantic Vector search on query change (debounced/deferred)
  useEffect(() => {
    if (!query.trim()) {
      setSemanticResults([])
      return
    }

    const timer = setTimeout(() => {
      startSemanticSearch(async () => {
        try {
          const { searchSemantic } = await import("@/lib/vector-store")
          const results = await searchSemantic(query, notes)
          // Filter results with a minimum confidence score (e.g. 0.4)
          setSemanticResults(results.filter((r) => r.score > 0.4).slice(0, 5))
        } catch (err) {
          console.error("Failed semantic search:", err)
        }
      })
    }, 400) // Debounce semantic search since embedding generation takes ~100-300ms

    return () => clearTimeout(timer)
  }, [query, notes])

  // 4. Keyword Filters
  const queryLower = query.toLowerCase().trim()
  const matchedFolders = useMemo(() => {
    if (!queryLower) return []
    return folders.filter((f) => f.name.toLowerCase().includes(queryLower))
  }, [folders, queryLower])

  const matchedNotes = useMemo(() => {
    if (!queryLower) return []
    return noteContents.filter(
      (n) =>
        n.title.toLowerCase().includes(queryLower) ||
        n.content.toLowerCase().includes(queryLower)
    )
  }, [noteContents, queryLower])

  // 5. Handlers
  const handleSelectNote = async (noteId: string, action: "new" | "current") => {
    setOpen(false)
    setQuery("")
    if (action === "current") {
      await openNoteInCurrentTab(noteId)
    } else {
      await openNote(noteId)
    }
  }

  const handleSelectFolder = (folder: FolderType) => {
    setOpen(false)
    setQuery("")
    setSearchQuery(folder.name)
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Global Search"
      description="Search folders, notes, and contents globally."
    >
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Type to search files, folders, content... (Press Esc to close)"
      />
      <CommandList className="py-2 max-h-[350px]">
        {isLoadingContents && (
          <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Indexing note content...</span>
          </div>
        )}
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Folders List */}
        {matchedFolders.length > 0 && (
          <CommandGroup heading="Folders">
            {matchedFolders.map((folder) => (
              <CommandItem
                key={folder.id}
                value={`folder-${folder.name}-${folder.id}`}
                onSelect={() => handleSelectFolder(folder)}
              >
                <FolderIcon className="mr-2 h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="font-medium text-foreground">{folder.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Semantic Vector Matches */}
        {semanticResults.length > 0 && (
          <CommandGroup
            heading={
              <div className="flex items-center gap-1.5 text-purple-500 font-semibold">
                <SparklesIcon className="h-3 w-3" />
                <span>Semantic Matches</span>
                {isSearchingSemantic && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
              </div>
            }
          >
            {semanticResults.map(({ id, score }) => {
              const note = notes.find((n) => n.id === id)
              if (!note) return null
              return (
                <CommandItem
                  key={`semantic-${id}`}
                  value={`note-semantic-${note.title}-${id}`}
                  onSelect={() => handleSelectNote(id, "new")}
                  className="group/command-item flex flex-col items-start gap-0.5"
                >
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-2">
                      <SparklesIcon className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                      <span className="font-semibold">{note.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-purple-500/80 bg-purple-500/10 font-mono px-1.5 py-0.5 rounded-sm">
                        {Math.round(score * 100)}% match
                      </span>
                      {/* Secondary Quick Action Button */}
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="h-6 w-6 opacity-0 group-hover/command-item:opacity-100 hover:bg-muted ml-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelectNote(id, "current")
                        }}
                        title="Replace current tab"
                      >
                        <ArrowRightLeftIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CommandItem>
              )
            })}
          </CommandGroup>
        )}

        {/* Keyword Matches */}
        {matchedNotes.length > 0 && (
          <CommandGroup heading="Text Matches">
            {matchedNotes.map((file) => {
              const snippet = getSnippet(file.content, query)
              return (
                <CommandItem
                  key={file.id}
                  value={`note-${file.title}-${file.id}`}
                  onSelect={() => handleSelectNote(file.id, "new")}
                  className="group/command-item flex flex-col items-start gap-1"
                >
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileTextIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="font-semibold">{file.title}</span>
                    </div>
                    {/* Action indicators */}
                    <div className="ml-auto flex items-center gap-1.5 opacity-0 group-hover/command-item:opacity-100 transition-all shrink-0">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="h-6 w-6 hover:bg-muted"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelectNote(file.id, "current")
                        }}
                        title="Replace current tab (Shift+Enter)"
                      >
                        <ArrowRightLeftIcon className="h-3 w-3" />
                      </Button>
                      <span className="text-[9px] text-muted-foreground border px-1 rounded-sm bg-muted/20">
                        ⏎ Open
                      </span>
                      <span className="text-[9px] text-muted-foreground border px-1 rounded-sm bg-muted/20">
                        ⇧⏎ Replace
                      </span>
                    </div>
                  </div>
                  {snippet && (
                    <p className="pl-5.5 text-xs text-muted-foreground leading-normal max-w-full truncate font-mono">
                      {snippet}
                    </p>
                  )}
                </CommandItem>
              )
            })}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
