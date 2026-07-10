/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Helper to log action permanently
async function logAction(
  action_type: 'ADD_EXPENSE' | 'REQUEST_TRANSFER' | 'RECEIVE_TRANSFER' | 'UPDATE_BALANCES',
  description: string,
  payload: Record<string, any>
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('action_history').insert({
    user_id: user.id,
    action_type,
    description,
    payload,
    is_undone: false
  })
}

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
  const { data: walletTx, error: walletError } = await supabase
    .from('wallet_transactions')
    .insert({
      user_id: user.id,
      amount: -amount,
      type: 'expense',
      description: `Expense: ${title}`,
      reference_id: expense.id
    })
    .select()
    .single()

  if (walletError) throw walletError

  // Log action
  await logAction('ADD_EXPENSE', `Added expense: ${title} (RM ${amount.toFixed(2)})`, {
    expense_id: expense.id,
    wallet_transaction_id: walletTx?.id,
    expense_data: { title, amount, category, notes, date: date || new Date().toISOString().split('T')[0] },
    wallet_transaction_data: { amount: -amount, type: 'expense', description: `Expense: ${title}`, reference_id: expense.id }
  })

  revalidatePath('/')
  return { success: true }
}

export async function requestTransfer(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const amount = parseFloat(formData.get('amount') as string)

  const { data: transfer, error } = await supabase
    .from('transfers')
    .insert({
      user_id: user.id,
      amount,
      type: 'request',
      status: 'pending'
    })
    .select()
    .single()

  if (error) throw error

  // Log action
  await logAction('REQUEST_TRANSFER', `Requested transfer from Mama: RM ${amount.toFixed(2)}`, {
    transfer_id: transfer.id,
    transfer_data: { amount, type: 'request', status: 'pending' }
  })

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
  const { data: walletTx, error: walletError } = await supabase
    .from('wallet_transactions')
    .insert({
      user_id: user.id,
      amount: amount,
      type: 'transfer',
      description: `Received from Mama`,
      reference_id: transferId
    })
    .select()
    .single()

  if (walletError) throw walletError

  // Log action
  await logAction('RECEIVE_TRANSFER', `Received transfer from Mama: RM ${amount.toFixed(2)}`, {
    transfer_id: transferId,
    wallet_transaction_id: walletTx?.id,
    original_transfer_state: { type: 'request', status: 'pending' },
    amount
  })

  revalidatePath('/')
  return { success: true }
}

export async function updateSettings(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const monthly_allowance = parseFloat(formData.get('monthly_allowance') as string) || 430.00
  const mama_allocation = parseFloat(formData.get('mama_allocation') as string) || 300.00
  const wallet_allocation = parseFloat(formData.get('wallet_allocation') as string) || 100.00
  const savings_allocation = parseFloat(formData.get('savings_allocation') as string) || 30.00
  const currency = (formData.get('currency') as string) || "RM"

  // Fetch current settings
  const { data: currentSettings } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', user.id)
    .single()

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

  let walletTxId: string | null = null
  let savingsTxId: string | null = null

  // Apply wallet balance adjustment if changed
  if (Math.abs(walletDiff) > 0.001) {
    const { data: walletTx, error: walletError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        amount: walletDiff,
        type: 'adjustment',
        description: 'Wallet Balance Adjustment'
      })
      .select()
      .single()
    if (walletError) throw walletError
    walletTxId = walletTx?.id || null
  }

  // Apply savings balance adjustment if changed
  if (Math.abs(savingsDiff) > 0.001) {
    const { data: savingsTx, error: savingsError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        amount: savingsDiff,
        type: 'savings',
        description: 'Savings Balance Adjustment'
      })
      .select()
      .single()
    if (savingsError) throw savingsError
    savingsTxId = savingsTx?.id || null
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

  // Log action
  await logAction('UPDATE_BALANCES', `Updated balances: Wallet to RM ${newWalletBalance.toFixed(2)}, Savings to RM ${newSavingsBalance.toFixed(2)}`, {
    original_settings: currentSettings,
    new_settings: { monthly_allowance, mama_allocation, wallet_allocation, savings_allocation, currency },
    wallet_transaction_id: walletTxId,
    savings_transaction_id: savingsTxId,
    wallet_diff: walletDiff,
    savings_diff: savingsDiff,
    original_wallet_balance: currentWalletBalance,
    original_savings_balance: currentSavingsBalance,
    new_wallet_balance: newWalletBalance,
    new_savings_balance: newSavingsBalance
  })

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

