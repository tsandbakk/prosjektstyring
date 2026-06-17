"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { CommentWithAuthor } from "@/services/commentService";

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

export function CommentThread({ projectId, projectTitle, open, onOpenChange, onCommentAdded }: Props) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/projects/${projectId}/comments`)
      .then((r) => r.json())
      .then(setComments);
    // Mark as viewed when thread opens
    if (session?.user?.id) {
      localStorage.setItem(`comments_viewed_${session.user.id}_${projectId}`, Date.now().toString());
    }
  }, [open, projectId, session?.user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || sending) return;
    setSending(true);
    const res = await fetch(`/api/projects/${projectId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    setSending(false);
    if (res.ok) {
      const comment = await res.json();
      setComments((prev) => [...prev, comment]);
      setContent("");
      onCommentAdded(comment);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-5 py-4 border-b">
          <SheetTitle className="text-base">{projectTitle}</SheetTitle>
          <p className="text-xs text-muted-foreground">{comments.length} kommentar{comments.length !== 1 ? "er" : ""}</p>
        </SheetHeader>

        {/* Comments */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {comments.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <p className="text-sm text-muted-foreground">Ingen kommentarer ennå</p>
              <p className="text-xs text-muted-foreground">Skriv den første nedenfor</p>
            </div>
          )}
          {comments.map((c) => {
            const isMe = c.userId === session?.user?.id;
            return (
              <div key={c.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-medium flex-shrink-0">
                  {initials(c.author.name)}
                </div>
                <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                  <div className={`flex items-baseline gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                    <span className="text-xs font-medium">{isMe ? "Deg" : c.author.name}</span>
                    <span className="text-[10px] text-muted-foreground">{timeAgo(c.createdAt)}</span>
                  </div>
                  <div className={`px-3 py-2 rounded-xl text-sm leading-relaxed ${
                    isMe
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted rounded-tl-sm"
                  }`}>
                    {c.content}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="px-5 py-4 border-t flex gap-2 items-end">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Skriv en kommentar… (Enter for å sende)"
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
