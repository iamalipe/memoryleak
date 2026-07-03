import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from "@/components/ui/sidebar"
import {
  useNoteStore,
  type FolderType,
  type NoteType,
} from "@/hooks/use-note-store"
import { cn } from "@/lib/utils"
import { ChevronRightIcon, FileIcon, FolderIcon } from "lucide-react"
import { Button } from "../ui/button"
import { FileContextMenu, FolderContextMenu } from "./tree-action"
import { useMemo } from "react"
import alertPopup from "@/alert-popup/alert-popup"
import { PromptDialog } from "@/alert-popup/prompt-dialog"

export const FolderTree = () => {
  const { notes, folders, searchQuery, addNote } = useNoteStore()

  // Memoize search check
  const searchLower = searchQuery.toLowerCase()

  const matchesFolder = useMemo(() => {
    const memo: Record<string, boolean> = {}
    const check = (folderId: string): boolean => {
      if (folderId in memo) return memo[folderId]
      const folder = folders.find((f) => f.id === folderId)
      if (!folder) return false
      if (folder.name.toLowerCase().includes(searchLower)) {
        memo[folderId] = true
        return true
      }
      const childF = folders.filter((f) => f.parentId === folderId)
      for (const f of childF) {
        if (check(f.id)) {
          memo[folderId] = true
          return true
        }
      }
      const childNotes = notes.filter((n) => n.folderId === folderId)
      for (const n of childNotes) {
        if (n.title.toLowerCase().includes(searchLower)) {
          memo[folderId] = true
          return true
        }
      }
      memo[folderId] = false
      return false
    }
    return check
  }, [folders, notes, searchLower])

  const { visibleFolderIds, visibleNoteIds } = useMemo(() => {
    if (!searchQuery) {
      return {
        visibleFolderIds: new Set<string>(),
        visibleNoteIds: new Set<string>(),
      }
    }

    const folderSet = new Set<string>()
    const noteSet = new Set<string>()

    folders.forEach((f) => {
      if (matchesFolder(f.id)) {
        folderSet.add(f.id)
        let parentId = f.parentId
        while (parentId) {
          folderSet.add(parentId)
          const parent = folders.find((pf) => pf.id === parentId)
          parentId = parent ? parent.parentId : null
        }
      }
    })

    notes.forEach((n) => {
      if (n.title.toLowerCase().includes(searchLower)) {
        noteSet.add(n.id)
        let parentId = n.folderId
        while (parentId) {
          folderSet.add(parentId)
          const parent = folders.find((pf) => pf.id === parentId)
          parentId = parent ? parent.parentId : null
        }
      }
    })

    return {
      visibleFolderIds: folderSet,
      visibleNoteIds: noteSet,
    }
  }, [folders, notes, searchQuery, searchLower, matchesFolder])

  const isFolderVisible = (folderId: string) => {
    if (!searchQuery) return true
    return visibleFolderIds.has(folderId)
  }

  const isNoteVisible = (noteId: string) => {
    if (!searchQuery) return true
    return visibleNoteIds.has(noteId)
  }

  const childFolders = folders.filter((f) => f.parentId === null)
  const childNotes = notes.filter((n) => n.folderId === null)

  const handleCreateRootNote = async () => {
    const siblingNames = [
      ...notes.filter((n) => n.folderId === null).map((n) => n.title),
      ...folders.filter((f) => f.parentId === null).map((f) => f.name),
    ]

    const result = await alertPopup.show({
      title: "New Note",
      customFooter: true,
      customElement: <PromptDialog />,
      passData: {
        label: "Note Title",
        placeholder: "Enter note title...",
        existingNames: siblingNames,
      },
    })

    if (result.response && result.value) {
      addNote({
        folderId: null,
        path: "",
        title: result.value.trim(),
      })
    }
  }

  return (
    <SidebarContent className="mt-2 select-none">
      {childNotes.length === 0 && childFolders.length === 0 && (
        <SidebarMenu className="mr-0 px-2">
          <Button variant="default" onClick={handleCreateRootNote}>
            New note
          </Button>
        </SidebarMenu>
      )}
      <SidebarMenu className="mr-0 px-2">
        {childFolders
          .filter((f) => isFolderVisible(f.id))
          .map((cFolder) => (
            <Tree
              key={cFolder.id}
              folders={folders}
              folder={cFolder}
              notes={notes}
              isFolderVisible={isFolderVisible}
              isNoteVisible={isNoteVisible}
              searchQuery={searchQuery}
            />
          ))}
        {childNotes
          .filter((n) => isNoteVisible(n.id))
          .map((cNote) => (
            <NoteItem data={cNote} key={cNote.id} />
          ))}
      </SidebarMenu>
    </SidebarContent>
  )
}

