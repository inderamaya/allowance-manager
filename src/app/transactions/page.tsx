import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import AppLayout from "@/components/layout/AppLayout"
import { AddExpenseDialog } from "@/components/expenses/AddExpenseDialog"
import { format } from "date-fns"
import { ReceiptText, ArrowUpCircle, ArrowDownCircle, Wallet } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

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
            <p className="text-muted-foreground">Complete history of your money flow.</p>
          </div>
          <AddExpenseDialog />
        </div>

        <div className="space-y-4">
          {transactions?.map((t) => {
            const Icon = t.amount < 0 ? ArrowDownCircle : ArrowUpCircle
            const color = t.amount < 0 ? "text-destructive" : "text-emerald-500"

            return (
              <Card key={t.id} className="border-none bg-card/50 hover:bg-card transition-colors">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className={`rounded-full p-2 bg-background`}>
                      {t.type === 'expense' ? (
                        <ReceiptText className="h-5 w-5 text-muted-foreground" />
                      ) : t.type === 'transfer' ? (
                        <Wallet className="h-5 w-5 text-primary" />
                      ) : (
                        <Icon className={`h-5 w-5 ${color}`} />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{t.description}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(t.created_at), "PPP p")}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${color}`}>
                      {t.amount > 0 ? "+" : ""}{t.amount.toFixed(2)}
                    </p>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest mt-1">
                      {t.type}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {(!transactions || transactions.length === 0) && (
            <div className="py-20 text-center">
              <ReceiptText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
              <p className="text-muted-foreground">No transactions found.</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
