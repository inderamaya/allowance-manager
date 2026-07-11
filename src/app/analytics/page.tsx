export const dynamic = "force-dynamic"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import AppLayout from "@/components/layout/AppLayout"
import { AnalyticsClient } from "@/components/analytics/AnalyticsClient"

export default async function AnalyticsPage() {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')

  if (!session || session.value !== 'true') {
    redirect("/login")
  }

  return (
    <AppLayout>
      <AnalyticsClient />
    </AppLayout>
  )
}
