"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { createNote } from "@/services/notes-services";

export default function NewNotePage() {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        const note = await createNote(title, content);
        router.push(`/notes/${note.id}`);
    }

    return (
    <main className="mx-auto w-full max-w-2xl p-8">
      <Card>
        <CardHeader>
          <CardTitle>New note</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content">Content (Markdown)</Label>
              <Textarea id="content" rows={12} value={content} onChange={(e) => setContent(e.target.value)} />
            </div>
          </CardContent>
          <CardFooter className="gap-2">
            <Button type="submit">Save</Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}