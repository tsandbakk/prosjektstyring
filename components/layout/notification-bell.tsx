"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

type Notification = {
  id: string;
  type: string;
  message: string;
  projectId: string | null;
  read: boolean;
  createdAt: string;
};

function playPling() {
  try {
    const ctx = new AudioContext();
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
    ctx.close();
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
    const newIds = newUnread.map((n) => n.id);
    const hasNew = newIds.some((id) => !prevUnreadIds.current.has(id));
    if (hasNew && prevUnreadIds.current.size > 0) playPling();
    prevUnreadIds.current = new Set(newIds);
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleOpen() {
    setOpen((v) => !v);
    if (!open) {
      await fetch("/api/notifications", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      prevUnreadIds.current = new Set();
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center h-8 w-8 rounded-lg hover:bg-accent transition-colors"
        aria-label="Varsler"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground flex items-center justify-center leading-none">
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
            <ul className="max-h-80 overflow-y-auto divide-y">
              {notifications.map((n) => (
                <li key={n.id}>
                  {n.projectId ? (
                    <Link
                      href={`/dashboard?project=${n.projectId}`}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex flex-col gap-0.5 px-4 py-3 hover:bg-accent transition-colors text-left w-full",
                        !n.read && "bg-primary/5"
                      )}
                    >
                      <span className="text-sm">{n.message}</span>
                      <span className="text-xs text-muted-foreground">{timeAgo(n.createdAt)}</span>
                    </Link>
                  ) : (
                    <div className={cn("flex flex-col gap-0.5 px-4 py-3", !n.read && "bg-primary/5")}>
                      <span className="text-sm">{n.message}</span>
                      <span className="text-xs text-muted-foreground">{timeAgo(n.createdAt)}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
