/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from "react"
import { db, collection, onSnapshot } from "@/lib/firebase"
import { ArrowDownCircle, ArrowUpCircle, ShoppingBag } from "lucide-react"
import { format } from "date-fns"
import { AddExpenseDialog } from "@/components/expenses/AddExpenseDialog"

export function TransactionsClient() {
  const [transactions, setTransactions] = useState<any[]>([])

  useEffect(() => {
    // Subscribe to transactions collection, sorted by timestamp or date descending
    const unsub = onSnapshot(collection(db, 'transactions'), (snap: any) => {
      const txs: any[] = []
      snap.forEach((d: any) => {
        txs.push({ id: d.id, ...d.data() })
      })
      // Sort by date/timestamp descending
      txs.sort((a, b) => {
        const timeA = a.timestamp ? (typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp.seconds * 1000) : 0
        const timeB = b.timestamp ? (typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp.seconds * 1000) : 0
        if (timeA !== timeB) return timeB - timeA
        return b.date.localeCompare(a.date)
      })
      setTransactions(txs)
    })

    return () => unsub()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Transactions</h2>
          <p className="text-muted-foreground">Detailed history of your wallet activity in real-time.</p>
        </div>
        <AddExpenseDialog />
      </div>

      <div className="space-y-4">
        {transactions.map((t: any) => {
          const Icon = t.amount < 0 ? ArrowDownCircle : ArrowUpCircle
          const color = t.amount < 0 ? "text-destructive" : "text-emerald-500"
          const dateVal = t.timestamp ? (typeof t.timestamp === 'string' ? new Date(t.timestamp) : new Date(t.timestamp.seconds * 1000)) : new Date(t.date)

          return (
            <div key={t.id} className="flex items-center justify-between p-4 bg-card/50 rounded-xl border border-border/50">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full bg-background`}>
                  {t.type === 'expense' ? <ShoppingBag className="h-5 w-5 text-amber-500" /> : <Icon className={`h-5 w-5 ${color}`} />}
                </div>
                <div>
                  <p className="font-medium">{t.note}</p>
                  <p className="text-xs text-muted-foreground">{format(dateVal, "PPP p")}</p>
                </div>
              </div>
              <div className={`font-bold ${color}`}>
                {t.amount < 0 ? '-' : '+'} RM {Math.abs(t.amount).toFixed(2)}
              </div>
            </div>
          )
        })}
        {transactions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No transactions found.
          </div>
        )}
      </div>
    </div>
  )
}
