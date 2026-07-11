export const dynamic = "force-dynamic"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import AppLayout from "@/components/layout/AppLayout"
import { TransfersClient } from "@/components/transfers/TransfersClient"

export default async function TransfersPage() {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')

  if (!session || session.value !== 'true') {
    redirect("/login")
  }

  return (
    <AppLayout>
      <TransfersClient />
    </AppLayout>
  )
}
