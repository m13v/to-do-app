import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

export default clerkMiddleware((auth, req: NextRequest) => {
  const userAgent = req.headers.get('user-agent')?.toLowerCase() || '';

  const isAndroidWebView = userAgent.includes('wv');
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isIOSWebView = isIOS && !userAgent.includes('safari');

  const isWebview = isAndroidWebView || isIOSWebView;

  // Allow access to the /open-in-browser page
  if (req.nextUrl.pathname === '/open-in-browser') {
    return NextResponse.next();
  }

  if (isWebview) {
    const url = req.nextUrl.clone();
    url.pathname = '/open-in-browser';
    return NextResponse.redirect(url);
  }

});

export const config = {
  // The following matcher runs middleware on all routes
  // except for static assets.
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}; 