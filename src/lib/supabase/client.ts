import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
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

    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        signInWithPassword: async () => ({ data: {}, error: null }),
        signUp: async () => ({ data: {}, error: null }),
        signInWithOAuth: async () => ({ data: { url: null }, error: null }),
        signOut: async () => ({ error: null }),
      },
      from: () => queryProxy,
    } as any
  }

  return createBrowserClient(url, key)
}
