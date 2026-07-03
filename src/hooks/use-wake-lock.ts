import { useEffect, useRef } from "react";

export function useWakeLock() {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  async function requestLock() {
    if (!("wakeLock" in navigator)) return;
    try {
      lockRef.current = await navigator.wakeLock.request("screen");
    } catch {
      // Silently ignore — device may deny the request
    }
  }

  useEffect(() => {
    requestLock();

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        requestLock();
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      lockRef.current?.release();
    };
  }, []);
}
