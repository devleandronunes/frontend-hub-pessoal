import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="flex flex-col gap-4 p-8">
      <Card className="w-full max-w-sm [--card-spacing:--spacing(5)]">
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Button render={<Link href="/notes" />}>Open</Button>
        </CardContent>
      </Card>
    </main>
  );
}
