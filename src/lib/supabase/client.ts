import { createBrowserClient } from '@supabase/ssr'
import { env, validateEnv } from '@/lib/env'

export function createClient() {
  validateEnv()
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
