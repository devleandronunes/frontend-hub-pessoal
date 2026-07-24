"use client";

import { getHealth } from "@/services/health-service";
import { useEffect, useState } from "react";

export default function HomePage() {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    getHealth()
      .then((text) => {
        setStatus("ok")
        setDetail(text);
      })
      .catch((error) => {
        setStatus("error");
        setDetail(error.message);
      });
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold">
        Hub Pessoal
      </h1>
      {status === "loading" && (
        <p>Verificando a API... (pode demorar no 1º acesso)</p>
      )}
      {status === "ok" && (
        <p className="rounded bg-green-100 px-4 py-2 text-green-800">
          API online: {detail}
        </p>
      )}
      {status === "error" && (
        <p className="rounded bg-red-100 px-4 py-2 text-red-800">
          Falha ao contatar a API: {detail}
        </p>
      )}
    </main>
  )
}