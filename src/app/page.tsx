export const dynamic = "force-dynamic"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import AppLayout from "@/components/layout/AppLayout"
import { DashboardClient } from "@/components/dashboard/DashboardClient"
import { triggerMonthlyAllowance } from "@/app/actions/finance"

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')

  if (!session || session.value !== 'true') {
    redirect("/login")
  }

  // Trigger monthly allowance check in the background if authorized
  await triggerMonthlyAllowance()

  return (
    <AppLayout>
      <DashboardClient />
    </AppLayout>
  )
}
