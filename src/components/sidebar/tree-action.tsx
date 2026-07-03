import alertPopup from "@/alert-popup/alert-popup"
import { PromptDialog } from "@/alert-popup/prompt-dialog"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  useNoteStore,
  type FolderType,
  type NoteType,
} from "@/hooks/use-note-store"
import { toast } from "sonner"
import { forwardRef, useImperativeHandle, useState } from "react"
import { Label } from "@/components/ui/label"
import { AlertDialogCancel, AlertDialogFooter } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

// =====================
// CUSTOM FOLDER SELECT DIALOG
// =====================
interface FolderSelectDialogProps {
  onConfirm?: () => void
  onCancel?: () => void
  passData?: {
    folders: FolderType[]
    currentFolderId: string | null
  }
}

const FolderSelectDialog = forwardRef<any, FolderSelectDialogProps>((props, ref) => {
  const folders = props.passData?.folders || []
  const currentFolderId = props.passData?.currentFolderId || null
  const [selectedId, setSelectedId] = useState<string>(currentFolderId || "root")

  useImperativeHandle(ref, () => ({
    getValues: () => ({ folderId: selectedId === "root" ? null : selectedId }),
  }))

  return (
    <div className="space-y-4 py-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor="folder-select" className="text-sm font-medium">
          Choose Target Folder
        </Label>
        <select
          id="folder-select"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="root">/ (Root)</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      <AlertDialogFooter>
        <AlertDialogCancel type="button" onClick={props.onCancel}>
          Cancel
        </AlertDialogCancel>
        <Button type="button" onClick={props.onConfirm}>
          Move
        </Button>
      </AlertDialogFooter>
    </div>
  )
})

// =====================
// FILE CONTEXT MENU
// =====================
type FileContextMenuProps = {
  children?: React.ReactNode
  data: NoteType
}

export function FileContextMenu({ children, data }: FileContextMenuProps) {
  const { openNote, openNoteToRight, duplicateNote, updateNote, deleteNote, notes, folders } =
    useNoteStore()

  const handleDuplicate = async () => {
    const parentFolderId = data.folderId
    const siblingNames = [
      ...notes.filter((n) => n.folderId === parentFolderId).map((n) => n.title),
      ...folders.filter((f) => f.parentId === parentFolderId).map((f) => f.name),
    ]

    const result = await alertPopup.show({
      title: "Duplicate File",
      customFooter: true,
      customElement: <PromptDialog />,
      passData: {
        label: "Duplicate Name",
        defaultValue: `${data.title} copy`,
        placeholder: "Enter new file name...",
        existingNames: siblingNames,
      },
    })

    if (result.response && result.value) {
      await duplicateNote(data.id, result.value.trim())
      toast.success("File duplicated successfully")
    }
  }

  const handleMove = async () => {
    // Exclude target check inside moving process
    const result = await alertPopup.show({
      title: "Move File",
      customFooter: true,
      customElement: <FolderSelectDialog />,
      passData: {
        folders,
        currentFolderId: data.folderId,
      },
    })

    if (result.response && result.folderId !== undefined) {
      const targetFolderId = result.folderId
      if (targetFolderId === data.folderId) return

      // Validate name collision in target folder
      const targetSiblingNames = [
        ...notes.filter((n) => n.folderId === targetFolderId).map((n) => n.title),
        ...folders.filter((f) => f.parentId === targetFolderId).map((f) => f.name),
      ]

      const hasCollision = targetSiblingNames
        .map((n) => n.toLowerCase())
        .includes(data.title.toLowerCase())

      if (hasCollision) {
        toast.error(`A file or folder named "${data.title}" already exists in the target folder.`)
        return
      }

      await updateNote(data.id, { folderId: targetFolderId })
      toast.success("File moved successfully")
    }
  }

  const handleRename = async () => {
    const parentFolderId = data.folderId
    const siblingNames = [
      ...notes.filter((n) => n.folderId === parentFolderId && n.id !== data.id).map((n) => n.title),
      ...folders.filter((f) => f.parentId === parentFolderId).map((f) => f.name),
    ]

    const result = await alertPopup.show({
      title: "Rename File",
      customFooter: true,
      customElement: <PromptDialog />,
      passData: {
        label: "New Name",
        defaultValue: data.title,
        placeholder: "Enter new name...",
        existingNames: siblingNames,
      },
    })

    if (result.response && result.value) {
      await updateNote(data.id, { title: result.value.trim() })
      toast.success("File renamed successfully")
    }
  }

  const handleDelete = async () => {
    const confirm = await alertPopup.delete({
      title: "Delete File",
      description: `Are you sure you want to delete "${data.title}"? This action cannot be undone.`,
    })

    if (confirm.response) {
      await deleteNote(data.id)
      toast.success("File deleted successfully")
    }
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuGroup>
          <ContextMenuItem onClick={() => openNote(data.id)}>
            Open in new tab
          </ContextMenuItem>
          <ContextMenuItem onClick={() => openNoteToRight(data.id)}>
            Open to the right
          </ContextMenuItem>
          <ContextMenuItem disabled>
            Open in new window
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleDuplicate}>
            Duplicate
          </ContextMenuItem>
          <ContextMenuItem onClick={handleMove}>
            Move file to...
          </ContextMenuItem>
          <ContextMenuItem disabled>
            Change icon
          </ContextMenuItem>
          <ContextMenuItem disabled>
            Check file stats
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleRename}>
            Rename
          </ContextMenuItem>
          <ContextMenuItem variant="destructive" onClick={handleDelete}>
            Delete
          </ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  )
}

