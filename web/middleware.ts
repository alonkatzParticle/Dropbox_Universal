import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  if (!process.env.VERCEL) {
    return NextResponse.next();
  }
  return new NextResponse('Maintenance Mode: The Live Vercel Production Environment is currently offline for local testing and upgrades. The automation engine is paused.', { status: 503 });
}

export const config = {
  matcher: '/:path*',
};
