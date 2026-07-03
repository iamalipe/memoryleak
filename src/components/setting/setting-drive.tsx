import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { useSync } from "@/hooks/use-sync"
import {
  Cloud,
  CloudOff,
  Loader2,
  RefreshCw,
  AlertCircle,
  LogOut,
} from "lucide-react"
import { useState, forwardRef, useImperativeHandle, useRef } from "react"
import { Link } from "@tanstack/react-router"
import { getRootFolderName, setRootFolderName, findFolder, renameFolder } from "@/lib/sync/google-drive-adapter"
import alertPopup from "@/alert-popup/alert-popup"
import { AlertDialogFooter } from "@/components/ui/alert-dialog"
import { toast } from "sonner"

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return "Just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

interface FolderChangeDialogProps {
  onConfirm?: () => void
  onCancel?: () => void
  passData?: {
    currentName: string
    newName: string
  }
}

export const FolderChangeDialog = forwardRef<any, FolderChangeDialogProps>((props, ref) => {
  const currentName = props.passData?.currentName || ""
  const newName = props.passData?.newName || ""
  const selectedActionRef = useRef<"move" | "fresh" | null>(null)

  useImperativeHandle(ref, () => ({
    getValues: () => ({ action: selectedActionRef.current }),
  }))

  return (
    <div className="space-y-4 py-2 text-left">
      <p className="text-sm text-muted-foreground leading-relaxed">
        You are changing the Google Drive sync folder name from{" "}
        <span className="font-semibold text-foreground">"{currentName}"</span> to{" "}
        <span className="font-semibold text-foreground">"{newName}"</span>.
      </p>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Would you like to move all existing data from your current folder to the new folder on Google Drive, or start fresh with an empty folder?
      </p>

      <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={props.onCancel}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            selectedActionRef.current = "fresh"
            if (props.onConfirm) props.onConfirm()
          }}
        >
          Start Fresh
        </Button>
        <Button
          type="button"
          onClick={() => {
            selectedActionRef.current = "move"
            if (props.onConfirm) props.onConfirm()
          }}
        >
          Yes, Move My Data
        </Button>
      </AlertDialogFooter>
    </div>
  )
})
FolderChangeDialog.displayName = "FolderChangeDialog"

