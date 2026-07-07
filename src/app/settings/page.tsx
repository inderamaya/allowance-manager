import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import AppLayout from "@/components/layout/AppLayout"
import { SettingsForm } from "@/components/settings/SettingsForm"

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: settings } = await supabase
    .from("settings")
    .select("*")
    .eq("user_id", user.id)
    .single()

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">Manage your account and allowance settings.</p>
        </header>

        <SettingsForm settings={settings} />
      </div>
    </AppLayout>
  )
}
