'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function login(formData: FormData) {
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  // Strictly enforce admin username and password
  if (username !== 'aeylszh7' || password !== 'aeylSzh@7') {
    redirect('/login?message=Invalid credentials')
  }

  // Set local mock admin session cookie
  const cookieStore = await cookies()
  cookieStore.set('admin_session', 'true', {
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  // If real Supabase is configured
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = await createClient()
    const email = 'aeylszh7@allowance-manager.com'
    const dbPassword = 'aeylSzh@7'

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: dbPassword,
    })

    if (signInError) {
      // Attempt sign up if sign in fails (likely because user doesn't exist yet)
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password: dbPassword,
        options: {
          data: {
            full_name: 'Admin',
          }
        }
      })

      if (signUpError) {
        redirect(`/login?message=${encodeURIComponent(signUpError.message)}`)
      }

      // Try signing in again if signUp is successful but didn't auto-login
      const { error: secondSignInError } = await supabase.auth.signInWithPassword({
        email,
        password: dbPassword,
      })

      if (secondSignInError) {
        redirect(`/login?message=${encodeURIComponent(secondSignInError.message)}`)
      }
    }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signOut() {
  const cookieStore = await cookies()
  cookieStore.set('admin_session', '', { maxAge: 0, path: '/' })

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = await createClient()
    await supabase.auth.signOut()
  }

  redirect('/login')
}
