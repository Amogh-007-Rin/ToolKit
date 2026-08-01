import { NextResponse } from "next/server";
import prisma from "@/db";
import { getSessionUserId } from "@/lib/session";
import { collectionCreateSchema } from "@/types/validation";

export async function GET() {
    const userId = await getSessionUserId();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const collections = await prisma.collection.findMany({
        where: { userId },
        include: { tools: true },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ collections });
}

export async function POST(req: Request) {
    const userId = await getSessionUserId();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = collectionCreateSchema.safeParse(await req.json());
    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0]?.message ?? "Invalid input" },
            { status: 400 }
        );
    }

    const collection = await prisma.collection.create({
        data: {
            title: parsed.data.title,
            description: parsed.data.description,
            userId,
        },
        include: { tools: true },
    });

    return NextResponse.json({ collection }, { status: 201 });
}
