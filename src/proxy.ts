import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

// Shim for process.version to avoid Edge Runtime errors from @supabase/supabase-js
if (typeof process === 'undefined' || !process.version) {
  const globalObj = globalThis as any;
  if (!globalObj.process) {
    globalObj.process = {};
  }
  globalObj.process.version = 'v20.0.0';
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
