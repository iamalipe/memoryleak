import { useNoteStore } from "@/hooks/use-note-store"
import { cn } from "@/lib/utils"
import { XIcon } from "lucide-react"
import { Button } from "../ui/button"
import { TabContextMenu } from "./tab-action"

import { useMemo } from "react"

interface TabsBarProps {
  panel: "left" | "right"
}

export const TabsBar = ({ panel }: TabsBarProps) => {
  const notes = useNoteStore((state) => state.notes)
  const activeNoteIds = useNoteStore((state) =>
    panel === "left" ? state.activeNoteIds : state.rightActiveNoteIds
  )

  const activeNotes = useMemo(() => {
    return notes.filter((n) => activeNoteIds.includes(n.id))
  }, [notes, activeNoteIds])

  const activeTabId = useNoteStore((state) =>
    panel === "left" ? state.activeNoteId : state.rightActiveNoteId
  )

  const { openNote, openNoteToRight, closeNote } = useNoteStore()

  const handleActivate = (id: string) => {
    if (panel === "left") {
      useNoteStore.setState({ activeNoteId: id, activePanel: "left" })
    } else {
      useNoteStore.setState({ rightActiveNoteId: id, activePanel: "right" })
    }
  }

  const handleClose = (id: string) => {
    closeNote(id, panel)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const id = e.dataTransfer.getData("text/plain")
    if (id) {
      if (panel === "left") {
        useNoteStore.setState({ activePanel: "left" })
        openNote(id)
      } else {
        useNoteStore.setState({ activePanel: "right" })
        openNoteToRight(id)
      }
    }
  }

  // Hide the entire bar if no tabs are open, but preserve dropzone height if dragging
  if (activeNotes.length === 0) {
    return (
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="flex h-8 w-full items-center justify-center border-b border-dashed border-muted-foreground/20 bg-muted/5 text-xs text-muted-foreground select-none"
      >
        Drop a note here to open
      </div>
    )
  }

  return (
    <div
      onWheel={(e) => {
        if (e.deltaY !== 0) {
          e.currentTarget.scrollLeft += e.deltaY
        }
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="scrollbar-thumb-rounded-full mt-1.75 scrollbar-thin scrollbar-none flex h-8 flex-none scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent overflow-x-auto overflow-y-hidden border-b border-sidebar-border pr-4 pl-2 transition-all"
    >
      {activeNotes.map((tab) => {
        if (!tab) return null
        return (
          <TabItem
            key={tab.id}
            tab={tab}
            panel={panel}
            isActive={activeTabId === tab.id}
            onActivate={handleActivate}
            onClose={handleClose}
          />
        )
      })}
    </div>
  )
}

// --- Fixed Typings ---
type TabItemProps = {
  tab: { id: string; title: string }
  panel: "left" | "right"
  isActive: boolean
  onActivate: (id: string) => void
  onClose: (id: string) => void
}

const TabItem = ({
  tab,
  panel,
  isActive,
  onActivate,
  onClose,
}: TabItemProps) => {
  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClose(tab.id)
  }

  return (
    <TabContextMenu tabId={tab.id} panel={panel}>
      <div
        onClick={() => onActivate(tab.id)}
        className={cn([
          "group flex h-full flex-none cursor-pointer items-center gap-1.5 border border-b-0 border-sidebar-border bg-sidebar pr-0.5 pl-2 text-sm transition-all ease-linear select-none",
          isActive && "border-t-2 border-t-primary bg-background font-medium",
        ])}
      >
        <div
          className={cn(
            "h-1.5 w-1.5 rounded-full bg-muted-foreground/40",
            isActive && "bg-primary"
          )}
        />
        <span className="max-w-[120px] truncate">{tab.title}</span>

        <Button
          onClick={handleCloseClick}
          size="icon-xs"
          variant="secondary"
          className={cn([
            "hover:text-destructive-foreground invisible ml-1 size-4 rounded-sm p-0 group-hover:visible hover:bg-destructive",
          ])}
        >
          <XIcon className="size-3" />
        </Button>
      </div>
    </TabContextMenu>
  )
}