export const SettingDrive = () => {
  const {
    status,
    lastSyncedAt,
    progress,
    isSyncing,
    isConnected,
    connect,
    disconnect,
    syncNow,
  } = useSync()

  const currentFolderName = getRootFolderName()
  const [folderName, setFolderName] = useState(currentFolderName)
  const [isChangingFolder, setIsChangingFolder] = useState(false)

  const handleFolderChange = async () => {
    const newName = folderName.trim()
    if (!newName || newName === currentFolderName) return

    setIsChangingFolder(true)
    try {
      if (isConnected) {
        const oldFolderId = await findFolder(currentFolderName)

        if (oldFolderId) {
          const result = await alertPopup.show({
            title: "Folder Change Option",
            customFooter: true,
            customElement: <FolderChangeDialog />,
            passData: {
              currentName: currentFolderName,
              newName: newName,
            },
          })

          if (result.response && result.action) {
            if (result.action === "move") {
              await renameFolder(oldFolderId, newName)
              setRootFolderName(newName)
              toast.success(`Google Drive folder renamed to "${newName}".`)
            } else if (result.action === "fresh") {
              setRootFolderName(newName)
              toast.success(`Sync folder path changed to "${newName}".`)
            }
          } else {
            setFolderName(currentFolderName)
          }
        } else {
          setRootFolderName(newName)
          toast.success(`Sync folder path changed to "${newName}".`)
        }
      } else {
        setRootFolderName(newName)
        toast.success(`Sync folder path changed to "${newName}".`)
      }
    } catch (err: any) {
      console.error(err)
      toast.error(`Failed to change folder: ${err.message || err}`)
      setFolderName(currentFolderName)
    } finally {
      setIsChangingFolder(false)
    }
  }

  const statusConfig = {
    connected: {
      icon: <Cloud className="h-4 w-4 text-emerald-500" />,
      label: "Connected",
      variant: "default" as const,
      color: "text-emerald-500",
    },
    syncing: {
      icon: <Loader2 className="h-4 w-4 animate-spin text-blue-500" />,
      label: "Syncing...",
      variant: "secondary" as const,
      color: "text-blue-500",
    },
    error: {
      icon: <AlertCircle className="h-4 w-4 text-destructive" />,
      label: "Error",
      variant: "destructive" as const,
      color: "text-destructive",
    },
    disconnected: {
      icon: <CloudOff className="h-4 w-4 text-muted-foreground" />,
      label: "Disconnected",
      variant: "secondary" as const,
      color: "text-muted-foreground",
    },
    idle: {
      icon: <Cloud className="h-4 w-4 text-muted-foreground" />,
      label: "Idle",
      variant: "secondary" as const,
      color: "text-muted-foreground",
    },
  }

  const current = statusConfig[status] ?? statusConfig.disconnected

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">Google Drive Sync</h3>
          <p className="text-xs text-muted-foreground">
            Sync your notes and files to Google Drive
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-3">
          <div className="flex items-center gap-2">
            {current.icon}
            <div>
              <Badge variant={current.variant}>{current.label}</Badge>
              {lastSyncedAt && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Last synced: {formatRelativeTime(lastSyncedAt)}
                </p>
              )}
            </div>
          </div>

          {!isConnected ? (
            <Button variant="outline" size="sm" onClick={connect} className="w-full sm:w-auto">
              <Cloud className="mr-1.5 h-3.5 w-3.5" />
              Connect
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={disconnect}
              className="w-full sm:w-auto text-muted-foreground hover:text-destructive justify-center"
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
              Disconnect
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {/* Sync Action */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">Manual Sync</h3>
          <p className="text-xs text-muted-foreground">
            Push local changes and pull remote updates
          </p>
        </div>

        <Button
          className="w-full"
          disabled={!isConnected || isSyncing}
          onClick={syncNow}
        >
          {isSyncing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Now
            </>
          )}
        </Button>

        {/* Progress */}
        {isSyncing && progress && (
          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="truncate pr-2">{progress.phase}</span>
              {progress.total > 0 && (
                <span className="shrink-0">
                  {progress.current}/{progress.total}
                </span>
              )}
            </div>
            {progress.total > 0 && (
              <Progress
                value={Math.round(
                  (progress.current / progress.total) * 100
                )}
                className="h-1.5"
              />
            )}
          </div>
        )}
      </div>

      <Separator />

      {/* Sync Folder Name Configuration */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">Sync Folder Name</h3>
          <p className="text-xs text-muted-foreground">
            The name of the folder created in your Google Drive
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Folder name"
            disabled={isSyncing || isChangingFolder}
            className="flex-1"
          />
          <Button
            variant="outline"
            disabled={isSyncing || isChangingFolder || !folderName.trim() || folderName.trim() === currentFolderName}
            onClick={handleFolderChange}
            className="w-full sm:w-auto"
          >
            {isChangingFolder ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Changing...
              </>
            ) : (
              "Change"
            )}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Info */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">How it works</h3>
        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground leading-relaxed">
          <p>
            Your notes and files are synced to a{" "}
            <span className="font-medium text-foreground">MemoryLeak</span>{" "}
            folder in your Google Drive. The folder mirrors your local file tree.
          </p>
          <p className="mt-2">
            A <code className="rounded bg-muted px-1 font-mono">config.json</code>{" "}
            saves your settings and{" "}
            <code className="rounded bg-muted px-1 font-mono">db.json</code>{" "}
            tracks the sync index.
          </p>
          <div className="mt-4 flex items-center justify-center gap-4 border-t pt-3 text-[10px] text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground hover:underline">
              Privacy Policy
            </Link>
            <span>&bull;</span>
            <Link to="/terms" className="hover:text-foreground hover:underline">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
