import { Download, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBlob } from "@/lib/idb-fs";
import type { FileNode } from "@/lib/idb-fs";

type Props = { node: FileNode };

function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function BinaryFileInfo({ node }: Props) {
  async function download() {
    const blob = await getBlob(node.path);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = node.name;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground"
      data-cy="binary-file-info"
    >
      <File className="h-16 w-16" />
      <p className="text-lg font-medium text-foreground">{node.name}</p>
      <p className="text-sm">{formatBytes(node.size)}</p>
      {node.mimeType && <p className="text-xs">{node.mimeType}</p>}
      <Button variant="outline" size="sm" onClick={download}>
        <Download className="mr-2 h-4 w-4" />
        Download
      </Button>
    </div>
  );
}