// =====================
// FOLDER CONTEXT MENU
// =====================
type FolderContextMenuProps = {
  children?: React.ReactNode
  data: FolderType
}

export function FolderContextMenu({ children, data }: FolderContextMenuProps) {
  const { addNote, addFolder, updateFolder, deleteFolder, notes, folders } = useNoteStore()

  const handleCreateNote = async () => {
    const siblingNames = [
      ...notes.filter((n) => n.folderId === data.id).map((n) => n.title),
      ...folders.filter((f) => f.parentId === data.id).map((f) => f.name),
    ]

    const result = await alertPopup.show({
      title: "New Note in Folder",
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
        folderId: data.id,
        path: "",
        title: result.value.trim(),
      })
    }
  }

  const handleCreateFolder = async () => {
    const siblingNames = [
      ...notes.filter((n) => n.folderId === data.id).map((n) => n.title),
      ...folders.filter((f) => f.parentId === data.id).map((f) => f.name),
    ]

    const result = await alertPopup.show({
      title: "New Folder in Folder",
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
        parentId: data.id,
        name: result.value.trim(),
      })
    }
  }

  const handleRename = async () => {
    const siblingNames = [
      ...notes.filter((n) => n.folderId === data.parentId).map((n) => n.title),
      ...folders.filter((f) => f.parentId === data.parentId && f.id !== data.id).map((f) => f.name),
    ]

    const result = await alertPopup.show({
      title: "Rename Folder",
      customFooter: true,
      customElement: <PromptDialog />,
      passData: {
        label: "New Folder Name",
        defaultValue: data.name,
        placeholder: "Enter new folder name...",
        existingNames: siblingNames,
      },
    })

    if (result.response && result.value) {
      updateFolder(data.id, { name: result.value.trim() })
      toast.success("Folder renamed successfully")
    }
  }

  const handleDelete = async () => {
    const confirm = await alertPopup.delete({
      title: "Delete Folder",
      description: `Are you sure you want to delete folder "${data.name}" and all its contents recursively? This action cannot be undone.`,
    })

    if (confirm.response) {
      deleteFolder(data.id)
      toast.success("Folder and its contents deleted")
    }
  }

  const handleMove = async () => {
    // Folder select excluding current folder and its subfolders to prevent cycles
    const isDescendant = (folderId: string, parentToCheckId: string): boolean => {
      let current = folders.find((f) => f.id === folderId)
      while (current) {
        if (current.parentId === parentToCheckId) return true
        current = current.parentId ? folders.find((f) => f.id === current?.parentId) : undefined
      }
      return false
    }

    const validFolders = folders.filter(
      (f) => f.id !== data.id && !isDescendant(f.id, data.id)
    )

    const result = await alertPopup.show({
      title: "Move Folder",
      customFooter: true,
      customElement: <FolderSelectDialog />,
      passData: {
        folders: validFolders,
        currentFolderId: data.parentId,
      },
    })

    if (result.response && result.folderId !== undefined) {
      const targetFolderId = result.folderId
      if (targetFolderId === data.parentId) return

      // Validate name collision in target folder
      const targetSiblingNames = [
        ...notes.filter((n) => n.folderId === targetFolderId).map((n) => n.title),
        ...folders.filter((f) => f.parentId === targetFolderId).map((f) => f.name),
      ]

      const hasCollision = targetSiblingNames
        .map((n) => n.toLowerCase())
        .includes(data.name.toLowerCase())

      if (hasCollision) {
        toast.error(`A file or folder named "${data.name}" already exists in the target folder.`)
        return
      }

      updateFolder(data.id, { parentId: targetFolderId })
      toast.success("Folder moved successfully")
    }
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuGroup>
          <ContextMenuItem onClick={handleCreateNote}>
            New note
          </ContextMenuItem>
          <ContextMenuItem onClick={handleCreateFolder}>
            New Folder
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem disabled>
            Duplicate
          </ContextMenuItem>
          <ContextMenuItem onClick={handleMove}>
            Move folder to...
          </ContextMenuItem>
          <ContextMenuItem disabled>
            Change icon
          </ContextMenuItem>
          <ContextMenuItem disabled>
            Check folder stats
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleRename}>
            Rename
          </ContextMenuItem>
          <ContextMenuItem variant="destructive" onClick={handleDelete}>
            Delete
          </ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  )
}
