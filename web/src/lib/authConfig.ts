import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import LinkedInProvider from "next-auth/providers/linkedin";
import DiscordProvider  from "next-auth/providers/discord"; 
import { PrismaAdapter } from "@/lib/prismaAdapter";
import prisma from "@/db";
import { verifyPassword } from "@/lib/password";

export const NEXT_AUTH_CONFIG = {
    adapter: PrismaAdapter(),
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'email', type: 'text', placeholder: '' },
                password: { label: 'password', type: 'password', placeholder: '' },
            },
            async authorize(credentials) {
                const email = credentials?.email as string | undefined;
                const password = credentials?.password as string | undefined;
                if (!email || !password) return null;

                const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
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
    pages: {
    signIn: "/auth/signin", // Your custom sign-in page route
    error: "/auth/error",  // You can also customize error/signout pages here
    },
    
    secret: process.env.NEXTAUTH_SECRET
};
