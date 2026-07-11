/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from "react"
import { db, collection, doc, onSnapshot } from "@/lib/firebase"
import { format, eachDayOfInterval, isSameDay, subDays } from "date-fns"
import { BalanceCard } from "@/components/dashboard/BalanceCard"
import { PiggyBank, CreditCard, Home } from "lucide-react"
import { AnalyticsCharts } from "@/components/analytics/AnalyticsCharts"

export function AnalyticsClient() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [offsets, setOffsets] = useState<any>({ wallet_offset: 0, savings_offset: 0 })

  useEffect(() => {
    // Subscribe to transactions collection
    const unsubTx = onSnapshot(collection(db, 'transactions'), (snap: any) => {
      const list: any[] = []
      snap.forEach((d: any) => {
        list.push({ id: d.id, ...d.data() })
      })
      setTransactions(list)
    })

    // Subscribe to offsets document
    const unsubOffsets = onSnapshot(doc(db, 'manual_offsets', 'offsets'), (snap: any) => {
      if (snap.exists()) {
        setOffsets(snap.data())
      }
    })

    return () => {
      unsubTx()
      unsubOffsets()
    }
  }, [])

  // Calculations
  const rawWallet = transactions
    ?.filter((t: any) => t.type !== 'savings_topup' && t.type !== 'savings_usage' && t.type !== 'savings')
    ?.reduce((acc: any, t: any) => acc + Number(t.amount || 0), 0) || 0

  const walletBalance = rawWallet + Number(offsets.wallet_offset || 0)
  const mamaBalance = walletBalance

  const rawSavings = transactions
    ?.filter((t: any) => t.type === 'savings_topup' || t.type === 'savings_usage' || t.type === 'savings')
    ?.reduce((acc: any, t: any) => acc + Number(t.amount || 0), 0) || 0

  const savingsBalance = rawSavings + Number(offsets.savings_offset || 0)

  const totalRemaining = mamaBalance + savingsBalance

  // Extract expenses (transactions with type === 'expense')
  const expenses = transactions.filter((t: any) => t.type === 'expense')

  // Process Category Data
  const categoriesMap: Record<string, number> = {}
  expenses.forEach((e: any) => {
    const category = e.category || 'General'
    categoriesMap[category] = (categoriesMap[category] || 0) + Math.abs(Number(e.amount))
  })
  const categoryData = Object.entries(categoriesMap).map(([name, value]) => ({ name, value }))

  // Process Daily Data (Last 7 days)
  const last7Days = eachDayOfInterval({
    start: subDays(new Date(), 6),
    end: new Date()
  })
  const dailyData = last7Days.map(day => {
    const amount = expenses
      ?.filter((e: any) => isSameDay(new Date(e.date), day))
      ?.reduce((acc: any, e: any) => acc + Math.abs(Number(e.amount)), 0) || 0
    return {
      name: format(day, "EEE"),
      amount
    }
  })

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
        <p className="text-muted-foreground">Visualize your spending habits in real-time.</p>
      </header>

      {/* Primary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <BalanceCard
          title="Mama Account"
          amount={mamaBalance}
          icon={Home}
        />
        <BalanceCard
          title="Savings Balance"
          amount={savingsBalance}
          icon={PiggyBank}
        />
        <BalanceCard
          title="Total Remaining"
          amount={totalRemaining}
          icon={CreditCard}
          className="border-primary/20 bg-primary/10"
        />
      </div>

      <div className="pt-4">
        <AnalyticsCharts
          categoryData={categoryData}
          dailyData={dailyData}
          weeklyData={dailyData}
        />
      </div>
    </div>
  )
}
