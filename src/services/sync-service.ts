import { getToken } from "@/lib/auth-token";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export type SyncState = "Clean" | "LocalChanges" | "RemoteChanges" | "Diverged";

export type SyncStatus = {
  state: SyncState;
  localChanges: number;
  incomingCommits: number;
};

export type SyncFileChange = {
  path: string;
  changeType: "Added" | "Modified" | "Deleted" | "Renamed";
  insertions: number;
  deletions: number;
};

export type SyncPlan = {
  state: SyncState;
  willPull: boolean;
  willPush: boolean;
  commitMessage: string;
  commands: string[];
  changes: SyncFileChange[];
  incomingCommits: number;
  filesChanged: number;
  insertions: number;
  deletions: number;
  fingerprint: string;
};

export type SyncCommitSummary = {
  commitHash: string;
  message: string;
  committedAt: string;
  filesChanged: number;
  insertions: number;
  deletions: number;
};

export type SyncCommitDetail = SyncCommitSummary & {
  authorName: string;
  files: {
    path: string;
    changeType: string;
    noteId: string | null;
    content: string;
    insertions: number;
    deletions: number;
  }[];
};

export type ApplySyncResult =
  | { kind: "success"; commitHash: string }
  | { kind: "nothingToDo" }
  | { kind: "planExpired"; detail: string }
  | { kind: "conflict"; detail: string }
  | { kind: "gitFailure"; detail: string };

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? body?.title ?? "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export function getSyncStatus(): Promise<SyncStatus> {
  return fetch(`${API_URL}/sync/status`, { headers: authHeaders() }).then((r) => handle(r));
}

export function previewSync(): Promise<SyncPlan> {
  return fetch(`${API_URL}/sync/preview`, { method: "POST", headers: authHeaders() }).then((r) => handle(r));
}

export async function applySync(fingerprint: string): Promise<ApplySyncResult> {
  const response = await fetch(`${API_URL}/sync/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ fingerprint }),
  });

  if (response.status === 204) {
    return { kind: "nothingToDo" };
  }

  if (response.status === 409) {
    const body = await response.json().catch(() => ({ reason: "Conflict", detail: "" }));
    return body.reason === "PlanExpired"
      ? { kind: "planExpired", detail: body.detail }
      : { kind: "conflict", detail: body.detail };
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    return { kind: "gitFailure", detail: body?.detail ?? body?.title ?? "Sync failed." };
  }

  const body = await response.json();
  return { kind: "success", commitHash: body.commitHash };
}

export function getSyncHistory(): Promise<SyncCommitSummary[]> {
  return fetch(`${API_URL}/sync/history`, { headers: authHeaders() }).then((r) => handle(r));
}

export function getSyncCommit(hash: string): Promise<SyncCommitDetail> {
  return fetch(`${API_URL}/sync/history/${hash}`, { headers: authHeaders() }).then((r) => handle(r));
}
