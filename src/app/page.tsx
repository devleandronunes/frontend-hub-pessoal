"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getHealth } from "@/services/health-service";
import { getMe } from "@/services/auth-service";
import { getToken, clearToken } from "@/lib/auth-token";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
        <p>Verificando sessão...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Hub Pessoal</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p>Bem-vindo, {username}</p>
          {status === "loading" && (
            <p>Verificando a API... (pode demorar no 1º acesso)</p>
          )}
          {status === "ok" && (
            <Alert>
              <AlertDescription>API online: {detail}</AlertDescription>
            </Alert>
          )}
          {status === "error" && (
            <Alert variant="destructive">
              <AlertDescription>Falha ao contatar a API: {detail}</AlertDescription>
            </Alert>
          )}
          <Button onClick={handleLogout} variant="outline">
            Sair
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}