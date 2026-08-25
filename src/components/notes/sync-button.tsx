"use client";

import { useState } from "react";
import { RefreshCwIcon, HistoryIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useSync } from "./sync-context";
import { useNotesTree } from "./notes-context";
import { previewSync, applySync, type SyncPlan, type SyncState } from "@/services/sync-service";
import { cn } from "@/lib/utils";

const STATE_LABEL: Record<SyncState, string> = {
  Clean: "Synced",
  LocalChanges: "Local changes",
  RemoteChanges: "Remote changes",
  Diverged: "Diverged",
};

const STATE_CLASS: Record<SyncState, string> = {
  Clean: "",
  LocalChanges: "border-yellow-900 bg-yellow-300 text-yellow-900 hover:bg-yellow-300",
  RemoteChanges: "border-red-900 bg-red-300 text-red-900 hover:bg-red-300",
  Diverged: "border-red-900 bg-red-300 text-red-900 hover:bg-red-300",
};

const JUST_SYNCED_CLASS = "border-green-900 bg-green-300 text-green-900 hover:bg-green-300";

export function SyncButton() {
  const { status, justSynced, refreshStatus } = useSync();
  const { showError } = useNotesTree();
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<SyncPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [applying, setApplying] = useState(false);

  async function loadPlan() {
    setLoadingPlan(true);
    try {
      const data = await previewSync();
      setPlan(data);
    } catch {
      showError("Couldn't reach the sync repository. Try again in a moment.");
      setOpen(false);
    } finally {
      setLoadingPlan(false);
    }
  }

  function handleOpen() {
    setOpen(true);
    setPlan(null);
    void loadPlan();
  }

  async function handleConfirm() {
    if (!plan) {
      return;
    }

    setApplying(true);
    const result = await applySync(plan.fingerprint);
    setApplying(false);

    switch (result.kind) {
      case "success":
      case "nothingToDo":
        setOpen(false);
        await refreshStatus({ justSynced: true });
        break;
      case "planExpired":
        showError("The repository changed since the preview — here's the updated plan.");
        await loadPlan();
        break;
      case "conflict":
        setOpen(false);
        showError("Conflict between the hub and the repository. Resolve it in the repository and sync again.");
        break;
      case "gitFailure":
        setOpen(false);
        showError(result.detail || "Sync failed. Try again in a moment.");
        break;
    }
  }

  const state = justSynced ? null : status?.state ?? "Clean";
  const buttonClass = justSynced ? JUST_SYNCED_CLASS : state ? STATE_CLASS[state] : "";
  const label = justSynced ? "Synced" : status ? STATE_LABEL[status.state] : "Sync";

  return (
    <>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                size="sm"
                variant="outline"
                onClick={handleOpen}
                className={cn("gap-1.5", buttonClass)}
              >
                <RefreshCwIcon className={cn("size-3.5", applying && "animate-spin")} />
                {label}
              </Button>
            }
          />
          <TooltipContent>
            {status?.state === "RemoteChanges" || status?.state === "Diverged"
              ? `${status.incomingCommits} commit(s) to pull`
              : status?.state === "LocalChanges"
                ? `${status.localChanges} file(s) to push`
                : "Repository is in sync"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Link href="/notes/history" className="rounded p-1.5 hover:bg-accent">
                <HistoryIcon className="size-4" />
              </Link>
            }
          />
          <TooltipContent>Sync history</TooltipContent>
        </Tooltip>
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sync with the notes repository</AlertDialogTitle>
            <AlertDialogDescription>
              {loadingPlan || !plan
                ? "Loading the sync plan..."
                : plan.state === "Clean"
                  ? "Nothing to sync."
                  : `${plan.filesChanged} file(s), +${plan.insertions}/-${plan.deletions} lines.`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {plan && !loadingPlan && (
            <div className="max-h-64 space-y-3 overflow-y-auto text-sm">
              <div>
                <p className="mb-1 font-medium">Commands</p>
                <pre className="rounded border-2 bg-muted p-2 text-xs whitespace-pre-wrap">
                  {plan.commands.join("\n")}
                </pre>
              </div>

              {plan.commitMessage && (
                <div>
                  <p className="mb-1 font-medium">Commit message</p>
                  <pre className="rounded border-2 bg-muted p-2 text-xs whitespace-pre-wrap">
                    {plan.commitMessage}
                  </pre>
                </div>
              )}

              {plan.changes.length > 0 && (
                <div>
                  <p className="mb-1 font-medium">Files</p>
                  <ul className="space-y-0.5">
                    {plan.changes.map((change) => (
                      <li key={change.path} className="flex justify-between gap-2 text-xs">
                        <span className="truncate">{change.path}</span>
                        <span className="shrink-0 text-muted-foreground">
                          {change.changeType} +{change.insertions}/-{change.deletions}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={applying}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={loadingPlan || applying || !plan || plan.state === "Clean"}
            >
              {applying ? "Syncing..." : "Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
