/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs'
import path from 'path'

const DB_FILE_PATH = path.join(process.cwd(), 'supabase_mock_db.json')

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  updated_at: string
}

export interface Settings {
  id: string
  user_id: string
  monthly_allowance: number
  mama_allocation: number
  wallet_allocation: number
  savings_allocation: number
  currency: string
  dark_mode: boolean
  updated_at: string
}

export interface MonthlyAllowance {
  id: string
  user_id: string
  amount: number
  month_year: string
  created_at: string
}

export interface Expense {
  id: string
  user_id: string
  date: string
  title: string
  amount: number
  category: string
  notes: string | null
  created_at: string
}

export interface Transfer {
  id: string
  user_id: string
  amount: number
  type: 'request' | 'receive'
  status: 'pending' | 'completed' | 'cancelled'
  created_at: string
}

export interface WalletTransaction {
  id: string
  user_id: string
  amount: number
  type: 'allowance' | 'expense' | 'transfer' | 'adjustment' | 'savings'
  description: string | null
  reference_id: string | null
  created_at: string
}

export interface ActionHistory {
  id: string
  user_id: string
  action_type: 'ADD_EXPENSE' | 'REQUEST_TRANSFER' | 'RECEIVE_TRANSFER' | 'UPDATE_BALANCES'
  description: string
  payload: any
  is_undone: boolean
  created_at: string
}

export interface MockDatabase {
  profiles: Profile[]
  settings: Settings[]
  monthly_allowance: MonthlyAllowance[]
  expenses: Expense[]
  transfers: Transfer[]
  wallet_transactions: WalletTransaction[]
  action_history: ActionHistory[]
}

const DEFAULT_DB: MockDatabase = {
  profiles: [
    {
      id: '00000000-0000-0000-0000-000000000000',
      full_name: 'Admin',
      avatar_url: null,
      updated_at: new Date().toISOString()
    }
  ],
  settings: [
    {
      id: '11111111-1111-1111-1111-111111111111',
      user_id: '00000000-0000-0000-0000-000000000000',
      monthly_allowance: 430.00,
      mama_allocation: 300.00,
      wallet_allocation: 100.00,
      savings_allocation: 30.00,
      currency: 'RM',
      dark_mode: false,
      updated_at: new Date().toISOString()
    }
  ],
  monthly_allowance: [],
  expenses: [],
  transfers: [],
  wallet_transactions: [],
  action_history: []
}

export function readDb(): MockDatabase {
  try {
    if (!fs.existsSync(DB_FILE_PATH)) {
      writeDb(DEFAULT_DB)
      return DEFAULT_DB
    }
    const data = fs.readFileSync(DB_FILE_PATH, 'utf-8')
    return JSON.parse(data)
  } catch (err) {
    console.error('Error reading mock DB, using default', err)
    return DEFAULT_DB
  }
}

export function writeDb(db: MockDatabase): void {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(db, null, 2), 'utf-8')
  } catch (err) {
    console.error('Error writing mock DB', err)
  }
}
