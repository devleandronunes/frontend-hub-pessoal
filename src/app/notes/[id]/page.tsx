"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Markdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { deleteNote, getNote, Note, updateNote } from "@/services/notes-services";

export default function NoteDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [note, setNote] = useState<Note | null | undefined>(undefined);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [tab, setTab] = useState<"edit" | "preview">("edit");

    useEffect(() => {
        getNote(id).then((found) => {
            if (!found) {
                router.push("/notes");
                return;
            }
            setNote(found);
            setTitle(found.title);
            setContent(found.content);
        });
    }, [id, router]);

    async function handleSave() {
        await updateNote(id, title, content);
        router.push("/notes")
    }

    if (note === undefined) {
        return null;
    }

    return (
    <main className="mx-auto w-full max-w-2xl p-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Edit note</CardTitle>
          <div className="flex gap-2">
            <Button variant={tab === "edit" ? "default" : "outline"} size="sm" onClick={() => setTab("edit")}>
              Edit
            </Button>
            <Button variant={tab === "preview" ? "default" : "outline"} size="sm" onClick={() => setTab("preview")}>
              Preview
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          {tab === "edit" ? (
            <Textarea rows={16} value={content} onChange={(e) => setContent(e.target.value)} />
          ) : (
            <div className="prose min-h-64 rounded border-2 p-4">
              <Markdown>{content}</Markdown>
            </div>
          )}
        </CardContent>
        <CardFooter className="gap-2">
          <Button onClick={handleSave}>Save</Button>
          <Button
            variant="destructive"
            onClick={async () => {
                await deleteNote(id);
                router.push("/notes");
            }}
          >
            Delete
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}