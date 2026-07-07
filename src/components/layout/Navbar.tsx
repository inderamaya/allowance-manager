"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, ReceiptText, PieChart, Settings, LogOut, ArrowLeftRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { signOut } from "@/app/login/actions"
import { ModeToggle } from "./ModeToggle"

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Transactions", href: "/transactions", icon: ReceiptText },
  { name: "Transfers", href: "/transfers", icon: ArrowLeftRight },
  { name: "Analytics", href: "/analytics", icon: PieChart },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col border-r bg-card/30 backdrop-blur-md">
      <div className="flex h-16 items-center px-6">
        <h1 className="text-xl font-bold tracking-tight text-primary">Allowance</h1>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                  isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="border-t p-4 space-y-4">
        <div className="flex items-center justify-between px-2">
          <span className="text-xs font-medium text-muted-foreground">Appearance</span>
          <ModeToggle />
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={() => signOut()}
        >
          <LogOut className="mr-3 h-5 w-5" />
          Log Out
        </Button>
      </div>
    </div>
  )
}

export function MobileNav() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 pb-safe-area-inset-bottom backdrop-blur-lg lg:hidden">
      <nav className="flex items-center justify-around p-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[10px] font-medium transition-all",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "fill-current")} />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
