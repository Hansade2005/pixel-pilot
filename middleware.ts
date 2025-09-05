import { updateSession } from "@/lib/supabase/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname
  
  // Handle subdomain routing for pipilot.dev
  const subdomain = hostname.split('.')[0]
  
  // Skip auth middleware for subdomains
  if (hostname.endsWith('.pipilot.dev') || hostname.endsWith('.localhost:3000') || hostname.endsWith('.vercel.app')) {
    // Rewrite to our subdomain handler
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
