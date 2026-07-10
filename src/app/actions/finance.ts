'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addExpense(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const title = formData.get('title') as string
  const amount = parseFloat(formData.get('amount') as string)
  const category = formData.get('category') as string
  const notes = formData.get('notes') as string
  const date = formData.get('date') as string

  // Insert expense
  const { data: expense, error: expenseError } = await supabase
    .from('expenses')
    .insert({
      user_id: user.id,
      title,
      amount,
      category,
      notes,
      date: date || new Date().toISOString().split('T')[0]
    })
    .select()
    .single()

  if (expenseError) throw expenseError

  // Deduct from wallet
  const { error: walletError } = await supabase
    .from('wallet_transactions')
    .insert({
      user_id: user.id,
      amount: -amount,
      type: 'expense',
      description: `Expense: ${title}`,
      reference_id: expense.id
    })

  if (walletError) throw walletError

  revalidatePath('/')
  return { success: true }
}

export async function requestTransfer(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const amount = parseFloat(formData.get('amount') as string)

  const { error } = await supabase
    .from('transfers')
    .insert({
      user_id: user.id,
      amount,
      type: 'request',
      status: 'pending'
    })

  if (error) throw error

  revalidatePath('/')
  return { success: true }
}

export async function receiveTransfer(transferId: string, amount: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Update transfer status and set type to 'receive' to reflect it's now a fulfilled transfer
  const { error: transferError } = await supabase
    .from('transfers')
    .update({
      status: 'completed',
      type: 'receive'
    })
    .eq('id', transferId)

  if (transferError) throw transferError

  // Increase wallet
  const { error: walletError } = await supabase
    .from('wallet_transactions')
    .insert({
      user_id: user.id,
      amount: amount,
      type: 'transfer',
      description: `Received from Mama`,
      reference_id: transferId
    })

  if (walletError) throw walletError

  revalidatePath('/')
  return { success: true }
}

export async function updateSettings(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const monthly_allowance = parseFloat(formData.get('monthly_allowance') as string)
  const mama_allocation = parseFloat(formData.get('mama_allocation') as string)
  const wallet_allocation = parseFloat(formData.get('wallet_allocation') as string)
  const savings_allocation = parseFloat(formData.get('savings_allocation') as string)
  const currency = formData.get('currency') as string

  // Fetch current transactions to calculate current balance
  const { data: walletTransactions, error: transactionsError } = await supabase
    .from('wallet_transactions')
    .select('amount, type')
    .eq('user_id', user.id)

  if (transactionsError) throw transactionsError

  const currentWalletBalance = (walletTransactions as { amount: number; type: string }[] | null)
    ?.filter((t) => t.type !== 'savings')
    ?.reduce((acc, t) => acc + Number(t.amount), 0) || 0

  const currentSavingsBalance = (walletTransactions as { amount: number; type: string }[] | null)
    ?.filter((t) => t.type === 'savings')
    ?.reduce((acc, t) => acc + Number(t.amount), 0) || 0

  const newWalletBalance = parseFloat(formData.get('current_wallet_balance') as string)
  const newSavingsBalance = parseFloat(formData.get('current_savings_balance') as string)

  // Calculate differences
  const walletDiff = newWalletBalance - currentWalletBalance
  const savingsDiff = newSavingsBalance - currentSavingsBalance

  // Apply wallet balance adjustment if changed
  if (Math.abs(walletDiff) > 0.001) {
    const { error: walletError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        amount: walletDiff,
        type: 'adjustment',
        description: 'Wallet Balance Adjustment'
      })
    if (walletError) throw walletError
  }

  // Apply savings balance adjustment if changed
  if (Math.abs(savingsDiff) > 0.001) {
    const { error: savingsError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        amount: savingsDiff,
        type: 'savings',
        description: 'Savings Balance Adjustment'
      })
    if (savingsError) throw savingsError
  }

  const { error } = await supabase
    .from('settings')
    .update({
      monthly_allowance,
      mama_allocation,
      wallet_allocation,
      savings_allocation,
      currency,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', user.id)

  if (error) throw error

  revalidatePath('/')
  return { success: true }
}

export async function triggerMonthlyAllowance() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const now = new Date()
  const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  // Check if already triggered for this month
  const { data: existing } = await supabase
    .from('monthly_allowance')
    .select('id')
    .eq('user_id', user.id)
    .eq('month_year', monthYear)
    .single()

  if (existing) return

  // Get settings
  const { data: settings } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!settings) return

  // Record monthly allowance
  const { error: allowanceError } = await supabase
    .from('monthly_allowance')
    .insert({
      user_id: user.id,
      amount: settings.monthly_allowance,
      month_year: monthYear
    })

  if (allowanceError) return

  // Credit Wallet Allocation
  if (settings.wallet_allocation && settings.wallet_allocation > 0) {
    await supabase.from('wallet_transactions').insert({
      user_id: user.id,
      amount: settings.wallet_allocation,
      type: 'allowance',
      description: 'Monthly Wallet Allocation'
    })
  }

  // Credit Savings Allocation
  if (settings.savings_allocation && settings.savings_allocation > 0) {
      await supabase.from('wallet_transactions').insert({
          user_id: user.id,
          amount: settings.savings_allocation,
          type: 'savings',
          description: 'Monthly Savings Allocation'
      })
  }

  revalidatePath('/')
}
