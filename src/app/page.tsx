"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getHealth } from "@/services/health-service";
import { getMe } from "@/services/auth-service";
import { getToken, clearToken } from "@/lib/auth-token";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";

export default function HomePage() {
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<"checking" | "ok">("checking");
  const [username, setUsername] = useState<string | null>(null);

  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }

    getMe()
      .then((data) => {
        setUsername(data.username);
        setAuthStatus("ok");
      })
      .catch(() => {
        clearToken();
        router.push("/login");
      });
  }, [router]);

  useEffect(() => {
    if (authStatus !== "ok") {
      return;
    }

    getHealth()
      .then((text) => {
        setStatus("ok");
        setDetail(text);
      })
      .catch((error) => {
        setStatus("error");
        setDetail(error.message);
      });
  }, [authStatus]);

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  if (authStatus === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p>Checking session...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <Card className="w-full max-w-sm [--card-spacing:--spacing(5)]">
        <CardHeader>
          <CardTitle>Hub Pessoal</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p>Welcome, {username}</p>
          {status === "loading" && (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Spinner />
                </EmptyMedia>
                <EmptyTitle>Checking the API</EmptyTitle>
                <EmptyDescription>This may take a while on first access.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          {status === "ok" && (
            <Alert>
              <AlertDescription>API online: {detail}</AlertDescription>
            </Alert>
          )}
          {status === "error" && (
            <Alert variant="destructive">
              <AlertDescription>Failed to reach the API: {detail}</AlertDescription>
            </Alert>
          )}
          <Button variant="outline" render={<Link href="/notes" />}>
            My notes
          </Button>
          <Button onClick={handleLogout}>
            Log out
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}