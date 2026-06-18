"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderKanban, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: fd.get("email") }),
    });
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 gap-2">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <FolderKanban className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Glemt passord</h1>
          <p className="text-sm text-muted-foreground">Vi sender deg en lenke for å nullstille passordet</p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          {sent ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-foreground font-medium">Sjekk innboksen din</p>
              <p className="text-sm text-muted-foreground">
                Hvis e-postadressen er registrert, har du mottatt en lenke. Lenken er gyldig i 1 time.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-post</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send tilbakestillingslenke
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          <Link href="/login" className="hover:text-foreground transition-colors">
            Tilbake til innlogging
          </Link>
        </p>
      </div>
    </div>
  );
}
