import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const pathname = req.nextUrl.pathname

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return res
  }

  try {
    // Create a Supabase client for the middleware
    const supabase = createMiddlewareClient({ req, res })

    // Check if the user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    console.log("Middleware - pathname:", pathname, "session exists:", !!session)

    // If the user is not authenticated and trying to access a protected route
    if (!session && pathname !== "/login") {
      console.log("No session, redirecting to login")
      const url = new URL("/login", req.url)
      return NextResponse.redirect(url)
    }

    // If the user is authenticated and trying to access login, redirect to insert
    if (session && pathname === "/login") {
      console.log("Session exists but on login page, redirecting to insert")
      const url = new URL("/insert", req.url)
      return NextResponse.redirect(url)
    }

    return res
  } catch (error) {
    console.error("Middleware error:", error)
    // If there's an error, allow the request to continue
    return res
  }
}

// Specify which routes this middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
}
