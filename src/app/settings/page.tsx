export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import AppLayout from "@/components/layout/AppLayout"
import { SettingsForm } from "@/components/settings/SettingsForm"

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const [
    { data: settings },
    { data: walletTransactions }
  ] = await Promise.all([
    supabase.from("settings").select("*").eq("user_id", user.id).single(),
    supabase.from("wallet_transactions").select("amount, type").eq("user_id", user.id)
  ])

  const walletBalance = (walletTransactions as { amount: number; type: string }[] | null)
    ?.filter((t) => t.type !== 'savings')
    ?.reduce((acc, t) => acc + Number(t.amount), 0) || 0

  const savingsBalance = (walletTransactions as { amount: number; type: string }[] | null)
    ?.filter((t) => t.type === 'savings')
    ?.reduce((acc, t) => acc + Number(t.amount), 0) || 0

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">Manage your account and allowance settings.</p>
        </header>

        <SettingsForm
          key={`${walletBalance}-${savingsBalance}`}
          settings={settings}
          currentWalletBalance={walletBalance}
          currentSavingsBalance={savingsBalance}
        />
      </div>
    </AppLayout>
  )
}
