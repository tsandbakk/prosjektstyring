"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader2, ChevronDown, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { CommentWithAuthor } from "@/services/commentService";
import { cn } from "@/lib/utils";

type DisplayComment = CommentWithAuthor & { pending?: boolean };

interface Props {
  projectId: string;
  projectTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCommentAdded: (comment: CommentWithAuthor) => void;
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function timeAgo(date: Date | string) {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Akkurat nå";
  if (mins < 60) return `${mins}m siden`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}t siden`;
  return d.toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
}

function isSameGroup(a: DisplayComment, b: DisplayComment) {
  if (a.userId !== b.userId) return false;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() < 5 * 60 * 1000;
}

export function CommentThread({ projectId, projectTitle, open, onOpenChange, onCommentAdded }: Props) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<DisplayComment[]>([]);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [tick, setTick] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const knownIds = useRef<Set<string>>(new Set());
  const latestTimestamp = useRef<string | null>(null);

  // Re-render timestamps every minute
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  void tick;

  function isNearBottom() {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  function scrollToBottom(smooth = true) {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
  }

  // Initial load when thread opens
  useEffect(() => {
    if (!open) return;
    knownIds.current.clear();
    latestTimestamp.current = null;
    fetch(`/api/projects/${projectId}/comments`)
      .then((r) => r.json())
      .then((data: CommentWithAuthor[]) => {
        data.forEach((c) => knownIds.current.add(c.id));
        latestTimestamp.current = data.at(-1)?.createdAt?.toString() ?? null;
        setComments(data);
        setTimeout(() => scrollToBottom(false), 50);
      });
    if (session?.user?.id) {
      localStorage.setItem(`comments_viewed_${session.user.id}_${projectId}`, Date.now().toString());
    }
  }, [open, projectId, session?.user?.id]);

  // Polling for new messages from others
  const poll = useCallback(async () => {
    if (!latestTimestamp.current) return;
    const res = await fetch(
      `/api/projects/${projectId}/comments?since=${encodeURIComponent(latestTimestamp.current)}`
    );
    if (!res.ok) return;
    const data: CommentWithAuthor[] = await res.json();
    const newOnes = data.filter((c) => !knownIds.current.has(c.id));
    if (newOnes.length === 0) return;
    newOnes.forEach((c) => knownIds.current.add(c.id));
    latestTimestamp.current = newOnes.at(-1)!.createdAt.toString();
    const wasAtBottom = isNearBottom();
    setComments((prev) => [...prev, ...newOnes]);
    if (wasAtBottom) setTimeout(() => scrollToBottom(), 50);
    if (session?.user?.id) {
      localStorage.setItem(`comments_viewed_${session.user.id}_${projectId}`, Date.now().toString());
    }
  }, [projectId, session?.user?.id]);

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") poll();
    }, 5000);
    const onVisible = () => { if (document.visibilityState === "visible") poll(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [open, poll]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const userId = session?.user?.id;
    if (!content.trim() || sending || !userId) return;

    setSending(true);
    const tempId = `temp-${Date.now()}`;
    const text = content.trim();

    const optimistic: DisplayComment = {
      id: tempId,
      content: text,
      createdAt: new Date() as unknown as string & Date,
      userId,
      projectId,
      author: { id: userId, name: session!.user!.name ?? "" },
      pending: true,
    };

    knownIds.current.add(tempId);
    setComments((prev) => [...prev, optimistic]);
    setContent("");
    setTimeout(() => scrollToBottom(), 30);

    const res = await fetch(`/api/projects/${projectId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    setSending(false);

    if (res.ok) {
      const comment: CommentWithAuthor = await res.json();
      knownIds.current.delete(tempId);
      knownIds.current.add(comment.id);
      latestTimestamp.current = comment.createdAt.toString();
      setComments((prev) => prev.map((c) => (c.id === tempId ? comment : c)));
      onCommentAdded(comment);
    } else {
      knownIds.current.delete(tempId);
      setComments((prev) => prev.filter((c) => c.id !== tempId));
    }
  }

  async function handleDelete(id: string) {
    knownIds.current.delete(id);
    setComments((prev) => prev.filter((c) => c.id !== id));
    await fetch(`/api/projects/${projectId}/comments/${id}`, { method: "DELETE" });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  const realCount = comments.filter((c) => !c.pending).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-5 py-4 border-b flex-shrink-0">
          <SheetTitle className="text-base">{projectTitle}</SheetTitle>
          <p className="text-xs text-muted-foreground">
            {realCount} kommentar{realCount !== 1 ? "er" : ""}
          </p>
        </SheetHeader>

        {/* Scroll area */}
        <div className="flex-1 relative overflow-hidden">
          <div
            ref={scrollRef}
            onScroll={() => setAtBottom(isNearBottom())}
            className="h-full overflow-y-auto px-4 py-4"
          >
            {comments.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 gap-2">
                <p className="text-sm text-muted-foreground">Ingen meldinger ennå</p>
                <p className="text-xs text-muted-foreground">Skriv den første nedenfor</p>
              </div>
            )}

            <div className="space-y-0.5">
              {comments.map((c, i) => {
                const isMe = c.userId === session?.user?.id;
                const prev = comments[i - 1];
                const grouped = prev ? isSameGroup(prev, c) : false;
                return (
                  <div
                    key={c.id}
                    className={cn(
                      "flex gap-2.5 group/msg",
                      isMe ? "flex-row-reverse" : "",
                      grouped ? "mt-0.5" : "mt-3"
                    )}
                  >
                    {/* Avatar */}
                    <div className="w-7 flex-shrink-0 flex items-end pb-0.5">
                      {!grouped && !isMe && (
                        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold select-none">
                          {initials(c.author.name)}
                        </div>
                      )}
                    </div>

                    <div className={cn("max-w-[75%] flex flex-col", isMe ? "items-end" : "items-start")}>
                      {/* Name + timestamp — first in group only */}
                      {!grouped && (
                        <div className={cn("flex items-baseline gap-2 mb-0.5 px-1", isMe && "flex-row-reverse")}>
                          <span className="text-xs font-medium">{isMe ? "Deg" : c.author.name}</span>
                          <span className="text-[10px] text-muted-foreground">{timeAgo(c.createdAt)}</span>
                        </div>
                      )}

                      {/* Bubble + delete */}
                      <div className={cn("flex items-center gap-1", isMe && "flex-row-reverse")}>
                        <div
                          className={cn(
                            "px-3 py-2 rounded-2xl text-sm leading-relaxed break-words min-w-0",
                            isMe
                              ? "bg-primary text-primary-foreground rounded-tr-sm"
                              : "bg-muted rounded-tl-sm",
                            c.pending && "opacity-55"
                          )}
                        >
                          {c.content}
                        </div>
                        {isMe && !c.pending && (
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-1 rounded text-muted-foreground/40 hover:text-destructive"
                            title="Slett melding"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div ref={bottomRef} className="h-1" />
          </div>

          {/* Scroll to bottom button */}
          {!atBottom && (
            <button
              onClick={() => scrollToBottom()}
              className="absolute bottom-3 right-3 h-8 w-8 rounded-full bg-background border border-border shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="px-4 py-4 border-t flex gap-2 items-end flex-shrink-0">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Skriv en melding… (Enter for å sende)"
            rows={2}
            className="resize-none text-sm"
          />
          <Button type="submit" size="icon" disabled={!content.trim() || sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
