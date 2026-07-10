/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import AppLayout from "@/components/layout/AppLayout"
import { AnalyticsCharts } from "@/components/analytics/AnalyticsCharts"
import { format, eachDayOfInterval, isSameDay, subDays } from "date-fns"
import { BalanceCard } from "@/components/dashboard/BalanceCard"
import { PiggyBank, CreditCard, Home } from "lucide-react"

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const [
    { data: walletTransactions },
    { data: expenses }
  ] = await Promise.all([
    supabase.from("wallet_transactions").select("*").eq("user_id", user.id),
    supabase.from("expenses").select("*").eq("user_id", user.id).order("date", { ascending: true })
  ])

  const walletBalance = (walletTransactions as any[])
    ?.filter((t: any) => t.type !== 'savings')
    ?.reduce((acc: any, t: any) => acc + Number(t.amount), 0) || 0

  const mamaBalance = walletBalance

  const savingsBalance = (walletTransactions as any[])
    ?.filter((t: any) => t.type === 'savings')
    ?.reduce((acc: any, t: any) => acc + Number(t.amount), 0) || 0

  const totalRemaining = mamaBalance + savingsBalance

  // Process Category Data
  const categoriesMap: Record<string, number> = {};
  (expenses as any[])?.forEach((e: any) => {
    categoriesMap[e.category] = (categoriesMap[e.category] || 0) + Number(e.amount)
  })
  const categoryData = Object.entries(categoriesMap).map(([name, value]) => ({ name, value }))

  // Process Daily Data (Last 7 days)
  const last7Days = eachDayOfInterval({
    start: subDays(new Date(), 6),
    end: new Date()
  })
  const dailyData = last7Days.map(day => {
    const amount = (expenses as any[])
      ?.filter((e: any) => isSameDay(new Date(e.date!), day))
      ?.reduce((acc: any, e: any) => acc + Number(e.amount), 0) || 0
    return {
      name: format(day, "EEE"),
      amount
    }
  })

  return (
    <AppLayout>
      <div className="space-y-6">
        <header className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground">Visualize your spending habits.</p>
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
    </AppLayout>
  )
}
