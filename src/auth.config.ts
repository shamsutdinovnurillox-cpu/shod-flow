import type { NextAuthConfig } from "next-auth";
import type { Role, Department } from "@prisma/client";

// Bu faqat Edge'ga mos keluvchi qismlar (Adapter va DB ulanishsiz)
export const authConfig = {
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [], // auth.ts da to'ldiriladi yoki shu yerda bcrypt ishlatmasdan API orqali authorize yoziladi
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname.startsWith('/login');
      const isOnAdmin = nextUrl.pathname.startsWith('/admin');
      const isOnFleet = nextUrl.pathname.startsWith('/fleet');
      const isOnSafety = nextUrl.pathname.startsWith('/safety');

      if (isOnLogin) {
        if (isLoggedIn) return Response.redirect(new URL('/', nextUrl));
        return true;
      }

      if (!isLoggedIn) {
        return false; // Redirects to /login
      }

      // Role-based access control
      const role = auth?.user?.role;
      const dept = auth?.user?.department;

      if (isOnAdmin && role !== 'ADMIN') {
        return Response.redirect(new URL('/', nextUrl));
      }
      if (isOnFleet && role !== 'ADMIN' && dept !== 'FLEET') {
        return Response.redirect(new URL('/', nextUrl));
      }
      if (isOnSafety && role !== 'ADMIN' && dept !== 'SAFETY') {
        return Response.redirect(new URL('/', nextUrl));
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.department = user.department;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.department = token.department as Department;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
