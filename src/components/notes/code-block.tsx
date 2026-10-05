"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { type ComponentProps, useEffect, useRef, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useNotesTree } from "./notes-context";

export function CodeBlock({ className, children, ...props }: ComponentProps<"pre">) {
  const { showError } = useNotesTree();
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);

  async function handleCopy() {
    const code = preRef.current?.textContent?.replace(/\n$/, "") ?? "";

    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      showError("Couldn't copy the code. Check the browser's clipboard permission.");
    }
  }

  const label = copied ? "Copied" : "Copy code";

  return (
    <div className="group relative">
      <pre ref={preRef} className={cn(className, "pr-12")} {...props}>
        {children}
      </pre>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              aria-label={label}
              onClick={handleCopy}
              className="absolute top-2 right-2 rounded border-2 border-border bg-background p-1.5 opacity-0 transition-opacity hover:bg-accent focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
            >
              {copied ? <CheckIcon className="size-4 text-primary" /> : <CopyIcon className="size-4" />}
            </button>
          }
        />
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </div>
  );
}
