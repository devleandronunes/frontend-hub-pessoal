"use client";

import { useState } from "react";
import { PanelLeftCloseIcon, PanelLeftIcon, XIcon } from "lucide-react";
import { NotesTreeProvider, useNotesTree } from "@/components/notes/notes-context";
import { NoteTree } from "@/components/notes/note-tree";
import { SyncProvider } from "@/components/notes/sync-context";
import { SyncButton } from "@/components/notes/sync-button";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertAction } from "@/components/ui/alert";

export default function NotesLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <NotesTreeProvider>
      <SyncProvider>
        <TooltipProvider>
          <div className="flex h-screen">
            {sidebarOpen && (
              <aside className="w-64 shrink-0 overflow-y-auto border-r-2 border-border p-2">
                <NoteTree />
              </aside>
            )}

            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b-2 border-border p-2">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        onClick={() => setSidebarOpen((v) => !v)}
                        aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                        className="rounded p-1.5 hover:bg-accent"
                      >
                        {sidebarOpen ? (
                          <PanelLeftCloseIcon className="size-4" />
                        ) : (
                          <PanelLeftIcon className="size-4" />
                        )}
                      </button>
                    }
                  />
                  <TooltipContent>{sidebarOpen ? "Minimize sidebar" : "Show sidebar"}</TooltipContent>
                </Tooltip>

                <SyncButton />
              </div>

              <div className="flex-1 overflow-y-auto">{children}</div>
            </div>
          </div>

          <ErrorToast />
        </TooltipProvider>
      </SyncProvider>
    </NotesTreeProvider>
  );
}

function ErrorToast() {
  const { error, dismissError } = useNotesTree();

  if (!error) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-auto max-w-sm">
      <Alert status="error" className="text-xs shadow-lg">
        <AlertDescription>{error}</AlertDescription>
        <AlertAction>
          <button onClick={dismissError}>
            <XIcon className="size-3.5" />
          </button>
        </AlertAction>
      </Alert>
    </div>
  );
}
