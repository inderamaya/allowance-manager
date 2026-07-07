import { Sidebar, MobileNav } from "@/components/layout/Navbar"
import { Toaster } from "@/components/ui/toaster"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col lg:flex lg:fixed lg:inset-y-0">
        <Sidebar />
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:pl-64 pb-20 lg:pb-0">
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Navigation */}
      <MobileNav />
      <Toaster />
    </div>
  )
}
