"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { PinIcon, CopyIcon, DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useNotesTree } from "@/components/notes/notes-context";
import {
  getNote,
  updateNote,
  togglePin,
  duplicateNote,
  exportNote,
  type Note,
} from "@/services/notes-service";

type SaveStatus = "idle" | "saving" | "saved";

export default function NoteEditorPage() {
  const params = useParams<{ id: string }>();
  return <NoteEditor key={params.id} id={params.id} />;
}

function NoteEditor({ id }: { id: string }) {
  const router = useRouter();
  const { refreshTree, showError } = useNotesTree();

  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"preview" | "editor">("preview");
  const [content, setContent] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getNote(id)
      .then((data) => {
        setNote(data);
        setContent(data.content);
      })
      .finally(() => setLoading(false));
  }, [id]);

  function handleContentChange(value: string) {
    setContent(value);
    setSaveStatus("saving");

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      if (!note) {
        return;
      }

      try {
        const updated = await updateNote(note.id, note.title, value, note.tags);
        setNote(updated);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("idle");
        showError("Couldn't save — another note with this title may already exist in this folder.");
      }
    }, 800);
  }

  async function handleTogglePin() {
    if (!note) {
      return;
    }

    const updated = await togglePin(note.id);
    setNote(updated);
    await refreshTree();
  }

  async function handleDuplicate() {
    if (!note) {
      return;
    }

    const copy = await duplicateNote(note.id);
    await refreshTree();
    router.push(`/notes/${copy.id}`);
  }

  async function handleExport() {
    if (!note) {
      return;
    }

    await exportNote(note.id, note.title);
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!note) {
    return <div className="p-6 text-sm text-muted-foreground">Note not found.</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b-2 border-border p-2">
        <div className="flex items-center gap-1">
          <Button size="sm" variant={mode === "preview" ? "default" : "outline"} onClick={() => setMode("preview")}>
            Preview
          </Button>
          <Button size="sm" variant={mode === "editor" ? "default" : "outline"} onClick={() => setMode("editor")}>
            Editor
          </Button>
          <span className="ml-2 text-xs text-muted-foreground">
            {saveStatus === "saving" && "Saving..."}
            {saveStatus === "saved" && "Saved"}
          </span>
        </div>

        <div className="flex gap-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button size="icon-sm" variant="ghost" onClick={handleTogglePin}>
                  <PinIcon className={note.isPinned ? "fill-primary text-primary" : ""} />
                </Button>
              }
            />
            <TooltipContent>{note.isPinned ? "Unpin" : "Pin"}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button size="icon-sm" variant="ghost" onClick={handleDuplicate}>
                  <CopyIcon />
                </Button>
              }
            />
            <TooltipContent>Duplicate</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button size="icon-sm" variant="ghost" onClick={handleExport}>
                  <DownloadIcon />
                </Button>
              }
            />
            <TooltipContent>Export .md</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {mode === "editor" ? (
          <Textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            className="min-h-full font-mono"
            placeholder="Write markdown..."
          />
        ) : (
          <div className="prose max-w-none">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
