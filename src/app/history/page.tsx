import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import AppLayout from "@/components/layout/AppLayout"
import { HistoryList } from "@/components/history/HistoryList"
import { History } from "lucide-react"

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: actionHistory } = await supabase
    .from("action_history")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  return (
    <AppLayout>
      <div className="space-y-6">
        <header className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-8 w-8 text-primary" />
            Action Log
          </h2>
          <p className="text-muted-foreground">Permanent ledger of all settings updates, transfers, and transactions.</p>
        </header>

        <div className="pt-4">
          <HistoryList history={actionHistory || []} />
        </div>
      </div>
    </AppLayout>
  )
}
