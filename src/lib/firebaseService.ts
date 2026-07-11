/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from '@/lib/firebase'

// Interfaces mapping the Firestore schemas
export interface TransactionDoc {
  id?: string
  date: string
  type: 'income' | 'refill' | 'savings_usage' | 'savings_topup' | 'expense' | 'transfer' | 'allowance' | 'adjustment'
  amount: number
  note: string
  timestamp: any
}

export interface AllowanceStatsDoc {
  id?: string
  month: string // e.g. "2025-02"
  dateReceived: string
  allowanceAmount: number
  usage: number
  savings: number
  balance: number
}

export interface SavingsStatsDoc {
  id?: string
  month: string
  savings: number
  usage: number
  balance: number
}

export interface ManualOffsetsDoc {
  wallet_offset: number
  savings_offset: number
}

export interface HistoryDoc {
  id?: string
  actionType: string
  details: string
  timestamp: any
  undoId: string
  isUndone?: boolean
  payload?: any
}

export interface SettingsDoc {
  monthlyAllowance: number
  monthlySavings: number
  maybankAllocation: number
  alertEmail: string
  mamaAllocation?: number // mapped for compatibility
  walletAllocation?: number
  savingsAllocation?: number
}

// 1. Get/Set Manual Offsets
export async function getOffsets(): Promise<ManualOffsetsDoc> {
  try {
    const docRef = doc(db, 'manual_offsets', 'offsets')
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      const data = docSnap.data() as any
      return {
        wallet_offset: Number(data?.wallet_offset ?? 0),
        savings_offset: Number(data?.savings_offset ?? 0)
      }
    }
  } catch (err) {
    console.error('Error fetching offsets:', err)
  }
  return { wallet_offset: 0, savings_offset: 0 }
}

export async function setOffsets(wallet_offset: number, savings_offset: number): Promise<void> {
  const docRef = doc(db, 'manual_offsets', 'offsets')
  await setDoc(docRef, { wallet_offset, savings_offset })
  await recordActivity()
}

// 2. Balances (excluding/including offsets)
export async function getBalance(): Promise<number> {
  try {
    const colRef = collection(db, 'transactions')
    const querySnap = await getDocs(colRef)
    let total = 0
    querySnap.forEach((docSnap: any) => {
      const t = docSnap.data() as any
      // Wallet transactions exclude savings-only types
      if (t && t.type !== 'savings_topup' && t.type !== 'savings_usage' && t.type !== 'savings') {
        total += Number(t.amount || 0)
      }
    })
    return total
  } catch (err) {
    console.error('Error calculating balance:', err)
    return 0
  }
}

export async function getAdjustedBalance(): Promise<number> {
  const bal = await getBalance()
  const offsets = await getOffsets()
  return bal + offsets.wallet_offset
}

export async function getSavingsBalance(): Promise<number> {
  try {
    const colRef = collection(db, 'transactions')
    const querySnap = await getDocs(colRef)
    let total = 0
    querySnap.forEach((docSnap: any) => {
      const t = docSnap.data() as any
      // Savings transactions
      if (t && (t.type === 'savings_topup' || t.type === 'savings_usage' || t.type === 'savings')) {
        total += Number(t.amount || 0)
      }
    })
    return total
  } catch (err) {
    console.error('Error calculating savings balance:', err)
    return 0
  }
}

export async function getAdjustedSavingsBalance(): Promise<number> {
  const bal = await getSavingsBalance()
  const offsets = await getOffsets()
  return bal + offsets.savings_offset
}

// 3. Allowance and Savings Stats
export async function getAllowanceStats(): Promise<AllowanceStatsDoc[]> {
  try {
    const colRef = collection(db, 'allowance_stats')
    const q = query(colRef, orderBy('month', 'desc'))
    const querySnap = await getDocs(q)
    const stats: AllowanceStatsDoc[] = []
    querySnap.forEach((docSnap: any) => {
      const d = docSnap.data() as any
      stats.push({ id: docSnap.id, ...d } as AllowanceStatsDoc)
    })
    return stats
  } catch (err) {
    console.error('Error fetching allowance stats:', err)
    return []
  }
}

export async function getSavingsStats(): Promise<SavingsStatsDoc[]> {
  try {
    const colRef = collection(db, 'savings_stats')
    const q = query(colRef, orderBy('month', 'desc'))
    const querySnap = await getDocs(q)
    const stats: SavingsStatsDoc[] = []
    querySnap.forEach((docSnap: any) => {
      const d = docSnap.data() as any
      stats.push({ id: docSnap.id, ...d } as SavingsStatsDoc)
    })
    return stats
  } catch (err) {
    console.error('Error fetching savings stats:', err)
    return []
  }
}

// 4. Yearly Totals
export async function getYearlyTotals(): Promise<{ income: number; spending: number; savings: number }> {
  try {
    const colRef = collection(db, 'transactions')
    const querySnap = await getDocs(colRef)
    let income = 0
    let spending = 0
    let savings = 0

    querySnap.forEach((docSnap: any) => {
      const t = docSnap.data() as any
      const amt = Number(t?.amount || 0)

      if (t) {
        if (t.type === 'income' || t.type === 'allowance') {
          income += amt
        } else if (t.type === 'expense' && amt < 0) {
          spending += Math.abs(amt)
        } else if (t.type === 'savings_topup' && amt > 0) {
          savings += amt
        } else if (t.type === 'savings_usage' && amt < 0) {
          savings -= Math.abs(amt)
        }
      }
    })

    return { income, spending, savings }
  } catch (err) {
    console.error('Error calculating yearly totals:', err)
    return { income: 0, spending: 0, savings: 0 }
  }
}

// 5. Transfer requests/history
export async function getMonthlyMomTransfers(): Promise<any[]> {
  try {
    const colRef = collection(db, 'transfers')
    const q = query(colRef, orderBy('timestamp', 'desc'))
    const querySnap = await getDocs(q)
    const transfers: any[] = []
    querySnap.forEach((docSnap: any) => {
      const d = docSnap.data() as any
      transfers.push({ id: docSnap.id, ...d })
    })
    return transfers
  } catch (err) {
    console.error('Error fetching transfers:', err)
    return []
  }
}

// 6. Settings Page Actions
export async function getSettings(): Promise<SettingsDoc> {
  try {
    const docRef = doc(db, 'settings', 'default')
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      const data = docSnap.data() as any
      return {
        monthlyAllowance: Number(data?.monthlyAllowance ?? 430.00),
        monthlySavings: Number(data?.monthlySavings ?? 30.00),
        maybankAllocation: Number(data?.maybankAllocation ?? 300.00),
        alertEmail: data?.alertEmail ?? 'admin@example.com',
        mamaAllocation: Number(data?.maybankAllocation ?? 300.00), // alias compatibility
        walletAllocation: Number((data?.monthlyAllowance ?? 430.00) - (data?.maybankAllocation ?? 300.00) - (data?.monthlySavings ?? 30.00)),
        savingsAllocation: Number(data?.monthlySavings ?? 30.00)
      }
    }
  } catch (err) {
    console.error('Error fetching settings:', err)
  }
  return {
    monthlyAllowance: 430.00,
    monthlySavings: 30.00,
    maybankAllocation: 300.00,
    alertEmail: 'admin@example.com',
    mamaAllocation: 300.00,
    walletAllocation: 100.00,
    savingsAllocation: 30.00
  }
}

export async function updateSettingsDoc(settings: Partial<SettingsDoc>): Promise<void> {
  const docRef = doc(db, 'settings', 'default')
  await setDoc(docRef, settings, { merge: true })
  await recordActivity()
}

