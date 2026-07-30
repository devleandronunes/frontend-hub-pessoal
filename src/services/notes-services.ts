export type Note = {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
};

const STORAGE_KEY = "hub-pessoal:notes"

function readAll(): Note[] {
    if(typeof window === "undefined") {
        return [];
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Note[]) : [];
}

function writeAll(notes: Note[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export async function listNotes(): Promise<Note[]> {
    return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getNote(id: string): Promise<Note | null> {
    return readAll().find((note) => note.id === id) ?? null;
}

export async function createNote(title: string, content: string) : Promise<Note> {
    const note: Note = {
        id: crypto.randomUUID(),
        title,
        content,
        updatedAt: new Date().toISOString(),
    }

    writeAll([...readAll(), note]);
    return note;
}

export async function updateNote(id: string, title: string, content: string): Promise<Note> {
    const notes = readAll();
    const index = notes.findIndex((note) => note.id === id);
    if (index === -1) {
        throw new Error("Note not found.");
    }

    const updated: Note = { ...notes[index], title, content, updatedAt: new Date().toISOString() };
    notes[index] = updated;
    writeAll(notes);
    return updated;
}

export async function deleteNote(id: string): Promise<void> {
    writeAll(readAll().filter((note) => note.id !== id));
}