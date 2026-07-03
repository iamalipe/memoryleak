import { Sidebar, SidebarFooter, SidebarRail } from "@/components/ui/sidebar"
import { FolderTree } from "./folder-tree"
import { SearchBarAction } from "./search-bar-action"

export const AppSidebar = () => {
  return (
    <Sidebar className="mb-10 h-[calc(100svh-2.5rem)]" variant="sidebar">
      <SearchBarAction className="mt-4" />
      <FolderTree />
      <SidebarFooter />
      <SidebarRail
        enableDrag={true} // Enable drag functionality
      />
    </Sidebar>
  )
}
