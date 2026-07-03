import { useEffect, useState, useCallback } from "react";
import {
  createTokenClient,
  setAccessToken,
  isGISLoaded,
} from "@/lib/sync/google-drive-adapter";
import {
  syncAll,
  disconnect as managerDisconnect,
  markConnected,
  subscribe,
  getStatus,
  type SyncProgress,
} from "@/lib/sync/sync-manager";

export type SyncStatus = "idle" | "syncing" | "error" | "connected" | "disconnected";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export function useSync() {
  const initial = getStatus();
  const [status, setStatus] = useState<SyncStatus>(initial.status);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(
    initial.lastSyncedAt
  );
  const [progress, setProgress] = useState<SyncProgress | null>(
    initial.progress
  );

  useEffect(() => {
    const unsub = subscribe((s, t, p) => {
      setStatus(s);
      setLastSyncedAt(t);
      setProgress(p);
    });
    return () => {
      unsub();
    };
  }, []);

  const connect = useCallback(async () => {
    if (!CLIENT_ID) {
      console.warn("VITE_GOOGLE_CLIENT_ID is not set");
      return;
    }
    if (!isGISLoaded()) {
      console.warn("GIS script not loaded yet");
      return;
    }
    const client = createTokenClient(
      CLIENT_ID,
      (token) => {
        setAccessToken(token);
        markConnected();
      },
      (err) => {
        console.error("GIS auth error:", err);
        setStatus("error");
      }
    );
    client?.requestAccessToken();
  }, []);

  const syncNow = useCallback(async () => {
    if (status === "syncing") return;
    try {
      await syncAll();
    } catch (err) {
      console.error("Sync failed:", err);
    }
  }, [status]);

  const disconnect = useCallback(() => {
    setAccessToken(null);
    managerDisconnect();
  }, []);

  const isSyncing = status === "syncing";
  const isConnected = status === "connected" || status === "syncing";

  return {
    status,
    lastSyncedAt,
    progress,
    isSyncing,
    isConnected,
    connect,
    disconnect,
    syncNow,
  };
}
