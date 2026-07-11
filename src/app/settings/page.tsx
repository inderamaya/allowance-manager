export const dynamic = "force-dynamic"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import AppLayout from "@/components/layout/AppLayout"
import { SettingsClient } from "@/components/settings/SettingsClient"

export default async function SettingsPage() {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')

  if (!session || session.value !== 'true') {
    redirect("/login")
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">Manage your account and allowance settings.</p>
        </header>

        <SettingsClient />
      </div>
    </AppLayout>
  )
}
