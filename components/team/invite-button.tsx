"use client";

import { useState } from "react";
import { UserPlus, Copy, Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InviteButton() {
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    const res = await fetch("/api/invites", { method: "POST" });
    setLoading(false);
    if (res.ok) {
      const { token } = await res.json();
      setLink(`${window.location.origin}/invite/${token}`);
    }
  }

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (link) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
        <p className="text-xs text-muted-foreground truncate flex-1 font-mono">{link}</p>
        <button
          onClick={copy}
          className="flex-shrink-0 flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-primary transition-colors"
        >
          {copied ? (
            <><Check className="h-3.5 w-3.5 text-emerald-600" />Kopiert</>
          ) : (
            <><Copy className="h-3.5 w-3.5" />Kopier</>
          )}
        </button>
        <button
          onClick={() => setLink(null)}
          className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          title="Lukk"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <Button onClick={generate} disabled={loading} variant="outline" size="sm">
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <UserPlus className="h-4 w-4 mr-2" />
      )}
      Inviter ny bruker
    </Button>
  );
}