// Global Undo Function
export async function undoLastAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Find the latest active action
  const { data: history } = await supabase
    .from('action_history')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_undone', false)
    .order('created_at', { ascending: false })

  if (!history || history.length === 0) {
    return { success: false, message: 'No actions to undo.' }
  }

  const lastAction = history[0]
  const payload = lastAction.payload

  if (lastAction.action_type === 'ADD_EXPENSE') {
    if (payload.expense_id) {
      await supabase.from('expenses').delete().eq('id', payload.expense_id)
    }
    if (payload.wallet_transaction_id) {
      await supabase.from('wallet_transactions').delete().eq('id', payload.wallet_transaction_id)
    }
  } else if (lastAction.action_type === 'REQUEST_TRANSFER') {
    if (payload.transfer_id) {
      await supabase.from('transfers').delete().eq('id', payload.transfer_id)
    }
  } else if (lastAction.action_type === 'RECEIVE_TRANSFER') {
    if (payload.transfer_id) {
      // Restore transfer back to original request status
      const orig = payload.original_transfer_state || { type: 'request', status: 'pending' }
      await supabase.from('transfers').update({
        status: orig.status,
        type: orig.type
      }).eq('id', payload.transfer_id)
    }
    if (payload.wallet_transaction_id) {
      await supabase.from('wallet_transactions').delete().eq('id', payload.wallet_transaction_id)
    }
  } else if (lastAction.action_type === 'UPDATE_BALANCES') {
    // Delete added adjustment transactions
    if (payload.wallet_transaction_id) {
      await supabase.from('wallet_transactions').delete().eq('id', payload.wallet_transaction_id)
    }
    if (payload.savings_transaction_id) {
      await supabase.from('wallet_transactions').delete().eq('id', payload.savings_transaction_id)
    }
    // Restore original settings config if any
    if (payload.original_settings) {
      const orig = payload.original_settings
      await supabase.from('settings').update({
        monthly_allowance: orig.monthly_allowance,
        mama_allocation: orig.mama_allocation,
        wallet_allocation: orig.wallet_allocation,
        savings_allocation: orig.savings_allocation,
        currency: orig.currency
      }).eq('user_id', user.id)
    }
  }

  // Mark this action as undone
  await supabase.from('action_history').update({ is_undone: true }).eq('id', lastAction.id)

  revalidatePath('/')
  return { success: true, message: `Undid: ${lastAction.description}` }
}

// Global Redo Function for recent actions
export async function redoLastAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Find the latest undone action
  const { data: history } = await supabase
    .from('action_history')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_undone', true)
    .order('created_at', { ascending: false })

  if (!history || history.length === 0) {
    return { success: false, message: 'No actions to redo.' }
  }

  const lastAction = history[0]
  const payload = lastAction.payload

  if (lastAction.action_type === 'ADD_EXPENSE') {
    const { data: expense } = await supabase
      .from('expenses')
      .insert({
        id: payload.expense_id,
        user_id: user.id,
        ...payload.expense_data
      })
      .select()
      .single()

    await supabase
      .from('wallet_transactions')
      .insert({
        id: payload.wallet_transaction_id,
        user_id: user.id,
        ...payload.wallet_transaction_data,
        reference_id: expense?.id
      })
  } else if (lastAction.action_type === 'REQUEST_TRANSFER') {
    await supabase
      .from('transfers')
      .insert({
        id: payload.transfer_id,
        user_id: user.id,
        ...payload.transfer_data
      })
  } else if (lastAction.action_type === 'RECEIVE_TRANSFER') {
    if (payload.transfer_id) {
      await supabase.from('transfers').update({
        status: 'completed',
        type: 'receive'
      }).eq('id', payload.transfer_id)
    }
    await supabase
      .from('wallet_transactions')
      .insert({
        id: payload.wallet_transaction_id,
        user_id: user.id,
        amount: payload.amount,
        type: 'transfer',
        description: `Received from Mama`,
        reference_id: payload.transfer_id
      })
  } else if (lastAction.action_type === 'UPDATE_BALANCES') {
    if (payload.wallet_transaction_id && payload.wallet_diff) {
      await supabase.from('wallet_transactions').insert({
        id: payload.wallet_transaction_id,
        user_id: user.id,
        amount: payload.wallet_diff,
        type: 'adjustment',
        description: 'Wallet Balance Adjustment'
      })
    }
    if (payload.savings_transaction_id && payload.savings_diff) {
      await supabase.from('wallet_transactions').insert({
        id: payload.savings_transaction_id,
        user_id: user.id,
        amount: payload.savings_diff,
        type: 'savings',
        description: 'Savings Balance Adjustment'
      })
    }
    if (payload.new_settings) {
      await supabase.from('settings').update({
        ...payload.new_settings
      }).eq('user_id', user.id)
    }
  }

  // Mark this action as active again
  await supabase.from('action_history').update({ is_undone: false }).eq('id', lastAction.id)

  revalidatePath('/')
  return { success: true, message: `Redid: ${lastAction.description}` }
}

