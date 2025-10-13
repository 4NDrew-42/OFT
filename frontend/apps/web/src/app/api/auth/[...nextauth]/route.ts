/**
 * NextAuth Route Handler
 *
 * Handles authentication requests for Google OAuth and credentials login.
 * Uses shared authOptions from @/lib/auth.
 */

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
