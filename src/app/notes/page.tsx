"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { listNotes, Note } from "@/services/notes-services";

export default function NotesPage() {
    const [notes, setNotes] = useState<Note[] | null>(null);

    useEffect(() => {
        listNotes().then(setNotes);
    }, []);

    return (
        <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-head text-2xl">Notes</h1>
        <Button render={<Link href="/notes/new" />}>New note</Button>
      </div>

      {notes?.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No notes yet</EmptyTitle>
            <EmptyDescription>Create your first note to get started.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      <div className="flex flex-col gap-3">
        {notes?.map((note) => (
          <Link key={note.id} href={`/notes/${note.id}`}>
            <Card className="[--card-spacing:--spacing(4)] hover:translate-y-1 hover:shadow transition duration-200">
              <CardHeader>
                <CardTitle>{note.title || "Untitled"}</CardTitle>
              </CardHeader>
              <CardContent className="line-clamp-2 text-sm text-muted-foreground">
                {note.content}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
    )
}