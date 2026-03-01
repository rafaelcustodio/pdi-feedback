import type { NextAuthConfig } from "next-auth";

// Lightweight config used in Edge Runtime (middleware).
// Must NOT import prisma or any Node.js-only modules.
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    authorized({ auth: session, request }) {
      const isLoggedIn = !!session?.user;
      const isOnLogin = request.nextUrl.pathname === "/login";

      if (isOnLogin) {
        if (isLoggedIn) return Response.redirect(new URL("/dashboard", request.nextUrl));
        return true;
      }

      return isLoggedIn;
    },
  },
  providers: [],
};
