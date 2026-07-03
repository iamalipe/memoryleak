import { Cloud, CloudOff, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSync } from "@/hooks/use-sync";
import { cn } from "@/lib/utils";

function timeAgo(ts: number | null): string {
  if (!ts) return "";
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function SyncStatus() {
  const { status, lastSyncedAt, connect, disconnect } = useSync();

  if (status === "disconnected" || status === "idle") {
    return (
      <div className="px-3 py-2" data-cy="sync-status">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={connect}
          data-cy="connect-drive-btn"
        >
          <Cloud className="mr-2 h-3 w-3" />
          Connect Google Drive
        </Button>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground"
      data-cy="sync-status"
    >
      {status === "syncing" && (
        <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
      )}
      {status === "connected" && (
        <Cloud className="h-3 w-3 text-green-500" />
      )}
      {status === "error" && (
        <AlertCircle className="h-3 w-3 text-destructive" />
      )}

      <span className={cn("flex-1 truncate")}>
        {status === "syncing" && "Syncing…"}
        {status === "connected" &&
          `Synced${lastSyncedAt ? ` · ${timeAgo(lastSyncedAt)}` : ""}`}
        {status === "error" && "Sync error"}
      </span>

      {status === "error" && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={connect}
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      )}
      {status === "connected" && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={disconnect}
        >
          <CloudOff className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
