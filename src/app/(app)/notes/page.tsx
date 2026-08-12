import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { FileTextIcon } from "lucide-react";

export default function NotesPage() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileTextIcon />
          </EmptyMedia>
          <EmptyTitle>No note selected</EmptyTitle>
          <EmptyDescription>Pick a note from the tree, or create a new one.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
