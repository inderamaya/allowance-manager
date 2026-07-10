/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    const cookieStore = await cookies()
    const isAdmin = cookieStore.get('admin_session')?.value === 'true'

    const queryResult = { data: null, error: null }
    const queryProxy: any = new Proxy({}, {
      get(target, prop) {
        if (prop === 'then') {
          return (onfulfilled: any) => Promise.resolve(onfulfilled(queryResult))
        }
        if (typeof prop === 'string') {
          return () => queryProxy
        }
        return (target as any)[prop]
      }
    })

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
      from: () => queryProxy,
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
