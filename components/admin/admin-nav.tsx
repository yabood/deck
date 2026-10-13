"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Deck versions", match: (p: string) => p === "/admin" || p.startsWith("/admin/versions") },
  { href: "/admin/admins", label: "Admins", match: (p: string) => p.startsWith("/admin/admins") },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 text-sm">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground",
            item.match(pathname) && "bg-muted text-foreground",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
