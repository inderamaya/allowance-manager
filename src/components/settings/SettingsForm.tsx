"use client"

import { useState } from "react"
import { updateSettings } from "@/app/actions/finance"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Save } from "lucide-react"

interface SettingsFormProps {
  settings: {
    monthly_allowance: number | null
    mama_allocation: number | null
    wallet_allocation: number | null
    savings_allocation: number | null
    currency: string | null
  } | null
  currentWalletBalance: number
  currentSavingsBalance: number
}

export function SettingsForm({ settings, currentWalletBalance, currentSavingsBalance }: SettingsFormProps) {
  const [pending, setPending] = useState(false)
  const { toast } = useToast()

  async function handleSubmit(formData: FormData) {
    setPending(true)
    try {
      await updateSettings(formData)
      toast({
        title: "Balances updated",
        description: "Your wallet and savings balances have been updated successfully.",
      })
    } catch (err) {
      console.error(err)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update balances.",
      })
    } finally {
      setPending(false)
    }
  }

  const currencySymbol = settings?.currency || "RM"

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* Hidden inputs to preserve other settings */}
      <input type="hidden" name="monthly_allowance" value={settings?.monthly_allowance ?? 430.00} />
      <input type="hidden" name="mama_allocation" value={settings?.mama_allocation ?? 300.00} />
      <input type="hidden" name="wallet_allocation" value={settings?.wallet_allocation ?? 100.00} />
      <input type="hidden" name="savings_allocation" value={settings?.savings_allocation ?? 30.00} />
      <input type="hidden" name="currency" value={settings?.currency ?? "RM"} />

      <Card className="border-none bg-card/50">
        <CardHeader>
          <CardTitle>Current Balances</CardTitle>
          <CardDescription>Directly update the current amount of your wallet or savings balances.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="current_wallet_balance">Current Wallet Balance ({currencySymbol})</Label>
              <Input
                id="current_wallet_balance"
                name="current_wallet_balance"
                type="number"
                step="0.01"
                defaultValue={currentWalletBalance.toFixed(2)}
                required
                className="rounded-xl border-border bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current_savings_balance">Current Savings Balance ({currencySymbol})</Label>
              <Input
                id="current_savings_balance"
                name="current_savings_balance"
                type="number"
                step="0.01"
                defaultValue={currentSavingsBalance.toFixed(2)}
                required
                className="rounded-xl border-border bg-background"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending} className="bg-primary hover:bg-primary/90 min-w-[120px] rounded-xl font-semibold">
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </div>
    </form>
  )
}
