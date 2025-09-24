import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

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
  pages: { signIn: "/" },
});

export { handler as GET, handler as POST };
