import { differenceInDays, endOfMonth, startOfMonth } from "date-fns"
import { Database } from "./supabase/database.types"

type WalletTransaction = Database['public']['Tables']['wallet_transactions']['Row']
type Expense = Pick<Database['public']['Tables']['expenses']['Row'], 'amount' | 'date'>
type Transfer = Pick<Database['public']['Tables']['transfers']['Row'], 'amount' | 'type' | 'status'>
type Settings = Database['public']['Tables']['settings']['Row']
type Allowance = Pick<Database['public']['Tables']['monthly_allowance']['Row'], 'amount'>

export interface FinancialData {
  walletTransactions: WalletTransaction[]
  expenses: Expense[]
  transfers: Transfer[]
  settings: Settings | null
  allowances: Allowance[]
}

export function calculateFinancials(data: FinancialData) {
  const { walletTransactions, expenses, transfers, settings, allowances } = data

  const walletBalance = walletTransactions
    ?.filter(t => t.type !== 'savings')
    ?.reduce((acc, t) => acc + Number(t.amount), 0) || 0

  const totalAllocatedToMama = (allowances?.length || 0) * (settings?.mama_allocation || 300)
  const totalTransfersReceived = transfers
    ?.filter(t => t.type === 'receive' && t.status === 'completed')
    ?.reduce((acc, t) => acc + Number(t.amount), 0) || 0
  const mamaBalance = totalAllocatedToMama - totalTransfersReceived

  const savingsBalance = walletTransactions
    ?.filter(t => t.type === 'savings')
    ?.reduce((acc, t) => acc + Number(t.amount), 0) || 0

  const totalRemaining = walletBalance + mamaBalance + savingsBalance

  // Date calculations
  const now = new Date()
  const lastDayOfMonth = endOfMonth(now)
  const daysRemaining = differenceInDays(lastDayOfMonth, now) + 1
  const dailyBudget = walletBalance / daysRemaining

  // Spending insights
  const currentMonthStart = startOfMonth(now).toISOString().split('T')[0]
  const currentMonthExpenses = expenses
    ?.filter(e => e.date && e.date >= currentMonthStart)
    ?.reduce((acc, e) => acc + Number(e.amount), 0) || 0

  const daysPassed = differenceInDays(now, startOfMonth(now)) + 1
  const averageDailySpend = currentMonthExpenses / daysPassed
  const projectedExhaustion = walletBalance / (averageDailySpend || 1)

  return {
    walletBalance,
    mamaBalance,
    savingsBalance,
    totalRemaining,
    daysRemaining,
    dailyBudget,
    averageDailySpend,
    projectedExhaustion
  }
}
