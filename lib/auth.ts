import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "./prisma";

const TOKEN_EXPIRY_SECONDS = 60 * 60 * 24 * 30; // 1 hour

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: Number(process.env.TOKEN_EXPIRY_SECONDS) || TOKEN_EXPIRY_SECONDS,
  },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string;
        const password = credentials?.password as string;

        const user = await prisma.dashboard_user.findUnique({
          where: {
            email: email,
            deleted_at: null,
            is_active: true,
          },
          select: {
            id: true,
            password: true,
            role_name: true,
          },
        });

        if (!user) {
          throw new Error("Invalid credentials.");
        }

        const pwHash = await bcrypt.compare(password, user.password);

        if (!pwHash) {
          throw new Error("Invalid credentials.");
        }

        return {
          id: String(user.id),
          email: email,
          role: user.role_name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const now = Math.floor(Date.now() / 1000);
      if (user) {
        token.id = user.id as string;
        token.email = user.email as string;
        token.role = (user as { role: string }).role;
        token.iat = now;
        token.exp =
          now +
          (Number(process.env.TOKEN_EXPIRY_SECONDS) || TOKEN_EXPIRY_SECONDS);
      }
      if (typeof token.exp === "number" && now > token.exp) {
        return null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.role = token.role as string;
        session.expires = new Date((token.exp as number) * 1000) as Date &
          string;
      }
      return session;
    },
  },
});

// credentials sign in
