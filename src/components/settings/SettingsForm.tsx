"use client"

import { useState } from "react"
import { updateSettings } from "@/app/actions/finance"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
        title: "Settings updated",
        description: "Your preferences have been saved.",
      })
    } catch (err) {
      console.error(err)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update settings.",
      })
    } finally {
      setPending(false)
    }
  }

  const currencySymbol = settings?.currency || "RM"

  return (
    <form action={handleSubmit} className="space-y-6">
      <Card className="border-none bg-card/50">
        <CardHeader>
          <CardTitle>Current Balances</CardTitle>
          <CardDescription>Directly update the current amount of your wallet or savings balances.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="current_wallet_balance">Current Wallet Balance ({currencySymbol})</Label>
              <Input id="current_wallet_balance" name="current_wallet_balance" type="number" step="0.01" defaultValue={currentWalletBalance} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current_savings_balance">Current Savings Balance ({currencySymbol})</Label>
              <Input id="current_savings_balance" name="current_savings_balance" type="number" step="0.01" defaultValue={currentSavingsBalance} required />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none bg-card/50">
        <CardHeader>
          <CardTitle>Allowance Configuration</CardTitle>
          <CardDescription>Set your default monthly allowance and how it&apos;s allocated.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="monthly_allowance">Total Monthly Allowance</Label>
            <Input id="monthly_allowance" name="monthly_allowance" type="number" step="0.01" defaultValue={settings?.monthly_allowance ?? 430.00} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="mama_allocation">Mama Account Allocation</Label>
              <Input id="mama_allocation" name="mama_allocation" type="number" step="0.01" defaultValue={settings?.mama_allocation ?? 300.00} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wallet_allocation">Wallet Allocation</Label>
              <Input id="wallet_allocation" name="wallet_allocation" type="number" step="0.01" defaultValue={settings?.wallet_allocation ?? 100.00} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="savings_allocation">Savings Allocation</Label>
              <Input id="savings_allocation" name="savings_allocation" type="number" step="0.01" defaultValue={settings?.savings_allocation ?? 30.00} required />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none bg-card/50">
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Personalize your experience.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select name="currency" defaultValue={settings?.currency || "RM"}>
              <SelectTrigger id="currency">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RM">RM (Malaysian Ringgit)</SelectItem>
                <SelectItem value="USD">USD (US Dollar)</SelectItem>
                <SelectItem value="EUR">EUR (Euro)</SelectItem>
                <SelectItem value="SGD">SGD (Singapore Dollar)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending} className="bg-primary hover:bg-primary/90 min-w-[120px]">
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </div>
    </form>
  )
}
