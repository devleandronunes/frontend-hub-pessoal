"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { getSyncStatus, type SyncStatus } from "@/services/sync-service";

type SyncContextValue = {
  status: SyncStatus | null;
  loading: boolean;
  justSynced: boolean;
  refreshStatus: (options?: { justSynced?: boolean }) => Promise<void>;
};

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [justSynced, setJustSynced] = useState(false);

  const refreshStatus = useCallback(async (options?: { justSynced?: boolean }) => {
    if (options?.justSynced) {
      setJustSynced(true);
    }

    const data = await getSyncStatus();
    setStatus(data);
  }, []);

  useEffect(() => {
    getSyncStatus()
      .then((data) => setStatus(data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!justSynced) {
      return;
    }

    const timeout = setTimeout(() => setJustSynced(false), 4000);
    return () => clearTimeout(timeout);
  }, [justSynced]);

  return (
    <SyncContext.Provider value={{ status, loading, justSynced, refreshStatus }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSync must be used inside SyncProvider");
  }

  return context;
}
