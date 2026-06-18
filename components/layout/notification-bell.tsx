"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Bell, MessageCircle, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

type Notification = {
  id: string;
  type: string;
  message: string;
  detail: string | null;
  projectId: string | null;
  read: boolean;
  createdAt: string;
};

// Shared AudioContext — unlocked on first user interaction
let sharedCtx: AudioContext | null = null;
let audioUnlocked = false;

function unlockAudio() {
  if (audioUnlocked) return;
  try {
    sharedCtx = new AudioContext();
    sharedCtx.resume().then(() => { audioUnlocked = true; });
  } catch {}
}

function playPling() {
  if (!audioUnlocked || !sharedCtx) return;
  try {
    const ctx = sharedCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch {}
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "nå nettopp";
  if (mins < 60) return `${mins} min siden`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}t siden`;
  return `${Math.floor(hours / 24)}d siden`;
}

function NotificationItem({ n, onClose }: { n: Notification; onClose: () => void }) {
  const isComment = n.type === "COMMENT_ADDED";

  const inner = (
    <div className={cn("px-4 py-3 transition-colors hover:bg-accent", !n.read && "bg-primary/5")}>
      <div className="flex items-start gap-2.5">
        <div className={cn(
          "flex-shrink-0 mt-0.5 h-6 w-6 rounded-full flex items-center justify-center",
          isComment ? "bg-primary/10" : "bg-emerald-100 dark:bg-emerald-900/30"
        )}>
          {isComment
            ? <MessageCircle className="h-3.5 w-3.5 text-primary" />
            : <UserPlus className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          }
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground leading-snug">{n.message}</p>
          {isComment && n.detail && (
            <div className="mt-1.5 rounded-lg rounded-tl-sm bg-muted px-3 py-2 border border-border/50">
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                {n.detail}
              </p>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground mt-1">{timeAgo(n.createdAt)}</p>
        </div>
      </div>
    </div>
  );

  if (n.projectId) {
    const href = n.type === "COMMENT_ADDED"
      ? `/dashboard?project=${n.projectId}&openComments=1`
      : `/dashboard?project=${n.projectId}`;
    return (
      <li className="border-b border-border/50 last:border-0">
        <Link href={href} onClick={onClose} className="block">
          {inner}
        </Link>
      </li>
    );
  }

  return <li className="border-b border-border/50 last:border-0">{inner}</li>;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const prevUnreadIds = useRef<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data: Notification[] = await res.json();
    setNotifications(data);

    const newUnread = data.filter((n) => !n.read);
    const hasNew = newUnread.some((n) => !prevUnreadIds.current.has(n.id));
    if (hasNew && prevUnreadIds.current.size > 0) {
      playPling();
      window.dispatchEvent(new CustomEvent("new-notifications"));
    }
    prevUnreadIds.current = new Set(newUnread.map((n) => n.id));
  }, []);

  useEffect(() => {
    const unlock = () => { unlockAudio(); };
    document.addEventListener("click", unlock, { once: true });
    document.addEventListener("keydown", unlock, { once: true });

    fetchNotifications();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchNotifications();
    }, 15000);

    const onVisible = () => { if (document.visibilityState === "visible") fetchNotifications(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      document.removeEventListener("click", unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleOpen() {
    const wasOpen = open;
    setOpen((v) => !v);
    if (!wasOpen) {
      await fetch("/api/notifications", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      prevUnreadIds.current = new Set();
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Update browser tab title
  useEffect(() => {
    const base = "Prosjektstyring";
    document.title = unreadCount > 0 ? `(${unreadCount}) ${base}` : base;
  }, [unreadCount]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center h-8 w-8 rounded-lg hover:bg-accent transition-colors"
        aria-label="Varsler"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 rounded-xl border bg-card shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b">
            <p className="text-sm font-medium">Varsler</p>
          </div>
          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Ingen varsler ennå
            </div>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {notifications.map((n) => (
                <NotificationItem key={n.id} n={n} onClose={() => setOpen(false)} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
