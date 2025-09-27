import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

// Allowed email addresses - only these users can sign in
const getAllowedEmails = (): string[] => {
  // Check for environment variable first (comma-separated list)
  const envEmails = process.env.ALLOWED_EMAILS;
  if (envEmails) {
    return envEmails.split(',').map(email => email.trim().toLowerCase());
  }

  // Fallback to hardcoded list
  return [
    "jamesandrewklein@gmail.com",
    // Add more allowed emails here as needed
    // "another.user@example.com",
  ];
};

const ALLOWED_EMAILS = getAllowedEmails();

const handler = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const u = credentials?.username;
        const p = credentials?.password;
        if (
          u && p &&
          process.env.BASIC_USER &&
          process.env.BASIC_PASS &&
          u === process.env.BASIC_USER &&
          p === process.env.BASIC_PASS
        ) {
          return { id: "basic-user", name: u, email: u } as any;
        }
        return null;
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
    error: "/auth/error"
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Check if the user's email is in the allowed list
      if (user.email && ALLOWED_EMAILS.includes(user.email.toLowerCase())) {
        return true;
      }

      // Log unauthorized access attempts for security monitoring
      console.warn(`Unauthorized sign-in attempt from email: ${user.email}`);

      // Store access request for admin review
      if (user.email) {
        try {
          await fetch(`${process.env.NEXTAUTH_URL}/api/admin/access-requests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              name: user.name || '',
              provider: account?.provider || 'unknown',
              timestamp: new Date().toISOString(),
              userAgent: 'server-side', // Will be enhanced with actual user agent
              ipAddress: 'server-side'   // Will be enhanced with actual IP
            })
          });
        } catch (error) {
          console.error('Failed to store access request:', error);
        }
      }

      // Deny access for non-allowed emails
      return false;
    },
    async jwt({ token, user }) {
      // Add user info to the token
      if (user) {
        token.email = user.email || null;
        token.name = user.name || null;
      }
      return token;
    },
    async session({ session, token }) {
      // Add user info to the session
      if (token && session.user) {
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };
