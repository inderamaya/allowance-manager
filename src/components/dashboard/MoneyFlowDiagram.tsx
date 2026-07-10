"use client"

import { motion } from "framer-motion"
import { ArrowDown, Wallet, Home, PiggyBank, CreditCard } from "lucide-react"

interface MoneyFlowDiagramProps {
  allowance: number
  mama: number
  wallet: number
  savings: number
}

export function MoneyFlowDiagram({ allowance, mama, wallet, savings }: MoneyFlowDiagramProps) {
  const steps = [
    { label: "Allowance", value: allowance, icon: CreditCard, color: "bg-primary" },
    { label: "Mama Account", value: mama, icon: Home, color: "bg-amber-400" },
    { label: "Wallet", value: wallet, icon: Wallet, color: "bg-yellow-500" },
    { label: "Savings", value: savings, icon: PiggyBank, color: "bg-emerald-500" },
  ]

  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-8">
      {steps.map((step, index) => (
        <div key={step.label} className="flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.2 }}
            className="group relative flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm transition-all hover:shadow-md w-64 border border-border/50"
          >
            <div className={`rounded-xl ${step.color} p-3 text-white`}>
              <step.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{step.label}</p>
              <p className="text-lg font-bold">RM {step.value.toFixed(2)}</p>
            </div>
          </motion.div>

          {index < steps.length - 1 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 32, opacity: 1 }}
              transition={{ delay: index * 0.2 + 0.1 }}
              className="flex flex-col items-center py-2"
            >
              <div className="w-0.5 h-full bg-gradient-to-b from-primary/50 to-transparent" />
              <ArrowDown className="h-4 w-4 text-primary -mt-1" />
            </motion.div>
          )}
        </div>
      ))}
    </div>
  )
}
