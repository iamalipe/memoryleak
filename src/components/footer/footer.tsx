import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useSync } from "@/hooks/use-sync"
import { Cloud, CloudOff, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import SettingDialog from "../setting/setting"
import { cn } from "@/lib/utils"
import { Link } from "@tanstack/react-router"

const SyncStatusIndicator = () => {
  const { status } = useSync()

  const config: Record<string, { icon: React.ReactNode; dot: string; title: string }> = {
    connected: {
      icon: <Cloud className="h-3.5 w-3.5 text-muted-foreground" />,
      dot: "bg-emerald-500",
      title: "Connected to Google Drive",
    },
    syncing: {
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />,
      dot: "bg-blue-500",
      title: "Syncing...",
    },
    error: {
      icon: <AlertCircle className="h-3.5 w-3.5 text-destructive" />,
      dot: "bg-destructive",
      title: "Sync error",
    },
    disconnected: {
      icon: <CloudOff className="h-3.5 w-3.5 text-muted-foreground/50" />,
      dot: "bg-muted-foreground/30",
      title: "Not connected to Drive",
    },
    idle: {
      icon: <Cloud className="h-3.5 w-3.5 text-muted-foreground/50" />,
      dot: "bg-muted-foreground/30",
      title: "Idle",
    },
  }

  const current = config[status] ?? config.disconnected

  return (
    <div
      className="flex items-center gap-1.5 px-1"
      title={current.title}
    >
      {current.icon}
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          current.dot
        )}
      />
    </div>
  )
}

const SyncButton = () => {
  const { isConnected, isSyncing, syncNow } = useSync()

  if (!isConnected) return null

  const handleSync = async () => {
    const toastId = toast.loading("Preparing...")

    // Subscribe to progress updates and pipe them into the toast
    const { subscribe } = await import("@/lib/sync/sync-manager")
    const unsub = subscribe((_status, _ts, progress) => {
      if (progress) {
        const suffix =
          progress.total > 0
            ? ` (${progress.current}/${progress.total})`
            : ""
        toast.loading(`${progress.phase}${suffix}`, { id: toastId })
      }
    })

    try {
      await syncNow()
      toast.success("Synced successfully!", { id: toastId })
    } catch {
      toast.error("Sync failed. Check your connection.", { id: toastId })
    } finally {
      unsub()
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={handleSync}
      disabled={isSyncing}
      title={isSyncing ? "Syncing..." : "Sync to Google Drive"}
    >
      <RefreshCw
        className={cn("h-4 w-4", isSyncing && "animate-spin")}
      />
    </Button>
  )
}

export const Footer = () => {
  return (
    <div className="flex h-10 flex-none items-center justify-between gap-2 border-t px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <SettingDialog />
        <SyncButton />
      </div>
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-3 border-r pr-3">
          <Link to="/privacy" className="hover:text-foreground hover:underline">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-foreground hover:underline">
            Terms
          </Link>
        </div>
        <SyncStatusIndicator />
      </div>
    </div>
  )
}
