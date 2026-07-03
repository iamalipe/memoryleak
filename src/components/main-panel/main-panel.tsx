import { EditorContainer } from "@/components/editor/editor-container"
import { TabsBar } from "@/components/header/tabs-bar"
import { useNoteStore } from "@/hooks/use-note-store"
import { cn } from "@/lib/utils"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../ui/resizable"

export const MainPanel = () => {
  const isSplit = useNoteStore((state) => state.isSplit)

  return (
    <main className="mb-10 flex flex-1 flex-col overflow-hidden">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel minSize={30} defaultSize={isSplit ? 50 : 100}>
          <MainPanelItem panel="left" />
        </ResizablePanel>
        {isSplit && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel minSize={30} defaultSize={50}>
              <MainPanelItem panel="right" />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </main>
  )
}

type MainPanelItemProps = {
  panel: "left" | "right"
}

export const MainPanelItem = ({ panel }: MainPanelItemProps) => {
  const activePanel = useNoteStore((state) => state.activePanel)
  const setActivePanel = useNoteStore((state) => state.setActivePanel)
  const activeNoteId = useNoteStore((state) =>
    panel === "left" ? state.activeNoteId : state.rightActiveNoteId
  )
  const isActive = activePanel === panel

  return (
    <div
      onClickCapture={() => setActivePanel(panel)}
      className={cn(
        "flex h-full flex-1 flex-col overflow-hidden border-r transition-colors duration-150",
        isActive
          ? "border-primary/20 bg-background"
          : "border-border/50 bg-background/90"
      )}
    >
      <TabsBar panel={panel} />
      <EditorContainer key={activeNoteId || `${panel}-empty`} panel={panel} />
    </div>
  )
}
