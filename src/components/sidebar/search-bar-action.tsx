import alertPopup from "@/alert-popup/alert-popup"
import { PromptDialog } from "@/alert-popup/prompt-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarInput,
} from "@/components/ui/sidebar"
import { useNoteStore } from "@/hooks/use-note-store"
import { EllipsisVerticalIcon, SearchIcon } from "lucide-react"

export function SearchBarAction({ ...props }: React.ComponentProps<"form">) {
  const searchQuery = useNoteStore((state) => state.searchQuery)
  const setSearchQuery = useNoteStore((state) => state.setSearchQuery)

  return (
    <form {...props} onSubmit={(e) => e.preventDefault()}>
      <SidebarGroup className="py-0">
        <SidebarGroupContent className="flex gap-2">
          <div className="relative flex-1">
            <Label htmlFor="search" className="sr-only">
              Search
            </Label>
            <SidebarInput
              id="search"
              placeholder="Search folders & files..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 opacity-50 select-none" />
          </div>
          <RootActionBtn />
        </SidebarGroupContent>
      </SidebarGroup>
    </form>
  )
}

const RootActionBtn = () => {
  const { addNote, addFolder, notes, folders } = useNoteStore()

  const handleCreateNote = async () => {
    // Sibling names at root level
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

  const handleCreateFolder = async () => {
    // Sibling names at root level
    const siblingNames = [
      ...notes.filter((n) => n.folderId === null).map((n) => n.title),
      ...folders.filter((f) => f.parentId === null).map((f) => f.name),
    ]

    const result = await alertPopup.show({
      title: "New Folder",
      customFooter: true,
      customElement: <PromptDialog />,
      passData: {
        label: "Folder Name",
        placeholder: "Enter folder name...",
        existingNames: siblingNames,
      },
    })

    if (result.response && result.value) {
      addFolder({
        parentId: null,
        name: result.value.trim(),
      })
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="icon" className="h-9 w-9">
          <EllipsisVerticalIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCreateNote}>
          New note
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCreateFolder}>
          New Folder
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
