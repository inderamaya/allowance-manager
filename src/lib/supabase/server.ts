/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { readDb, writeDb, type MockDatabase } from './mockDb'
import crypto from 'crypto'

class MockQueryBuilder {
  private tableName: string
  private filters: { field: string; value: any }[] = []
  private orderConfig: { field: string; ascending: boolean } | null = null
  private isSingle = false
  private operation: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private payload: any = null
  private selectedFields: string | null = null
  private limitCount: number | null = null

  constructor(tableName: string) {
    this.tableName = tableName
  }

  select(_fields?: string) {
    this.selectedFields = _fields || null
    // If we call select after insert, keep insert as the operation
    if (this.operation !== 'insert') {
      this.operation = 'select'
    }
    return this
  }

  insert(payload: any) {
    this.operation = 'insert'
    this.payload = payload
    return this
  }

  update(payload: any) {
    this.operation = 'update'
    this.payload = payload
    return this
  }

  delete() {
    this.operation = 'delete'
    return this
  }

  eq(field: string, value: any) {
    this.filters.push({ field, value })
    return this
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.orderConfig = { field, ascending: options?.ascending ?? true }
    return this
  }

  limit(n: number) {
    this.limitCount = n
    return this
  }

  single() {
    this.isSingle = true
    return this
  }

  async then(onfulfilled?: (value: { data: any; error: any }) => any) {
    try {
      const db = readDb()
      let table = db[this.tableName as keyof MockDatabase] as any[]
      if (!table) {
        table = []
        ;(db as any)[this.tableName] = table
      }

      let resultData: any = null
      const resultError: any = null

      if (this.operation === 'select') {
        let filtered = [...table]
        if (this.filters.length > 0) {
          filtered = filtered.filter(item =>
            this.filters.every(f => String(item[f.field]) === String(f.value))
          )
        }

        if (this.orderConfig) {
          const { field, ascending } = this.orderConfig
          filtered.sort((a, b) => {
            const valA = a[field]
            const valB = b[field]
            if (valA < valB) return ascending ? -1 : 1
            if (valA > valB) return ascending ? 1 : -1
            return 0
          })
        }

        if (this.limitCount !== null) {
          filtered = filtered.slice(0, this.limitCount)
        }

        if (this.isSingle) {
          resultData = filtered.length > 0 ? filtered[0] : null
        } else {
          resultData = filtered
        }
      } else if (this.operation === 'insert') {
        const isArray = Array.isArray(this.payload)
        const itemsToInsert = isArray ? this.payload : [this.payload]

        const insertedItems = itemsToInsert.map((item: any) => {
          return {
            id: item.id || crypto.randomUUID(),
            created_at: item.created_at || new Date().toISOString(),
            ...item
          }
        })

        table.push(...insertedItems)
        writeDb(db)

        if (this.isSingle) {
          resultData = insertedItems[0]
        } else {
          resultData = isArray ? insertedItems : insertedItems[0]
        }
      } else if (this.operation === 'update') {
        let updatedCount = 0
        const updatedItems: any[] = []

        table.forEach((item, index) => {
          const matches = this.filters.every(f => String(item[f.field]) === String(f.value))
          if (matches) {
            const updated = {
              ...item,
              ...this.payload,
              updated_at: new Date().toISOString()
            }
            table[index] = updated
            updatedItems.push(updated)
            updatedCount++
          }
        })

        if (updatedCount > 0) {
          writeDb(db)
        }

        resultData = this.isSingle ? updatedItems[0] || null : updatedItems
      } else if (this.operation === 'delete') {
        const remaining: any[] = []
        const deleted: any[] = []

        table.forEach(item => {
          const matches = this.filters.every(f => String(item[f.field]) === String(f.value))
          if (matches) {
            deleted.push(item)
          } else {
            remaining.push(item)
          }
        })

        if (deleted.length > 0) {
          ;(db as any)[this.tableName] = remaining
          writeDb(db)
        }

        resultData = this.isSingle ? deleted[0] || null : deleted
      }

      const response = { data: resultData, error: resultError }
      if (onfulfilled) {
        return Promise.resolve(onfulfilled(response))
      }
      return Promise.resolve(response)
    } catch (err: any) {
      const response = { data: null, error: { message: err.message } }
      if (onfulfilled) {
        return Promise.resolve(onfulfilled(response))
      }
      return Promise.resolve(response)
    }
  }
}

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    const cookieStore = await cookies()
    const isAdmin = cookieStore.get('admin_session')?.value === 'true'

    const mockUser = isAdmin ? {
      id: '00000000-0000-0000-0000-000000000000',
      email: 'aeylszh7@allowance-manager.com',
      user_metadata: {
        full_name: 'Admin'
      }
    } : null

    return {
      auth: {
        getUser: async () => ({ data: { user: mockUser }, error: null }),
        getSession: async () => ({ data: { session: isAdmin ? { user: mockUser } : null }, error: null }),
        signInWithPassword: async () => ({ data: {}, error: null }),
        signUp: async () => ({ data: {}, error: null }),
        signInWithOAuth: async () => ({ data: { url: null }, error: null }),
        signOut: async () => ({ error: null }),
      },
      from: (tableName: string) => {
        return new MockQueryBuilder(tableName)
      },
    } as any
  }

  const cookieStore = await cookies()

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string, value: string, options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have proxy refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
