import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/** Pass requested path so /app layout can send users back here after login. */
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  const path = request.nextUrl.pathname + request.nextUrl.search
  requestHeaders.set('x-pathname', path)
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/app/:path*'],
}
