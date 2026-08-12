"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { getTree, type NoteTreeNode } from "@/services/notes-service";

type NotesTreeContextValue = {
  tree: NoteTreeNode[];
  loading: boolean;
  refreshTree: () => Promise<void>;
  error: string | null;
  showError: (message: string) => void;
  dismissError: () => void;
};

const NotesTreeContext = createContext<NotesTreeContextValue | null>(null);

export function NotesTreeProvider({ children }: { children: ReactNode }) {
  const [tree, setTree] = useState<NoteTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshTree = useCallback(async () => {
    const data = await getTree();
    setTree(data);
  }, []);

  const showError = useCallback((message: string) => {
    setError(message);
  }, []);

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    getTree()
      .then((data) => setTree(data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!error) {
      return;
    }
    const timeout = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timeout);
  }, [error]);

  return (
    <NotesTreeContext.Provider value={{ tree, loading, refreshTree, error, showError, dismissError }}>
      {children}
    </NotesTreeContext.Provider>
  );
}

export function useNotesTree() {
  const context = useContext(NotesTreeContext);
  if (!context) {
    throw new Error("useNotesTree must be used inside NotesTreeProvider");
  }

  return context;
}
