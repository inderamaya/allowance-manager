import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

// Runtime shim for process.version
if (typeof process === 'undefined' || !process.version) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).process = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(globalThis as any).process,
    version: 'v18.0.0',
  }
}

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
