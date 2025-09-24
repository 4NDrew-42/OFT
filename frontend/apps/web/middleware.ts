export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/assistant/:path*",
    "/notes/:path*",
    "/calendar/:path*",
    "/expenses/:path*",
  ],
};
