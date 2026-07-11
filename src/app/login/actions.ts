/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { auth, signInWithEmailAndPassword } from '@/lib/firebase'

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

  // Authenticate with Firebase Authentication
  try {
    const email = 'aeylszh7@allowance-manager.com'
    await signInWithEmailAndPassword(auth, email, password)
  } catch (error: any) {
    console.error('Firebase Auth Error:', error)
    // If real Firebase Auth is configured and failed, redirect with the message
    // If it's a real Firebase error, we can display it. Otherwise we proceed if mock is active.
    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      redirect(`/login?message=${encodeURIComponent(error.message || 'Firebase Authentication failed')}`)
    }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signOut() {
  const cookieStore = await cookies()
  cookieStore.set('admin_session', '', { maxAge: 0, path: '/' })

  try {
    const { signOut: firebaseSignOut, auth: firebaseAuth } = await import('@/lib/firebase')
    await firebaseSignOut(firebaseAuth)
  } catch (err) {
    console.error('Error signing out from Firebase:', err)
  }

  redirect('/login')
}
