import { withAuth } from "next-auth/middleware";
import { NextRequest } from "next/server";
import { adminMiddleware } from "./middleware/admin";

export default withAuth(
  async function middleware(req: NextRequest) {
    // Handle admin routes with special admin middleware
    if (req.nextUrl.pathname.startsWith('/admin')) {
      return await adminMiddleware(req);
    }

    // Default behavior for other protected routes
    return;
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/assistant/:path*",
    "/notes/:path*",
    "/calendar/:path*",
    "/expenses/:path*",
    "/admin/:path*",
  ],
};
