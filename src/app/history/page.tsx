export const dynamic = "force-dynamic"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import AppLayout from "@/components/layout/AppLayout"
import { HistoryClient } from "@/components/history/HistoryClient"
import { History } from "lucide-react"

export default async function HistoryPage() {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')

  if (!session || session.value !== 'true') {
    redirect("/login")
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <header className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-8 w-8 text-primary" />
            Action Log
          </h2>
          <p className="text-muted-foreground">Permanent ledger of all settings updates, transfers, and transactions in real-time.</p>
        </header>

        <HistoryClient />
      </div>
    </AppLayout>
  )
}
