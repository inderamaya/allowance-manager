import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import AppLayout from "@/components/layout/AppLayout"
import { AnalyticsCharts } from "@/components/analytics/AnalyticsCharts"
import { format, eachDayOfInterval, isSameDay, subDays } from "date-fns"

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: expenses } = await supabase
    .from("expenses")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: true })

  // Process Category Data
  const categoriesMap: Record<string, number> = {}
  expenses?.forEach(e => {
    categoriesMap[e.category] = (categoriesMap[e.category] || 0) + Number(e.amount)
  })
  const categoryData = Object.entries(categoriesMap).map(([name, value]) => ({ name, value }))

  // Process Daily Data (Last 7 days)
  const last7Days = eachDayOfInterval({
    start: subDays(new Date(), 6),
    end: new Date()
  })
  const dailyData = last7Days.map(day => {
    const amount = expenses
      ?.filter(e => e.date && isSameDay(new Date(e.date), day))
      ?.reduce((acc, e) => acc + Number(e.amount), 0) || 0
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

        <AnalyticsCharts
          categoryData={categoryData}
          dailyData={dailyData}
          weeklyData={dailyData}
        />
      </div>
    </AppLayout>
  )
}
