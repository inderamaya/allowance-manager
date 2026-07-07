import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import AppLayout from "@/components/layout/AppLayout"
import { RequestTransferDialog } from "@/components/transfers/RequestTransferDialog"
import { TransferList } from "@/components/transfers/TransferList"
import { ArrowLeftRight } from "lucide-react"

export default async function TransfersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: transfers } = await supabase
    .from("transfers")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ArrowLeftRight className="h-8 w-8 text-primary" />
              Mama Transfers
            </h2>
            <p className="text-muted-foreground">Manage your funds from the Mama Account.</p>
          </div>
          <RequestTransferDialog />
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">History</h3>
          <TransferList transfers={transfers || []} />
        </div>
      </div>
    </AppLayout>
  )
}
