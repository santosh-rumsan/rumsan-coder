import NextAuth from "next-auth";
import GithubProvider from "next-auth/providers/github";

const handler = NextAuth({
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: {
        params: {
          scope: 'read:user user:email repo',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      // Always return token with accessToken preserved
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = (token as any).accessToken;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});

export { handler as GET, handler as POST };
