import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import LinkedInProvider from "next-auth/providers/linkedin";
import DiscordProvider  from "next-auth/providers/discord"; 
import { PrismaAdapter } from "@/lib/prismaAdapter";
import prisma from "@/db";
import { resolveStoredUrl } from "@/lib/storage";
import { verifyPassword } from "@/lib/password";
import { credentialsSchema } from "@/types/validation";
import type { AuthOptions } from "next-auth";

export const NEXT_AUTH_CONFIG: AuthOptions = {
    adapter: PrismaAdapter(),
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'email', type: 'text', placeholder: '' },
                password: { label: 'password', type: 'password', placeholder: '' },
            },
            async authorize(credentials) {
                const parsed = credentialsSchema.safeParse(credentials);
                if (!parsed.success) return null;
                const { email, password } = parsed.data;

                const user = await prisma.user.findUnique({ where: { email } });
                if (!user?.password) return null;

                const isValid = await verifyPassword(password, user.password);
                if (!isValid) return null;

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                };
            },
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || ""
        }),
        GitHubProvider({
            clientId: process.env.GITHUB_ID || "",
            clientSecret: process.env.GITHUB_SECRET || ""
        }),
        LinkedInProvider({
            clientId: process.env.LINKEDIN_CLIENT_ID || "",
            clientSecret: process.env.LINKEDIN_CLIENT_SECRET || ""
        }),
        DiscordProvider({
            clientId: process.env.DISCORD_CLIENT_ID || "",
            clientSecret: process.env.DISCORD_CLIENT_SECRET || ""
        })

    ],
    session: {
        strategy: "jwt" as const,
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user?.id) {
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user && token.id) {
                session.user.id = token.id as string;
                try {
                    const user = await prisma.user.findUnique({
                        where: { id: token.id as string },
                        select: { image: true },
                    });
                    session.user.image = user ? await resolveStoredUrl(user.image) : null;
                } catch {
                    // keep default session image on failure
                }
            }
            return session;
        },
    },
    pages: {
    signIn: "/auth/signin", // Your custom sign-in page route
    error: "/auth/error",  // You can also customize error/signout pages here
    },
    
    secret: process.env.NEXTAUTH_SECRET
};
