/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import * as fbService from '@/lib/firebaseService'
import { db, collection, addDoc, serverTimestamp } from '@/lib/firebase'

// Simple helper to check if admin is logged in
async function verifyAdmin() {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')
  if (!session || session.value !== 'true') {
    throw new Error('Unauthorized')
  }
}

export async function addExpense(formData: FormData) {
  await verifyAdmin()

  const title = formData.get('title') as string
  const amount = parseFloat(formData.get('amount') as string)
  const category = formData.get('category') as string
  const notes = formData.get('notes') as string
  const date = formData.get('date') as string

  const dateStr = date || new Date().toISOString().split('T')[0]

  // Add negative expense transaction to Firestore
  const txRef = await addDoc(collection(db, 'transactions'), {
    date: dateStr,
    type: 'expense',
    amount: -amount,
    note: title,
    category: category || 'General',
    notes: notes || '',
    timestamp: serverTimestamp()
  })

  // Record history for undo/redo
  await fbService.recordHistory('ADD_EXPENSE', `Added expense: ${title} (RM ${amount.toFixed(2)})`, txRef.id, {
    transactionId: txRef.id,
    amount,
    title,
    category,
    notes,
    date: dateStr
  })

  await fbService.recordActivity()
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function requestTransfer(formData: FormData) {
  await verifyAdmin()

  const amount = parseFloat(formData.get('amount') as string)
  const note = (formData.get('note') as string) || 'Transfer request'

  await fbService.requestMoney(amount, note)

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function receiveTransfer(transferId: string, amount: number) {
  await verifyAdmin()

  await fbService.fulfillTransfer(transferId, amount)

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function updateSettings(formData: FormData) {
  await verifyAdmin()

  const monthly_allowance = parseFloat(formData.get('monthly_allowance') as string) || 430.00
  const mama_allocation = parseFloat(formData.get('mama_allocation') as string) || 300.00
  const savings_allocation = parseFloat(formData.get('savings_allocation') as string) || 30.00
  const alert_email = (formData.get('alert_email') as string) || 'admin@example.com'

  const newWalletBalance = parseFloat(formData.get('current_wallet_balance') as string)
  const newSavingsBalance = parseFloat(formData.get('current_savings_balance') as string)

  // Fetch current raw totals
  const currentRawWallet = await fbService.getBalance()
  const currentRawSavings = await fbService.getSavingsBalance()

  // Fetch previous offsets
  const prevOffsets = await fbService.getOffsets()

  // Calculate new offsets
  const newWalletOffset = newWalletBalance - currentRawWallet
  const newSavingsOffset = newSavingsBalance - currentRawSavings

  // Update offsets in Firestore
  await fbService.setOffsets(newWalletOffset, newSavingsOffset)

  // Update settings document
  await fbService.updateSettingsDoc({
    monthlyAllowance: monthly_allowance,
    monthlySavings: savings_allocation,
    maybankAllocation: mama_allocation,
    alertEmail: alert_email
  })

  // Record action in history
  const undoId = Math.random().toString(36).substring(2, 11)
  await fbService.recordHistory('UPDATE_SETTINGS', `Updated settings & balances: Wallet to RM ${newWalletBalance.toFixed(2)}, Savings to RM ${newSavingsBalance.toFixed(2)}`, undoId, {
    prev_wallet_offset: prevOffsets.wallet_offset,
    prev_savings_offset: prevOffsets.savings_offset,
    new_wallet_offset: newWalletOffset,
    new_savings_offset: newSavingsOffset,
    prev_settings: await fbService.getSettings(),
    new_settings: {
      monthlyAllowance: monthly_allowance,
      monthlySavings: savings_allocation,
      maybankAllocation: mama_allocation,
      alertEmail: alert_email
    }
  })

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function triggerMonthlyAllowance() {
  try {
    await verifyAdmin()
    await fbService.processNewMonth()
  } catch {
    // If not logged in or unauthorized, fail silently for background checks
  }
}

export async function undoLastAction() {
  await verifyAdmin()

  const history = await fbService.getHistory()
  const activeActions = history.filter(h => !h.isUndone)

  if (activeActions.length === 0) {
    return { success: false, message: 'No actions to undo.' }
  }

  const lastAction = activeActions[0]

  if (lastAction.actionType === 'ADD_EXPENSE') {
    if (lastAction.undoId) {
      const { deleteDoc: firestoreDeleteDoc, doc: firestoreDoc } = await import('@/lib/firebase')
      await firestoreDeleteDoc(firestoreDoc(db, 'transactions', lastAction.undoId))
    }
    const { updateDoc: firestoreUpdateDoc, doc: firestoreDoc } = await import('@/lib/firebase')
    await firestoreUpdateDoc(firestoreDoc(db, 'history', lastAction.id!), { isUndone: true })
  } else if (lastAction.actionType === 'REQUEST_TRANSFER') {
    if (lastAction.undoId) {
      const { deleteDoc: firestoreDeleteDoc, doc: firestoreDoc } = await import('@/lib/firebase')
      await firestoreDeleteDoc(firestoreDoc(db, 'transfers', lastAction.undoId))
    }
    const { updateDoc: firestoreUpdateDoc, doc: firestoreDoc } = await import('@/lib/firebase')
    await firestoreUpdateDoc(firestoreDoc(db, 'history', lastAction.id!), { isUndone: true })
  } else if (lastAction.actionType === 'RECEIVE_TRANSFER') {
    const payload = lastAction.payload
    if (payload) {
      // Revert transfer status back to pending
      const { updateDoc: firestoreUpdateDoc, doc: firestoreDoc } = await import('@/lib/firebase')
      await firestoreUpdateDoc(firestoreDoc(db, 'transfers', payload.transferId), {
        status: 'pending',
        type: 'request'
      })
      // Delete credited transaction
      if (payload.transactionId) {
        const { deleteDoc: firestoreDeleteDoc } = await import('@/lib/firebase')
        await firestoreDeleteDoc(firestoreDoc(db, 'transactions', payload.transactionId))
      }
    }
    const { updateDoc: firestoreUpdateDoc, doc: firestoreDoc } = await import('@/lib/firebase')
    await firestoreUpdateDoc(firestoreDoc(db, 'history', lastAction.id!), { isUndone: true })
  } else if (lastAction.actionType === 'USE_SAVINGS') {
    await fbService.undoUseSavings(lastAction.id!)
  } else if (lastAction.actionType === 'TOPUP_SAVINGS') {
    await fbService.undoTopUpSavings(lastAction.id!)
  } else if (lastAction.actionType === 'UPDATE_SETTINGS') {
    await fbService.undoSetOffsets(lastAction.id!)
  }

  revalidatePath('/', 'layout')
  return { success: true, message: `Undid: ${lastAction.details}` }
}

export async function redoLastAction() {
  await verifyAdmin()

  const history = await fbService.getHistory()
  const undoneActions = history.filter(h => h.isUndone)

  if (undoneActions.length === 0) {
    return { success: false, message: 'No actions to redo.' }
  }

  // Redo the most recently undone action
  const lastUndone = undoneActions[0]
  const payload = lastUndone.payload

  if (lastUndone.actionType === 'ADD_EXPENSE') {
    const { setDoc: firestoreSetDoc, doc: firestoreDoc } = await import('@/lib/firebase')
    await firestoreSetDoc(firestoreDoc(db, 'transactions', lastUndone.undoId), {
      date: payload.date || new Date().toISOString().split('T')[0],
      type: 'expense',
      amount: -payload.amount,
      note: payload.title,
      category: payload.category || 'General',
      notes: payload.notes || '',
      timestamp: serverTimestamp()
    })
    const { updateDoc: firestoreUpdateDoc } = await import('@/lib/firebase')
    await firestoreUpdateDoc(firestoreDoc(db, 'history', lastUndone.id!), { isUndone: false })
  } else if (lastUndone.actionType === 'REQUEST_TRANSFER') {
    const { setDoc: firestoreSetDoc, doc: firestoreDoc } = await import('@/lib/firebase')
    await firestoreSetDoc(firestoreDoc(db, 'transfers', lastUndone.undoId), {
      amount: payload.amount,
      note: payload.note || 'Transfer request',
      type: 'request',
      status: 'pending',
      timestamp: serverTimestamp()
    })
    const { updateDoc: firestoreUpdateDoc } = await import('@/lib/firebase')
    await firestoreUpdateDoc(firestoreDoc(db, 'history', lastUndone.id!), { isUndone: false })
  } else if (lastUndone.actionType === 'RECEIVE_TRANSFER') {
    const { updateDoc: firestoreUpdateDoc, setDoc: firestoreSetDoc, doc: firestoreDoc } = await import('@/lib/firebase')
    await firestoreUpdateDoc(firestoreDoc(db, 'transfers', payload.transferId), {
      status: 'completed',
      type: 'receive'
    })
    if (payload.transactionId) {
      await firestoreSetDoc(firestoreDoc(db, 'transactions', payload.transactionId), {
        date: new Date().toISOString().split('T')[0],
        type: 'transfer',
        amount: payload.amount,
        note: 'Received from Mama',
        timestamp: serverTimestamp()
      })
    }
    await firestoreUpdateDoc(firestoreDoc(db, 'history', lastUndone.id!), { isUndone: false })
  } else if (lastUndone.actionType === 'USE_SAVINGS') {
    const { setDoc: firestoreSetDoc, doc: firestoreDoc, updateDoc: firestoreUpdateDoc } = await import('@/lib/firebase')
    const dateStr = new Date().toISOString().split('T')[0]
    if (payload.savingsTransactionId) {
      await firestoreSetDoc(firestoreDoc(db, 'transactions', payload.savingsTransactionId), {
        date: dateStr,
        type: 'savings_usage',
        amount: -payload.amount,
        note: `[Savings Deducted] ${payload.note}`,
        timestamp: serverTimestamp()
      })
    }
    if (payload.walletTransactionId) {
      await firestoreSetDoc(firestoreDoc(db, 'transactions', payload.walletTransactionId), {
        date: dateStr,
        type: 'refill',
        amount: payload.amount,
        note: `[Refill from Savings] ${payload.note}`,
        timestamp: serverTimestamp()
      })
    }
    await firestoreUpdateDoc(firestoreDoc(db, 'history', lastUndone.id!), { isUndone: false })
  } else if (lastUndone.actionType === 'TOPUP_SAVINGS') {
    const { setDoc: firestoreSetDoc, doc: firestoreDoc, updateDoc: firestoreUpdateDoc } = await import('@/lib/firebase')
    const dateStr = new Date().toISOString().split('T')[0]
    if (payload.walletTransactionId) {
      await firestoreSetDoc(firestoreDoc(db, 'transactions', payload.walletTransactionId), {
        date: dateStr,
        type: 'savings_topup',
        amount: -payload.amount,
        note: `[Wallet debited] ${payload.note}`,
        timestamp: serverTimestamp()
      })
    }
    if (payload.savingsTransactionId) {
      await firestoreSetDoc(firestoreDoc(db, 'transactions', payload.savingsTransactionId), {
        date: dateStr,
        type: 'savings_topup',
        amount: payload.amount,
        note: `[Savings credited] ${payload.note}`,
        timestamp: serverTimestamp()
      })
    }
    await firestoreUpdateDoc(firestoreDoc(db, 'history', lastUndone.id!), { isUndone: false })
  } else if (lastUndone.actionType === 'UPDATE_SETTINGS') {
    const { updateDoc: firestoreUpdateDoc, doc: firestoreDoc } = await import('@/lib/firebase')
    if (payload.new_wallet_offset !== undefined && payload.new_savings_offset !== undefined) {
      await fbService.setOffsets(payload.new_wallet_offset, payload.new_savings_offset)
    }
    if (payload.new_settings) {
      await fbService.updateSettingsDoc(payload.new_settings)
    }
    await firestoreUpdateDoc(firestoreDoc(db, 'history', lastUndone.id!), { isUndone: false })
  }

  revalidatePath('/', 'layout')
  return { success: true, message: `Redid: ${lastUndone.details}` }
}

export async function redoHistoryAction(actionId: string) {
  await verifyAdmin()

  const { getDoc, doc: firestoreDoc, db: firestoreDb } = await import('@/lib/firebase')
  const docRef = firestoreDoc(firestoreDb, 'history', actionId)
  const docSnap = await getDoc(docRef)

  if (!docSnap.exists()) {
    return { success: false, message: 'Action not found.' }
  }

  const history = docSnap.data() as any
  const payload = history.payload

  // Create a new duplicate action by resetting isUndone to false on the doc,
  // or re-inserting the transaction
  if (history.actionType === 'ADD_EXPENSE') {
    const { setDoc, doc: fDoc, db: fDb } = await import('@/lib/firebase')
    await setDoc(fDoc(fDb, 'transactions', history.undoId), {
      date: payload.date || new Date().toISOString().split('T')[0],
      type: 'expense',
      amount: -payload.amount,
      note: payload.title,
      category: payload.category || 'General',
      notes: payload.notes || '',
      timestamp: serverTimestamp()
    })
  } else if (history.actionType === 'REQUEST_TRANSFER') {
    const { setDoc, doc: fDoc, db: fDb } = await import('@/lib/firebase')
    await setDoc(fDoc(fDb, 'transfers', history.undoId), {
      amount: payload.amount,
      note: payload.note || 'Transfer request',
      type: 'request',
      status: 'pending',
      timestamp: serverTimestamp()
    })
  } else if (history.actionType === 'RECEIVE_TRANSFER') {
    const { updateDoc, setDoc, doc: fDoc, db: fDb } = await import('@/lib/firebase')
    await updateDoc(fDoc(fDb, 'transfers', payload.transferId), {
      status: 'completed',
      type: 'receive'
    })
    if (payload.transactionId) {
      await setDoc(fDoc(fDb, 'transactions', payload.transactionId), {
        date: new Date().toISOString().split('T')[0],
        type: 'transfer',
        amount: payload.amount,
        note: 'Received from Mama',
        timestamp: serverTimestamp()
      })
    }
  } else if (history.actionType === 'USE_SAVINGS') {
    const { setDoc, doc: fDoc, db: fDb } = await import('@/lib/firebase')
    const dateStr = new Date().toISOString().split('T')[0]
    if (payload.savingsTransactionId) {
      await setDoc(fDoc(fDb, 'transactions', payload.savingsTransactionId), {
        date: dateStr,
        type: 'savings_usage',
        amount: -payload.amount,
        note: `[Savings Deducted] ${payload.note}`,
        timestamp: serverTimestamp()
      })
    }
    if (payload.walletTransactionId) {
      await setDoc(fDoc(fDb, 'transactions', payload.walletTransactionId), {
        date: dateStr,
        type: 'refill',
        amount: payload.amount,
        note: `[Refill from Savings] ${payload.note}`,
        timestamp: serverTimestamp()
      })
    }
  } else if (history.actionType === 'TOPUP_SAVINGS') {
    const { setDoc, doc: fDoc, db: fDb } = await import('@/lib/firebase')
    const dateStr = new Date().toISOString().split('T')[0]
    if (payload.walletTransactionId) {
      await setDoc(fDoc(fDb, 'transactions', payload.walletTransactionId), {
        date: dateStr,
        type: 'savings_topup',
        amount: -payload.amount,
        note: `[Wallet debited] ${payload.note}`,
        timestamp: serverTimestamp()
      })
    }
    if (payload.savingsTransactionId) {
      await setDoc(fDoc(fDb, 'transactions', payload.savingsTransactionId), {
        date: dateStr,
        type: 'savings_topup',
        amount: payload.amount,
        note: `[Savings credited] ${payload.note}`,
        timestamp: serverTimestamp()
      })
    }
  } else if (history.actionType === 'UPDATE_SETTINGS') {
    if (payload.new_wallet_offset !== undefined && payload.new_savings_offset !== undefined) {
      await fbService.setOffsets(payload.new_wallet_offset, payload.new_savings_offset)
    }
    if (payload.new_settings) {
      await fbService.updateSettingsDoc(payload.new_settings)
    }
  }

  // Mark the item as active again (not undone)
  const { updateDoc: fUpdateDoc } = await import('@/lib/firebase')
  await fUpdateDoc(docRef, { isUndone: false })

  revalidatePath('/', 'layout')
  return { success: true, message: `Redid action: ${history.details}` }
}

// Direct service operations wrapping client component triggers
export async function useSavingsAction(amount: number, note: string) {
  await verifyAdmin()
  await fbService.useSavings(amount, note)
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function topUpSavingsAction(amount: number, note: string) {
  await verifyAdmin()
  await fbService.topUpSavings(amount, note)
  revalidatePath('/', 'layout')
  return { success: true }
}
