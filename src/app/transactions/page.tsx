import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import AppLayout from "@/components/layout/AppLayout"
import { ArrowDownCircle, ArrowUpCircle, ShoppingBag } from "lucide-react"
import { format } from "date-fns"
import { AddExpenseDialog } from "@/components/expenses/AddExpenseDialog"

export default async function TransactionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: transactions } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight">Transactions</h2>
            <p className="text-muted-foreground">Detailed history of your wallet activity.</p>
          </div>
          <AddExpenseDialog />
        </div>

        <div className="space-y-4">
          {(transactions as any[])?.map((t: any) => {
            const Icon = t.amount < 0 ? ArrowDownCircle : ArrowUpCircle
            const color = t.amount < 0 ? "text-destructive" : "text-emerald-500"

            return (
              <div key={t.id} className="flex items-center justify-between p-4 bg-card/50 rounded-xl border border-border/50">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full bg-background`}>
                    {t.type === 'expense' ? <ShoppingBag className="h-5 w-5 text-amber-500" /> : <Icon className={`h-5 w-5 ${color}`} />}
                  </div>
                  <div>
                    <p className="font-medium">{t.description}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(t.created_at), "PPP p")}</p>
                  </div>
                </div>
                <div className={`font-bold ${color}`}>
                  {t.amount < 0 ? '-' : '+'} RM {Math.abs(t.amount).toFixed(2)}
                </div>
              </div>
            )
          })}
          {(!transactions || transactions.length === 0) && (
            <div className="text-center py-12 text-muted-foreground">
              No transactions found.
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
