"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "cn"

export function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()
  const links = [
    { href: "/tickets", label: "Tickets" },
    ...(isAdmin ? [{ href: "/users", label: "Users" }] : []),
  ]

  return (
    <nav className="flex items-center gap-1">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            pathname.startsWith(link.href) &&
              "bg-muted font-medium text-foreground",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  )
}
