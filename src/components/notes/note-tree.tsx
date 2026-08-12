"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronRightIcon,
  ChevronDownIcon,
  FileTextIcon,
  FolderIcon,
  FolderPlusIcon,
  FilePlusIcon,
  Trash2Icon,
  PinIcon,
  PencilIcon,
} from "lucide-react";
import { useNotesTree } from "./notes-context";
import {
  createNote,
  createFolder,
  renameNote,
  renameFolder,
  deleteNote,
  deleteFolder,
  type NoteTreeNode,
} from "@/services/notes-service";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
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

type Creating = { parentId: string | null; type: "note" | "folder" } | null;

export function NoteTree() {
  const { tree, refreshTree, showError } = useNotesTree();
  const [creating, setCreating] = useState<Creating>(null);
  const router = useRouter();

  async function handleCreateSubmit(name: string) {
    if (!creating) {
      return;
    }

    const trimmed = name.trim();
    if (!trimmed) {
      setCreating(null);
      return;
    }

    try {
      if (creating.type === "note") {
        const note = await createNote(trimmed, creating.parentId);
        await refreshTree();
        setCreating(null);
        router.push(`/notes/${note.id}`);
      } else {
        await createFolder(trimmed, creating.parentId);
        await refreshTree();
        setCreating(null);
      }
    } catch {
      showError(
        creating.type === "note"
          ? "A note with this title already exists in this folder."
          : "A folder with this name already exists in this folder."
      );
    }
  }

  async function handleRename(id: string, type: "note" | "folder", name: string) {
    try {
      if (type === "note") {
        await renameNote(id, name);
      } else {
        await renameFolder(id, name);
      }
      await refreshTree();
    } catch {
      showError("An item with this name already exists in this folder.");
    }
  }

  async function handleDelete(id: string, type: "note" | "folder") {
    try {
      if (type === "note") {
        await deleteNote(id);
        if (window.location.pathname === `/notes/${id}`) {
          router.push("/notes");
        }
      } else {
        await deleteFolder(id);
      }
      await refreshTree();
    } catch {
      showError("This folder isn't empty — move or delete its contents first.");
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Notes</span>
        <div className="flex gap-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  onClick={() => setCreating({ parentId: null, type: "note" })}
                  className="rounded p-1 hover:bg-accent"
                >
                  <FilePlusIcon className="size-4" />
                </button>
              }
            />
            <TooltipContent>New note</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  onClick={() => setCreating({ parentId: null, type: "folder" })}
                  className="rounded p-1 hover:bg-accent"
                >
                  <FolderPlusIcon className="size-4" />
                </button>
              }
            />
            <TooltipContent>New folder</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {creating?.parentId === null && (
        <InlineInput depth={0} onSubmit={handleCreateSubmit} onCancel={() => setCreating(null)} />
      )}

      {tree.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          depth={0}
          creating={creating}
          onStartCreate={setCreating}
          onCreateSubmit={handleCreateSubmit}
          onCreateCancel={() => setCreating(null)}
          onRename={handleRename}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}

function InlineInput({
  onSubmit,
  onCancel,
  depth,
  defaultValue = "",
}: {
  onSubmit: (value: string) => void;
  onCancel: () => void;
  depth: number;
  defaultValue?: string;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          onSubmit(value);
        }
        if (e.key === "Escape") {
          onCancel();
        }
      }}
      onBlur={() => onSubmit(value)}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
      className="w-full rounded border-2 bg-input py-1 pr-2 text-sm outline-none"
    />
  );
}

function TreeNode({
  node,
  depth,
  creating,
  onStartCreate,
  onCreateSubmit,
  onCreateCancel,
  onRename,
  onDelete,
}: {
  node: NoteTreeNode;
  depth: number;
  creating: Creating;
  onStartCreate: (c: Creating) => void;
  onCreateSubmit: (name: string) => void;
  onCreateCancel: () => void;
  onRename: (id: string, type: "note" | "folder", name: string) => void;
  onDelete: (id: string, type: "note" | "folder") => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const params = useParams<{ id?: string }>();
  const isActive = node.type === "note" && params.id === node.id;

  const deleteDialog = (
    <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {node.type === "folder" ? "this folder" : "this note"}?</AlertDialogTitle>
          <AlertDialogDescription>This action can&apos;t be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              onDelete(node.id, node.type);
              setConfirmDeleteOpen(false);
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (editing) {
    return (
      <>
        <InlineInput
          depth={depth}
          defaultValue={node.name}
          onSubmit={(name) => {
            setEditing(false);
            const trimmed = name.trim();
            if (trimmed && trimmed !== node.name) {
              onRename(node.id, node.type, trimmed);
            }
          }}
          onCancel={() => setEditing(false)}
        />
        {deleteDialog}
      </>
    );
  }

  if (node.type === "folder") {
    return (
      <div>
        <ContextMenu>
          <ContextMenuTrigger
            render={
              <button
                onClick={() => setExpanded((v) => !v)}
                onDoubleClick={() => setEditing(true)}
                className={cn(
                  "flex w-full items-center gap-1 rounded py-1 pr-1 text-left text-sm hover:bg-accent"
                )}
                style={{ paddingLeft: `${depth * 16 + 4}px` }}
              />
            }
          >
            {expanded ? (
              <ChevronDownIcon className="size-3.5 shrink-0" />
            ) : (
              <ChevronRightIcon className="size-3.5 shrink-0" />
            )}
            <FolderIcon className="size-4 shrink-0" />
            <span className="truncate">{node.name}</span>
          </ContextMenuTrigger>

          <ContextMenuContent>
            <ContextMenuItem onClick={() => onStartCreate({ parentId: node.id, type: "note" })}>
              <FilePlusIcon /> New note
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onStartCreate({ parentId: node.id, type: "folder" })}>
              <FolderPlusIcon /> New folder
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => setEditing(true)}>
              <PencilIcon /> Rename
            </ContextMenuItem>
            <ContextMenuItem variant="destructive" onClick={() => setConfirmDeleteOpen(true)}>
              <Trash2Icon /> Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {deleteDialog}

        {expanded && (
          <div>
            {creating?.parentId === node.id && (
              <InlineInput depth={depth + 1} onSubmit={onCreateSubmit} onCancel={onCreateCancel} />
            )}
            {node.children.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                creating={creating}
                onStartCreate={onStartCreate}
                onCreateSubmit={onCreateSubmit}
                onCreateCancel={onCreateCancel}
                onRename={onRename}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger
          render={
            <Link
              href={`/notes/${node.id}`}
              onDoubleClick={(e) => {
                e.preventDefault();
                setEditing(true);
              }}
              className={cn(
                "flex items-center gap-1 rounded py-1 pr-1 text-sm hover:bg-accent",
                isActive && "bg-accent"
              )}
              style={{ paddingLeft: `${depth * 16 + 4}px` }}
            />
          }
        >
          <FileTextIcon className="size-4 shrink-0" />
          <span className="truncate">{node.name}</span>
          {node.isPinned && <PinIcon className="size-3 shrink-0 fill-primary text-primary" />}
        </ContextMenuTrigger>

        <ContextMenuContent>
          <ContextMenuItem onClick={() => setEditing(true)}>
            <PencilIcon /> Rename
          </ContextMenuItem>
          <ContextMenuItem variant="destructive" onClick={() => setConfirmDeleteOpen(true)}>
            <Trash2Icon /> Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {deleteDialog}
    </>
  );
}
