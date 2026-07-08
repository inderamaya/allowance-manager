import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import AppLayout from "@/components/layout/AppLayout"
import { BalanceCard } from "@/components/dashboard/BalanceCard"
import { MoneyFlowDiagram } from "@/components/dashboard/MoneyFlowDiagram"
import { Wallet, PiggyBank, CreditCard, Home, Calendar, TrendingUp, Info } from "lucide-react"
import { triggerMonthlyAllowance } from "@/app/actions/finance"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { differenceInDays, endOfMonth, startOfMonth } from "date-fns"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Trigger monthly allowance check
  await triggerMonthlyAllowance()

  // Fetch all necessary data
  const [
    { data: settings },
    { data: walletTransactions },
    { data: expenses },
    { data: transfers }
  ] = await Promise.all([
    supabase.from("settings").select("*").eq("user_id", user.id).single(),
    supabase.from("wallet_transactions").select("*").eq("user_id", user.id),
    supabase.from("expenses").select("amount, date").eq("user_id", user.id),
    supabase.from("transfers").select("amount, type, status").eq("user_id", user.id)
  ])

  const walletBalance = (walletTransactions as any[])
    ?.filter((t: any) => t.type !== 'savings')
    ?.reduce((acc: any, t: any) => acc + Number(t.amount), 0) || 0

  // Mama balance logic:
  // Initially settings.mama_allocation per month.
  // We need to sum all monthly allocations to Mama and subtract transfers received.
  const { data: allowances } = await supabase.from("monthly_allowance").select("amount").eq("user_id", user.id)
  const totalAllocatedToMama = ((allowances as any[])?.length || 0) * (settings?.mama_allocation || 300)
  const totalTransfersReceived = (transfers as any[])
    ?.filter((t: any) => t.type === 'receive' && t.status === 'completed')
    ?.reduce((acc: any, t: any) => acc + Number(t.amount), 0) || 0
  const mamaBalance = totalAllocatedToMama - totalTransfersReceived

  const savingsBalance = (walletTransactions as any[])
    ?.filter((t: any) => t.type === 'savings')
    ?.reduce((acc: any, t: any) => acc + Number(t.amount), 0) || 0

  const totalRemaining = walletBalance + mamaBalance + savingsBalance

  // Date calculations
  const now = new Date()
  const lastDayOfMonth = endOfMonth(now)
  const daysRemaining = differenceInDays(lastDayOfMonth, now) + 1
  const dailyBudget = walletBalance / daysRemaining

  // Spending insights
  const currentMonthStart = startOfMonth(now).toISOString().split('T')[0]
  const currentMonthExpenses = (expenses as any[])
    ?.filter((e: any) => e.date && e.date >= currentMonthStart)
    ?.reduce((acc: any, e: any) => acc + Number(e.amount), 0) || 0

  const daysPassed = differenceInDays(now, startOfMonth(now)) + 1
  const averageDailySpend = currentMonthExpenses / daysPassed
  const projectedExhaustion = walletBalance / (averageDailySpend || 1)

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in duration-700">
        <header className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
          <p className="text-muted-foreground">Welcome back. Here&apos;s what&apos;s happening with your allowance.</p>
        </header>

        {/* Primary Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <BalanceCard
            title="Wallet Balance"
            amount={walletBalance}
            icon={Wallet}
            className="bg-primary/5"
          />
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
                allowance={settings?.monthly_allowance || 430}
                mama={settings?.mama_allocation || 300}
                wallet={settings?.wallet_allocation || 100}
                savings={settings?.savings_allocation || 30}
              />
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-none bg-card/50 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Monthly Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
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
    </AppLayout>
  )
}
