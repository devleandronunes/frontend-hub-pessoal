"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { clearToken, getToken } from "@/lib/auth-token";
import { getMe } from "@/services/auth-service";
import { getHealth } from "@/services/health-service";
import packageJson from "../../../package.json";

type Service = { id: string; label: string; href: string };

const services: Service[] = [{ id: "notes", label: "Notes", href: "/notes" }];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authStatus, setAuthStatus] = useState<"checking" | "ok">("checking");
  const [username, setUsername] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<"loading" | "ok" | "error">("loading");

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
      .then(() => setApiStatus("ok"))
      .catch(() => setApiStatus("error"));
  }, [authStatus]);

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  if (authStatus === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Spinner className="size-8" />
      </main>
    );
  }

  const activeService = services.find((service) => pathname.startsWith(service.href));

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col justify-between border-border border-r-2 p-4">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="font-head text-lg">Personal Hub</h1>
            <p className="text-muted-foreground text-sm">Welcome, {username}</p>
          </div>

          <nav className="flex flex-col gap-1">
            {activeService ? (
              <>
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="flex items-center gap-2 py-1 text-muted-foreground text-sm hover:text-foreground"
                >
                  ← Back
                </button>
                <span className="rounded bg-accent px-3 py-2 font-medium text-sm">{activeService.label}</span>
              </>
            ) : (
              services.map((service) => (
                <Link
                  key={service.id}
                  href={service.href}
                  className="rounded px-3 py-2 font-medium text-sm hover:bg-accent"
                >
                  {service.label}
                </Link>
              ))
            )}
          </nav>
        </div>

        <div className="flex flex-col gap-1">
          <Button onClick={handleLogout} className="w-full">
            Log out
          </Button>
          <p className="text-right text-muted-foreground text-xs">
            {apiStatus === "loading" && "Checking API..."}
            {apiStatus === "ok" && "API online"}
            {apiStatus === "error" && "API offline"}
          </p>
          <p className="text-right text-muted-foreground text-xs">v{packageJson.version}</p>
        </div>
      </aside>

      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