// 7. Operations/Actions (e.g. processNewMonth, requestMoney, useSavings, topUpSavings)
export async function processNewMonth(): Promise<void> {
  const settings = await getSettings()
  const now = new Date()
  const monthStr = now.toISOString().substring(0, 7) // "2025-02"

  // Check if already processed
  const colRef = collection(db, 'allowance_stats')
  const q = query(colRef, where('month', '==', monthStr))
  const querySnap = await getDocs(q)
  if (!querySnap.empty) return // Already processed

  // Add allowance transactions
  const walletAlloc = settings.monthlyAllowance - settings.maybankAllocation - settings.monthlySavings

  // 1. Credit wallet allocation
  if (walletAlloc > 0) {
    await addDoc(collection(db, 'transactions'), {
      date: now.toISOString().split('T')[0],
      type: 'allowance',
      amount: walletAlloc,
      note: 'Monthly Wallet Allocation',
      timestamp: serverTimestamp()
    })
  }

  // 2. Credit savings allocation
  if (settings.monthlySavings > 0) {
    await addDoc(collection(db, 'transactions'), {
      date: now.toISOString().split('T')[0],
      type: 'savings',
      amount: settings.monthlySavings,
      note: 'Monthly Savings Allocation',
      timestamp: serverTimestamp()
    })
  }

  // Add stats documents
  await addDoc(collection(db, 'allowance_stats'), {
    month: monthStr,
    dateReceived: now.toISOString().split('T')[0],
    allowanceAmount: settings.monthlyAllowance,
    usage: 0,
    savings: settings.monthlySavings,
    balance: walletAlloc
  })

  await addDoc(collection(db, 'savings_stats'), {
    month: monthStr,
    savings: settings.monthlySavings,
    usage: 0,
    balance: settings.monthlySavings
  })

  await recordHistory('PROCESS_NEW_MONTH', `Processed new month: ${monthStr} with RM ${settings.monthlyAllowance.toFixed(2)} allowance`, monthStr, {
    month: monthStr,
    allowanceAmount: settings.monthlyAllowance
  })

  await recordActivity()
}

export async function requestMoney(amount: number, note: string = 'Transfer request'): Promise<string> {
  const docRef = await addDoc(collection(db, 'transfers'), {
    amount,
    note,
    type: 'request',
    status: 'pending',
    timestamp: serverTimestamp()
  })

  const undoId = docRef.id
  await recordHistory('REQUEST_TRANSFER', `Requested transfer from Mama: RM ${amount.toFixed(2)}`, undoId, {
    transferId: docRef.id,
    amount,
    note
  })

  await recordActivity()
  return docRef.id
}

export async function fulfillTransfer(transferId: string, amount: number): Promise<void> {
  const transferRef = doc(db, 'transfers', transferId)
  await updateDoc(transferRef, {
    status: 'completed',
    type: 'receive'
  })

  // Add money to wallet
  const txRef = await addDoc(collection(db, 'transactions'), {
    date: new Date().toISOString().split('T')[0],
    type: 'transfer',
    amount: amount,
    note: 'Received from Mama',
    timestamp: serverTimestamp()
  })

  await recordHistory('RECEIVE_TRANSFER', `Received transfer from Mama: RM ${amount.toFixed(2)}`, transferId, {
    transferId,
    transactionId: txRef.id,
    amount
  })

  await recordActivity()
}

export async function useSavings(amount: number, note: string = 'Used savings'): Promise<void> {
  const undoId = Math.random().toString(36).substring(2, 11)
  const dateStr = new Date().toISOString().split('T')[0]

  // Add negative transaction to savings
  const sTx = await addDoc(collection(db, 'transactions'), {
    date: dateStr,
    type: 'savings_usage',
    amount: -amount,
    note: `[Savings Deducted] ${note}`,
    timestamp: serverTimestamp()
  })

  // Add positive transaction to wallet
  const wTx = await addDoc(collection(db, 'transactions'), {
    date: dateStr,
    type: 'refill',
    amount: amount,
    note: `[Refill from Savings] ${note}`,
    timestamp: serverTimestamp()
  })

  await recordHistory('USE_SAVINGS', `Used savings: RM ${amount.toFixed(2)}`, undoId, {
    savingsTransactionId: sTx.id,
    walletTransactionId: wTx.id,
    amount,
    note
  })

  await recordActivity()
}

