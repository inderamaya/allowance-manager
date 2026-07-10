"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CreditCard, Copy, Check } from "lucide-react"
import { useState } from "react"

const ACCOUNTS = [
  { bank: "Maybank", number: "153056659975" },
  { bank: "Bank Rakyat", number: "2252698058" },
  { bank: "Bank Rakyat Mama", number: "2212319157" },
]

export function BankAccountsCard() {
  return (
    <Card className="border-none bg-card/50 shadow-none">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          Bank Accounts
        </CardTitle>
        <CardDescription>Accounts for transfers and references.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {ACCOUNTS.map((acc) => (
          <AccountRow key={acc.number} bank={acc.bank} number={acc.number} />
        ))}
      </CardContent>
    </Card>
  )
}

function AccountRow({ bank, number }: { bank: string; number: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(number)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/40 hover:border-primary/20 transition-all">
      <div>
        <p className="font-semibold text-sm text-foreground">{bank}</p>
        <p className="text-xs text-muted-foreground font-mono mt-0.5">{number}</p>
      </div>
      <button
        onClick={handleCopy}
        className="p-2 rounded-lg bg-card text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
        title="Copy account number"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-500 animate-in zoom-in-50" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  )
}
