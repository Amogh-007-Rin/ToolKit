import { NextResponse } from "next/server";
import prisma from "@/db";
import { getSessionUserId } from "@/lib/session";
import { collectionUpdateSchema } from "@/types/validation";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const userId = await getSessionUserId();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const parsed = collectionUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0]?.message ?? "Invalid input" },
            { status: 400 }
        );
    }

    const result = await prisma.collection.updateMany({
        where: { id, userId },
        data: {
            title: parsed.data.title,
            description: parsed.data.description,
        },
    });

    if (result.count === 0) {
        return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    const collection = await prisma.collection.findFirst({
        where: { id, userId },
        include: { tools: true },
    });

    return NextResponse.json({ collection });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const userId = await getSessionUserId();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const result = await prisma.collection.deleteMany({ where: { id, userId } });

    if (result.count === 0) {
        return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
}
