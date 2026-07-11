/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from "react"
import { db, collection, doc, onSnapshot } from "@/lib/firebase"
import { SettingsForm } from "@/components/settings/SettingsForm"

export function SettingsClient() {
  const [settings, setSettings] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [offsets, setOffsets] = useState<any>({ wallet_offset: 0, savings_offset: 0 })

  useEffect(() => {
    // 1. Settings default subscription
    const unsubSettings = onSnapshot(doc(db, 'settings', 'default'), (snap: any) => {
      if (snap.exists()) {
        const d = snap.data()
        // Map fields to what SettingsForm expects
        setSettings({
          monthly_allowance: d.monthlyAllowance,
          mama_allocation: d.maybankAllocation,
          wallet_allocation: d.monthlyAllowance - d.maybankAllocation - d.monthlySavings,
          savings_allocation: d.monthlySavings,
          currency: d.currency || "RM",
          alert_email: d.alertEmail || "admin@example.com"
        })
      }
    })

    // 2. Transactions list subscription
    const unsubTx = onSnapshot(collection(db, 'transactions'), (snap: any) => {
      const list: any[] = []
      snap.forEach((d: any) => {
        list.push(d.data())
      })
      setTransactions(list)
    })

    // 3. Offsets subscription
    const unsubOffsets = onSnapshot(doc(db, 'manual_offsets', 'offsets'), (snap: any) => {
      if (snap.exists()) {
        setOffsets(snap.data())
      }
    })

    return () => {
      unsubSettings()
      unsubTx()
      unsubOffsets()
    }
  }, [])

  // Calculations
  const rawWallet = transactions
    ?.filter((t: any) => t.type !== 'savings_topup' && t.type !== 'savings_usage' && t.type !== 'savings')
    ?.reduce((acc: any, t: any) => acc + Number(t.amount || 0), 0) || 0

  const walletBalance = rawWallet + Number(offsets.wallet_offset || 0)

  const rawSavings = transactions
    ?.filter((t: any) => t.type === 'savings_topup' || t.type === 'savings_usage' || t.type === 'savings')
    ?.reduce((acc: any, t: any) => acc + Number(t.amount || 0), 0) || 0

  const savingsBalance = rawSavings + Number(offsets.savings_offset || 0)

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading settings in real-time...</p>
      </div>
    )
  }

  return (
    <SettingsForm
      key={`${walletBalance}-${savingsBalance}`}
      settings={settings}
      currentWalletBalance={walletBalance}
      currentSavingsBalance={savingsBalance}
    />
  )
}
