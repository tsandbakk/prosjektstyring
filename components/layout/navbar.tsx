"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { LayoutGrid, Users, LogOut, FolderKanban, Sun, Moon, Home } from "lucide-react";
import { useTheme } from "./theme-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { NotificationBell } from "./notification-bell";

const navItems = [
  { href: "/home", label: "Hjem", icon: Home },
  { href: "/dashboard", label: "Prosjekter", icon: LayoutGrid },
  { href: "/team", label: "Team", icon: Users },
];

function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, toggle } = useTheme();

  return (
    <header className="h-14 border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-foreground">
            <FolderKanban className="h-5 w-5 text-primary" />
            <span>Prosjektstyring</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  pathname.startsWith(href)
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            onClick={toggle}
            className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title={theme === "dark" ? "Bytt til lys modus" : "Bytt til mørk modus"}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                {initials(session?.user?.name)}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium truncate">{session?.user?.name ?? "Laster..."}</p>
              <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logg ut
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