// Redo a historical action from the permanent log (creates a duplicate active action)
export async function redoHistoryAction(actionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: history } = await supabase
    .from('action_history')
    .select('*')
    .eq('id', actionId)
    .single()

  if (!history) {
    return { success: false, message: 'Action not found.' }
  }

  const payload = history.payload

  if (history.action_type === 'ADD_EXPENSE') {
    // Insert new expense
    const { data: expense } = await supabase
      .from('expenses')
      .insert({
        user_id: user.id,
        ...payload.expense_data
      })
      .select()
      .single()

    // Insert new wallet transaction
    const { data: walletTx } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        ...payload.wallet_transaction_data,
        reference_id: expense?.id
      })
      .select()
      .single()

    // Log this new action
    await logAction('ADD_EXPENSE', `[Redo] ${history.description}`, {
      expense_id: expense?.id,
      wallet_transaction_id: walletTx?.id,
      expense_data: payload.expense_data,
      wallet_transaction_data: payload.wallet_transaction_data
    })
  } else if (history.action_type === 'REQUEST_TRANSFER') {
    const { data: transfer } = await supabase
      .from('transfers')
      .insert({
        user_id: user.id,
        ...payload.transfer_data
      })
      .select()
      .single()

    await logAction('REQUEST_TRANSFER', `[Redo] ${history.description}`, {
      transfer_id: transfer?.id,
      transfer_data: payload.transfer_data
    })
  } else if (history.action_type === 'RECEIVE_TRANSFER') {
    // Create a new direct received transfer (creates a transfer record completed and a wallet credit)
    const { data: transfer } = await supabase
      .from('transfers')
      .insert({
        user_id: user.id,
        amount: payload.amount,
        type: 'receive',
        status: 'completed'
      })
      .select()
      .single()

    const { data: walletTx } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        amount: payload.amount,
        type: 'transfer',
        description: `Received from Mama`,
        reference_id: transfer?.id
      })
      .select()
      .single()

    await logAction('RECEIVE_TRANSFER', `[Redo] ${history.description}`, {
      transfer_id: transfer?.id,
      wallet_transaction_id: walletTx?.id,
      original_transfer_state: { type: 'receive', status: 'completed' },
      amount: payload.amount
    })
  } else if (history.action_type === 'UPDATE_BALANCES') {
    // Re-apply the same current balances
    const { data: currentSettings } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const { data: walletTransactions } = await supabase
      .from('wallet_transactions')
      .select('amount, type')
      .eq('user_id', user.id)

    const currentWalletBalance = (walletTransactions as { amount: number; type: string }[] | null)
      ?.filter((t) => t.type !== 'savings')
      ?.reduce((acc, t) => acc + Number(t.amount), 0) || 0

    const currentSavingsBalance = (walletTransactions as { amount: number; type: string }[] | null)
      ?.filter((t) => t.type === 'savings')
      ?.reduce((acc, t) => acc + Number(t.amount), 0) || 0

    const walletDiff = payload.new_wallet_balance - currentWalletBalance
    const savingsDiff = payload.new_savings_balance - currentSavingsBalance

    let walletTxId: string | null = null
    let savingsTxId: string | null = null

    if (Math.abs(walletDiff) > 0.001) {
      const { data: walletTx } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: user.id,
          amount: walletDiff,
          type: 'adjustment',
          description: 'Wallet Balance Adjustment'
        })
        .select()
        .single()
      walletTxId = walletTx?.id || null
    }

    if (Math.abs(savingsDiff) > 0.001) {
      const { data: savingsTx } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: user.id,
          amount: savingsDiff,
          type: 'savings',
          description: 'Savings Balance Adjustment'
        })
        .select()
        .single()
      savingsTxId = savingsTx?.id || null
    }

    if (payload.new_settings) {
      await supabase.from('settings').update({
        ...payload.new_settings
      }).eq('user_id', user.id)
    }

    await logAction('UPDATE_BALANCES', `[Redo] ${history.description}`, {
      original_settings: currentSettings,
      new_settings: payload.new_settings,
      wallet_transaction_id: walletTxId,
      savings_transaction_id: savingsTxId,
      wallet_diff: walletDiff,
      savings_diff: savingsDiff,
      original_wallet_balance: currentWalletBalance,
      original_savings_balance: currentSavingsBalance,
      new_wallet_balance: payload.new_wallet_balance,
      new_savings_balance: payload.new_savings_balance
    })
  }

  revalidatePath('/')
  return { success: true, message: `Redid action: ${history.description}` }
}
