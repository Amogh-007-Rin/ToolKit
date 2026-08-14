import { NextRequest, NextResponse } from "next/server";
import prisma from "@/db";
import { hashPassword } from "@/lib/password";
import { registerSchema } from "@/types/validation";
import { Prisma } from "../../../../../generated/prisma/client";
import { FixedWindowRateLimiter, requestClientKey } from "@/lib/rateLimit";

const registerLimiter = new FixedWindowRateLimiter(5, 60_000);

const FIELD_MESSAGES: Record<string, string> = {
  name: "Please enter a valid name",
  email: "Please enter a valid email address",
  password: "Password must be at least 6 characters",
};

export async function POST(req: NextRequest) {
  if (!registerLimiter.allow(requestClientKey(req))) {
    return NextResponse.json({ error: "Too many registration attempts" }, { status: 429 });
  }
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const message = issue ? FIELD_MESSAGES[String(issue.path[0])] ?? "Invalid input" : "Invalid input";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { email, password, name } = parsed.data;

    try {
      const user = await prisma.user.create({
        data: {
          email,
          name: name && name.trim().length > 0 ? name : null,
          password: await hashPassword(password),
        },
        select: { id: true, email: true, name: true },
      });

      return NextResponse.json({ user }, { status: 201 });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
      }
      throw error;
    }
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
