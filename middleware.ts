import { updateSession } from "@/lib/supabase/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname
  
  // Handle subdomain routing for pipilot.dev (but not the main domain)
  if (hostname.endsWith('.pipilot.dev') && hostname !== 'pipilot.dev') {
    const subdomain = hostname.split('.')[0]
    // Rewrite to our subdomain handler
    const url = request.nextUrl.clone()
    url.pathname = `/${subdomain}${pathname}`
    return NextResponse.rewrite(url)
  }
  
  // Handle localhost subdomains for development
  if (hostname.endsWith('.localhost:3000') && hostname !== 'localhost:3000') {
    const subdomain = hostname.split('.')[0]
    const url = request.nextUrl.clone()
    url.pathname = `/${subdomain}${pathname}`
    return NextResponse.rewrite(url)
  }
  
  // Apply auth middleware for main domain
  return await updateSession(request)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/).*)"],
}
