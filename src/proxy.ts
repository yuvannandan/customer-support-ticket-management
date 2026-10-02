import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET_KEY = process.env.JWT_SECRET || 'super-secret-fallback-key'
const key = new TextEncoder().encode(SECRET_KEY)

export async function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value
  const { pathname } = request.nextUrl

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register')
  const isCustomerRoute = pathname.startsWith('/customer')
  const isAgentRoute = pathname.startsWith('/agent')
  const isAdminRoute = pathname.startsWith('/admin')

  let session: any = null

  if (sessionCookie) {
    try {
      const { payload } = await jwtVerify(sessionCookie, key, {
        algorithms: ['HS256'],
      })
      session = payload
    } catch (err) {
      // Invalid or expired token
      session = null
    }
  }

  // Redirect authenticated users away from auth routes to their respective dashboards
  if (isAuthRoute && session) {
    const role = session.role
    if (role === 'CUSTOMER') return NextResponse.redirect(new URL('/customer/dashboard', request.url))
    if (role === 'AGENT') return NextResponse.redirect(new URL('/agent/dashboard', request.url))
    if (role === 'ADMIN') return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Enforce role-based access control for protected routes
  if (isCustomerRoute || isAgentRoute || isAdminRoute) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const role = session.role

    if (isCustomerRoute && role !== 'CUSTOMER') {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (isAgentRoute && role !== 'AGENT') {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (isAdminRoute && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/customer/:path*', '/agent/:path*', '/admin/:path*', '/login', '/register'],
}