type TreeItem = {
  folder?: FolderType
  notes: NoteType[]
  folders: FolderType[]
  isFolderVisible: (id: string) => boolean
  isNoteVisible: (id: string) => boolean
  searchQuery: string
}

function Tree({
  folder,
  notes,
  folders,
  isFolderVisible,
  isNoteVisible,
  searchQuery,
}: TreeItem) {
  const childFolders = folders.filter(
    (f) => f.parentId === (folder?.id || null)
  )
  const childNotes = notes.filter((n) => n.folderId === (folder?.id || null))

  if (!folder) {
    return (
      <>
        {childNotes
          .filter((n) => isNoteVisible(n.id))
          .map((cNote) => (
            <NoteItem data={cNote} key={cNote.id} />
          ))}
      </>
    )
  }

  return (
    <SidebarMenuItem className="mr-0 pr-0 pl-0">
      <Collapsible
        open={searchQuery ? true : undefined}
        className="group/collapsible [&[data-open]>button>svg:first-child]:rotate-90"
      >
        <CollapsibleTrigger asChild>
          <FolderItem data={folder} key={folder.id} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="mr-0 pr-0 pl-0">
            {childFolders
              .filter((f) => isFolderVisible(f.id))
              .map((subFolder, index) => (
                <Tree
                  key={index}
                  folder={subFolder}
                  folders={folders}
                  notes={notes}
                  isFolderVisible={isFolderVisible}
                  isNoteVisible={isNoteVisible}
                  searchQuery={searchQuery}
                />
              ))}
            {childNotes
              .filter((n) => isNoteVisible(n.id))
              .map((cNote) => (
                <NoteItem data={cNote} key={cNote.id} />
              ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  )
}

const NoteItem = ({ data }: { data: NoteType }) => {
  const { openNote, activeNoteId, rightActiveNoteId, activePanel } = useNoteStore()
  
  const currentActiveId = activePanel === "left" ? activeNoteId : rightActiveNoteId
  const isActive = data.id === currentActiveId

  const onClick = () => {
    openNote(data.id)
  }

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", data.id)
    e.dataTransfer.effectAllowed = "move"
  }

  return (
    <FileContextMenu data={data}>
      <SidebarMenuButton
        tooltip={data.title}
        onClick={onClick}
        isActive={isActive}
        draggable
        onDragStart={handleDragStart}
        className="relative truncate data-open:hover:bg-sidebar-border data-active:bg-sidebar-border cursor-grab active:cursor-grabbing"
      >
        <FileIcon className="size-4 shrink-0" />
        <span className="truncate">{data.title}</span>
      </SidebarMenuButton>
    </FileContextMenu>
  )
}

const FolderItem = ({ data, ...props }: { data: FolderType }) => {
  // @ts-ignore
  const isOpen = props?.["data-state"] === "open"

  return (
    <FolderContextMenu data={data}>
      <SidebarMenuButton
        tooltip={data.name}
        className="relative truncate"
        {...props}
      >
        <ChevronRightIcon
          className={cn([
            "transition-transform duration-200 size-4 shrink-0",
            isOpen && "rotate-90",
          ])}
        />
        <FolderIcon className="size-4 shrink-0" />
        <span className="truncate">{data.name}</span>
      </SidebarMenuButton>
    </FolderContextMenu>
  )
}
