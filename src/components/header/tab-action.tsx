import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { useNoteStore } from "@/hooks/use-note-store"

type TabContextMenuProps = {
  children?: React.ReactNode
  tabId: string
  panel: "left" | "right"
}

export function TabContextMenu({ children, tabId, panel }: TabContextMenuProps) {
  const { closeNote, closeOthers, closeLeft, closeRight, closeAll } = useNoteStore()

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuGroup>
          <ContextMenuItem onClick={() => closeNote(tabId, panel)}>
            Close
          </ContextMenuItem>
          <ContextMenuItem onClick={() => closeOthers(tabId, panel)}>
            Close others
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => closeLeft(tabId, panel)}>
            Close left
          </ContextMenuItem>
          <ContextMenuItem onClick={() => closeRight(tabId, panel)}>
            Close right
          </ContextMenuItem>
          <ContextMenuItem onClick={() => closeAll(panel)}>
            Close all
          </ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  )
}
