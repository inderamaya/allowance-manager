/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import {
  db,
  collection,
  doc,
  onSnapshot
} from '@/lib/firebase'
import { BalanceCard } from "@/components/dashboard/BalanceCard"
import { MoneyFlowDiagram } from "@/components/dashboard/MoneyFlowDiagram"
import { PiggyBank, CreditCard, Home, Calendar, TrendingUp, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { differenceInDays, endOfMonth, startOfMonth, format } from "date-fns"
import { UndoRedoControls } from "@/components/dashboard/UndoRedoControls"
import { BankAccountsCard } from "@/components/dashboard/BankAccountsCard"

export function DashboardClient() {
  const [settings, setSettings] = useState<any>({
    monthlyAllowance: 430,
    monthlySavings: 30,
    maybankAllocation: 300,
    alertEmail: 'admin@example.com'
  })
  const [transactions, setTransactions] = useState<any[]>([])
  const [offsets, setOffsets] = useState<any>({ wallet_offset: 0, savings_offset: 0 })
  const [lastActivity, setLastActivity] = useState<string>(new Date().toISOString())

  useEffect(() => {
    // 1. Subscribe to Settings document
    const unsubSettings = onSnapshot(doc(db, 'settings', 'default'), (docSnap: any) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data())
      }
    })

    // 2. Subscribe to Transactions collection
    const unsubTx = onSnapshot(collection(db, 'transactions'), (snap: any) => {
      const txs: any[] = []
      snap.forEach((d: any) => {
        txs.push({ id: d.id, ...d.data() })
      })
      setTransactions(txs)
    })

    // 3. Subscribe to Offsets document
    const unsubOffsets = onSnapshot(doc(db, 'manual_offsets', 'offsets'), (docSnap: any) => {
      if (docSnap.exists()) {
        setOffsets(docSnap.data())
      }
    })

    // 4. Subscribe to Last Activity document
    const unsubActivity = onSnapshot(doc(db, 'activity', 'last'), (docSnap: any) => {
      if (docSnap.exists()) {
        setLastActivity(docSnap.data().timestamp || new Date().toISOString())
      }
    })

    return () => {
      unsubSettings()
      unsubTx()
      unsubOffsets()
      unsubActivity()
    }
  }, [])

  // Calculations
  const rawWallet = transactions
    ?.filter((t: any) => t.type !== 'savings_topup' && t.type !== 'savings_usage' && t.type !== 'savings')
    ?.reduce((acc: any, t: any) => acc + Number(t.amount || 0), 0) || 0

  const walletBalance = rawWallet + Number(offsets.wallet_offset || 0)
  const mamaBalance = walletBalance // Mama Account displays current wallet balance

  const rawSavings = transactions
    ?.filter((t: any) => t.type === 'savings_topup' || t.type === 'savings_usage' || t.type === 'savings')
    ?.reduce((acc: any, t: any) => acc + Number(t.amount || 0), 0) || 0

  const savingsBalance = rawSavings + Number(offsets.savings_offset || 0)

  const totalRemaining = mamaBalance + savingsBalance

  // Date and Daily Budget calculations
  const now = new Date()
  const lastDayOfMonth = endOfMonth(now)
  const daysRemaining = differenceInDays(lastDayOfMonth, now) + 1
  const dailyBudget = Math.max(0, mamaBalance / daysRemaining)

  // Spending insights
  const currentMonthStart = startOfMonth(now).toISOString().split('T')[0]
  const currentMonthExpenses = transactions
    ?.filter((t: any) => t.type === 'expense' && t.date && t.date >= currentMonthStart)
    ?.reduce((acc: any, t: any) => acc + Number(t.amount || 0), 0) || 0

  const daysPassed = differenceInDays(now, startOfMonth(now)) + 1
  const averageDailySpend = Math.abs(currentMonthExpenses) / daysPassed
  const projectedExhaustion = averageDailySpend > 0 ? (mamaBalance / averageDailySpend) : 999

  const currentDayDateStr = format(now, "EEEE, d MMMM yyyy")
  const lastUpdatedStr = lastActivity
    ? format(new Date(lastActivity), "EEEE, d MMMM yyyy, h:mm a")
    : "No updates yet"

  // Allocation mapping
  const allowance = settings.monthlyAllowance ?? 430
  const mamaAlloc = settings.maybankAllocation ?? 300
  const savingsAlloc = settings.monthlySavings ?? 30
  const walletAlloc = allowance - mamaAlloc - savingsAlloc

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
          <p className="text-muted-foreground">Welcome back. Here&apos;s what&apos;s happening with your allowance in real-time.</p>
        </div>
        <UndoRedoControls />
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

      {/* Secondary Stats & Flow */}
      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-none bg-card/50 shadow-none">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Money Flow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MoneyFlowDiagram
              allowance={allowance}
              mama={mamaAlloc}
              wallet={walletAlloc}
              savings={savingsAlloc}
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <BankAccountsCard />

          <Card className="border-none bg-card/50 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Monthly Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-medium tracking-wider mb-1">Current Date</p>
                <p className="text-lg font-bold">{currentDayDateStr}</p>
              </div>
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground uppercase font-medium tracking-wider mb-1">Last Updated</p>
                <p className="text-sm font-semibold text-foreground">{lastUpdatedStr}</p>
              </div>
              <div className="pt-4 border-t">
                <p className="text-2xl font-bold">{daysRemaining}</p>
                <p className="text-xs text-muted-foreground">Days remaining in month</p>
              </div>
              <div className="pt-4 border-t">
                <p className="text-2xl font-bold">RM {dailyBudget.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Average daily budget</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none bg-amber-50 dark:bg-amber-950/20 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Smart Insight
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-amber-800 dark:text-amber-300">
                {averageDailySpend > dailyBudget
                  ? `You're spending RM ${(averageDailySpend - dailyBudget).toFixed(2)} above your daily budget. Try to cut back!`
                  : "Great job! You're spending within your daily budget."}
              </p>
              <p className="mt-2 text-xs text-amber-700/70 dark:text-amber-400/70">
                Projected wallet exhaustion: {projectedExhaustion > 31 ? "Next month" : `In ${Math.ceil(projectedExhaustion)} days`}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
