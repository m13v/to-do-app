import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define the routes that should be protected
const isProtectedRoute = createRouteMatcher([
  '/',
  '/dashboard(.*)', // Add any other routes you want to protect
]);

export default clerkMiddleware(async (auth, req) => {
  // If the route is protected, enforce authentication
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  // The following matcher runs middleware on all routes
  // except for static assets.
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}; 