export async function topUpSavings(amount: number, note: string = 'Top up savings'): Promise<void> {
  const undoId = Math.random().toString(36).substring(2, 11)
  const dateStr = new Date().toISOString().split('T')[0]

  // Add negative transaction to wallet
  const wTx = await addDoc(collection(db, 'transactions'), {
    date: dateStr,
    type: 'savings_topup',
    amount: -amount,
    note: `[Wallet debited] ${note}`,
    timestamp: serverTimestamp()
  })

  // Add positive transaction to savings
  const sTx = await addDoc(collection(db, 'transactions'), {
    date: dateStr,
    type: 'savings_topup',
    amount: amount,
    note: `[Savings credited] ${note}`,
    timestamp: serverTimestamp()
  })

  await recordHistory('TOPUP_SAVINGS', `Top up savings: RM ${amount.toFixed(2)}`, undoId, {
    walletTransactionId: wTx.id,
    savingsTransactionId: sTx.id,
    amount,
    note
  })

  await recordActivity()
}

// 8. History / Ledger tracking (Permanent Undo/Redo mechanism)
export async function recordHistory(actionType: string, details: string, undoId: string, payload?: any): Promise<void> {
  await addDoc(collection(db, 'history'), {
    actionType,
    details,
    undoId,
    timestamp: serverTimestamp(),
    isUndone: false,
    payload
  })
}

export async function getHistory(): Promise<HistoryDoc[]> {
  try {
    const colRef = collection(db, 'history')
    const q = query(colRef, orderBy('timestamp', 'desc'))
    const querySnap = await getDocs(q)
    const history: HistoryDoc[] = []
    querySnap.forEach((docSnap: any) => {
      const d = docSnap.data() as any
      history.push({ id: docSnap.id, ...d } as HistoryDoc)
    })
    return history
  } catch (err) {
    console.error('Error fetching history:', err)
    return []
  }
}

// 9. Specific Undo operations
export async function undoRefill(historyDocId: string): Promise<void> {
  const docRef = doc(db, 'history', historyDocId)
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) return

  const action = docSnap.data() as any
  if (action?.isUndone) return

  const payload = action?.payload
  if (payload && payload.walletTransactionId) {
    // Delete wallet transaction that was credited
    await deleteDoc(doc(db, 'transactions', payload.walletTransactionId))
  }
  if (payload && payload.savingsTransactionId) {
    // Delete savings transaction that was debited
    await deleteDoc(doc(db, 'transactions', payload.savingsTransactionId))
  }

  await updateDoc(docRef, { isUndone: true })
  await recordActivity()
}

export async function undoUseSavings(historyDocId: string): Promise<void> {
  await undoRefill(historyDocId)
}

export async function undoTopUpSavings(historyDocId: string): Promise<void> {
  const docRef = doc(db, 'history', historyDocId)
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) return

  const action = docSnap.data() as any
  if (action?.isUndone) return

  const payload = action?.payload
  if (payload && payload.walletTransactionId) {
    await deleteDoc(doc(db, 'transactions', payload.walletTransactionId))
  }
  if (payload && payload.savingsTransactionId) {
    await deleteDoc(doc(db, 'transactions', payload.savingsTransactionId))
  }

  await updateDoc(docRef, { isUndone: true })
  await recordActivity()
}

export async function undoSetOffsets(historyDocId: string): Promise<void> {
  const docRef = doc(db, 'history', historyDocId)
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) return

  const action = docSnap.data() as any
  if (action?.isUndone) return

  const payload = action?.payload
  if (payload) {
    // Restore original offsets
    await setOffsets(payload.prev_wallet_offset || 0, payload.prev_savings_offset || 0)
  }

  await updateDoc(docRef, { isUndone: true })
  await recordActivity()
}

// 10. Record/Get Last Activity
export async function recordActivity(): Promise<void> {
  try {
    const docRef = doc(db, 'activity', 'last')
    await setDoc(docRef, { timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('Error recording activity:', err)
  }
}

export async function getLastActivity(): Promise<string> {
  try {
    const docRef = doc(db, 'activity', 'last')
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      const data = docSnap.data() as any
      return data?.timestamp || new Date().toISOString()
    }
  } catch (err) {
    console.error('Error getting last activity:', err)
  }
  return new Date().toISOString()
}

// Static Bank Accounts configuration as requested (mama list + account info)
export function getBankAccounts() {
  return [
    { name: 'Maybank', number: '153056659975', holder: 'Admin' },
    { name: 'Bank Rakyat', number: '2252698058', holder: 'Admin' },
    { name: 'Bank Rakyat Mama', number: '2212319157', holder: 'Mama' }
  ]
}
