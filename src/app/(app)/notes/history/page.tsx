"use client";

import { useEffect, useState } from "react";
import { getSyncHistory, getSyncCommit, type SyncCommitSummary, type SyncCommitDetail } from "@/services/sync-service";
import { Spinner } from "@/components/ui/spinner";

export default function SyncHistoryPage() {
  const [commits, setCommits] = useState<SyncCommitSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<SyncCommitDetail | null>(null);

  useEffect(() => {
    getSyncHistory()
      .then(setCommits)
      .finally(() => setLoading(false));
  }, []);

  async function toggle(hash: string) {
    if (expanded === hash) {
      setExpanded(null);
      setDetail(null);
      return;
    }

    setExpanded(hash);
    setDetail(await getSyncCommit(hash));
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (commits.length === 0) {
    return <div className="p-6 text-sm text-muted-foreground">No commits yet.</div>;
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 font-head text-lg">Sync history</h1>

      <ul className="space-y-2">
        {commits.map((commit) => (
          <li key={commit.commitHash} className="rounded border-2 border-border">
            <button
              onClick={() => toggle(commit.commitHash)}
              className="flex w-full items-center justify-between p-3 text-left text-sm hover:bg-accent"
            >
              <div>
                <p className="font-medium">{commit.message.split("\n")[0]}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(commit.committedAt).toLocaleString()} · {commit.commitHash.slice(0, 7)}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {commit.filesChanged} file(s) +{commit.insertions}/-{commit.deletions}
              </span>
            </button>

            {expanded === commit.commitHash && detail && (
              <ul className="border-t-2 border-border p-3 text-xs">
                {detail.files.map((file) => (
                  <li key={file.path} className="flex justify-between py-0.5">
                    <span className="truncate">{file.path}</span>
                    <span className="shrink-0 text-muted-foreground">{file.changeType}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
