import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "@tanstack/react-router";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useFileStore } from "@/hooks/use-file-store";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { useIsMobile } from "@/hooks/use-mobile";
import FileTree from "./components/file-tree";
import EditorToolbar from "./components/editor-toolbar";
import MarkdownEditor from "./components/markdown-editor";
import MarkdownPreview from "./components/markdown-preview";
import ImageViewer from "./components/image-viewer";
import VideoViewer from "./components/video-viewer";
import BinaryFileInfo from "./components/binary-file-info";
import SyncStatus from "./components/sync-status";
import MobileTabBar, { type MobileTab } from "./components/mobile-tab-bar";

const DEBOUNCE_MS = 800;

export default function AppPage() {
  const params = useParams({ strict: false }) as { "*"?: string };
  const activePath = params["*"] ?? null;

  const { nodes, loadFromDB, updateContent, setActiveFile, activeFileId, activeContent } =
    useFileStore();
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<MobileTab>("tree");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useWakeLock();

  useEffect(() => {
    loadFromDB();
  }, [loadFromDB]);

  useEffect(() => {
    if (activePath && activePath !== activeFileId) {
      setActiveFile(activePath);
    }
  }, [activePath, activeFileId, setActiveFile]);

  const handleContentChange = useCallback(
    (text: string) => {
      if (!activeFileId) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateContent(activeFileId, text);
      }, DEBOUNCE_MS);
    },
    [activeFileId, updateContent]
  );

  const activeNode = nodes.find((n) => n.path === activeFileId);
  const mime = activeNode?.mimeType ?? "text/markdown";
  const isText = mime.startsWith("text/") || mime === "application/json";
  const isImage = mime.startsWith("image/");
  const isVideo = mime.startsWith("video/");

  function renderMainContent() {
    if (!activeNode) {
      return (
        <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
          Select or create a file to start editing
        </div>
      );
    }
    if (isImage) return <ImageViewer path={activeNode.path} />;
    if (isVideo) return <VideoViewer path={activeNode.path} />;
    if (!isText) return <BinaryFileInfo node={activeNode} />;
    return null; // handled by split pane below
  }

  const nonTextContent = renderMainContent();

  // Mobile layout
  if (isMobile) {
    return (
      <div className="flex h-svh flex-col" data-cy="app-page">
        <EditorToolbar activeFileId={activeFileId} onInsert={() => {}} />
        <div className="flex-1 overflow-hidden">
          {mobileTab === "tree" && (
            <div className="h-full">
              <FileTree activeFileId={activeFileId} />
              <SyncStatus />
            </div>
          )}
          {mobileTab === "editor" && (
            <div className="h-full overflow-auto">
              {nonTextContent ?? (
                <MarkdownEditor
                  content={activeContent}
                  onChange={handleContentChange}
                />
              )}
            </div>
          )}
          {mobileTab === "preview" && isText && (
            <MarkdownPreview content={activeContent} />
          )}
          {mobileTab === "preview" && !isText && nonTextContent}
        </div>
        <MobileTabBar active={mobileTab} onChange={setMobileTab} />
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="flex h-svh w-full flex-col" data-cy="app-page">
      <EditorToolbar activeFileId={activeFileId} onInsert={() => {}} />
      <ResizablePanelGroup orientation="horizontal" className="flex-1 overflow-hidden">
        {/* File tree panel */}
        <ResizablePanel defaultSize="20%" minSize="12%" maxSize="40%">
          <div className="flex h-full flex-col border-r">
            <div className="flex-1 overflow-hidden">
              <FileTree activeFileId={activeFileId} />
            </div>
            <SyncStatus />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Editor panel */}
        <ResizablePanel defaultSize={nonTextContent ? "80%" : "40%"} minSize="20%">
          <div className="h-full overflow-auto border-r">
            {nonTextContent ?? (
              <MarkdownEditor
                content={activeContent}
                onChange={handleContentChange}
              />
            )}
          </div>
        </ResizablePanel>

        {/* Preview panel — only for text files */}
        {isText && activeNode && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize="40%" minSize="15%">
              <MarkdownPreview content={activeContent} />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
